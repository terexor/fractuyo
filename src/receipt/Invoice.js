import Item from "./Item.js"
import Receipt from "./Receipt.js"
import Share from "./Share.js"
import Sale from "./Sale.js"
import Charge from "./Charge.js"
import Detraction from "./Detraction.js"
import NodesGenerator from "./xml/NodesGenerator.js"

class Invoice extends Sale {
	constructor(taxpayer, customer) {
		super(taxpayer, customer, "Invoice")
	}

	#orderReference
	#orderReferenceText
	#dueDate

	#shares = Array()
	#sharesAmount = 0

	#detraction

	#discount

	getShares() {
		return this.#shares
	}

	addShare(share) {
		this.#shares.push(share)

		this.#sharesAmount += share.getAmount()
	}

	recalcSharesAmount() {
		this.#sharesAmount = 0

		for (const share of this.#shares) {
			this.#sharesAmount += share.getAmount()
		}
	}

	getSharesAmount() {
		return this.#sharesAmount
	}

	/**
	 * Recreate shares array without a share.
	 * @param index in array.
	 */
	removeShare(index) {
		this.#shares = [...this.#shares.slice(0, index), ...this.#shares.slice(index + 1)]
	}

	getDueDate() {
		return this.#dueDate
	}

	setDueDate(dd) {
		if (dd instanceof Date) {
			this.#dueDate = dd
		}
		else {
			this.#dueDate = null
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

	/**
	 * Empty reference identity and its description.
	 */
	clearOrderReference() {
		this.#orderReference = null
		this.#orderReferenceText = null
	}

	clearOrderReferenceText() {
		this.#orderReferenceText = null
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

	setDiscount(discountAmount, fromBase = false, direct = false) {
		// Converting in number
		discountAmount = parseFloat(discountAmount)

		// Removing discount
		if (isNaN(discountAmount) || discountAmount <= 0) {
			this.#discount = undefined
			return
		}

		if (this.#discount == undefined) {
			this.#discount = new Charge(false)
			this.#discount.setTypeCode("02")
		}

		if (fromBase) {
			// IGV percentage: 18 / 100: 0.18. Then sum is 1.18
			discountAmount *= 1.0 + (this.igvPercentage / 100)
		}

		if (direct) {
			this.#discount.setAmount(discountAmount)
			return
		}

		this.#discount.setFactor(discountAmount / this.taxInclusiveAmount, this.lineExtensionAmount)
	}

	/**
	 * After setting discount exists factor so recalc setting all amounts.
	 */
	recalcWithDiscountFactor() {
		if (this.#discount == undefined) {
			return
		}

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

	getDiscount() {
		return this.#discount
	}

	/**
	 * Performs substraction taxInclusiveAmount with detractionAmount.
	 */
	getShareableAmount(withFormat = false) {
		const shareableAmount = this.taxInclusiveAmount - (this.#detraction?.getAmount() ?? 0.0)
		return withFormat ? shareableAmount.toFixed(2) : shareableAmount
	}

	/**
	 * Create detraction object with given percentage.
	 */
	setDetraction(detractionPercentage) {
		// Removing detraction
		if (isNaN(detractionPercentage) || detractionPercentage <= 0) {
			this.#detraction = undefined
			return
		}

		if (this.#detraction == undefined) {
			this.#detraction = new Detraction()
		}

		this.#detraction.setPercentage(detractionPercentage)
	}

	getDetraction() {
		return this.#detraction
	}

	hasDetraction() {
		return this.#detraction != null && this.#detraction.getAmount() > 0.0
	}

	/**
	 * Check if everything can be processed.
	 * It does some calculations
	 */
	validate(validateNumeration) {
		super.validate(validateNumeration)

		switch(this.getTypeCode()) {
			case 1: // for "factura"
				if(this.getCustomer().getIdentification().getType() != 6) {
					throw new Error("El cliente debe tener RUC.")
				}
			case 3: // for "boleta"
				if (this.taxInclusiveAmount >= 700.0 && !(this.getCustomer()?.getIdentification())) {
					throw new Error("El cliente no puede ser omitido.")
				}
		}

		if(this.#sharesAmount) {
			if (this.hasDetraction()) {
				if (this.#sharesAmount.toFixed(2) != (this.taxInclusiveAmount - this.#detraction.getAmount()).toFixed(2)) {
					throw new Error("La suma de las cuotas difiere del total menos detracción.")
				}
			}
			else if(this.#sharesAmount.toFixed(2) != this.taxInclusiveAmount.toFixed(2)) {
				throw new Error("La suma de las cuotas difiere del total.")
			}
		}

		if (this.hasDetraction() && !this.#detraction.getCode()) {
			throw new Error("Falta código de detracción.")
		}
	}

	toXml() {
		this.createXmlWrapper();

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
	 * @return xmlDoc parsed
	 */
	fromXml(xmlContent) {
		// All about sale
		const xmlDoc = super.fromXml(xmlContent)

		{
			const orderReference = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "OrderReference")[0];
			if (orderReference) {
				const orderReferenceId = orderReference.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent;

				if (orderReferenceId) {
					this.setOrderReference(orderReferenceId)
					const orderReferenceText = orderReference.getElementsByTagNameNS(Receipt.namespaces.cbc, "CustomerReference")[0]?.textContent;
					if (orderReferenceText) {
						this.setOrderReferenceText(orderReferenceText)
					}
				}
			}
		}

		// All items. Always present.
		const items = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "InvoiceLine")
		for (let i = 0; i < items.length; i++) {
			const item = new Item( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "Description")[0]?.textContent || "" )
			item.setQuantity( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "InvoicedQuantity")[0]?.textContent || "" )
			item.setUnitValue(
				items[i].getElementsByTagNameNS(Receipt.namespaces.cac, "Price")[0]?.getElementsByTagNameNS(Receipt.namespaces.cbc, "PriceAmount")[0]?.textContent,
				false
			)
			item.setUnitCode( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "InvoicedQuantity")[0]?.getAttribute("unitCode") || "" )

			// Warning because there are many tags with same name
			item.setIgvPercentage( parseInt(items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "Percent")[0]?.textContent) )
			item.setExemptionReasonCode( parseInt(items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "TaxExemptionReasonCode")[0]?.textContent) )

			item.calcMounts()
			this.addItem(item, true)
		}

