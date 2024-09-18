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

	getDetractionAmount() {
		return this.#detractionAmount
	}

	getShares() {
		return this.#shares
	}

	addShare(share) {
		this.#shares.push(share)

		this.#sharesAmount += share.getAmount()
	}

	getDueDate() {
		return this.#dueDate
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

	getOrderReference() {
		return this.#orderReference
	}

	setOrderReferenceText(referenceText) {
		if(!this.#orderReference) {
			throw new Error("Asignar previamente la identidad de referencia.")
		}
		if( ( typeof referenceText === "string" || referenceText instanceof String ) && referenceText.length > 0 ) {
			this.#orderReferenceText = referenceText
		}
	}

	getOrderReferenceText() {
		return this.#orderReferenceText
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

		NodesGenerator.generateIdentity(this)

		NodesGenerator.generateDates(this)

		NodesGenerator.generateTypeCode(this)

		NodesGenerator.generateNotes(this)

		NodesGenerator.generateCurrencyCode(this)

		NodesGenerator.generateReference(this)

		NodesGenerator.generateSignature(this)

		NodesGenerator.generateSupplier(this)

		NodesGenerator.generateCustomer(this)

		NodesGenerator.generatePaymentMeans(this)

		NodesGenerator.generatePaymentTerms(this)

		NodesGenerator.generateCharge(this)

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
