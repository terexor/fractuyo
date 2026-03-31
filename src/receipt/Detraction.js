/**
 * Detraction represents a Peruvian tax withholding mechanism that applies to certain goods and services. It requires withholding a percentage of the invoice total and depositing it into a special bank account.
 * Detraction only applies if the invoice amount exceeds 700 PEN.
 */
class Detraction {
	#percentage = 0
	#amount = 0.0

	// Catalog no. 54
	#code

	#financialAccount

	/**
	 * Set percentage to apply.
	 * @param {number} percentage - Value from 0 to 100
	 */
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

	/**
	 * Set 3-digit code from SUNAT Catalog No. 54
	 * @param {string} code - Detraction code
	 */
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

	/**
	 * Set Bank account number for the deposit.
	 * @param {string} account - Bank account number
	 */
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
