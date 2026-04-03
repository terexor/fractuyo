import test from 'ava'
import { JSDOM } from 'jsdom'
import fs from 'node:fs'
import { Application } from "xmldsigjs"

import { Invoice, Item, PrepaidPaymentReference, DocumentReference, Person, Taxpayer, Identification, Address } from '../src/fractuyo.js'

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
		const key = fs.readFileSync("./tests/key.pem", "utf8")
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

	// Adding an invoice reference
	// const additionalDocumentReference = new DocumentReference(DocumentReference.ADDITIONAL)
	// additionalDocumentReference.setId("F000-19940714")
	// additionalDocumentReference.setTypeCode(1)
	// invoice.addDocumentReference(additionalDocumentReference)

	const prepaidPayment1 = new PrepaidPaymentReference()
	prepaidPayment1.setId("F000-19950728")
	prepaidPayment1.setTypeCode(2)
	prepaidPayment1.setAmount(118.00)
	prepaidPayment1.setTaxAmount(18.00)
	invoice.addDocumentReference(prepaidPayment1)

	const prepaidPayment2 = new PrepaidPaymentReference()
	prepaidPayment2.setId("F000-19950729")
	prepaidPayment2.setTypeCode(2)
	prepaidPayment2.setAmount(118.00)
	prepaidPayment2.setTaxAmount(18.00)
	invoice.addDocumentReference(prepaidPayment2)

	const product = new Item("This is description for item")
	product.setUnitCode("NIU")
	product.setClassificationCode("82101500")
	product.setIscPercentage(0)
	product.setIgvPercentage(18)
	product.setExemptionReasonCode(10)
	product.setQuantity(1)
	product.setUnitValue(1000.00)
	product.calcMounts()

	invoice.addItem(product)

	tester.is(customer.getIdentification().getNumber(), "20545314437")

	tester.is(invoice.getAllowanceCharges().length, 2)
	tester.is(invoice.getAllowanceCharges()[0].amount, 100.00)
	tester.is(invoice.getAllowanceCharges()[0].getTypeCode(), "04")

	tester.is(invoice.getId(true), "01-F000-19970601")
	tester.is(invoice.getQrData(), "20606829265|01|F000|19970601|180.00|944.00|2024-09-13|6|20545314437")
})

test.serial("signing invoice", async tester => {
	invoice.toXml()
	console.log(invoice.toString())

	const { subtle } = globalThis.crypto // from Node API
	const isSigned = await invoice.finalize(subtle)

	tester.true(isSigned)

	// Remove this return to validate with XSD
	return

	try {
		const mainXsdContent = fs.readFileSync("./tests/xsd/2.1/maindoc/UBL-Invoice-2.1.xsd", "utf8").replace(
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

		const xmlValidated = await invoice.validateXmlWithXsd(
			{
				fileName: "UBL-Invoice-2.1.xsd",
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

test.serial("presenting invoice", async tester => {
	try {
		const zipStream = await invoice.createZip()
		const serverZipStream = await invoice.declare(zipStream)
		const [serverCode, serverDescription] = await invoice.handleProof(serverZipStream)

		tester.is(serverCode, 0)
	}
	catch (e) {
		console.error(e)
		tester.fail()
	}
})
