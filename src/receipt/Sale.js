import Receipt from "./Receipt.js"

class Sale extends Receipt {
	/*
	 * Global totals
	 */
	#lineExtensionAmount = 0
	#taxTotalAmount = 0
	#taxInclusiveAmount = 0
	#igvAmount = 0
	#iscAmount = 0
	#icbpAmount = 0
	#operationAmounts = [0, 0, 0]

	constructor(taxpayer, customer, name) {
		super(taxpayer, customer, name)
	}

	get lineExtensionAmount() {
		return this.#lineExtensionAmount
	}

	get taxTotalAmount() {
		return this.#taxTotalAmount
	}

	set taxTotalAmount(amount) {
		this.#taxTotalAmount = amount
	}

	get taxInclusiveAmount() {
		return this.#taxInclusiveAmount
	}

	set taxInclusiveAmount(amount) {
		this.#taxInclusiveAmount = amount
	}

	get igvAmount() {
		return this.#igvAmount
	}

	set igvAmount(amount) {
		this.#igvAmount = amount
	}

	get iscAmount() {
		return this.#iscAmount
	}

	set iscAmount(amount) {
		this.#iscAmount = amount
	}

	get icbpAmount() {
		return this.#icbpAmount
	}

	set icbpAmount(amount) {
		this.#icbpAmount = amount
	}

	getOperationAmount(index) {
		return this.#operationAmounts[index]
	}

	setOperationAmount(index, amount) {
		this.#operationAmounts[index] = amount
	}

	addItem(item) {
		super.addItem(item)

		this.#lineExtensionAmount += item.getLineExtensionAmount()
		this.#taxTotalAmount += item.getTaxTotalAmount()
		this.#taxInclusiveAmount += item.getLineExtensionAmount() + item.getTaxTotalAmount()

		this.#igvAmount += item.getIgvAmount()

		//Assign data according taxability
		switch(true) {
			case (item.getExemptionReasonCode() < 20):
				this.#operationAmounts[0] += item.getLineExtensionAmount();break
			case (item.getExemptionReasonCode() < 30):
				this.#operationAmounts[1] += item.getLineExtensionAmount();break
			case (item.getExemptionReasonCode() < 40):
				this.#operationAmounts[2] += item.getLineExtensionAmount();break
			default:
				this.#operationAmounts[3] += item.getLineExtensionAmount()
		}
	}

	getQrData() {
		return this.getTaxpayer().getIdentification().getNumber()
			+ '|' + this.getId(true).replaceAll('-', '|')
			+ '|' + this.igvAmount.toFixed(2)
			+ '|' + this.taxInclusiveAmount.toFixed(2)
			+ '|' + this.getIssueDate().toISOString().substr(0, 10)
			+ '|' + this.getCustomer().getIdentification().getType()
			+ '|' + this.getCustomer().getIdentification().getNumber()
	}
}

export default Sale
