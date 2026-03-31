/**
 * The Charge class represents a charge or discount that can be applied to an item.
 * It is used to store information about charges or discounts, such as the amount, type code and factor.
 */
class Charge {
	#indicator
	#amount
	#typeCode
	#factor

	/**
	 * Original amount.
	 * Line extension amount.
	 */
	#baseAmount

	constructor(isCharge) {
		this.#indicator = isCharge
	}

	get indicator() {
		return this.#indicator
	}

	setAmount(amount) {
		this.#amount = amount
	}

	get amount() {
		return this.#amount
	}

	setTypeCode(typeCode) {
		this.#typeCode = typeCode
	}

	getTypeCode() {
		return this.#typeCode
	}

	setFactor(factor, baseAmount) {
		this.#factor = factor
		this.#amount = factor * baseAmount
		this.#baseAmount = baseAmount
	}

	get factor() {
		return this.#factor
	}

	get baseAmount() {
		return this.#baseAmount
	}
}

export default Charge;
