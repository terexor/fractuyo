import Receipt from "../Receipt.js"

class NodesGenerator {
	/**
	 * Space for appending signature.
	 */
	static generateUblExtensions(document) {
		const fragment = document.xmlDocument.createDocumentFragment()

		const extUblExtensions = document.xmlDocument.createElement("ext:UBLExtensions")

		const extUblExtension = document.xmlDocument.createElement("ext:UBLExtension")
		extUblExtensions.appendChild(extUblExtension)

		const extExtensionContent = document.xmlDocument.createElement("ext:ExtensionContent")
		extUblExtension.appendChild(extExtensionContent)

		fragment.appendChild(extUblExtensions)
		return fragment
	}

	static generateHeader(invoice) {
		const doc = invoice.xmlDocument
		// Ultra-light container
		const fragment = doc.createDocumentFragment()

		const cbcUblVersionId = doc.createElement("cbc:UBLVersionID")
		cbcUblVersionId.textContent = invoice.getUblVersion()
		fragment.appendChild(cbcUblVersionId)

		const cbcCustomizationId = doc.createElement("cbc:CustomizationID")
		cbcCustomizationId.textContent = invoice.getCustomizationId()
		fragment.appendChild(cbcCustomizationId)

		// Use this fragment and the other fragments in the same place
		return fragment
	}

	static generateIdentity(invoice) {
		const fragment = invoice.xmlDocument.createDocumentFragment()

		const cbcId = invoice.xmlDocument.createElement("cbc:ID")
		cbcId.textContent = invoice.getId()
		fragment.appendChild(cbcId)

		return fragment
	}

	static generateDates(invoice) {
		const doc = invoice.xmlDocument
		const fragment = doc.createDocumentFragment()

		// caching
		const issueDate = invoice.getIssueDate()
		const typeCode = invoice.getTypeCode()

		const cbcIssueDate = doc.createElement("cbc:IssueDate")
		cbcIssueDate.textContent = Receipt.displayDate(issueDate)
		fragment.appendChild(cbcIssueDate)

		const cbcIssueTime = doc.createElement("cbc:IssueTime")
		cbcIssueTime.textContent = Receipt.displayTime(issueDate)
		fragment.appendChild(cbcIssueTime)

		if (typeCode == 1 && invoice.getShares().length == 0) {
			// caching due date
			const dueDate = invoice.getDueDate()

			if (dueDate) {
				const cbcDueDate = doc.createElement("cbc:DueDate")
				cbcDueDate.textContent = Receipt.displayDate(dueDate)
				fragment.appendChild(cbcDueDate)
			}
		}

		return fragment
	}

	static generateTypeCode(invoice) {
		const fragment = invoice.xmlDocument.createDocumentFragment()

		const cbcInvoiceTypeCode = invoice.xmlDocument.createElement(`cbc:${invoice.name}TypeCode`)
		cbcInvoiceTypeCode.textContent = invoice.getTypeCode(true)
		fragment.appendChild(cbcInvoiceTypeCode)

		if (!(invoice.getTypeCode() == 1 || invoice.getTypeCode() == 3)) {
			return fragment
		}

		if (invoice.hasDetraction()) {
			cbcInvoiceTypeCode.setAttribute("listID", "1001")
		}
		else {
			cbcInvoiceTypeCode.setAttribute("listID", "0101")
		}

		return fragment
	}

	static generateNotes(invoice) {
		const doc = invoice.xmlDocument
		const fragment = doc.createDocumentFragment()

		const typeCode = invoice.getTypeCode()

		const cbcNote = doc.createElement("cbc:Note")

		if (typeCode == 9 || typeCode == 31) {
			if (!invoice.getNote()) { // if empty
				return fragment // it's empty
			}

			cbcNote.appendChild(doc.createCDATASection(invoice.getNote()))
			fragment.appendChild(cbcNote)
			return fragment
		}

		cbcNote.setAttribute("languageLocaleID", "1000")
		cbcNote.appendChild(doc.createCDATASection(Receipt.amountToWords(invoice.taxInclusiveAmount, "con", invoice.getCurrencyId())))
		fragment.appendChild(cbcNote)

		if ((typeCode == 1 || typeCode == 3) && invoice.hasDetraction()) {
			const cbcNote = doc.createElement("cbc:Note")
			cbcNote.setAttribute("languageLocaleID", "2006")
			cbcNote.appendChild(doc.createCDATASection("Operación sujeta a detracción"))
			fragment.appendChild(cbcNote)
		}

		return fragment
	}

	static generateCurrencyCode(invoice) {
		const fragment = invoice.xmlDocument.createDocumentFragment()

		const cbcDocumentCurrencyCode = invoice.xmlDocument.createElement("cbc:DocumentCurrencyCode")
		cbcDocumentCurrencyCode.textContent = invoice.getCurrencyId()
		fragment.appendChild(cbcDocumentCurrencyCode)

		return fragment
	}

	static generateReference(invoice) {
		const doc = invoice.xmlDocument
		const fragment = doc.createDocumentFragment()

		const typeCode = invoice.getTypeCode()

		if ((typeCode == 1 || typeCode == 3) && invoice.getOrderReference()) { // for invoice
			const cacOrderReference = doc.createElement("cac:OrderReference")
			fragment.appendChild(cacOrderReference)

			{
				const cbcId = doc.createElement("cbc:ID")
				cbcId.textContent = invoice.getOrderReference()
				cacOrderReference.appendChild(cbcId)
			}

			if (invoice.getOrderReferenceText()) {
				const cbcCustomerReference = doc.createElement("cbc:CustomerReference")
				cbcCustomerReference.appendChild(doc.createCDATASection(invoice.getOrderReferenceText()))
				cacOrderReference.appendChild(cbcCustomerReference)
			}

			return fragment
		}

		if ((typeCode == 7 || typeCode == 8)) { // for note
			const cacBillingReference = doc.createElement("cac:BillingReference")
			fragment.appendChild(cacBillingReference)
			{
				const cacInvoiceDocumentReference = doc.createElement("cac:InvoiceDocumentReference")
				cacBillingReference.appendChild(cacInvoiceDocumentReference)
				{
					const cbcID = doc.createElement("cbc:ID")
					cbcID.textContent = invoice.getDocumentReference()
					cacInvoiceDocumentReference.appendChild(cbcID)

					const cbcDocumentTypeCode = doc.createElement("cbc:DocumentTypeCode")
					cbcDocumentTypeCode.textContent = invoice.getDocumentReferenceTypeCode(true)
					cacInvoiceDocumentReference.appendChild(cbcDocumentTypeCode)
				}
			}

			return fragment
		}

		return fragment
	}

