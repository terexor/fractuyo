class Receipt {
	#taxpayer
	#customer

	#serie
	#numeration
	#typeCode

	#issueDate = new Date()

	#currencyId

	#ublVersion = "2.1"
	#customizationId = "2.0"

	setUblVersion(ublVersion) {
		this.#ublVersion = ublVersion
	}

	constructor(taxpayer, customer) {
		this.#taxpayer = taxpayer
		this.#customer = customer
		this.xmlDocument
	}

	/**
	 * Format serie and number: F000-00000001
	 */
	getId(withType = false) {
		if(this.#serie == undefined || this.#numeration == undefined) {
			throw new Error("Serie o número incompletos.")
		}
		if(withType) {
			return String(this.#typeCode).padStart(2, '0') + "-" + this.#serie + "-" + String(this.#numeration).padStart(8, '0')
		}
		return this.#serie + '-' + String(this.#numeration).padStart(8, '0')
	}

	setId(serie, numeration) {
		this.setSerie(serie)
		this.setNumeration(numeration)
	}

	setSerie(serie) {
		if(serie.length != 4) {
			throw new Error("Serie inconsistente")
		}
		this.#serie = serie
	}

	getSerie() {
		return this.#serie
	}

	setNumeration(number) {
		if(number > 0x5F5E0FF) {
			throw new Error("Numeración supera el límite.")
		}
		this.#numeration = number
	}

	getNumeration() {
		return this.#numeration
	}

	setTypeCode(code) {
		this.#typeCode = code
	}

	getTypeCode() {
		return this.#typeCode
	}

	setCurrencyId(cid) {
		this.#currencyId = cid
	}

	getCurrencyId() {
		return this.#currencyId
	}

	getIssueDate() {
		return this.#issueDate
	}

	getTaxpayer() {
		return this.#taxpayer
	}

	getCustomer() {
		return this.#customer
	}

	getUblVersion() {
		return this.#ublVersion
	}

	getCustomizationId() {
		return this.#customizationId
	}

	async sign(algorithmName, hashAlgorithm = "SHA-256", canonMethod = "c14n") {
		if(this.xmlDocument == undefined) {
			throw new Error("Documento XML no existe.")
		}
		const alg = getAlgorithm(algorithmName)

		// Read cert
		const certDer = window.Encoding.base64ToBuf( this.#taxpayer.getCert() )

		// Read key
		const keyDer = window.Encoding.base64ToBuf( this.#taxpayer.getKey() )
		const key = await window.crypto.subtle.importKey("pkcs8", keyDer, alg, true, ["sign"])

		const x509 = this.#taxpayer.getCert()

		const transforms = ["enveloped", canonMethod]

		this.xmlDocument = XAdES.Parse(new XMLSerializer().serializeToString(this.xmlDocument))

		return Promise.resolve()
			.then(() => {
				const signature = new XAdES.SignedXml()

				return signature.Sign(
					alg,        // algorithm
					key,        // key
					this.xmlDocument,// document
					{           // options
						references: [
							{ id: "terexoris", uri: "", hash: hashAlgorithm, transforms: transforms }
						],
						x509: [x509],
						//~ signerRole: { claimed: ["BOSS"] },
						signingCertificate: x509
					}
				)
			})
			.then((signature) => {
				// Add signature to document
				const xmlEl = this.xmlDocument.getElementsByTagNameNS("urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2", "ExtensionContent")[0]
				xmlEl.appendChild(signature.GetXml())
				return true
			})
			.catch(function (e) {
				console.error(e)
				return false
			})
	}
}

class Invoice extends Receipt {
	constructor(taxpayer, customer) {
		super(taxpayer, customer)
	}

	#items = Array()
	 //Too used same in products
	#currencyId
	#orderReference
	#orderReferenceText
	#dueDate

	/*
	 * Global totals
	 */
	#lineExtensionAmount = 0
	#taxTotalAmount = 0
	#taxInclusiveAmount = 0
	#igvAmount = 0
	#iscAmount = 0
	#icbpAmount = 0
	#operationAmounts = [0, 0, 0]

	#shares = Array()

	//Using validate() may change it
	#hasDetraction = false

	addShare(share) {
		this.#shares.push(share)
	}

	setDueDate(dd) {
		if(dd.length) {
			this.#dueDate = dd
		}
	}

	addItem(item) {
		this.#items.push(item)

		this.#lineExtensionAmount += item.getLineExtensionAmount()
		this.#taxTotalAmount += item.getTaxTotalAmount()
		this.#taxInclusiveAmount += item.getLineExtensionAmount() + item.getTaxTotalAmount()

		this.#igvAmount += item.getIgvAmount()

		//Assign data according taxability
		switch(true) {
			case (item.getExemptionReasonCode() < 20):
				this.#operationAmounts[0] += item.getLineExtensionAmount();break
			case (item.getExemptionReasonCode() < 30):
				this.#operationAmounts[1] += item.getLineExtensionAmount();break
			case (item.getExemptionReasonCode() < 40):
				this.#operationAmounts[2] += item.getLineExtensionAmount();break
			default:
				this.#operationAmounts[3] += item.getLineExtensionAmount()
		}
	}

	setOrderReference(reference) {
		if( ( typeof reference === "string" || reference instanceof String ) && reference.length > 0 ) {
			if( /\s/g.test(reference) ) {
				throw new Error("La referencia numérica no debe contener espacios.")
			}
			if(reference.length > 20) {
				throw new Error("La referencia numérica no debe tener 20 caracteres como máximo.")
			}
			this.#orderReference = reference
		}
	}

	setOrderReferenceText(referenceText) {
		if(!this.#orderReference) {
			throw new Error("Asignar previamente la identidad de referencia.")
		}
		if( ( typeof referenceText === "string" || referenceText instanceof String ) && referenceText.length > 0 ) {
			this.#orderReferenceText = referenceText
		}
	}

	getLineExtensionAmount(withFormat = false) {
		return withFormat ? this.#lineExtensionAmount.toFixed(2) : this.#lineExtensionAmount
	}

	getEncryptedOperationAmounts(index) {
		return this.getTaxpayer().getPaillierPublicKey().encrypt( parseInt( Math.round( this.#operationAmounts[index] * 100 ) / 100 * 100 ) )
	}

	getEncryptedIgvAmount() {
		return this.getTaxpayer().getPaillierPublicKey().encrypt( parseInt( Math.round( this.#igvAmount * 100 ) / 100 * 100 ) )
	}

	getEncryptedIscAmount() {
		return this.getTaxpayer().getPaillierPublicKey().encrypt( parseInt( Math.round( this.#iscAmount * 100 ) / 100 * 100 ) )
	}

	getEncryptedIcbpAmount() {
		return this.getTaxpayer().getPaillierPublicKey().encrypt( parseInt( Math.round( this.#icbpAmount * 100 ) / 100 * 100 ) )
	}

	/**
	 * Check if everything can be processed.
	 */
	validate() {
		switch(this.getTypeCode()) {
			case "01":
				if(this.getCustomer().getIdentification().getType() != 6) {
					throw new Error("El cliente debe tener RUC.")
				}
		}

		if(this.#taxInclusiveAmount >= 700) {
			this.#hasDetraction = true
		}
	}

	toXml() {
		//We create elements using this: xmlDocument.createElement
		this.xmlDocument = document.implementation.createDocument("urn:oasis:names:specification:ubl:schema:xsd:Invoice-2", "Invoice")
		this.xmlDocument.documentElement.setAttribute("xmlns:cac", namespaces.cac)
		this.xmlDocument.documentElement.setAttribute("xmlns:cbc", namespaces.cbc)
		this.xmlDocument.documentElement.setAttribute("xmlns:ds", namespaces.ds)
		this.xmlDocument.documentElement.setAttribute("xmlns:ext", namespaces.ext)

		const extUblExtensions = this.xmlDocument.createElementNS(namespaces.ext, "ext:UBLExtensions")
		this.xmlDocument.documentElement.appendChild(extUblExtensions)

		const extUblExtension = this.xmlDocument.createElementNS(namespaces.ext, "ext:UBLExtension")
		extUblExtensions.appendChild(extUblExtension)

		const extExtensionContent = this.xmlDocument.createElementNS(namespaces.ext, "ext:ExtensionContent")
		extUblExtension.appendChild(extExtensionContent)

		const cbcUblVersionId = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:UBLVersionID")
		cbcUblVersionId.appendChild( document.createTextNode(this.getUblVersion()) )
		this.xmlDocument.documentElement.appendChild(cbcUblVersionId)

		const cbcCustomizationId = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:CustomizationID")
		cbcCustomizationId.appendChild( document.createTextNode(this.getCustomizationId()) )
		this.xmlDocument.documentElement.appendChild(cbcCustomizationId)

		const cbcId = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
		cbcId.appendChild( document.createTextNode(this.getId()) )
		this.xmlDocument.documentElement.appendChild(cbcId)

		const cbcIssueDate = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:IssueDate")
		cbcIssueDate.appendChild( document.createTextNode(this.getIssueDate().toISOString().substr(0, 10)) )
		this.xmlDocument.documentElement.appendChild(cbcIssueDate)

		if(this.#dueDate && shares.length == 0) {
			const cbcDueDate = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:DueDate")
			cbcDueDate.appendChild( document.createTextNode(this.#dueDate) )
			this.xmlDocument.documentElement.appendChild(cbcDueDate)
		}

		const cbcInvoiceTypeCode = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:InvoiceTypeCode")
		if(this.#hasDetraction) {
			cbcInvoiceTypeCode.setAttribute("listID", "1001")
		}
		else {
			cbcInvoiceTypeCode.setAttribute("listID", "0101")
		}
		cbcInvoiceTypeCode.appendChild( document.createTextNode(this.getTypeCode()) )
		this.xmlDocument.documentElement.appendChild(cbcInvoiceTypeCode)

		const cbcNote = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Note")
		cbcNote.setAttribute("languageLocaleID", "1000")
		cbcNote.appendChild( this.xmlDocument.createCDATASection(numberToWords(this.#taxInclusiveAmount.toFixed(2))) )
		this.xmlDocument.documentElement.appendChild(cbcNote)

		if(this.#hasDetraction) {
			const cbcNote = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Note")
			cbcNote.setAttribute("languageLocaleID", "2006")
			cbcNote.appendChild( this.xmlDocument.createCDATASection("Operación sujeta a detracción") )
			this.xmlDocument.documentElement.appendChild(cbcNote)
		}

		const cbcDocumentCurrencyCode = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:DocumentCurrencyCode")
		cbcDocumentCurrencyCode.appendChild( document.createTextNode(this.getCurrencyId()) )
		this.xmlDocument.documentElement.appendChild(cbcDocumentCurrencyCode)

		if(this.#orderReference) {
			const cacOrderReference = this.xmlDocument.createElementNS(namespaces.cac, "cac:OrderReference")
			this.xmlDocument.documentElement.appendChild(cacOrderReference)

			{
				const cbcId = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
				cbcId.appendChild( document.createTextNode(this.#orderReference) )
				cacOrderReference.appendChild(cbcId)
			}

			if(this.#orderReferenceText) {
				const cbcCustomerReference = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:CustomerReference")
				cbcCustomerReference.appendChild( document.createTextNode(this.#orderReferenceText) )
				cacOrderReference.appendChild(cbcCustomerReference)
			}
		}

		{ //Signer data
			const cacSignature = this.xmlDocument.createElementNS(namespaces.cac, "cac:Signature")
			this.xmlDocument.documentElement.appendChild(cacSignature)

			const cbcId = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
			cbcId.appendChild( document.createTextNode(this.getTaxpayer().getIdentification().getNumber()) )
			cacSignature.appendChild(cbcId)

			{
				const cacSignatoreParty = this.xmlDocument.createElementNS(namespaces.cac, "cac:SignatoryParty")
				cacSignature.appendChild(cacSignatoreParty)

				const cacPartyIdentification = this.xmlDocument.createElementNS(namespaces.cac, "cac:PartyIdentification")
				cacSignatoreParty.appendChild(cacPartyIdentification)

				const cbcId = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
				cbcId.appendChild( document.createTextNode(this.getTaxpayer().getIdentification().getNumber()) )
				cacPartyIdentification.appendChild(cbcId)

				const cacPartyName = this.xmlDocument.createElementNS(namespaces.cac, "cac:PartyName")
				cacSignatoreParty.appendChild(cacPartyName)

				const cbcName = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Name")
				cbcName.appendChild( this.xmlDocument.createCDATASection(this.getTaxpayer().getName()) )
				cacPartyName.appendChild(cbcName)
			}
			{
				const cacDigitalSignatureAttachment = this.xmlDocument.createElementNS(namespaces.cac, "cac:DigitalSignatureAttachment")
				cacSignature.appendChild(cacDigitalSignatureAttachment)

				const cacExternalReference = this.xmlDocument.createElementNS(namespaces.cac, "cac:ExternalReference")
				cacDigitalSignatureAttachment.appendChild(cacExternalReference)

				const cbcUri = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:URI")
				cbcUri.appendChild( document.createTextNode("#teroxoris") )
				cacExternalReference.appendChild(cbcUri)
			}
		}
		{ //Supplier (current taxpayer)
			const cacAccountingSupplierParty = this.xmlDocument.createElementNS(namespaces.cac, "cac:AccountingSupplierParty")
			this.xmlDocument.documentElement.appendChild(cacAccountingSupplierParty)

			const cacParty = this.xmlDocument.createElementNS(namespaces.cac, "cac:Party")
			cacAccountingSupplierParty.appendChild(cacParty)

			const cacPartyIdentification = this.xmlDocument.createElementNS(namespaces.cac, "cac:PartyIdentification")
			cacParty.appendChild(cacPartyIdentification)

			const cbcId = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
			cbcId.setAttribute("schemeID", this.getTaxpayer().getIdentification().getType())
			cbcId.setAttribute("schemeName", "Documento de Identidad")
			cbcId.setAttribute("schemeAgencyName", "PE:SUNAT")
			cbcId.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06")
			cbcId.appendChild( document.createTextNode(this.getTaxpayer().getIdentification().getNumber()) )
			cacPartyIdentification.appendChild(cbcId)

			const cacPartyName = this.xmlDocument.createElementNS(namespaces.cac, "cac:PartyName")
			cacParty.appendChild(cacPartyName)

			const cbcName = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Name")
			cbcName.appendChild( this.xmlDocument.createCDATASection(this.getTaxpayer().getTradeName()) )
			cacPartyName.appendChild(cbcName)

			const cacPartyLegalEntity = this.xmlDocument.createElementNS(namespaces.cac, "cac:PartyLegalEntity")
			cacParty.appendChild(cacPartyLegalEntity)
			{
				const cbcRegistrationName = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:RegistrationName")
				cbcRegistrationName.appendChild( this.xmlDocument.createCDATASection(this.getTaxpayer().getName()) )
				cacPartyLegalEntity.appendChild(cbcRegistrationName)

				const cacRegistrationAddress = this.xmlDocument.createElementNS(namespaces.cac, "cac:RegistrationAddress")
				cacPartyLegalEntity.appendChild(cacRegistrationAddress)
				{
					const metaAddress = this.getTaxpayer().getMetaAddress()

					const cbcId = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
					cbcId.appendChild( document.createTextNode(metaAddress[1]) )
					cacRegistrationAddress.appendChild(cbcId)

					const cbcAddressTypeCode = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:AddressTypeCode")
					cbcAddressTypeCode.appendChild( document.createTextNode(metaAddress[2]) )
					cacRegistrationAddress.appendChild(cbcAddressTypeCode)

					const cbcCitySubdivisionName = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:CitySubdivisionName")
					cbcCitySubdivisionName.appendChild( document.createTextNode(metaAddress[3]) )
					cacRegistrationAddress.appendChild(cbcCitySubdivisionName)

					const cbcCityName = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:CityName")
					cbcCityName.appendChild( document.createTextNode(metaAddress[4]) )
					cacRegistrationAddress.appendChild(cbcCityName)

					const cbcCountrySubentity = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:CountrySubentity")
					cbcCountrySubentity.appendChild( document.createTextNode(metaAddress[5]) )
					cacRegistrationAddress.appendChild(cbcCountrySubentity)

					const cbcDistrict = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:District")
					cbcDistrict.appendChild( document.createTextNode(metaAddress[6]) )
					cacRegistrationAddress.appendChild(cbcDistrict)

					const cacAddressLine = this.xmlDocument.createElementNS(namespaces.cac, "cac:AddressLine")
					cacRegistrationAddress.appendChild(cacAddressLine)

					const cbcLine = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Line")
					cbcLine.appendChild( this.xmlDocument.createCDATASection(this.getTaxpayer().getAddress()) )
					cacAddressLine.appendChild(cbcLine)

					const cacCountry = this.xmlDocument.createElementNS(namespaces.cac, "cac:Country")
					cacRegistrationAddress.appendChild(cacCountry)

					const cbcIdentificationCode = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:IdentificationCode")
					cbcIdentificationCode.appendChild( document.createTextNode(metaAddress[0]) )
					cacCountry.appendChild(cbcIdentificationCode)
				}
			}

			if( this.getTaxpayer().getWeb() || this.getTaxpayer().getEmail() || this.getTaxpayer().getTelephone() ) {
				//Contact or marketing
				const cacContact = this.xmlDocument.createElementNS(namespaces.cac, "cac:Contact")
				cacParty.appendChild(cacContact)
				{
					if(this.getTaxpayer().getTelephone()) {
						const cbcTelephone = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Telephone")
						cbcTelephone.appendChild(document.createTextNode(this.getTaxpayer().getTelephone()))
						cacContact.appendChild(cbcTelephone)
					}

					if(this.getTaxpayer().getEmail()) {
						const cbcElectronicMail = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ElectronicMail")
						cbcElectronicMail.appendChild(document.createTextNode(this.getTaxpayer().getEmail()))
						cacContact.appendChild(cbcElectronicMail)
					}

					if(this.getTaxpayer().getWeb()) {
						const cbcNote = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Note")
						cbcNote.appendChild(document.createTextNode(this.getTaxpayer().getWeb()))
						cacContact.appendChild(cbcNote)
					}
				}
			}
		}
		{ //Customer
			const cacAccountingCustomerParty = this.xmlDocument.createElementNS(namespaces.cac, "cac:AccountingCustomerParty")
			this.xmlDocument.documentElement.appendChild(cacAccountingCustomerParty)

			const cacParty = this.xmlDocument.createElementNS(namespaces.cac, "cac:Party")
			cacAccountingCustomerParty.appendChild(cacParty)

			const cacPartyIdentification = this.xmlDocument.createElementNS(namespaces.cac, "cac:PartyIdentification")
			cacParty.appendChild(cacPartyIdentification)

			const cbcId = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
			cbcId.setAttribute("schemeID", this.getCustomer().getIdentification().getType())
			cbcId.setAttribute("schemeName", "Documento de Identidad")
			cbcId.setAttribute("schemeAgencyName", "PE:SUNAT")
			cbcId.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06")
			cbcId.appendChild( document.createTextNode(this.getCustomer().getIdentification().getNumber()) )
			cacPartyIdentification.appendChild(cbcId)

			const cacPartyLegalEntity = this.xmlDocument.createElementNS(namespaces.cac, "cac:PartyLegalEntity")
			cacParty.appendChild(cacPartyLegalEntity)

			const cbcRegistrationName = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:RegistrationName")
			cbcRegistrationName.appendChild( this.xmlDocument.createCDATASection(this.getCustomer().getName()) )
			cacPartyLegalEntity.appendChild(cbcRegistrationName)

			if(this.getCustomer().getAddress()) {
				const cacRegistrationAddress = this.xmlDocument.createElementNS(namespaces.cac, "cac:RegistrationAddress")
				cacPartyLegalEntity.appendChild(cacRegistrationAddress)

				const cacAddressLine = this.xmlDocument.createElementNS(namespaces.cac, "cac:AddressLine")
				cacRegistrationAddress.appendChild(cacAddressLine)

				const cbcLine = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Line")
				cbcLine.appendChild( this.xmlDocument.createCDATASection(this.getCustomer().getAddress()) )
				cacAddressLine.appendChild(cbcLine)
			}
		}

		if(this.#hasDetraction) {
			const cacPaymentMeans = this.xmlDocument.createElementNS(namespaces.cac, "cac:PaymentMeans")
			this.xmlDocument.documentElement.appendChild(cacPaymentMeans)
			{
				const cbcID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
				cbcID.appendChild( document.createTextNode("Detraccion") )
				cacPaymentMeans.appendChild(cbcID)

				const cbcPaymentMeansCode = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:PaymentMeansCode")
				cbcPaymentMeansCode.appendChild( document.createTextNode("003") )
				cacPaymentMeans.appendChild(cbcPaymentMeansCode)

				const cacPayeeFinancialAccount = this.xmlDocument.createElementNS(namespaces.cac, "cac:PayeeFinancialAccount")
				cacPaymentMeans.appendChild(cacPayeeFinancialAccount)
				{
					const cbcID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
					cbcID.appendChild( document.createTextNode("00-099-025344") )//Must be variable
					cacPayeeFinancialAccount.appendChild(cbcID)
				}
			}

			const cacPaymentTerms = this.xmlDocument.createElementNS(namespaces.cac, "cac:PaymentTerms")
			this.xmlDocument.documentElement.appendChild(cacPaymentTerms)
			{
				const cbcID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
				cbcID.appendChild( document.createTextNode("Detraccion") )
				cacPaymentTerms.appendChild(cbcID)

				const cbcPaymentMeansID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:PaymentMeansID")
				cbcPaymentMeansID.appendChild( document.createTextNode("037") )
				cacPaymentTerms.appendChild(cbcPaymentMeansID)

				const cbcPaymentPercent = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:PaymentPercent")
				cbcPaymentPercent.appendChild( document.createTextNode("12") )//Must be variable
				cacPaymentTerms.appendChild(cbcPaymentPercent)

				const cbcAmount  = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Amount")
				cbcAmount.setAttribute("currencyID", this.getCurrencyId())
				cbcAmount.appendChild( document.createTextNode( (this.#taxInclusiveAmount * 0.12).toFixed(2) ) )//Must be variable
				cacPaymentTerms.appendChild(cbcAmount)
			}
		}

		if(this.#shares.length == 0) { //Cash Payment
			const cacPaymentTerms = this.xmlDocument.createElementNS(namespaces.cac, "cac:PaymentTerms")
			this.xmlDocument.documentElement.appendChild(cacPaymentTerms)
			{
				const cbcID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
				cbcID.appendChild( document.createTextNode("FormaPago") )
				cacPaymentTerms.appendChild(cbcID)

				const cbcPaymentMeansID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:PaymentMeansID")
				cbcPaymentMeansID.appendChild( document.createTextNode("Contado") )
				cacPaymentTerms.appendChild(cbcPaymentMeansID)
			}
		}
		else { //Credit payment
			const cacPaymentTerms = this.xmlDocument.createElementNS(namespaces.cac, "cac:PaymentTerms")
			this.xmlDocument.documentElement.appendChild(cacPaymentTerms)
			{
				const cbcID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
				cbcID.appendChild( document.createTextNode("FormaPago") )
				cacPaymentTerms.appendChild(cbcID)

				const cbcPaymentMeansID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:PaymentMeansID")
				cbcPaymentMeansID.appendChild( document.createTextNode("Credito") )
				cacPaymentTerms.appendChild(cbcPaymentMeansID)

				const cbcAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Amount")
				cbcAmount.setAttribute("currencyID", this.getCurrencyId())
				if(this.#hasDetraction) {
					cbcAmount.appendChild( document.createTextNode((this.#taxInclusiveAmount - (this.#taxInclusiveAmount * 0.12)).toFixed(2)) )
				}
				else {
					cbcAmount.appendChild( document.createTextNode(this.#taxInclusiveAmount.toFixed(2)) )
				}
				cacPaymentTerms.appendChild(cbcAmount)
			}

			let c = 0
			for(const share of this.#shares) {
				const cacPaymentTerms = this.xmlDocument.createElementNS(namespaces.cac, "cac:PaymentTerms")
				this.xmlDocument.documentElement.appendChild(cacPaymentTerms)
				{
					const cbcID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
					cbcID.appendChild( document.createTextNode("FormaPago") )
					cacPaymentTerms.appendChild(cbcID)

					const cbcPaymentMeansID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:PaymentMeansID")
					cbcPaymentMeansID.appendChild( document.createTextNode("Cuota" + String(++c).padStart(3, '0')) )
					cacPaymentTerms.appendChild(cbcPaymentMeansID)

					const cbcAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Amount")
					cbcAmount.setAttribute("currencyID", this.getCurrencyId())
					cbcAmount.appendChild(document.createTextNode( share.getAmount(true) ))
					cacPaymentTerms.appendChild(cbcAmount)

					const cbcPaymentDueDate = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:PaymentDueDate")
					cbcPaymentDueDate.appendChild( document.createTextNode( share.getDueDate() ) )
					cacPaymentTerms.appendChild(cbcPaymentDueDate)
				}
			}
		}

		{ //Taxes
			const cacTaxTotal = this.xmlDocument.createElementNS(namespaces.cac, "cac:TaxTotal")
			this.xmlDocument.documentElement.appendChild(cacTaxTotal)
			{
				const cbcTaxAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TaxAmount")
				cbcTaxAmount.setAttribute("currencyID", this.getCurrencyId())
				cbcTaxAmount.appendChild( document.createTextNode(this.#taxTotalAmount.toFixed(2)) )
				cacTaxTotal.appendChild(cbcTaxAmount)

				const cacTaxSubtotal = this.xmlDocument.createElementNS(namespaces.cac, "cac:TaxSubtotal")
				cacTaxTotal.appendChild(cacTaxSubtotal)
				{
					const cbcTaxableAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TaxableAmount")
					cbcTaxableAmount.setAttribute("currencyID", this.getCurrencyId())
					cbcTaxableAmount.appendChild( document.createTextNode(this.#operationAmounts[0].toFixed(2)) )
					cacTaxSubtotal.appendChild( cbcTaxableAmount )

					const cbcTaxAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TaxAmount")
					cbcTaxAmount.setAttribute("currencyID", this.getCurrencyId())
					cbcTaxAmount.appendChild( document.createTextNode(this.#igvAmount.toFixed(2)) )
					cacTaxSubtotal.appendChild(cbcTaxAmount)

					const cacTaxCategory = this.xmlDocument.createElementNS(namespaces.cac, "cac:TaxCategory")
					cacTaxSubtotal.appendChild(cacTaxCategory)
					{
						const cacTaxScheme = this.xmlDocument.createElementNS(namespaces.cac, "cac:TaxScheme")
						cacTaxCategory.appendChild(cacTaxScheme)
						{
							const cbcID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
							cbcID.setAttribute("schemeName", "Codigo de tributos")
							cbcID.setAttribute("schemeAgencyName", "PE:SUNAT")
							cbcID.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05")
							cbcID.appendChild(document.createTextNode("1000"))
							cacTaxScheme.appendChild(cbcID)

							const cbcName = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Name")
							cbcName.appendChild( document.createTextNode( "IGV" ) )
							cacTaxScheme.appendChild(cbcName)

							const cbcTaxTypeCode = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TaxTypeCode")
							cbcTaxTypeCode.appendChild( document.createTextNode( "VAT" ) )
							cacTaxScheme.appendChild(cbcTaxTypeCode)
						}
					}
				}
			}
		}

		{
			const cacLegalMonetaryTotal = this.xmlDocument.createElementNS(namespaces.cac, "cac:LegalMonetaryTotal")
			this.xmlDocument.documentElement.appendChild(cacLegalMonetaryTotal)
			{
				const cbcLineExtensionAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:LineExtensionAmount")
				cbcLineExtensionAmount.setAttribute("currencyID", this.getCurrencyId())
				cbcLineExtensionAmount.appendChild( document.createTextNode(this.#lineExtensionAmount.toFixed(2)) )
				cacLegalMonetaryTotal.appendChild(cbcLineExtensionAmount)

				const cbcTaxInclusiveAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TaxInclusiveAmount")
				cbcTaxInclusiveAmount.setAttribute("currencyID", this.getCurrencyId())
				cbcTaxInclusiveAmount.appendChild( document.createTextNode(this.#taxInclusiveAmount.toFixed(2)) )
				cacLegalMonetaryTotal.appendChild(cbcTaxInclusiveAmount)

				const cbcPayableAmount  = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:PayableAmount")
				cbcPayableAmount.setAttribute("currencyID", this.getCurrencyId())
				cbcPayableAmount.appendChild( document.createTextNode(this.#taxInclusiveAmount.toFixed(2)) )
				cacLegalMonetaryTotal.appendChild(cbcPayableAmount)
			}
		}

		for(const item in this.#items) { //Items
			const cacInvoiceLine = this.xmlDocument.createElementNS(namespaces.cac, "cac:InvoiceLine")
			this.xmlDocument.documentElement.appendChild(cacInvoiceLine)

			const cbcID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
			cbcID.appendChild( document.createTextNode(parseInt(item) + 1) )
			cacInvoiceLine.appendChild(cbcID)

			const cbcInvoicedQuantity = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:InvoicedQuantity")
			cbcInvoicedQuantity.setAttribute("unitCode", this.#items[item].getUnitCode())
			cbcInvoicedQuantity.setAttribute("unitCodeListID", "UN/ECE rec 20")
			cbcInvoicedQuantity.setAttribute("unitCodeListAgencyName", "United Nations Economic Commission for Europe")
			cbcInvoicedQuantity.appendChild( document.createTextNode(this.#items[item].getQuantity()) )
			cacInvoiceLine.appendChild(cbcInvoicedQuantity)

			const cbcLineExtensionAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:LineExtensionAmount")
			cbcLineExtensionAmount.setAttribute("currencyID", this.getCurrencyId())
			cbcLineExtensionAmount.appendChild( document.createTextNode(this.#items[item].getLineExtensionAmount(true)) )
			cacInvoiceLine.appendChild(cbcLineExtensionAmount)

			{ //PricingReference
				const cacPricingReference = this.xmlDocument.createElementNS(namespaces.cac, "cac:PricingReference")
				cacInvoiceLine.appendChild(cacPricingReference)

				const cacAlternativeConditionPrice = this.xmlDocument.createElementNS(namespaces.cac, "cac:AlternativeConditionPrice")
				cacPricingReference.appendChild(cacAlternativeConditionPrice)

				const cbcPriceAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:PriceAmount")
				cbcPriceAmount.setAttribute("currencyID", this.getCurrencyId())
				cbcPriceAmount.appendChild( document.createTextNode( this.#items[item].getPricingReferenceAmount(true) ) )
				cacAlternativeConditionPrice.appendChild(cbcPriceAmount)

				const cbcPriceTypeCode = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:PriceTypeCode")
				cbcPriceTypeCode.appendChild(document.createTextNode("01"))
				cacAlternativeConditionPrice.appendChild(cbcPriceTypeCode)
			}

			{ //TaxTotal
				const cacTaxTotal = this.xmlDocument.createElementNS(namespaces.cac, "cac:TaxTotal")
				cacInvoiceLine.appendChild(cacTaxTotal)

				const cbcTaxAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TaxAmount")
				cbcTaxAmount.setAttribute("currencyID", this.getCurrencyId())
				cbcTaxAmount.appendChild( document.createTextNode( this.#items[item].getTaxTotalAmount(true) ) )
				cacTaxTotal.appendChild(cbcTaxAmount)

				if( this.#items[item].getIscAmount() > 0 ) { //ISC
					const cacTaxSubtotal = this.xmlDocument.createElementNS(namespaces.cac, "cac:TaxSubtotal")
					cacTaxTotal.appendChild(cacTaxSubtotal)

					const cbcTaxableAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TaxableAmount")
					cbcTaxableAmount.setAttribute("currencyID", currencyId)
					cbcTaxableAmount.appendChild( document.createTextNode( this.#items[item].getLineExtensionAmount(true) ) )
					cacTaxSubtotal.appendChild(cbcTaxableAmount)

					const cbcTaxAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TaxAmount")
					cbcTaxAmount.setAttribute("currencyID", currencyId)
					cbcTaxAmount.appendChild( document.createTextNode( this.#items[item].getIscAmount(true) ) )
					cacTaxSubtotal.appendChild(cbcTaxAmount)

					const cacTaxCategory = this.xmlDocument.createElementNS(namespaces.cac, "cac:TaxCategory")
					cacTaxSubtotal.appendChild(cacTaxCategory)
					{
						const cbcPercent = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Percent")
						cbcPercent.appendChild( document.createTextNode( this.#items[item].getIscPercentage() ) )
						cacTaxCategory.appendChild(cbcPercent)

						const cbcTierRange = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TierRange")
						cbcTierRange.appendChild( document.createTextNode( "01" ) )
						cacTaxCategory.appendChild(cbcTierRange)

						const cacTaxScheme = this.xmlDocument.createElementNS(namespaces.cac, "cac:TaxScheme")
						cacTaxCategory.appendChild(cacTaxScheme)
						{
							const cbcID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
							cbcID.appendChild( document.createTextNode( "2000" ) )
							cacTaxScheme.appendChild(cbcID)

							const cbcName = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Name")
							cbcName.appendChild( document.createTextNode( "ISC" ) )
							cacTaxScheme.appendChild(cbcName)

							const cbcTaxTypeCode = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TaxTypeCode")
							cbcTaxTypeCode.appendChild( document.createTextNode( "EXC" ) )
							cacTaxScheme.appendChild(cbcTaxTypeCode)
						}
					}
				}
				if( this.#items[item].getIgvAmount() > 0 ) { //IGV
					const cacTaxSubtotal = this.xmlDocument.createElementNS(namespaces.cac, "cac:TaxSubtotal")
					cacTaxTotal.appendChild(cacTaxSubtotal)

					const cbcTaxableAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TaxableAmount")
					cbcTaxableAmount.setAttribute("currencyID", this.getCurrencyId())
					cbcTaxableAmount.appendChild( document.createTextNode( this.#items[item].getTaxableIgvAmount(true) ) )
					cacTaxSubtotal.appendChild(cbcTaxableAmount)

					const cbcTaxAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TaxAmount")
					cbcTaxAmount.setAttribute("currencyID", this.getCurrencyId())
					cbcTaxAmount.appendChild( document.createTextNode( this.#items[item].getIgvAmount(true) ) )
					cacTaxSubtotal.appendChild(cbcTaxAmount)

					const cacTaxCategory = this.xmlDocument.createElementNS(namespaces.cac, "cac:TaxCategory")
					cacTaxSubtotal.appendChild(cacTaxCategory)
					{
						const cbcPercent = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Percent")
						cbcPercent.appendChild( document.createTextNode( this.#items[item].getIgvPercentage() ) )
						cacTaxCategory.appendChild(cbcPercent)

						const cbcTaxExemptionReasonCode = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TaxExemptionReasonCode")
						cbcTaxExemptionReasonCode.appendChild( document.createTextNode( this.#items[item].getExemptionReasonCode() ) )
						cacTaxCategory.appendChild(cbcTaxExemptionReasonCode)

						const cacTaxScheme = this.xmlDocument.createElementNS(namespaces.cac, "cac:TaxScheme")
						cacTaxCategory.appendChild(cacTaxScheme)
						{
							const cbcID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
							cbcID.appendChild( document.createTextNode( "1000" ) )
							cacTaxScheme.appendChild(cbcID)

							const cbcName = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Name")
							cbcName.appendChild( document.createTextNode( "IGV" ) )
							cacTaxScheme.appendChild(cbcName)

							const cbcTaxTypeCode = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TaxTypeCode")
							cbcTaxTypeCode.appendChild( document.createTextNode( "VAT" ) )
							cacTaxScheme.appendChild(cbcTaxTypeCode)
						}
					}
				}
			}

			{ //Item
				const cacItem = this.xmlDocument.createElementNS(namespaces.cac, "cac:Item")
				cacInvoiceLine.appendChild(cacItem)

				const cbcDescription = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Description")
				cbcDescription.appendChild( this.xmlDocument.createCDATASection(this.#items[item].getDescription()) )
				cacItem.appendChild(cbcDescription)

				if(this.#items[item].getCode()) {
					const cacSellersItemIdentification = this.xmlDocument.createElementNS(namespaces.cac, "cac:SellersItemIdentification")
					cacItem.appendChild(cacSellersItemIdentification)

					const cbcID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
					cbcID.appendChild( document.createTextNode(this.#items[item].getCode()) )
					cacSellersItemIdentification.appendChild(cbcID)
				}

				const cacCommodityClassification = this.xmlDocument.createElementNS(namespaces.cac, "cac:CommodityClassification")
				cacItem.appendChild(cacCommodityClassification)

				const cbcItemClassificationCode = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ItemClassificationCode")
				cbcItemClassificationCode.setAttribute("listID", "UNSPSC")
				cbcItemClassificationCode.setAttribute("listAgencyName", "GS1 US")
				cbcItemClassificationCode.setAttribute("listName", "Item Classification")
				cbcItemClassificationCode.appendChild( document.createTextNode(this.#items[item].getClassificationCode()) )
				cacCommodityClassification.appendChild(cbcItemClassificationCode)
			}

			{ //Price
				const cacPrice = this.xmlDocument.createElementNS(namespaces.cac, "cac:Price")
				cacInvoiceLine.appendChild(cacPrice)

				const cbcPriceAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:PriceAmount")
				cbcPriceAmount.setAttribute("currencyID", this.getCurrencyId())
				cbcPriceAmount.appendChild( document.createTextNode(this.#items[item].getUnitValue(true)) )
				cacPrice.appendChild(cbcPriceAmount)
			}
		}
	}
}

var Share = function(today) {
	var dueDate, amount

	this.setDueDate = function(dd) {
		dueDate = dd
	}

	this.getDueDate = function() {
		return dueDate
	}

	this.setAmount = function(a) {
		amount = parseFloat(a)
		if(isNaN(amount)) {
			throw new Error("Cantidad de cuota no es un número.")
		}
		if(amount <= 0) {
			throw new Error("Monto de cuota no puede ser 0.")
		}
	}

	this.getAmount = function(withFormat = false) {
		return withFormat ? amount.toFixed(2) : amount
	}
}

var Item = function(_description) {
	var description
	var code
	var quantity
	var unitValue
	var unitCode, classificationCode
	var igvPercentage, iscPercentage
	var taxableIgvAmount
	var igvAmount, iscAmount
	var taxTotalAmount
	var lineExtensionAmount, pricingReferenceAmount
	var exemptionReasonCode

	this.getDescription = function() {
		return description
	}

	this.setDescription = function(d) {
		if( ( typeof d === "string" || d instanceof String ) && d.length > 0 ) {
			description = d
			return
		}
		throw new Error("No hay descripción válida.")
	}

	this.setCode = function(c) {
		if( ( typeof c === "string" || c instanceof String ) && c.length > 0 ) {
			code = c
		}
	}

	this.getCode = function() {
		return code
	}

	this.getQuantity = function(withFormat = false) {
		return withFormat ? quantity.toFixed(2) : quantity
	}

	this.setQuantity = function(q) {
		quantity = parseFloat(q)
		if(isNaN(quantity)) {
			throw new Error("Cantidad no es un número.")
		}
		if(quantity <= 0) {
			throw new Error("No puede haber 0 como cantidad.")
		}
	}

	this.getLineExtensionAmount = function(withFormat = false) {
		return withFormat ? lineExtensionAmount.toFixed(2) : lineExtensionAmount
	}

	/**
	 * According roll 03.
	 */
	this.setUnitCode = function(uc) {
		unitCode = uc
	}

	this.getUnitCode = function() {
		return unitCode
	}

	/**
	 * According roll 25.
	 */
	this.setClassificationCode = function(cc) {
		classificationCode = cc
	}

	this.getClassificationCode = function() {
		return classificationCode
	}

	this.getIscPercentage = function() {
		return iscPercentage
	}

	this.setIscPercentage = function(ip) {
		if(ip >= 0 || ip <= 100) {
			iscPercentage = ip
			return
		}
		throw new Error("Porcentaje ISC inconsistente.")
	}

	this.getIscAmount = function(withFormat = false) {
		return withFormat ? iscAmount.toFixed(2) : iscAmount
	}

	this.setIgvPercentage = function(ip) {
		if(ip >= 0 || ip <= 100) {
			igvPercentage = ip
			return
		}
		throw new Error("Porcentaje IGV inconsistente.")
	}

	this.getIgvPercentage = function() {
		return igvPercentage
	}

	this.getIgvAmount = function(withFormat = false) {
		return withFormat ? igvAmount.toFixed(2) : igvAmount
	}

	this.getUnitValue = function(withFormat = false) {
		return withFormat ? unitValue.toFixed(2) : unitValue
	}

	this.setUnitValue = function(uv, withoutIgv) {
		uv = parseFloat(uv)
		if(!withoutIgv) {
			unitValue = uv
		}
		else {
			if(isNaN(igvPercentage)) {
				throw new Error("Se requiere previamente porcentaje del IGV.")
			}
			unitValue = uv / ( 1 + igvPercentage / 100 )
		}
	}

	this.calcMounts = function() {
		//Todo esto asumiendo que el valorUnitario no tiene incluido el IGV.
		//~ (auxiliar) valorVenta = cantidad * valorUnitario
		lineExtensionAmount = quantity * unitValue

		let decimalIscPercentage = iscPercentage / 100 // eg: 0.17
		let decimalIgvPercentage = igvPercentage / 100 // eg: 0.18

		pricingReferenceAmount = unitValue * (1 + decimalIscPercentage) * (1 + decimalIgvPercentage)

		//~ valorISC = (porcentajeISC/100)×valorVenta
		iscAmount = decimalIscPercentage * lineExtensionAmount

		//~ valorIGV=(porcentajeIGV/100)×(valorVenta + valorISC)
		taxableIgvAmount = iscAmount + lineExtensionAmount
		igvAmount = taxableIgvAmount * decimalIgvPercentage

		taxTotalAmount = iscAmount + igvAmount
	}

	this.getTaxableIgvAmount = function(withFormat) {
		return withFormat ? taxableIgvAmount.toFixed(2) : taxableIgvAmount
	}

	this.getPricingReferenceAmount = function(withFormat = false) {
		return withFormat ? pricingReferenceAmount.toFixed(2) : pricingReferenceAmount
	}

	this.getTaxTotalAmount = function(withFormat = false) {
		return withFormat ? taxTotalAmount.toFixed(2) : taxTotalAmount
	}

	this.setExemptionReasonCode = function(xrc) {
		exemptionReasonCode = xrc
	}

	this.getExemptionReasonCode = function() {
		return exemptionReasonCode
	}

	this.setDescription(_description)
}
