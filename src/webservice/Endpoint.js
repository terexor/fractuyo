class Endpoint {
	// true for deployment; false for test
	static #mode = false

	static #invoice = {
		deploy: "https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService",
		test: "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService"
	}

	static #retention = {
		deploy: "https://e-factura.sunat.gob.pe/ol-ti-itemision-otroscpe-gem/billService",
		test: "https://e-beta.sunat.gob.pe/ol-ti-itemision-otroscpe-gem-beta/billService"
	}

	static #despatch = {
		deploy: "https://e-guiaremision.sunat.gob.pe/ol-ti-itemision-guia-gem/billService",
		test: "https://e-beta.sunat.gob.pe/ol-ti-itemision-guia-gem-beta/billService"
	}

	static async fetch(service, body) {
		let url

		switch(service) {
			case 1: {
				url = Endpoint.#mode ? Endpoint.#invoice.deploy : Endpoint.#invoice.test
				break
			}
			case 2: {
				url = Endpoint.#mode ? Endpoint.#retention.deploy : Endpoint.#retention.test
				break
			}
			case 3: {
				url = Endpoint.#mode ? Endpoint.#despatch.deploy : Endpoint.#despatch.test
				break
			}
			default:
				throw new Error("Servicio incorrecto.")
		}

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
