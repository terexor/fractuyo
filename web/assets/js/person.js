var Person = function() {
	var name, ruc
	var address

	this.getName = function(withCdata = false) {
		return withCdata ? `<![CDATA[ ${name} ]]>` : name
	}

	this.setName = function(n) {
		if(n.length > 0) {
			name = n
		}
	}

	this.setRuc = function(r) {
		if(validateRuc(r)) {
			ruc = r
			return
		}
		throw new Error("RUC inconsistente.")
	}

	this.getRuc = function() {
		return ruc
	}

	this.setAddress = function(a) {
		address = a
	}

	this.getAddress = function(withCdata = false) {
		return withCdata ? `<![CDATA[ ${address} ]]>` : address
	}
}

var Taxpayer = function() {
	var cert, key
	var solUser, solPass

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

	this.setSolPass = function(sp) {
		solPass = sp
	}

	this.clearData = function() {
		name = ruc = cert = key = null
	}
}

Taxpayer.prototype = new Person()
