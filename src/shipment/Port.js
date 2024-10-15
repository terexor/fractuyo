/**
 * When items arrive in import.
 */
class Port {
	#type // true: port, false: airport
	#identity // code (3 letters)
	#name

	constructor(type, identity) {
		this.#type = type
		this.setIdentity(identity)
	}

	get type() {
		return this.#type
	}

	setIdentity(identity) {
		this.#identity = identity
	}

	get identity() {
		return this.#identity
	}

	setName(name) {
		this.#name = name
	}

	get name() {
		return this.#name
	}
}

export default Port