	static generateSignature(invoice) {
		const doc = invoice.xmlDocument
		const fragment = doc.createDocumentFragment()

		// caching
		const taxpayer = invoice.getTaxpayer()
		const ruc = taxpayer.getIdentification().getNumber()

		const cacSignature = doc.createElement("cac:Signature")

		const cbcId = doc.createElement("cbc:ID")
		cbcId.textContent = ruc
		cacSignature.appendChild(cbcId)

		{
			const cacSignatoreParty = doc.createElement("cac:SignatoryParty")
			cacSignature.appendChild(cacSignatoreParty)

			const cacPartyIdentification = doc.createElement("cac:PartyIdentification")
			cacSignatoreParty.appendChild(cacPartyIdentification)

			const cbcId = doc.createElement("cbc:ID")
			cbcId.textContent = ruc
			cacPartyIdentification.appendChild(cbcId)

			const cacPartyName = doc.createElement("cac:PartyName")
			cacSignatoreParty.appendChild(cacPartyName)

			const cbcName = doc.createElement("cbc:Name")
			cbcName.appendChild(doc.createCDATASection(taxpayer.getName()))
			cacPartyName.appendChild(cbcName)
		}
		{
			const cacDigitalSignatureAttachment = doc.createElement("cac:DigitalSignatureAttachment")
			cacSignature.appendChild(cacDigitalSignatureAttachment)

			const cacExternalReference = doc.createElement("cac:ExternalReference")
			cacDigitalSignatureAttachment.appendChild(cacExternalReference)

			const cbcUri = doc.createElement("cbc:URI")
			cbcUri.textContent = "#terexoris"
			cacExternalReference.appendChild(cbcUri)
		}

		fragment.appendChild(cacSignature)
		return fragment
	}

	static generateSupplier(invoice) { //Supplier (current taxpayer)
		const doc = invoice.xmlDocument
		const fragment = doc.createDocumentFragment()

		// caching
		const taxpayer = invoice.getTaxpayer()
		const address = taxpayer.getAddress()
		const identification = taxpayer.getIdentification()
		const typeCode = invoice.getTypeCode()

		// Dynamic name for that node
		const supplierNodeName = (typeCode == 1 || typeCode == 3 || typeCode == 7 || typeCode == 8) ? "cac:AccountingSupplierParty" :
			(typeCode == 9 || typeCode == 31) ? "cac:DespatchSupplierParty" :
				"cac:SupplierParty" // it's error

		const cacAccountingSupplierParty = doc.createElement(supplierNodeName)

		const cacParty = doc.createElement("cac:Party")
		cacAccountingSupplierParty.appendChild(cacParty)

		const cacPartyIdentification = doc.createElement("cac:PartyIdentification")
		cacParty.appendChild(cacPartyIdentification)

		const cbcId = doc.createElement("cbc:ID")
		cbcId.setAttribute("schemeID", identification.getType())
		cbcId.setAttribute("schemeName", "Documento de Identidad")
		cbcId.setAttribute("schemeAgencyName", "PE:SUNAT")
		cbcId.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06")
		cbcId.textContent = identification.getNumber()
		cacPartyIdentification.appendChild(cbcId)

		const cacPartyName = doc.createElement("cac:PartyName")
		cacParty.appendChild(cacPartyName)

		const cbcName = doc.createElement("cbc:Name")
		cbcName.appendChild(doc.createCDATASection(taxpayer.getTradeName()))
		cacPartyName.appendChild(cbcName)

		const cacPartyLegalEntity = doc.createElement("cac:PartyLegalEntity")
		cacParty.appendChild(cacPartyLegalEntity)
		{
			const cbcRegistrationName = doc.createElement("cbc:RegistrationName")
			cbcRegistrationName.appendChild(doc.createCDATASection(taxpayer.getName()))
			cacPartyLegalEntity.appendChild(cbcRegistrationName)

			const cacRegistrationAddress = doc.createElement("cac:RegistrationAddress")
			cacPartyLegalEntity.appendChild(cacRegistrationAddress)
			{
				const cbcId = doc.createElement("cbc:ID")
				cbcId.textContent = address.ubigeo
				cacRegistrationAddress.appendChild(cbcId)

				const cbcAddressTypeCode = doc.createElement("cbc:AddressTypeCode")
				cbcAddressTypeCode.textContent = address.typecode
				cacRegistrationAddress.appendChild(cbcAddressTypeCode)

				const cbcCitySubdivisionName = doc.createElement("cbc:CitySubdivisionName")
				cbcCitySubdivisionName.textContent = address.urbanization
				cacRegistrationAddress.appendChild(cbcCitySubdivisionName)

				const cbcCityName = doc.createElement("cbc:CityName")
				cbcCityName.textContent = address.city
				cacRegistrationAddress.appendChild(cbcCityName)

				const cbcCountrySubentity = doc.createElement("cbc:CountrySubentity")
				cbcCountrySubentity.textContent = address.subentity
				cacRegistrationAddress.appendChild(cbcCountrySubentity)

				const cbcDistrict = doc.createElement("cbc:District")
				cbcDistrict.textContent = address.district
				cacRegistrationAddress.appendChild(cbcDistrict)

				const cacAddressLine = doc.createElement("cac:AddressLine")
				cacRegistrationAddress.appendChild(cacAddressLine)

				const cbcLine = doc.createElement("cbc:Line")
				cbcLine.appendChild(doc.createCDATASection(address.line))
				cacAddressLine.appendChild(cbcLine)

				const cacCountry = doc.createElement("cac:Country")
				cacRegistrationAddress.appendChild(cacCountry)

				const cbcIdentificationCode = doc.createElement("cbc:IdentificationCode")
				cbcIdentificationCode.textContent = address.country
				cacCountry.appendChild(cbcIdentificationCode)
			}
		}

		// Contact data (conditional optimization)
		const tel = taxpayer.getTelephone()
		const email = taxpayer.getEmail()
		const web = taxpayer.getWeb()

		if (tel || email || web) {
			//Contact or marketing
			const cacContact = doc.createElement("cac:Contact")
			{
				if (tel) {
					const cbcTelephone = doc.createElement("cbc:Telephone")
					cbcTelephone.textContent = tel
					cacContact.appendChild(cbcTelephone)
				}

				if (email) {
					const cbcElectronicMail = doc.createElement("cbc:ElectronicMail")
					cbcElectronicMail.textContent = email
					cacContact.appendChild(cbcElectronicMail)
				}

				if (web) {
					const cbcNote = doc.createElement("cbc:Note")
					cbcNote.textContent = web
					cacContact.appendChild(cbcNote)
				}
			}
			cacParty.appendChild(cacContact)
		}

		fragment.appendChild(cacAccountingSupplierParty)
		return fragment
	}

