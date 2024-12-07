import Sale from "./Sale.js"
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

	#detractionPercentage = 0
	#detractionAmount = 0

	#discount

	setDetractionPercentage(dp) {
		if(dp >= 0 && dp <= 100) {
			this.#detractionPercentage = dp
			return
		}
		throw new Error("Porcentaje de detracción inconsistente.")
	}

	getDetractionAmount(withFormat = false) {
		return withFormat ? this.#detractionAmount.toFixed(2) : this.#detractionAmount
	}

	getShares() {
		return this.#shares
	}

	addShare(share) {
		this.#shares.push(share)

		this.#sharesAmount += share.getAmount()
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

	calcDetractionAmount() {
		if (this.#detractionPercentage > 0) {
			if (this.taxInclusiveAmount > 700) {
				this.#detractionAmount = this.taxInclusiveAmount * this.#detractionPercentage / 100
				return // exit this function successfully
			}
			this.#detractionAmount = 0.0 // to overwrite when amount decrements
		}
		else {
			this.#detractionAmount = 0.0
		}
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
}

export default Invoice;
