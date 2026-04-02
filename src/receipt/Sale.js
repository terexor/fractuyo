import Receipt from "./Receipt.js"
import DocumentReference from "./DocumentReference.js"
import PrepaidPaymentReference from "./PrepaidPaymentReference.js"
import Item from "./Item.js"
import Share from "./Share.js"
import Taxpayer from "../person/Taxpayer.js"
import Person from "../person/Person.js"
import Identification from "../person/Identification.js"
import Address from "../person/Address.js"

class Sale extends Receipt {
	/**
	 * ISO 4217 currency code.
	 * @type {string}
	 */
	#currencyId

	/** @type {number} */
	#igvPercentage

	/*
	 * Global totals
	 */
	#lineExtensionAmount = 0
	#taxTotalAmount = 0
	#taxInclusiveAmount = 0
	#prepaidAmount = 0
	#payableAmount = 0
	#igvAmount = 0
	#iscAmount = 0
	#icbpAmount = 0

	/**
	 * @type {Float64Array}
	 */
	#operationAmounts = new Float64Array(4) // zero-filling [0, 0, 0, 0]

	/**
	 * Empty hook to be overridden by subclasses. Invoice overrides it.
	 * @param {Date} date - The due date.
	 */
	setDueDate(date) {
		// Empty
	}

	constructor(taxpayer, customer, name) {
		super(taxpayer, customer, name)
	}

	get lineExtensionAmount() {
		return this.#lineExtensionAmount
	}

	set lineExtensionAmount(amount) {
		this.#lineExtensionAmount = amount
	}

	get taxTotalAmount() {
		return this.#taxTotalAmount
	}

	set taxTotalAmount(amount) {
		this.#taxTotalAmount = amount
	}

	get taxInclusiveAmount() {
		return this.#taxInclusiveAmount
	}

