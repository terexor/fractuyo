class Vehicle {
	#identity // registration, placa, matrícula

	constructor(identity) {
		this.setIdentity(identity)
	}

	setIdentity(identity) {
		this.#identity = identity
	}

	get identity() {
		return this.#identity
	}
}

export default Vehicle