	static generateCustomer(invoice) {
		const doc = invoice.xmlDocument
		const fragment = doc.createDocumentFragment()

		// caching references and default values
		const customer = invoice.getCustomer()
		const identification = customer?.getIdentification()
		const address = customer?.getAddress()
		const typeCode = invoice.getTypeCode()

		// Dynamic name for that node
		const customerNodeName = (typeCode == 1 || typeCode == 3 || typeCode == 7 || typeCode == 8) ? "cac:AccountingCustomerParty" :
			(typeCode == 9 || typeCode == 31) ? "cac:DeliveryCustomerParty" :
				"cac:CustomerParty" // it's error

		const cacAccountingCustomerParty = doc.createElement(customerNodeName)

		const cacParty = doc.createElement("cac:Party")
		cacAccountingCustomerParty.appendChild(cacParty)

		const cacPartyIdentification = doc.createElement("cac:PartyIdentification")

		const cbcId = doc.createElement("cbc:ID")
		cbcId.setAttribute("schemeID", identification?.getType() ?? "1")
		cbcId.setAttribute("schemeName", "Documento de Identidad")
		cbcId.setAttribute("schemeAgencyName", "PE:SUNAT")
		cbcId.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06")
		cbcId.textContent = identification?.getNumber() ?? "-"

		cacPartyIdentification.appendChild(cbcId)
		cacParty.appendChild(cacPartyIdentification)

		const cacPartyLegalEntity = doc.createElement("cac:PartyLegalEntity")
		cacParty.appendChild(cacPartyLegalEntity)

		const cbcRegistrationName = doc.createElement("cbc:RegistrationName")
		cbcRegistrationName.appendChild(doc.createCDATASection(customer?.getName() ?? "Nemo"))
		cacPartyLegalEntity.appendChild(cbcRegistrationName)

		if (address?.line) {
			const cacRegistrationAddress = doc.createElement("cac:RegistrationAddress")
			cacPartyLegalEntity.appendChild(cacRegistrationAddress)

			const cacAddressLine = doc.createElement("cac:AddressLine")
			cacRegistrationAddress.appendChild(cacAddressLine)

			const cbcLine = doc.createElement("cbc:Line")
			cbcLine.appendChild(doc.createCDATASection(address.line))
			cacAddressLine.appendChild(cbcLine)
		}

		fragment.appendChild(cacAccountingCustomerParty)
		return fragment
	}

