import Person from "./Person.js"

import * as asn1js from "asn1js"

class Taxpayer extends Person {
	#certPem
	#certDer
	#keyDer

	#solUser
	#solPass

	#solId
	#solSecret

	#deductionsAccount

	#web
	#email
	#telephone

	#tradeName

	/**
	 * @return array containing PEM in single string and DER.
	 */
	static transformPemToDer(base64String) {
		// Clean the PEM string
		const pem = base64String
			// remove BEGIN/END
			.replace(/-----(BEGIN|END)[\w\d\s]+-----/g, "")
			// remove \r, \n
			.replace(/[\r\n]/g, "")

		if (typeof Buffer !== 'undefined') {
			// for Node.js, use Buffer.from
			return [ pem, Buffer.from(pem, 'base64') ]
		}
		else if (typeof window !== 'undefined' && typeof window.atob === 'function') {
			// in browser
			const binaryString = window.atob(pem)
			const len = binaryString.length
			const bytes = new Uint8Array(len)

			for (let i = 0; i < len; i++) {
				bytes[i] = binaryString.charCodeAt(i)
			}

			return [ pem, bytes.buffer ]
		}
		else {
			throw new Error('El entorno no es compatible con esta función.')
		}
	}

	/**
	 * @return int -1 when now is out of range of validity or major than -1 for remaining days
	 */
	setCert(c) {
		[ this.#certPem, this.#certDer ] = Taxpayer.transformPemToDer(c)

		const asn1 = asn1js.fromBER(this.#certDer)
		const notBefore = asn1.result.valueBlock.value[0].valueBlock.value[4].valueBlock.value[0]
		const notAfter = asn1.result.valueBlock.value[0].valueBlock.value[4].valueBlock.value[1]

		const timeNotBefore = Date.UTC(
			notBefore.year,
			notBefore.month - 1,
			notBefore.day,
			notBefore.hour,
			notBefore.minute,
			notBefore.second
		)
		const timeNotAfter = Date.UTC(
			notAfter.year,
			notAfter.month - 1,
			notAfter.day,
			notAfter.hour,
			notAfter.minute,
			notAfter.second
		)

		const now = Date.now()
		if(now < timeNotBefore || now > timeNotAfter) {
			return -1
		}
		else {
			return Math.round( ( timeNotAfter - now ) / (1000 * 60 * 60 * 24) )
		}
	}

	/**
	 * @return Buffer created from base64 in setCert()
	 */
	getCert() {
		return this.#certDer
	}

	getCertPem() {
		return this.#certPem
	}

	/**
	 * @return Buffer created from base64 in setKey()
	 */
	getKey() {
		return this.#keyDer
	}

	setKey(k) {
		let keyPem // never used
		[ keyPem, this.#keyDer ] = Taxpayer.transformPemToDer(k)
	}

	setSolUser(su) {
		this.#solUser = su
	}

	getSolUser() {
		return this.#solUser
	}

	setSolPass(sp) {
		this.#solPass = sp
	}

	getSolPass() {
		return this.#solPass
	}

	setSolId(id) {
		this.#solId = id
	}

	getSolId() {
		return this.#solId
	}

	setSolSecret(secret) {
		this.#solSecret = secret
	}

	getSolSecret() {
		return this.#solSecret
	}

	setDeductionsAccount(da) {
		if (da && da.length != 0) {
			this.#deductionsAccount = da
		}
	}

	getDeductionsAccount() {
		return this.#deductionsAccount
	}

	setWeb(w) {
		if(w && w.length != 0) {
			this.#web = w
		}
	}

	setEmail(em) {
		if(em && em.length != 0) {
			this.#email = em
		}
	}

	setTelephone(t) {
		if(t && t.length != 0) {
			this.#telephone = t
		}
	}

	getWeb() {
		return this.#web
	}

	getEmail() {
		return this.#email
	}

	getTelephone() {
		return this.#telephone
	}

	setTradeName(tn) {
		this.#tradeName = tn
	}

	getTradeName() {
		return this.#tradeName
	}

	clearData() {
		this.#certPem = this.#certDer = this.#keyDer = this.#solId = this.#solSecret = this.#solUser = this.#solPass = this.#web = this.#email = this.#telephone = this.#deductionsAccount = null
	}
}

export default Taxpayer;
