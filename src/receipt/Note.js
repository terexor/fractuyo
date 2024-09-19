import Receipt from "./Receipt.js"
import NodesGenerator from "./xml/NodesGenerator.js"

class Note extends Receipt {
	#description
	#responseCode // type for this note

	#documentReference
	#documentReferenceTypeCode

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

	setResponseCode(code) {
		this.#responseCode = code
	}

	getResponseCode() {
		return this.#responseCode
	}

	setDocumentReference(reference) {
		this.#documentReference = reference
	}

	getDocumentReference() {
		return this.#documentReference
	}

	setDocumentReferenceTypeCode(code) {
		this.#documentReferenceTypeCode = code
	}

	getDocumentReferenceTypeCode() {
		return this.#documentReferenceTypeCode
	}

	toXml() {
		NodesGenerator.generateHeader(this)

		NodesGenerator.generateIdentity(this)

		NodesGenerator.generateDates(this)

		NodesGenerator.generateNotes(this)

		NodesGenerator.generateCurrencyCode(this)

		NodesGenerator.generateDiscrepancy(this)

		NodesGenerator.generateReference(this)

		NodesGenerator.generateSignature(this)

		NodesGenerator.generateSupplier(this)

		NodesGenerator.generateCustomer(this)

		NodesGenerator.generateTaxes(this)

		NodesGenerator.generateTotal(this)

		NodesGenerator.generateLines(this)
	}
}

export default Note;