	static generateShipment(despatch) {
		const doc = despatch.xmlDocument
		const fragment = doc.createDocumentFragment()

		// caching
		const carrier = despatch.getCarrier()
		const vehicles = despatch.getVehicles()
		const drivers = despatch.getDrivers()
		const containers = despatch.getPackages() // remember that package is a reserved word

		const cacShipment = doc.createElement("cac:Shipment")
		{
			const cbcID = doc.createElement("cbc:ID")
			cbcID.textContent = "SUNAT_Envio"
			cacShipment.appendChild(cbcID)

			const cbcHandlingCode = doc.createElement("cbc:HandlingCode")
			cbcHandlingCode.setAttribute("listAgencyName", "PE:SUNAT")
			cbcHandlingCode.setAttribute("listName", "Motivo de traslado")
			cbcHandlingCode.setAttribute("listURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo20")
			cbcHandlingCode.textContent = despatch.getHandlingCode(true)
			cacShipment.appendChild(cbcHandlingCode)

			const cbcGrossWeightMeasure = doc.createElement("cbc:GrossWeightMeasure")
			cbcGrossWeightMeasure.setAttribute("unitCode", despatch.getUnitCode())
			cbcGrossWeightMeasure.textContent = despatch.getWeight()
			cacShipment.appendChild(cbcGrossWeightMeasure)

			if(despatch.getUnitQuantity()) {
				const cbcTotalTransportHandlingUnitQuantity = doc.createElement("cbc:TotalTransportHandlingUnitQuantity")
				cbcTotalTransportHandlingUnitQuantity.textContent = despatch.getUnitQuantity()
				cacShipment.appendChild(cbcTotalTransportHandlingUnitQuantity)
			}

			if (!despatch.getCarrier() && despatch.inLightVehicle()) { // we are sending in own light vehicle
				const cbcSpecialInstructions = doc.createElement("cbc:SpecialInstructions")
				cbcSpecialInstructions.textContent = "SUNAT_Envio_IndicadorTrasladoVehiculoM1L"
				cacShipment.appendChild(cbcSpecialInstructions)
			}

			const cacShipmentStage = doc.createElement("cac:ShipmentStage")
			cacShipment.appendChild(cacShipmentStage)
			{
				const cbcTransportModeCode = doc.createElement("cbc:TransportModeCode")
				cbcTransportModeCode.setAttribute("listName", "Modalidad de traslado")
				cbcTransportModeCode.setAttribute("listAgencyName", "PE:SUNAT")
				cbcTransportModeCode.setAttribute("listURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo18")
				cbcTransportModeCode.textContent = !carrier ? "02" : "01"
				cacShipmentStage.appendChild(cbcTransportModeCode)

				const cacTransitPeriod = doc.createElement("cac:TransitPeriod")
				cacShipmentStage.appendChild(cacTransitPeriod)
				{
					const cbcStartDate = doc.createElement("cbc:StartDate")
					cbcStartDate.textContent = Receipt.displayDate(despatch.getStartDate())
					cacTransitPeriod.appendChild(cbcStartDate)
				}

				if (carrier) {
					const cacCarrierParty = doc.createElement("cac:CarrierParty")
					cacShipmentStage.appendChild(cacCarrierParty)
					{
						const cacPartyIdentification = doc.createElement("cac:PartyIdentification")
						cacCarrierParty.appendChild(cacPartyIdentification)
						{
							const cbcID = doc.createElement("cbc:ID")
							cbcID.setAttribute("schemeID", "6")
							cbcID.textContent = carrier.getIdentification().getNumber()
							cacPartyIdentification.appendChild(cbcID)
						}

						const cacPartyLegalEntity = doc.createElement("cac:PartyLegalEntity")
						cacCarrierParty.appendChild(cacPartyLegalEntity)
						{
							const cbcRegistrationName = doc.createElement("cbc:RegistrationName")
							cbcRegistrationName.appendChild(doc.createCDATASection(carrier.getName()))
							cacPartyLegalEntity.appendChild(cbcRegistrationName)
						}
					}
				}

				if (drivers.length > 0) {
					for (let driverIndex = 0; driverIndex < drivers.length; ++driverIndex) {
						const driver = drivers[driverIndex]
						const cacDriverPerson = doc.createElement("cac:DriverPerson")
						cacShipmentStage.appendChild(cacDriverPerson)
						{
							const cbcID = doc.createElement("cbc:ID")
							cbcID.setAttribute("schemeID", driver.getIdentification().getType())
							cbcID.setAttribute("schemeName", "Documento de Identidad")
							cbcID.setAttribute("schemeAgencyName", "PE:SUNAT")
							cbcID.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06")
							cbcID.textContent = driver.getIdentification().getNumber()
							cacDriverPerson.appendChild(cbcID)

							const cbcFirstName = doc.createElement("cbc:FirstName")
							cbcFirstName.textContent = driver.getName()
							cacDriverPerson.appendChild(cbcFirstName)

							const cbcFamilyName = doc.createElement("cbc:FamilyName")
							cbcFamilyName.textContent = driver.getFamilyName()
							cacDriverPerson.appendChild(cbcFamilyName)

							const cbcJobTitle = doc.createElement("cbc:JobTitle")
							cbcJobTitle.textContent = driverIndex == 0 ? "Principal" : "Secundario"
							cacDriverPerson.appendChild(cbcJobTitle)

							const cacIdentityDocumentReference = doc.createElement("cac:IdentityDocumentReference")
							cacDriverPerson.appendChild(cacIdentityDocumentReference)
							{
								const cbcID = doc.createElement("cbc:ID")
								cbcID.textContent = driver.getLicense()
								cacIdentityDocumentReference.appendChild(cbcID)
							}
						}
					}
				}
			}

			// cache
			const deliveryAddress = despatch.getDeliveryAddress()
			const despatchAddress = despatch.getDespatchAddress()

			const cacDelivery = doc.createElement("cac:Delivery")
			cacShipment.appendChild(cacDelivery)
			{
				const cacDeliveryAddress = doc.createElement("cac:DeliveryAddress")
				cacDelivery.appendChild(cacDeliveryAddress)
				{
					const cbcID = doc.createElement("cbc:ID")
					cbcID.setAttribute("schemeAgencyName", "PE:INEI")
					cbcID.setAttribute("schemeName", "Ubigeos")
					cbcID.textContent = deliveryAddress.ubigeo
					cacDeliveryAddress.appendChild(cbcID)

					const cacAddressLine = doc.createElement("cac:AddressLine")
					cacDeliveryAddress.appendChild(cacAddressLine)
					{
						const cbcLine = doc.createElement("cbc:Line")
						cbcLine.textContent = deliveryAddress.line
						cacAddressLine.appendChild(cbcLine)
					}
				}

				const cacDespatch = doc.createElement("cac:Despatch")
				cacDelivery.appendChild(cacDespatch)
				{
					const cacDespatchAddress = doc.createElement("cac:DespatchAddress")
					cacDespatch.appendChild(cacDespatchAddress)
					{
						const cbcID = doc.createElement("cbc:ID")
						cbcID.setAttribute("schemeAgencyName", "PE:INEI")
						cbcID.setAttribute("schemeName", "Ubigeos")
						cbcID.textContent = despatchAddress.ubigeo
						cacDespatchAddress.appendChild(cbcID)

						const cacAddressLine = doc.createElement("cac:AddressLine")
						cacDespatchAddress.appendChild(cacAddressLine)
						{
							const cbcLine = doc.createElement("cbc:Line")
							cbcLine.textContent = despatchAddress.line
							cacAddressLine.appendChild(cbcLine)
						}
					}
				}
			}

			for (let containerIndex = 0; containerIndex < containers.length; ++containerIndex) {
				const container = containers[containerIndex]
				const cacTransportHandlingUnit = doc.createElement("cac:TransportHandlingUnit")
				cacShipment.appendChild(cacTransportHandlingUnit)
				{
					const cacPackage = doc.createElement("cac:Package")
					cacTransportHandlingUnit.appendChild(cacPackage)
					{
						const cbcID = doc.createElement("cbc:ID")
						cbcID.textContent = String(containerIndex)
						cacPackage.appendChild(cbcID)

						const cbcTraceID = doc.createElement("cbc:TraceID")
						cbcTraceID.textContent = container.traceIdentity
						cacPackage.appendChild(cbcTraceID)
					}
				}
			}

			if (vehicles.length > 0) {
				const cacTransportHandlingUnit = doc.createElement("cac:TransportHandlingUnit")
				cacShipment.appendChild(cacTransportHandlingUnit)
				{
					const cacTransportEquipment = doc.createElement("cac:TransportEquipment")
					cacTransportHandlingUnit.appendChild(cacTransportEquipment)
					{
						const cbcID = doc.createElement("cbc:ID")
						cbcID.textContent = vehicles[0].identity
						cacTransportEquipment.appendChild(cbcID)

						if (vehicles[0].registrationIdentity) {
							const cacApplicableTransportMeans = doc.createElement("cac:ApplicableTransportMeans")
							cacTransportEquipment.appendChild(cacApplicableTransportMeans)
							{
								const cbcRegistrationNationalityID = doc.createElement("cbc:RegistrationNationalityID")
								cbcRegistrationNationalityID.textContent = vehicles[0].registrationIdentity
								cacApplicableTransportMeans.appendChild(cbcRegistrationNationalityID)
							}
						}

						// More vehicles
						if (vehicles.length > 1) {
							// We need to iterate secondary vehicles
							for (let i = 1; i < vehicles.length; ++i) {
								const vehicle = vehicles[i]
								const cacAttachedTransportEquipment = doc.createElement("cac:AttachedTransportEquipment")
								cacTransportEquipment.appendChild(cacAttachedTransportEquipment)
								{
									const cbcID = doc.createElement("cbc:ID")
									cbcID.textContent = vehicle.identity
									cacAttachedTransportEquipment.appendChild(cbcID)

									if (vehicle.registrationIdentity) {
										const cacApplicableTransportMeans = doc.createElement("cac:ApplicableTransportMeans")
										cacAttachedTransportEquipment.appendChild(cacApplicableTransportMeans)
										{
											const cbcRegistrationNationalityID = doc.createElement("cbc:RegistrationNationalityID")
											cbcRegistrationNationalityID.textContent = vehicle.registrationIdentity
											cacApplicableTransportMeans.appendChild(cbcRegistrationNationalityID)
										}
									}

									if (vehicle.authorization) {
										const cacShipmentDocumentReference = doc.createElement("cac:ShipmentDocumentReference")
										cacAttachedTransportEquipment.appendChild(cacShipmentDocumentReference)
										{
											const cbcID = doc.createElement("cbc:ID")
											cbcID.setAttribute("schemeID", vehicle.departmentCode)
											cbcID.textContent = vehicle.authorization
											cacShipmentDocumentReference.appendChild(cbcID)
										}
									}
								}
							} // for
						}

						if (vehicles[0].authorization) {
							const cacShipmentDocumentReference = doc.createElement("cac:ShipmentDocumentReference")
							cacTransportEquipment.appendChild(cacShipmentDocumentReference)
							{
								const cbcID = doc.createElement("cbc:ID")
								cbcID.setAttribute("schemeID", vehicles[0].departmentCode)
								cbcID.textContent = vehicles[0].authorization
								cacShipmentDocumentReference.appendChild(cbcID)
							}
						}
					}
				}
			}

			const port = despatch.getPort()
			if (port) {
				// caching
				const isPort = port.type

				const cacFirstArrivalPortLocation = doc.createElement("cac:FirstArrivalPortLocation")
				cacShipment.appendChild(cacFirstArrivalPortLocation)
				{
					const cbcID = doc.createElement("cbc:ID")
					cbcID.setAttribute("schemeAgencyName", "PE:SUNAT")
					cbcID.setAttribute("schemeName", isPort ? "Puertos" : "Aeropuertos")
					cbcID.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo" + (isPort ? "63" : "64"))
					cbcID.textContent = port.identity
					cacFirstArrivalPortLocation.appendChild(cbcID)

					const cbcLocationTypeCode = doc.createElement("cbc:LocationTypeCode")
					cbcLocationTypeCode.textContent = port.name.type ? "1" : "2"
					cacFirstArrivalPortLocation.appendChild(cbcLocationTypeCode)

					const cbcName = doc.createElement("cbc:Name")
					cbcName.textContent = port.name
					cacFirstArrivalPortLocation.appendChild(cbcName)
				}
			}
		}

		fragment.appendChild(cacShipment)
		return fragment
	}

