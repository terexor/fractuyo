import Item from "./Item.js"
import Receipt from "./Receipt.js"
import Sale from "./Sale.js"
import NodesGenerator from "./xml/NodesGenerator.js"

class Note extends Sale {
	#description
	#responseCode // type for this note

	#documentReference
	#documentReferenceTypeCode

	/**
	 * @param isCredit must be boolean to choose between credit as true or false for debit.
	 */
	constructor(taxpayer, customer, isCredit) {
		if (isCredit != undefined) {
			super(taxpayer, customer, isCredit ? "CreditNote" : "DebitNote")
			this.setTypeCode(isCredit ? 7 : 8)
		}
		else {
			super(taxpayer, customer)
		}
	}

	setTypeCode(code) {
		if (code == 7 || code == 8) {
			super.setTypeCode(code)
			this.setName(code == 7 ? "CreditNote" : "DebitNote")
		}
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

	/**
	 * @return xmlDoc parsed
	 */
	fromXml(xmlContent) {
		// All about sale
		const xmlDoc = super.fromXml(xmlContent)

		// Now about note
		const [ lineNodeName, quantityNodeName ] = this.getTypeCode() == 7 ? [ "CreditNoteLine", "CreditedQuantity" ] : [ "DebitNoteLine", "DebitedQuantity" ]

		const items = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, lineNodeName);
		for (let i = 0; i < items.length; i++) {
			const item = new Item( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "Description")[0]?.textContent || "" )
			item.setQuantity( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, quantityNodeName)[0]?.textContent || "" )
			item.setUnitValue(
				items[i].getElementsByTagNameNS(Receipt.namespaces.cac, "Price")[0]?.getElementsByTagNameNS(Receipt.namespaces.cbc, "PriceAmount")[0]?.textContent,
				false
			)
			item.setUnitCode( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, quantityNodeName)[0]?.getAttribute("unitCode") || "" )

			// Warning because there are many tags with same name
			item.setIgvPercentage( parseInt(items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "Percent")[0]?.textContent) )
			item.setExemptionReasonCode( parseInt(items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "TaxExemptionReasonCode")[0]?.textContent) )

			item.calcMounts();
			this.addItem(item)
		}

		return xmlDoc
	}
}

export default Note;
