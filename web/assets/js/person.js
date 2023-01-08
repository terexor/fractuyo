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

	this.setCert = function(c) {
		cert = c
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
