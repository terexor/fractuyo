import XmlDSigJs from "xmldsigjs"
import writtenNumber from "written-number"
import JSZip from "jszip"
import { DOMImplementation, DOMParser } from "@xmldom/xmldom"
import SoapEnvelope from "./xml/SoapEnvelope.js"
import Endpoint from "../webservice/Endpoint.js"

class Receipt {
	#name

	#taxpayer
	#customer

	#serie
	#numeration
	#typeCode

	#issueDate

	#ublVersion = "2.1"
	#customizationId = "2.0"

	#hash

	#items = Array()

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
	}

	get items() {
		return this.#items
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

		this.xmlDocument = XmlDSigJs.Parse(this.xmlDocument.toString()) // Without this, signature will be wrong

		return Promise.resolve()
			.then(() => {
				const signature = new XmlDSigJs.SignedXml()

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
					return parseInt(codes[0].textContent) // 0 when everthing is really OK
				}
				else { // error
					return -1 // we have problems
				}
			})
		})
	}

	async declare(zipStream) {
		const soapXmlDocument = SoapEnvelope.generateSendBill(this, this.#taxpayer, zipStream)

		const responseText = await Endpoint.fetch(Endpoint.INDEX_INVOICE, soapXmlDocument.toString())

		const xmlDoc = new DOMParser().parseFromString(responseText, "text/xml")

		// check if fault node exists
		const faultNode = xmlDoc.getElementsByTagName("soap-env:Fault")[0]

		if (faultNode) {
			throw new Error(faultNode.getElementsByTagName("faultstring")[0].textContent)
		}
		else {
			// Maybe it is a successful answer
			const responseNode = xmlDoc.getElementsByTagName("br:sendBillResponse")[0]

			if (responseNode) {
				const applicationResponse = responseNode.getElementsByTagName("applicationResponse")[0].textContent
				return applicationResponse
			}
			else {
				throw new Error("Respuesta inesperada.")
			}
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
