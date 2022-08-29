const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

const version = "0.0.1"
var app, fractuyo

"use strict"

/**
 * State machine and all together.
 */
var Fractuyo = function() {
	var globalDirHandle
	var passcode, storage

	this.chooseDirHandle = async function() {
		globalDirHandle = await window.showDirectoryPicker()
	}

	this.setDirHandle = function(dirHandler) {
		if(dirHandler instanceof FileSystemDirectoryHandle) {
			globalDirHandle = dirHandler
			return
		}

		throw new Error("No es directorio.")
	}

	/**
	 * View if everything needed is inside.
	 */
	this.checkDirHandle = async function(ruc) {
		let fileHandle, file, content

		fileHandle = await globalDirHandle.getFileHandle("data.bin", {})
		file = await fileHandle.getFile()
		content = await file.arrayBuffer()
		return content
	}

	this.saveData = async function(form) {
		const ruc = form.elements.ruc.value.trim()
		if(!validateRuc(ruc)) {
			Notiflix.Report.warning(
				"RUC inválido",
				"El número de RUC no existe.",
				"Aceptar"
			)
			return
		}
		if(globalDirHandle == undefined) {
			Notiflix.Report.warning(
				"Falta directorio",
				"Debes elegir una carpeta en tu dispositivo para almacenar todos los datos de este formulario.",
				"Aceptar"
			)
			return
		}

		let data = ruc + form.elements.nombre.value.trim()

		await Notiflix.Confirm.prompt(
			"Seguridad de datos",
			"Escribe contraseña nueva", "",
			"Guardar", "Cancelar",
			async (pin) => {
				await passcode.setupPasscode(pin)
				let encryptedRuc = await passcode.encryptSession(ruc)
				const oSession = {
					ruc: encryptedRuc,
					dir: globalDirHandle
				}
				storage.add(oSession)

				let encryptedData = await passcode.encryptSession(data)

				let fileHandle = await globalDirHandle.getFileHandle("data.bin", { create: true })

				const writable = await fileHandle.createWritable()

				await writable.write(encryptedData)
				await writable.close()
			}
		)
	}

	this.initData = function(event) {
		storage.setDb(event.target.result)
		storage.countRegisters(block, guide)
	}

	this.init = function() {
		passcode = new Passcode()
		storage = new Storage(this)
	}

	var block = function(count) {
		console.log("Hay", count, "registros.")
	}

	var guide = function() {
		Notiflix.Report.info(
			"Bienvenido a Fractuyo",
			"Debes configurar una cuenta de negocios para empezar a generar tus comprobantes de pago.",
			"Aceptar"
		)
	}

	this.createInvoice = async function() {
		if(globalDirHandle == undefined) {
			Notiflix.Report.warning(
				"Falta directorio",
				"Debes elegir una carpeta en tu dispositivo para almacenar todos los datos de este formulario.",
				"Aceptar"
			)
			return
		}

		const invoice = new Invoice()
		invoice.setSerie("F001")
		invoice.setNumeration(7357)
		// Find directory structure
		let handleDirectoryDocs = await globalDirHandle.getDirectoryHandle("docs", { create: true })
		let handleDirectoryXml = await handleDirectoryDocs.getDirectoryHandle("xml", { create: true })

		let fileHandle = await handleDirectoryXml.getFileHandle(invoice.getId() + ".xml", { create: true })

		const writable = await fileHandle.createWritable()

		await writable.write("<contenido XML></contenido XML>")
		await writable.close()
	}
}

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

/**
 * For managing encrypted "sessions".
 * @ref https://www.tutorialspoint.com/html5/html5_indexeddb.htm
 */
