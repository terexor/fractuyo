import Receipt from "../Receipt.js"

class NodesGenerator {
	static generateHeader(invoice) {
		const cbcUblVersionId = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:UBLVersionID")
		cbcUblVersionId.textContent = invoice.getUblVersion()
		invoice.xmlDocument.documentElement.appendChild(cbcUblVersionId)

		const cbcCustomizationId = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:CustomizationID")
		cbcCustomizationId.textContent = invoice.getCustomizationId()
		invoice.xmlDocument.documentElement.appendChild(cbcCustomizationId)
	}

	static generateIdentity(invoice) {
		const cbcId = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
		cbcId.textContent = invoice.getId()
		invoice.xmlDocument.documentElement.appendChild(cbcId)
	}

	static generateDates(invoice) {
		const cbcIssueDate = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:IssueDate")
		cbcIssueDate.textContent = Receipt.displayDate(invoice.getIssueDate())
		invoice.xmlDocument.documentElement.appendChild(cbcIssueDate)

		const cbcIssueTime = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:IssueTime")
		cbcIssueTime.textContent = Receipt.displayTime(invoice.getIssueDate())
		invoice.xmlDocument.documentElement.appendChild(cbcIssueTime)

		if (invoice.getTypeCode() == 1 && invoice.getDueDate() && invoice.getShares().length == 0) {
			const cbcDueDate = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:DueDate")
			cbcDueDate.textContent = Receipt.displayDate(invoice.getDueDate())
			invoice.xmlDocument.documentElement.appendChild(cbcDueDate)
		}
	}

	static generateTypeCode(invoice) {
		const cbcInvoiceTypeCode = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, `cac:${invoice.name}TypeCode`)
		cbcInvoiceTypeCode.textContent = invoice.getTypeCode(true)
		invoice.xmlDocument.documentElement.appendChild(cbcInvoiceTypeCode)

		if (!(invoice.getTypeCode() == 1 || invoice.getTypeCode() == 3)) {
			return
		}

