const version = "0.0.1"
var app, fractuyo
var sidebarMenu

"use strict"

window.onload = function() {
	console.log("\ud83d\ude92 FracTuyo -", version)

	Notiflix.Notify.init({position:"center-bottom"})
	Notiflix.Report.init({svgSize:"64px",plainText:false})

	fractuyo = new Fractuyo()
	fractuyo.init()

	let pHome = function(){}
	pHome.prototype = new senna.HtmlScreen()
	pHome.prototype.activate = function() {
		if(fractuyo.isUsable()) {
			let i
			//Enable elements
			const inputs = document.getElementsByTagName("input")
			for(i = 0; i < inputs.length; ++i) {
				if(inputs[i].disabled) {
					inputs[i].disabled = false
				}
			}
			const buttons = document.getElementsByTagName("button")
			for(i = 0; i < buttons.length; ++i) {
				buttons[i].disabled = false
			}
			const selects = document.getElementsByTagName("select")
			for(i = 0; i < selects.length; ++i) {
				selects[i].disabled = false
			}
			const textareas = document.getElementsByTagName("textarea")
			for(i = 0; i < textareas.length; ++i) {
				textareas[i].disabled = false
			}

			fractuyo.orderSeries()
		}
	}

	let pList = function(){}
	pList.prototype = new senna.HtmlScreen()
	pList.prototype.activate = function() {
		if(fractuyo.isUsable()) {
			fractuyo.listInvoices(0)
		}
	}

	let pView = function(){}
	pView.prototype = new senna.HtmlScreen()
	pView.prototype.activate = function() {
		if(fractuyo.isUsable()) {
			let partesNominis = window.location.pathname.match(/\/cdp\/([0-9]{2}-[F|B|T][0-9A-Z]{3}-[0-9]{1,8})\/visor/)
			fractuyo.viewInvoice(partesNominis[1])
		}
	}

	app = new senna.App()
	app.addSurfaces(["navegador", "lienzo"])
	app.addRoutes([
		new senna.Route("/", pHome),
		new senna.Route("/cdp", pList),
		new senna.Route(/\/cdp\/[0-9]{2}-[F|B|T][0-9A-Z]{3}-[0-9]{1,8}\/visor$/, pView),
		new senna.Route(/([\/]{1}.*\/?)/, senna.HtmlScreen)
	])

	app.on("endNavigate", function(event) {
		if(event.error) {
			if(event.error.invalidStatus) {
				Notiflix.Report.info("Página no disponible","No se puede mostrar la página solicitada.<br>Tal vez no esté disponible por ahora.<br>Prueba navegando a otras secciones.", "Aceptar", function(){document.documentElement.classList.remove( app.getLoadingCssClass() )})
			}

			if(event.error.requestError) {
				Notiflix.Report.failure("Error de navegación","No se puede solicitar página.<br>Comprueba tu conexión a Internet.", "Aceptar", function(){document.documentElement.classList.remove( app.getLoadingCssClass() )})
			}

			if(event.error.timeout) {
				Notiflix.Report.warning("Demora en la red","No se pudo traer la página solicitada.<br>La conexión a Internet está tardando mucho.", "Aceptar", function(){document.documentElement.classList.remove( app.getLoadingCssClass() )})
			}
			return
		}
		[...document.querySelectorAll('[data-bs-toggle="tooltip"]')].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
		sidebarMenu.hide()
	})
	sidebarMenu = bootstrap.Offcanvas.getOrCreateInstance("#offcanvasNavbar")
	app.dispatch()
}

/* Datos y funciones útiles */
const namespaces = {
	cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
	cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
	ds: "http://www.w3.org/2000/09/xmldsig#",
	ext: "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
	qdt: "urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2",
	udt: "urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2",
	xsi: "http://www.w3.org/2001/XMLSchema-instance",
	xmlns: "http://www.w3.org/1999/xhtml",
	ccts: "urn:un:unece:uncefact:documentation:2"
}

function nsResolver(prefix) {
	return namespaces[prefix] || "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
}

