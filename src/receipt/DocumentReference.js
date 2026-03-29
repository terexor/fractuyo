/**
 * Any document to hold its identity.
 */
class DocumentReference {
	static BILLING = 0
	static ADDITIONAL = 1
	static DESPATCH = 2
	static CONTRACT = 3
	static PREPAID_PAYMENT = 4

	/**
	 * Type to use as reference:
	 * 0: Used as billing reference in notes
	 * 1: Additional
	 * 2: Despatch
	 * 3: Contract
	 * 4: Prepaid payment
	 * @type {number}
	 */
	#referenceType

	/**
	 * @type {string}
	 */
	#id

	/**
	 * @type {number}
	 */
	#typeCode

	/** @type {string} */
	#issuerId // RUC

	/**
	 * @param {number} referenceType
	 */
	constructor(referenceType) {
		this.#referenceType = referenceType
	}

	/**
	 * @returns {number}
	 */
	getReferenceType() {
		return this.#referenceType
	}

	/**
	 * Set identifier of document reference like F000-12345678.
	 * @param {string} id
	 */
	setId(id) {
		this.#id = id
	}

	/**
	 * Get identifier of document reference like F000-12345678.
	 * @returns {string}
	 */
	getId() {
		return this.#id
	}

	/**
	 * @param {number} code
	 */
	setTypeCode(code) {
		this.#typeCode = code
	}

	/**
	 * @param {boolean} withFormat
	 * @returns {string|number}
	 */
	getTypeCode(withFormat = false) {
		if (withFormat) {
			return String(this.#typeCode).padStart(2, '0')
		}
		return this.#typeCode
	}

	/**
	 * Set number of identification of issuer document.
	 * It's not neccessary to set this if you will be using your same RUC.
	 * ID is RUC.
	 * @param {string} issuerId
	 */
	setIssuerId(issuerId) {
		// Validate with utility function
		this.#issuerId = issuerId
	}

	/**
	 * @returns {string}
	 */
	getIssuerId() {
		return this.#issuerId
	}
}

export default DocumentReference
