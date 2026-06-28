import Receipt from "../Receipt.js"

/**
 * Generation of XML nodes using string literals.
 * Similar in declaration to NodesGenerator's methods, but definitions.
 */
class TagsGenerator {
	static generateUpperWrapper(document) {
		return `\
<?xml version="1.0" encoding="utf-8"?>
<${document.name} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${document.name}-2" xmlns:cac="${Receipt.namespaces.cac}" xmlns:cbc="${Receipt.namespaces.cbc}" xmlns:ds="${Receipt.namespaces.ds}" xmlns:ext="${Receipt.namespaces.ext}">`
	}

	static generateLowerWrapper(document) {
		return `</${document.name}>`
	}

	/**
	 * Space for appending signature.
	 */
	static generateUblExtensions(document) {
		return `\
<ext:UBLExtensions>
	<ext:UBLExtension>
		<ext:ExtensionContent></ext:ExtensionContent>
	</ext:UBLExtension>
</ext:UBLExtensions>`
	}

	static generateHeader(invoice) {
		return `\
<cbc:UBLVersionID>${invoice.getUblVersion()}</cbc:UBLVersionID>
<cbc:CustomizationID>${invoice.getCustomizationId()}</cbc:CustomizationID>`
	}

	static generateIdentity(invoice) {
		return `<cbc:ID>${invoice.getId()}</cbc:ID>`
	}

	static generateDates(invoice) {
		const issueDate = invoice.getIssueDate()
		const typeCode = invoice.getTypeCode()

		const issueDateTag = `<cbc:IssueDate>${Receipt.displayDate(issueDate)}</cbc:IssueDate>`
		const issueTimeTag = `<cbc:IssueTime>${Receipt.displayTime(issueDate)}</cbc:IssueTime>`

		// Conditional to append due date
		let dueDateTag = ''
		if (typeCode == 1 && invoice.getShares().length == 0) {
			const dueDate = invoice.getDueDate()
			if (dueDate) {
				dueDateTag = `\n<cbc:DueDate>${Receipt.displayDate(dueDate)}</cbc:DueDate>`
			}
		}

		return `${issueDateTag}${issueTimeTag}${dueDateTag}`
	}

	static generateTypeCode(invoice) {
		const typeCode = invoice.getTypeCode()

		// Detraction only for B2B or B2C
		let listIdAttr = ''
		if (typeCode == 1 || typeCode == 3) {
			const listID = invoice.hasDetraction() ? '1001' : '0101'
			listIdAttr = ` listID="${listID}"` // initial space for separation of tag
		}

		return `<cbc:${invoice.name}TypeCode${listIdAttr}>${invoice.getTypeCode(true)}</cbc:${invoice.name}TypeCode>`
	}

	static generateNotes(invoice) {
		const typeCode = invoice.getTypeCode()

		// Handle despatch type codes
		if (typeCode == 9 || typeCode == 31) {
			const noteText = invoice.getNote()
			if (!noteText) {
				return '' // Return empty string if no note is provided
			}
			return `<cbc:Note><![CDATA[${noteText}]]></cbc:Note>`
		}

		// Default note with amount converted to words
		const amountWords = Receipt.amountToWords(invoice.taxInclusiveAmount, "con", invoice.getCurrencyId())
		let notesXml = `<cbc:Note languageLocaleID="1000"><![CDATA[${amountWords}]]></cbc:Note>`

		// Append detraction note if applicable
		if ((typeCode == 1 || typeCode == 3) && invoice.hasDetraction()) {
			notesXml += `\n<cbc:Note languageLocaleID="2006"><![CDATA[Operación sujeta a detracción]]></cbc:Note>`
		}

		return notesXml
	}

	static generateCurrencyCode(invoice) {
		// Return the DocumentCurrencyCode tag with the currency ID directly as a string
		return `<cbc:DocumentCurrencyCode>${invoice.getCurrencyId()}</cbc:DocumentCurrencyCode>`
	}

