class Person {
	#name
	#address
	#identification

	getName() {
		return this.#name
	}

	setName(n) {
		if(n.length > 0) {
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
