import test from "ava"
import { JSDOM } from 'jsdom'
import fs from "node:fs"
import { Application } from "xmldsigjs"

import { Invoice, Item, Taxpayer, Identification, Address, Person } from "../src/fractuyo.js"

let taxpayer
const customers = []
const invoices = []
const ITERATIONS = 3001 // Adjust it

test.before(async t => {
	const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>')
	global.window = window
	global.document = window.document

	Application.setEngine("NodeJS", globalThis.crypto)
})

test.serial("setting a taxpayer", t => {
	// Just this one for all invoices
	taxpayer = new Taxpayer()
	taxpayer.setName("Efectibit SAC")
	taxpayer.setTradeName("Efectibit")
	taxpayer.setIdentification(new Identification(6, "20606829265"))

	const address = new Address()
	address.line = "Av. Juan Pardo de Zela"
	address.district = "Lince"
	address.country = "PE"
	address.ubigeo = "150116"
	taxpayer.setAddress(address)

	t.pass()
})

test.serial(`creating ${ITERATIONS} customers and invoices`, t => {
	for (let i = 0; i < ITERATIONS; ++i) {
		const customer = new Person()
		customer.setName(`Cliente Experimental ${i}`)
		customer.setIdentification(new Identification(6, "20000000001"))

		const invoice = new Invoice(taxpayer, customer)
		invoice.setIssueDate(new Date())
		invoice.setCurrencyId((i & 1) === 0 ? "PEN" : "USD")
		invoice.setSerie("FGVC")
		invoice.setNumeration(i + 1)
		invoice.setTypeCode(1)

		// Alternating: some have 1 product, others could have up to 20
		// (i % 20) + 1: range [1, 20]
		const itemsCount = (i % 5 === 0) ? 1 : (i % 20) + 1

		for (let j = 0; j < itemsCount; ++j) {
			const product = new Item(`Producto ${j + 1} de la Factura ${i}`)
			product.setUnitCode("NIU")
			product.setQuantity(j + 1)
			product.setUnitValue(3.90 + i + j) // For varying prices
			product.setIgvPercentage(10.5)
			product.setExemptionReasonCode(13)

			// calculate amounts before adding
			product.calcMounts()
			invoice.addItem(product)
		}

		// save onto memory for benchmark
		customers.push(customer)
		invoices.push(invoice)
	}
	t.is(invoices.length, ITERATIONS)
})

test.serial("First XML generation", async tester => {
	console.time("--- First XML generation")
	invoices[0].toXml()
	console.timeEnd("--- First XML generation")
	tester.pass()
})

test.serial("benchmark: direct hardware execution", t => {
	let totalTime = 0
	console.log(`--- Processing ${ITERATIONS} invoices & customers ---`)

	// loop to call many times generation of XML
	for (let i = 1; i < ITERATIONS; ++i) {
		const start = performance.now()

		// optimized method
		invoices[i].toXml()

		const end = performance.now()
		totalTime += (end - start)

		// optional logging every 1000 to avoid overloading stdout
		if (i % 1000 === 0 && i > 0) {
			console.log(`Checkpoint ${i}: ${ (totalTime / i).toFixed(4) }ms average`)
		}
	}

	const average = totalTime / ITERATIONS
	console.log("--------------------------------------------------")
	console.log(`Average: ${average.toFixed(4)} ms per invoice`)
	console.log(`Throughput: ${Math.floor(1000 / average)} invoice/second`)
	console.log("--------------------------------------------------")

	t.true(average < 0.9) // Performance is variable per machine
})