	static generateReference(invoice) {
		const typeCode = invoice.getTypeCode()

		// Reference logic for Invoices ('01' or '03') with Order Reference data
		if ((typeCode == 1 || typeCode == 3) && invoice.getOrderReference()) {
			const orderRefId = invoice.getOrderReference()
			const orderRefText = invoice.getOrderReferenceText()

			// Include CustomerReference tag only if it has text content
			const customerRefTag = orderRefText
				? `\n\t<cbc:CustomerReference><![CDATA[${orderRefText}]]></cbc:CustomerReference>`
				: ''

			return `\
<cac:OrderReference>
	<cbc:ID>${orderRefId}</cbc:ID>${customerRefTag}
</cac:OrderReference>`
		}

		// Reference logic for Credit or Debit Notes ('07' or '08')
		if (typeCode == 7 || typeCode == 8) {
			let billingDocumentReferenceId
			let billingDocumentReferenceTypeCode

			if (invoice.billingDocumentReference) {
				const billingDocumentReference = invoice.billingDocumentReference
				billingDocumentReferenceId = billingDocumentReference.getId()
				billingDocumentReferenceTypeCode = billingDocumentReference.getTypeCode(true)
			} else {
				// Backward compatibility with deprecated methods
				// This block must be removed when deprecated method is removed
				billingDocumentReferenceId = invoice.getDocumentReference()
				billingDocumentReferenceTypeCode = invoice.getDocumentReferenceTypeCode(true)
			}

			return `\
<cac:BillingReference>
	<cac:InvoiceDocumentReference>
		<cbc:ID>${billingDocumentReferenceId}</cbc:ID>
		<cbc:DocumentTypeCode>${billingDocumentReferenceTypeCode}</cbc:DocumentTypeCode>
	</cac:InvoiceDocumentReference>
</cac:BillingReference>`
		}

		// Return an empty string if no conditions match
		return ''
	}

	static generateSignature(invoice) {
		// Cache taxpayer details
		const taxpayer = invoice.getTaxpayer()
		const ruc = taxpayer.getIdentification().getNumber()

		// Return the structured Signature node as a flat string
		return `\
<cac:Signature>
	<cbc:ID>${ruc}</cbc:ID>
	<cac:SignatoryParty>
		<cac:PartyIdentification>
			<cbc:ID>${ruc}</cbc:ID>
		</cac:PartyIdentification>
		<cac:PartyName>
			<cbc:Name><![CDATA[${taxpayer.getName()}]]></cbc:Name>
		</cac:PartyName>
	</cac:SignatoryParty>
	<cac:DigitalSignatureAttachment>
		<cac:ExternalReference>
			<cbc:URI>#terexoris</cbc:URI>
		</cac:ExternalReference>
	</cac:DigitalSignatureAttachment>
</cac:Signature>`
	}

	static generateAdditionalDocumentReferences(receipt) {
		const additionalDocumentReferences = receipt.additionalDocumentReferences

		// Return empty string if there are no additional document references
		if (!additionalDocumentReferences || additionalDocumentReferences.length == 0) {
			return ''
		}

		// caching
		const typeCode = receipt.getTypeCode()
		const isNotDespatch = !(typeCode == 9 || typeCode == 31)
		const ruc = receipt.getTaxpayer().getIdentification().getNumber()

		// Map through each reference and map it to a string template
		return additionalDocumentReferences.map(ref => {
			const id = ref.getId()
			const docTypeCode = ref.getTypeCode(true)

			// Render IssuerParty block only for despatch guides (typeCode 9 or 31)
			let issuerPartyTag = ''
			if (!isNotDespatch) {
				// If issuerId is not set, use own RUC
				const issuerId = ref.getIssuerId() || ruc
				issuerPartyTag = `
<cac:IssuerParty>
	<cac:PartyIdentification>
		<cbc:ID schemeID="6">${issuerId}</cbc:ID>
	</cac:PartyIdentification>
</cac:IssuerParty>`
			}

			return `\
<cac:AdditionalDocumentReference>
	<cbc:ID>${id}</cbc:ID>
	<cbc:DocumentTypeCode>${docTypeCode}</cbc:DocumentTypeCode>${issuerPartyTag}
</cac:AdditionalDocumentReference>`
		}).join('\n')
	}
}

export default TagsGenerator