		if (invoice.getDetractionAmount()) {
			cbcInvoiceTypeCode.setAttribute("listID", "1001")
		}
		else {
			cbcInvoiceTypeCode.setAttribute("listID", "0101")
		}
	}

	static generateNotes(invoice) {
		const cbcNote = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Note")

		if (invoice.getTypeCode() == 9 || invoice.getTypeCode() == 31) {
			if (!invoice.getNote()) { // if empty
				return
			}

			cbcNote.appendChild( invoice.xmlDocument.createCDATASection(invoice.getNote()) )
			invoice.xmlDocument.documentElement.appendChild(cbcNote)
			return
		}

		cbcNote.setAttribute("languageLocaleID", "1000")
		cbcNote.appendChild( invoice.xmlDocument.createCDATASection(Receipt.amountToWords(invoice.taxInclusiveAmount, "con", invoice.getCurrencyId())) )
		invoice.xmlDocument.documentElement.appendChild(cbcNote)

		if ((invoice.getTypeCode() == 1 || invoice.getTypeCode() == 3) && invoice.getDetractionAmount()) {
			const cbcNote = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Note")
			cbcNote.setAttribute("languageLocaleID", "2006")
			cbcNote.appendChild( invoice.xmlDocument.createCDATASection("Operación sujeta a detracción") )
			invoice.xmlDocument.documentElement.appendChild(cbcNote)
		}
	}

	static generateCurrencyCode(invoice) {
		const cbcDocumentCurrencyCode = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:DocumentCurrencyCode")
		cbcDocumentCurrencyCode.textContent = invoice.getCurrencyId()
		invoice.xmlDocument.documentElement.appendChild(cbcDocumentCurrencyCode)
	}

	static generateReference(invoice) {
		if ((invoice.getTypeCode() == 1 || invoice.getTypeCode() == 3) && invoice.getOrderReference()) { // for invoice
			const cacOrderReference = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:OrderReference")
			invoice.xmlDocument.documentElement.appendChild(cacOrderReference)

			{
				const cbcId = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
				cbcId.textContent = invoice.getOrderReference()
				cacOrderReference.appendChild(cbcId)
			}

			if (invoice.getOrderReferenceText()) {
				const cbcCustomerReference = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:CustomerReference")
				cbcCustomerReference.appendChild( invoice.xmlDocument.createCDATASection(invoice.getOrderReferenceText()) )
				cacOrderReference.appendChild(cbcCustomerReference)
			}

			return
		}

		if ((invoice.getTypeCode() == 7 || invoice.getTypeCode() == 8)) { // for note
			const cacBillingReference = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:BillingReference")
			invoice.xmlDocument.documentElement.appendChild(cacBillingReference)
			{
				const cacInvoiceDocumentReference = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:InvoiceDocumentReference")
				cacBillingReference.appendChild(cacInvoiceDocumentReference)
				{
					const cbcID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
					cbcID.textContent = invoice.getDocumentReference()
					cacInvoiceDocumentReference.appendChild(cbcID)

					const cbcDocumentTypeCode = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:DocumentTypeCode")
					cbcDocumentTypeCode.textContent = invoice.getDocumentReferenceTypeCode(true)
					cacInvoiceDocumentReference.appendChild(cbcDocumentTypeCode)
				}
			}
		}
	}

	static generateSignature(invoice) {
		const cacSignature = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Signature")
		invoice.xmlDocument.documentElement.appendChild(cacSignature)

		const cbcId = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
		cbcId.textContent = invoice.getTaxpayer().getIdentification().getNumber()
		cacSignature.appendChild(cbcId)

		{
			const cacSignatoreParty = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:SignatoryParty")
			cacSignature.appendChild(cacSignatoreParty)

			const cacPartyIdentification = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyIdentification")
			cacSignatoreParty.appendChild(cacPartyIdentification)

			const cbcId = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
			cbcId.textContent = invoice.getTaxpayer().getIdentification().getNumber()
			cacPartyIdentification.appendChild(cbcId)

			const cacPartyName = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyName")
			cacSignatoreParty.appendChild(cacPartyName)

			const cbcName = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Name")
			cbcName.appendChild( invoice.xmlDocument.createCDATASection(invoice.getTaxpayer().getName()) )
			cacPartyName.appendChild(cbcName)
		}
		{
			const cacDigitalSignatureAttachment = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:DigitalSignatureAttachment")
			cacSignature.appendChild(cacDigitalSignatureAttachment)

			const cacExternalReference = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:ExternalReference")
			cacDigitalSignatureAttachment.appendChild(cacExternalReference)

			const cbcUri = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:URI")
			cbcUri.textContent = "#teroxoris"
			cacExternalReference.appendChild(cbcUri)
		}
	}

	static generateSupplier(invoice) { //Supplier (current taxpayer)
		// Dynamic name for that node
		const supplierNodeName = (invoice.getTypeCode() == 1 || invoice.getTypeCode() == 3 || invoice.getTypeCode() == 7 || invoice.getTypeCode() == 8) ? "cac:AccountingSupplierParty" :
			(invoice.getTypeCode() == 9 || invoice.getTypeCode() == 31) ? "cac:DespatchSupplierParty" :
			"cac:SupplierParty" // it's error

		const cacAccountingSupplierParty = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, supplierNodeName)
		invoice.xmlDocument.documentElement.appendChild(cacAccountingSupplierParty)

		const cacParty = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Party")
		cacAccountingSupplierParty.appendChild(cacParty)

		const cacPartyIdentification = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyIdentification")
		cacParty.appendChild(cacPartyIdentification)

		const cbcId = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
		cbcId.setAttribute("schemeID", invoice.getTaxpayer().getIdentification().getType())
		cbcId.setAttribute("schemeName", "Documento de Identidad")
		cbcId.setAttribute("schemeAgencyName", "PE:SUNAT")
		cbcId.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06")
		cbcId.textContent = invoice.getTaxpayer().getIdentification().getNumber()
		cacPartyIdentification.appendChild(cbcId)

		const cacPartyName = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyName")
		cacParty.appendChild(cacPartyName)

		const cbcName = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Name")
		cbcName.appendChild( invoice.xmlDocument.createCDATASection(invoice.getTaxpayer().getTradeName()) )
		cacPartyName.appendChild(cbcName)

		const cacPartyLegalEntity = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyLegalEntity")
		cacParty.appendChild(cacPartyLegalEntity)
		{
			const cbcRegistrationName = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:RegistrationName")
			cbcRegistrationName.appendChild( invoice.xmlDocument.createCDATASection(invoice.getTaxpayer().getName()) )
			cacPartyLegalEntity.appendChild(cbcRegistrationName)

			const cacRegistrationAddress = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:RegistrationAddress")
			cacPartyLegalEntity.appendChild(cacRegistrationAddress)
			{
				const cbcId = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
				cbcId.textContent = invoice.getTaxpayer().getAddress().ubigeo
				cacRegistrationAddress.appendChild(cbcId)

				const cbcAddressTypeCode = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:AddressTypeCode")
				cbcAddressTypeCode.textContent = invoice.getTaxpayer().getAddress().typecode
				cacRegistrationAddress.appendChild(cbcAddressTypeCode)

				const cbcCitySubdivisionName = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:CitySubdivisionName")
				cbcCitySubdivisionName.textContent = invoice.getTaxpayer().getAddress().urbanization
				cacRegistrationAddress.appendChild(cbcCitySubdivisionName)

				const cbcCityName = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:CityName")
				cbcCityName.textContent = invoice.getTaxpayer().getAddress().city
				cacRegistrationAddress.appendChild(cbcCityName)

				const cbcCountrySubentity = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:CountrySubentity")
				cbcCountrySubentity.textContent = invoice.getTaxpayer().getAddress().subentity
				cacRegistrationAddress.appendChild(cbcCountrySubentity)

				const cbcDistrict = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:District")
				cbcDistrict.textContent = invoice.getTaxpayer().getAddress().district
				cacRegistrationAddress.appendChild(cbcDistrict)

				const cacAddressLine = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:AddressLine")
				cacRegistrationAddress.appendChild(cacAddressLine)

				const cbcLine = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Line")
				cbcLine.appendChild( invoice.xmlDocument.createCDATASection(invoice.getTaxpayer().getAddress().line) )
				cacAddressLine.appendChild(cbcLine)

				const cacCountry = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Country")
				cacRegistrationAddress.appendChild(cacCountry)

				const cbcIdentificationCode = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:IdentificationCode")
				cbcIdentificationCode.textContent = invoice.getTaxpayer().getAddress().country
				cacCountry.appendChild(cbcIdentificationCode)
			}
		}

		if ( invoice.getTaxpayer().getWeb() || invoice.getTaxpayer().getEmail() || invoice.getTaxpayer().getTelephone() ) {
			//Contact or marketing
			const cacContact = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Contact")
			cacParty.appendChild(cacContact)
			{
				if (invoice.getTaxpayer().getTelephone()) {
					const cbcTelephone = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Telephone")
					cbcTelephone.textContent = invoice.getTaxpayer().getTelephone()
					cacContact.appendChild(cbcTelephone)
				}

				if (invoice.getTaxpayer().getEmail()) {
					const cbcElectronicMail = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ElectronicMail")
					cbcElectronicMail.textContent = invoice.getTaxpayer().getEmail()
					cacContact.appendChild(cbcElectronicMail)
				}

				if (invoice.getTaxpayer().getWeb()) {
					const cbcNote = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Note")
					cbcNote.textContent = invoice.getTaxpayer().getWeb()
					cacContact.appendChild(cbcNote)
				}
			}
		}
	}

	static generateCustomer(invoice) {
		// Dynamic name for that node
		const customerNodeName = (invoice.getTypeCode() == 1 || invoice.getTypeCode() == 3 || invoice.getTypeCode() == 7 || invoice.getTypeCode() == 8) ? "cac:AccountingCustomerParty" :
		(invoice.getTypeCode() == 9 || invoice.getTypeCode() == 31) ? "cac:DeliveryCustomerParty" :
		"cac:CustomerParty" // it's error

		const cacAccountingCustomerParty = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, customerNodeName)
		invoice.xmlDocument.documentElement.appendChild(cacAccountingCustomerParty)

		const cacParty = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Party")
		cacAccountingCustomerParty.appendChild(cacParty)

		const cacPartyIdentification = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyIdentification")
		cacParty.appendChild(cacPartyIdentification)

		const cbcId = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
		cbcId.setAttribute("schemeID", invoice.getCustomer().getIdentification().getType())
		cbcId.setAttribute("schemeName", "Documento de Identidad")
		cbcId.setAttribute("schemeAgencyName", "PE:SUNAT")
		cbcId.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06")
		cbcId.textContent = invoice.getCustomer().getIdentification().getNumber()
		cacPartyIdentification.appendChild(cbcId)

		const cacPartyLegalEntity = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyLegalEntity")
		cacParty.appendChild(cacPartyLegalEntity)

		const cbcRegistrationName = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:RegistrationName")
		cbcRegistrationName.appendChild( invoice.xmlDocument.createCDATASection(invoice.getCustomer().getName()) )
		cacPartyLegalEntity.appendChild(cbcRegistrationName)

		if(invoice.getCustomer().getAddress()) {
			const cacRegistrationAddress = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:RegistrationAddress")
			cacPartyLegalEntity.appendChild(cacRegistrationAddress)

			const cacAddressLine = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:AddressLine")
			cacRegistrationAddress.appendChild(cacAddressLine)

			const cbcLine = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Line")
			cbcLine.appendChild( invoice.xmlDocument.createCDATASection(invoice.getCustomer().getAddress().line) )
			cacAddressLine.appendChild(cbcLine)
		}
	}

	static generateShipment(despatch) {
		const cacShipment = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Shipment")
		despatch.xmlDocument.documentElement.appendChild(cacShipment)
		{
			const cbcID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
			cbcID.textContent = "SUNAT_Envio"
			cacShipment.appendChild(cbcID)

			const cbcHandlingCode = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:HandlingCode")
			cbcHandlingCode.setAttribute("listAgencyName", "PE:SUNAT")
			cbcHandlingCode.setAttribute("listName", "Motivo de traslado")
			cbcHandlingCode.setAttribute("listURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo20")
			cbcHandlingCode.textContent = despatch.getHandlingCode(true) // Must be variable
			cacShipment.appendChild(cbcHandlingCode)

			const cbcGrossWeightMeasure = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:GrossWeightMeasure")
			cbcGrossWeightMeasure.setAttribute("unitCode", despatch.getUnitCode())
			cbcGrossWeightMeasure.textContent = despatch.getWeight()
			cacShipment.appendChild(cbcGrossWeightMeasure)

			if (!despatch.getCarrier() && despatch.inLightVehicle()) { // we are sending in own light vehicle
				const cbcSpecialInstructions = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:SpecialInstructions")
				cbcSpecialInstructions.textContent = "SUNAT_Envio_IndicadorTrasladoVehiculoM1L"
				cacShipment.appendChild(cbcSpecialInstructions)
			}

			const cacShipmentStage = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:ShipmentStage")
			cacShipment.appendChild(cacShipmentStage)
			{
				const cbcTransportModeCode = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TransportModeCode")
				cbcTransportModeCode.setAttribute("listName", "Modalidad de traslado")
				cbcTransportModeCode.setAttribute("listAgencyName", "PE:SUNAT")
				cbcTransportModeCode.setAttribute("listURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo18")
				cbcTransportModeCode.textContent = !despatch.getCarrier() ? "02" : "01"
				cacShipmentStage.appendChild(cbcTransportModeCode)

				const cacTransitPeriod = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TransitPeriod")
				cacShipmentStage.appendChild(cacTransitPeriod)
				{
					const cbcStartDate = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:StartDate")
					cbcStartDate.textContent = Receipt.displayDate(despatch.getStartDate())
					cacTransitPeriod.appendChild(cbcStartDate)
				}

				if (despatch.getCarrier()) {
					const cacCarrierParty = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:CarrierParty")
					cacShipmentStage.appendChild(cacCarrierParty)
					{
						const cacPartyIdentification = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyIdentification")
						cacCarrierParty.appendChild(cacPartyIdentification)
						{
							const cbcID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
							cbcID.setAttribute("schemeID", "6")
							cbcID.textContent = despatch.getCarrier().getIdentification().getNumber()
							cacPartyIdentification.appendChild(cbcID)
						}

						const cacPartyLegalEntity = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PartyLegalEntity")
						cacCarrierParty.appendChild(cacPartyLegalEntity)
						{
							const cbcRegistrationName = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:RegistrationName")
							cbcRegistrationName.appendChild( despatch.xmlDocument.createCDATASection(despatch.getCarrier().getName()) )
							cacPartyLegalEntity.appendChild(cbcRegistrationName)
						}
					}
				}

				if (despatch.getDrivers().length > 0) {
					let driverIndex = 0
					for (const driver of despatch.getDrivers()) {
						const cacDriverPerson = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:DriverPerson")
						cacShipmentStage.appendChild(cacDriverPerson)
						{
							const cbcID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
							cbcID.setAttribute("schemeID", driver.getIdentification().getType())
							cbcID.setAttribute("schemeName", "Documento de Identidad")
							cbcID.setAttribute("schemeAgencyName", "PE:SUNAT")
							cbcID.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06")
							cbcID.textContent = driver.getIdentification().getNumber()
							cacDriverPerson.appendChild(cbcID)

							const cbcFirstName = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:FirstName")
							cbcFirstName.textContent = driver.getName()
							cacDriverPerson.appendChild(cbcFirstName)

							const cbcFamilyName = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:FamilyName")
							cbcFamilyName.textContent = driver.getFamilyName()
							cacDriverPerson.appendChild(cbcFamilyName)

							const cbcJobTitle = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:JobTitle")
							cbcJobTitle.textContent = driverIndex++ == 0 ? "Principal" : "Secundario"
							cacDriverPerson.appendChild(cbcJobTitle)

							const cacIdentityDocumentReference = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cbc:IdentityDocumentReference")
							cacDriverPerson.appendChild(cacIdentityDocumentReference)
							{
								const cbcID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
								cbcID.textContent = driver.getLicense()
								cacIdentityDocumentReference.appendChild(cbcID)
							}
						}
					}
				}
			}

			const cacDelivery = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Delivery")
			cacShipment.appendChild(cacDelivery)
			{
				const cacDeliveryAddress = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:DeliveryAddress")
				cacDelivery.appendChild(cacDeliveryAddress)
				{
					const cbcID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
					cbcID.setAttribute("schemeAgencyName", "PE:INEI")
					cbcID.setAttribute("schemeName", "Ubigeos")
					cbcID.textContent = despatch.getDeliveryAddress().ubigeo
					cacDeliveryAddress.appendChild(cbcID)

					const cacAddressLine = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:AddressLine")
					cacDeliveryAddress.appendChild(cacAddressLine)
					{
						const cbcLine = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Line")
						cbcLine.textContent = despatch.getDeliveryAddress().line
						cacAddressLine.appendChild(cbcLine)
					}
				}

				const cacDespatch = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Despatch")
				cacDelivery.appendChild(cacDespatch)
				{
					const cacDespatchAddress = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:DespatchAddress")
					cacDespatch.appendChild(cacDespatchAddress)
					{
						const cbcID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
						cbcID.setAttribute("schemeAgencyName", "PE:INEI")
						cbcID.setAttribute("schemeName", "Ubigeos")
						cbcID.textContent = despatch.getDespatchAddress().ubigeo
						cacDespatchAddress.appendChild(cbcID)

						const cacAddressLine = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:AddressLine")
						cacDespatchAddress.appendChild(cacAddressLine)
						{
							const cbcLine = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Line")
							cbcLine.textContent = despatch.getDespatchAddress().line
							cacAddressLine.appendChild(cbcLine)
						}
					}
				}
			}

			let containerIndex = 0
			for (const container of despatch.getPackages()) {
				const cacTransportHandlingUnit = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TransportHandlingUnit")
				cacShipment.appendChild(cacTransportHandlingUnit)
				{
					const cacPackage = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Package")
					cacTransportHandlingUnit.appendChild(cacPackage)
					{
						const cbcID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
						cbcID.textContent = ++packageIndex
						cacPackage.appendChild(cbcID)

						const cbcTraceID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TraceID")
						cbcTraceID.textContent = container.traceIdentity
						cacPackage.appendChild(cbcTraceID)
					}
				}
			}

			if (despatch.getVehicles().length > 0) {
				const cacTransportHandlingUnit = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TransportHandlingUnit")
				cacShipment.appendChild(cacTransportHandlingUnit)
				{
					const cacTransportEquipment = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TransportEquipment")
					cacTransportHandlingUnit.appendChild(cacTransportEquipment)
					{
						const cbcID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
						cbcID.textContent = despatch.getVehicles()[0].identity
						cacTransportEquipment.appendChild(cbcID)

						if (despatch.getVehicles()[0].registrationIdentity) {
							const cacApplicableTransportMeans = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:ApplicableTransportMeans")
							cacTransportEquipment.appendChild(cacApplicableTransportMeans)
							{
								const cbcRegistrationNationalityID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:RegistrationNationalityID")
								cbcRegistrationNationalityID.textContent = despatch.getVehicles()[0].registrationIdentity
								cacApplicableTransportMeans.appendChild(cbcRegistrationNationalityID)
							}
						}

						// More vehicles
						if (despatch.getVehicles().length > 1) {
							let index = 0
							for (const vehicle of despatch.getVehicles()) {
								if (index == 0) { // We need to iterate secondary vehicles
									++index
									continue
								}

								const cacAttachedTransportEquipment = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:AttachedTransportEquipment")
								cacTransportEquipment.appendChild(cacAttachedTransportEquipment)
								{
									const cbcID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
									cbcID.textContent = vehicle.identity
									cacAttachedTransportEquipment.appendChild(cbcID)

									if (vehicle.registrationIdentity) {
										const cacApplicableTransportMeans = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:ApplicableTransportMeans")
										cacAttachedTransportEquipment.appendChild(cacApplicableTransportMeans)
										{
											const cbcRegistrationNationalityID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:RegistrationNationalityID")
											cbcRegistrationNationalityID.textContent = vehicle.registrationIdentity
											cacApplicableTransportMeans.appendChild(cbcRegistrationNationalityID)
										}
									}

									if (vehicle.authorization) {
										const cacShipmentDocumentReference = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:ShipmentDocumentReference")
										cacAttachedTransportEquipment.appendChild(cacShipmentDocumentReference)
										{
											const cbcID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
											cbcID.setAttribute("schemeID", vehicle.departmentCode)
											cbcID.textContent = vehicle.authorization
											cacShipmentDocumentReference.appendChild(cbcID)
										}
									}
								}
							}
						}

						if (despatch.getVehicles()[0].authorization) {
							const cacShipmentDocumentReference = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:ShipmentDocumentReference")
							cacTransportEquipment.appendChild(cacShipmentDocumentReference)
							{
								const cbcID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
								cbcID.setAttribute("schemeID", despatch.getVehicles()[0].departmentCode)
								cbcID.textContent = despatch.getVehicles()[0].authorization
								cacShipmentDocumentReference.appendChild(cbcID)
							}
						}
					}
				}
			}

			if (despatch.getPort()) {
				const cacFirstArrivalPortLocation = despatch.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:FirstArrivalPortLocation")
				cacShipment.appendChild(cacFirstArrivalPortLocation)
				{
					const cbcID = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
					cbcID.setAttribute("schemeAgencyName", "PE:SUNAT")
					cbcID.setAttribute("schemeName", despatch.getPort().type ? "Puertos" : "Aeropuertos")
					cbcID.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo" + (despatch.getPort().type ? "63" : "64"))
					cbcID.textContent = despatch.getPort().identity
					cacFirstArrivalPortLocation.appendChild(cbcID)

					const cbcLocationTypeCode = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:LocationTypeCode")
					cbcLocationTypeCode.textContent = despatch.getPort().name.type ? "1" : "2"
					cacFirstArrivalPortLocation.appendChild(cbcLocationTypeCode)

					const cbcName = despatch.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Name")
					cbcName.textContent = despatch.getPort().name
					cacFirstArrivalPortLocation.appendChild(cbcName)
				}
			}
		}
	}

	static generatePaymentMeans(invoice) {
		if (invoice.getDetractionAmount()) {
			const cacPaymentMeans = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PaymentMeans")
			invoice.xmlDocument.documentElement.appendChild(cacPaymentMeans)
			{
				const cbcID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
				cbcID.textContent = "Detraccion"
				cacPaymentMeans.appendChild(cbcID)

				const cbcPaymentMeansCode = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PaymentMeansCode")
				cbcPaymentMeansCode.textContent = "003"
				cacPaymentMeans.appendChild(cbcPaymentMeansCode)

				const cacPayeeFinancialAccount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PayeeFinancialAccount")
				cacPaymentMeans.appendChild(cacPayeeFinancialAccount)
				{
					const cbcID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
					cbcID.textContent = invoice.getTaxpayer().getDeductionsAccount()
					cacPayeeFinancialAccount.appendChild(cbcID)
				}
			}

			const cacPaymentTerms = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PaymentTerms")
			invoice.xmlDocument.documentElement.appendChild(cacPaymentTerms)
			{
				const cbcID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
				cbcID.textContent = "Detraccion"
				cacPaymentTerms.appendChild(cbcID)

				const cbcPaymentMeansID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PaymentMeansID")
				cbcPaymentMeansID.textContent = "037"
				cacPaymentTerms.appendChild(cbcPaymentMeansID)

				const cbcPaymentPercent = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PaymentPercent")
				cbcPaymentPercent.textContent = "12" //Must be variable
				cacPaymentTerms.appendChild(cbcPaymentPercent)

				const cbcAmount  = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Amount")
				cbcAmount.setAttribute("currencyID", invoice.getCurrencyId())
				cbcAmount.textContent = invoice.getDetractionAmount().toFixed(2) //Must be variable
				cacPaymentTerms.appendChild(cbcAmount)
			}
		}
	}

	static generatePaymentTerms(invoice) {
		if (invoice.getShares().length == 0) { //Cash Payment
			const cacPaymentTerms = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PaymentTerms")
			invoice.xmlDocument.documentElement.appendChild(cacPaymentTerms)
			{
				const cbcID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
				cbcID.textContent = "FormaPago"
				cacPaymentTerms.appendChild(cbcID)

				const cbcPaymentMeansID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PaymentMeansID")
				cbcPaymentMeansID.textContent = "Contado"
				cacPaymentTerms.appendChild(cbcPaymentMeansID)
			}

			return
		}

		//Credit payment
		const cacPaymentTerms = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PaymentTerms")
		invoice.xmlDocument.documentElement.appendChild(cacPaymentTerms)
		{
			const cbcID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
			cbcID.textContent = "FormaPago"
			cacPaymentTerms.appendChild(cbcID)

			const cbcPaymentMeansID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PaymentMeansID")
			cbcPaymentMeansID.textContent = "Credito"
			cacPaymentTerms.appendChild(cbcPaymentMeansID)

			const cbcAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Amount")
			cbcAmount.setAttribute("currencyID", invoice.getCurrencyId())
			if (invoice.getDetractionAmount()) {
				cbcAmount.textContent = (invoice.taxInclusiveAmount - (invoice.getDetractionAmount())).toFixed(2)
			}
			else {
				cbcAmount.textContent = invoice.taxInclusiveAmount.toFixed(2)
			}
			cacPaymentTerms.appendChild(cbcAmount)
		}

		let c = 0
		for (const share of invoice.getShares()) {
			const cacPaymentTerms = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PaymentTerms")
			invoice.xmlDocument.documentElement.appendChild(cacPaymentTerms)
			{
				const cbcID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
				cbcID.textContent = "FormaPago"
				cacPaymentTerms.appendChild(cbcID)

				const cbcPaymentMeansID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PaymentMeansID")
				cbcPaymentMeansID.textContent = "Cuota" + String(++c).padStart(3, '0')
				cacPaymentTerms.appendChild(cbcPaymentMeansID)

				const cbcAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Amount")
				cbcAmount.setAttribute("currencyID", invoice.getCurrencyId())
				cbcAmount.textContent = share.getAmount(true)
				cacPaymentTerms.appendChild(cbcAmount)

				const cbcPaymentDueDate = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PaymentDueDate")
				cbcPaymentDueDate.textContent = Receipt.displayDate(share.getDueDate())
				cacPaymentTerms.appendChild(cbcPaymentDueDate)
			}
		}
	}

	static generateCharge(invoice) {
		if (invoice.getDiscount()) {
			const cacAllowanceCharge = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:AllowanceCharge")
			invoice.xmlDocument.documentElement.appendChild(cacAllowanceCharge)
			{
				const cbcChargeIndicator = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ChargeIndicator")
				cbcChargeIndicator.textContent = invoice.getDiscount().indicator
				cacAllowanceCharge.appendChild(cbcChargeIndicator)

				const cbcAllowanceChargeReasonCode = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:AllowanceChargeReasonCode")
				cbcAllowanceChargeReasonCode.textContent = invoice.getDiscount().getTypeCode()
				cacAllowanceCharge.appendChild(cbcAllowanceChargeReasonCode)

				const cbcMultiplierFactorNumeric = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:MultiplierFactorNumeric")
				cbcMultiplierFactorNumeric.textContent = invoice.getDiscount().factor.toFixed(5)
				cacAllowanceCharge.appendChild(cbcMultiplierFactorNumeric)

				const cbcAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Amount")
				cbcAmount.setAttribute("currencyID", invoice.getCurrencyId())
				cbcAmount.textContent = invoice.getDiscount().amount.toFixed(2)
				cacAllowanceCharge.appendChild(cbcAmount)

				const cbcBaseAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:BaseAmount")
				cbcBaseAmount.setAttribute("currencyID", invoice.getCurrencyId())
				cbcBaseAmount.textContent = invoice.getDiscount().baseAmount.toFixed(2)
				cacAllowanceCharge.appendChild(cbcBaseAmount)
			}
		}
	}

	static generateTaxes(invoice) {
		const cacTaxTotal = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TaxTotal")
		invoice.xmlDocument.documentElement.appendChild(cacTaxTotal)
		{
			const cbcTaxAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TaxAmount")
			cbcTaxAmount.setAttribute("currencyID", invoice.getCurrencyId())
			cbcTaxAmount.textContent = invoice.taxTotalAmount.toFixed(2)
			cacTaxTotal.appendChild(cbcTaxAmount)

			const cacTaxSubtotal = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TaxSubtotal")
			cacTaxTotal.appendChild(cacTaxSubtotal)
			{
				const cbcTaxableAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TaxableAmount")
				cbcTaxableAmount.setAttribute("currencyID", invoice.getCurrencyId())
				cbcTaxableAmount.textContent = invoice.getOperationAmount(0).toFixed(2)
				cacTaxSubtotal.appendChild( cbcTaxableAmount )

				const cbcTaxAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TaxAmount")
				cbcTaxAmount.setAttribute("currencyID", invoice.getCurrencyId())
				cbcTaxAmount.textContent = invoice.igvAmount.toFixed(2)
				cacTaxSubtotal.appendChild(cbcTaxAmount)

				const cacTaxCategory = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TaxCategory")
				cacTaxSubtotal.appendChild(cacTaxCategory)
				{
					const cacTaxScheme = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TaxScheme")
					cacTaxCategory.appendChild(cacTaxScheme)
					{
						const cbcID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
						cbcID.setAttribute("schemeName", "Codigo de tributos")
						cbcID.setAttribute("schemeAgencyName", "PE:SUNAT")
						cbcID.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05")
						cbcID.textContent = "1000"
						cacTaxScheme.appendChild(cbcID)

						const cbcName = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Name")
						cbcName.textContent = "IGV"
						cacTaxScheme.appendChild(cbcName)

						const cbcTaxTypeCode = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TaxTypeCode")
						cbcTaxTypeCode.textContent = "VAT"
						cacTaxScheme.appendChild(cbcTaxTypeCode)
					}
				}
			}
		}
	}

	static generateTotal(invoice) {
		const cacLegalMonetaryTotal = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:LegalMonetaryTotal")
		invoice.xmlDocument.documentElement.appendChild(cacLegalMonetaryTotal)
		{
			const cbcLineExtensionAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:LineExtensionAmount")
			cbcLineExtensionAmount.setAttribute("currencyID", invoice.getCurrencyId())
			cbcLineExtensionAmount.textContent = invoice.lineExtensionAmount.toFixed(2)
			cacLegalMonetaryTotal.appendChild(cbcLineExtensionAmount)

			const cbcTaxInclusiveAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TaxInclusiveAmount")
			cbcTaxInclusiveAmount.setAttribute("currencyID", invoice.getCurrencyId())
			cbcTaxInclusiveAmount.textContent = invoice.taxInclusiveAmount.toFixed(2)
			cacLegalMonetaryTotal.appendChild(cbcTaxInclusiveAmount)

			const cbcPayableAmount  = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PayableAmount")
			cbcPayableAmount.setAttribute("currencyID", invoice.getCurrencyId())
			cbcPayableAmount.textContent = invoice.taxInclusiveAmount.toFixed(2)
			cacLegalMonetaryTotal.appendChild(cbcPayableAmount)
		}
	}

	static generateLines(invoice) {
		let itemIndex = 0 // for ID
		for(const item of invoice.items) { //Items
			const cacInvoiceLine = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, invoice.getTypeCode() == 9 || invoice.getTypeCode() == 31 ? "cac:DespatchLine" : `cac:${invoice.name}Line`)
			invoice.xmlDocument.documentElement.appendChild(cacInvoiceLine)

			const cbcID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
			cbcID.textContent = ++itemIndex
			cacInvoiceLine.appendChild(cbcID)

			// Dynamic name for that node
			const quantityNodeName = (invoice.getTypeCode() == 1 || invoice.getTypeCode() == 3) ? "cbc:InvoicedQuantity" :
				invoice.getTypeCode() == 7 ? "cbc:CreditedQuantity" :
				invoice.getTypeCode() == 8 ? "cbc:DebitedQuantity" :
				invoice.getTypeCode() == 9 || invoice.getTypeCode() == 31 ? "cbc:DeliveredQuantity" :
				"cbc:Quantity" // it's error

			const cbcInvoicedQuantity = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, quantityNodeName)
			cbcInvoicedQuantity.setAttribute("unitCode", item.getUnitCode())
			cbcInvoicedQuantity.setAttribute("unitCodeListID", "UN/ECE rec 20")
			cbcInvoicedQuantity.setAttribute("unitCodeListAgencyName", "United Nations Economic Commission for Europe")
			cbcInvoicedQuantity.textContent = item.getQuantity(true, 10)
			cacInvoiceLine.appendChild(cbcInvoicedQuantity)

			if ( (invoice.getTypeCode() == 9 || invoice.getTypeCode() == 31)) {
				const cacOrderLineReference = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:OrderLineReference")
				cacInvoiceLine.appendChild(cacOrderLineReference)

				const cbcLineID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:LineID")
				cbcLineID.textContent = itemIndex // TODO: check if is incoming this data for using that value
				cacOrderLineReference.appendChild(cbcLineID)
			}
			else {
				const cbcLineExtensionAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:LineExtensionAmount")
				cbcLineExtensionAmount.setAttribute("currencyID", invoice.getCurrencyId())
				cbcLineExtensionAmount.textContent = item.getLineExtensionAmount(true)
				cacInvoiceLine.appendChild(cbcLineExtensionAmount)

				{ //PricingReference
					const cacPricingReference = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:PricingReference")
					cacInvoiceLine.appendChild(cacPricingReference)

					const cacAlternativeConditionPrice = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:AlternativeConditionPrice")
					cacPricingReference.appendChild(cacAlternativeConditionPrice)

					const cbcPriceAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PriceAmount")
					cbcPriceAmount.setAttribute("currencyID", invoice.getCurrencyId())
					cbcPriceAmount.textContent = item.getPricingReferenceAmount(true, 10)
					cacAlternativeConditionPrice.appendChild(cbcPriceAmount)

					const cbcPriceTypeCode = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PriceTypeCode")
					cbcPriceTypeCode.textContent = "01"
					cacAlternativeConditionPrice.appendChild(cbcPriceTypeCode)
				}

				{ //TaxTotal
					const cacTaxTotal = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TaxTotal")
					cacInvoiceLine.appendChild(cacTaxTotal)

					const cbcTaxAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TaxAmount")
					cbcTaxAmount.setAttribute("currencyID", invoice.getCurrencyId())
					cbcTaxAmount.textContent = item.getTaxTotalAmount(true)
					cacTaxTotal.appendChild(cbcTaxAmount)

					if (item.getIscAmount() > 0) { //ISC
						const cacTaxSubtotal = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TaxSubtotal")
						cacTaxTotal.appendChild(cacTaxSubtotal)

						const cbcTaxableAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TaxableAmount")
						cbcTaxableAmount.setAttribute("currencyID", invoice.getCurrencyId())
						cbcTaxableAmount.textContent = item.getLineExtensionAmount(true)
						cacTaxSubtotal.appendChild(cbcTaxableAmount)

						const cbcTaxAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TaxAmount")
						cbcTaxAmount.setAttribute("currencyID", invoice.getCurrencyId())
						cbcTaxAmount.textContent = item.getIscAmount(true)
						cacTaxSubtotal.appendChild(cbcTaxAmount)

						const cacTaxCategory = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TaxCategory")
						cacTaxSubtotal.appendChild(cacTaxCategory)
						{
							const cbcPercent = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Percent")
							cbcPercent.textContent = item.getIscPercentage()
							cacTaxCategory.appendChild(cbcPercent)

							const cbcTierRange = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TierRange")
							cbcTierRange.textContent = "01"
							cacTaxCategory.appendChild(cbcTierRange)

							const cacTaxScheme = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TaxScheme")
							cacTaxCategory.appendChild(cacTaxScheme)
							{
								const cbcID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
								cbcID.textContent = "2000"
								cacTaxScheme.appendChild(cbcID)

								const cbcName = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Name")
								cbcName.textContent = "ISC"
								cacTaxScheme.appendChild(cbcName)

								const cbcTaxTypeCode = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TaxTypeCode")
								cbcTaxTypeCode.textContent = "EXC"
								cacTaxScheme.appendChild(cbcTaxTypeCode)
							}
						}
					}
					if( item.getIgvAmount() > 0 ) { //IGV
						const cacTaxSubtotal = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TaxSubtotal")
						cacTaxTotal.appendChild(cacTaxSubtotal)

						const cbcTaxableAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TaxableAmount")
						cbcTaxableAmount.setAttribute("currencyID", invoice.getCurrencyId())
						cbcTaxableAmount.textContent = item.getTaxableIgvAmount(true)
						cacTaxSubtotal.appendChild(cbcTaxableAmount)

						const cbcTaxAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TaxAmount")
						cbcTaxAmount.setAttribute("currencyID", invoice.getCurrencyId())
						cbcTaxAmount.textContent = item.getIgvAmount(true)
						cacTaxSubtotal.appendChild(cbcTaxAmount)

						const cacTaxCategory = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TaxCategory")
						cacTaxSubtotal.appendChild(cacTaxCategory)
						{
							const cbcPercent = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Percent")
							cbcPercent.textContent = item.getIgvPercentage()
							cacTaxCategory.appendChild(cbcPercent)

							const cbcTaxExemptionReasonCode = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TaxExemptionReasonCode")
							cbcTaxExemptionReasonCode.textContent = item.getExemptionReasonCode()
							cacTaxCategory.appendChild(cbcTaxExemptionReasonCode)

							const cacTaxScheme = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:TaxScheme")
							cacTaxCategory.appendChild(cacTaxScheme)
							{
								const cbcID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
								cbcID.textContent = "1000"
								cacTaxScheme.appendChild(cbcID)

								const cbcName = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Name")
								cbcName.textContent = "IGV"
								cacTaxScheme.appendChild(cbcName)

								const cbcTaxTypeCode = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:TaxTypeCode")
								cbcTaxTypeCode.textContent = "VAT"
								cacTaxScheme.appendChild(cbcTaxTypeCode)
							}
						}
					}
				}
			}

			{ //Item
				const cacItem = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Item")
				cacInvoiceLine.appendChild(cacItem)

				const cbcDescription = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Description")
				cbcDescription.appendChild( invoice.xmlDocument.createCDATASection(item.getDescription()) )
				cacItem.appendChild(cbcDescription)

				if(item.getCode()) {
					const cacSellersItemIdentification = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:SellersItemIdentification")
					cacItem.appendChild(cacSellersItemIdentification)

					const cbcID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
					cbcID.textContent = item.getCode()
					cacSellersItemIdentification.appendChild(cbcID)
				}

				if (item.getClassificationCode()) {
					const cacCommodityClassification = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:CommodityClassification")
					cacItem.appendChild(cacCommodityClassification)

					const cbcItemClassificationCode = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ItemClassificationCode")
					cbcItemClassificationCode.setAttribute("listID", "UNSPSC")
					cbcItemClassificationCode.setAttribute("listAgencyName", "GS1 US")
					cbcItemClassificationCode.setAttribute("listName", "Item Classification")
					cbcItemClassificationCode.textContent = item.getClassificationCode()
					cacCommodityClassification.appendChild(cbcItemClassificationCode)
				}
			}

			if ( !(invoice.getTypeCode() == 9 || invoice.getTypeCode() == 31)) {
				{ //Price
					const cacPrice = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:Price")
					cacInvoiceLine.appendChild(cacPrice)

					const cbcPriceAmount = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:PriceAmount")
					cbcPriceAmount.setAttribute("currencyID", invoice.getCurrencyId())
					cbcPriceAmount.textContent = item.getUnitValue(true, 10)
					cacPrice.appendChild(cbcPriceAmount)
				}
			}
		}
	}

	static generateDiscrepancy(note) {
		const cacDiscrepancyResponse = note.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:DiscrepancyResponse")
		note.xmlDocument.documentElement.appendChild(cacDiscrepancyResponse)
		{
			const cbcReferenceID = note.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ReferenceID")
			cbcReferenceID.textContent = note.getDocumentReference()
			cacDiscrepancyResponse.appendChild(cbcReferenceID)

			const cbcResponseCode = note.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ResponseCode")
			cbcResponseCode.textContent = note.getResponseCode(true)
			cacDiscrepancyResponse.appendChild(cbcResponseCode)

			const cbcDescription = note.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:Description")
			cbcDescription.textContent = note.getDescription()
			cacDiscrepancyResponse.appendChild(cbcDescription)
		}
	}
}

export default NodesGenerator
