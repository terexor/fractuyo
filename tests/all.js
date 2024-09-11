import { Invoice, Item, Share, Charge, Person, Taxpayer, Identification } from '../src/fractuyo.js';

if (typeof Invoice === 'undefined') {
	throw new Error('Invoice is not defined');
}
else {
	const customer = new Person()
	customer.setName("Garmur")

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

	console.log("Taxpayer:", taxpayer.getName(), "/ ID:", taxpayer.getIdentification().getNumber())
	console.log("Invoice:", invoice.getId(true))
	console.log("QR data:", invoice.getDataQr())
}
