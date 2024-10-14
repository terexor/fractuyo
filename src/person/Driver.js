import Person from "./Person.js"

class Driver extends Person {
	#license

	constructor(license) {
		super()
		this.setLicense(license)
	}

	setLicense(license) {
		this.#license = license
	}

	getLicense() {
		return this.#license
	}
}

export default Driver
