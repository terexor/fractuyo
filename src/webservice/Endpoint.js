class Endpoint {
	// true for deployment; false for test
	static #mode = false

	static INDEX_INVOICE = 0
	static INDEX_RETENTION = 1
	static INDEX_DESPATCH = 2

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
		},
		{ // despatch
			deploy: "https://e-guiaremision.sunat.gob.pe/ol-ti-itemision-guia-gem/billService",
			test: "https://e-beta.sunat.gob.pe/ol-ti-itemision-guia-gem-beta/billService"
		}
	]

	static async fetch(service, body) {
		const url = Endpoint.#mode ? Endpoint.#urls[service].deploy : Endpoint.#urls[service].test

		const response = await fetch(url, {
			method: "POST",
			headers: {"Content-Type": "text/xml;charset=UTF-8"},
			body: body
		})
		const responseText = await response.text()

		return responseText
	}
}

export default Endpoint
