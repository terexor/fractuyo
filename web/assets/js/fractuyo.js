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
	var passcode, storage, /*current*/company

	this.chooseDirHandle = async function() {
		globalDirHandle = await window.showDirectoryPicker()
	}

	this.setDirHandle = async function(dirHandler) {
		if(dirHandler instanceof FileSystemDirectoryHandle) {
			globalDirHandle = dirHandler

			//https://stackoverflow.com/a/66500919
			const options = {
				mode: "readwrite"
			}
			// Check if permission was already granted. If so, return true.
			if((await globalDirHandle.queryPermission(options)) === "granted") {
				return true
			}
			// Request permission. If the user grants permission, return true.
			if ((await globalDirHandle.requestPermission(options)) === "granted") {
				return true
			}
			// The user didn't grant permission, so return false.
			return false
		}

		throw new Error("No es directorio.")
	}

	/**
	 * View if everything needed is inside and load it.
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

		const name = form.elements.nombre.value.trim()
		const address = form.elements.direccion.value.trim()
		const solUser = form.elements.usuario.value.trim()
		const solPass = form.elements.clave.value.trim()
		const cer = form.elements.cert.value.trim()
		const key = form.elements.key.value.trim()

		//Getting size and appending using 16 bits (x6) after RUC
		const sizes = String.fromCharCode(name.length, address.length, solUser.length, solPass.length, cer.length, key.length)

		const data = ruc
			+ sizes
			+ name + address + solUser + solPass + cer + key

		await Notiflix.Confirm.prompt(
			"Seguridad de datos",
			"Escribe contraseña nueva", "",
			"Guardar", "Cancelar",
			async (pin) => {
				await passcode.setupPasscode(pin)
				const oSession = {
					ruc: ruc,
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
		company = new Company()
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

	this.createInvoice = async function(formulario) {
		if(globalDirHandle == undefined) {
			Notiflix.Report.warning(
				"Falta directorio",
				"Debes elegir una carpeta en tu dispositivo para almacenar todos los datos de este formulario.",
				"Aceptar"
			)
			return
		}

		const invoice = new Invoice(company)
		invoice.setSerie(formulario.elements["serie"].value)
		invoice.setTypeCode(formulario.elements["type-code"].value)
		invoice.setNumeration(7357)
		invoice.setOrderReference("11")
		invoice.toXml()
		await invoice.sign()
		// Find directory structure
		let handleDirectoryDocs = await globalDirHandle.getDirectoryHandle("docs", { create: true })
		let handleDirectoryXml = await handleDirectoryDocs.getDirectoryHandle("xml", { create: true })

		let fileHandle = await handleDirectoryXml.getFileHandle(invoice.getId() + ".xml", { create: true })

		const writable = await fileHandle.createWritable()

		await writable.write(new XMLSerializer().serializeToString(invoice.getXml()))
		await writable.close()
	}

	this.lock = function() {
		company.clearData()
		document.getElementById("company-tag").textContent = "Nombre encriptado"
		document.getElementById("ruc-tag").textContent = "RUC encriptado"
		app.navigate("/bloqueo")
	}

	this.unlock = async function(form) {
		passcode.setupPasscode(form.elements.clave.value.trim())
		await storage.read(form.elements.ruc.value.trim())
	}

	var populateCompanyData = function(decryptedSession) {
		let sizeIndex = 11 //We start position after RUC
		let startCutter = 0, endCutter = 11 //substring range

		company.setRuc(decryptedSession.substring(startCutter, endCutter))
		startCutter += 17
		endCutter = startCutter + decryptedSession.charCodeAt(sizeIndex)
		company.setName(decryptedSession.substring(startCutter, endCutter))
		startCutter = endCutter
		endCutter = startCutter + decryptedSession.charCodeAt(++sizeIndex)
		company.setAddress(decryptedSession.substring(startCutter, endCutter))
		startCutter = endCutter
		endCutter = startCutter + decryptedSession.charCodeAt(++sizeIndex)
		company.setSolUser(decryptedSession.substring(startCutter, endCutter))
		startCutter = endCutter
		endCutter = startCutter + decryptedSession.charCodeAt(++sizeIndex)
		company.setSolPass(decryptedSession.substring(startCutter, endCutter))
		startCutter = endCutter
		endCutter = startCutter + decryptedSession.charCodeAt(++sizeIndex)
		company.setCert(decryptedSession.substring(startCutter, endCutter))
		startCutter = endCutter
		endCutter = startCutter + decryptedSession.charCodeAt(++sizeIndex)
		company.setKey(decryptedSession.substring(startCutter, endCutter))

		//Modify in view
		document.getElementById("company-tag").textContent = company.getName()
		document.getElementById("ruc-tag").textContent = company.getRuc()
	}

	this.handleUnlocked = async function(event) {
		if(event.target.result) {
			try {
				await fractuyo.setDirHandle(event.target.result.dir)
				const encryptedData = await fractuyo.checkDirHandle()
				await passcode.decryptSession(encryptedData)

				populateCompanyData(passcode.getDataSession())

				Notiflix.Notify.success("Desencriptado para " + company.getName())

				app.navigate("/")
			}
			catch(e) {
				Notiflix.Notify.failure("Intento incorrecto")
				console.error(e)
			}
		}
		else {
			Notiflix.Notify.warning("No hay datos.")
		}
	}

	this.viewData = function() {
		return passcode.getDataSession()
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

var Company = function() {
	var name, ruc
	var cert, key
	var solUser, solPass
	var address

	this.getName = function(withCdata = false) {
		return withCdata ? `<![CDATA[ ${name} ]]>` : name
	}

	this.setName = function(n) {
		name = n
	}

	this.setRuc = function(r) {
		if(validateRuc(r)) {
			ruc = r
			return
		}
		throw new Error("RUC inconsistente.")
	}

	this.getRuc = function() {
		return ruc
	}

	this.setCert = function(c) {
		cert = c
	}

	this.getCert = function() {
		return cert
	}

	this.getKey = function() {
		return key
	}

	this.getKey = function() {
		return key
	}

	this.setKey = function(k) {
		key = k
	}

	this.setSolUser = function(su) {
		solUser = su
	}

	this.setSolPass = function(sp) {
		solPass = sp
	}

	this.setAddress = function(a) {
		address = a
	}

	this.clearData = function() {
		name = ruc = cert = key = null
	}
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
		const request = db.transaction(["session"], "readwrite")
			.objectStore("session")
			.add(oSession)

		request.onsuccess = function(event) {
			Notiflix.Report.success("Datos guardados.", "Ahora podrás usar Fractuyo con los datos proporcionados.")
		}

		request.onerror = function(event) {
			alert("Unable to add data.");
		}
	}

	this.read = async function(ruc) {
		let objectStore = db.transaction(["session"]).objectStore("session")
		let request = objectStore.get(ruc)

		request.onerror = function(event) {
			alert("Unable to retrieve data from database!");
		}

		request.onsuccess = fractuyo.handleUnlocked
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

	this.remove = function(ruc) {
		const request = db.transaction(["session"], "readwrite")
			.objectStore("session")
			.delete(ruc)

		request.onsuccess = function(event) {
			Notiflix.Notify.success("Directorio y RUC de " + ruc + " quitados.")
		}
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
	this.decryptSession = async function(dataEncrypted) {
		const decryptedData = await aesDecrypt(dataEncrypted, currentPasscodeHash)

		dataSession = decryptedData
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
		const alg = { name: "AES-GCM", iv }
		const key = await crypto.subtle.importKey("raw", pwHash, alg, false, ["decrypt"])
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

var Invoice = function(company) {
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

		const cbcUblVersionId = xmlDocument.createElementNS(namespaces.cbc, "cbc:UBLVersionID")
		cbcUblVersionId.appendChild( document.createTextNode(this.ublVersion) )
		xmlDocument.documentElement.appendChild(cbcUblVersionId)

		const cbcCustomizationId = xmlDocument.createElementNS(namespaces.cbc, "cbc:CustomizationID")
		cbcCustomizationId.appendChild( document.createTextNode(this.customizationId) )
		xmlDocument.documentElement.appendChild(cbcCustomizationId)

		const cbcId = xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
		cbcId.appendChild( document.createTextNode(this.getId()) )
		xmlDocument.documentElement.appendChild(cbcId)

		const cbcInvoiceTypeCode = xmlDocument.createElementNS(namespaces.cbc, "cbc:InvoiceTypeCode")
		cbcInvoiceTypeCode.setAttribute("listID", "0101")
		cbcInvoiceTypeCode.appendChild( document.createTextNode(typeCode) )
		xmlDocument.documentElement.appendChild(cbcInvoiceTypeCode)

		if(orderReference) {
			const cacOrderReference = xmlDocument.createElementNS(namespaces.cac, "cac:OrderReference")
			xmlDocument.documentElement.appendChild(cacOrderReference)

			const cbcId = xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
			cbcId.appendChild( document.createTextNode(orderReference) )
			cacOrderReference.appendChild(cbcId)
		}

		{ //Signer data
			const cacSignature = xmlDocument.createElementNS(namespaces.cbc, "cac:Signature")
			xmlDocument.documentElement.appendChild(cacSignature)

			const cbcId = xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
			cbcId.appendChild( document.createTextNode(company.getRuc()) )
			cacSignature.appendChild(cbcId)

			{
				const cacSignatoreParty = xmlDocument.createElementNS(namespaces.cac, "cac:SignatoreParty")
				cacSignature.appendChild(cacSignatoreParty)

				const cacPartyIdentification = xmlDocument.createElementNS(namespaces.cac, "cac:PartyIdentification")
				cacSignatoreParty.appendChild(cacPartyIdentification)

				const cbcId = xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
				cbcId.appendChild( document.createTextNode(company.getRuc()) )
				cacPartyIdentification.appendChild(cbcId)

				const cacPartyName = xmlDocument.createElementNS(namespaces.cac, "cac:PartyName")
				cacSignatoreParty.appendChild(cacPartyName)

				const cbcName = xmlDocument.createElementNS(namespaces.cbc, "cbc:Name")
				cbcName.appendChild( document.createTextNode(company.getName(true)) )
				cacPartyName.appendChild(cbcName)
			}
		}
		{ //Supplier (current company)
			const cacAccountingSupplierParty = xmlDocument.createElementNS(namespaces.cbc, "cac:AccountingSupplierParty")
			xmlDocument.documentElement.appendChild(cacAccountingSupplierParty)

			const cacParty = xmlDocument.createElementNS(namespaces.cbc, "cac:Party")
			cacAccountingSupplierParty.appendChild(cacParty)

			const cacPartyIdentification = xmlDocument.createElementNS(namespaces.cbc, "cac:PartyIdentification")
			cacParty.appendChild(cacPartyIdentification)

			const cbcId = xmlDocument.createElementNS(namespaces.cbc, "cbc:ID")
			cbcId.setAttribute("schemeID", "6")
			cbcId.setAttribute("schemeName", "PE:SUNAT")
			cbcId.setAttribute("schemeURI", "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06")
			cbcId.appendChild( document.createTextNode(company.getRuc()) )
			cacPartyIdentification.appendChild(cbcId)

			const cacPartyName = xmlDocument.createElementNS(namespaces.cbc, "cac:PartyName")
			cacParty.appendChild(cacPartyName)
		}
	}

	this.sign = async function(algorithmName, isEnveloped = true, hashAlgorithm = "SHA-256", canonMethod = "c14n") {
		if(xmlDocument == undefined) {
			throw new Error("Documento XML no existe.")
		}
		const alg = getAlgorithm(algorithmName)

		// Read cert
		const certDer = pem2der(company.getCert())

		// Read key
		const keyDer = pem2der(company.getKey())
		const key = await window.crypto.subtle.importKey("pkcs8", keyDer, alg, true, ["sign"])

		const x509 = preparePem(company.getCert())

		const transforms = []
		if(isEnveloped) {
			transforms.push("enveloped")
		}
		transforms.push(canonMethod)

		return Promise.resolve()
			.then(function () {
				const signature = new XAdES.SignedXml()

				return signature.Sign(
					alg,        // algorithm
					key,        // key
					xmlDocument,// document
					{           // options
						references: [
							{ uri: "", hash: hashAlgorithm, transforms: transforms }
						],
						x509: [x509],
						//~ signerRole: { claimed: ["BOSS"] },
						signingCertificate: x509
					}
				)
			})
			.then(function(signature) {
				// Add signature to document
				const xmlEl = xmlDocument.getElementsByTagNameNS("urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2", "ExtensionContent")[0]
				xmlEl.appendChild(signature.GetXml())
				return true
			})
			.catch(function (e) {
				console.error(e)
				return false
			})
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