	set taxInclusiveAmount(amount) {
		this.#taxInclusiveAmount = amount

	get prepaidAmount() {
		return this.#prepaidAmount
	}

	set prepaidAmount(amount) {
		this.#prepaidAmount = amount
	}

	get payableAmount() {
		return this.#payableAmount
	}

	set payableAmount(amount) {
		this.#payableAmount = amount
	}

	get igvAmount() {
		return this.#igvAmount
	}

	set igvAmount(amount) {
		this.#igvAmount = amount
	}

	get iscAmount() {
		return this.#iscAmount
	}

	set iscAmount(amount) {
		this.#iscAmount = amount
	}

	get icbpAmount() {
		return this.#icbpAmount
	}

	set icbpAmount(amount) {
		this.#icbpAmount = amount
	}

	/**
	 * Access to operation amounts array stored in 4 cells.
	 * @param {number} index - from 0 to 3
	 * @returns {number} - Value of operation amount.
	 */
	getOperationAmount(index) {
		return this.#operationAmounts[index]
	}

	/**
	 * Store an operation amount in cell of the array.
	 * @param {number} index - from 0 to 3
	 * @param {number} amount - Value of operation amount.
	 */
	setOperationAmount(index, amount) {
		this.#operationAmounts[index] = amount
	}

	/**
	 * @param {string} cid - ISO 4217 currency code.
	 */
	setCurrencyId(cid) {
		this.#currencyId = cid
	}

	/**
	 * @returns {string}
	 */
	getCurrencyId() {
		return this.#currencyId
	}

	/**
	 * Sunat requires that the IGV rate must be the same across all items in an invoice.
	 * It must correspond to a valid rate.
	 * @param {number} percentage - IGV percentage.
	 */
	set igvPercentage(percentage) {
		this.#igvPercentage = percentage
	}

	/**
	 * @returns {number} - IGV percentage.
	 */
	get igvPercentage() {
		return this.#igvPercentage
	}

	/**
	 * Adds an item to the collection or cart.
	 *
	 * @param {Item} item - The item to be added.
	 * @param {boolean} [withoutCalculation=false] - If true, skips recalculating totals after adding the item.
	 *
	 * @returns {void} This function does not return a value.
	 */
	addItem(item, withoutCalculation = false) {
		super.addItem(item)

		// Avoid calculation over this header
		if (withoutCalculation) {
			return
		}

		this.#lineExtensionAmount += item.getLineExtensionAmount()
		this.#taxTotalAmount += item.getTaxTotalAmount()
		this.#taxInclusiveAmount += item.getLineExtensionAmount() + item.getTaxTotalAmount()

		this.#payableAmount = this.#taxInclusiveAmount - this.#prepaidAmount

		this.#igvAmount += item.getIgvAmount()
		this.#iscAmount += item.getIscAmount()

		//Assign data according taxability
		switch (true) {
			case (item.getExemptionReasonCode() < 20):
				this.#operationAmounts[0] += item.getLineExtensionAmount(); break
			case (item.getExemptionReasonCode() < 30):
				this.#operationAmounts[1] += item.getLineExtensionAmount(); break
			case (item.getExemptionReasonCode() < 40):
				this.#operationAmounts[2] += item.getLineExtensionAmount(); break
			default:
				this.#operationAmounts[3] += item.getLineExtensionAmount()
		}
	}

	/**
	 * Use it if maybe you have edited an item or removed.
	 */
	recalcMounts() {
		// Cleaning values
		this.#lineExtensionAmount = this.#taxTotalAmount = this.#taxInclusiveAmount = this.#igvAmount = this.#iscAmount = 0
		this.#operationAmounts.fill(0) // fast for cleaning

		for (const item of this.items) {
			this.#lineExtensionAmount += item.getLineExtensionAmount()
			this.#taxTotalAmount += item.getTaxTotalAmount()
			this.#taxInclusiveAmount += item.getLineExtensionAmount() + item.getTaxTotalAmount()

			this.#igvAmount += item.getIgvAmount()
			this.#iscAmount += item.getIscAmount()

			//Assign data according taxability
			switch (true) {
				case (item.getExemptionReasonCode() < 20):
					this.#operationAmounts[0] += item.getLineExtensionAmount(); break
				case (item.getExemptionReasonCode() < 30):
					this.#operationAmounts[1] += item.getLineExtensionAmount(); break
				case (item.getExemptionReasonCode() < 40):
					this.#operationAmounts[2] += item.getLineExtensionAmount(); break
				default:
					this.#operationAmounts[3] += item.getLineExtensionAmount()
			}
		}

		this.#payableAmount = this.#taxInclusiveAmount - this.#prepaidAmount
	}

	/**
	 * @param {DocumentReference} documentReference
	 */
	addDocumentReference(documentReference) {
		super.addDocumentReference(documentReference)

		if (documentReference instanceof PrepaidPaymentReference) {
			this.#prepaidAmount += documentReference.getAmount()
			this.#payableAmount = this.#taxInclusiveAmount - this.#prepaidAmount
		}
	}

	/**
	 * Gets the QR data that is header of this document separated by pipes.
	 * @returns {string}
	 */
	getQrData() {
		return this.getTaxpayer().getIdentification().getNumber()
			+ '|' + this.getId(true).replaceAll('-', '|')
			+ '|' + this.igvAmount.toFixed(2)
			+ '|' + this.taxInclusiveAmount.toFixed(2)
			+ '|' + this.getIssueDate().toISOString().substr(0, 10)
			+ '|' + (this.getCustomer()?.getIdentification()?.getType() ?? "")
			+ '|' + (this.getCustomer()?.getIdentification()?.getNumber() ?? "")
	}

	validate(validateNumeration) {
		super.validate(validateNumeration)

		if (this.items.length == 0) {
			throw new Error("No hay ítems en esta venta.")
		}

		if (!this.#currencyId || this.#currencyId.length != 3) { // length according ISO
			throw new Error("Moneda no establecida.")
		}

		// Check item attributes
		let c = 0;
		for (const item of this.items) {
			c++; // simple counter
			if (!item.getQuantity() || item.getQuantity() <= 0) {
				throw new Error(`Ítem ${c} tiene cantidad errónea.`)
			}
			if (!item.getUnitCode() || item.getUnitCode().length == 0) {
				throw new Error(`Ítem ${c} sin unidad de medida.`)
			}
			if (!item.getLineExtensionAmount() || item.getLineExtensionAmount() <= 0) {
				throw new Error(`Ítem ${c} tiene valor de venta erróneo.`)
			}
			if (!item.getPricingReferenceAmount() || item.getPricingReferenceAmount() <= 0) {
				throw new Error(`Ítem ${c} tiene precio de venta unitario erróneo.`)
			}
			if (!item.getDescription() || item.getDescription().length == 0) {
				throw new Error(`Ítem ${c} no tiene descripción.`)
			}
		}
	}

	/**
	 * Parse xml string for filling attributes.
	 * If printed taxpayer is different from system current taxpayer then throw error.
	 * @return xmlDoc from parsed document.
	 */
	fromXml(xmlContent) {
		const xmlDoc = super.fromXml(xmlContent)

		const typeCode = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, `${this.name}TypeCode`)[0]?.textContent || "";
		this.setTypeCode(parseInt(typeCode))

		const currencyId = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, "DocumentCurrencyCode")[0]?.textContent || "";
		this.setCurrencyId(currencyId)

