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
}

export default TagsGenerator
