import Receipt from "./Receipt.js"
import NodesGenerator from "./xml/NodesGenerator.js"

class Note extends Receipt {
	#description

	constructor(taxpayer, customer, isCredit) {
		super(taxpayer, customer, isCredit ? "CreditNote" : "DebitNote")
		this.setTypeCode(isCredit ? 7 : 8)
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
