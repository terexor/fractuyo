import XAdES from "xadesjs"

class Rest {
	/**
	 * @returns URLSearchParams
	 */
	static generateToken(taxpayer) {
		const data = new URLSearchParams()
		data.append("grant_type", "password")
		data.append("scope", "https://api-cpe.sunat.gob.pe")
		data.append("client_id", taxpayer.getSolId())
		data.append("client_secret", taxpayer.getSolSecret())
		data.append("username", `${taxpayer.getIdentification().getNumber()}${taxpayer.getSolUser()}`)
		data.append("password", taxpayer.getSolPass())

		return data
	}
	/**
	 * @returns JSON
	 */
	static async generateSend(receipt, zipStream) {
		let zipBuffer
		if (typeof Buffer !== 'undefined') {
			// for Node.js, use Buffer.from
			zipBuffer = Buffer.from(zipStream, "base64")
		}
		else if (typeof window !== 'undefined' && typeof window.atob === 'function') {
			// in browser
			const binaryString = window.atob(zipStream)
			const len = binaryString.length
			const bytes = new Uint8Array(len)

			for (let i = 0; i < len; i++) {
				bytes[i] = binaryString.charCodeAt(i)
			}

			zipBuffer = bytes.buffer
		}
		else {
			throw new Error('El entorno no es compatible con esta función.')
		}

		const hash = await XAdES.Application.crypto.subtle.digest("SHA-256", zipBuffer)

		const bytes = new Uint8Array(hash)
		const hexChars = new Array(bytes.length)

		for (let i = 0; i < bytes.length; ++i) {
			hexChars[i] = bytes[i].toString(16).padStart(2, '0')
		}

		return {
			"archivo" : {
				"nomArchivo": `${receipt.taxpayer.getIdentification().getNumber()}-${receipt.getId(true)}.zip`,
				"hashZip": hexChars.join(''), // in documentation looks like base64 but documentation is bad
				"arcGreZip": zipStream
			}
		}
	}
}

export default Rest
