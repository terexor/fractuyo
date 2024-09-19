class Identification {
	#number
	#type

	constructor(type, number) {
		this.setIdentity(type, number)
	}

	/**
	 * Set document number according type
	 * @var t integer type according catalog 06
	 */
	setIdentity(type, number) {
		if (Identification.validateDocumentNumber(parseInt(type, 16), number)) {
			this.#number = number
			this.#type = type
			return this
		}
		throw new Error("Número de identificación de persona inconsistente.")
	}

	getNumber() {
		return this.#number
	}

	getType() {
		return this.#type
	}

	static validateDocumentNumber(documentType, number) {
		switch(documentType) {
			case 0:
				return true
			case 1://DNI o libreta electoral
				//longitud: 8: exacta
				//caracter: numérico
				return ( number != null && number.length === 8 && !isNaN(number) )
			case 4:
				//longitud: 12: máxima
				//caracter: alfanumérico
				return ( number != null && number.length < 13 )
			case 6:
				return Identification.validateRuc(number)
			default:
				return false
		}
	}

	static validateRuc(ruc) {
		if ( ruc.length != 11 ||  parseInt(ruc) < 11 ) {
			return false
		}
		if ( ! ["10", "15", "17", "20"].includes( ruc.substring(0, 2) ) ) {
			return false
		}

		// Taken from https://www.excelnegocios.com/validacion-de-rucs-sunat-peru-sin-internet-algoritmo/
		const maxFactor = 8
		let currentFactor = 1
		let sum = 0
		for (let i = 9; i >= 0; --i) {
			if (++currentFactor == maxFactor) {
				currentFactor = 2
			}

			sum += currentFactor * parseInt( ruc.charAt(i) )
		}

		if ( ( 11 - ( sum % 11 ) ) % 10 == parseInt(ruc.charAt(10)) ) {
			return true
		}

		return false
	}
}

export default Identification;