function removeCdataTag(cdata) {
	return cdata.trim().replace(/^(\/\/\s*)?<!\[CDATA\[|(\/\/\s*)?\]\]>$/g, '').trim()
}

function validateDocumentNumber(documentType, number) {
	switch(documentType) {
		case 0:
			return true
		case 1://DNI o libreta electoral
			//longitud: 8: exacta
			//caracter: numérico
			return ( number != null && number.length === 8 && !isNaN(number) )
		case 4:
			//longitud: 12: máxima
			//caracter: alfanumérico
			return ( number != null && number.length < 13 )
		case 6:
			return validateRuc(number)
		default:
			return false
	}
}

function validateRuc(ruc) {
	if( ruc.length != 11 ||  parseInt(ruc) < 11 ) {
		return false
	}
	if( ! ["10", "15", "17", "20"].includes( ruc.substring(0, 2) ) ) {
		return false
	}

	// Algoritmo tomado de https://www.excelnegocios.com/validacion-de-rucs-sunat-peru-sin-internet-algoritmo/
	const maxFactor = 8
	let currentFactor = 1
	let sum = 0
	for(let i = 9; i >= 0; --i) {
		if(++currentFactor == maxFactor) {
			currentFactor = 2
		}

		sum += currentFactor * parseInt( ruc.charAt(i) )
	}

	if( ( 11 - ( sum % 11 ) ) % 10 == parseInt(ruc.charAt(10)) ) {
		return true
	}
	return false
}

function removeBeginEndPem(pem) {
	return pem
		// remove BEGIN/END
		.replace(/-----(BEGIN|END)[\w\d\s]+-----/g, "")
		// remove \r, \n
		.replace(/[\r\n]/g, "")
}

function getAlgorithm(name) {
	var alg = {};
	switch (name) {
		case "rsapss":
			alg = {
				name: "RSA-PSS",
				hash: "SHA-256",
				modulusLength: 1024,
				publicExponent: new Uint8Array([1, 0, 1]),
				saltLength: 32
			}
			break
		case "ecdsa":
			alg = {
				name: "ECDSA",
				hash: "SHA-256",
				namedCurve: "P-256"
			}
			break
		case "rsassa":
		default:
			alg = {
				name: "RSASSA-PKCS1-v1_5",
				hash: "SHA-256",
				modulusLength: 1024,
				publicExponent: new Uint8Array([1, 0, 1])
			}
	}
	return alg
}

function listarSerie(tipo) {
	const series = fractuyo.getSeries()
	if(!series || tipo.value == "") {
		return
	}

	const seleccionadorDeSerie = document.getElementById("serie")
	while(seleccionadorDeSerie.firstChild) {
		seleccionadorDeSerie.removeChild(seleccionadorDeSerie.firstChild)
	}

	let nullOption = document.createElement("option")
	nullOption.selected = true
	nullOption.hidden = true
	nullOption.value = ""
	nullOption.appendChild(document.createTextNode("Elegir\u2026"))
	seleccionadorDeSerie.appendChild(nullOption)

	const paqueteDeSeries = series[Number(tipo.value)]
	if(!paqueteDeSeries) {
		return
	}

	for(let serie of series[Number(tipo.value)]) {
		let valorDeSerie = document.createElement("option")
		valorDeSerie.value = serie
		valorDeSerie.appendChild(document.createTextNode(serie))
		seleccionadorDeSerie.appendChild(valorDeSerie)
	}
}

