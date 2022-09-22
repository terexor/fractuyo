/**
 * State machine and all together.
 */
var Fractuyo = function() {
	var globalDirHandle
	var passcode, storage, taxpayer
	var dbCustomer, dbProduct

	this.getDbCustomer = function() {
		return dbCustomer
	}

	this.getDbProduct = function() {
		return dbProduct
	}

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
		let contentArray = new Array()

		fileHandle = await globalDirHandle.getFileHandle("session.bin", {})
		file = await fileHandle.getFile()
		content = await file.arrayBuffer()
		contentArray.push(content)

		try {
			fileHandle = await globalDirHandle.getFileHandle("customer.dat", {})
			file = await fileHandle.getFile()
			content = await file.getText()
			contentArray.push(content)
		}
		catch(e) {
			contentArray.push(null)
			if(e.name == "SyntaxError") {
				Notiflix.Notify.warning("Archivo no tiene estructura.")
			}
			else {
				console.log(e)
			}
		}

		try {
			fileHandle = await globalDirHandle.getFileHandle("product.dat", {})
			file = await fileHandle.getFile()
			content = await file.getText()
			contentArray.push(content)
		}
		catch(e) {
			contentArray.push(null)
			if(e.name == "SyntaxError") {
				Notiflix.Notify.warning("Archivo no tiene estructura.")
			}
			else {
				console.log(e)
			}
		}

		return contentArray
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

				let fileHandle = await globalDirHandle.getFileHandle("session.bin", { create: true })

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
		taxpayer = new Taxpayer()
	}

	var block = function(count) {
		Notiflix.Report.success(
			"Hay " + count + " registros",
			"Debes desbloquear los datos para generar tus comprobantes de pago.",
			"Desbloquear",
			() => {
				app.navigate("/bloqueo")
			}
		)
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

		const items = document.getElementsByClassName("item")
		if(items == undefined || items.length == 0) {
			Notiflix.Report.warning(
				"No hay ítems",
				"No se puede procesar un comprobante de pago sin elementos.",
				"Aceptar"
			)
			return
		}

		const customer = new Person()
		customer.setName(formulario.elements["customer-name"].value.trim())
		try {
			customer.setIdentification(new Identification().setIdentity(formulario.elements["customer-identification"].value.trim(), formulario.elements["customer-identification-type"].value))
		}
		catch(e) {
			Notiflix.Report.warning("Inconsistencia", e.message, "Aceptar")
			return
		}

		const invoice = new Invoice(taxpayer, customer)

		let productIndex = 0
		try {
			for(const item of items) {
				++productIndex
				const product = new Item(item.getElementsByTagName("textarea")[0].value.trim())
				product.setQuantity(item.querySelector("[data-type='quantity']").value.trim())
				invoice.addItem(product)
			}
		}
		catch(e) {
			Notiflix.Report.warning(
				`Ítem ${productIndex} con error`,
				e.message,
				"Aceptar"
			)
			return
		}

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

		Notiflix.Report.success("CPE creado", "Se ha guardado el documento " + invoice.getId() + ".", "Aceptar")
	}

	this.lock = function() {
		taxpayer.clearData()
		document.getElementById("company-tag").textContent = "Nombre encriptado"
		document.getElementById("ruc-tag").textContent = "RUC encriptado"
		app.navigate("/bloqueo")
	}

	this.unlock = async function(form) {
		passcode.setupPasscode(form.elements.clave.value.trim())
		const ruc = form.elements.ruc.value.trim()
		if(validateRuc(ruc)) {
			await storage.read(ruc)
			return
		}
		Notiflix.Notify.warning("RUC no es válido.")
	}

	var populateTaxpayerData = function(decryptedSession) {
		let sizeIndex = 11 //We start position after RUC
		let startCutter = 0, endCutter = 11 //substring range

		taxpayer.setIdentification( new Identification().setIdentity( decryptedSession.substring(startCutter, endCutter), 6 ) )
		startCutter += 17
		endCutter = startCutter + decryptedSession.charCodeAt(sizeIndex)
		taxpayer.setName(decryptedSession.substring(startCutter, endCutter))
		startCutter = endCutter
		endCutter = startCutter + decryptedSession.charCodeAt(++sizeIndex)
		taxpayer.setAddress(decryptedSession.substring(startCutter, endCutter))
		startCutter = endCutter
		endCutter = startCutter + decryptedSession.charCodeAt(++sizeIndex)
		taxpayer.setSolUser(decryptedSession.substring(startCutter, endCutter))
		startCutter = endCutter
		endCutter = startCutter + decryptedSession.charCodeAt(++sizeIndex)
		taxpayer.setSolPass(decryptedSession.substring(startCutter, endCutter))
		startCutter = endCutter
		endCutter = startCutter + decryptedSession.charCodeAt(++sizeIndex)
		taxpayer.setCert(decryptedSession.substring(startCutter, endCutter))
		startCutter = endCutter
		endCutter = startCutter + decryptedSession.charCodeAt(++sizeIndex)
		taxpayer.setKey(decryptedSession.substring(startCutter, endCutter))

		//Modify in view
		document.getElementById("company-tag").textContent = taxpayer.getName()
		document.getElementById("ruc-tag").textContent = taxpayer.getIdentification().getNumber()
	}

	var populateDatabases = function(decryptedDatabases) {
		if(decryptedDatabases[0] != null) {
			dbProduct = TAFFY( JSON.parse(decryptedDatabases[0]) )
		}
		if(decryptedDatabases[1] != null) {
			dbCustomer = TAFFY( JSON.parse(decryptedDatabases[1]) )
		}
	}

	this.handleUnlocked = async function(event) {
		if(event.target.result) {
			try {
				await fractuyo.setDirHandle(event.target.result.dir)
				const encryptedDataArray = await fractuyo.checkDirHandle()
				await passcode.decryptSession(encryptedDataArray)

				populateTaxpayerData(passcode.getDataSession())
				populateDatabases(passcode.getDataBases())

				Notiflix.Notify.success("Desencriptado para " + taxpayer.getName() + ".")

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

	this.isUsable = function() {
		return taxpayer.getKey() != null
	}
}