var Storage = function(fractuyo) {
	var db

	var request = window.indexedDB.open("business", 1)

	request.onerror = function(event) {
		console.log("error: ");
	}

	request.onsuccess = fractuyo.initData

	this.setDb = function(indexeddb) {
		db = indexeddb
	}

	request.onupgradeneeded = function(event) {
		db = event.target.result;
		let objectStore = db.createObjectStore("session", {keyPath: "ruc"})
		objectStore.createIndex("ruc", "ruc", { unique: true })
	}

	this.add = function(oSession) {
		var request = db.transaction(["session"], "readwrite")
			.objectStore("session")
			//~ .add({ ruc: "20606...", dir: FileHandler })
			.add(oSession)

		request.onsuccess = function(event) {
			Notiflix.Report.success("Datos guardados.", "Ahora podrás usar Fractuyo con los datos proporcionados.")
		}

		request.onerror = function(event) {
			alert("Unable to add data.");
		}
	}

	this.readAll = async function(oPasscode, passcode, ruc) {
		let objectStore = db.transaction("session").objectStore("session");
		objectStore.openCursor().onsuccess = async function(event) {
			let cursor = event.target.result

			if(cursor) {
				try {
					fractuyo.setDirHandle(cursor.dir)
					const dataEncrypted = await fractuyo.checkDirHandle(ruc)
					const isDecrypted = await oPasscode.decryptSession(passcode, ruc, dataEncrypted)

					if( isDecrypted ) {
						return
					}
					cursor.continue()
				}
				catch(e) {
					//There's no directory or data inside is wrong
					Notiflix.Report.failure("Error de directorio", "Hay inconsistencias de datos y se ha detenido la operación", "Aceptar")
				}
			}
			else {
				return null
			}
		}
	}

	this.countRegisters = function(fnFull, fnEmpty) {
		const request = db.transaction(["session"], "readonly")
		const objectStore = request.objectStore("session")

		const myIndex = objectStore.index("ruc")
		const countRequest = myIndex.count()
		countRequest.onsuccess = () => {
			if(countRequest.result == 0) {
				fnEmpty()
			}
			else {
				fnFull(countRequest.result)
			}
		}
	}

	this.remove = function() {
	}
}

/**
 * For encrypting secret data.
 * @ref https://github.com/Ajaxy/telegram-tt/blob/master/src/util/passcode.ts
 */
