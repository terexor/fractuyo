import test from 'ava'
import { JSDOM } from 'jsdom'
import fs from 'node:fs'
import { Application } from "xmldsigjs"

import { Vehicle, Package, Port, Endpoint, Despatch, Item, Person, Driver, Taxpayer, Identification, Address } from '../src/fractuyo.js';

let customer
let taxpayer
let despatch

test.before(async t => {
	const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>')
	global.window = window
	global.document = window.document

	Application.setEngine("NodeJS", globalThis.crypto)
})

test.serial("creating persons", tester => {
	customer = new Person()
	customer.setName("Lugar Expresivo SAC")
	customer.setIdentification(new Identification(6, "20545314437"))

	const address = new Address()
	address.line = "An address in Peru"
	address.country = "PE"
	address.ubigeo = "150101"
	address.typecode = "0000"
	address.urbanization = "The Urbanization"
	address.city = "The City"
	address.subentity = "Provincia"
	address.district = "St. District of Provincia"

	taxpayer = new Taxpayer()
	taxpayer.setSolId("test-85e5b0ae-255c-4891-a595-0b98c65c9854")
	taxpayer.setSolSecret("test-Hty/M6QshYvPgItX2P0+Kw==")
	taxpayer.setSolUser("MODDATOS")
	taxpayer.setSolPass("MODDATOS")
	taxpayer.setName("Efectibit SAC")
	taxpayer.setTradeName("Efectibit")
	taxpayer.setIdentification(new Identification(6, "20606829265"))
	taxpayer.setAddress(address)

	try {
		const cert = fs.readFileSync("./tests/cert.pem", "utf8")
		taxpayer.setCert(cert)
		const key =  fs.readFileSync("./tests/key.pem", "utf8")
		taxpayer.setKey(key)
	}
	catch (err) {
		console.error(err)
	}

	tester.is(taxpayer.getName(), "Efectibit SAC")
	tester.is(taxpayer.getIdentification().getNumber(), "20606829265")
})

test.serial("creating despatch", (tester) => {
	despatch = new Despatch(taxpayer, customer)
	despatch.setIssueDate(new Date())
	despatch.setTypeCode(9)
	despatch.setSerie("T000")
	despatch.setNumeration(2)
	despatch.setNote("Sending on time")
	despatch.setStartDate(new Date())
	despatch.setUnitCode("KGM")
	despatch.setWeight(4)
	despatch.setHandlingCode(1)
	despatch.usingLightVehicle(false)

	// When is "transportista" set as true
	if (false) {
		const carrier = new Person()
		carrier.setName("Transportists SA")
		carrier.setIdentification(new Identification(6, "20000000001"))
		despatch.setCarrier(carrier)
	}

	const deliveryAddress = new Address()
	deliveryAddress.line = "An address in Peru"
	deliveryAddress.ubigeo = "150101"
	despatch.setDeliveryAddress(deliveryAddress)

	const mainVehicle = new Vehicle("ABC999")
	despatch.addVehicle(mainVehicle)

	const secondVehicle = new Vehicle("ABC000")
	despatch.addVehicle(secondVehicle)

	const mainDriver = new Driver("71936980X")
	mainDriver.setName("George")
	mainDriver.setFamilyName("Garro")
	mainDriver.setIdentification(new Identification(1, "71936980"))
	despatch.addDriver(mainDriver)

	const anotherDriver = new Driver("74166745Q")
	anotherDriver.setName("Walter")
	anotherDriver.setFamilyName("Felipe")
	anotherDriver.setIdentification(new Identification(1, "74166745"))
	despatch.addDriver(anotherDriver)

	const airport = new Port(false, "LIM")
	airport.setName("Internacional Jorge Chavez")
	despatch.setPort(airport)

	const product = new Item("This is description for moving item")
	product.setUnitCode("NIU")
	product.setClassificationCode("82101500")
	product.setQuantity(1)

	despatch.addItem(product)

	tester.is(customer.getIdentification().getNumber(), "20545314437")

	tester.is(despatch.getId(true), "09-T000-00000002")
})

test.serial("signing despatch", async tester => {
	despatch.toXml()

	const { subtle } = globalThis.crypto // from Node API
	const isSigned = await despatch.sign(subtle)

	tester.true(isSigned)

	// Remove this return to validate despatch with XSD
	return

	try {
		const mainXsdContent = fs.readFileSync("./tests/xsd/2.1/maindoc/UBL-DespatchAdvice-2.1.xsd", "utf8").replace(
			/schemaLocation="(\.\.\/)+common\//g,
			'schemaLocation="'
		)

		const secondarySchemas = [
			"UBL-CommonAggregateComponents-2.1.xsd",
			"UBL-CommonBasicComponents-2.1.xsd",
			"UBL-CommonExtensionComponents-2.1.xsd",
			"UBL-CommonSignatureComponents-2.1.xsd",
			"UBL-ExtensionContentDataType-2.1.xsd",
			"UBL-QualifiedDataTypes-2.1.xsd",
			"UBL-SignatureAggregateComponents-2.1.xsd",
			"UBL-SignatureBasicComponents-2.1.xsd",
			"UBL-UnqualifiedDataTypes-2.1.xsd",
			"UBL-xmldsig-core-schema-2.1.xsd",
			"UBL-XAdESv132-2.1.xsd",
			"UBL-XAdESv141-2.1.xsd",
			"CCTS_CCT_SchemaModule-2.1.xsd"
		].map(filename => ({
			fileName: filename,
			contents: fs.readFileSync(`./tests/xsd/2.1/common/${filename}`, "utf8").replace(
				/schemaLocation="(\.\.\/)+common\//g,
				'schemaLocation="'
			)
		}))

		const xmlValidated = await despatch.validateXmlWithXsd(
			{
				fileName: "UBL-DespatchAdvice-2.1.xsd",
				contents: mainXsdContent
			},
			secondarySchemas
		)

		if (!xmlValidated) {
			tester.true(false)
			return
		}
	}
	catch (err) {
		console.error(err)
		tester.true(false)
	}
})

test.serial("presenting despatch", async tester => {
	try {
		if (!Endpoint.token) {
			const tokenData = await Endpoint.fetchToken(taxpayer)
		}

		const zipStream = await despatch.createZip()
		const serverJsonStream = await despatch.declare(zipStream)
		const serverZipStream = await despatch.handleTicket(serverJsonStream.numTicket);
		const [ serverCode, serverDescription ] = await despatch.handleProof(serverZipStream.arcCdr, true, true);

		tester.is(serverCode, 0)
	}
	catch (e) {
		console.error(e)
		tester.fail()
	}
})
