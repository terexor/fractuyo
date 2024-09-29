import Receipt from "./Receipt.js"
import NodesGenerator from "./xml/NodesGenerator.js"

class Despatch extends Receipt {
	#note // description

	constructor(taxpayer, customer) {
		super(taxpayer, customer, "DespatchAdvice")
	}

	setNote(note) {
		if (note.length > 250) {
			this.#note = note.substring(0, 249)
			return
		}

		this.#note = note
	}

	getNote() {
		return this.#note
	}

	toXml() {
		NodesGenerator.generateHeader(this)

		NodesGenerator.generateIdentity(this)

		NodesGenerator.generateDates(this)

		NodesGenerator.generateTypeCode(this)

		NodesGenerator.generateNotes(this)

		NodesGenerator.generateSignature(this)

		NodesGenerator.generateSupplier(this)

		NodesGenerator.generateCustomer(this)
	}
}

export default Despatch
