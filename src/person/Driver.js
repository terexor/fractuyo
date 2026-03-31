import Person from "./Person.js"

/**
 * The Driver class extends the Person class to represent a driver.
 * It is used to store information about drivers, such as their license and surname.
 */
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
