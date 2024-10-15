class Vehicle {
	#identity // registration, placa, matrícula

	#registrationIdentity // circulation number card

	#authorization // authorization number

	#departmentCode // state entity, agency

	constructor(identity) {
		this.setIdentity(identity)
	}

	setIdentity(identity) {
		this.#identity = identity
	}

	get identity() {
		return this.#identity
	}

	setRegistrationIdentity(identity) {
		this.#registrationIdentity = identity
	}

	get registrationIdentity() {
		return this.#registrationIdentity
	}

	setAuthorization(authorization) {
		this.#authorization = authorization
	}

	get authorization() {
		return this.#authorization
	}

	setDepartmentCode(code) {
		this.#departmentCode = code
	}

	get departmentCode() {
		return this.#departmentCode
	}
}

export default Vehicle
