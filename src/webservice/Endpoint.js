import Rest from "./Rest.js"

class Endpoint {
	// true for deployment; false for test
	static #mode = false

	static #token

	static #offset = 4

	static INDEX_INVOICE = 0
	static INDEX_RETENTION = 1

	static INDEX_TOKEN = 1 << Endpoint.#offset
	static INDEX_SEND = 2 << Endpoint.#offset
	static INDEX_STATUS = 3 << Endpoint.#offset
	static #REST_MASK = 0b111 << Endpoint.#offset // despatch is here

	static setMode(mode) {
		Endpoint.#mode = mode
	}

	static setUrl(service, url, deploymentMode = false) {
		if (service < 0 || service > 3) {
			throw new Error("Servicio no existente.")
		}

		if (productionMode) {
			Endpoint.#urls[service].deploy = url
			return
		}

		Endpoint.#urls[service].test = url
		return
	}

	static #urls = [
		{ // invoice
			deploy: "https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService",
			test: "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService"
		},
		{ // retention
			deploy: "https://e-factura.sunat.gob.pe/ol-ti-itemision-otroscpe-gem/billService",
			test: "https://e-beta.sunat.gob.pe/ol-ti-itemision-otroscpe-gem-beta/billService"
		}
	]

	/**
	 * Currently for despatchs but looks like for any document.
	 */
	static #restUrls = [
		{ // despatch token
			deploy: "https://api-seguridad.sunat.gob.pe/v1/clientessol/<client_id>/oauth2/token",
			test: "https://gre-test.nubefact.com/v1/clientessol/<client_id>/oauth2/token"
		},
		{ // despatch send
			deploy: "https://api-cpe.sunat.gob.pe/v1/contribuyente/gem/comprobantes/", // ending: {numRucEmisor}-{codCpe}-{numSerie}-{numCpe}
			test: "https://gre-test.nubefact.com/v1/contribuyente/gem/comprobantes/"
		},
		{ // despatch status
			deploy: "https://api-cpe.sunat.gob.pe/v1/contribuyente/gem/comprobantes/envios/", // ending: {numTicket}
			test: "https://gre-test.nubefact.com/v1/contribuyente/gem/comprobantes/envios/"
		},
	]

	static getUrl(service, mode) {
		// Use what is in current scope
		if (mode == undefined) {
			Endpoint.#mode
		}

		if (service == Endpoint.INDEX_INVOICE || service == Endpoint.INDEX_RETENTION) {
			return mode ? Endpoint.#urls[service].deploy : Endpoint.#urls[service].test
		}

		if ((service & Endpoint.#REST_MASK) != 0) {
			service >>= Endpoint.#offset
			--service
			return mode ? Endpoint.#restUrls[service].deploy : Endpoint.#restUrls[service].test
		}
	}

	static async fetch(service, body) {
		const url = Endpoint.getUrl(service)

		const response = await fetch(url, {
			method: "POST",
			headers: {"Content-Type": "text/xml;charset=UTF-8"},
			body: body
		})
		const responseText = await response.text()

		return responseText
	}

	static async fetchStatus(ticket) {
		const url = Endpoint.getUrl(Endpoint.INDEX_STATUS).concat(ticket)

		const response = await fetch(url, {
			method: "GET",
			headers: {"Content-Type": "application/json", "Authorization": "Bearer " + Endpoint.#token}
		})
		const responseJson = await response.json()

		return responseJson
	}

	static async fetchSend(body, receipt) {
		const url = Endpoint.getUrl(Endpoint.INDEX_SEND).concat(`${receipt.taxpayer.getIdentification().getNumber()}-${receipt.getId(true)}`)

		const response = await fetch(url, {
			method: "POST",
			headers: {"Content-Type": "application/json", "Authorization": "Bearer " + Endpoint.#token},
			body: body
		})
		const responseJson = await response.json()

		return responseJson
	}

	static async fetchToken(taxpayer) {
		const url = Endpoint.getUrl(Endpoint.INDEX_TOKEN).replace("<client_id>", taxpayer.getSolId())

		const data = Rest.generateToken(taxpayer)

		const response = await fetch(url, {
			method: "POST",
			headers: {"Content-Type": "application/x-www-form-urlencoded"},
			body: data
		})
		const responseJson = await response.json()

		// Hold value
		Endpoint.#token = responseJson.access_token

		return responseJson
	}

	static get token() {
		return Endpoint.#token
	}

	static set token(token) {
		Endpoint.#token = token
	}
}

export default Endpoint
