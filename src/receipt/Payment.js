/**
 * Used for prepaid payment.
 */
class Payment {
	#id

	#amount

	constructor(amount) {
		this.setAmount(amount)
	}

	setAmount(amount) {
		this.#amount = amount
	}

	getAmount() {
		return this.#amount
	}

	setId(id) {
		this.#id = id
	}

	getId() {
		return this.#id
	}
}

export default Payment;
