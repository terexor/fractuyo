/**
 * Any document to hold its identity.
 */
class DocumentReference {
	/**
	 * Type to use as reference:
	 * 0: Additional
	 * 1: Despatch
	 * 2: Contract
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

	setId(id) {
		this.#id = id
	}

	getId() {
		return this.#id
	}

	setTypeCode(code) {
		this.#typeCode = code
	}

	getTypeCode() {
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
