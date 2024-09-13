import test from 'ava'
import { JSDOM } from 'jsdom'

import { Invoice, Item, Share, Charge, Person, Taxpayer, Identification } from '../src/fractuyo.js';

let customer
let taxpayer

test.before(async t => {
	const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>')
	global.window = window
	global.document = window.document
})

test("creating persons", tester => {
	customer = new Person()
	customer.setName("Lugar Expresivo SAC")
	customer.setIdentification(new Identification(6, "20545314437"))

	taxpayer = new Taxpayer()
	taxpayer.setName("Efectibit SAC")
	taxpayer.setIdentification(new Identification(6, "20606829265"))

	tester.is(taxpayer.getName(), "Efectibit SAC")
	tester.is(taxpayer.getIdentification().getNumber(), "20606829265")
})

test("creating invoice", (tester) => {
	const invoice = new Invoice(taxpayer, customer)
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
	product.setQuantity(1)
	product.setUnitValue(100.00)
	product.calcMounts()

	invoice.addItem(product)

	invoice.toXml()
	invoice.sign()

	tester.is(customer.getIdentification().getNumber(), "20545314437")

	tester.is(invoice.getId(true), "01-F000-19970601")
	tester.is(invoice.getDataQr(), "20606829265|01|F000|19970601|18.00|118.00|2024-09-13|06|20545314437|")
})
