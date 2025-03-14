import Receipt from "./Receipt.js"
import Item from "./Item.js"
import Share from "./Share.js"
import Taxpayer from "../person/Taxpayer.js"
import Person from "../person/Person.js"
import Identification from "../person/Identification.js"
import Address from "../person/Address.js"

class Sale extends Receipt {
	#currencyId

	/*
	 * Global totals
	 */
	#lineExtensionAmount = 0
	#taxTotalAmount = 0
	#taxInclusiveAmount = 0
	#igvAmount = 0
	#iscAmount = 0
	#icbpAmount = 0
	#operationAmounts = [0, 0, 0, 0]

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

	getOperationAmount(index) {
		return this.#operationAmounts[index]
	}

	setOperationAmount(index, amount) {
		this.#operationAmounts[index] = amount
	}

	setCurrencyId(cid) {
		this.#currencyId = cid
	}

	getCurrencyId() {
		return this.#currencyId
	}

	addItem(item) {
		super.addItem(item)

		this.#lineExtensionAmount += item.getLineExtensionAmount()
		this.#taxTotalAmount += item.getTaxTotalAmount()
		this.#taxInclusiveAmount += item.getLineExtensionAmount() + item.getTaxTotalAmount()

		this.#igvAmount += item.getIgvAmount()

		//Assign data according taxability
		switch(true) {
			case (item.getExemptionReasonCode() < 20):
				this.#operationAmounts[0] += item.getLineExtensionAmount();break
			case (item.getExemptionReasonCode() < 30):
				this.#operationAmounts[1] += item.getLineExtensionAmount();break
			case (item.getExemptionReasonCode() < 40):
				this.#operationAmounts[2] += item.getLineExtensionAmount();break
			default:
				this.#operationAmounts[3] += item.getLineExtensionAmount()
		}
	}

	/**
	 * Use it if maybe you are have edited an item or removed.
	 */
	recalcMounts() {
		// Cleaning values
		this.#lineExtensionAmount = this.#taxTotalAmount = this.#taxInclusiveAmount = this.#igvAmount = 0
		this.#operationAmounts[0] = this.#operationAmounts[1] = this.#operationAmounts[2] = this.#operationAmounts[3] = 0;

		for (const item of this.items) {
			this.#lineExtensionAmount += item.getLineExtensionAmount()
			this.#taxTotalAmount += item.getTaxTotalAmount()
			this.#taxInclusiveAmount += item.getLineExtensionAmount() + item.getTaxTotalAmount()

			this.#igvAmount += item.getIgvAmount()

			//Assign data according taxability
			switch(true) {
				case (item.getExemptionReasonCode() < 20):
					this.#operationAmounts[0] += item.getLineExtensionAmount();break
				case (item.getExemptionReasonCode() < 30):
					this.#operationAmounts[1] += item.getLineExtensionAmount();break
				case (item.getExemptionReasonCode() < 40):
					this.#operationAmounts[2] += item.getLineExtensionAmount();break
				default:
					this.#operationAmounts[3] += item.getLineExtensionAmount()
			}
		}
	}

	getQrData() {
		return this.getTaxpayer().getIdentification().getNumber()
			+ '|' + this.getId(true).replaceAll('-', '|')
			+ '|' + this.igvAmount.toFixed(2)
			+ '|' + this.taxInclusiveAmount.toFixed(2)
			+ '|' + this.getIssueDate().toISOString().substr(0, 10)
			+ '|' + this.getCustomer().getIdentification().getType()
			+ '|' + this.getCustomer().getIdentification().getNumber()
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
		this.setIssueDate(new Date(dateParts[0], dateParts[1] - 1, dateParts[2]))
		const dueDate = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, "DueDate")[0]?.textContent;
		if (dueDate) { // Because sometimes there isn't
			dateParts = dueDate.split('-'); // split in year, month and day
			this.setDueDate(new Date(dateParts[0], dateParts[1] - 1, dateParts[2]))
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

				const address = new Address()
				address.ubigeo = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent || ""
				address.city = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "CityName")[0]?.textContent || ""
				address.district = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "District")[0]?.textContent || ""
				address.subentity = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "Subentity")[0]?.textContent || ""
				address.line = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "Line")[0]?.textContent || ""

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
			const customer = new Person()
			const accountingCustomerParty = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "AccountingCustomerParty")[0];
			const id = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent || "";
			const type = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.getAttribute("schemeID") || "";
			customer.setIdentification(new Identification(parseInt(type), id))
			customer.setName(accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "RegistrationName")[0]?.textContent || "-")

			// customer address
			{
				const registrationAddress = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cac, "RegistrationAddress")[0]

				if (registrationAddress) {
					const address = new Address();
					address.line = registrationAddress.getElementsByTagNameNS(Receipt.namespaces.cbc, "Line")[0]?.textContent || "";

					customer.setAddress(address);
				}
			}

			this.setCustomer(customer)
		}

		return xmlDoc
	}
}

export default Sale
