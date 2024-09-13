import { Invoice, Item, Share, Charge, Person, Taxpayer, Identification } from '../src/fractuyo.js';

test("creating invoice", () => {
	const customer = new Person()
	customer.setName("Lugar Expresivo SAC")
	customer.setIdentification(new Identification(6, "20545314437"))

	const taxpayer = new Taxpayer()
	taxpayer.setName("Efectibit SAC")
	taxpayer.setIdentification(new Identification(6, "20606829265"))

	const invoice = new Invoice(taxpayer, customer)
	invoice.setCurrencyId("USD")
	invoice.setTypeCode(3)
	invoice.setSerie("F000")
	invoice.setNumeration(19970601)
	invoice.setOrderReference("test-002")
	invoice.setOrderReferenceText("Testing library to generate invoice")

	const product = new Item("This is description for item")
	product.setUnitCode("NIU")
	product.setClassificationCode("82101500")
	product.setIscPercentage(0)
	product.setIgvPercentage(18)
	product.setQuantity(3)
	product.setUnitValue(100.00)
	product.calcMounts()

	invoice.addItem(product)

	invoice.toXml()
	invoice.sign()

	assert.equal(taxpayer.getName(), "Efectibit SAC")
	assert.equal(taxpayer.getIdentification().getNumber(), "20606829265")

	assert.equal(invoice.getId(true), "03-F000-19970601")
	assert.equal(invoice.getDataQr(), "")
})
