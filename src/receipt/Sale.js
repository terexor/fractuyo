import Receipt from "./Receipt.js"
import Item from "./Item.js"
import Person from "../person/Person.js"
import Identification from "../person/Identification.js"

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

	/**
	 * Parse xml string for filling attributes.
	 * If printed taxpayer is different from system current taxpayer then throw error.
	 */
	fromXml(xmlContent) {
		const xmlDoc = new DOMParser().parseFromString(xmlContent, "text/xml")

		const id = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent || "";
		const [serie, numeration] = id.split('-')
		this.setSerie(serie)
		this.setNumeration(parseInt(numeration))

		const typeCode = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, `${this.name}TypeCode`)[0]?.textContent || "";
		this.setTypeCode(parseInt(typeCode))

		const currencyId = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, "DocumentCurrencyCode")[0]?.textContent || "";
		this.setCurrencyId(currencyId)

		{
			const customer = new Person()
			const accountingCustomerParty = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "AccountingCustomerParty")[0];
			const id = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent || "";
			const type = accountingCustomerParty.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.getAttribute("schemeID") || "";
			customer.setIdentification(new Identification(parseInt(type), id))

			this.setCustomer(customer)
		}

		{
			const orderReference = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, "CustomerReference")[0];
			if (orderReference) {
				const orderReferenceId = orderReference.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent || "";
				this.setOrderReference(orderReferenceId)
				const orderReferenceText = orderReference.getElementsByTagNameNS(Receipt.namespaces.cbc, "CustomerReference")[0]?.textContent || "";
				this.setOrderReferenceText(orderReferenceText)
			}
		}

		// Extraer los items y añadirlos al array de items
		const items = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cac, "InvoiceLine");
		for (let i = 0; i < items.length; i++) {
			const item = new Item( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "Description")[0]?.textContent || "" )
			item.setQuantity( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "InvoicedQuantity")[0]?.textContent || "" )
			item.setUnitValue( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "PriceAmount")[0]?.textContent || "" )
			item.setUnitCode( items[i].getElementsByTagNameNS(Receipt.namespaces.cbc, "PriceAmount")[0]?.getAttribute("unitCode") || "" )

			this.addItem(item)
		}
	}
}

export default Sale
