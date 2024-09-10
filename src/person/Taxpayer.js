class Taxpayer extends Person {
	#paillierPublicKey
	#paillierPrivateKey

	#cert
	#key

	#solUser
	#solPass

	#deductionsAccount

	#web
	#email
	#telephone

	#tradeName

	/**
	 * Vector holding address metadata.
	 */
	#metaAddress

	setMetaAddress(country, ubigeo, typecode, urbanization, city, subentity, district) {
		if(this.#metaAddress == undefined) {
			this.#metaAddress = Array(7)
		}
		this.#metaAddress[0] = country
		this.#metaAddress[1] = ubigeo
		this.#metaAddress[2] = typecode
		this.#metaAddress[3] = urbanization
		this.#metaAddress[4] = city
		this.#metaAddress[5] = subentity
		this.#metaAddress[6] = district
	}

	getMetaAddress() {
		return this.#metaAddress
	}

	createPaillierPublicKey(n, g) {
		this.#paillierPublicKey = new PublicKey(n, g)
	}

	getPaillierPublicKey() {
		return this.#paillierPublicKey
	}

	createPaillierPrivateKey(lambda, mu, n, g, p, q) {
		this.#paillierPublicKey = new PublicKey(n, g)
		this.#paillierPrivateKey = new PrivateKey(lambda, mu, paillierPublicKey, p, q)
	}

	getPaillierPrivateKey() {
		return this.#paillierPrivateKey
	}

	/**
	 * @return int -1 when now is out of range of validity or major than -1 for remaining days
	 */
	setCert(c) {
		this.#cert = c

		let der =  window.Encoding.base64ToBuf( c.split(/\n/).filter(function (line) {
			return !/-----/.test(line)
		}).join('') )

		let json = ASN1.parse({ der: der, json: false, verbose: true })
		const notBefore = json.children[0].children[4].children[0]
		const notAfter = json.children[0].children[4].children[1]
		let validityNotBefore = window.Encoding.bufToStr(notBefore.value)
		let validityNotAfter = window.Encoding.bufToStr(notAfter.value)
		let timeNotBefore, timeNotAfter
		if(notAfter.type == 23) {
			//prepend two digits of year
			validityNotAfter = ( parseInt(validityNotAfter.substring(0, 2)) < 50 ? "20" : "19" ) + validityNotAfter
		}
		timeNotAfter = Date.UTC(
			validityNotAfter.substring(0, 4),
			parseInt(validityNotAfter.substring(4, 6)) - 1,
			validityNotAfter.substring(6, 8),
			validityNotAfter.substring(8, 10),
			validityNotAfter.substring(10, 12),
			validityNotAfter.substring(12, 14)
		)
		if(notBefore.type == 23) {
			validityNotBefore = ( parseInt(validityNotBefore.substring(0, 2)) < 50 ? "20" : "19" ) + validityNotBefore
		}
		timeNotBefore = Date.UTC(
			validityNotBefore.substring(0, 4),
			parseInt(validityNotBefore.substring(4, 6)) - 1,
			validityNotBefore.substring(6, 8),
			validityNotBefore.substring(8, 10),
			validityNotBefore.substring(10, 12),
			validityNotBefore.substring(12, 14)
		)

		const now = Date.now()
		if(now < timeNotBefore || now > timeNotAfter) {
			return -1
		}
		else {
			return Math.round( ( timeNotAfter - now ) / (1000 * 60 * 60 * 24) )
		}
	}

	getCert() {
		return this.#cert
	}

	getKey() {
		return this.#key
	}

	getKey() {
		return this.#key
	}

	setKey(k) {
		this.#key = k
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

	setDeductionsAccount(da) {
		if(da.length > 0) {
			this.#deductionsAccount = da
		}
	}

	getDeductionsAccount() {
		return this.#deductionsAccount
	}

	setWeb(w) {
		if(w.length != 0) {
			this.#web = w
		}
	}

	setEmail(em) {
		if(em.length != 0) {
			this.#email = em
		}
	}

	setTelephone(t) {
		if(t.length != 0) {
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
		this.#name = this.#identity = this.#cert = this.#key = this.#solUser = this.#solPass = this.#web = this.#email = this.#telephone = null
	}
}
