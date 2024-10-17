import test from 'ava'
import { JSDOM } from 'jsdom'
import fs from 'node:fs'
import { Application } from "xmldsigjs"

import { Invoice, Item, Share, Charge, Person, Taxpayer, Identification, Address } from '../src/fractuyo.js';

let customer
let taxpayer
let invoice

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

test.serial("creating invoice", (tester) => {
	invoice = new Invoice(taxpayer, customer)
	invoice.setIssueDate(new Date("13-Sep-2024 UTC"))
	invoice.setCurrencyId("USD")
	invoice.setTypeCode(1)
	invoice.setSerie("F000")
	invoice.setNumeration(19970601)
	invoice.setOrderReference("test-002")
	invoice.setOrderReferenceText("Testing library to generate invoice")

	const product = new Item("This is description for item")
	product.setUnitCode("NIU")
	product.setClassificationCode("82101500")
	product.setIscPercentage(0)
	product.setIgvPercentage(18)
	product.setExemptionReasonCode(10)
	product.setQuantity(1)
	product.setUnitValue(100.00)
	product.calcMounts()

	invoice.addItem(product)

	tester.is(customer.getIdentification().getNumber(), "20545314437")

	tester.is(invoice.getId(true), "01-F000-19970601")
	tester.is(invoice.getQrData(), "20606829265|01|F000|19970601|18.00|118.00|2024-09-13|6|20545314437")
})

test.serial("signing invoice", async tester => {
	invoice.toXml()

	const { subtle } = globalThis.crypto // from Node API
	const isSigned = await invoice.sign(subtle)

	tester.true(isSigned)

	try {
		const zipStream = await invoice.createZip()
		const serverZipStream = await invoice.declare(zipStream)
		const serverCode = await invoice.handleProof(serverZipStream)

		tester.is(serverCode, 0)
	}
	catch (e) {
		console.error(e)
		tester.fail()
	}
})
