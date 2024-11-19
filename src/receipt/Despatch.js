import Receipt from "./Receipt.js"
import Person from "../person/Person.js"
import Identification from "../person/Identification.js"
import Endpoint from "../webservice/Endpoint.js"
import Rest from "../webservice/Rest.js"
import NodesGenerator from "./xml/NodesGenerator.js"

class Despatch extends Receipt {
	#note // description

	#unitCode // maybe kgm
	#weight // value of unit code

	#startDate

	#deliveryAddress
	#despatchAddress

	#carrier // transportist

	#inLightVehicle

	#vehicles = Array()

	#drivers = Array()

	// A 'package' is reserved word :(
	#packages = Array()

	#port

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

	setCarrier(carrier) {
		this.#carrier = carrier
	}

	getCarrier() {
		return this.#carrier
	}

	inLightVehicle() {
		return this.#inLightVehicle
	}

	usingLightVehicle(using) {
		this.#inLightVehicle = using
	}

	addVehicle(vehicle) {
		this.#vehicles.push(vehicle)
	}

	getVehicles() {
		return this.#vehicles
	}

	addDriver(driver) {
		this.#drivers.push(driver)
	}

	getDrivers() {
		return this.#drivers
	}

	addPackage(p) {
		this.#packages.push(p)
	}

	getPackages() {
		return this.#packages
	}

	setPort(port) {
		this.#port = port
	}

	getPort() {
		return this.#port
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

		NodesGenerator.generateLines(this)
	}

	async declare(zipStream) {
		const jsonBody = await Rest.generateSend(this, zipStream)
		const responseText = await Endpoint.fetchSend(JSON.stringify(jsonBody), this)
		return responseText
	}

	async handleProof(ticketNumber) {
		const responseText = await Endpoint.fetchStatus(ticketNumber)
		return responseText
	}

	fromXml(xmlContent) {
		const xmlDoc = new DOMParser().parseFromString(xmlContent, "text/xml")

		const id = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent || ""
		const [serie, numeration] = id.split('-')
		this.setSerie(serie)
		this.setNumeration(parseInt(numeration))

		const typeCode = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, `${this.name}TypeCode`)[0]?.textContent || "";
		this.setTypeCode(parseInt(typeCode))

		{
			const customer = new Person()
			const accountingCustomerParty = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "DeliveryCustomerParty")[0];
			const id = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent || "";
			const type = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.getAttribute("schemeID") || "";
			customer.setIdentification(new Identification(parseInt(type), id))

			this.setCustomer(customer)
		}
	}
}

export default Despatch
