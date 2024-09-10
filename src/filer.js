/**
 * State machine and all together.
 */
var Fractuyo = function() {
	var globalDirHandle
	var passcode, storage, taxpayer
	var SQL
	var dbModules //Storing module tables
	var dbInvoices //Storing a single table with header and footer of the invoice
	var template
	var lockerButton

	/**
	 * Data used as default in forms.
	 */
	this.config

	var currentCdpName = {typeCode:null, serie:null, number:null}

	/**
	 * Invoice Series.
	 */
	var series

	this.getSeries = function() {
		return series
	}

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

		let handleDirectoryConfig = await globalDirHandle.getDirectoryHandle("config")

		fileHandle = await handleDirectoryConfig.getFileHandle("session.bin", {})
		file = await fileHandle.getFile()
		let encryptedDataSession = await file.arrayBuffer()
		contentArray.push(encryptedDataSession)

		fileHandle = await handleDirectoryConfig.getFileHandle("rsapub.bin", {})
		file = await fileHandle.getFile()
		encryptedDataSession = await file.arrayBuffer()
		contentArray.push(encryptedDataSession)

		fileHandle = await handleDirectoryConfig.getFileHandle("rsapriv.bin", {})
		file = await fileHandle.getFile()
		encryptedDataSession = await file.arrayBuffer()
		contentArray.push(encryptedDataSession)

		fileHandle = await handleDirectoryConfig.getFileHandle("paillierpub.bin", {})
		file = await fileHandle.getFile()
		encryptedDataSession = await file.arrayBuffer()
		contentArray.push(encryptedDataSession)

		fileHandle = await handleDirectoryConfig.getFileHandle("paillierpriv.bin", {})
		file = await fileHandle.getFile()
		encryptedDataSession = await file.arrayBuffer()
		contentArray.push(encryptedDataSession)

		try {
			fileHandle = await handleDirectoryConfig.getFileHandle("invoices.dat", {})
			file = await fileHandle.getFile()
			content = await file.arrayBuffer()
			dbInvoices = new SQL.Database(new Uint8Array(content))
		}
		catch(e) {
			Notiflix.Notify.warning("Falta almacén de facturas.")
			console.log(e)
		}

		try {
			fileHandle = await handleDirectoryConfig.getFileHandle("modules.dat", {})
			file = await fileHandle.getFile()
			content = await file.arrayBuffer()
			dbModules = new SQL.Database(new Uint8Array(content))
		}
		catch(e) {
			Notiflix.Notify.warning("Falta almacén de módulos.")
			console.log(e)
		}

		//Load template if available
		try {
			fileHandle = await globalDirHandle.getFileHandle("visor.html", {})
			file = await fileHandle.getFile()
			content = await file.text()
			template = new DOMParser().parseFromString(content, "text/html")
		}
		catch(e) {
			console.info("Usando visor CDP predeterminado.")
		}

		//Load config file
		try {
			fileHandle = await globalDirHandle.getFileHandle("config.json", {})
			file = await fileHandle.getFile()
			content = await file.text()
			this.config = JSON.parse(content)
		}
		catch(e) {
			console.error(e)
			console.info("No hay configuraciones predeterminadas.")
		}

		return contentArray
	}

	this.restoreData = async function(form) {
		const ruc = form.elements.ruc.value.trim()
		if(!validateRuc(ruc)) {
			Notiflix.Report.warning(
				"RUC inválido",
				"El número de RUC no existe.",
				"Aceptar"
			)
			return
		}

		await Notiflix.Confirm.prompt(
			"Restableciendo con seguridad",
			"Escribe contraseña actual", "",
			"Reestablecer", "Cancelar",
			async (pin) => {
				await passcode.setupPasscode(pin)

				try {
					const encryptedDataVector = await fractuyo.checkDirHandle()
					await passcode.decryptSession(encryptedDataVector)

					populateTaxpayerData(...passcode.getDataSession())

					const oSession = {
						ruc: ruc,
						dir: globalDirHandle
					}
					storage.add(oSession)

					Notiflix.Notify.success(`Reconfigurado para ${taxpayer.getName()}.`)
					app.navigate("/")
					lockerButton.stop()
				}
				catch(e) {
					Notiflix.Notify.failure("Restauración incorrecta.")
					console.error(e)
				}
			}
		)
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
		const web = form.elements.web.value.trim()
		const email = form.elements.email.value.trim()
		const telephone = form.elements.telefono.value.trim()
		const solUser = form.elements.usuario.value.trim()
		const solPass = form.elements.clave.value.trim()
		const cuentaDetractora = form.elements["cuenta-detractora"].value.trim()
		const rsaCert = form.elements.cert.value.trim()
		const rsaPrivate = form.elements.key.value.trim()
		const paillierPrivate = form.elements["paillier-privado"].value.trim()
		const paillierPublic = form.elements["paillier-publico"].value.trim()

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
					, ASN1.Any('13', window.Encoding.strToHex(cuentaDetractora))
				)
				, ASN1.Any('30' // marketing for printing in invoice
					, ASN1.Any('13', window.Encoding.strToHex(web))
					, ASN1.Any('13', window.Encoding.strToHex(email))
					, ASN1.Any('13', window.Encoding.strToHex(telephone))
				)
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

				let handleDirectoryConfig = await globalDirHandle.getDirectoryHandle("config", { create: true })

				let encryptedData = await passcode.encryptSession(data)
				let fileHandle = await handleDirectoryConfig.getFileHandle("session.bin", { create: true })

				let writable = await fileHandle.createWritable()
				await writable.write(encryptedData)
				await writable.close()

				//Saving keys
				encryptedData = await passcode.encryptSession(rsaCert)
				fileHandle = await handleDirectoryConfig.getFileHandle("rsapub.bin", { create: true })
				writable = await fileHandle.createWritable()
				await writable.write(encryptedData)
				await writable.close()

				encryptedData = await passcode.encryptSession(rsaPrivate)
				fileHandle = await handleDirectoryConfig.getFileHandle("rsapriv.bin", { create: true })
				writable = await fileHandle.createWritable()
				await writable.write(encryptedData)
				await writable.close()

				//Paillier public
				encryptedData = await passcode.encryptSession(paillierPublic)
				fileHandle = await handleDirectoryConfig.getFileHandle("paillierpub.bin", { create: true })
				writable = await fileHandle.createWritable()
				await writable.write(encryptedData)
				await writable.close()

				if(paillierPrivate.length > 0) {
					encryptedData = await passcode.encryptSession(paillierPrivate)
					fileHandle = await handleDirectoryConfig.getFileHandle("paillierpriv.bin", { create: true })
					writable = await fileHandle.createWritable()
					await writable.write(encryptedData)
					await writable.close()
				}

				dbModules = new SQL.Database()
				let sqlstr = "\
					CREATE TABLE customer(\
						number varchar(13) PRIMARY KEY,\
						config integer,\
						name varchar(255),\
						address varchar(128),\
						note varchar(160)\
					);\
				"
				dbModules.run(sqlstr)

				fileHandle = await handleDirectoryConfig.getFileHandle("modules.dat", { create: true })
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
						gravado blob,\
						exonerado blob,\
						inafecto blob,\
						isc blob,\
						igv blob,\
						icbp blob,\
						descuento blob\
					);\
					CREATE TABLE serie(\
						id integer PRIMARY KEY autoincrement,\
						config integer,\
						serie char(4),\
						numero integer\
					)\
				"
				dbInvoices.run(sqlstr)

				fileHandle = await handleDirectoryConfig.getFileHandle("invoices.dat", { create: true })
				writable = await fileHandle.createWritable()
				await writable.write(dbInvoices.export())
				await writable.close()

				const oSession = {
					ruc: ruc,
					dir: globalDirHandle
				}
				storage.add(oSession)

				populateTaxpayerData(data, rsaCert, rsaPrivate, paillierPublic, paillierPrivate ? paillierPrivate : null)

				Notiflix.Notify.success("Configurado para " + taxpayer.getName() + ".")
				app.navigate("/")
			}
		)
	}

	this.initData = function(event) {
		storage.setDb(event.target.result)
		storage.countRegisters(block, guide)

		lockerButton = jlottie.loadAnimation({
			container: document.getElementById("locker-button"),
			loop: false,
			debug: true,
			autoplay: true,
			useWebWorker: false,
			path: "https://assets1.lottiefiles.com/packages/lf20_gcudkx1v.json",
		})
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

	/**
	 * Get a zip from current CDP view.
	 */
	this.downloadInvoiceBundle = function() {
		const printableElement = document.getElementById("invoice")
		if(!printableElement) {
			return
		}

		const cdpName = String(currentCdpName.typeCode).padStart(2, '0') + "-" + currentCdpName.serie + "-" + String(currentCdpName.number).padStart(8, '0')

		const zip = new JSZip()

		dbInvoices.each("SELECT fecha, config FROM invoice WHERE config & 127 = $typecode AND serie = $serie AND numero = $number", {$typecode: currentCdpName.typeCode, $serie: currentCdpName.serie, $number: currentCdpName.number},
			async function(row) {
				const folderFinalName = new Date(row.fecha).toISOString().substr(0, 7)
				let handleDirectoryConfig = await globalDirHandle.getDirectoryHandle("docs")
				handleDirectoryConfig = await handleDirectoryConfig.getDirectoryHandle("xml")
				handleDirectoryConfig = await handleDirectoryConfig.getDirectoryHandle(folderFinalName)

				let fileHandle = await handleDirectoryConfig.getFileHandle(`${cdpName}.xml`, {})
				let file = await fileHandle.getFile()
				let content = await file.text()
				zip.file(`${cdpName}.xml`, content)

				handleDirectoryConfig = await globalDirHandle.getDirectoryHandle("docs")
				handleDirectoryConfig = await handleDirectoryConfig.getDirectoryHandle("cdr")
				handleDirectoryConfig = await handleDirectoryConfig.getDirectoryHandle(folderFinalName)

				fileHandle = await handleDirectoryConfig.getFileHandle(`R-${cdpName}.zip`, {})
				file = await fileHandle.getFile()
				content = await file.arrayBuffer()
				zip.file(`R-${cdpName}.zip`, content)
			}
		)

		const opt = {
			margin:       1.5,
			filename:     `${cdpName}.pdf`,
			image:        { type: "jpeg", quality: 0.7 },
			html2canvas:  { scale: 2, dpi: 300, width: 700, letterRendering: true },
			jsPDF:        { unit: "cm", format: "a4", orientation: "portrait" }
		}

		printableElement.classList.add("printable-dark-text")

		html2pdf().from(printableElement).set(opt).toPdf().get("pdf").then(
			(pdf) => {
				zip.file(`${cdpName}.pdf`, pdf.output("arraybuffer"), {binary: true})
				zip.generateAsync({type:"base64"}).then((base64) => {
					const linkSource = "data:application/zip;base64," + base64
					const downloadLink = document.createElement("a")

					downloadLink.href = linkSource
					downloadLink.download = `${taxpayer.getIdentification().getNumber()}-${cdpName}.zip`
					downloadLink.click()
				}, function(err) {
					Notiflix.Notify.failure(err)
				})

				//Remove black color style
				printableElement.classList.remove("printable-dark-text")
			}
		)
	}

	this.downloadReport = function() {
		const printableElement = document.getElementById("report")
		if(!printableElement) {
			return
		}

		const opt = {
			margin:       1.5,
			filename:     "reporte.pdf",
			image:        { type: "jpeg", quality: 0.7 },
			html2canvas:  { scale: 2, dpi: 300, width: 700, letterRendering: true },
			jsPDF:        { unit: "cm", format: "a4", orientation: "portrait" }
		}

		printableElement.classList.add("printable-dark-text")
		html2pdf().from(printableElement).set(opt).toPdf().get("pdf").then(
			(pdf) => {
				const downloadLink = document.createElement("a")
				downloadLink.href = URL.createObjectURL(new Blob([pdf.output("arraybuffer")], {type: "application/pdf"}))
				downloadLink.download = "reporte.pdf"
				downloadLink.click()

				printableElement.classList.remove("printable-dark-text")
			}
		)
	}

	this.prepareInvoiceCreation = async function(form) {
		Notiflix.Confirm.show( "Preparando creación", "¿Crear comprobante de pago?", "Sí", "No",
			async () => {
				form.elements.trigger.disabled = true
				await createInvoice(form)
				form.elements.trigger.disabled = false
			}
		)
	}

	var createInvoice = async function(formulario) {
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
		customer.setAddress(formulario.elements["customer-address"].value.trim())
		try {
			customer.setIdentification(new Identification().setIdentity(formulario.elements["customer-identification"].value.trim(), formulario.elements["customer-identification-type"].value))
		}
		catch(e) {
			Notiflix.Report.warning("Inconsistencia", e.message, "Aceptar")
			return
		}

		const invoice = new Invoice(taxpayer, customer)

		if(formulario.elements.credito.checked) {
			const shares = document.getElementsByClassName("share")
			if(shares.length == 0) {
				Notiflix.Report.warning(
					"Al crédito", "No se ha hallado ninguna cuota.", "Aceptar"
				)
				return
			}

			let shareIndex = 0
			try {
				for(const fee of shares) {
					++shareIndex
					const share = new Share()
					share.setDueDate(fee.querySelector("[type='date']").value)
					share.setAmount(fee.querySelector("[type='number']").value)
					invoice.addShare(share)
				}
			}
			catch(e) {
				Notiflix.Report.warning(
					`Error en cuota ${shareIndex}`,
					e.message,
					"Aceptar"
				)
				return
			}
		}
		else if(formulario.elements.vencimiento.value.length != 0) {
			invoice.setDueDate(formulario.elements.vencimiento.value)
		}

		let productIndex = 0
		try {
			for(const item of items) {
				++productIndex
				const product = new Item(item.getElementsByTagName("textarea")[0].value.trim())
				product.setUnitCode("NIU")
				product.setClassificationCode("82101500")
				product.setIscPercentage(0)
				product.setIgvPercentage(18)
				product.setExemptionReasonCode(item.querySelector("[data-type='exemption-code']").value)
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

		try {
			invoice.setOrderReference(formulario.elements["reference-id"].value.trim())
			if(formulario.elements["reference-text"].value.trim().length != 0) {
				invoice.setOrderReferenceText(formulario.elements["reference-text"].value.trim())
			}
			invoice.setSerie(formulario.elements["serie"].value)
			invoice.setCurrencyId(formulario.elements.moneda.value)
			if(formulario.elements.detraccion.checked) {
				invoice.setDetractionPercentage(formulario.elements["detraccion-porcentaje"].value.trim())
			}
			if(formulario.elements["descuento-global"].value.trim().length != 0) {
				invoice.setDiscount(parseFloat(formulario.elements["descuento-global"].value))
			}
		}
		catch(e) {
			Notiflix.Notify.failure(e.message)
			console.error(e)
			return
		}

		const stmt = dbInvoices.prepare("SELECT config, numero FROM serie WHERE serie = $serie")
		stmt.bind({$serie: invoice.getSerie()})
		if(stmt.step()) {
			const row = stmt.getAsObject()
			invoice.setNumeration(++row.numero)
		}

		invoice.setTypeCode(formulario.elements["type-code"].value)
		try {
			invoice.validate()
			invoice.toXml()
			await invoice.sign()
		}
		catch(e) {
			Notiflix.Notify.failure(e.message)
			console.error(e)
			return
		}

		dbInvoices.run("BEGIN TRANSACTION")

		dbInvoices.run("UPDATE serie SET numero = ? WHERE serie = ?", [invoice.getNumeration(), invoice.getSerie()])
		dbInvoices.run("INSERT INTO invoice VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", [
			null, Date.now(), invoice.getTypeCode(), invoice.getSerie(), invoice.getNumeration(),
			//Line extension amount is obtained from the sum of operations.
			window.Encoding.hexToBuf( invoice.getEncryptedOperationAmounts(0).toString(16).padStart(512, '0') ),
			window.Encoding.hexToBuf( invoice.getEncryptedOperationAmounts(1).toString(16).padStart(512, '0') ),
			window.Encoding.hexToBuf( invoice.getEncryptedOperationAmounts(2).toString(16).padStart(512, '0') ),
			window.Encoding.hexToBuf( invoice.getEncryptedIscAmount().toString(16).padStart(512, '0') ),
			window.Encoding.hexToBuf( invoice.getEncryptedIgvAmount().toString(16).padStart(512, '0') ),
			window.Encoding.hexToBuf( invoice.getEncryptedIcbpAmount().toString(16).padStart(512, '0') ),
			window.Encoding.hexToBuf( invoice.getEncryptedDiscountAmount().toString(16).padStart(512, '0') )
		])

		let creatingErrorFlag = true
		let handleInvoiceDirectory
		try {
			// Find directory structure
			handleInvoiceDirectory = await globalDirHandle.getDirectoryHandle("docs", { create: true })
			handleInvoiceDirectory = await handleInvoiceDirectory.getDirectoryHandle("xml", { create: true })
			handleInvoiceDirectory = await handleInvoiceDirectory.getDirectoryHandle( imprimirFecha(invoice.getIssueDate(), false, '-', false), { create: true })

			let fileHandle
			try {
				fileHandle = await handleInvoiceDirectory.getFileHandle(`${invoice.getId(true)}.xml`)
				creatingErrorFlag = false
				throw new Error(`${invoice.getId(true)} ya existe localmente.`)
			}
			catch(e) {
				if(e.name == "NotFoundError") {
					fileHandle = await handleInvoiceDirectory.getFileHandle(`${invoice.getId(true)}.xml`, { create: true })
				}
				else {
					throw new Error(e.message)
				}
			}
			let writable = await fileHandle.createWritable()

			await writable.write(new XMLSerializer().serializeToString(invoice.xmlDocument))
			await writable.close()
			creatingErrorFlag = false

			//Saving db onto disk
			fileHandle = await globalDirHandle.getDirectoryHandle("config")
			fileHandle = await fileHandle.getFileHandle("invoices.dat", { create: true })
			writable = await fileHandle.createWritable()
			dbInvoices.run("COMMIT")
			await writable.write(dbInvoices.export())
			await writable.close()

			Notiflix.Report.success("CPE creado", "Se ha guardado el documento " + invoice.getId() + ".", "Aceptar")
			return
		}
		catch(e) {
			dbInvoices.run("ROLLBACK")

			if(creatingErrorFlag) { //Delete XML file
				handleInvoiceDirectory.removeEntry(`${invoice.getId(true)}.xml`)
			}

			Notiflix.Report.failure("CPE no fue creado", e.message, "Aceptar")
		}
	}

	this.lock = function() {
		taxpayer.clearData()
		document.getElementById("company-tag").textContent = "Nombre encriptado"
		document.getElementById("ruc-tag").textContent = "RUC encriptado"
		document.getElementById("warn-validity").textContent = ""
		document.getElementById("warn-validity").classList.remove("bg-warning")
		document.getElementById("warn-validity").classList.remove("bg-danger")
		app.navigate("/bloqueo")
		lockerButton.play()
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

	var populateTaxpayerData = function(decryptedSession, decryptedRsaCert, decryptedRsaPrivate, decryptedPaillierPublic, decryptedPaillierPrivate) {
		let der =  window.Encoding.base64ToBuf( decryptedSession.split(/\n/).filter(function (line) {
			return !/-----/.test(line)
		}).join('') )

		let json = ASN1.parse({ der: der, json: false, verbose: true })

		taxpayer.setIdentification( new Identification().setIdentity( window.Encoding.bufToStr(json.children[0].value), 6 ) )
		taxpayer.setName(window.Encoding.bufToStr(json.children[1].value))
		taxpayer.setTradeName(window.Encoding.bufToStr(json.children[2].value))
		taxpayer.setSolUser(window.Encoding.bufToStr(json.children[4].children[0].value))
		taxpayer.setSolPass(window.Encoding.bufToStr(json.children[4].children[1].value))
		//This bank account is new feature so may not exist
		taxpayer.setDeductionsAccount(json.children[4].children[2] ? window.Encoding.bufToStr(json.children[4].children[2].value) : "")
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
		taxpayer.setWeb(window.Encoding.bufToStr(json.children[5].children[0].value))
		taxpayer.setEmail(window.Encoding.bufToStr(json.children[5].children[1].value))
		taxpayer.setTelephone(window.Encoding.bufToStr(json.children[5].children[2].value))

		const remainingValidity = taxpayer.setCert( removeBeginEndPem( decryptedRsaCert ) )
		taxpayer.setKey( removeBeginEndPem( decryptedRsaPrivate ) )

		if(decryptedPaillierPrivate) {
			der =  window.Encoding.base64ToBuf( removeBeginEndPem(decryptedPaillierPrivate) )
			json = ASN1.parse({ der: der, json: false, verbose: true })
			taxpayer.createPaillierPrivateKey(
				BigInt("0x" + window.Encoding.bufToHex(json.children[0].value)),
				BigInt("0x" + window.Encoding.bufToHex(json.children[1].value)),
				BigInt("0x" + window.Encoding.bufToHex(json.children[2].value)),
				BigInt("0x" + window.Encoding.bufToHex(json.children[3].value)),
				BigInt("0x" + window.Encoding.bufToHex(json.children[4].value)),
				BigInt("0x" + window.Encoding.bufToHex(json.children[5].value))
			)
		}
		else {
			der =  window.Encoding.base64ToBuf( removeBeginEndPem(decryptedPaillierPublic) )
			json = ASN1.parse({ der: der, json: false, verbose: true })
			taxpayer.createPaillierPublicKey(
				BigInt("0x" + window.Encoding.bufToHex(json.children[0].value)),
				BigInt("0x" + window.Encoding.bufToHex(json.children[1].value))
			)
		}

		//Modify in view
		document.getElementById("company-tag").textContent = taxpayer.getName()
		document.getElementById("ruc-tag").textContent = taxpayer.getIdentification().getNumber()
		if(remainingValidity == -1) {
			document.getElementById("warn-validity").textContent = "Certificado vencido"
			document.getElementById("warn-validity").classList.add("bg-danger")
		}
		else {
			if(remainingValidity < 8) {
				document.getElementById("warn-validity").textContent = `Certificado vencerá en ${remainingValidity} días.`
				document.getElementById("warn-validity").classList.add("bg-warning")
			}
		}
	}

	this.handleUnlocked = async function(event) {
		if(event.target.result) {
			try {
				await fractuyo.setDirHandle(event.target.result.dir)
				const encryptedDataVector = await fractuyo.checkDirHandle()
				await passcode.decryptSession(encryptedDataVector)

				populateTaxpayerData(...passcode.getDataSession())

				Notiflix.Notify.success("Desencriptado para " + taxpayer.getName() + ".")
				app.navigate("/")
				lockerButton.stop()
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

	this.isUsable = function() {
		return taxpayer.getKey() != null
	}

	/**
	 * Getting series and placing on select-option.
	 */
	this.orderSeries = function() {
		series = Array()
		dbInvoices.each("SELECT * FROM serie WHERE config & 1 = 1", {},
			function(row) {
				const type = row.config >> 2 & 127
				if(!series.includes(type)) {
					series.push(type)
					series[type] = []
				}
				series[type].push(row.serie)
			}
		)

		//Remove options
		const typeSelector = document.getElementById("tipo")
		while(typeSelector.firstChild) {
			typeSelector.removeChild(typeSelector.firstChild);
		}

		let nullOption = document.createElement("option")
		nullOption.selected = true
		nullOption.hidden = true
		nullOption.value = ""
		nullOption.appendChild(document.createTextNode("Elegir\u2026"))
		typeSelector.appendChild(nullOption)

		for(let serie in series) {
			if(Array.isArray(series[serie])) {
				let typeOption = document.createElement("option")
				typeOption.value = String(serie).padStart(2, '0')
				switch(serie) {
					case "1"://FAC
						typeOption.appendChild(document.createTextNode("Factura"))
						typeSelector.appendChild(typeOption)
						break
					case "3"://BOL
						typeOption.appendChild(document.createTextNode("Boleta"))
						typeSelector.appendChild(typeOption)
						break
					//~ case "9"://GRE
						//~ typeOption.appendChild(document.createTextNode("G"))
					//~ default:
						//~ console.log("Tipo de CDP incorrecto porque serie es", typeof serie)
				}
			}
		}
	}

	this.listInvoices = function(lastIndex) {
		const list = document.getElementById("lista-cdp")
		if(list == null) {
			Notiflix.Notify.warning("No hay lugar para listar comprobantes.")
			return
		}

		if(lastIndex == 0) {
			const stmt = dbInvoices.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'invoice'");
			if(stmt.step()) {
				const row = stmt.get()
				lastIndex = row[0]
				++lastIndex
			}
			stmt.free()
		}

		//https://stackoverflow.com/questions/14468586/efficient-paging-in-sqlite-with-millions-of-records
		dbInvoices.each("SELECT id, fecha, config, serie, numero FROM invoice WHERE id < $lastindex ORDER BY id DESC LIMIT 8", {$lastindex: lastIndex},
			function(row) {
				const cdpName = String(row.config & 127).padStart(2, '0') + "-" + row.serie + '-' + String(row.numero).padStart(8, '0')
				const tr = list.insertRow()
				const _identification = tr.insertCell()
				const linker = document.createElement("a")
				linker.setAttribute("class", "btn btn-link")
				linker.href = "/cdp/" + cdpName
				const viewTag = document.createElement("span")
				viewTag.setAttribute("class", "btn-label")
				linker.appendChild(viewTag)
				const viewIcon = document.createElement("i")
				viewIcon.setAttribute("class", "fa fa-link")
				linker.appendChild(viewIcon)
				linker.appendChild( document.createTextNode( '\u00A0' ) )
				linker.appendChild(document.createTextNode(cdpName))
				_identification.appendChild(linker)
				tr.insertCell().appendChild(document.createTextNode(getInvoiceTypeName(row.config & 127)))
				tr.insertCell().appendChild(document.createTextNode(imprimirFecha(new Date(row.fecha) )))
				const _action = tr.insertCell()
				if(row.config >> 7 & 1) { //eliminated invoice
					const etiquetaDeSunat = document.createElement("span")
					etiquetaDeSunat.setAttribute("class", "badge bg-secondary text-white")
					etiquetaDeSunat.appendChild(document.createTextNode("De baja"))
					_action.appendChild(etiquetaDeSunat)
				}
				else if(row.config >> 8 & 1) { //when sunatized
					const responseCode = row.config >> 9 & 0x3fff
					const etiquetaDeSunat = document.createElement("span")
					switch(true) {
						case (responseCode < 100):
							etiquetaDeSunat.setAttribute("class", "badge bg-success text-white")
							etiquetaDeSunat.appendChild(document.createTextNode("Aceptado"))
							break
						case (responseCode < 2000):
							etiquetaDeSunat.setAttribute("class", "badge bg-info text-black")
							etiquetaDeSunat.appendChild(document.createTextNode("Reenviar"))
							break
						case (responseCode < 4000):
							etiquetaDeSunat.setAttribute("class", "badge bg-danger text-black")
							etiquetaDeSunat.appendChild(document.createTextNode("Rechazado"))
							break
						default:
							etiquetaDeSunat.setAttribute("class", "badge bg-warning text-black")
							etiquetaDeSunat.appendChild(document.createTextNode("Aceptado"))
					}
					_action.appendChild(etiquetaDeSunat)
				}
				else {
					const sender = document.createElement("button")
					sender.setAttribute("class", "btn btn-dark")
					sender.setAttribute("id", "sunatizador-" + cdpName)
					sender.onclick = function() {
						//Send to Sunat server
						fractuyo.declareInvoice(cdpName, imprimirFecha(new Date(row.fecha), false, '-', false), this)
					}
					sender.appendChild(document.createTextNode("Sunatizar"))
					_action.appendChild(sender)
				}

				const _view = tr.insertCell()

				const viewPdf = document.createElement("a")
				viewPdf.setAttribute("class", "btn btn-secondary")
				viewPdf.href = "/cdp/" + cdpName + "/visor"
				viewPdf.appendChild(document.createTextNode("PDF"))
				_view.appendChild(viewPdf)

				lastIndex = row.id
			}
		)

		//Una simple paginación
		let pagerButton = document.getElementById("paginador")
		if( lastIndex > 1 ) {
			if(pagerButton == null) {
				pagerButton = document.createElement("button")
				pagerButton.type = "button"
				pagerButton.setAttribute("id", "paginador")
				pagerButton.setAttribute("class", "btn btn-secondary btn-sm btn-block text-blood mt-4")
				pagerButton.appendChild( document.createTextNode("Cargar más CDP") )
				document.getElementById("lista").appendChild(pagerButton)
			}
			pagerButton.disabled = false
			pagerButton.onclick = function() {
				this.disabled = "true"
				this.onclick = null
				//More cdp, more power
				fractuyo.listInvoices(lastIndex)
			}
		}
		else if( pagerButton != null ) {
			pagerButton.textContent = "No hay más"
		}
	}

	this.viewInvoice = async function(cdpName) {
		const nameParts = cdpName.split('-')
		currentCdpName.typeCode = parseInt(nameParts[0])
		currentCdpName.serie = nameParts[1]
		currentCdpName.number = parseInt(nameParts[2])

		dbInvoices.each("SELECT fecha, config FROM invoice WHERE config & 127 = $typecode AND serie = $serie AND numero = $number", {$typecode: currentCdpName.typeCode, $serie: currentCdpName.serie, $number: currentCdpName.number},
			async function(row) {
				let handleDirectoryConfig = await globalDirHandle.getDirectoryHandle("docs")
				handleDirectoryConfig = await handleDirectoryConfig.getDirectoryHandle("xml")
				handleDirectoryConfig = await handleDirectoryConfig.getDirectoryHandle(new Date(row.fecha).toISOString().substr(0, 7))

				let fileHandle = await handleDirectoryConfig.getFileHandle(cdpName + ".xml", {})
				let file = await fileHandle.getFile()
				let xmlContent = await file.text()

				//Replace template
				if(template) {
					const htmlTemplateHolder = document.getElementById("invoice")
					while(htmlTemplateHolder.hasChildNodes()) {
						htmlTemplateHolder.removeChild(htmlTemplateHolder.lastChild)
					}

					if(template.getElementById("ftp-style") && !document.getElementById("ftp-style")) {
						document.head.appendChild(template.getElementById("ftp-style"))
					}

					const bodyTemplateCopy = template.body.cloneNode(true)

					Array.from(bodyTemplateCopy.children).forEach((node, index, array) => {
						htmlTemplateHolder.appendChild(node)
					})
				}

				const xmlDoc = new DOMParser().parseFromString(xmlContent, "text/xml")

				document.getElementById("idComprobante").textContent = xmlDoc.evaluate("/*/cbc:ID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				const moneda = monedas.get( xmlDoc.evaluate("/*/cbc:DocumentCurrencyCode", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue )
				document.getElementById("moneda").textContent = moneda
				let tipoDocumento = xmlDoc.evaluate("/*/cbc:InvoiceTypeCode", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				document.getElementById("tipoDocumento").textContent = tipoDocumento == "01" ? "Factura Electrónica" : tipoDocumento == "03" ? "Boleta de Venta Electrónica" : "Desconocido";
				document.getElementById("fecha-emision").textContent = xmlDoc.evaluate("/*/cbc:IssueDate", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				document.getElementById("fecha-vencimiento").textContent = xmlDoc.evaluate("/*/cbc:DueDate", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				document.getElementById("nombreEmisor").textContent = removeCdataTag( xmlDoc.evaluate("/*/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue )
				document.getElementById("direccion").textContent = removeCdataTag( xmlDoc.evaluate("/*/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cac:RegistrationAddress/cac:AddressLine/cbc:Line", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue )
				document.getElementById("urbanizacion").textContent = removeCdataTag( xmlDoc.evaluate("/*/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cac:RegistrationAddress/cbc:CitySubdivisionName", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue )
				document.getElementById("distrito").textContent = removeCdataTag( xmlDoc.evaluate("/*/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cac:RegistrationAddress/cbc:District", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue )
				let ruc = xmlDoc.evaluate("/*/cac:AccountingSupplierParty/cbc:CustomerAssignedAccountID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				if(ruc == "")
					ruc = xmlDoc.evaluate("/*/cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification/cbc:ID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				document.getElementById("ruc").textContent = ruc

				document.getElementById("website").textContent = xmlDoc.evaluate("/*/cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:Note", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				document.getElementById("email").textContent = xmlDoc.evaluate("/*/cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:ElectronicMail", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				document.getElementById("telephone").textContent = xmlDoc.evaluate("/*/cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:Telephone ", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue

				document.getElementById("nombreCliente").textContent = removeCdataTag( xmlDoc.evaluate("/*/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue )
				document.getElementById("rucCliente").textContent = removeCdataTag( xmlDoc.evaluate("/*/cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue )
				document.getElementById("direccionCliente").textContent = removeCdataTag( xmlDoc.evaluate("/*/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cac:RegistrationAddress/cac:AddressLine/cbc:Line", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue )


				document.getElementById("codHash").textContent = xmlDoc.evaluate("/*/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/ds:Signature/ds:SignedInfo/ds:Reference/ds:DigestValue", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				document.getElementById("letras").textContent = xmlDoc.evaluate("/*/cbc:Note[@languageLocaleID='1000']", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue + " " + moneda
				const globalTotal = xmlDoc.evaluate("/*/cac:LegalMonetaryTotal/cbc:PayableAmount", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				document.getElementById("total").textContent = globalTotal

				const count = xmlDoc.evaluate("count(/*/cac:InvoiceLine)", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue
				const tabla = document.getElementById("productos")

				for(let i = 1; i <= count; ++i) {
					let quantity = xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cbc:InvoicedQuantity", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
					let unitCode = xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cbc:InvoicedQuantity/@unitCode", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
					let description = xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cac:Item/cbc:Description", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
					let subtotal = xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cac:Price/cbc:PriceAmount", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
					let lineExtensionAmount = xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cbc:LineExtensionAmount", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue

					const tr = tabla.insertRow()
					tr.insertCell().appendChild(document.createTextNode(quantity))
					tr.insertCell().appendChild(document.createTextNode(unitCode))
					const descriptionCell = tr.insertCell()
					for( const breaklineDescription of removeCdataTag(description).split(/\n\r?/g) ) {
						if(breaklineDescription.length) {
							descriptionCell.appendChild(document.createTextNode(breaklineDescription))
						}
						descriptionCell.appendChild(document.createElement("br"))
					}
					tr.insertCell().appendChild(document.createTextNode(subtotal))

					let totalTag = tr.insertCell()
					totalTag.setAttribute("class", "item_r")
					totalTag.appendChild(document.createTextNode(lineExtensionAmount.toFixed(2)))
				}

				const igv = xmlDoc.evaluate("/*/cac:TaxTotal/cbc:TaxAmount", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				document.getElementById("total-igv").textContent = igv
				document.getElementById("total-gravado").textContent = xmlDoc.evaluate("/*/cac:LegalMonetaryTotal/cbc:LineExtensionAmount", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue

				new QRCode(document.getElementById("qrcode"), {
					text: //RUC | TIPO DE DOCUMENTO | SERIE | NUMERO | MTO TOTAL IGV | MTO TOTAL DEL COMPROBANTE | FECHA DE EMISION | TIPO DE DOCUMENTO ADQUIRENTE | NUMERO DE DOCUMENTO ADQUIRENTE
						taxpayer.getIdentification().getNumber()
						+ '|' + cdpName.replaceAll('-', '|')
						+ '|' + igv
						+ '|' + globalTotal
						+ '|' + new Date(row.fecha).toISOString().substr(0, 10)
						+ '|' + xmlDoc.evaluate("/*/cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID/@schemeID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
						+ '|' + xmlDoc.evaluate("/*/cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
					,
					width: 100,
					height: 100,
					colorDark: "#111111",
					colorLight: "#ffffff",
					correctLevel : QRCode.CorrectLevel.H
				})

				const lista = document.getElementById("adicional")

				const hasDetraction = xmlDoc.evaluate("count(/*/cbc:Note[@languageLocaleID='2006'])", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue
				if(hasDetraction) {
					let rotulo = document.createElement("span")
					rotulo.setAttribute("class", "fw-bold")
					rotulo.appendChild(document.createTextNode("Sujeto a detracciones:"))
					lista.appendChild(rotulo)
					lista.appendChild(document.createElement("br"))

					rotulo = document.createElement("span")
					rotulo.appendChild(document.createTextNode( "Cuenta BN: " + xmlDoc.evaluate("/*/cac:PaymentMeans/cac:PayeeFinancialAccount/cbc:ID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue ))
					lista.appendChild(rotulo)
					lista.appendChild(document.createElement("br"))
				}

				const countPaymentTerms = xmlDoc.evaluate("count(/*/cac:PaymentTerms)", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue
				let shareCount = 0
				for(let i = 1; i <= countPaymentTerms; ++i) {
					const type = xmlDoc.evaluate("/*/cac:PaymentTerms[" + i + "]/cbc:ID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
					switch(type) {
						case "Detraccion":
							let rotulo = document.createElement("span")
							rotulo.appendChild(document.createTextNode( "Monto: " + xmlDoc.evaluate("/*/cac:PaymentTerms/cbc:Amount", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue ))
							lista.appendChild(rotulo)
							lista.appendChild(document.createElement("br"))
							break
						case "FormaPago":
							let paymentType = xmlDoc.evaluate("/*/cac:PaymentTerms[" + i + "]/cbc:PaymentMeansID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
							if(paymentType == "Credito") {
								shareCount = 1
								let rotulo = document.createElement("span")
								rotulo.setAttribute("class", "fw-bold")
								rotulo.appendChild(document.createTextNode("Cuotas del crédito:"))
								lista.appendChild(rotulo)
								lista.appendChild(document.createElement("br"))
								document.getElementById("payment-term").textContent = "Al crédito"
								continue
							}
							else if(shareCount == 0) {
								document.getElementById("payment-term").textContent = "Al contado"
								continue
							}
							if(shareCount > 0) {
								const amount = xmlDoc.evaluate("/*/cac:PaymentTerms[" + i + "]/cbc:Amount", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
								const dueDate = xmlDoc.evaluate("/*/cac:PaymentTerms[" + i + "]/cbc:PaymentDueDate", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
								const shareTag = document.createElement("span")
								shareTag.appendChild(document.createTextNode(`Cuota ${shareCount}:\u0009 ${dueDate}:\u0009 ${amount}\u0009 ${moneda}`))
								lista.appendChild(shareTag)
								lista.appendChild(document.createElement("br"))
								shareCount++
							}
							break
					}
				}

				const hasOrderReference = xmlDoc.evaluate("count(/*/cac:OrderReference/cbc:ID)", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue
				if(hasOrderReference) {
					let referenceText = xmlDoc.evaluate("/*/cac:OrderReference/cbc:ID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
					const reference = document.getElementById("referencia")

					const referenceTag = xmlDoc.evaluate("/*/cac:OrderReference/cbc:CustomerReference", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
					if(referenceTag) {
						referenceText += ` - ${referenceTag}`
					}

					const referenceTagNode = document.createElement("span")
					referenceTagNode.appendChild( document.createTextNode( referenceText) )
					reference.appendChild( referenceTagNode )
				}
			}
		)
	}

	this.declareInvoice = async function(cdpName, folderName, triggerButton) {
		triggerButton.disabled = true
		let handleDocsDirectory = await globalDirHandle.getDirectoryHandle("docs")
		let handleDirectory = await handleDocsDirectory.getDirectoryHandle("xml")
		handleDirectory = await handleDirectory.getDirectoryHandle(folderName)

		let fileHandle = await handleDirectory.getFileHandle(cdpName + ".xml", {})
		let file = await fileHandle.getFile()
		let xmlContent = await file.text()

		let fileName = taxpayer.getIdentification().getNumber() + "-" + cdpName

		let zip = new JSZip()
		zip.file(`${fileName}.xml`, xmlContent)
		zip.generateAsync({type:"base64"}).then(function(zipb64) {
			if(!zipb64) {
				Notify.Notiflix.failure("No se pudo empaquetar archivo.")
				triggerButton.disabled = false
				return
			}

			let isTesting = true

			const xhttp = new XMLHttpRequest()
			xhttp.onload = async function() {
				const xml = XAdES.Parse( this.responseText )
				let zipb64retornado
				try {
					//CDR
					zipb64retornado = xml.getElementsByTagName("applicationResponse")[0].textContent

					handleDirectory = await handleDocsDirectory.getDirectoryHandle("cdr", { create: true })
					handleDirectory = await handleDirectory.getDirectoryHandle(folderName, { create: true })
					fileHandle = await handleDirectory.getFileHandle(`R-${cdpName}.zip`, { create: true })
					writable = await fileHandle.createWritable()
					await writable.write(window.Encoding.base64ToBuf(zipb64retornado))
					await writable.close()
				}
				catch(e) {
					triggerButton.disabled = false
					console.error(e)
					Notiflix.Notify.failure("No fue recibido.")
					return
				}

				JSZip.loadAsync(window.Encoding.base64ToBuf( zipb64retornado )).then( //read the Blob
					async function(zip) {
						//We go to file directly
						zip.file(`R-${fileName}.xml`).async("string").then(async function(data) {
							let xmlDoc = XAdES.Parse(data)
							let responseCode = 2000, responseDescription = ''
							try {
								responseCode = xmlDoc.evaluate("/*/cac:DocumentResponse/cac:Response/cbc:ResponseCode", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue
								responseDescription = xmlDoc.evaluate("/*/cac:DocumentResponse/cac:Response/cbc:Description", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
							}
							catch(e) {
								triggerButton.disabled = false
								console.error(e)
								return
							}

							let isUpdateable = true
							const etiquetaDeSunat = document.createElement("span")
							switch(true) {
								case (responseCode < 100):
									etiquetaDeSunat.setAttribute("class", "badge bg-success text-white")
									etiquetaDeSunat.appendChild(document.createTextNode("Aceptado"))
									Notiflix.Notify.success(responseDescription)
									break
								case (responseCode < 2000):
									//We must resend
									isUpdateable = false
									triggerButton.disabled = false
									Notiflix.Notify.info(responseDescription)
									break
								case (responseCode < 4000):
									etiquetaDeSunat.setAttribute("class", "badge bg-danger text-black")
									etiquetaDeSunat.appendChild(document.createTextNode("Rechazado"))
									Notiflix.Notify.failure(responseDescription)
									break
								default:
									etiquetaDeSunat.setAttribute("class", "badge bg-warning text-black")
									etiquetaDeSunat.appendChild(document.createTextNode("Aceptado"))
									Notiflix.Notify.warning(responseDescription)
							}

							if(isUpdateable && !isTesting) {
								const nameParts = cdpName.split('-')
								const typeCode = parseInt(nameParts[0]), serie = nameParts[1], number = parseInt(nameParts[2])
								dbInvoices.run("UPDATE invoice SET config = config | $confsunatresponse WHERE config & 127 = $typecode AND serie = $serie AND numero = $number", {$confsunatresponse: (responseCode << 9 | 1 << 8), $typecode: typeCode, $serie: serie, $number: number})
								triggerButton.parentNode.appendChild(etiquetaDeSunat)
								triggerButton.remove()

								//Saving db file onto disk
								handleDirectory = await globalDirHandle.getDirectoryHandle("config")
								fileHandle = await handleDirectory.getFileHandle("invoices.dat", { create: true })
								writable = await fileHandle.createWritable()
								await writable.write(dbInvoices.export())
								await writable.close()
							}
						})
					}, function(e) {
						Notiflix.Notify.info("Error leyendo.")
						triggerButton.disabled = false
						console.error("Error reading", e.message)
					}
				)
			}
			xhttp.open("POST", "/proxy-terexor.php", true)

			//We will always send but we need to choose beta or real
			Notiflix.Confirm.show(
				"Declaración",
				"Enviar hacia Sunat",
				"Real", "Prueba",
				() => {
					isTesting = false
					xhttp.send( JSON.stringify( {zipb64: zipb64, filename: fileName, token: {password: taxpayer.getSolPass(), username: `${taxpayer.getIdentification().getNumber()}${taxpayer.getSolUser()}` }} ) )
				},
				() => {
					xhttp.send( JSON.stringify( {zipb64: zipb64, filename: fileName} ) )
				}
			)
		})
	}

	this.reportInvoices = function(form) {
		const paillierPrivateKey = taxpayer.getPaillierPrivateKey()
		if(!paillierPrivateKey) {
			Notiflix.Notify.warning("No hay clave para descifrar.")
			return
		}

		const paillierPublicKey = taxpayer.getPaillierPublicKey()

		if(form.elements.beginning.value == "") {
			Notiflix.Notify.warning("Indicar fecha de inicio.")
			return
		}
		const beginning = new Date(`${form.elements.beginning.value}T00:00:00`).getTime()

		let ending
		if(form.elements.ending.value == "") {
			ending = Date.now()
		}
		else {
			ending = new Date(`${form.elements.ending.value}T23:59:59`).getTime()
		}

		const encryptedZero = paillierPublicKey.encrypt(0n)
		let encryptedGravadoSum = encryptedZero,
			encryptedExoneradoSum = encryptedZero,
			encryptedInafectoSum = encryptedZero,
			encryptedIscSum = encryptedZero,
			encryptedIgvSum = encryptedZero,
			encryptedIcbpSum = encryptedZero,
			encryptedDescuentoSum = encryptedZero

		const report = document.getElementById("list")
		while(report.firstChild) {
			report.firstChild.remove()
		}

		dbInvoices.each("SELECT fecha, config, serie, numero, gravado, exonerado, inafecto, isc, igv, icbp, descuento FROM invoice WHERE fecha BETWEEN $beginning AND $ending", {$beginning: beginning, $ending: ending},
			function(row) {
				const encryptedGravado = BigInt("0x" + window.Encoding.bufToHex( row.gravado ) )
				encryptedGravadoSum = paillierPublicKey.addition(encryptedGravadoSum, encryptedGravado)

				const encryptedInafecto = BigInt("0x" + window.Encoding.bufToHex( row.inafecto ) )
				encryptedInafectoSum = paillierPublicKey.addition(encryptedInafectoSum, encryptedInafecto)

				const encryptedIgv = BigInt("0x" + window.Encoding.bufToHex( row.igv ) )
				encryptedIgvSum = paillierPublicKey.addition(encryptedIgvSum, encryptedIgv)

				//Print in display
				const reportRow = document.createElement("div")
				reportRow.setAttribute("class", "row border-top")
				report.appendChild(reportRow)

				const headerCol = document.createElement("div")
				headerCol.setAttribute("class", "col-8")
				reportRow.appendChild(headerCol)

				const invoiceType = document.createElement("h4")
				invoiceType.appendChild(document.createTextNode(getInvoiceTypeName(row.config & 127)))
				headerCol.appendChild(invoiceType)

				const sunatStatusBadge = document.createElement("span")
				if(row.config >> 7 & 1) { //eliminated invoice
					sunatStatusBadge.setAttribute("class", "badge bg-secondary text-white")
					sunatStatusBadge.appendChild(document.createTextNode("De baja"))
				}
				else if(row.config >> 8 & 1) { //when sunatized
					const responseCode = row.config >> 9 & 0x3fff
					switch(true) {
						case (responseCode < 100):
							sunatStatusBadge.setAttribute("class", "badge bg-success text-white")
							sunatStatusBadge.appendChild(document.createTextNode("Aceptado"))
							break
						case (responseCode < 2000):
							sunatStatusBadge.setAttribute("class", "badge bg-info text-black")
							sunatStatusBadge.appendChild(document.createTextNode("Reenviar"))
							break
						case (responseCode < 4000):
							sunatStatusBadge.setAttribute("class", "badge bg-danger text-black")
							sunatStatusBadge.appendChild(document.createTextNode("Rechazado"))
							break
						default:
							sunatStatusBadge.setAttribute("class", "badge bg-warning text-black")
							sunatStatusBadge.appendChild(document.createTextNode("Aceptado"))
					}
				}
				else {
					sunatStatusBadge.setAttribute("class", "badge bg-secondary text-black")
					sunatStatusBadge.appendChild(document.createTextNode("No presentado"))
				}

				const headerData = document.createElement("p")
				headerData.appendChild( document.createTextNode( String(row.config & 127).padStart(2, '0') + "-" + row.serie + '-' + String(row.numero).padStart(8, '0') ) )
				headerData.appendChild(document.createElement("br"))
				headerData.appendChild(document.createTextNode("Estado: "))
				headerData.appendChild(sunatStatusBadge)
				headerData.appendChild(document.createElement("br"))
				headerData.appendChild(document.createTextNode(`Fecha: ${imprimirFecha(new Date(row.fecha) )}`))
				headerData.appendChild(document.createElement("br"))
				headerData.appendChild(document.createTextNode(`Total: ${(Number( paillierPrivateKey.decrypt(paillierPublicKey.addition(encryptedGravado, encryptedIgv) ) * 100n / 100n ) /100 ).toFixed(2)}`))
				headerData.appendChild(document.createElement("br"))
				headerData.appendChild(document.createTextNode(`Moneda: ${getCurrencyName(row.config)}`))
				headerCol.appendChild(headerData)

				const dataCol = document.createElement("div")
				dataCol.setAttribute("class", "col-4")
				reportRow.appendChild(dataCol)

				const dataData = document.createElement("p")
				dataData.appendChild(document.createElement("br"))
				dataData.appendChild(document.createTextNode(`Op. gravadas: ${(Number( paillierPrivateKey.decrypt( encryptedGravado ) * 100n / 100n ) / 100).toFixed(2)}`))
				dataData.appendChild(document.createElement("br"))
				dataData.appendChild(document.createTextNode(`Op. inafectas: ${(Number( paillierPrivateKey.decrypt( encryptedInafecto ) * 100n / 100n ) / 100).toFixed(2)}`))
				dataData.appendChild(document.createElement("br"))
				dataData.appendChild(document.createTextNode(`IGV: ${(Number( paillierPrivateKey.decrypt( encryptedIgv ) * 100n / 100n ) / 100).toFixed(2)}`))
				dataData.appendChild(document.createElement("br"))
				dataCol.appendChild(dataData)
			}
		)

		const encryptedTotal = paillierPublicKey.addition(encryptedGravadoSum, encryptedIgvSum)
		const message = `Op. Gravadas: ${Number( paillierPrivateKey.decrypt(encryptedGravadoSum) * 100n / 100n ) / 100}<br>
			IGV: ${Number( paillierPrivateKey.decrypt(encryptedIgvSum) * 100n / 100n ) / 100}<br>
			Totales: ${Number( paillierPrivateKey.decrypt(encryptedTotal) * 100n / 100n ) / 100}`

		Notiflix.Report.success(
			"Sumas del período",
			message, "Gracias"
		)
	}

	this.findCustomer = function(input) {
		const customerList = document.getElementById("clientes")
		while(customerList.firstChild) {
			customerList.firstChild.remove()
		}

		if(input.getAttribute("data-chosen")) {
			input.removeAttribute("data-chosen")
			return
		}

		if(input.value.trim().length == 0) {
			return
		}

		const likeNumber = `${input.value.trim()}%`
		const likeName = `%${input.value.trim()}%`

		dbModules.each("SELECT number, config, name, address FROM customer WHERE number LIKE $likenumber OR name LIKE $likename LIMIT 8", {$likenumber: likeNumber, $likename: likeName},
			function(row) {
				const option = document.createElement("option")
				option.value = row.number
				option.appendChild(document.createTextNode(row.name))
				option.setAttribute("data-name", row.name)
				option.setAttribute("data-address", row.address ? row.address : "")
				option.setAttribute("data-type", window.Encoding.numToHex(row.config >> 1 & 0xf).substring(1))
				customerList.appendChild(option)
			}
		)
	}

	this.addCustomer = async function() {
		const identification = new Identification()
		identification.setIdentity(document.getElementById("customer-identification").value, document.getElementById("customer-identification-type").value)

		const name = document.getElementById("customer-name").value.trim()
		const address = document.getElementById("customer-address").value.trim()

		if(name.length < 2) {
			Notiflix.Notify.warning("Nombre está muy corto.")
			return
		}

		dbModules.run("INSERT INTO customer(number,config,name,address) VALUES(?,?,?,?) ON CONFLICT(number) DO UPDATE SET config = excluded.config, name = excluded.name, address = excluded.address", [identification.getNumber(), identification.getType() << 1 | 1, name, address])

		//Saving file onto disk
		fileHandle = await globalDirHandle.getDirectoryHandle("config")
		fileHandle = await fileHandle.getFileHandle("modules.dat", { create: true })
		writable = await fileHandle.createWritable()
		await writable.write(dbModules.export())
		await writable.close()

		Notiflix.Notify.info("Datos guardados.")
	}

	var getInvoiceTypeName = function(type) {
		switch(type) {
			case 1:
				return "Factura"
			case 3:
				return "Boleta de venta"
			case 7:
				return "Nota de crédito"
			case 8:
				return "Nota de débito"
			case 9:
				return "Guía de remisión"
			default:
				return "Desconocido"
		}
	}

	var getCurrencyName = function(currency) {
		switch(currency) {
			default:
				return "PEN"
		}
	}
}

let deferredPrompt = null
const addBtn = document.getElementById("instalador")
window.addEventListener("beforeinstallprompt", function(e) {
	e.preventDefault()
	deferredPrompt = e
	if(addBtn.classList.contains("d-none")) {
		addBtn.classList.remove("d-none")
		const instalabilizador = document.getElementById("instalabilizador")
		if(instalabilizador) {
			instalabilizador.classList.remove("d-none")
		}
	}

	addBtn.addEventListener("click", addToHome)
})

function addToHome(e) {
	const instalabilizador = document.getElementById("instalabilizador")
	if(instalabilizador) {
		instalabilizador.classList.add("d-none")
	}
	addBtn.classList.add("d-none")
	deferredPrompt.prompt()
	deferredPrompt.userChoice.then(function(choiceResult) {
		if(choiceResult.outcome === "accepted") {
			Notiflix.Report.success("Fractuyo instalado", "Ahora estamos entre tus demás aplicaciones.<br>Toca el ícono de la llave para lanzar este simpático generador de comprobantes de pago.","Aceptar")
		}
		else {
			Notiflix.Report.info("Sin instalar", "Instálanos para estar estar siempre contigo. No ocupamos casi nada de espacio.", "Aceptar")
		}
		deferredPrompt = null
	})
}

if("serviceWorker" in navigator) {
	navigator.serviceWorker.register("/service-worker.js").then(function(reg) {
		reg.onupdatefound = function() {
			let installingWorker = reg.installing
			installingWorker.onstatechange = function() {
				switch (installingWorker.state) {
					case "installed":
						if(navigator.serviceWorker.controller) {
							console.log("Contenido nuevo o actualizado está disponible.")
						}
						else {
							console.log("El contenido está ahora disponible offline.")
						}
						break;

					case "redundant":
						console.error("Se está repitiendo la instalación del service worker.")
						break
					}
				};
		}
		console.log("Fractuyo registrado")
	}).catch(function(e) {
		console.error("Error durante registro de SW:", e)
	})

}
