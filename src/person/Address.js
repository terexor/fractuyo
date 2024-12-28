class Address {
	#line

	#country
	#ubigeo
	#typecode
	#urbanization
	#city
	#subentity
	#district

	constructor(line) {
		this.line = line
	}

	get line() {
		return this.#line
	}

	get country() {
		return this.#country
	}

	get ubigeo() {
		return this.#ubigeo
	}

	get typecode() {
		return this.#typecode
	}

	get urbanization() {
		return this.#urbanization
	}

	get city() {
		return this.#city
	}

	get subentity() {
		return this.#subentity
	}

	get district() {
		return this.#district
	}

	set line(line) {
		if( ( typeof line === "string" || line instanceof String ) && line.length > 0 ) {
			this.#line = line
		}
	}

	set country(country) {
		this.#country = country
	}

	set ubigeo(ubigeo) {
		this.#ubigeo = ubigeo
	}

	set typecode(code) {
		this.#typecode = code
	}

	set urbanization(urbanization) {
		this.#urbanization = urbanization
	}

	set city(city) {
		this.#city = city
	}

	set subentity(subentity) {
		this.#subentity = subentity
	}

	set district(district) {
		this.#district = district
	}
}

export default Address
