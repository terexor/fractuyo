import test from 'ava'
import { JSDOM } from 'jsdom'
import fs from 'node:fs'
import XmlDSigJs from "xmldsigjs"

import { Endpoint, Despatch, Item, Person, Taxpayer, Identification, Address } from '../src/fractuyo.js';

let customer
let taxpayer
let despatch

test.before(async t => {
	const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>')
	global.window = window
	global.document = window.document

	XmlDSigJs.Application.setEngine("NodeJS", globalThis.crypto)
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
	despatch.setIssueDate(new Date("13-Sep-2024 UTC"))
	despatch.setTypeCode(9)
	despatch.setSerie("T000")
	despatch.setNumeration(2)
	despatch.setNote("Sending on time")
	despatch.setStartDate(new Date("29-Sep-2024 UTC"))
	despatch.setUnitCode("KGM")
	despatch.setWeight(4)

	const carrier = new Person()
	carrier.setName("Transportists SA")
	carrier.setIdentification(new Identification(6, "20000000001"))
	despatch.setCarrier(carrier)

	const deliveryAddress = new Address()
	deliveryAddress.line = "An address in Peru"
	deliveryAddress.ubigeo = "150101"
	despatch.setDeliveryAddress(deliveryAddress)

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

	try {
		if (!Endpoint.token) {
			const tokenData = await Endpoint.fetchToken(taxpayer)
		}

		const zipStream = await despatch.createZip()
		const serverZipStream = await despatch.declare(zipStream)
		const serverCode = await despatch.handleProof(serverZipStream.numTicket)

		tester.is(serverCode.codRespuesta, '0')
	}
	catch (e) {
		console.error(e)
		tester.fail()
	}
})
