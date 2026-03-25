/**
 * Represents a line in the document.
 * When you finish setting all the item's properties, call calcMounts() to calculate the mounts.
 */
class Item {
	/** @type {string} */
	#description

	/** @type {string} */
	#code

	/** @type {number} */
	#quantity

	/** @type {number} */
	#unitValue

	/** @type {string} */
	#unitCode

	/** @type {string} */
	#classificationCode

	/** @type {number} */
	#igvPercentage = 0

	/** @type {number} */
	#iscPercentage = 0

	/** @type {number} */
	#taxableIgvAmount

	/** @type {number} */
	#igvAmount

	/** @type {number} */
	#iscAmount

	/** @type {number} */
	#taxTotalAmount

	/** @type {number} */
	#lineExtensionAmount

	/** @type {number} */
	#pricingReferenceAmount

	/** @type {number} */
	#exemptionReasonCode

	/**
	 * @param {string} description - Item description as product or service.
	 */
	constructor(description) {
		this.setDescription(description)
	}

	/**
	 * @returns {string} - Item description.
	 */
	getDescription() {
		return this.#description
	}

	/**
	 * Item description as product or service.
	 * @param {string} d - Item description.
	 */
	setDescription(d) {
		if ((typeof d === "string") && d.length > 0) {
			this.#description = d
			return
		}
	}

	/**
	 * @param {string} c - Item code.
	 */
	setCode(c) {
		if ((typeof c === "string") && c.length > 0) {
			this.#code = c
		}
	}

	/**
	 * @returns {string} - Item code.
	 */
	getCode() {
		return this.#code
	}

	/**
	 * @returns {number} - Item quantity.
	 */
	getQuantity() {
		return this.#quantity
	}

	/**
	 * How many units of the item are being sold.
	 * @param {number} q - Item quantity.
	 */
	setQuantity(q) {
		this.#quantity = q
		if (isNaN(this.#quantity)) {
			throw new Error("Cantidad no es un número.")
		}
		if (this.#quantity <= 0) {
			throw new Error("No puede haber 0 como cantidad.")
		}
	}

	/**
	 * @returns {number} - Line extension amount.
	 */
	getLineExtensionAmount() {
		return this.#lineExtensionAmount
	}

	/**
	 * According roll 03.
	 * @param {string} uc - Unit code.
	 */
	setUnitCode(uc) {
		this.#unitCode = uc
	}

	/**
	 * @returns {string} - Unit code.
	 */
	getUnitCode() {
		return this.#unitCode
	}

	/**
	 * According roll 25.
	 * @param {string} cc - Classification code.
	 */
	setClassificationCode(cc) {
		this.#classificationCode = cc
	}

	/**
	 * @returns {string} - Classification code.
	 */
	getClassificationCode() {
		return this.#classificationCode
	}

	/**
	 * @returns {number} - ISC percentage.
	 */
	getIscPercentage() {
		return this.#iscPercentage
	}

	/**
	 * @param {number} ip - ISC percentage.
	 * @throws {Error} - If ISC percentage is inconsistent.
	 */
	setIscPercentage(ip) {
		if (ip >= 0 || ip <= 100) {
			this.#iscPercentage = ip
			return
		}
		throw new Error("Porcentaje ISC inconsistente.")
	}

	/**
	 * @returns {number} - ISC amount.
	 */
	getIscAmount() {
		return this.#iscAmount
	}

	/**
	 * Percentage from 0 to 100.
	 * @param {number} ip - IGV percentage.
	 * @throws {Error} - If IGV percentage is inconsistent.
	 */
	setIgvPercentage(ip) {
		if (ip >= 0 || ip <= 100) {
			this.#igvPercentage = ip
			return
		}
		throw new Error("Porcentaje IGV inconsistente.")
	}

	/**
	 * @returns {number} - IGV percentage.
	 */
	getIgvPercentage() {
		return this.#igvPercentage
	}

	/**
	 * @returns {number} - IGV amount.
	 */
	getIgvAmount() {
		return this.#igvAmount
	}

	/**
	 * @returns {number} - Unit value.
	 */
	getUnitValue() {
		return this.#unitValue
	}

	/**
	 * It's the value of one item without taxes.
	 * @param {number} uv - Unit value.
	 * @param {boolean} withoutIgv - Whether the unit does not include IGV.
	 */
	setUnitValue(uv, withoutIgv) {
		if (!withoutIgv) {
			this.#unitValue = uv
			return
		}

		if (isNaN(this.#igvPercentage)) {
			throw new Error("Se requiere previamente porcentaje del IGV.")
		}
		this.#unitValue = uv / (1 + this.#igvPercentage / 100)
	}

	/**
	 * @returns {number} - Taxable IGV amount.
	 */
	getTaxableIgvAmount() {
		return this.#taxableIgvAmount
	}

	/**
	 * @returns {number} - Pricing reference amount.
	 */
	getPricingReferenceAmount() {
		return this.#pricingReferenceAmount
	}

	/**
	 * @returns {number} - Tax total amount.
	 */
	getTaxTotalAmount() {
		return this.#taxTotalAmount
	}

	/**
	 * Indicate how taxes affect them or not.
	 * @param {number} xrc - Exemption reason code.
	 */
	setExemptionReasonCode(xrc) {
		this.#exemptionReasonCode = xrc
	}

	/**
	 * @returns {number} - Exemption reason code.
	 */
	getExemptionReasonCode() {
		return this.#exemptionReasonCode
	}

	/**
	 * Calculates the mounts of the item using all the item's properties so call it after setting all the item's properties.
	 */
	calcMounts() {
		//Todo esto asumiendo que el valorUnitario no tiene incluido el IGV.
		// (auxiliar) valorVenta = cantidad * valorUnitario
		this.#lineExtensionAmount = this.#quantity * this.#unitValue

		let decimalIscPercentage = 0
		let decimalIgvPercentage = 0

		// Only apply when we are including taxes
		if (this.#exemptionReasonCode < 20) {
			decimalIscPercentage = this.#iscPercentage / 100 // eg: 0.17
			decimalIgvPercentage = this.#igvPercentage / 100 // eg: 0.18
		}

		this.#pricingReferenceAmount = this.#unitValue * (1 + decimalIscPercentage) * (1 + decimalIgvPercentage)

		// valorISC = (porcentajeISC/100)×valorVenta
		this.#iscAmount = decimalIscPercentage * this.#lineExtensionAmount

		// valorIGV=(porcentajeIGV/100)×(valorVenta + valorISC)
		this.#taxableIgvAmount = this.#iscAmount + this.#lineExtensionAmount
		this.#igvAmount = this.#taxableIgvAmount * decimalIgvPercentage

		this.#taxTotalAmount = this.#iscAmount + this.#igvAmount
	}
}

export default Item;
