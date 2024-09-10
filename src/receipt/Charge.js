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
