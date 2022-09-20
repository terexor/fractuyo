var Invoice = function(taxpayer, customer) {
	var items = Array()
	var numeration, serie
	var typeCode, orderReference

	var paymentTerms = Array()

	this.ublVersion = "2.1"
	this.customizationId = "2.0"

	var xmlDocument

	/**
	 * Format serie and number: F000-00000001
	 */
	this.getId = function() {
		if(serie == undefined || numeration == undefined) {
			throw new Error("Serie o número incompletos.")
		}
		return serie + '-' + String(numeration).padStart(8, '0')
	}

	this.addPaymentTerm = function(paymentTerm) {
		paymentTerms.push(paymentTerm)
	}

	this.setUblVersion = function(ublVersion) {
		this.ublVersion = ublVersion
	}

	this.setSerie = function(_serie) {
		if(_serie.length != 4) {
			throw new Error("Serie inconsistente")
		}
		serie = _serie
	}

	this.setNumeration = function(number) {
		if(number > 0x5F5E0FF) {
			throw new Error("Numeración supera el límite.")
		}
		numeration = number
	}

	this.setId = function(serie, numeration) {
		this.setSerie(serie)
		this.setNumeration(numeration)
	}

	this.setTypeCode = function(code) {
		typeCode = code
	}

	this.addItem = function(item) {
		items.push(item)
	}

	this.getXml = function() {
		if(xmlDocument == undefined) {
			throw new Error("XML no creado.")
		}
		return xmlDocument
	}

	this.setOrderReference = function(reference) {
		orderReference = reference
	}

	this.toXml = function() {
		//We create elements using this: xmlDocument.createElement
		xmlDocument = document.implementation.createDocument("urn:oasis:names:specification:ubl:schema:xsd:Invoice-2", "Invoice")
		xmlDocument.documentElement.setAttribute("xmlns:cac", namespaces.cac)
		xmlDocument.documentElement.setAttribute("xmlns:cbc", namespaces.cbc)
		xmlDocument.documentElement.setAttribute("xmlns:ds", namespaces.ds)
		xmlDocument.documentElement.setAttribute("xmlns:ext", namespaces.ext)

		const extUblExtensions = xmlDocument.createElementNS(namespaces.ext, "ext:UBLExtensions")
		xmlDocument.documentElement.appendChild(extUblExtensions)

		const extUblExtension = xmlDocument.createElementNS(namespaces.ext, "ext:UBLExtension")
		extUblExtensions.appendChild(extUblExtension)

		const extExtensionContent = xmlDocument.createElementNS(namespaces.ext, "ext:ExtensionContent")
		extUblExtension.appendChild(extExtensionContent)

		const cbcUblVersionId = xmlDocument.createElementNS(namespaces.cbc, "cbc:UBLVersionID")
		cbcUblVersionId.appendChild( document.createTextNode(this.ublVersion) )
		xmlDocument.documentElement.appendChild(cbcUblVersionId)

		const cbcCustomizationId = xmlDocument.createElementNS(namespaces.cbc, "cbc:CustomizationID")
		cbcCustomizationId.appendChild( document.createTextNode(this.customizationId) )
		xmlDocument.documentElement.appendChild(cbcCustomizationId)

		const cbcId = xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
		cbcId.appendChild( document.createTextNode(this.getId()) )
		xmlDocument.documentElement.appendChild(cbcId)

		const cbcInvoiceTypeCode = xmlDocument.createElementNS(namespaces.cbc, "cbc:InvoiceTypeCode")
		cbcInvoiceTypeCode.setAttribute("listID", "0101")
		cbcInvoiceTypeCode.appendChild( document.createTextNode(typeCode) )
		xmlDocument.documentElement.appendChild(cbcInvoiceTypeCode)

		if(orderReference) {
			const cacOrderReference = xmlDocument.createElementNS(namespaces.cac, "cac:OrderReference")
			xmlDocument.documentElement.appendChild(cacOrderReference)

			const cbcId = xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
			cbcId.appendChild( document.createTextNode(orderReference) )
			cacOrderReference.appendChild(cbcId)
		}

		{ //Signer data
			const cacSignature = xmlDocument.createElementNS(namespaces.cbc, "cac:Signature")
			xmlDocument.documentElement.appendChild(cacSignature)

			const cbcId = xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
			cbcId.appendChild( document.createTextNode(taxpayer.getRuc()) )
			cacSignature.appendChild(cbcId)

			{
				const cacSignatoreParty = xmlDocument.createElementNS(namespaces.cac, "cac:SignatoreParty")
				cacSignature.appendChild(cacSignatoreParty)

				const cacPartyIdentification = xmlDocument.createElementNS(namespaces.cac, "cac:PartyIdentification")
				cacSignatoreParty.appendChild(cacPartyIdentification)

				const cbcId = xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
				cbcId.appendChild( document.createTextNode(taxpayer.getRuc()) )
				cacPartyIdentification.appendChild(cbcId)

				const cacPartyName = xmlDocument.createElementNS(namespaces.cac, "cac:PartyName")
				cacSignatoreParty.appendChild(cacPartyName)

				const cbcName = xmlDocument.createElementNS(namespaces.cbc, "cbc:Name")
				cbcName.appendChild( document.createTextNode(taxpayer.getName(true)) )
				cacPartyName.appendChild(cbcName)
			}
		}
		{ //Supplier (current taxpayer)
			const cacAccountingSupplierParty = xmlDocument.createElementNS(namespaces.cbc, "cac:AccountingSupplierParty")
			xmlDocument.documentElement.appendChild(cacAccountingSupplierParty)

			const cacParty = xmlDocument.createElementNS(namespaces.cbc, "cac:Party")
			cacAccountingSupplierParty.appendChild(cacParty)

			const cacPartyIdentification = xmlDocument.createElementNS(namespaces.cbc, "cac:PartyIdentification")
			cacParty.appendChild(cacPartyIdentification)

			const cbcId = xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
			cbcId.setAttribute("schemeID", "6")
			cbcId.setAttribute("schemeName", "PE:SUNAT")
			cbcId.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06")
			cbcId.appendChild( document.createTextNode(taxpayer.getRuc()) )
			cacPartyIdentification.appendChild(cbcId)

			const cacPartyName = xmlDocument.createElementNS(namespaces.cbc, "cac:PartyName")
			cacParty.appendChild(cacPartyName)
		}
		{ //Customer
			const cacAccountingCustomerParty = xmlDocument.createElementNS(namespaces.cbc, "cac:AccountingCustomerParty")
			xmlDocument.documentElement.appendChild(cacAccountingCustomerParty)

			const cacParty = xmlDocument.createElementNS(namespaces.cbc, "cac:Party")
			cacAccountingCustomerParty.appendChild(cacParty)

			const cacPartyIdentification = xmlDocument.createElementNS(namespaces.cbc, "cac:PartyIdentification")
			cacParty.appendChild(cacPartyIdentification)

			const cbcId = xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
			cbcId.setAttribute("schemeID", "6")
			cbcId.setAttribute("schemeName", "PE:SUNAT")
			cbcId.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06")
			cbcId.appendChild( document.createTextNode(customer.getRuc()) )
			cacPartyIdentification.appendChild(cbcId)

			const cacPartyLegalEntity = xmlDocument.createElementNS(namespaces.cbc, "cac:PartyIdentification")
			cacParty.appendChild(cacPartyLegalEntity)

			const cbcRegistrationName = xmlDocument.createElementNS(namespaces.cbc, "cbc:RegistrationName")
			cbcRegistrationName.appendChild( document.createTextNode(customer.getName(true)) )
			cacPartyLegalEntity.appendChild(cbcRegistrationName)

			const cacRegistrationAddress = xmlDocument.createElementNS(namespaces.cbc, "cac:RegistrationAddress")
			cacPartyLegalEntity.appendChild(cacRegistrationAddress)

			const cacAddressLine = xmlDocument.createElementNS(namespaces.cac, "cac:AddressLine")
			cacRegistrationAddress.appendChild(cacAddressLine)

			const cbcLine = xmlDocument.createElementNS(namespaces.cac, "cbc:Line")
			cbcLine.appendChild( document.createTextNode(customer.getAddress(true)) )
			cacRegistrationAddress.appendChild(cbcLine)
		}

		for(const item in items) { //Items
			const cacInvoiceLine = xmlDocument.createElementNS(namespaces.cac, "cac:InvoiceLine")
			xmlDocument.documentElement.appendChild(cacInvoiceLine)

			const cbcID = xmlDocument.createElementNS(namespaces.cac, "cbc:ID")
			cbcID.appendChild( document.createTextNode(item + 1) )
			cacInvoiceLine.appendChild(cbcID)

			const cbcInvoicedQuantity = xmlDocument.createElementNS(namespaces.cac, "cbc:InvoicedQuantity")
			cbcInvoicedQuantity.setAttribute("unitCode", items[item].getUnitCode())
			cbcInvoicedQuantity.setAttribute("unitCodeListID", "UN/ECE rec 20")
			cbcInvoicedQuantity.setAttribute("unitCodeListAgencyName", "United Nations Economic Commission for Europe")
			cbcInvoicedQuantity.appendChild( document.createTextNode(items[item].getQuantity()) )
			cacInvoiceLine.appendChild(cbcInvoicedQuantity)

			const cbcLineExtensionAmount  = xmlDocument.createElementNS(namespaces.cac, "cbc:LineExtensionAmount")
			cbcLineExtensionAmount.setAttribute("currencyID", items[item].getCurrencyId())
			cbcLineExtensionAmount.appendChild( document.createTextNode(items[item].getAmount()) )
			cacInvoiceLine.appendChild(cbcLineExtensionAmount)
		}
	}

	this.sign = async function(algorithmName, isEnveloped = true, hashAlgorithm = "SHA-256", canonMethod = "c14n") {
		if(xmlDocument == undefined) {
			throw new Error("Documento XML no existe.")
		}
		const alg = getAlgorithm(algorithmName)

		// Read cert
		const certDer = pem2der(taxpayer.getCert())

		// Read key
		const keyDer = pem2der(taxpayer.getKey())
		const key = await window.crypto.subtle.importKey("pkcs8", keyDer, alg, true, ["sign"])

		const x509 = preparePem(taxpayer.getCert())

		const transforms = []
		if(isEnveloped) {
			transforms.push("enveloped")
		}
		transforms.push(canonMethod)

		return Promise.resolve()
			.then(function () {
				const signature = new XAdES.SignedXml()

				return signature.Sign(
					alg,        // algorithm
					key,        // key
					xmlDocument,// document
					{           // options
						references: [
							{ uri: "", hash: hashAlgorithm, transforms: transforms }
						],
						x509: [x509],
						//~ signerRole: { claimed: ["BOSS"] },
						signingCertificate: x509
					}
				)
			})
			.then(function(signature) {
				// Add signature to document
				const xmlEl = xmlDocument.getElementsByTagNameNS("urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2", "ExtensionContent")[0]
				xmlEl.appendChild(signature.GetXml())
				return true
			})
			.catch(function (e) {
				console.error(e)
				return false
			})
	}
}

var PaymentTerm = function() {
}

var Item = function(_description) {
	var description
	var quantity
	var unitCode
	var currencyId
	var igvPercentage, iscPercentage

	this.getDescription = function() {
		return `<![CDATA[ ${description} ]]>`
	}

	this.setDescription = function(d) {
		if( ( typeof d === "string" || d instanceof String ) && d.length > 0 ) {
			description = d
			return
		}
		throw new Error("No hay descripción válida.")
	}

	this.getQuantity = function() {
		return quantity.toFixed(2)
	}

	this.setQuantity = function(q) {
		quantity = parseFloat(q)
		if(isNaN(quantity)) {
			throw new Error("Cantidad no es un número.")
		}
	}

	this.getAmount = function() {
		return
	}

	/**
	 * According roll 03.
	 */
	this.setUnitCode = function(uc) {
	}

	this.getUnitCode = function() {
		return unitCode
	}

	this.getCurrencyId = function() {
		return currencyId
	}

	this.setIscPercentage = function(ip) {
		iscPercentage = ip
	}

	this.setIgvPercentage = function(ip) {
		igvPercentage = ip
	}

	this.calcMounts = function() {
	}

	this.getTaxTotal = function() {
		return
	}

	this.setDescription(_description)
}
