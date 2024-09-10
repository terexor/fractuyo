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
