/**
 * Any document to hold its identity.
 */
class DocumentReference {
	/**
	 * Type to use as reference:
	 * 0: Used as billing reference in notes
	 * 1: Additional
	 * 2: Despatch
	 * 3: Contract
	 */
	#referenceType

	#id

	#typeCode

	#prepayment // optional value

	/**
	 * @param {int} referenceType.
	 */
	constructor(referenceType) {
		this.#referenceType = referenceType
	}

	getReferenceType() {
		return this.#referenceType
	}

	setId(id) {
		this.#id = id
	}

	getId() {
		return this.#id
	}

	setTypeCode(code) {
		this.#typeCode = code
	}

	getTypeCode(withFormat = false) {
		if (withFormat) {
			return String(this.#typeCode).padStart(2, '0')
		}
		return this.#typeCode
	}

	/**
	 * @param {float} mount of prepayment.
	 */
	setPrepayment(mount) {
		this.#prepayment = mount
	}

	getPrepayment() {
		return this.#prepayment
	}
}

export default DocumentReference;
