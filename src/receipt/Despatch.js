import Receipt from "./Receipt.js"
import NodesGenerator from "./xml/NodesGenerator.js"

class Despatch extends Receipt {
	constructor(taxpayer, customer) {
		super(taxpayer, customer, "DespatchAdvice")
	}

	toXml() {
		NodesGenerator.generateHeader(this)

		NodesGenerator.generateIdentity(this)

		NodesGenerator.generateDates(this)

		NodesGenerator.generateTypeCode(this)

	}
}

export default Despatch
