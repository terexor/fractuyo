import Person from "./Person.js"

class Driver extends Person {
	#license

	#familyName // surname

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

	setFamilyName(name) {
		this.#familyName = name
	}

	getFamilyName() {
		return this.#familyName
	}
}

export default Driver
