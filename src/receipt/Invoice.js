class Invoice extends Receipt {
	constructor(taxpayer, customer) {
		super(taxpayer, customer)
	}

	#items = Array()
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
	#sharesAmount = 0

	#detractionPercentage
	#detractionAmount

	#discount

	setDetractionPercentage(dp) {
		if(dp >= 0 || dp <= 100) {
			this.#detractionPercentage = dp
			return
		}
		throw new Error("Porcentaje de detracción inconsistente.")
	}

	addShare(share) {
		this.#shares.push(share)

		this.#sharesAmount += share.getAmount()
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

	getEncryptedDiscountAmount() {
		return this.getTaxpayer().getPaillierPublicKey().encrypt(!this.#discount ? 0 : parseInt( Math.round( this.#discount.amount * 100 ) / 100 * 100 ) )
	}

	setDiscount(discountAmount) {
		if(discountAmount > 0) {
			this.#discount = new Charge(false)
			this.#discount.setTypeCode("02")
			this.#discount.setFactor(discountAmount / this.#taxInclusiveAmount, this.#lineExtensionAmount)

			//Recalc amounts
			const factorInverse = 1 - this.#discount.factor
			this.#igvAmount *= factorInverse
			this.#iscAmount *= factorInverse
			this.#taxTotalAmount *= factorInverse
			this.#taxInclusiveAmount *= factorInverse
			this.#lineExtensionAmount *= factorInverse
			this.#operationAmounts[0] *= factorInverse
			this.#operationAmounts[1] *= factorInverse
			this.#operationAmounts[2] *= factorInverse
			this.#operationAmounts[3] *= factorInverse
		}
	}

	getDiscount() {
		return this.#discount
	}

	getDataQr() {
		return
			this.getTaxpayer().getIdentification().getNumber()
			+ '|' + this.getId(true)
			+ '|' + this.getIgvAmount(true)
			+ '|' + this.getTaxTotalAmount(true)
			+ '|' + this.getIssueDate()
			+ '|' + this.getCustomer().getIdentification().getType()
			+ '|' + this.getCustomer().getIdentification().getNumber()
	}

	/**
	 * Check if everything can be processed.
	 * It does some calculations
	 */
	validate() {
		switch(this.getTypeCode()) {
			case "01":
				if(this.getCustomer().getIdentification().getType() != 6) {
					throw new Error("El cliente debe tener RUC.")
				}
		}

		if(!this.getIssueDate()) {
			this.setIssueDate()
		}

		if(this.#taxInclusiveAmount >= 700) {
			if(this.#detractionPercentage > 0) {
				this.#detractionAmount = this.#taxInclusiveAmount * this.#detractionPercentage / 100
			}
		}

		if(this.#sharesAmount) {
			if(this.#detractionAmount) {
				if(this.#sharesAmount.toFixed(2) != (this.#taxInclusiveAmount - this.#detractionAmount).toFixed(2)) {
					throw new Error("La suma de las cuotas difiere del total menos detracción.")
				}
			}
			else if(this.#sharesAmount.toFixed(2) != this.#taxInclusiveAmount.toFixed(2)) {
				throw new Error("La suma de las cuotas difiere del total.")
			}
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
		cbcIssueDate.appendChild( document.createTextNode( imprimirFecha( this.getIssueDate(), false ) ) )
		this.xmlDocument.documentElement.appendChild(cbcIssueDate)

		if(this.#dueDate && this.#shares.length == 0) {
			const cbcDueDate = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:DueDate")
			cbcDueDate.appendChild( document.createTextNode(this.#dueDate) )
			this.xmlDocument.documentElement.appendChild(cbcDueDate)
		}

		const cbcInvoiceTypeCode = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:InvoiceTypeCode")
		if(this.#detractionAmount) {
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

		if(this.#detractionAmount) {
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

		if(this.#detractionAmount) {
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
				cbcAmount.appendChild( document.createTextNode( (this.#detractionAmount).toFixed(2) ) )//Must be variable
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
				if(this.#detractionAmount) {
					cbcAmount.appendChild( document.createTextNode((this.#taxInclusiveAmount - (this.#detractionAmount)).toFixed(2)) )
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

		if(this.#discount) {
			const cacAllowanceCharge = this.xmlDocument.createElementNS(namespaces.cac, "cac:AllowanceCharge")
			this.xmlDocument.documentElement.appendChild(cacAllowanceCharge)
			{
				const cbcChargeIndicator = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ChargeIndicator")
				cbcChargeIndicator.appendChild( document.createTextNode(this.#discount.indicator) )
				cacAllowanceCharge.appendChild(cbcChargeIndicator)

				const cbcAllowanceChargeReasonCode = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:AllowanceChargeReasonCode")
				cbcAllowanceChargeReasonCode.appendChild( document.createTextNode(this.#discount.getTypeCode()) )
				cacAllowanceCharge.appendChild(cbcAllowanceChargeReasonCode)

				const cbcMultiplierFactorNumeric = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:MultiplierFactorNumeric")
				cbcMultiplierFactorNumeric.appendChild( document.createTextNode( this.#discount.factor.toFixed(5) ) )
				cacAllowanceCharge.appendChild(cbcMultiplierFactorNumeric)

				const cbcAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:Amount")
				cbcAmount.setAttribute("currencyID", this.getCurrencyId())
				cbcAmount.appendChild( document.createTextNode( this.#discount.amount.toFixed(2) ) )
				cacAllowanceCharge.appendChild(cbcAmount)

				const cbcBaseAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:BaseAmount")
				cbcBaseAmount.setAttribute("currencyID", this.getCurrencyId())
				cbcBaseAmount.appendChild( document.createTextNode(this.#discount.baseAmount.toFixed(2)) )
				cacAllowanceCharge.appendChild(cbcBaseAmount)
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
			cbcInvoicedQuantity.appendChild( document.createTextNode(this.#items[item].getQuantity(true, 10)) )
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
				cbcPriceAmount.appendChild( document.createTextNode( this.#items[item].getPricingReferenceAmount(true, 10) ) )
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
					cbcTaxableAmount.setAttribute("currencyID", this.getCurrencyId())
					cbcTaxableAmount.appendChild( document.createTextNode( this.#items[item].getLineExtensionAmount(true) ) )
					cacTaxSubtotal.appendChild(cbcTaxableAmount)

					const cbcTaxAmount = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:TaxAmount")
					cbcTaxAmount.setAttribute("currencyID", this.getCurrencyId())
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
				cbcPriceAmount.appendChild( document.createTextNode(this.#items[item].getUnitValue(true, 10)) )
				cacPrice.appendChild(cbcPriceAmount)
			}
		}
	}

	/**
	 * Parse xml string for filling attributes.
	 * If printed taxpayer is different from system current taxpayer then throw error.
	 */
	fromXml(xmlContent) {
		const xmlDoc = new DOMParser().parseFromString(xmlContent, "text/xml")

		let ruc = xmlDoc.evaluate("/*/cac:AccountingSupplierParty/cbc:CustomerAssignedAccountID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
		if(ruc == "") {
			ruc = xmlDoc.evaluate("/*/cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification/cbc:ID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
		}
		if(ruc != this.getTaxpayer().getIdentification().getNumber()) {
			throw new Error("Comprobante de pago no fue emitido por el contribuyente actual.")
		}

		this.setHash(
			xmlDoc.evaluate("/*/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/ds:Signature/ds:SignedInfo/ds:Reference/ds:DigestValue", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
		)

		const issueDate = xmlDoc.evaluate("/*/cbc:IssueDate", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
		this.setIssueDate()

		const customer = new Person()
		customer.setName(
			removeCdataTag( xmlDoc.evaluate("/*/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue )
		)
		customer.setAddress(
			removeCdataTag( xmlDoc.evaluate("/*/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cac:RegistrationAddress/cac:AddressLine/cbc:Line", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue )
		)
		try {
			customer.setIdentification(
				new Identification().setIdentity(
					removeCdataTag( xmlDoc.evaluate("/*/cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue ),
					xmlDoc.evaluate("/*/cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID/@schemeID", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue
				)
			)
		}
		catch(e) {
			Notiflix.Report.warning("Inconsistencia", e.message, "Aceptar")
			return
		}
		this.setCustomer(customer)

		const identification = xmlDoc.evaluate("/*/cbc:ID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue.split('-')
		this.setId(identification[0], Number.parseInt(identification[1]))

		this.setCurrencyId(
			xmlDoc.evaluate("/*/cbc:DocumentCurrencyCode", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
		)

		this.setTypeCode(
			xmlDoc.evaluate("/*/cbc:InvoiceTypeCode", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
		)

		const productsLength = xmlDoc.evaluate("count(/*/cac:InvoiceLine)", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue
		for(let i = 1; i <= productsLength; ++i) {
			const product = new Item(
				xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cac:Item/cbc:Description", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
			)
			product.setUnitCode(
				xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cbc:InvoicedQuantity/@unitCode", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
			)
			product.setClassificationCode(
				xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cac:Item/cac:CommodityClassification/cbc:ItemClassificationCode", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
			)
			product.setExemptionReasonCode(
				xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReasonCode", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue
			)
			product.setIgvPercentage(
				xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:Percent", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue
			)
			product.setIscPercentage(0)
			product.setQuantity(
				xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cbc:InvoicedQuantity", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
			)
			product.setUnitValue(
				xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cac:Price/cbc:PriceAmount", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue
			)
			this.addItem(product)
		}

		const orderReference = xmlDoc.evaluate("count(/*/cac:OrderReference/cbc:ID)", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue
		if(orderReference) {
			this.setOrderReference(
				orderReference
			)

			const orderReferenceText = xmlDoc.evaluate("/*/cac:OrderReference/cbc:CustomerReference", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
			if(orderReferenceText) {
				this.setOrderReferenceText(referenceTag)
			}
		}
	}
}
