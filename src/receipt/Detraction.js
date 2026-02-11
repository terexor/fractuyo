class Detraction {
	#percentage = 0
	#amount = 0.0

	// Catalog no. 54
	#code

	#financialAccount

	setPercentage(percentage) {
		if (percentage >= 0 && percentage <= 100) {
			this.#percentage = percentage
			return
		}

		this.#percentage = 0
		throw new Error("Porcentaje de detracción inconsistente.")
	}

	getPercentage() {
		return this.#percentage
	}

	setCode(code) {
		if (code.length == 3) {
			this.#code = code
		}
	}

	getCode() {
		return this.#code
	}

	getAmount() {
		return this.#amount
	}

	setFinancialAccount(account) {
		this.#financialAccount = account
	}

	getFinancialAccount() {
		return this.#financialAccount
	}

	/**
	 * @param taxInclusiveAmount - number to apply percentage
	 */
	calcAmount(taxInclusiveAmount) {
		if (this.#percentage > 0) {
			if (taxInclusiveAmount > 700) {
				this.#amount = taxInclusiveAmount * this.#percentage / 100
				return // exit this function successfully
			}
			this.#amount = 0.0 // to overwrite when amount decrements
		}
		else {
			this.#amount = 0.0
		}
	}
}

export default Detraction
