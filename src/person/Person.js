/**
 * The Person class represents a person or entity that can be a customer or supplier.
 * It is used to store information about persons, such as their name, address and identification.
 */
class Person {
	#name
	#address
	#identification

	getName() {
		return this.#name
	}

	setName(n) {
		if (n.length > 0) {
			this.#name = n
		}
	}

	setIdentification(i) {
		this.#identification = i
	}

	getIdentification() {
		return this.#identification
	}

	setAddress(a) {
		this.#address = a
	}

	getAddress() {
		return this.#address
	}
}

export default Person;
