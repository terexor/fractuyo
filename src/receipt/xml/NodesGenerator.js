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
			const cacInvoiceLine = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:InvoiceLine")
			invoice.xmlDocument.documentElement.appendChild(cacInvoiceLine)

			const cbcID = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ID")
			cbcID.textContent = ++itemIndex
			cacInvoiceLine.appendChild(cbcID)

			const cbcInvoicedQuantity = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:InvoicedQuantity")
			cbcInvoicedQuantity.setAttribute("unitCode", item.getUnitCode())
			cbcInvoicedQuantity.setAttribute("unitCodeListID", "UN/ECE rec 20")
			cbcInvoicedQuantity.setAttribute("unitCodeListAgencyName", "United Nations Economic Commission for Europe")
			cbcInvoicedQuantity.textContent = item.getQuantity(true, 10)
			cacInvoiceLine.appendChild(cbcInvoicedQuantity)

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

				const cacCommodityClassification = invoice.xmlDocument.createElementNS(Receipt.namespaces.cac, "cac:CommodityClassification")
				cacItem.appendChild(cacCommodityClassification)

				const cbcItemClassificationCode = invoice.xmlDocument.createElementNS(Receipt.namespaces.cbc, "cbc:ItemClassificationCode")
				cbcItemClassificationCode.setAttribute("listID", "UNSPSC")
				cbcItemClassificationCode.setAttribute("listAgencyName", "GS1 US")
				cbcItemClassificationCode.setAttribute("listName", "Item Classification")
				cbcItemClassificationCode.textContent = item.getClassificationCode()
				cacCommodityClassification.appendChild(cbcItemClassificationCode)
			}

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

export default NodesGenerator
