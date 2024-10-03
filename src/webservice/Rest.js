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
	static generateSend(receipt, zipStream) {
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

		let hash = "ab12=" // test

		return {
			"archivo" : {
				"nomArchivo": `${receipt.taxpayer.getIdentification().getNumber()}-${receipt.getId(true)}.zip`,
				"arcGreZip": zipStream,
				"hashZip": hash
			}
		}
	}
}

export default Rest
