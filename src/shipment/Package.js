/**
 * Used as container.
 */
class Package {
	#traceIdentity // such as the EPC number used in RFID

	#returnable // indicator of return

	constructor(identity) {
		this.traceIdentity(identity)
	}

	set traceIdentity(identity) {
		this.#traceIdentity = identity
	}

	get traceIdentity() {
		return this.#traceIdentity
	}

	setReturnable(returnable) {
		this.#returnable = returnable
	}

	isReturnable() {
		return this.#returnable
	}
}

export default Package
