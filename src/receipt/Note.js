import Sale from "./Sale.js"
import NodesGenerator from "./xml/NodesGenerator.js"

class Note extends Sale {
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

	getResponseCode(withFormat = false) {
		if (withFormat) {
			return String(this.#responseCode).padStart(2, '0')
		}
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

	getDocumentReferenceTypeCode(withFormat = false) {
		if (withFormat) {
			return String(this.#documentReferenceTypeCode).padStart(2, '0')
		}
		return this.#documentReferenceTypeCode
	}

	toXml() {
		this.createXmlWrapper();

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