function addRowForShare() {
	const shares = document.getElementById("cuotas")
	if(!shares) {
		Notiflix.Notify.failure("No se puede agregar.")
		return
	}
	const share = document.createElement("div")
	share.setAttribute("class", "row mb-1 share")
	shares.appendChild(share)

	const groupShare = document.createElement("div")
	groupShare.setAttribute("class", "input-group")
	share.appendChild(groupShare)

	const removedor = document.createElement("button")
	removedor.type = "button"
	removedor.onclick = autoRemoveShare
	removedor.setAttribute("class", "btn btn-danger")
	removedor.appendChild(document.createTextNode("X"))
	groupShare.appendChild(removedor)

	const entradaMonto = document.createElement("input")
	entradaMonto.type = "number"
	entradaMonto.step = "0.01"
	entradaMonto.placeholder = "Valor de cuota"
	entradaMonto.setAttribute("class", "form-control")
	entradaMonto.setAttribute("aria-label", "Valor unitario")
	groupShare.appendChild(entradaMonto)

	const entradaFecha = document.createElement("input")
	entradaFecha.type = "date"
	entradaFecha.setAttribute("class", "form-control")
	groupShare.appendChild(entradaFecha)

	const reemplazable = shares.getElementsByClassName("replaceable")[0]
	if(reemplazable) {
		reemplazable.remove()
	}
}

function autoRemoveShare() {
	const item = this.parentNode.parentNode
	Notiflix.Confirm.show("Eliminando cuota", "¿Desea eliminar la cuota?", "Sí", "No",
		function() {
			const items = item.parentNode
			item.remove()
			if(items.childElementCount == 0) {
				const ayuda = document.createElement("i")
				ayuda.appendChild(document.createTextNode("Acá debes agregar cuotas."))
				const replaceable = document.createElement("div")
				replaceable.setAttribute("class", "text-center replaceable")
				replaceable.appendChild(ayuda)
				items.appendChild(replaceable)
			}
		}
	)
}

