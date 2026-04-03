import DocumentReference from "./DocumentReference.js";

/**
 * Prepayment reference just holds the amount of prepayment.
 * Anticipo.
 */
class PrepaidPaymentReference extends DocumentReference {
	/**
	 * Amount of prepayment.
	 * @type {number}
	 */
	#amount

	/**
	 * Tax amount of prepayment.
	 * @type {number}
	 */
	#taxAmount

	constructor() {
		super(DocumentReference.PREPAID_PAYMENT)
	}

	/**
	 * Amount of prepayment.
	 * @param {number} amount
	 */
	setAmount(amount) {
		this.#amount = amount
	}

	/**
	 * @returns {number}
	 */
	getAmount() {
		return this.#amount
	}

	/**
	 * Tax amount.
	 * @param {number} taxAmount
	 */
	setTaxAmount(taxAmount) {
		this.#taxAmount = taxAmount
	}

	/**
	 * @returns {number}
	 */
	getTaxAmount() {
		return this.#taxAmount
	}

	/**
	 * @returns {number}
	 */
	getBaseAmount() {
		return this.#amount - this.#taxAmount
	}
}

export default PrepaidPaymentReference
