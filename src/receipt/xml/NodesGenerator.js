import Receipt from "../Receipt.js"

class NodesGenerator {
	static generateHeader(invoice) {
		const cbcUblVersionId = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:UBLVersionID")
		cbcUblVersionId.textContent = invoice.getUblVersion()
		invoice.xmlDocument.documentElement.appendChild(cbcUblVersionId)

		const cbcCustomizationId = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:CustomizationID")
		cbcCustomizationId.textContent = invoice.getCustomizationId()
		invoice.xmlDocument.documentElement.appendChild(cbcCustomizationId)
	}
}

export default NodesGenerator
