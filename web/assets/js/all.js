const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

const version = "0.0.1"
var app, fractuyo

"use strict"

window.onload = function() {
	console.log("\ud83d\ude92 FracTuyo -", version)

	fractuyo = new Fractuyo()
	fractuyo.init()

	app = new senna.App()
	app.addSurfaces(["navegador", "lienzo"])
	app.addRoutes([
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
		}
	})
}



/* Datos y funciones útiles */
const namespaces = {
	cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
	cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
	ds: "http://www.w3.org/2000/09/xmldsig#",
	ext: "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
}

function validateRuc(ruc) {
	if( parseInt(ruc) < 11 ) {
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

//https://stackoverflow.com/a/9458996
function _arrayBufferToBase64( buffer ) {
	var binary = ''
	var bytes = new Uint8Array( buffer )
	var len = bytes.byteLength
	for (var i = 0; i < len; i++) {
		binary += String.fromCharCode( bytes[ i ] )
	}
	return window.btoa( binary )
}

function _base64ToArrayBuffer(base64) {
	var binary_string = window.atob(base64)
	var len = binary_string.length
	var bytes = new Uint8Array(len)
	for (var i = 0; i < len; i++) {
		bytes[i] = binary_string.charCodeAt(i)
	}
	return bytes.buffer;
}

function preparePem(pem) {
	return pem
		// remove BEGIN/END
		.replace(/-----(BEGIN|END)[\w\d\s]+-----/g, "")
		// remove \r, \n
		.replace(/[\r\n]/g, "")
}

function pem2der(pem) {
	pem = preparePem(pem)
	// convert base64 to ArrayBuffer
	return _base64ToArrayBuffer(pem)
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