	static generatePaymentMeans(invoice) {
		const fragment = invoice.xmlDocument.createDocumentFragment()

		if (!invoice.hasDetraction()) {
			return fragment
		}

		// caching
		const doc = invoice.xmlDocument
		const detraction = invoice.getDetraction()
		const currencyId = invoice.getCurrencyId() // Cachear esto también
		// resolving here to avoid jumps
		const bankAccount = detraction.getFinancialAccount() || invoice.getTaxpayer().getDeductionsAccount()

		const cacPaymentMeans = doc.createElement("cac:PaymentMeans")
		fragment.appendChild(cacPaymentMeans)
		{
			const cbcID = doc.createElement("cbc:ID")
			cbcID.textContent = "Detraccion"
			cacPaymentMeans.appendChild(cbcID)

			const cbcPaymentMeansCode = doc.createElement("cbc:PaymentMeansCode")
			cbcPaymentMeansCode.textContent = "003"
			cacPaymentMeans.appendChild(cbcPaymentMeansCode)

			const cacPayeeFinancialAccount = doc.createElement("cac:PayeeFinancialAccount")
			cacPaymentMeans.appendChild(cacPayeeFinancialAccount)
			{
				const cbcID = doc.createElement("cbc:ID")
				// Use explicit number or default
				cbcID.textContent = bankAccount
				cacPayeeFinancialAccount.appendChild(cbcID)
			}
		}

		const cacPaymentTerms = doc.createElement("cac:PaymentTerms")
		fragment.appendChild(cacPaymentTerms)
		{
			const cbcID = doc.createElement("cbc:ID")
			cbcID.textContent = "Detraccion"
			cacPaymentTerms.appendChild(cbcID)

			const cbcPaymentMeansID = doc.createElement("cbc:PaymentMeansID")
			cbcPaymentMeansID.textContent = detraction.getCode()
			cacPaymentTerms.appendChild(cbcPaymentMeansID)

			const cbcPaymentPercent = doc.createElement("cbc:PaymentPercent")
			cbcPaymentPercent.textContent = detraction.getPercentage()
			cacPaymentTerms.appendChild(cbcPaymentPercent)

			const cbcAmount = doc.createElement("cbc:Amount")
			cbcAmount.setAttribute("currencyID", currencyId)
			cbcAmount.textContent = detraction.getAmount().toFixed(2)
			cacPaymentTerms.appendChild(cbcAmount)
		}

		return fragment
	}

	static generatePaymentTerms(invoice) {
		const doc = invoice.xmlDocument
		const fragment = doc.createDocumentFragment()

		// caching
		const shares = invoice.getShares()
		const currencyId = invoice.getCurrencyId()

		if (shares.length == 0) { //Cash Payment
			const cacPaymentTerms = doc.createElement("cac:PaymentTerms")
			{
				const cbcID = doc.createElement("cbc:ID")
				cbcID.textContent = "FormaPago"
				cacPaymentTerms.appendChild(cbcID)

				const cbcPaymentMeansID = doc.createElement("cbc:PaymentMeansID")
				cbcPaymentMeansID.textContent = "Contado"
				cacPaymentTerms.appendChild(cbcPaymentMeansID)
			}

			fragment.appendChild(cacPaymentTerms)
			return fragment
		}

		//Credit payment
		const cacPaymentTerms = doc.createElement("cac:PaymentTerms")
		{
			const cbcID = doc.createElement("cbc:ID")
			cbcID.textContent = "FormaPago"
			cacPaymentTerms.appendChild(cbcID)

			const cbcPaymentMeansID = doc.createElement("cbc:PaymentMeansID")
			cbcPaymentMeansID.textContent = "Credito"
			cacPaymentTerms.appendChild(cbcPaymentMeansID)

			const cbcAmount = doc.createElement("cbc:Amount")
			cbcAmount.setAttribute("currencyID", currencyId)

			// when detraction: taxInclusiveAmount - detraction amount
			let creditAmount = invoice.taxInclusiveAmount
			if (invoice.hasDetraction()) {
				creditAmount -= invoice.getDetraction().getAmount()
			}
			cbcAmount.textContent = creditAmount.toFixed(2)
			cacPaymentTerms.appendChild(cbcAmount)
		}

		let c = 0
		for (let i = 0; i < shares.length; ++i) {
			const share = shares[i]
			const cacPaymentTerms = doc.createElement("cac:PaymentTerms")
			{
				const cbcID = doc.createElement("cbc:ID")
				cbcID.textContent = "FormaPago"
				cacPaymentTerms.appendChild(cbcID)

				const cbcPaymentMeansID = doc.createElement("cbc:PaymentMeansID")
				cbcPaymentMeansID.textContent = `Cuota${String(i + 1).padStart(3, '0')}`
				cacPaymentTerms.appendChild(cbcPaymentMeansID)

				const cbcAmount = doc.createElement("cbc:Amount")
				cbcAmount.setAttribute("currencyID", currencyId)
				cbcAmount.textContent = share.getAmount(true)
				cacPaymentTerms.appendChild(cbcAmount)

				const cbcPaymentDueDate = doc.createElement("cbc:PaymentDueDate")
				cbcPaymentDueDate.textContent = Receipt.displayDate(share.getDueDate())
				cacPaymentTerms.appendChild(cbcPaymentDueDate)
			}
			fragment.appendChild(cacPaymentTerms)
		}

		fragment.appendChild(cacPaymentTerms)
		return fragment
	}

