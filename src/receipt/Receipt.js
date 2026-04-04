import { Parse } from "xmldsigjs"
import XmlSigner from "./xml/XmlSigner.js"
import writtenNumber from "written-number"
import JSZip from "jszip"
import { DOMImplementation, DOMParser } from "@xmldom/xmldom"
import SoapEnvelope from "./xml/SoapEnvelope.js"
import Endpoint from "../webservice/Endpoint.js"

import DocumentReference from "./DocumentReference.js"

/** @typedef {import("./Item.js").default} Item */
/** @typedef {import("../person/Taxpayer.js").default} Taxpayer */
/** @typedef {import("../person/Person.js").default} Person */

class Receipt {
	static #xmllintInstance // validator for XML

	/** @type {string} */
	#name

	/** @type {Taxpayer} */
	#taxpayer

	/** @type {Person} */
	#customer

	/** @type {string} */
	#serie

	/** @type {number} */
	#numeration

	/** @type {number} */
	#typeCode

	/** @type {Date} */
	#issueDate

	/** @type {string} */
	#ublVersion = "2.1"

	/** @type {string} */
	#customizationId = "2.0"

	/** @type {string} */
	#hash

	/** @type {Array<Item>} */
	#items = Array()

	/**
	 * Used to hold many despatche references.
	 * @type {Array<DocumentReference>}
	 */
	#despatchDocumentReferences = Array()

	/**
	 * Used to hold many contract references as water, electricity, gas, etc.
	 * @type {Array<DocumentReference>}
	 */
	#contractDocumentReferences = Array()

	/**
	 * Used to hold many additional document references.
	 * @type {Array<DocumentReference>}
	 */
	#additionalDocumentReferences = Array()

	/**
	 * Used to hold many prepaid payment references.
	 * @type {Array<DocumentReference>}
	 */
	#prepaidPaymentReferences = Array()

	/**
	 * @param {string} ublVersion
	 */
	setUblVersion(ublVersion) {
		this.#ublVersion = ublVersion
	}

	/**
	 * @param {Taxpayer} taxpayer - The taxpayer.
	 * @param {Person} customer - The customer.
	 * @param {string} name - The name of the document.
	 */
	constructor(taxpayer, customer, name) {
		this.#taxpayer = taxpayer
		this.#customer = customer
		this.#name = name
	}

	/**
	 * @param {string} name - The name of the document.
	 */
	setName(name) {
		this.#name = name
	}

