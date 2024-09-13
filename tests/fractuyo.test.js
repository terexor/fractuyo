import test from 'ava'

import { Invoice, Item, Share, Charge, Person, Taxpayer, Identification } from '../src/fractuyo.js';

test("creating invoice", (tester) => {
	const customer = new Person()
	customer.setName("Lugar Expresivo SAC")
	customer.setIdentification(new Identification(6, "20545314437"))

	const taxpayer = new Taxpayer()
	taxpayer.setName("Efectibit SAC")
	taxpayer.setIdentification(new Identification(6, "20606829265"))

	const invoice = new Invoice(taxpayer, customer)
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

	tester.is(taxpayer.getName(), "Efectibit SAC")
	tester.is(taxpayer.getIdentification().getNumber(), "20606829265")

	tester.is(invoice.getId(true), "01-F000-19970601")
})