	static generateCharge(invoice) {
		const doc = invoice.xmlDocument
		const fragment = doc.createDocumentFragment()

		// caching
		const discount = invoice.getDiscount()

		if (!discount) {
			return fragment
		}

		// more caching
		const currencyId = invoice.getCurrencyId()

		const cacAllowanceCharge = doc.createElement("cac:AllowanceCharge")
		{
			const cbcChargeIndicator = doc.createElement("cbc:ChargeIndicator")
			cbcChargeIndicator.textContent = String(discount.indicator) // to print "true" or "false"
			cacAllowanceCharge.appendChild(cbcChargeIndicator)

			const cbcAllowanceChargeReasonCode = doc.createElement("cbc:AllowanceChargeReasonCode")
			cbcAllowanceChargeReasonCode.textContent = discount.getTypeCode()
			cacAllowanceCharge.appendChild(cbcAllowanceChargeReasonCode)

			const cbcMultiplierFactorNumeric = doc.createElement("cbc:MultiplierFactorNumeric")
			cbcMultiplierFactorNumeric.textContent = discount.factor.toFixed(5)
			cacAllowanceCharge.appendChild(cbcMultiplierFactorNumeric)

			const cbcAmount = doc.createElement("cbc:Amount")
			cbcAmount.setAttribute("currencyID", currencyId)
			cbcAmount.textContent = discount.amount.toFixed(2)
			cacAllowanceCharge.appendChild(cbcAmount)

			const cbcBaseAmount = doc.createElement("cbc:BaseAmount")
			cbcBaseAmount.setAttribute("currencyID", currencyId)
			cbcBaseAmount.textContent = discount.baseAmount.toFixed(2)
			cacAllowanceCharge.appendChild(cbcBaseAmount)
		}
		fragment.appendChild(cacAllowanceCharge)

		return fragment
	}

	static generateTaxes(invoice) {
		const doc = invoice.xmlDocument
		const fragment = doc.createDocumentFragment()
		const currencyId = invoice.getCurrencyId()

		// Map to avoid switch and reducing bytecode
		const TAX_CONFIG = [
			{ id: "1000", name: "IGV", type: "VAT" }, // Index 0: Gravado
			{ id: "9997", name: "EXO", type: "VAT" }, // Index 1: Exonerado
			{ id: "9998", name: "INA", type: "FRE" }, // Index 2: Inafecto
			{ id: "9999", name: "OTROS CONCEPTOS DE PAGO", type: "OTH" }
		]

		const cacTaxTotal = doc.createElement("cac:TaxTotal")
		{
			// TaxAmount Global
			const cbcTaxAmount = doc.createElement("cbc:TaxAmount")
			cbcTaxAmount.setAttribute("currencyID", currencyId)
			cbcTaxAmount.textContent = invoice.taxTotalAmount.toFixed(2)
			cacTaxTotal.appendChild(cbcTaxAmount)

			// Inline function to generate subtotals
			const createSubtotal = (taxableValue, taxValue, schemeData) => {
				const cacTaxSubtotal = doc.createElement("cac:TaxSubtotal")
				{
					const cbcTaxableAmount = doc.createElement("cbc:TaxableAmount")
					cbcTaxableAmount.setAttribute("currencyID", currencyId)
					cbcTaxableAmount.textContent = taxableValue.toFixed(2)

					const cbcTaxAmount = doc.createElement("cbc:TaxAmount")
					cbcTaxAmount.setAttribute("currencyID", currencyId)
					cbcTaxAmount.textContent = taxValue.toFixed(2)

					const cacTaxCategory = doc.createElement("cac:TaxCategory")
					{
						const cacTaxScheme = doc.createElement("cac:TaxScheme")
						{
							const cbcID = doc.createElement("cbc:ID")
							cbcID.setAttribute("schemeName", "Codigo de tributos")
							cbcID.setAttribute("schemeAgencyName", "PE:SUNAT")
							cbcID.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05")
							cbcID.textContent = schemeData.id

							const cbcName = doc.createElement("cbc:Name")
							cbcName.textContent = schemeData.name

							const cbcTaxTypeCode = doc.createElement("cbc:TaxTypeCode")
							cbcTaxTypeCode.textContent = schemeData.type

							cacTaxScheme.appendChild(cbcID)
							cacTaxScheme.appendChild(cbcName)
							cacTaxScheme.appendChild(cbcTaxTypeCode)
						}
						cacTaxCategory.appendChild(cacTaxScheme)
					}
					cacTaxSubtotal.appendChild(cbcTaxableAmount)
					cacTaxSubtotal.appendChild(cbcTaxAmount)
					cacTaxSubtotal.appendChild(cacTaxCategory)
				}

				return cacTaxSubtotal
			}

			if (invoice.iscAmount > 0) { //ISC
				cacTaxTotal.appendChild(
					createSubtotal(invoice.getOperationAmount(0), invoice.iscAmount, { id: "2000", name: "ISC", type: "EXC" })
				)
			}

			//Assign data according taxability
			for (let i = 0; i < 4; i++) {
				const amount = invoice.getOperationAmount(i)
				if (amount <= 0) {
					continue
				}

				const taxValue = (i === 0) ? invoice.igvAmount : 0
				cacTaxTotal.appendChild(createSubtotal(amount, taxValue, TAX_CONFIG[i]))
			}
		}

		fragment.appendChild(cacTaxTotal)
		return fragment
	}

