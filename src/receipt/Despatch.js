import Receipt from "./Receipt.js"
import NodesGenerator from "./xml/NodesGenerator.js"

class Despatch extends Receipt {
	#note // description

	#unitCode // maybe kgm
	#weight // value of unit code

	#startDate

	#deliveryAddress
	#despatchAddress

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

	setUnitCode(code) {
		this.#unitCode = code
	}

	getUnitCode() {
		return this.#unitCode
	}

	setWeight(weight) {
		this.#weight = weight
	}

	getWeight() {
		return this.#weight
	}

	setStartDate(date) {
		if(date) {
			this.#startDate = date
		}
		else {
			this.#startDate = new Date()
		}
	}

	getStartDate() {
		return this.#startDate
	}

	setDeliveryAddress(address) {
		this.#deliveryAddress = address
	}

	getDeliveryAddress() {
		return this.#deliveryAddress
	}

	setDespatchAddress(address) {
		this.#despatchAddress = address
	}

	getDespatchAddress() {
		if (this.#despatchAddress) {
			return this.#despatchAddress
		}

		return this.getTaxpayer().getAddress()
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

		NodesGenerator.generateShipment(this)
	}
}

export default Despatch
