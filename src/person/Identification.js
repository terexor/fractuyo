class Identification {
	#number
	#type

	/**
	 * Set document number according type
	 * @var t integer type according catalog 06
	 */
	setIdentity(n, t) {
		if(validateDocumentNumber(parseInt(t, 16), n)) {
			this.#number = n
			this.#type = t
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
}

export default Identification;
