import Receipt from "./Receipt.js"

class Note extends Receipt {
	#description

	constructor(taxpayer, customer, isCredit) {
		super(taxpayer, customer, isCredit ? "CreditNote" : "DebitNote")
	}

	setDescription(description) {
		if (description.length > 250) {
			this.#description = description.substring(0, 249)
			return
		}

		this.#description = description
	}

	getDescription() {
		return this.#description
	}

	toXml() {
		NodesGenerator.generateHeader(this)

		NodesGenerator.generateIdentity(this)

		NodesGenerator.generateDates(this)

		NodesGenerator.generateLines(this)
	}
}

export default Note;
