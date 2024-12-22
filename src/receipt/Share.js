var Share = function() {
	var dueDate, amount

	this.setDueDate = function(dd) {
		dueDate = dd
	}

	this.getDueDate = function() {
		return dueDate
	}

	this.setAmount = function(a) {
		amount = parseFloat(a)
		if(isNaN(amount)) {
			throw new Error("Cantidad de cuota no es un número.")
		}
		if(amount <= 0) {
			throw new Error("Monto de cuota no puede ser 0.")
		}
	}

	this.getAmount = function(withFormat = false) {
		return withFormat ? amount.toFixed(2) : amount
	}
}

export default Share;
