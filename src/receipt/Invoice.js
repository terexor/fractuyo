import Receipt from "./Receipt.js"
import NodesGenerator from "./xml/NodesGenerator.js"

class Invoice extends Receipt {
	constructor(taxpayer, customer) {
		super(taxpayer, customer, "Invoice")
	}

	#orderReference
	#orderReferenceText
	#dueDate

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

	setDiscount(discountAmount) {
		if(discountAmount > 0) {
			this.#discount = new Charge(false)
			this.#discount.setTypeCode("02")
			this.#discount.setFactor(discountAmount / this.taxInclusiveAmount, this.lineExtensionAmount)

			//Recalc amounts
			const factorInverse = 1 - this.#discount.factor
			this.igvAmount *= factorInverse
			this.iscAmount *= factorInverse
			this.taxTotalAmount *= factorInverse
			this.taxInclusiveAmount *= factorInverse
			this.lineExtensionAmount *= factorInverse
			this.setOperationAmount(0, this.getOperationAmount(0) * factorInverse)
			this.setOperationAmount(1, this.getOperationAmount(1) * factorInverse)
			this.setOperationAmount(2, this.getOperationAmount(2) * factorInverse)
			this.setOperationAmount(3, this.getOperationAmount(3) * factorInverse)
		}
	}

	getDiscount() {
		return this.#discount
	}

	getDataQr() {
		return this.getTaxpayer().getIdentification().getNumber()
			+ '|' + this.getId(true).replaceAll('-', '|')
			+ '|' + this.igvAmount.toFixed(2)
			+ '|' + this.taxInclusiveAmount.toFixed(2)
			+ '|' + this.getIssueDate().toISOString().substr(0, 10)
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

		if(this.taxInclusiveAmount >= 700) {
			if(this.#detractionPercentage > 0) {
				this.#detractionAmount = this.taxInclusiveAmount * this.#detractionPercentage / 100
			}
		}

		if(this.#sharesAmount) {
			if(this.#detractionAmount) {
				if(this.#sharesAmount.toFixed(2) != (this.taxInclusiveAmount - this.#detractionAmount).toFixed(2)) {
					throw new Error("La suma de las cuotas difiere del total menos detracción.")
				}
			}
			else if(this.#sharesAmount.toFixed(2) != this.taxInclusiveAmount.toFixed(2)) {
				throw new Error("La suma de las cuotas difiere del total.")
			}
		}
	}

