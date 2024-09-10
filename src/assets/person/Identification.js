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
