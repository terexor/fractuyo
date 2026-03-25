import { SignedXml } from "xmldsigjs"

class XmlSigner {
	// Constant to reuse it
	static #RSA_PARAMS = Object.freeze({
		name: "RSASSA-PKCS1-v1_5",
		hash: "SHA-256",
	})

	static async getSignedNode(cryptoSubtle, xmlDoc, taxpayer, canonMethod) {
		// We import the key (an expensive operation)
		const key = await cryptoSubtle.importKey(
			"pkcs8",
			taxpayer.getKey(),
			this.#RSA_PARAMS,
			false,
			["sign"]
		)

		const signature = new SignedXml()

		// Just sign
		const result = await signature.Sign(this.#RSA_PARAMS, key, xmlDoc, {
			references: [
				{ id: "terexoris", uri: "", hash: "SHA-256", transforms: ["enveloped", canonMethod] }
			],
			x509: [taxpayer.getCertPem()],
			/*
			 * It exists, but Sunat does not handle big numbers (20 bytes) in serial numbers so was removed.
			 * Structure can be found in http://www.datypic.com/sc/ubl21/e-xades_SigningCertificate.html
			 * It could be enabled using global options.
			 */
			// signingCertificate: x509
		})

		return result.GetXml()
	}
}

export default XmlSigner