		{ // check if there are shares
			const paymentTerms = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "PaymentTerms") // always exists
			for (let i = 0; i < paymentTerms.length; ++i) {
				if (paymentTerms[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0].textContent == "FormaPago") {
					// If there is Credito means that next siblings are amounts
					if (paymentTerms[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "PaymentMeansID")[0].textContent == "Credito") {
						++i; // set index to next sibling
						// iterate posible remaining shares
						for (; i < paymentTerms.length; ++i) {
							// if FormaPago is not found, means we don't have any share
							if (paymentTerms[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0].textContent != "FormaPago") {
								break
							}
							const share = new Share()
							// capture date and amount
							share.setAmount(paymentTerms[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "Amount")[0].textContent)
							const dateParts = paymentTerms[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "PaymentDueDate")[0].textContent.split('-') // split in year, month and day
							share.setDueDate(new Date(dateParts[0], dateParts[1] - 1, dateParts[2]))
							this.addShare(share)
						}
					}
				}
			}
		}

		// Discount or recharge
		{
			// possible discount
			const allowanceCharge = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "AllowanceCharge")[0]
			if (allowanceCharge) {
				const chargeIndicator = allowanceCharge.getElementsByTagNameNS(Receipt.namespaces.cbc, "ChargeIndicator")[0].textContent === "true"
				if (!chargeIndicator) { // it's discount
					this.setDiscount(allowanceCharge.getElementsByTagNameNS(Receipt.namespaces.cbc, "Amount")[0].textContent, false, true)
				}
			}
		}

		{ // about detractions
			// possible deduction
			const paymentMean = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "PaymentMeans")[0]
			if (paymentMean) { // exists deduction
				const id = paymentMean.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent
				if (id == "Detraccion") { // deduction exists
					// look for more about this deduction
					const paymentTerms = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "PaymentTerms")
					for (const paymentTerm of paymentTerms) {
						if (paymentTerm.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0].textContent != "Detraccion") {
							continue
						}

						// we found it
						this.setDetraction(parseInt(paymentTerm.getElementsByTagNameNS(Receipt.namespaces.cbc, "PaymentPercent")[0].textContent))
						this.getDetraction().setCode(paymentTerm.getElementsByTagNameNS(Receipt.namespaces.cbc, "PaymentMeansID")[0].textContent)
						this.getDetraction().calcAmount(this.taxInclusiveAmount)
						break // then nothing else
					}

					// parsing bank account
					const payeeFinancialAccount = paymentMean.getElementsByTagNameNS(Receipt.namespaces.cac, "PayeeFinancialAccount")[0]
					// setting bank account
					this.getDetraction().setFinancialAccount(payeeFinancialAccount.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent)
				}
			}
		}

		return xmlDoc
	}
}

export default Invoice;
