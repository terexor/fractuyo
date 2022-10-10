/**
 * State machine and all together.
 */
var Fractuyo = function() {
	var globalDirHandle
	var passcode, storage, taxpayer
	var SQL
	var dbModules //Storing module tables
	var dbInvoices //Storing a single table with header and footer of the invoice

	this.getDbModules = function() {
		return dbModules
	}

	this.getDbInvoices = function() {
		return dbInvoices
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
		let encryptedDataSession = await file.arrayBuffer()

		try {
			fileHandle = await globalDirHandle.getFileHandle("invoices.dat", {})
			file = await fileHandle.getFile()
			content = await file.arrayBuffer()
			dbCustomer = new SQL.Database(new Uint8Array(content))
		}
		catch(e) {
			Notiflix.Notify.warning("Faltan clientes.")
			console.log(e)
		}

		try {
			fileHandle = await globalDirHandle.getFileHandle("modules.dat", {})
			file = await fileHandle.getFile()
			content = await file.arrayBuffer()
			dbProduct = new SQL.Database(new Uint8Array(content))
		}
		catch(e) {
			Notiflix.Notify.warning("Faltan productos.")
			console.log(e)
		}

		return encryptedDataSession
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
		const tradename = form.elements.marca.value.trim()
		const country = form.elements.pais.value.trim()
		const address = form.elements.direccion.value.trim()
		const ubigeo = form.elements.ubigeo.value.trim()
		const local = form.elements.local.value.trim()
		const urbanizacion = form.elements.urbanizacion.value.trim()
		const departamento = form.elements.departamento.value.trim()
		const provincia = form.elements.provincia.value.trim()
		const distrito = form.elements.distrito.value.trim()
		const solUser = form.elements.usuario.value.trim()
		const solPass = form.elements.clave.value.trim()
		const cer = form.elements.cert.value.trim()
		const key = form.elements.key.value.trim()

		//Creating session file
		const der = window.Encoding.hexToBuf(
			ASN1.Any('30' // session Sequence
				, ASN1.Any('13', window.Encoding.strToHex(ruc))
				, ASN1.Any('13', window.Encoding.strToHex(name))
				, ASN1.Any('13', window.Encoding.strToHex(tradename))
				, ASN1.Any('30' // address Sequence
					, ASN1.Any('13', window.Encoding.strToHex(country))
					, ASN1.Any('13', window.Encoding.strToHex(ubigeo))
					, ASN1.Any('13', window.Encoding.strToHex(local))
					, ASN1.Any('13', window.Encoding.strToHex(urbanizacion))
					, ASN1.Any('13', window.Encoding.strToHex(departamento))
					, ASN1.Any('13', window.Encoding.strToHex(provincia))
					, ASN1.Any('13', window.Encoding.strToHex(distrito))
					, ASN1.Any('13', window.Encoding.strToHex(address))
				)
				, ASN1.Any('30' // sunat Sequence
					, ASN1.Any('13', window.Encoding.strToHex(solUser))
					, ASN1.Any('13', window.Encoding.strToHex(solPass))
				)
				, ASN1.Any('30' // signer Sequence
					, ASN1.Any('13', window.Encoding.strToHex(cer))
					, ASN1.Any('13', window.Encoding.strToHex(key))
				)
				//~ , ASN1.Any('30' // paillier Sequence
					//~ , ASN1.Any('13', window.Encoding.strToHex(cer))
					//~ , ASN1.Any('13', window.Encoding.strToHex(key))
				//~ )
			)
		)

		const data = '-----BEGIN FRACTUYO-----\n'
			+ window.Encoding.bufToBase64(der).match(/.{1,64}/g).join('\n') + '\n'
			+ '-----END FRACTUYO-----'

		await Notiflix.Confirm.prompt(
			"Seguridad de datos",
			"Escribe contraseña nueva", "",
			"Guardar", "Cancelar",
			async (pin) => {
				await passcode.setupPasscode(pin)

				let encryptedData = await passcode.encryptSession(data)
				let fileHandle = await globalDirHandle.getFileHandle("session.bin", { create: true })

				let writable = await fileHandle.createWritable()
				await writable.write(encryptedData)
				await writable.close()

				dbModules = new SQL.Database()
				let sqlstr = "\
					CREATE TABLE customer(\
						number varchar(13) PRIMARY KEY,\
						config int,\
						name varchar(255),\
						address varchar(128),\
						note varchar(160)\
					);\
				"
				dbModules.run(sqlstr)

				fileHandle = await globalDirHandle.getFileHandle("modules.dat", { create: true })
				writable = await fileHandle.createWritable()
				await writable.write(dbModules.export())
				await writable.close()

				dbInvoices = new SQL.Database()
				sqlstr = "\
					CREATE TABLE invoice(\
						id integer PRIMARY KEY autoincrement,\
						fecha integer,\
						config integer,\
						serie char(4),\
						numero integer,\
						subtotal integer,\
						gravado integer,\
						exonerado integer,\
						inafecto integer,\
						isc integer,\
						igv integer,\
						icbp integer,\
						total integer\
					);\
				"
				dbInvoices.run(sqlstr)

				fileHandle = await globalDirHandle.getFileHandle("invoices.dat", { create: true })
				writable = await fileHandle.createWritable()
				await writable.write(dbInvoices.export())
				await writable.close()

				const oSession = {
					ruc: ruc,
					dir: globalDirHandle
				}
				storage.add(oSession)

				populateTaxpayerData(data)

				Notiflix.Notify.success("Configurado para " + taxpayer.getName() + ".")
				app.navigate("/")
			}
		)
	}

	this.initData = function(event) {
		storage.setDb(event.target.result)
		storage.countRegisters(block, guide)
	}

	this.init = async function() {
		passcode = new Passcode()
		storage = new Storage(this)
		taxpayer = new Taxpayer()

		SQL = await initSqlJs({
			locateFile: file => "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm"
		})
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
				product.setIscPercentage(0)
				product.setIgvPercentage(18)
				product.setQuantity(item.querySelector("[data-type='quantity']").value.trim())
				product.setUnitValue(item.querySelector("[data-type='unit-value']").value.trim(), item.querySelector("[data-type='inc-igv']").checked)
				product.calcMounts()
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
		try {
			await invoice.sign()
		}
		catch(e) {
			Notiflix.Notify.failure("No se puede firmar.")
			console.error(e)
			return
		}

		// Find directory structure
		let handleDirectoryDocs = await globalDirHandle.getDirectoryHandle("docs", { create: true })
		let handleDirectoryXml = await handleDirectoryDocs.getDirectoryHandle("xml", { create: true })

		let fileHandle = await handleDirectoryXml.getFileHandle(invoice.getId() + ".xml", { create: true })
		let writable = await fileHandle.createWritable()

		await writable.write(new XMLSerializer().serializeToString(invoice.getXml()))
		await writable.close()

		dbInvoices.run("INSERT INTO invoice VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", [0, 17565433, 101, "F000", 101n, 1231221231112312314354331n, 1231221231112312314354332n, 1231221231112312314354331n, 1231221231112312314354331n, 1231221231112312314154336n, 1231221231112312314354337n, 1231221231112312314354338n, 1231221231112312314354339n ])
		fileHandle = await globalDirHandle.getFileHandle("invoices.dat", { create: true })
		writable = await fileHandle.createWritable()
		await writable.write(dbInvoices.export())
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
		const der =  window.Encoding.base64ToBuf( decryptedSession.split(/\n/).filter(function (line) {
			return !/-----/.test(line)
		}).join('') )

		const json = ASN1.parse({ der: der, json: false, verbose: true })

		taxpayer.setIdentification( new Identification().setIdentity( window.Encoding.bufToStr(json.children[0].value), 6 ) )
		taxpayer.setName(window.Encoding.bufToStr(json.children[1].value))
		taxpayer.setTradeName(window.Encoding.bufToStr(json.children[2].value))
		taxpayer.setSolUser(window.Encoding.bufToStr(json.children[4].children[0].value))
		taxpayer.setSolPass(window.Encoding.bufToStr(json.children[4].children[1].value))
		taxpayer.setCert(window.Encoding.bufToStr(json.children[5].children[0].value))
		taxpayer.setKey(window.Encoding.bufToStr(json.children[5].children[1].value))
		taxpayer.setAddress(window.Encoding.bufToStr(json.children[3].children[7].value))
		taxpayer.setMetaAddress(
			window.Encoding.bufToStr(json.children[3].children[0].value),
			window.Encoding.bufToStr(json.children[3].children[1].value),
			window.Encoding.bufToStr(json.children[3].children[2].value),
			window.Encoding.bufToStr(json.children[3].children[3].value),
			window.Encoding.bufToStr(json.children[3].children[4].value),
			window.Encoding.bufToStr(json.children[3].children[5].value),
			window.Encoding.bufToStr(json.children[3].children[6].value)
		)

		//Modify in view
		document.getElementById("company-tag").textContent = taxpayer.getName()
		document.getElementById("ruc-tag").textContent = taxpayer.getIdentification().getNumber()
	}

	this.handleUnlocked = async function(event) {
		if(event.target.result) {
			try {
				await fractuyo.setDirHandle(event.target.result.dir)
				const encryptedData = await fractuyo.checkDirHandle()
				await passcode.decryptSession(encryptedData)

				populateTaxpayerData(passcode.getDataSession())

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
