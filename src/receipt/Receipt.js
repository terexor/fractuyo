import XAdES from "xadesjs"
import writtenNumber from "written-number"
import JSZip from "jszip"
import { DOMImplementation, DOMParser } from "@xmldom/xmldom"

class Receipt {
	#name

	#taxpayer
	#customer

	#serie
	#numeration
	#typeCode

	#issueDate

	#currencyId

	#ublVersion = "2.1"
	#customizationId = "2.0"

	#hash

	#items = Array()

	/*
	 * Global totals
	 */
	#lineExtensionAmount = 0
	#taxTotalAmount = 0
	#taxInclusiveAmount = 0
	#igvAmount = 0
	#iscAmount = 0
	#icbpAmount = 0
	#operationAmounts = [0, 0, 0]

	setUblVersion(ublVersion) {
		this.#ublVersion = ublVersion
	}

	constructor(taxpayer, customer, name) {
		this.#taxpayer = taxpayer
		this.#customer = customer
		this.#name = name

		this.xmlDocument = (new DOMImplementation()).createDocument(`urn:oasis:names:specification:ubl:schema:xsd:${name}-2`, name)
		this.xmlDocument.documentElement.setAttribute("xmlns:cac", Receipt.namespaces.cac)
		this.xmlDocument.documentElement.setAttribute("xmlns:cbc", Receipt.namespaces.cbc)
		this.xmlDocument.documentElement.setAttribute("xmlns:ds", Receipt.namespaces.ds)
		this.xmlDocument.documentElement.setAttribute("xmlns:ext", Receipt.namespaces.ext)

		// Space for appending signature
		const extUblExtensions = this.xmlDocument.createElementNS(Receipt.namespaces.ext, "ext:UBLExtensions")
		this.xmlDocument.documentElement.appendChild(extUblExtensions)

		const extUblExtension = this.xmlDocument.createElementNS(Receipt.namespaces.ext, "ext:UBLExtension")
		extUblExtensions.appendChild(extUblExtension)

		const extExtensionContent = this.xmlDocument.createElementNS(Receipt.namespaces.ext, "ext:ExtensionContent")
		extUblExtension.appendChild(extExtensionContent)
	}

	get name() {
		return this.#name
	}

	setCustomer(customer) {
		this.#customer = customer
	}

