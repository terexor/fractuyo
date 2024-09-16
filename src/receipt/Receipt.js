import XAdES from "xadesjs"

class Receipt {
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

	setUblVersion(ublVersion) {
		this.#ublVersion = ublVersion
	}

	constructor(taxpayer, customer) {
		this.#taxpayer = taxpayer
		this.#customer = customer
		this.xmlDocument
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

	getTypeCode() {
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
}

export default Receipt;