	static generateTotal(invoice) {
		const doc = invoice.xmlDocument
		const fragment = doc.createDocumentFragment()
		const currencyId = invoice.getCurrencyId()

		if (invoice.getTypeCode() == 8) {
			const cacRequestedMonetaryTotal = doc.createElement("cac:RequestedMonetaryTotal")
			{
				const cbcPayableAmount = doc.createElement("cbc:PayableAmount")
				cbcPayableAmount.setAttribute("currencyID", currencyId)
				cbcPayableAmount.textContent = invoice.taxInclusiveAmount.toFixed(2)
				cacRequestedMonetaryTotal.appendChild(cbcPayableAmount)
			}
			fragment.appendChild(cacRequestedMonetaryTotal)
			return fragment
		}

		const cacLegalMonetaryTotal = doc.createElement("cac:LegalMonetaryTotal")
		{
			const cbcLineExtensionAmount = doc.createElement("cbc:LineExtensionAmount")
			cbcLineExtensionAmount.setAttribute("currencyID", currencyId)
			cbcLineExtensionAmount.textContent = invoice.lineExtensionAmount.toFixed(2)

			const cbcTaxInclusiveAmount = doc.createElement("cbc:TaxInclusiveAmount")
			cbcTaxInclusiveAmount.setAttribute("currencyID", currencyId)
			cbcTaxInclusiveAmount.textContent = invoice.taxInclusiveAmount.toFixed(2)

			const cbcPayableAmount = doc.createElement("cbc:PayableAmount")
			cbcPayableAmount.setAttribute("currencyID", currencyId)
			cbcPayableAmount.textContent = invoice.taxInclusiveAmount.toFixed(2) // That is not the correct amount

			cacLegalMonetaryTotal.appendChild(cbcLineExtensionAmount)
			cacLegalMonetaryTotal.appendChild(cbcTaxInclusiveAmount)
			cacLegalMonetaryTotal.appendChild(cbcPayableAmount)
		}
		fragment.appendChild(cacLegalMonetaryTotal)

		return fragment
	}