	/**
	 * Format serie and number: F000-00000001
	 */
	getId(withType = false) {
		if(this.#serie == undefined || this.#numeration == undefined) {
			throw new Error("Serie o número incompletos.")
		}
		if(withType) {
			return String(this.#typeCode).padStart(2, '0') + "-" + this.#serie + "-" + String(this.#numeration).padStart(8, '0')
		}
		return this.#serie + '-' + String(this.#numeration).padStart(8, '0')
	}

	setId(serie, numeration) {
		this.setSerie(serie)
		this.setNumeration(numeration)
	}

	setSerie(serie) {
		if(serie.length != 4) {
			throw new Error("Serie inconsistente")
		}
		this.#serie = serie
	}

	getSerie() {
		return this.#serie
	}

	setNumeration(number) {
		if(number > 0x5F5E0FF) {
			throw new Error("Numeración supera el límite.")
		}
		this.#numeration = number
	}

	getNumeration() {
		return this.#numeration
	}

	setTypeCode(code) {
		this.#typeCode = code
	}

	getTypeCode(withFormat = false) {
		if (withFormat) {
			return String(this.#typeCode).padStart(2, '0')
		}
		return this.#typeCode
	}

	setCurrencyId(cid) {
		this.#currencyId = cid
	}

	getCurrencyId() {
		return this.#currencyId
	}

	setIssueDate(date) {
		if(date) {
			this.#issueDate = date
		}
		else {
			this.#issueDate = new Date()
		}
	}

	getIssueDate() {
		return this.#issueDate
	}

	getTaxpayer() {
		return this.#taxpayer
	}

	getCustomer() {
		return this.#customer
	}

	getUblVersion() {
		return this.#ublVersion
	}

	getCustomizationId() {
		return this.#customizationId
	}

	setHash(hash) {
		this.#hash = hash
	}

	getHash() {
		return this.#hash
	}

	addItem(item) {
		this.#items.push(item)

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

	get items() {
		return this.#items
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

	async sign(cryptoSubtle, hashAlgorithm = "SHA-256", canonMethod = "c14n") {
		if(this.xmlDocument == undefined) {
			throw new Error("Documento XML no existe.")
		}

		const alg = {
			name: "RSASSA-PKCS1-v1_5",
			hash: hashAlgorithm,
			modulusLength: 1024,
			publicExponent: new Uint8Array([1, 0, 1])
		}

		// Read cert
		const certDer = this.#taxpayer.getCert()

		// Read key
		const keyDer = this.#taxpayer.getKey()
		const key = await cryptoSubtle.importKey("pkcs8", keyDer, alg, true, ["sign"])

		const x509 = this.#taxpayer.getCertPem()

		const transforms = ["enveloped", canonMethod]

		this.xmlDocument = XAdES.Parse(this.xmlDocument.toString()) // Without this, signature will be wrong

		return Promise.resolve()
			.then(() => {
				const signature = new XAdES.SignedXml()

				return signature.Sign(
					alg,        // algorithm
					key,        // key
					this.xmlDocument,// document
					{           // options
						references: [
							{ id: "terexoris", uri: "", hash: hashAlgorithm, transforms: transforms }
						],
						x509: [x509],
						signerRole: { claimed: ["Taxpayer"] },
						/*
						 * It exists, but Sunat does not handle big numbers (20 bytes) in serial numbers so was removed.
						 * Structure can be found in http://www.datypic.com/sc/ubl21/e-xades_SigningCertificate.html
						 * It could be enabled using global options.
						 */
						// signingCertificate: x509
					}
				)
			})
			.then((signature) => {
				// Add signature to document
				const xmlEl = this.xmlDocument.getElementsByTagNameNS("urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2", "ExtensionContent")[0]
				xmlEl.appendChild(signature.GetXml())
				return true
			})
			.catch(function (e) {
				console.error(e)
				return false
			})
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

	/**
	 * @param type according JSZip API.
	 * @return A ZIP file containing XML.
	 */
	async createZip(type = "base64") {
		const zip = new JSZip()
		zip.file(`${this.#taxpayer.getIdentification().getNumber()}-${this.getId(true)}.xml`, this.xmlDocument.toString())

		return zip.generateAsync({type: type}).then(zipb64 => {
			return zipb64
		})
	}

	async handleProof(zipStream, isBase64 = true) {
		const zip = new JSZip()

		return zip.loadAsync(zipStream, {base64: isBase64}).then(async (zip) => {
			return zip.file(`R-${this.#taxpayer.getIdentification().getNumber()}-${this.getId(true)}.xml`).async("string").then(async (data) => {
				const xmlDoc = new DOMParser().parseFromString(data, "application/xml")

				// Go directly to node <cbc:ResponseCode>
				const codes = xmlDoc.getElementsByTagNameNS("urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2", "ResponseCode")

				if (codes.length > 0) {
					return codes[0].textContent // 0 when everthing is really OK
				}
				else { // error
					return -1 // we have problems
				}
			})
		})
	}

	async declare(zipStream) {
		// Determine endpoint
		const soapUrl = "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService"

		// Simple XML structure for body
		const soapBody = `<?xml version="1.0" encoding="utf-8"?>
			<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://service.sunat.gob.pe" xmlns:ns2="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
				<SOAP-ENV:Header>
					<ns2:Security>
						<ns2:UsernameToken>
							<ns2:Username>${this.#taxpayer.getIdentification().getNumber()}${this.#taxpayer.getSolUser()}</ns2:Username>
							<ns2:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${this.#taxpayer.getSolPass()}</ns2:Password>
						</ns2:UsernameToken>
					</ns2:Security>
				</SOAP-ENV:Header>
				<SOAP-ENV:Body>
					<ns1:sendBill>
						<fileName>${this.#taxpayer.getIdentification().getNumber()}-${this.getId(true)}.zip</fileName>
						<contentFile>${zipStream}</contentFile>
					</ns1:sendBill>
				</SOAP-ENV:Body>
			</SOAP-ENV:Envelope>`

		try {
			const response = await fetch(soapUrl, {
				method: "POST",
				headers: {"Content-Type": "text/xml;charset=UTF-8"},
				body: soapBody
			})
			const responseText = await response.text()

			console.log(responseText)
		}
		catch (error) {
			console.error('Error en la solicitud:', error)
		}
	}

	static namespaces = Object.freeze(
		{
			cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
			cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
			ds: "http://www.w3.org/2000/09/xmldsig#",
			ext: "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
			qdt: "urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2",
			udt: "urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2",
			xsi: "http://www.w3.org/2001/XMLSchema-instance",
			xmlns: "http://www.w3.org/1999/xhtml",
			ccts: "urn:un:unece:uncefact:documentation:2"
		}
	)

	static nsResolver(prefix) {
		return Receipt.namespaces[prefix] || "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
	}

	static removeCdataTag(cdata) {
		return cdata.trim().replace(/^(\/\/\s*)?<!\[CDATA\[|(\/\/\s*)?\]\]>$/g, '').trim()
	}

	/**
	 * @param amount is a decimal number.
	 */
	static amountToWords(amount, junctor, tail) {
		if (amount == 0.0) {
			return `CERO ${junctor} 00/100 ${tail}`
		}

		return writtenNumber(amount, { lang: "es" }) + ` ${junctor} ${amount.toFixed(2).split('.')[1]}/100 ${tail}`
	}
}

export default Receipt;
