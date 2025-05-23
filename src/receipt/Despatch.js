import Receipt from "./Receipt.js"
import Item from "./Item.js"
import Taxpayer from "../person/Taxpayer.js"
import Person from "../person/Person.js"
import Identification from "../person/Identification.js"
import Address from "../person/Address.js"
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

	#handlingCode // catalog 20

	#carrier // transportist

	#inLightVehicle

	#vehicles = Array()

	#drivers = Array()

	// A 'package' is reserved word :(
	#packages = Array()

	#port

	#url // Generated in Sunat

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
		const regex = /^\d{1,12}(\.\d{1,3})?$/
		if (regex.test(weight)) {
			this.#weight = parseFloat(weight)
			return
		}

		// Weightless to throw error in validation
		this.#weight = 0
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

	/**
	 * @param real in true to force getting what was set instead fiscal address.
	 */
	getDespatchAddress(real = false) {
		if (this.#despatchAddress || real) {
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

	setHandlingCode(code) {
		this.#handlingCode = code
	}

	getHandlingCode(withFormat = false) {
		return withFormat ? String(this.#handlingCode).padStart(2, '0') : this.#handlingCode
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

	setUrl(url) {
		this.#url = url
	}

	getPort() {
		return this.#port
	}

	toXml() {
		this.createXmlWrapper();

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

	getQrData() {
		return this.#url
	}

	validate(validateNumeration) {
		super.validate(validateNumeration)

		if (!(this.#startDate instanceof Date)) {
			throw new Error("No hay fecha de partida.")
		}

		if (!this.#weight || this.#weight <= 0) {
			throw new Error("No tiene peso correcto.")
		}

		if (!this.#unitCode || this.#unitCode.length == 0) {
			throw new Error("No tiene unidad de medida de peso.")
		}

		if (!this.#handlingCode) {
			throw new Error("No está definido el motivo.")
		}

		if (this.#deliveryAddress instanceof Address) {
			if (!this.#deliveryAddress.line || this.#deliveryAddress.line.length == 0) {
				throw new Error("No hay línea en dirección de destino.")
			}
			if (!this.#deliveryAddress.ubigeo || this.#deliveryAddress.ubigeo.length != 6) {
				throw new Error("No hay ubigeo en dirección de destino.")
			}
		}
		else {
			throw new Error("No hay dirección de destino.")
		}

		if (this.items.length == 0) {
			throw new Error("No hay ítems en este despacho.")
		}

		// Check item attributes
		let c = 0;
		for (const item of this.items) {
			c++; // simple counter
			if (!item.getQuantity() || item.getQuantity() <= 0) {
				throw new Error(`Ítem ${c} tiene cantidad errónea.`)
			}
			if (!item.getUnitCode() || item.getUnitCode().length == 0) {
				throw new Error(`Ítem ${c} sin unidad de medida.`)
			}
			if (!item.getDescription() || item.getDescription().length == 0) {
				throw new Error(`Ítem ${c} no tiene descripción.`)
			}
		}
	}

	async declare(zipStream) {
		const jsonBody = await Rest.generateSend(this, zipStream)
		const responseText = await Endpoint.fetchSend(JSON.stringify(jsonBody), this)
		return responseText
	}

	async handleTicket(ticketNumber) {
		const responseText = await Endpoint.fetchStatus(ticketNumber)
		return responseText
	}

	fromXml(xmlContent) {
		const xmlDoc = super.fromXml(xmlContent)

		const typeCode = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, `${this.name}TypeCode`)[0]?.textContent || "";
		this.setTypeCode(parseInt(typeCode))

		// Find note as child. Not deeper level.
		const probableNote = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, "Note")[0]
		if (
			probableNote && // exists
			probableNote.parentNode.localName === "DespatchAdvice"
		) {
			this.#note = probableNote.textContent
		}

		{
			const taxpayer = new Taxpayer()
			const accountingSupplierParty = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "DespatchSupplierParty")[0];
			const id = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent || "";
			const type = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.getAttribute("schemeID") || "";
			taxpayer.setIdentification(new Identification(parseInt(type), id))

			const tradeName = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "Name")[0]?.textContent || ""
			taxpayer.setTradeName(tradeName)

			const name = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "RegistrationName")[0]?.textContent || ""
			taxpayer.setName(name)

			{
				const registrationAddress = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cac, "RegistrationAddress")[0]

				const address = new Address()
				address.ubigeo = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent || ""
				address.city = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "CityName")[0]?.textContent || ""
				address.district = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "District")[0]?.textContent || ""
				address.subentity = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "Subentity")[0]?.textContent || ""
				address.line = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "Line")[0]?.textContent || ""

				taxpayer.setAddress(address)
			}

			{ // contact info
				taxpayer.setWeb(accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "Note")[0]?.textContent)
				taxpayer.setEmail(accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ElectronicMail")[0]?.textContent)
				taxpayer.setTelephone(accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "Telephone")[0]?.textContent)
			}

			this.setTaxpayer(taxpayer)
		}

		{
			const customer = new Person()
			const accountingCustomerParty = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "DeliveryCustomerParty")[0];
			const id = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent || "";
			const type = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.getAttribute("schemeID") || "";
			customer.setIdentification(new Identification(parseInt(type), id))
			customer.setName(accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "RegistrationName")[0]?.textContent || "-")

			// customer address
			{
				const registrationAddress = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cac, "RegistrationAddress")[0]

				if (registrationAddress) {
					const address = new Address();
					address.line = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "Line")[0]?.textContent;

					customer.setAddress(address);
				}
			}

			this.setCustomer(customer)
		}

		const items = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "DespatchLine");
		for (let i = 0; i < items.length; i++) {
			const item = new Item( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "Description")[0]?.textContent || "" )
			item.setQuantity( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "DeliveredQuantity")[0]?.textContent || "" )
			item.setUnitCode( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "DeliveredQuantity")[0]?.getAttribute("unitCode") || "" )

			this.addItem(item)
		}

		{ // Shipment
			const shipment = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "Shipment")[0]
			this.setWeight(parseFloat(shipment.getElementsByTagNameNS(Receipt.namespaces.cbc, "GrossWeightMeasure")[0].textContent))
			this.setUnitCode(shipment.getElementsByTagNameNS(Receipt.namespaces.cbc, "GrossWeightMeasure")[0].getAttribute("unitCode"))

			const startDate = shipment.getElementsByTagNameNS(Receipt.namespaces.cbc, "StartDate")[0].textContent
			let dateParts = startDate.split('-'); // split in year, month and day
			this.setStartDate(new Date(dateParts[0], dateParts[1] - 1, dateParts[2]))

			// look for if vehicle is M1 or L
			const specialInstruction = shipment.getElementsByTagNameNS(Receipt.namespaces.cbc, "SpecialInstructions")[0]?.textContent
			if (specialInstruction == "SUNAT_Envio_IndicadorTrasladoVehiculoM1L") {
				this.#inLightVehicle = true;
			}

			// Handling code according catalog 20
			const handlingCode = shipment.getElementsByTagNameNS(Receipt.namespaces.cbc, "HandlingCode")[0].textContent
			this.setHandlingCode(parseInt(handlingCode))

			const transportMode = shipment.getElementsByTagNameNS(Receipt.namespaces.cbc, "TransportModeCode")[0].textContent
			// We will check more data about carrier if is public transport
			if (transportMode === "01") {
				const carrierParty = shipment.getElementsByTagNameNS(Receipt.namespaces.cac, "CarrierParty")[0]

				const carrier = new Person()
				carrier.setName(carrierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "RegistrationName")[0].textContent)
				const identification = carrierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]
				carrier.setIdentification(new Identification(identification.getAttribute("schemeID"), identification.textContent))
				this.setCarrier(carrier)
			}

			{ // delivery address
				const deliveryAddress = shipment.getElementsByTagNameNS(Receipt.namespaces.cac, "DeliveryAddress")[0]
				const address = new Address()
				address.ubigeo = deliveryAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0].textContent
				address.line = deliveryAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "Line")[0].textContent
				this.setDeliveryAddress(address)
			}

			{ // despatch address
				const despatchAddress = shipment.getElementsByTagNameNS(Receipt.namespaces.cac, "DespatchAddress")[0]
				const address = new Address()
				address.ubigeo = despatchAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0].textContent
				address.line = despatchAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "Line")[0].textContent
				this.setDespatchAddress(address)
			}
		}
	}
}

export default Despatch
