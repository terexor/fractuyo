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
	 * Base amount of prepayment.
	 * @type {number}
	 */
	#baseAmount

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
	 * Original base amount.
	 * @param {number} baseAmount
	 */
	setBaseAmount(baseAmount) {
		this.#baseAmount = baseAmount
	}

	/**
	 * @returns {number}
	 */
	getBaseAmount() {
		return this.#baseAmount
	}
}

export default PrepaidPaymentReference