function addRowForItem(object) {
	const items = document.getElementById("items")
	if(!items) {
		Notiflix.Notify.failure("No se puede agregar.")
		return
	}
	const item = document.createElement("div")
	item.setAttribute("class", "row position-relative py-4 border-bottom item")
	items.appendChild(item)

	const colControles = document.createElement("div")
	colControles.setAttribute("class", "col-lg-1 col-12 mb-2 mb-lg-0 text-center")
	item.appendChild(colControles)

	const rowBotones = document.createElement("div")
	rowBotones.setAttribute("class", "row align-items-center")
	colControles.appendChild(rowBotones)

	const codigo = document.createElement("span")
	codigo.setAttribute("class", "badge rounded-pill text-bg-warning")
	codigo.setAttribute("data-bs-toggle", "tooltip")
	codigo.setAttribute("data-bs-placement", "top")
	codigo.setAttribute("data-bs-custom-class", "custom-tooltip")
	codigo.setAttribute("data-bs-title", "Código del ítem")
	codigo.appendChild(document.createTextNode("Sin código"))
	const colCodigo = document.createElement("div")
	colCodigo.setAttribute("class", "col-lg-12 col-6 text-center mb-1")
	colCodigo.appendChild(codigo)
	rowBotones.appendChild(colCodigo)

	const colBotonEditar = document.createElement("div")
	colBotonEditar.setAttribute("class", "col-lg-12 col-3 text-lg-center text-end mb-1")
	rowBotones.appendChild(colBotonEditar)

	const iconoBotonEditar = document.createElement("i")
	iconoBotonEditar.setAttribute("class", "gg-pen")

	const botonEditar = document.createElement("button")
	botonEditar.type = "button"
	botonEditar.setAttribute("class", "btn btn-outline-primary border-0")
	botonEditar.onclick = showItemEditor
	botonEditar.appendChild(iconoBotonEditar)
	colBotonEditar.appendChild(botonEditar)

	const colBotonBorrar = document.createElement("div")
	colBotonBorrar.setAttribute("class", "col-lg-12 col-3 text-lg-center text-start mb-1")
	rowBotones.appendChild(colBotonBorrar)

	const iconoBotonBorrar = document.createElement("i")
	iconoBotonBorrar.setAttribute("class", "gg-trash-empty")

	//Must call: remove iteam
	const botonBorrar = document.createElement("button")
	botonBorrar.type = "button"
	botonBorrar.setAttribute("class", "btn btn-outline-danger border-0")
	botonBorrar.appendChild(iconoBotonBorrar)
	botonBorrar.onclick = autoRemoveItem
	colBotonBorrar.appendChild(botonBorrar)

	const colDescripcion = document.createElement("div")
	colDescripcion.setAttribute("class", "col-lg-7 col-12 mb-2 mb-lg-0")
	item.appendChild(colDescripcion)

	const floatingTextarea = document.createElement("div")
	floatingTextarea.setAttribute("class", "form-floating h-75 mb-1")
	colDescripcion.appendChild(floatingTextarea)

	const textareaDescripcion = document.createElement("textarea")
	textareaDescripcion.setAttribute("class", "form-control h-100")
	textareaDescripcion.placeholder = "Cualquier descripción"
	floatingTextarea.appendChild(textareaDescripcion)

	const etiquetaDescripcion = document.createElement("label")
	etiquetaDescripcion.appendChild(document.createTextNode("Descripción del item"))
	floatingTextarea.appendChild(etiquetaDescripcion)

	const etiquetaIgv = document.createElement("span")
	etiquetaIgv.setAttribute("class", "badge rounded-pill text-bg-info")
	etiquetaIgv.setAttribute("data-bs-toggle", "tooltip")
	etiquetaIgv.setAttribute("data-bs-placement", "top")
	etiquetaIgv.setAttribute("data-bs-custom-class", "custom-tooltip")
	etiquetaIgv.setAttribute("data-bs-title", "Impuesto General a las Ventas")
	etiquetaIgv.appendChild(document.createTextNode("IGV 18%"))
	colDescripcion.appendChild(etiquetaIgv)

	const etiquetaIsc = document.createElement("span")
	etiquetaIsc.setAttribute("class", "badge rounded-pill text-bg-info")
	etiquetaIsc.setAttribute("data-bs-toggle", "tooltip")
	etiquetaIsc.setAttribute("data-bs-placement", "top")
	etiquetaIsc.setAttribute("data-bs-custom-class", "custom-tooltip")
	etiquetaIsc.setAttribute("data-bs-title", "Impuesto Selectivo al Consumo")
	etiquetaIsc.appendChild(document.createTextNode("ISC"))
	colDescripcion.appendChild( document.createTextNode( '\u00A0' ) )
	colDescripcion.appendChild(etiquetaIsc)

	//Add more taxes

	const colNumeros = document.createElement("div")
	colNumeros.setAttribute("class", "col-lg-4 col-12 align-self-center")
	item.appendChild(colNumeros)

	const rowNumeros = document.createElement("div")
	rowNumeros.setAttribute("class", "row")
	colNumeros.appendChild(rowNumeros)

	const colCantidad = document.createElement("div")
	colCantidad.setAttribute("class", "col-lg-12 col-12 mb-2")
	rowNumeros.appendChild(colCantidad)

	const groupCantidad = document.createElement("div")
	groupCantidad.setAttribute("class", "input-group")
	colCantidad.appendChild(groupCantidad)

	const entradaCantidad = document.createElement("input")
	entradaCantidad.type = "number"
	entradaCantidad.step = "0.01"
	entradaCantidad.placeholder = "Cantidad"
	entradaCantidad.setAttribute("class", "form-control w-25")
	entradaCantidad.setAttribute("data-type", "quantity")
	entradaCantidad.setAttribute("aria-label", "Cantidad")
	groupCantidad.appendChild(entradaCantidad)

	const nombreServicii = document.createElement("span")
	nombreServicii.setAttribute("class", "input-group-text w-50 d-inline-block text-truncate text-start")
	nombreServicii.appendChild(document.createTextNode("unidades"))
	groupCantidad.appendChild(nombreServicii)

	const groupMarcadorServicii = document.createElement("div")
	groupMarcadorServicii.setAttribute("class", "input-group-text")
	groupCantidad.appendChild(groupMarcadorServicii)

	const marcador = document.createElement("input")
	marcador.type = "checkbox"
	marcador.setAttribute("class", "form-check-input mt-0")
	marcador.setAttribute("aria-label", "Configurar el ítem como servicio")
	groupMarcadorServicii.appendChild(marcador)

	const etiquetaMarcador = document.createElement("label")
	etiquetaMarcador.setAttribute("class", "form-check-label")
	etiquetaMarcador.appendChild(document.createTextNode("ZZ"))
	etiquetaMarcador.setAttribute("data-bs-toggle", "tooltip")
	etiquetaMarcador.setAttribute("data-bs-placement", "top")
	etiquetaMarcador.setAttribute("data-bs-custom-class", "custom-tooltip")
	etiquetaMarcador.setAttribute("data-bs-title", "Marca para establecer como servicio")
	groupMarcadorServicii.appendChild( document.createTextNode( '\u00A0' ) )
	groupMarcadorServicii.appendChild(etiquetaMarcador)

	const colPrecio = document.createElement("div")
	colPrecio.setAttribute("class", "col-lg-12 col-12")
	rowNumeros.appendChild(colPrecio)

	const rowPreciosTotales = document.createElement("div")
	rowPreciosTotales.setAttribute("class", "row")
	colPrecio.appendChild(rowPreciosTotales)

	const groupPrecio = document.createElement("div")
	groupPrecio.setAttribute("class", "input-group")
	rowPreciosTotales.appendChild(groupPrecio)

	const etiquetaMoneda = document.createElement("span")
	etiquetaMoneda.setAttribute("class", "input-group-text")
	etiquetaMoneda.appendChild(document.createTextNode("S/"))
	groupPrecio.appendChild(etiquetaMoneda)

	const entradaValorUnitario = document.createElement("input")
	entradaValorUnitario.type = "number"
	entradaValorUnitario.step = "0.01"
	entradaValorUnitario.placeholder = "Valor unitario"
	entradaValorUnitario.setAttribute("class", "form-control")
	entradaValorUnitario.setAttribute("aria-label", "Valor unitario")
	entradaValorUnitario.setAttribute("data-type", "unit-value")
	groupPrecio.appendChild(entradaValorUnitario)

	const selectorGravoso = document.createElement("select")
	selectorGravoso.setAttribute("class", "input-group-text text-start text-lg-center form-select d-inline-block text-truncate")
	selectorGravoso.setAttribute("aria-label", "Afectación del IGV")
	selectorGravoso.setAttribute("data-bs-toggle", "tooltip")
	selectorGravoso.setAttribute("data-bs-placement", "top")
	selectorGravoso.setAttribute("data-bs-custom-class", "custom-tooltip")
	selectorGravoso.setAttribute("data-type", "exemption-code")
	groupPrecio.appendChild(selectorGravoso)

	const opcionGravada = document.createElement("option")
	opcionGravada.value = "10"
	opcionGravada.appendChild(document.createTextNode("Gravado (10)"))
	selectorGravoso.appendChild(opcionGravada)
	const opcionInafecta = document.createElement("option")
	opcionInafecta.value = "20"
	opcionInafecta.appendChild(document.createTextNode("Inafecto (20)"))
	selectorGravoso.appendChild(opcionInafecta)
	const opcionExonerada = document.createElement("option")
	opcionExonerada.value = "30"
	opcionExonerada.appendChild(document.createTextNode("Exonerado (30)"))
	selectorGravoso.appendChild(opcionExonerada)

	const rowTotales = document.createElement("div")
	rowTotales.setAttribute("class", "row mx-0 mb-0 mt-2 align-items-center")
	colPrecio.appendChild(rowTotales)

	const colIncIgv = document.createElement("div")
	colIncIgv.setAttribute("class", "col-5 m-0 p-0")
	rowTotales.appendChild(colIncIgv)

	const switchIncIgv = document.createElement("div")
	switchIncIgv.setAttribute("class", "form-check form-switch text-start")
	colIncIgv.appendChild(switchIncIgv)

	const marcadorIncIgv = document.createElement("input")
	marcadorIncIgv.type = "checkbox"
	marcadorIncIgv.setAttribute("class", "form-check-input")
	marcadorIncIgv.setAttribute("role", "switch")
	marcadorIncIgv.setAttribute("data-type", "inc-igv")
	switchIncIgv.appendChild(marcadorIncIgv)

	const etiquetaIncIgv = document.createElement("label")
	etiquetaIncIgv.setAttribute("class", "form-check-label")
	etiquetaIncIgv.appendChild(document.createTextNode("Inc. IGV"))
	switchIncIgv.appendChild(etiquetaIncIgv)

	const colSubtotal = document.createElement("div")
	colSubtotal.setAttribute("class", "col-7 text-end p-0 m-0")
	rowTotales.appendChild(colSubtotal)

	const groupSubtotal = document.createElement("div")
	groupSubtotal.setAttribute("class", "input-group")
	colSubtotal.appendChild(groupSubtotal)

	groupSubtotal.appendChild(etiquetaMoneda.cloneNode(true))

	const entradaSubtotal = document.createElement("input")
	entradaSubtotal.type = "number"
	entradaSubtotal.placeholder = "Subtotal"
	entradaSubtotal.setAttribute("readonly", "true")
	entradaSubtotal.setAttribute("class", "form-control")
	entradaSubtotal.setAttribute("aria-label", "Subtotal")
	entradaSubtotal.setAttribute("data-type", "line-extension-amount")
	groupSubtotal.appendChild(entradaSubtotal)

	const reemplazable = items.getElementsByClassName("replaceable")[0]
	if(reemplazable) {
		reemplazable.remove()
	}

	entradaSubtotal.onkeyup = entradaCantidad.onkeyup = entradaValorUnitario.onkeyup = marcadorIncIgv.onchange = function() {
		calcular(entradaSubtotal, entradaCantidad, entradaValorUnitario, marcadorIncIgv)
	}
}