		const issueDate = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, "IssueDate")[0]?.textContent;
		let dateParts = issueDate.split('-'); // split in year, month and day
		this.setIssueDate(new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2])))
		const dueDate = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, "DueDate")[0]?.textContent;
		if (dueDate) { // Because sometimes there isn't
			dateParts = dueDate.split('-'); // split in year, month and day
			this.setDueDate(new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2])))
		}

		{
			const taxpayer = new Taxpayer()
			const accountingSupplierParty = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "AccountingSupplierParty")[0];
			const id = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent || "";
			const type = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.getAttribute("schemeID") || "";
			taxpayer.setIdentification(new Identification(parseInt(type), id))

			const tradeName = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "Name")[0]?.textContent || ""
			taxpayer.setTradeName(tradeName)

			const name = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "RegistrationName")[0]?.textContent || ""
			taxpayer.setName(name)

			{
				const registrationAddress = accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cac, "RegistrationAddress")[0]

				const address = new Address(registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "Line")[0]?.textContent || "")
				address.ubigeo = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent || ""
				address.city = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "CityName")[0]?.textContent || ""
				address.district = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "District")[0]?.textContent || ""
				address.subentity = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "Subentity")[0]?.textContent || ""

				taxpayer.setAddress(address)
			}

			{ // contact info
				taxpayer.setWeb(accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "Note")[0]?.textContent)
				taxpayer.setEmail(accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ElectronicMail")[0]?.textContent)
				taxpayer.setTelephone(accountingSupplierParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "Telephone")[0]?.textContent)
			}

			this.setTaxpayer(taxpayer)
		}

		{
			const accountingCustomerParty = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "AccountingCustomerParty")[0];
			const id = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent || "";

			// Sometimes customer does not exist
			if (id != "-") {
				const customer = new Person()
				const type = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.getAttribute("schemeID") || "";
				customer.setIdentification(new Identification(parseInt(type), id))
				customer.setName(accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "RegistrationName")[0]?.textContent || "-")

				// customer address
				{
					const registrationAddress = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cac, "RegistrationAddress")[0]

					if (registrationAddress) {
						const address = new Address(registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "Line")[0]?.textContent || "");

						customer.setAddress(address);
					}
				}

				this.setCustomer(customer)
			}
		}

		// Taxes and taxable amounts
		{
			const taxTotal = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "TaxTotal")[0]

			// The sum of everything behind
			this.#taxTotalAmount = parseFloat(taxTotal.getElementsByTagNameNS(Receipt.namespaces.cbc, "TaxAmount")[0].textContent)

			const taxSubtotals = taxTotal.getElementsByTagNameNS(Receipt.namespaces.cac, "TaxSubtotal")
			for (const taxSubtotal of taxSubtotals) {
				const taxCategory = taxSubtotal.getElementsByTagNameNS(Receipt.namespaces.cac, "TaxCategory")[0]
				const taxScheme = taxCategory.getElementsByTagNameNS(Receipt.namespaces.cac, "TaxScheme")[0]
				if (taxScheme.getElementsByTagNameNS(Receipt.namespaces.cbc, "Name")[0].textContent == "IGV") {
					// Real value, not calculated
					this.igvAmount = parseFloat(taxSubtotal.getElementsByTagNameNS(Receipt.namespaces.cbc, "TaxAmount")[0].textContent)
					this.setOperationAmount(0, parseFloat(taxSubtotal.getElementsByTagNameNS(Receipt.namespaces.cbc, "TaxableAmount")[0].textContent))
					continue
				}
				if (taxScheme.getElementsByTagNameNS(Receipt.namespaces.cbc, "Name")[0].textContent == "EXO") {
					// Real value, not calculated
					this.igvAmount = parseFloat(taxSubtotal.getElementsByTagNameNS(Receipt.namespaces.cbc, "TaxAmount")[0].textContent)
					this.setOperationAmount(1, parseFloat(taxSubtotal.getElementsByTagNameNS(Receipt.namespaces.cbc, "TaxableAmount")[0].textContent))
					continue
				}
				if (taxScheme.getElementsByTagNameNS(Receipt.namespaces.cbc, "Name")[0].textContent == "ISC") {
					// Real value, not calculated
					this.iscAmount = parseFloat(taxSubtotal.getElementsByTagNameNS(Receipt.namespaces.cbc, "TaxAmount")[0].textContent)
					continue
				}
			}
		}

		// about totals
		{
			const legalMonetaryTotal = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "LegalMonetaryTotal")[0]
			this.lineExtensionAmount = parseFloat(legalMonetaryTotal.getElementsByTagNameNS(Receipt.namespaces.cbc, "LineExtensionAmount")[0].textContent)
			this.taxInclusiveAmount = parseFloat(legalMonetaryTotal.getElementsByTagNameNS(Receipt.namespaces.cbc, "TaxInclusiveAmount")[0].textContent)

			const prepaidAmountNode = legalMonetaryTotal.getElementsByTagNameNS(Receipt.namespaces.cbc, "PrepaidAmount")[0]
			if (prepaidAmountNode) {
				this.prepaidAmount = parseFloat(prepaidAmountNode.textContent)
			}
			const payableAmountNode = legalMonetaryTotal.getElementsByTagNameNS(Receipt.namespaces.cbc, "PayableAmount")[0]
			if (payableAmountNode) {
				this.payableAmount = parseFloat(payableAmountNode.textContent)
			}
		}

		return xmlDoc
	}
}

export default Sale
