var Company = function() {
	var name, ruc
	var cert, key
	var solUser, solPass
	var address

	this.getName = function(withCdata = false) {
		return withCdata ? `<![CDATA[ ${name} ]]>` : name
	}

	this.setName = function(n) {
		name = n
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

	this.setAddress = function(a) {
		address = a
	}

	this.clearData = function() {
		name = ruc = cert = key = null
	}
}
