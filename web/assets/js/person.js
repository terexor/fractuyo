var Identification = function() {
	var number, type

	/**
	 * Set document number according type
	 * @var t integer type according catalog 06
	 */
	this.setIdentity = function(n, t) {
		if(validateDocumentNumber(parseInt(t, 16), n)) {
			number = n
			type = t
			return this
		}
		throw new Error("Número de identificación de persona inconsistente.")
	}

	this.getNumber = function() {
		return number
	}

	this.getType = function() {
		return type
	}
}

var Person = function() {
	var name, identification
	var address

	this.getName = function() {
		return name
	}

	this.setName = function(n) {
		if(n.length > 0) {
			name = n
		}
	}

	this.setIdentification = function(i) {
		identification = i
	}

	this.getIdentification = function() {
		return identification
	}

	this.setAddress = function(a) {
		if( ( typeof a === "string" || a instanceof String ) && a.length > 0 ) {
			address = a
		}
	}

	this.getAddress = function() {
		return address
	}
}

var Taxpayer = function() {
	var paillierPublicKey, paillierPrivateKey
	var cert, key
	var solUser, solPass
	var deductionsAccount
	var web, email, telephone
	var tradeName

	/**
	 * Vector holding address metadata.
	 */
	var metaAddress

	this.setMetaAddress = function(country, ubigeo, typecode, urbanization, city, subentity, district) {
		if(metaAddress == undefined) {
			metaAddress = Array(7)
		}
		metaAddress[0] = country
		metaAddress[1] = ubigeo
		metaAddress[2] = typecode
		metaAddress[3] = urbanization
		metaAddress[4] = city
		metaAddress[5] = subentity
		metaAddress[6] = district
	}

	this.getMetaAddress = function() {
		return metaAddress
	}

	this.createPaillierPublicKey = function(n, g) {
		paillierPublicKey = new PublicKey(n, g)
	}

	this.getPaillierPublicKey = function() {
		return paillierPublicKey
	}

	this.createPaillierPrivateKey = function(lambda, mu, n, g, p, q) {
		paillierPublicKey = new PublicKey(n, g)
		paillierPrivateKey = new PrivateKey(lambda, mu, paillierPublicKey, p, q)
	}

	this.getPaillierPrivateKey = function() {
		return paillierPrivateKey
	}

	/**
	 * @return int -1 when now is out of range of validity or major than -1 for remaining days
	 */
	this.setCert = function(c) {
		cert = c

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

	this.getCert = function() {
		return cert
	}

	this.getKey = function() {
		return key
	}

	this.getKey = function() {
		return key
	}

	this.setKey = function(k) {
		key = k
	}

	this.setSolUser = function(su) {
		solUser = su
	}

	this.getSolUser = function() {
		return solUser
	}

	this.setSolPass = function(sp) {
		solPass = sp
	}

	this.getSolPass = function() {
		return solPass
	}

	this.setDeductionsAccount = function(da) {
		if(da.length > 0) {
			deductionsAccount = da
		}
	}

	this.getDeductionsAccount = function() {
		return deductionsAccount
	}

	this.setWeb = function(w) {
		if(w.length != 0) {
			web = w
		}
	}

	this.setEmail = function(em) {
		if(em.length != 0) {
			email = em
		}
	}

	this.setTelephone = function(t) {
		if(t.length != 0) {
			telephone = t
		}
	}

	this.getWeb = function() {
		return web
	}

	this.getEmail = function() {
		return email
	}

	this.getTelephone = function() {
		return telephone
	}

	this.setTradeName = function(tn) {
		tradeName = tn
	}

	this.getTradeName = function() {
		return tradeName
	}

	this.clearData = function() {
		name = identity = cert = key = solUser = solPass = web = email = telephone = null
	}
}

Taxpayer.prototype = new Person()
