import test from 'ava'
import { JSDOM } from 'jsdom'
import fs from 'node:fs'
import XAdES from "xadesjs"

import { Note, Item, Share, Charge, Person, Taxpayer, Identification, Address } from '../src/fractuyo.js';

let customer
let taxpayer
let creditNote

test.before(async t => {
	const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>')
	global.window = window
	global.document = window.document

	XAdES.Application.setEngine("NodeJS", globalThis.crypto)
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

test.serial("creating note", tester => {
	creditNote = new Note(taxpayer, customer, true)
	creditNote.setIssueDate(new Date("20-Sep-2024 UTC"))
	creditNote.setCurrencyId("USD")
	creditNote.setSerie("F000")
	creditNote.setNumeration(97)
	creditNote.setResponseCode(1)
	creditNote.setDocumentReference("F000-19970601")
	creditNote.setDocumentReferenceTypeCode(1)
	creditNote.setDescription("Testing library to eliminate invoice")

	const product = new Item("This is description for item")
	product.setUnitCode("NIU")
	product.setClassificationCode("82101500")
	product.setIscPercentage(0)
	product.setIgvPercentage(18)
	product.setExemptionReasonCode(10)
	product.setQuantity(1)
	product.setUnitValue(100.00)
	product.calcMounts()

	creditNote.addItem(product)

	tester.is(customer.getIdentification().getNumber(), "20545314437")

	tester.is(creditNote.getId(true), "07-F000-00000097")
	tester.is(creditNote.getQrData(), "20606829265|07|F000|00000097|18.00|118.00|2024-09-20|6|20545314437")
})

test.serial("signing note", async tester => {
	creditNote.toXml()

	const { subtle } = globalThis.crypto // from Node API
	const isSigned = await creditNote.sign(subtle)

	tester.true(isSigned)

	try {
		const zipStream = await creditNote.createZip()
		const serverZipStream = await creditNote.declare(zipStream)
		const serverCode = await creditNote.handleProof(serverZipStream)

		tester.is(serverCode, 0)
	}
	catch (e) {
		console.error(e)
		tester.fail()
	}
})
