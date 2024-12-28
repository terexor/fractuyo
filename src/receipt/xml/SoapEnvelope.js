import { DOMImplementation } from "@xmldom/xmldom"

class SoapEnvelope {
	/**
	 * Generates body of method sendBill.
	 * @return XML envolope with header and body.
	 */
	static generateSendBill(receipt, taxpayer, zipStream) {
		const xmlDoc = SoapEnvelope.generateEnvelope(taxpayer)

		const body = xmlDoc.createElement("soapenv:Body")
		const sendBill = xmlDoc.createElementNS("http://service.sunat.gob.pe", "ser:sendBill")

		// main components of this body
		const fileName = xmlDoc.createElement("fileName");
		fileName.textContent = `${taxpayer.getIdentification().getNumber()}-${receipt.getId(true)}.zip`

		const contentFile = xmlDoc.createElement("contentFile")
		contentFile.textContent = zipStream

		sendBill.appendChild(fileName)
		sendBill.appendChild(contentFile)
		body.appendChild(sendBill)

		xmlDoc.documentElement.appendChild(body)

		return xmlDoc
	}

	static generateEnvelope(taxpayer) {
		// The main document
		const xmlDoc = (new DOMImplementation()).createDocument("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope")
		xmlDoc.documentElement.setAttribute("xmlns:ser", SoapEnvelope.namespaces.ser)
		xmlDoc.documentElement.setAttribute("xmlns:wsse", SoapEnvelope.namespaces.wsse)

		const header = xmlDoc.createElement("soapenv:Header")
		const security = xmlDoc.createElementNS(SoapEnvelope.namespaces.wsse, "wsse:Security")
		const usernameToken = xmlDoc.createElement("wsse:UsernameToken")

		const username = xmlDoc.createElement("wsse:Username")
		username.textContent = `${taxpayer.getIdentification().getNumber()}${taxpayer.getSolUser()}`

		const password = xmlDoc.createElement("wsse:Password")
		password.textContent = taxpayer.getSolPass()

		usernameToken.appendChild(username)
		usernameToken.appendChild(password)
		security.appendChild(usernameToken)
		header.appendChild(security)

		xmlDoc.documentElement.appendChild(header)

		return xmlDoc
	}

	static namespaces = Object.freeze(
		{
			soapenv: "http://schemas.xmlsoap.org/soap/envelope/",
			ser: "http://service.sunat.gob.pe",
			wsse: "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
		}
	)
}

export default SoapEnvelope
