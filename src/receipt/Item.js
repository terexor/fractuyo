class Item {
	#description
	#code
	#quantity
	#unitValue
	#unitCode
	#classificationCode
	#igvPercentage = 0
	#iscPercentage = 0
	#taxableIgvAmount
	#igvAmount
	#iscAmount
	#taxTotalAmount
	#lineExtensionAmount
	#pricingReferenceAmount
	#exemptionReasonCode

	constructor(description) {
		this.setDescription(description)
	}

	getDescription() {
		return this.#description
	}

	setDescription(d) {
		if ( ( typeof d === "string" || d instanceof String ) && d.length > 0 ) {
			this.#description = d
			return
		}
	}

	setCode(c) {
		if ( ( typeof c === "string" || c instanceof String ) && c.length > 0 ) {
			this.#code = c
		}
	}

	getCode() {
		return this.#code
	}

	getQuantity(withFormat = false, decimalLength = 2) {
		return withFormat ? this.#quantity.toFixed(decimalLength) : this.#quantity
	}

	setQuantity(q) {
		this.#quantity = parseFloat(q)
		if (isNaN(this.#quantity)) {
			throw new Error("Cantidad no es un número.")
		}
		if (this.#quantity <= 0) {
			throw new Error("No puede haber 0 como cantidad.")
		}
	}

	getLineExtensionAmount(withFormat = false) {
		return withFormat ? this.#lineExtensionAmount.toFixed(2) : this.#lineExtensionAmount
	}

	/**
	 * According roll 03.
	 */
	setUnitCode(uc) {
		this.#unitCode = uc
	}

	getUnitCode() {
		return this.#unitCode
	}

	/**
	 * According roll 25.
	 */
	setClassificationCode(cc) {
		this.#classificationCode = cc
	}

	getClassificationCode() {
		return this.#classificationCode
	}

	getIscPercentage() {
		return this.#iscPercentage
	}

	setIscPercentage(ip) {
		if (ip >= 0 || ip <= 100) {
			this.#iscPercentage = ip
			return
		}
		throw new Error("Porcentaje ISC inconsistente.")
	}

	getIscAmount(withFormat = false) {
		return withFormat ? this.#iscAmount.toFixed(2) : this.#iscAmount
	}

	setIgvPercentage(ip) {
		if (ip >= 0 || ip <= 100) {
			this.#igvPercentage = ip
			return
		}
		throw new Error("Porcentaje IGV inconsistente.")
	}

	getIgvPercentage() {
		return this.#igvPercentage
	}

	getIgvAmount(withFormat = false) {
		return withFormat ? this.#igvAmount.toFixed(2) : this.#igvAmount
	}

	getUnitValue(withFormat = false, decimalLength = 2) {
		return withFormat ? this.#unitValue.toFixed(decimalLength) : this.#unitValue
	}

	setUnitValue(uv, withoutIgv = false) {
		uv = parseFloat(uv)
		if (!withoutIgv) {
			this.#unitValue = uv
		}
		else {
			if (isNaN(this.#igvPercentage)) {
				throw new Error("Se requiere previamente porcentaje del IGV.")
			}
			this.#unitValue = uv / ( 1 + this.#igvPercentage / 100 )
		}
	}

	calcMounts() {
		//Todo esto asumiendo que el valorUnitario no tiene incluido el IGV.
		//~ (auxiliar) valorVenta = cantidad * valorUnitario
		this.#lineExtensionAmount = this.#quantity * this.#unitValue

		let decimalIscPercentage = 0
		let decimalIgvPercentage = 0

		// Only apply when we are including taxes
		if (this.#exemptionReasonCode < 20) {
			decimalIscPercentage = this.#iscPercentage / 100 // eg: 0.17
			decimalIgvPercentage = this.#igvPercentage / 100 // eg: 0.18
		}

		this.#pricingReferenceAmount = this.#unitValue * (1 + decimalIscPercentage) * (1 + decimalIgvPercentage)

		//~ valorISC = (porcentajeISC/100)×valorVenta
		this.#iscAmount = decimalIscPercentage * this.#lineExtensionAmount

		//~ valorIGV=(porcentajeIGV/100)×(valorVenta + valorISC)
		this.#taxableIgvAmount = this.#iscAmount + this.#lineExtensionAmount
		this.#igvAmount = this.#taxableIgvAmount * decimalIgvPercentage

		this.#taxTotalAmount = this.#iscAmount + this.#igvAmount
	}

	getTaxableIgvAmount(withFormat) {
		return withFormat ? this.#taxableIgvAmount.toFixed(2) : this.#taxableIgvAmount
	}

	getPricingReferenceAmount(withFormat = false, decimalLength = 2) {
		return withFormat ? this.#pricingReferenceAmount.toFixed(decimalLength) : this.#pricingReferenceAmount
	}

	getTaxTotalAmount(withFormat = false) {
		return withFormat ? this.#taxTotalAmount.toFixed(2) : this.#taxTotalAmount
	}

	setExemptionReasonCode(xrc) {
		this.#exemptionReasonCode = xrc
	}

	getExemptionReasonCode() {
		return this.#exemptionReasonCode
	}
}

export default Item;