	/**
	 * Create new XML document.
	 */
	createXmlWrapper() {
		this.xmlDocument = (new DOMImplementation()).createDocument(`urn:oasis:names:specification:ubl:schema:xsd:${this.#name}-2`, this.#name)
		this.xmlDocument.documentElement.setAttribute("xmlns:cac", Receipt.namespaces.cac)
		this.xmlDocument.documentElement.setAttribute("xmlns:cbc", Receipt.namespaces.cbc)
		this.xmlDocument.documentElement.setAttribute("xmlns:ds", Receipt.namespaces.ds)
		this.xmlDocument.documentElement.setAttribute("xmlns:ext", Receipt.namespaces.ext)
	}

	get name() {
		return this.#name
	}

	setCustomer(customer) {
		this.#customer = customer
	}

	/**
	 * Format serie and number: F000-00000001
	 * @param {boolean} withType - Include type code.
	 * @param {boolean} compacted - Compact format.
	 * @returns {string}
	 */
	getId(withType = false, compacted = false) {
		if (this.#serie == undefined || this.#numeration == undefined) {
			throw new Error("Serie o número incompletos.")
		}

		// Pre-format numeration as string
		const numStr = compacted ? String(this.#numeration) : String(this.#numeration).padStart(8, '0')

		if (withType) {
			const type = String(this.#typeCode).padStart(2, '0')
			return `${type}-${this.#serie}-${numStr}`
		}

		return `${this.#serie}-${numStr}`
	}

	/**
	 * Set serie and number at once.
	 * @param {string} serie - The serie of the document.
	 * @param {number} numeration - The numeration of the document.
	 */
	setId(serie, numeration) {
		this.setSerie(serie)
		this.setNumeration(numeration)
	}

	/**
	 * @param {string} serie - The serie of the document with 4 characters.
	 */
	setSerie(serie) {
		if (serie.length != 4) {
			throw new Error("Serie inconsistente")
		}
		this.#serie = serie
	}

	/**
	 * @returns {string} The serie of the document.
	 */
	getSerie() {
		return this.#serie
	}

	/**
	 * @param {number} number - The numeration of the document from 1 to 99999999.
	 */
	setNumeration(number) {
		if (number > 0x5F5E0FF) {
			throw new Error("Numeración supera el límite.")
		}
		this.#numeration = number
	}

	/**
	 * Unset serie and number to set an anonymous document.
	 */
	unsetId() {
		this.#serie = undefined
		this.#numeration = undefined
	}

	/**
	 * @returns {number} The numeration of the document.
	 */
	getNumeration() {
		return this.#numeration
	}

	/**
	 * @param {number} code - The type code of the document.
	 */
	setTypeCode(code) {
		this.#typeCode = code
	}

	/**
	 * @param {boolean} withFormat - Format the type code.
	 * @returns {number | string} The type code of the document.
	 */
	getTypeCode(withFormat = false) {
		if (withFormat) {
			return String(this.#typeCode).padStart(2, '0')
		}
		return this.#typeCode
	}

	/**
	 * @param {Date} date - The issue date of the document.
	 */
	setIssueDate(date) {
		if (date) {
			this.#issueDate = date
		}
		else {
			this.#issueDate = new Date()
		}
	}

	/**
	 * @returns {Date} The issue date of the document.
	 */
	getIssueDate() {
		return this.#issueDate
	}

	/**
	 * @returns {Taxpayer} The taxpayer set in constructor.
	 */
	getTaxpayer() {
		return this.#taxpayer
	}

	/**
	 * Replace the taxpayer.
	 * @param {Taxpayer} taxpayer - The new taxpayer.
	 */
	setTaxpayer(taxpayer) {
		this.#taxpayer = taxpayer
	}

	/**
	 * @returns {Person} The customer set in constructor.
	 */
	getCustomer() {
		return this.#customer
	}

	/**
	 * @returns {string} The UBL version.
	 */
	getUblVersion() {
		return this.#ublVersion
	}

	/**
	 * @returns {string} The customization ID.
	 */
	getCustomizationId() {
		return this.#customizationId
	}

	/**
	 * @param {string} hash - The cryptographic hash of the document.
	 */
	setHash(hash) {
		this.#hash = hash
	}

	/**
	 * @returns {string} The cryptographic hash of the document.
	 */
	getHash() {
		return this.#hash
	}

	/**
	 * @param {Item} item - The item to add.
	 */
	addItem(item) {
		this.#items.push(item)
	}

	/**
	 * Recreate items array without an item.
	 * @param {number} index - The index of the item to remove.
	 */
	removeItem(index) {
		this.#items = [...this.#items.slice(0, index), ...this.#items.slice(index + 1)]
	}

	/**
	 * Clear all items setting the array of items to empty.
	 */
	clearItems() {
		this.#items = [];
	}

	/**
	 * @returns {Array<Item>} The items of the document.
	 */
	get items() {
		return this.#items
	}

	/**
	 * Add document reference according internal type code.
	 * Stores documents in its own array by its reference type.
	 * @param {DocumentReference} documentReference
	 */
	addDocumentReference(documentReference) {
		switch (documentReference.getReferenceType()) {
			case DocumentReference.ADDITIONAL:
				this.#additionalDocumentReferences.push(documentReference);
				break;
			case DocumentReference.DESPATCH:
				this.#despatchDocumentReferences.push(documentReference);
				break;
			case DocumentReference.CONTRACT:
				this.#contractDocumentReferences.push(documentReference);
				break;
			case DocumentReference.PREPAID_PAYMENT:
				this.#prepaidPaymentReferences.push(documentReference);
				break;
			default:
				throw new Error("Invalid document reference type.");
		}
	}

	/**
	 * @returns {Array<DocumentReference>}
	 */
	get additionalDocumentReferences() {
		return this.#additionalDocumentReferences;
	}

	/**
	 * @returns {Array<DocumentReference>}
	 */
	get despatchDocumentReferences() {
		return this.#despatchDocumentReferences;
	}

	/**
	 * @returns {Array<DocumentReference>}
	 */
	get contractDocumentReferences() {
		return this.#contractDocumentReferences;
	}

	/**
	 * @returns {Array<DocumentReference>}
	 */
	get prepaidPaymentReferences() {
		return this.#prepaidPaymentReferences;
	}

	/**
	 * Finalize the document signing it.
	 * @param {SubtleCrypto} cryptoSubtle - The crypto subtle to use for signing.
	 * @param {string} canonMethod - The canonicalization method to use for signing.
	 */
	async finalize(cryptoSubtle, canonMethod = "c14n") {
		if (this.xmlDocument == undefined) {
			throw new Error("Documento XML no existe.")
		}

		try {
			this.xmlDocument = Parse(this.xmlDocument.toString()) // Without this, signature will be wrong

			// Getting signature using extarnal signer
			const signatureNode = await XmlSigner.getSignedNode(
				cryptoSubtle,
				this.xmlDocument,
				this.#taxpayer,
				canonMethod
			);

			const xmlEl = this.xmlDocument.getElementsByTagNameNS("urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2", "ExtensionContent")[0]
			xmlEl.appendChild(signatureNode)

			return true
		} catch (e) {
			console.error("Error en la finalización/firma:", e);
			return false
		}
	}

	/**
	 * @deprecated Use finalize() instead for better performance and architecture.
	 * @param {SubtleCrypto} cryptoSubtle - The crypto subtle to use for signing.
	 * @param {string} canonMethod - The canonicalization method to use for signing.
	 */
	async sign(cryptoSubtle, canonMethod = "c14n") {
		// Just calling the real method
		return await this.finalize(cryptoSubtle, canonMethod)
	}

	/**
	 * Create a ZIP file containing XML. Default type is base64.
	 * @param {"base64" | "string" | "text" | "binarystring" | "array" | "uint8array" | "arraybuffer" | "blob" | "nodebuffer"} type - according JSZip API.
	 * @param {string} [xmlString] - that is raw XML.
	 * @return {Promise<any>} A ZIP file containing XML.
	 */
	async createZip(type = "base64", xmlString) {
		const zip = new JSZip()
		const xmlDocumentContent = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n" +
			(xmlString ?? (new XMLSerializer().serializeToString(this.xmlDocument))) // if there is xmlString then use it
		zip.file(`${this.#taxpayer.getIdentification().getNumber()}-${this.getId(true)}.xml`, xmlDocumentContent)

		return zip.generateAsync({ type: type }).then(zipb64 => {
			return zipb64
		})
	}

	/**
	 * Handle answer that is in a ZIP file.
	 * @param {string} zipStream - The zip file.
	 * @param {boolean} isBase64 - Whether the zip file is base64.
	 * @param {boolean} compacted - Whether the document is compacted.
	 * @returns {Promise<[number, string]>} The proof of the document.
	 */
	async handleProof(zipStream, isBase64 = true, compacted = false) {
		const zip = new JSZip()

		return zip.loadAsync(zipStream, { base64: isBase64 }).then(async (zip) => {
			return zip.file(`R-${this.#taxpayer.getIdentification().getNumber()}-${this.getId(true, compacted)}.xml`).async("string").then(async (data) => {
				const xmlDoc = new DOMParser().parseFromString(data, "application/xml")

				// Go directly to node <cbc:ResponseCode>
				const codes = xmlDoc.getElementsByTagNameNS("urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2", "ResponseCode")

				if (codes.length > 0) {
					const description = xmlDoc.getElementsByTagNameNS("urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2", "Description")[0]?.textContent ?? "Sin descripción"
					return [parseInt(codes[0].textContent), description] // 0 when everthing is really OK
				}
				else { // error
					return [-1, "No se encontró respuesta."] // we have problems
				}
			})
		})
	}

	/**
	 * Declare the document sending it to server.
	 * @param {string} zipStream - The zip file.
	 * @returns {Promise<string>} The proof of the document.
	 */
	async declare(zipStream) {
		const soapXmlDocument = SoapEnvelope.generateSendBill(this, this.#taxpayer, zipStream)

		const responseText = await Endpoint.fetch(Endpoint.INDEX_INVOICE, soapXmlDocument.toString())

		const xmlDoc = new DOMParser().parseFromString(responseText, "text/xml")

		// check if fault node exists
		const faultNode = xmlDoc.getElementsByTagName("soap-env:Fault")[0]

		if (faultNode) {
			throw new Error(faultNode.getElementsByTagName("faultstring")[0].textContent)
		}
		
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

	/**
	 * Convert the document to XML string.
	 * It includes signature node if the document was finalized.
	 * @returns {string} The XML string.
	 */
	toString() {
		return (new XMLSerializer().serializeToString(this.xmlDocument))
	}

	/**
	 * Validate own XML against XSD.
	 * @param {string} mainXsdContent - Main XSD content.
	 * @param {Array<string>} importedXsdContents - Array of imported XSD contents.
	 * @returns {Promise<boolean>} - false if there are errors.
	 */
	async validateXmlWithXsd(mainXsdContent, importedXsdContents) {
		if (!Receipt.#xmllintInstance) {
			const { validateXML } = await import("xmllint-wasm")
			Receipt.#xmllintInstance = validateXML
		}

		const result = await Receipt.#xmllintInstance({
			xml: [{
				fileName: this.getId() + ".xml",
				contents: (new XMLSerializer().serializeToString(this.xmlDocument))
			}],
			schema: mainXsdContent,
			preload: importedXsdContents
		})
			.catch(function (e) {
				console.error(e)
				return false
			})

		if (result.valid) {
			return true
		}
		else {
			console.error('Errores de validación XML:', result.errors)
			return false
		}
	}

	/**
	 * Parse receipt header.
	 * @param {string} xmlContent - The XML content of the document.
	 * @return xmlDoc parsed.
	 */
	fromXml(xmlContent) {
		const xmlDoc = new DOMParser().parseFromString(xmlContent, "application/xml")

		const id = xmlDoc.getElementsByTagNameNS(Receipt.namespaces.cbc, "ID")[0]?.textContent // Everybody has identity
		const [serie, numeration] = id.split('-')
		this.setSerie(serie)
		this.setNumeration(parseInt(numeration))

		this.setHash(xmlDoc.getElementsByTagNameNS(Receipt.namespaces.ds, "DigestValue")[0].textContent)

		return xmlDoc
	}

	validate(validateNumeration = true) {
		if (!this.#serie || this.#serie.length != 4) {
			throw new Error("Serie inconsistente.")
		}

		if (validateNumeration && (!this.#numeration || this.#numeration <= 0 || this.#numeration > 99999999)) {
			throw new Error("Numeración fuera de rango.")
		}

		if (!(this.#issueDate instanceof Date)) {
			throw new Error("No hay fecha de emisión.")
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

	/**
	 * Helper to remove CDATA tags from a string.
	 * @param {string} cdata - The string to remove CDATA tags from.
	 * @returns {string} The string without CDATA tags.
	 */
	static removeCdataTag(cdata) {
		return cdata.trim().replace(/^(\/\/\s*)?<!\[CDATA\[|(\/\/\s*)?\]\]>$/g, '').trim()
	}

	/**
	 * Helper to print a date.
	 * https://stackoverflow.com/a/41480350
	 * @return date as string in format yyyy-mm-dd.
	 */
	static displayDate(date) {
		const day = date.getDate()
		const month = date.getMonth() + 1
		const year = date.getFullYear()

		return year + "-" + ((month < 10 ? "0" : "") + month) + "-" + ((day < 10 ? "0" : "") + day)
	}

	/**
	 * Helper to print a time of a date.
	 * @param {Date} date - The date to handle time.
	 * @return time as string in format HH:MM:SS
	 */
	static displayTime(date) {
		const hour = date.getHours()
		const min = date.getMinutes()
		const sec = date.getSeconds()

		return ((hour < 10 ? "0" : "") + hour) + ":" + ((min < 10 ? "0" : "") + min) + ":" + ((sec < 10 ? "0" : "") + sec)
	}

	/**
	 * Helper to convert an amount to words.
	 * @param {number} amount - The amount to convert to words.
	 * @param {string} junctor - The junctor to use.
	 * @param {string} tail - The tail to use.
	 * @param {number} decimals - The number of decimals to use.
	 * @returns {string} The amount in words.
	 */
	static amountToWords(amount, junctor, tail, decimals = 2) {
		if (amount == 0.0) {
			return `CERO ${junctor} 00/100 ${tail}`
		}

		return writtenNumber(amount | 0 /*truncate positive floating point*/, { lang: "es" }) + ` ${junctor} ${amount.toFixed(decimals).split('.')[1]}/100 ${tail}`
	}
}

export default Receipt;