function calcular(entradaSubtotal, entradaCantidad, entradaValorUnitario, marcadorIncIgv) {
	if(entradaCantidad.value.trim().length == 0 || entradaValorUnitario.value.trim().length == 0) {
		entradaSubtotal.value = ""
		return
	}

	const igvPercentage = 18
	let unitValue

	let uv = parseFloat(entradaValorUnitario.value)
	if(!marcadorIncIgv.checked) {
		unitValue = uv
	}
	else {
		if(isNaN(igvPercentage)) {
			throw new Error("Se requiere previamente porcentaje del IGV.")
		}
		unitValue = uv / ( 1 + igvPercentage / 100 )
	}

	entradaSubtotal.value = ( parseFloat(entradaCantidad.value) * unitValue ).toFixed(2)
	calcOperations()
}

function calcOperations() {
	const form = document.getElementById("formulario")
	const items = document.getElementsByClassName("item")

	const igvPercentage = 18

	const amounts = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

	for(const item of items) {
		let unitValue

		let uv = parseFloat(item.querySelector("[data-type='unit-value']").value)
		if(item.querySelector("[data-type='inc-igv']").checked) {
			unitValue = uv / ( 1 + igvPercentage / 100 )
		}
		else {
			unitValue = uv
		}
		let lineExtensionAmount = parseFloat(item.querySelector("[data-type='quantity']").value) * unitValue

		amounts[0] += lineExtensionAmount
		amounts[4] += lineExtensionAmount * 0.18
	}

	form.elements["gravado-global"].value = amounts[0].toFixed(2)

	form.elements["igv-global"].value = amounts[4].toFixed(2)

	form.elements["total-global"].value = ( amounts[0] + amounts[1] + amounts[2] + amounts[3] + amounts[4] + amounts[5] + amounts[6] ).toFixed(2)
}

