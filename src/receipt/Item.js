var Item = function(_description) {
	var description
	var code
	var quantity
	var unitValue
	var unitCode, classificationCode
	var igvPercentage, iscPercentage
	var taxableIgvAmount
	var igvAmount, iscAmount
	var taxTotalAmount
	var lineExtensionAmount, pricingReferenceAmount
	var exemptionReasonCode

	this.getDescription = function() {
		return description
	}

	this.setDescription = function(d) {
		if( ( typeof d === "string" || d instanceof String ) && d.length > 0 ) {
			description = d
			return
		}
	}

	this.setCode = function(c) {
		if( ( typeof c === "string" || c instanceof String ) && c.length > 0 ) {
			code = c
		}
	}

	this.getCode = function() {
		return code
	}

	this.getQuantity = function(withFormat = false, decimalLength = 2) {
		return withFormat ? quantity.toFixed(decimalLength) : quantity
	}

	this.setQuantity = function(q) {
		quantity = parseFloat(q)
		if(isNaN(quantity)) {
			throw new Error("Cantidad no es un número.")
		}
		if(quantity <= 0) {
			throw new Error("No puede haber 0 como cantidad.")
		}
	}

	this.getLineExtensionAmount = function(withFormat = false) {
		return withFormat ? lineExtensionAmount.toFixed(2) : lineExtensionAmount
	}

	/**
	 * According roll 03.
	 */
	this.setUnitCode = function(uc) {
		unitCode = uc
	}

	this.getUnitCode = function() {
		return unitCode
	}

	/**
	 * According roll 25.
	 */
	this.setClassificationCode = function(cc) {
		classificationCode = cc
	}

	this.getClassificationCode = function() {
		return classificationCode
	}

	this.getIscPercentage = function() {
		return iscPercentage
	}

	this.setIscPercentage = function(ip) {
		if(ip >= 0 || ip <= 100) {
			iscPercentage = ip
			return
		}
		throw new Error("Porcentaje ISC inconsistente.")
	}

	this.getIscAmount = function(withFormat = false) {
		return withFormat ? iscAmount.toFixed(2) : iscAmount
	}

	this.setIgvPercentage = function(ip) {
		if(ip >= 0 || ip <= 100) {
			igvPercentage = ip
			return
		}
		throw new Error("Porcentaje IGV inconsistente.")
	}

	this.getIgvPercentage = function() {
		return igvPercentage
	}

	this.getIgvAmount = function(withFormat = false) {
		return withFormat ? igvAmount.toFixed(2) : igvAmount
	}

	this.getUnitValue = function(withFormat = false, decimalLength = 2) {
		return withFormat ? unitValue.toFixed(decimalLength) : unitValue
	}

	this.setUnitValue = function(uv, withoutIgv) {
		uv = parseFloat(uv)
		if(!withoutIgv) {
			unitValue = uv
		}
		else {
			if(isNaN(igvPercentage)) {
				throw new Error("Se requiere previamente porcentaje del IGV.")
			}
			unitValue = uv / ( 1 + igvPercentage / 100 )
		}
	}

	this.calcMounts = function() {
		//Todo esto asumiendo que el valorUnitario no tiene incluido el IGV.
		//~ (auxiliar) valorVenta = cantidad * valorUnitario
		lineExtensionAmount = quantity * unitValue

		let decimalIscPercentage = 0
		let decimalIgvPercentage = 0

		// Only apply when we are including taxes
		if (exemptionReasonCode < 20) {
			decimalIscPercentage = iscPercentage / 100 // eg: 0.17
			decimalIgvPercentage = igvPercentage / 100 // eg: 0.18
		}

		pricingReferenceAmount = unitValue * (1 + decimalIscPercentage) * (1 + decimalIgvPercentage)

		//~ valorISC = (porcentajeISC/100)×valorVenta
		iscAmount = decimalIscPercentage * lineExtensionAmount

		//~ valorIGV=(porcentajeIGV/100)×(valorVenta + valorISC)
		taxableIgvAmount = iscAmount + lineExtensionAmount
		igvAmount = taxableIgvAmount * decimalIgvPercentage

		taxTotalAmount = iscAmount + igvAmount
	}

	this.getTaxableIgvAmount = function(withFormat) {
		return withFormat ? taxableIgvAmount.toFixed(2) : taxableIgvAmount
	}

	this.getPricingReferenceAmount = function(withFormat = false, decimalLength = 2) {
		return withFormat ? pricingReferenceAmount.toFixed(decimalLength) : pricingReferenceAmount
	}

	this.getTaxTotalAmount = function(withFormat = false) {
		return withFormat ? taxTotalAmount.toFixed(2) : taxTotalAmount
	}

	this.setExemptionReasonCode = function(xrc) {
		exemptionReasonCode = xrc
	}

	this.getExemptionReasonCode = function() {
		return exemptionReasonCode
	}

	this.setDescription(_description) // Assigning description in constructor
}

export default Item;