var Passcode = function() {
	var SALT = "[salt]FRACTUYO"
	var IV_LENGTH = 12

	var currentPasscodeHash

	var dataSession

	this.setupPasscode = async function(passcode) {
		currentPasscodeHash = await sha256(passcode)
	}

	/**
	 * Decrypt data that must be inside files.
	 * @passcode PIN or password
	 * @ruc
	 * @dataEncrypted is all serialized data needed.
	 */
	this.decryptSession = async function(passcode, ruc, dataEncrypted) {
		const passcodeHash = await sha256(passcode)
		currentPasscodeHash = passcodeHash

		const decryptedRuc = await aesDecrypt(dataEncrypted, passcodeHash)
		if( validateRuc( decryptedRuc ) && ruc == decryptedRuc ) {
			return false
		}

		const decryptedData = await aesDecrypt(dataEncrypted, passcodeHash)
		dataSession = decryptedData
		return true
	}

	this.getDataSession = function() {
		return dataSession
	}

	/**
	 * @data is all serialized data needed.
	 */
	this.encryptSession = async function(data) {
		if(!currentPasscodeHash) {
			throw new Error("Clave no asignada")
		}

		const sessionEncrypted = await aesEncrypt(data, currentPasscodeHash)
		return sessionEncrypted
	}

	var sha256 = function(plaintext) {
		return crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${plaintext}${SALT}`))
	}

	var aesEncrypt = async function(plaintext, pwHash) {
		const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
		const alg = { name: "AES-GCM", iv }
		const key = await crypto.subtle.importKey("raw", pwHash, alg, false, ["encrypt"])
		const ptUint8 = new TextEncoder().encode(plaintext)
		const ctBuffer = await crypto.subtle.encrypt(alg, key, ptUint8)
		const ct = new Uint8Array(ctBuffer)
		const result = new Uint8Array(IV_LENGTH + ct.length)
		result.set(iv, 0)
		result.set(ct, IV_LENGTH)
		return result.buffer
	}

	var aesDecrypt = async function(data, pwHash) {
		const dataArray = new Uint8Array(data)
		const iv = dataArray.slice(0, IV_LENGTH)
		const alg = { name: 'AES-GCM', iv }
		const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt'])
		const ct = dataArray.slice(IV_LENGTH)
		const plainBuffer = await crypto.subtle.decrypt(alg, key, ct)

		return new TextDecoder().decode(plainBuffer)
	}
}

var PaymentTerm = function() {
}

var Item = function(_description) {
	var description = _description

	this.getDescription = function() {
		return `<![CDATA[ ${description} ]]>`
	}
}

var Invoice = function() {
	var items = Array()
	var numeration, serie
	var typeCode, orderReference

	var paymentTerms = Array()

	this.ublVersion = "2.1"
	this.customizationId = "2.0"

	var xmlDocument

	/**
	 * Format serie and number: F000-00000001
	 */
	this.getId = function() {
		if(serie == undefined || numeration == undefined) {
			throw new Error("Serie o número incompletos.")
		}
		return serie + '-' + String(numeration).padStart(8, '0')
	}

	this.addPaymentTerm = function(paymentTerm) {
		paymentTerms.push(paymentTerm)
	}

	this.setUblVersion = function(ublVersion) {
		this.ublVersion = ublVersion
	}

	this.setSerie = function(_serie) {
		if(_serie.length != 4) {
			throw new Error("Serie inconsistente")
		}
		serie = _serie
	}

	this.setNumeration = function(number) {
		if(number > 0x5F5E0FF) {
			throw new Error("Numeración supera el límite.")
		}
		numeration = number
	}

	this.setId = function(serie, numeration) {
		this.setSerie(serie)
		this.setNumeration(numeration)
	}

	this.setTypeCode = function(code) {
		typeCode = code
	}

	this.addItem = function(item) {
		items.push(item)
	}

	this.getXml = function() {
		if(xmlDocument == undefined) {
			throw new Error("XML no creado.")
		}
		return xmlDocument
	}

	this.setOrderReference = function(reference) {
		orderReference = reference
	}

	this.toXml = function() {
		//We create elements using this: xmlDocument.createElement
		xmlDocument = document.implementation.createDocument("urn:oasis:names:specification:ubl:schema:xsd:Invoice-2", "Invoice")
		xmlDocument.documentElement.setAttribute("xmlns:cac", namespaces.cac)
		xmlDocument.documentElement.setAttribute("xmlns:cbc", namespaces.cbc)
		xmlDocument.documentElement.setAttribute("xmlns:ds", namespaces.ds)
		xmlDocument.documentElement.setAttribute("xmlns:ext", namespaces.ext)

		const extUblExtensions = xmlDocument.createElementNS(namespaces.ext, "ext:UBLExtensions")
		xmlDocument.documentElement.appendChild(extUblExtensions)

		const extUblExtension = xmlDocument.createElementNS(namespaces.ext, "ext:UBLExtension")
		extUblExtensions.appendChild(extUblExtension)

		const extExtensionContent = xmlDocument.createElementNS(namespaces.ext, "ext:ExtensionContent")
		extUblExtension.appendChild(extExtensionContent)

		const cbcUblVersionId = xmlDocument.createElementNS(namespaces.ext, "cbc:UBLVersionID")
		cbcUblVersionId.appendChild( document.createTextNode(this.ublVersion) )
		xmlDocument.documentElement.appendChild(cbcUblVersionId)

		const cbcCustomizationId = xmlDocument.createElementNS(namespaces.ext, "cbc:CustomizationID")
		cbcCustomizationId.appendChild( document.createTextNode(this.customizationId) )
		xmlDocument.documentElement.appendChild(cbcCustomizationId)

		const cbcId = xmlDocument.createElementNS(namespaces.ext, "cbc:ID")
		cbcId.appendChild( document.createTextNode(this.getId()) )
		xmlDocument.documentElement.appendChild(cbcId)

		const cbcInvoiceTypeCode = xmlDocument.createElementNS(namespaces.ext, "cbc:InvoiceTypeCode")
		cbcInvoiceTypeCode.setAttribute("listID", "0101")
		cbcInvoiceTypeCode.appendChild( document.createTextNode(typeCode) )
		xmlDocument.documentElement.appendChild(cbcInvoiceTypeCode)

		if(orderReference) {
			const cacOrderReference = xmlDocument.createElementNS(namespaces.ext, "cac:OrderReference")
			xmlDocument.documentElement.appendChild(cacOrderReference)

			const cbcId = xmlDocument.createElementNS(namespaces.ext, "cbc:ID")
			cbcId.appendChild( document.createTextNode(orderReference) )
			cacOrderReference.appendChild(cbcId)
		}

		console.log( new XMLSerializer().serializeToString(xmlDocument) )
	}

	this.sign = async function() {
		if(xmlDocument == undefined) {
			throw new Error("Documento XML no existe.")
		}
		const alg = getAlgorithm();

		// Read cert
		const certPem = document.getElementById("cert").value
		const certDer = pem2der(certPem)

		// Read key
		const keyPem = document.getElementById("pkey").value
		const keyDer = pem2der(keyPem);
		const key = await window.crypto.subtle.importKey("pkcs8", keyDer, alg, true, ["sign"]);

		const x509 = preparePem(certPem);

		var transforms = [];
		if (isEnveloped())
			transforms.push("enveloped");
		transforms.push(getCanonMethod());
		console.log(transforms);

		Promise.resolve()
			.then(function () {
				return generateKey(alg);
			})
			.then(function () {
				const signature = new XAdES.SignedXml();

				return signature.Sign(
					alg,        // algorithm
					key,        // key
					xmlDocument,// document
					{                                       // options
						//~ keyValue: useKeyValue() ? keys.publicKey : void 0,
						references: [
							{ uri: "", hash: getHashAlgorithm(), transforms: transforms }
						],
						x509: [x509],
						//~ signerRole: { claimed: ["BOSS"] },
						signingCertificate: x509
					});
			})
			.then(function (signature) {
				// Add signature to document
				const xmlEl = xmlDocument.getElementsByTagNameNS("urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2", "ExtensionContent")[0]
				xmlEl.appendChild(signature.GetXml())
				console.log(new XMLSerializer().serializeToString(xmlDocument))
			})
			.catch(function (e) {
				console.error(e);
			});
	}
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

		sum +=  currentFactor * parseInt( ruc.charAt(i) )
	}

	if( ( 11 - ( sum % 11 ) ) % 10 == parseInt(ruc.charAt(10)) ) {
		return true
	}
	return false
}

async function revisarSesion() {
	await Notiflix.Confirm.prompt(
		"Seguridad de datos",
		"Escribe contraseña nueva", "",
		"Descifrar", "Cancelar",
		async (pin) => {
			let encryptedRuc = _base64ToArrayBuffer( window.localStorage.getItem("ruc") )
			let decryptedRuc = await passcode.decryptSession(pin, encryptedRuc)
			debugger
		}
	)
}

//https://stackoverflow.com/a/9458996
function _arrayBufferToBase64( buffer ) {
	var binary = '';
	var bytes = new Uint8Array( buffer );
	var len = bytes.byteLength;
	for (var i = 0; i < len; i++) {
		binary += String.fromCharCode( bytes[ i ] );
	}
	return window.btoa( binary );
}

function _base64ToArrayBuffer(base64) {
	var binary_string = window.atob(base64);
	var len = binary_string.length;
	var bytes = new Uint8Array(len);
	for (var i = 0; i < len; i++) {
		bytes[i] = binary_string.charCodeAt(i);
	}
	return bytes.buffer;
}