function showItemEditor() {
	let modal = new bootstrap.Modal("#edicionAvanzadaItem")
	modal.show()
}

function autoRemoveItem() {
	const item = this.parentNode.parentNode.parentNode.parentNode
	Notiflix.Confirm.show("Eliminando ítem", "¿Desea eliminar el ítem?", "Sí", "No",
		function() {
			const items = item.parentNode
			item.remove()
			calcOperations()
			if(items.childElementCount == 0) {
				const ayuda = document.createElement("i")
				ayuda.appendChild(document.createTextNode("Acá aparecerán ítems agregados."))
				const replaceable = document.createElement("div")
				replaceable.setAttribute("class", "p-4 text-center replaceable")
				replaceable.appendChild(ayuda)
				items.appendChild(replaceable)
			}
		}
	)
}

function generatePaillier() {
	const { publicKey, privateKey } = generateRandomKeysSync(1024)

	const publicKeyDer = window.Encoding.hexToBuf(
		ASN1.Any('30' // session Sequence
			, ASN1.Any('02', window.Encoding.numToHex(publicKey.n))
			, ASN1.Any('02', window.Encoding.numToHex(publicKey.g))
		)
	)
	const publicKeyDerData = '-----BEGIN PAILLIER PUBLIC KEY-----\n'
		+ window.Encoding.bufToBase64(publicKeyDer).match(/.{1,64}/g).join('\n') + '\n'
		+ '-----END PAILLIER PUBLIC KEY-----'

	const privateKeyDer = window.Encoding.hexToBuf(
		ASN1.Any('30' // session Sequence
			, ASN1.Any('02', window.Encoding.numToHex(privateKey.lambda))
			, ASN1.Any('02', window.Encoding.numToHex(privateKey.mu))
			, ASN1.Any('02', window.Encoding.numToHex(publicKey.n))
			, ASN1.Any('02', window.Encoding.numToHex(publicKey.g))
			, ASN1.Any('02', window.Encoding.numToHex(privateKey._p))
			, ASN1.Any('02', window.Encoding.numToHex(privateKey._q))
		)
	)
	const privateKeyDerData = '-----BEGIN PAILLIER PRIVATE KEY-----\n'
		+ window.Encoding.bufToBase64(privateKeyDer).match(/.{1,64}/g).join('\n') + '\n'
		+ '-----END PAILLIER PRIVATE KEY-----'

	document.getElementById("paillier-publico").value = publicKeyDerData
	document.getElementById("paillier-privado").value = privateKeyDerData
}

