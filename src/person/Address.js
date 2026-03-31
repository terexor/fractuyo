/**
 * The Address class represents the address of a person or entity.
 * It is used to store information about address, such as the line, country, ubigeo, typecode, urbanization, city, subentity and district.
 */
class Address {
	/** @type {string} */
	#line

	/** @type {string} */
	#country

	/** @type {string} */
	#ubigeo

	/** @type {string} */
	#typecode

	/** @type {string} */
	#urbanization

	/** @type {string} */
	#city

	/** @type {string} */
	#subentity

	/** @type {string} */
	#district

	/**
	 * @param {string} line
	 */
	constructor(line) {
		this.#line = line
	}

	/**
	 * @returns {string}
	 */
	get line() {
		return this.#line
	}

	/**
	 * @returns {string}
	 */
	get country() {
		return this.#country
	}

	/**
	 * @returns {string}
	 */
	get ubigeo() {
		return this.#ubigeo
	}

	/**
	 * @returns {string}
	 */
	get typecode() {
		return this.#typecode
	}

	/**
	 * @returns {string}
	 */
	get urbanization() {
		return this.#urbanization
	}

	/**
	 * @returns {string}
	 */
	get city() {
		return this.#city
	}

	/**
	 * @returns {string}
	 */
	get subentity() {
		return this.#subentity
	}

	/**
	 * @returns {string}
	 */
	get district() {
		return this.#district
	}

	/**
	 * @param {string} line
	 */
	set line(line) {
		if ((typeof line === "string") && line.length > 0) {
			this.#line = line
		}
	}

	/**
	 * @param {string} country
	 */
	set country(country) {
		this.#country = country
	}

	/**
	 * @param {string} ubigeo
	 */
	set ubigeo(ubigeo) {
		this.#ubigeo = ubigeo
	}

	/**
	 * @param {string} code
	 */
	set typecode(code) {
		this.#typecode = code
	}

	/**
	 * @param {string} urbanization
	 */
	set urbanization(urbanization) {
		this.#urbanization = urbanization
	}

	/**
	 * @param {string} city
	 */
	set city(city) {
		this.#city = city
	}

	/**
	 * @param {string} subentity
	 */
	set subentity(subentity) {
		this.#subentity = subentity
	}

	/**
	 * @param {string} district
	 */
	set district(district) {
		this.#district = district
	}
}

export default Address