	toXml() {
		NodesGenerator.generateHeader(this)

		const cbcId = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
		cbcId.textContent = this.getId()
		this.xmlDocument.documentElement.appendChild(cbcId)

		const cbcIssueDate = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:IssueDate")
		cbcIssueDate.textContent = this.getIssueDate().toISOString().substr(0, 10)
		this.xmlDocument.documentElement.appendChild(cbcIssueDate)

		if(this.#dueDate && this.#shares.length == 0) {
			const cbcDueDate = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:DueDate")
			cbcDueDate.textContent = this.#dueDate
			this.xmlDocument.documentElement.appendChild(cbcDueDate)
		}

		const cbcInvoiceTypeCode = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:InvoiceTypeCode")
		if(this.#detractionAmount) {
			cbcInvoiceTypeCode.setAttribute("listID", "1001")
		}
		else {
			cbcInvoiceTypeCode.setAttribute("listID", "0101")
		}
		cbcInvoiceTypeCode.textContent = this.getTypeCode()
		this.xmlDocument.documentElement.appendChild(cbcInvoiceTypeCode)

		const cbcNote = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Note")
		cbcNote.setAttribute("languageLocaleID", "1000")
		cbcNote.appendChild( this.xmlDocument.createCDATASection(Receipt.amountToWords(this.taxInclusiveAmount, "con", this.getCurrencyId())) )
		this.xmlDocument.documentElement.appendChild(cbcNote)

		if(this.#detractionAmount) {
			const cbcNote = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Note")
			cbcNote.setAttribute("languageLocaleID", "2006")
			cbcNote.appendChild( this.xmlDocument.createCDATASection("Operación sujeta a detracción") )
			this.xmlDocument.documentElement.appendChild(cbcNote)
		}

		const cbcDocumentCurrencyCode = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:DocumentCurrencyCode")
		cbcDocumentCurrencyCode.textContent = this.getCurrencyId()
		this.xmlDocument.documentElement.appendChild(cbcDocumentCurrencyCode)

		if(this.#orderReference) {
			const cacOrderReference = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:OrderReference")
			this.xmlDocument.documentElement.appendChild(cacOrderReference)

			{
				const cbcId = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
				cbcId.textContent = this.#orderReference
				cacOrderReference.appendChild(cbcId)
			}

			if(this.#orderReferenceText) {
				const cbcCustomerReference = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:CustomerReference")
				cbcCustomerReference.appendChild( this.xmlDocument.createCDATASection(this.#orderReferenceText) )
				cacOrderReference.appendChild(cbcCustomerReference)
			}
		}

		{ //Signer data
			const cacSignature = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Signature")
			this.xmlDocument.documentElement.appendChild(cacSignature)

			const cbcId = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
			cbcId.textContent = this.getTaxpayer().getIdentification().getNumber()
			cacSignature.appendChild(cbcId)

			{
				const cacSignatoreParty = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:SignatoryParty")
				cacSignature.appendChild(cacSignatoreParty)

				const cacPartyIdentification = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyIdentification")
				cacSignatoreParty.appendChild(cacPartyIdentification)

				const cbcId = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
				cbcId.textContent = this.getTaxpayer().getIdentification().getNumber()
				cacPartyIdentification.appendChild(cbcId)

				const cacPartyName = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyName")
				cacSignatoreParty.appendChild(cacPartyName)

				const cbcName = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Name")
				cbcName.appendChild( this.xmlDocument.createCDATASection(this.getTaxpayer().getName()) )
				cacPartyName.appendChild(cbcName)
			}
			{
				const cacDigitalSignatureAttachment = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:DigitalSignatureAttachment")
				cacSignature.appendChild(cacDigitalSignatureAttachment)

				const cacExternalReference = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:ExternalReference")
				cacDigitalSignatureAttachment.appendChild(cacExternalReference)

				const cbcUri = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:URI")
				cbcUri.textContent = "#teroxoris"
				cacExternalReference.appendChild(cbcUri)
			}
		}
		{ //Supplier (current taxpayer)
			const cacAccountingSupplierParty = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:AccountingSupplierParty")
			this.xmlDocument.documentElement.appendChild(cacAccountingSupplierParty)

			const cacParty = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Party")
			cacAccountingSupplierParty.appendChild(cacParty)

			const cacPartyIdentification = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyIdentification")
			cacParty.appendChild(cacPartyIdentification)

			const cbcId = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
			cbcId.setAttribute("schemeID", this.getTaxpayer().getIdentification().getType())
			cbcId.setAttribute("schemeName", "Documento de Identidad")
			cbcId.setAttribute("schemeAgencyName", "PE:SUNAT")
			cbcId.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06")
			cbcId.textContent = this.getTaxpayer().getIdentification().getNumber()
			cacPartyIdentification.appendChild(cbcId)

			const cacPartyName = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyName")
			cacParty.appendChild(cacPartyName)

			const cbcName = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Name")
			cbcName.appendChild( this.xmlDocument.createCDATASection(this.getTaxpayer().getTradeName()) )
			cacPartyName.appendChild(cbcName)

			const cacPartyLegalEntity = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyLegalEntity")
			cacParty.appendChild(cacPartyLegalEntity)
			{
				const cbcRegistrationName = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:RegistrationName")
				cbcRegistrationName.appendChild( this.xmlDocument.createCDATASection(this.getTaxpayer().getName()) )
				cacPartyLegalEntity.appendChild(cbcRegistrationName)

				const cacRegistrationAddress = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:RegistrationAddress")
				cacPartyLegalEntity.appendChild(cacRegistrationAddress)
				{
					const cbcId = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
					cbcId.textContent = this.getTaxpayer().getAddress().ubigeo
					cacRegistrationAddress.appendChild(cbcId)

					const cbcAddressTypeCode = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:AddressTypeCode")
					cbcAddressTypeCode.textContent = this.getTaxpayer().getAddress().typecode
					cacRegistrationAddress.appendChild(cbcAddressTypeCode)

					const cbcCitySubdivisionName = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:CitySubdivisionName")
					cbcCitySubdivisionName.textContent = this.getTaxpayer().getAddress().urbanization
					cacRegistrationAddress.appendChild(cbcCitySubdivisionName)

					const cbcCityName = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:CityName")
					cbcCityName.textContent = this.getTaxpayer().getAddress().city
					cacRegistrationAddress.appendChild(cbcCityName)

					const cbcCountrySubentity = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:CountrySubentity")
					cbcCountrySubentity.textContent = this.getTaxpayer().getAddress().subentity
					cacRegistrationAddress.appendChild(cbcCountrySubentity)

					const cbcDistrict = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:District")
					cbcDistrict.textContent = this.getTaxpayer().getAddress().district
					cacRegistrationAddress.appendChild(cbcDistrict)

					const cacAddressLine = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:AddressLine")
					cacRegistrationAddress.appendChild(cacAddressLine)

					const cbcLine = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Line")
					cbcLine.appendChild( this.xmlDocument.createCDATASection(this.getTaxpayer().getAddress().line) )
					cacAddressLine.appendChild(cbcLine)

					const cacCountry = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Country")
					cacRegistrationAddress.appendChild(cacCountry)

					const cbcIdentificationCode = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:IdentificationCode")
					cbcIdentificationCode.textContent = this.getTaxpayer().getAddress().country
					cacCountry.appendChild(cbcIdentificationCode)
				}
			}

			if( this.getTaxpayer().getWeb() || this.getTaxpayer().getEmail() || this.getTaxpayer().getTelephone() ) {
				//Contact or marketing
				const cacContact = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Contact")
				cacParty.appendChild(cacContact)
				{
					if(this.getTaxpayer().getTelephone()) {
						const cbcTelephone = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Telephone")
						cbcTelephone.textContent = this.getTaxpayer().getTelephone()
						cacContact.appendChild(cbcTelephone)
					}

					if(this.getTaxpayer().getEmail()) {
						const cbcElectronicMail = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ElectronicMail")
						cbcElectronicMail.textContent = this.getTaxpayer().getEmail()
						cacContact.appendChild(cbcElectronicMail)
					}

					if(this.getTaxpayer().getWeb()) {
						const cbcNote = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Note")
						cbcNote.textContent = this.getTaxpayer().getWeb()
						cacContact.appendChild(cbcNote)
					}
				}
			}
		}
		{ //Customer
			const cacAccountingCustomerParty = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:AccountingCustomerParty")
			this.xmlDocument.documentElement.appendChild(cacAccountingCustomerParty)

			const cacParty = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Party")
			cacAccountingCustomerParty.appendChild(cacParty)

			const cacPartyIdentification = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyIdentification")
			cacParty.appendChild(cacPartyIdentification)

			const cbcId = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
			cbcId.setAttribute("schemeID", this.getCustomer().getIdentification().getType())
			cbcId.setAttribute("schemeName", "Documento de Identidad")
			cbcId.setAttribute("schemeAgencyName", "PE:SUNAT")
			cbcId.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06")
			cbcId.textContent = this.getCustomer().getIdentification().getNumber()
			cacPartyIdentification.appendChild(cbcId)

			const cacPartyLegalEntity = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyLegalEntity")
			cacParty.appendChild(cacPartyLegalEntity)

			const cbcRegistrationName = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:RegistrationName")
			cbcRegistrationName.appendChild( this.xmlDocument.createCDATASection(this.getCustomer().getName()) )
			cacPartyLegalEntity.appendChild(cbcRegistrationName)

			if(this.getCustomer().getAddress()) {
				const cacRegistrationAddress = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:RegistrationAddress")
				cacPartyLegalEntity.appendChild(cacRegistrationAddress)

				const cacAddressLine = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:AddressLine")
				cacRegistrationAddress.appendChild(cacAddressLine)

				const cbcLine = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Line")
				cbcLine.appendChild( this.xmlDocument.createCDATASection(this.getCustomer().getAddress()) )
				cacAddressLine.appendChild(cbcLine)
			}
		}

		if(this.#detractionAmount) {
			const cacPaymentMeans = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PaymentMeans")
			this.xmlDocument.documentElement.appendChild(cacPaymentMeans)
			{
				const cbcID = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
				cbcID.textContent = "Detraccion"
				cacPaymentMeans.appendChild(cbcID)

				const cbcPaymentMeansCode = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PaymentMeansCode")
				cbcPaymentMeansCode.textContent = "003"
				cacPaymentMeans.appendChild(cbcPaymentMeansCode)

				const cacPayeeFinancialAccount = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PayeeFinancialAccount")
				cacPaymentMeans.appendChild(cacPayeeFinancialAccount)
				{
					const cbcID = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
					cbcID.textContent = "00-099-025344" //Must be variable
					cacPayeeFinancialAccount.appendChild(cbcID)
				}
			}

			const cacPaymentTerms = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PaymentTerms")
			this.xmlDocument.documentElement.appendChild(cacPaymentTerms)
			{
				const cbcID = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
				cbcID.textContent = "Detraccion"
				cacPaymentTerms.appendChild(cbcID)

				const cbcPaymentMeansID = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PaymentMeansID")
				cbcPaymentMeansID.textContent = "037"
				cacPaymentTerms.appendChild(cbcPaymentMeansID)

				const cbcPaymentPercent = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PaymentPercent")
				cbcPaymentPercent.textContent = "12" //Must be variable
				cacPaymentTerms.appendChild(cbcPaymentPercent)

				const cbcAmount  = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Amount")
				cbcAmount.setAttribute("currencyID", this.getCurrencyId())
				cbcAmount.textContent = this.#detractionAmount.toFixed(2) //Must be variable
				cacPaymentTerms.appendChild(cbcAmount)
			}
		}

		if(this.#shares.length == 0) { //Cash Payment
			const cacPaymentTerms = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PaymentTerms")
			this.xmlDocument.documentElement.appendChild(cacPaymentTerms)
			{
				const cbcID = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
				cbcID.textContent = "FormaPago"
				cacPaymentTerms.appendChild(cbcID)

				const cbcPaymentMeansID = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PaymentMeansID")
				cbcPaymentMeansID.textContent = "Contado"
				cacPaymentTerms.appendChild(cbcPaymentMeansID)
			}
		}
		else { //Credit payment
			const cacPaymentTerms = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PaymentTerms")
			this.xmlDocument.documentElement.appendChild(cacPaymentTerms)
			{
				const cbcID = this.xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
				cbcID.textContent = "FormaPago"
				cacPaymentTerms.appendChild(cbcID)

				const cbcPaymentMeansID = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PaymentMeansID")
				cbcPaymentMeansID.textContent = "Credito"
				cacPaymentTerms.appendChild(cbcPaymentMeansID)

				const cbcAmount = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Amount")
				cbcAmount.setAttribute("currencyID", this.getCurrencyId())
				if(this.#detractionAmount) {
					cbcAmount.textContent = (this.taxInclusiveAmount - (this.#detractionAmount)).toFixed(2)
				}
				else {
					cbcAmount.textContent = this.taxInclusiveAmount.toFixed(2)
				}
				cacPaymentTerms.appendChild(cbcAmount)
			}

			let c = 0
			for(const share of this.#shares) {
				const cacPaymentTerms = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PaymentTerms")
				this.xmlDocument.documentElement.appendChild(cacPaymentTerms)
				{
					const cbcID = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
					cbcID.textContent = "FormaPago"
					cacPaymentTerms.appendChild(cbcID)

					const cbcPaymentMeansID = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PaymentMeansID")
					cbcPaymentMeansID.textContent = "Cuota" + String(++c).padStart(3, '0')
					cacPaymentTerms.appendChild(cbcPaymentMeansID)

					const cbcAmount = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Amount")
					cbcAmount.setAttribute("currencyID", this.getCurrencyId())
					cbcAmount.textContent = share.getAmount(true)
					cacPaymentTerms.appendChild(cbcAmount)

					const cbcPaymentDueDate = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PaymentDueDate")
					cbcPaymentDueDate.textContent = share.getDueDate()
					cacPaymentTerms.appendChild(cbcPaymentDueDate)
				}
			}
		}

		if(this.#discount) {
			const cacAllowanceCharge = this.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:AllowanceCharge")
			this.xmlDocument.documentElement.appendChild(cacAllowanceCharge)
			{
				const cbcChargeIndicator = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ChargeIndicator")
				cbcChargeIndicator.textContent = this.#discount.indicator
				cacAllowanceCharge.appendChild(cbcChargeIndicator)

				const cbcAllowanceChargeReasonCode = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:AllowanceChargeReasonCode")
				cbcAllowanceChargeReasonCode.textContent = this.#discount.getTypeCode()
				cacAllowanceCharge.appendChild(cbcAllowanceChargeReasonCode)

				const cbcMultiplierFactorNumeric = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:MultiplierFactorNumeric")
				cbcMultiplierFactorNumeric.textContent = this.#discount.factor.toFixed(5)
				cacAllowanceCharge.appendChild(cbcMultiplierFactorNumeric)

				const cbcAmount = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Amount")
				cbcAmount.setAttribute("currencyID", this.getCurrencyId())
				cbcAmount.textContent = this.#discount.amount.toFixed(2)
				cacAllowanceCharge.appendChild(cbcAmount)

				const cbcBaseAmount = this.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:BaseAmount")
				cbcBaseAmount.setAttribute("currencyID", this.getCurrencyId())
				cbcBaseAmount.textContent = this.#discount.baseAmount.toFixed(2)
				cacAllowanceCharge.appendChild(cbcBaseAmount)
			}
		}

		NodesGenerator.generateTaxes(this)

		NodesGenerator.generateTotal(this)

		NodesGenerator.generateLines(this)
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

export default Invoice;