function imprimirFecha(fecha, conHora = true) {
	let dateString = ("0" + fecha.getDate()).slice(-2) + "/" + ("0" + (fecha.getMonth()+1)).slice(-2) + "/" + fecha.getFullYear()
	//Ahora la hora
	if(conHora) {
		dateString += " " + ("0" + fecha.getHours()).slice(-2) + ":" + ("0" + fecha.getMinutes()).slice(-2) + ":" + ("0" + fecha.getSeconds()).slice(-2)
	}

	return dateString
}

function completeDataCustomer(input) {
	let val = input.value,
		list = input.getAttribute("list"),
		opts = document.getElementById(list).childNodes

		for(let i = 0; i < opts.length; ++i) {
			if(opts[i].value === val) {
				document.getElementById("customer-name").value = opts[i].getAttribute("data-name")
				document.getElementById("customer-address").value = opts[i].getAttribute("data-address")
				document.getElementById("customer-identification-type").value = opts[i].getAttribute("data-type")
				input.setAttribute("data-chosen", "1")
				break
			}
		}
}

var monedas = new Map()
monedas.set("PEN", "Soles")
monedas.set("USD", "Dólares")
monedas.set("EUR", "Euros")

function generatePDF(id, width, scale = 2, quality = 0.8) {
	console.log('converting...')

	const opt = {
		margin:       1.5,
		filename:     'F002-00000003.pdf',
		image:        { type: 'jpeg', quality: quality },
		html2canvas:  { scale: scale, dpi: 300, width: width, letterRendering: true },
		jsPDF:        { unit: 'cm', format: 'a4', orientation: 'portrait' }
	}

	let element = document.getElementById(id)
	html2pdf().set(opt).from(element).save()
	//~ html2pdf().from(element).set(opt).toPdf().get('pdf').then(
		//~ function(pdf) {
			//~ const buffer = pdf.output('arraybuffer')
			//~ let zip = new JSZip()
			//~ zip.file("fact-01.pdf", buffer, {binary: true})

			//~ zip.generateAsync({type:"base64"}).then(function(base64) {
				//~ window.location = "data:application/zip;base64," + base64
			//~ }, function(err) {
				//~ Notiflix.Notify.failure(err)
			//~ })
		//~ }
	//~ )
}