	static generateLines(invoice) {
		const doc = invoice.xmlDocument
		const fragment = doc.createDocumentFragment()

		const items = invoice.items
		const typeCode = invoice.getTypeCode()
		const isDespatch = (typeCode == 9 || typeCode == 31)
		// Despatch has not currency
		const currencyId = !isDespatch ? invoice.getCurrencyId() : ""

		const lineNodeName = isDespatch ? "cac:DespatchLine" : `cac:${invoice.name}Line`
		const quantityNodeName = (typeCode == 1 || typeCode == 3) ? "cbc:InvoicedQuantity" :
			typeCode == 7 ? "cbc:CreditedQuantity" :
				typeCode == 8 ? "cbc:DebitedQuantity" :
					isDespatch ? "cbc:DeliveredQuantity" :
						"cbc:Quantity" // it's error

		// Static map for avoiding switch(true)
		const TAX_DATA = {
			VAT_1000: { id: "1000", name: "IGV", type: "VAT" },
			VAT_9997: { id: "9997", name: "EXO", type: "VAT" },
			FRE_9998: { id: "9998", name: "INA", type: "FRE" },
			OTH_9999: { id: "9999", name: "OTROS CONCEPTOS DE PAGO", type: "OTH" }
		}

		let itemIndex = 0 // for ID
		for (const item of items) { //Items
			const cacInvoiceLine = doc.createElement(lineNodeName)
			// We are appending it to fragment at end of loop

			const cbcID = doc.createElement("cbc:ID")
			cbcID.textContent = ++itemIndex // Starting with 1
			cacInvoiceLine.appendChild(cbcID)

			const cbcInvoicedQuantity = doc.createElement(quantityNodeName)
			cbcInvoicedQuantity.setAttribute("unitCode", item.getUnitCode())
			cbcInvoicedQuantity.setAttribute("unitCodeListID", "UN/ECE rec 20")
			cbcInvoicedQuantity.setAttribute("unitCodeListAgencyName", "United Nations Economic Commission for Europe")
			cbcInvoicedQuantity.textContent = item.getQuantity().toFixed(10)
			cacInvoiceLine.appendChild(cbcInvoicedQuantity)

			if (isDespatch) {
				const cacOrderLineReference = doc.createElement("cac:OrderLineReference")

				const cbcLineID = doc.createElement("cbc:LineID")
				cbcLineID.textContent = itemIndex // TODO: check if is incoming this data for using that value

				cacOrderLineReference.appendChild(cbcLineID)
				cacInvoiceLine.appendChild(cacOrderLineReference)
			}
			else {
				const cbcLineExtensionAmount = doc.createElement("cbc:LineExtensionAmount")
				cbcLineExtensionAmount.setAttribute("currencyID", currencyId)
				cbcLineExtensionAmount.textContent = item.getLineExtensionAmount().toFixed(2)
				cacInvoiceLine.appendChild(cbcLineExtensionAmount)

				{ //PricingReference
					const cacPricingReference = doc.createElement("cac:PricingReference")
					const cacAlternativeConditionPrice = doc.createElement("cac:AlternativeConditionPrice")
					const cbcPriceAmount = doc.createElement("cbc:PriceAmount")
					cbcPriceAmount.setAttribute("currencyID", currencyId)
					cbcPriceAmount.textContent = item.getPricingReferenceAmount().toFixed(10)
					const cbcPriceTypeCode = doc.createElement("cbc:PriceTypeCode")
					cbcPriceTypeCode.textContent = "01"

					cacAlternativeConditionPrice.appendChild(cbcPriceAmount)
					cacAlternativeConditionPrice.appendChild(cbcPriceTypeCode)
					cacPricingReference.appendChild(cacAlternativeConditionPrice)
					cacInvoiceLine.appendChild(cacPricingReference)
				}

				{ //TaxTotal
					const cacTaxTotal = doc.createElement("cac:TaxTotal")
					cacInvoiceLine.appendChild(cacTaxTotal)

					const cbcTaxAmount = doc.createElement("cbc:TaxAmount")
					cbcTaxAmount.setAttribute("currencyID", currencyId)
					cbcTaxAmount.textContent = item.getTaxTotalAmount().toFixed(2)
					cacTaxTotal.appendChild(cbcTaxAmount)

					//Assign data according taxability
					const exCode = item.getExemptionReasonCode()
					let taxInfo = TAX_DATA.OTH_9999
					if (exCode < 20) {
						taxInfo = TAX_DATA.VAT_1000
					} else if (exCode < 30) {
						taxInfo = TAX_DATA.VAT_9997
					} else if (exCode < 40) {
						taxInfo = TAX_DATA.FRE_9998
					}

					if (item.getIscAmount() > 0) { //ISC
						const cacTaxSubtotal = doc.createElement("cac:TaxSubtotal")
						cacTaxTotal.appendChild(cacTaxSubtotal)

						const cbcTaxableAmount = doc.createElement("cbc:TaxableAmount")
						cbcTaxableAmount.setAttribute("currencyID", currencyId)
						cbcTaxableAmount.textContent = item.getLineExtensionAmount().toFixed(2)
						cacTaxSubtotal.appendChild(cbcTaxableAmount)

						const cbcTaxAmount = doc.createElement("cbc:TaxAmount")
						cbcTaxAmount.setAttribute("currencyID", currencyId)
						cbcTaxAmount.textContent = item.getIscAmount().toFixed(2)
						cacTaxSubtotal.appendChild(cbcTaxAmount)

						const cacTaxCategory = doc.createElement("cac:TaxCategory")
						cacTaxSubtotal.appendChild(cacTaxCategory)
						{
							const cbcPercent = doc.createElement("cbc:Percent")
							cbcPercent.textContent = item.getIscPercentage()
							cacTaxCategory.appendChild(cbcPercent)

							const cbcTierRange = doc.createElement("cbc:TierRange")
							cbcTierRange.textContent = "01"
							cacTaxCategory.appendChild(cbcTierRange)

							const cacTaxScheme = doc.createElement("cac:TaxScheme")
							cacTaxCategory.appendChild(cacTaxScheme)
							{
								const cbcID = doc.createElement("cbc:ID")
								cbcID.textContent = "2000"
								cacTaxScheme.appendChild(cbcID)

								const cbcName = doc.createElement("cbc:Name")
								cbcName.textContent = "ISC"
								cacTaxScheme.appendChild(cbcName)

								const cbcTaxTypeCode = doc.createElement("cbc:TaxTypeCode")
								cbcTaxTypeCode.textContent = "EXC"
								cacTaxScheme.appendChild(cbcTaxTypeCode)
							}
						}
					}

					{
						const cacTaxSubtotal = doc.createElement("cac:TaxSubtotal")
						cacTaxTotal.appendChild(cacTaxSubtotal)

						const cbcTaxableAmount = doc.createElement("cbc:TaxableAmount")
						cbcTaxableAmount.setAttribute("currencyID", currencyId)
						cbcTaxableAmount.textContent = item.getTaxableIgvAmount().toFixed(2)
						cacTaxSubtotal.appendChild(cbcTaxableAmount)

						const cbcTaxAmount = doc.createElement("cbc:TaxAmount")
						cbcTaxAmount.setAttribute("currencyID", currencyId)
						cbcTaxAmount.textContent = item.getIgvAmount().toFixed(2)
						cacTaxSubtotal.appendChild(cbcTaxAmount)

						const cacTaxCategory = doc.createElement("cac:TaxCategory")
						cacTaxSubtotal.appendChild(cacTaxCategory)
						{
							const cbcPercent = doc.createElement("cbc:Percent")
							cbcPercent.textContent = item.getIgvPercentage()
							cacTaxCategory.appendChild(cbcPercent)

							const cbcTaxExemptionReasonCode = doc.createElement("cbc:TaxExemptionReasonCode")
							cbcTaxExemptionReasonCode.textContent = item.getExemptionReasonCode()
							cacTaxCategory.appendChild(cbcTaxExemptionReasonCode)

							const cacTaxScheme = doc.createElement("cac:TaxScheme")
							cacTaxCategory.appendChild(cacTaxScheme)
							{
								const cbcID = doc.createElement("cbc:ID")
								cbcID.textContent = taxInfo.id
								cacTaxScheme.appendChild(cbcID)

								const cbcName = doc.createElement("cbc:Name")
								cbcName.textContent = taxInfo.name
								cacTaxScheme.appendChild(cbcName)

								const cbcTaxTypeCode = doc.createElement("cbc:TaxTypeCode")
								cbcTaxTypeCode.textContent = taxInfo.type
								cacTaxScheme.appendChild(cbcTaxTypeCode)
							}
						}
					} // block of exemption
				}
			}

			{ //Item
				const cacItem = doc.createElement("cac:Item")
				cacInvoiceLine.appendChild(cacItem)

				const cbcDescription = doc.createElement("cbc:Description")
				cbcDescription.appendChild(doc.createCDATASection(item.getDescription()))
				cacItem.appendChild(cbcDescription)

				const itemCode = item.getCode()
				if (itemCode) {
					const cacSellersItemIdentification = doc.createElement("cac:SellersItemIdentification")
					cacItem.appendChild(cacSellersItemIdentification)

					const cbcID = doc.createElement("cbc:ID")
					cbcID.textContent = itemCode
					cacSellersItemIdentification.appendChild(cbcID)
				}

				const itemClassificationCode = item.getClassificationCode()
				if (itemClassificationCode) {
					const cacCommodityClassification = doc.createElement("cac:CommodityClassification")
					cacItem.appendChild(cacCommodityClassification)

					const cbcItemClassificationCode = doc.createElement("cbc:ItemClassificationCode")
					cbcItemClassificationCode.setAttribute("listID", "UNSPSC")
					cbcItemClassificationCode.setAttribute("listAgencyName", "GS1 US")
					cbcItemClassificationCode.setAttribute("listName", "Item Classification")
					cbcItemClassificationCode.textContent = itemClassificationCode
					cacCommodityClassification.appendChild(cbcItemClassificationCode)
				}
			}

			if (!isDespatch) {
				{ //Price
					const cacPrice = doc.createElement("cac:Price")
					cacInvoiceLine.appendChild(cacPrice)

					const cbcPriceAmount = doc.createElement("cbc:PriceAmount")
					cbcPriceAmount.setAttribute("currencyID", currencyId)
					cbcPriceAmount.textContent = item.getUnitValue().toFixed(10)
					cacPrice.appendChild(cbcPriceAmount)
				}
			}

			fragment.appendChild(cacInvoiceLine)
		}

		return fragment
	}

	static generateDiscrepancy(note) {
		const doc = note.xmlDocument
		const fragment = doc.createDocumentFragment()

		// caching
		const documentReference = note.getDocumentReference()
		const responseCode = note.getResponseCode(true)
		const description = note.getDescription()

		const cacDiscrepancyResponse = doc.createElement("cac:DiscrepancyResponse")
		{
			const cbcReferenceID = doc.createElement("cbc:ReferenceID")
			cbcReferenceID.textContent = documentReference
			cacDiscrepancyResponse.appendChild(cbcReferenceID)

			const cbcResponseCode = doc.createElement("cbc:ResponseCode")
			cbcResponseCode.textContent = responseCode
			cacDiscrepancyResponse.appendChild(cbcResponseCode)

			const cbcDescription = doc.createElement("cbc:Description")
			cbcDescription.textContent = description
			cacDiscrepancyResponse.appendChild(cbcDescription)
		}
		fragment.appendChild(cacDiscrepancyResponse)

		return fragment
	}
}

export default NodesGenerator
