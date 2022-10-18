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
						subtotal blob,\
						gravado blob,\
						exonerado blob,\
						inafecto blob,\
						isc blob,\
						igv blob,\
						icbp blob\
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
		customer.setAddress(formulario.elements["customer-address"].value.trim())
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
				product.setUnitCode("ZZ")
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

		invoice.setSerie(formulario.elements["serie"].value)
		invoice.setCurrencyId(formulario.elements.moneda.value)

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

		dbInvoices.run("UPDATE serie SET numero = ? WHERE serie = ?", [invoice.getNumeration(), invoice.getSerie()])
		dbInvoices.run("INSERT INTO invoice VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", [
			null, Date.now(), invoice.getTypeCode(), invoice.getSerie(), invoice.getNumeration(),
			window.Encoding.hexToBuf( invoice.getEncryptedLineExtensionAmount().toString(16) ),
			window.Encoding.hexToBuf( invoice.getEncryptedOperationAmounts(0).toString(16) ),
			window.Encoding.hexToBuf( invoice.getEncryptedOperationAmounts(1).toString(16) ),
			window.Encoding.hexToBuf( invoice.getEncryptedOperationAmounts(2).toString(16) ),
			window.Encoding.hexToBuf( invoice.getEncryptedIscAmount().toString(16) ),
			window.Encoding.hexToBuf( invoice.getEncryptedIgvAmount().toString(16) ),
			window.Encoding.hexToBuf( invoice.getEncryptedIcbpAmount().toString(16) )
		])

		// Find directory structure
		let handleDirectory = await globalDirHandle.getDirectoryHandle("docs", { create: true })
		handleDirectory = await handleDirectory.getDirectoryHandle("xml", { create: true })
		handleDirectory = await handleDirectory.getDirectoryHandle(new Date().toISOString().substr(0, 7), { create: true })

		let fileHandle = await handleDirectory.getFileHandle(invoice.getId(true) + ".xml", { create: true })
		let writable = await fileHandle.createWritable()

		await writable.write(new XMLSerializer().serializeToString(invoice.getXml()))
		await writable.close()

		//Saving file onto disk
		fileHandle = await globalDirHandle.getDirectoryHandle("config")
		fileHandle = await fileHandle.getFileHandle("invoices.dat", { create: true })
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

		taxpayer.setCert(decryptedRsaCert)
		taxpayer.setKey(decryptedRsaPrivate)

		if(decryptedPaillierPrivate) {
			der =  window.Encoding.base64ToBuf( decryptedPaillierPrivate.split(/\n/).filter(function (line) {
				return !/-----/.test(line)
			}).join('') )
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
			der =  window.Encoding.base64ToBuf( decryptedPaillierPublic.split(/\n/).filter(function (line) {
				return !/-----/.test(line)
			}).join('') )
			json = ASN1.parse({ der: der, json: false, verbose: true })
			taxpayer.createPaillierPublicKey(
				BigInt("0x" + window.Encoding.bufToHex(json.children[0].value)),
				BigInt("0x" + window.Encoding.bufToHex(json.children[1].value))
			)
		}

		//Modify in view
		document.getElementById("company-tag").textContent = taxpayer.getName()
		document.getElementById("ruc-tag").textContent = taxpayer.getIdentification().getNumber()
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

	this.listInvoices = function(lastIndex) {
		const list = document.getElementById("lista-cdp")
		if(list == null) {
			Notiflix.Notify.warning("No hay lugar para listar comprobantes.")
			return
		}

		//https://stackoverflow.com/questions/14468586/efficient-paging-in-sqlite-with-millions-of-records
		dbInvoices.each("SELECT fecha, config, serie, numero FROM invoice WHERE id > $lastindex ORDER BY id DESC LIMIT 8", {$lastindex: lastIndex},
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
				switch(row.config & 127) {
					case 1:
						tr.insertCell().appendChild(document.createTextNode("Factura"))
						break
					case 3:
						tr.insertCell().appendChild(document.createTextNode("Boleta de venta"))
						break
					case 7:
						tr.insertCell().appendChild(document.createTextNode("Nota de crédito"))
						break
					case 8:
						tr.insertCell().appendChild(document.createTextNode("Nota de débito"))
						break
					case 9:
						tr.insertCell().appendChild(document.createTextNode("Guía de remisión"))
						break
					default:
						tr.insertCell().appendChild(document.createTextNode("Desconocido"))
				}
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
						fractuyo.declareInvoice(cdpName, new Date(row.fecha).toISOString().substr(0, 7), this)
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
			}
		)
	}

	this.viewInvoice = async function(cdpName) {
		const nameParts = cdpName.split('-')
		const typeCode = parseInt(nameParts[0]), serie = nameParts[1], number = parseInt(nameParts[2])
		dbInvoices.each("SELECT fecha, config FROM invoice WHERE config & 127 = $typecode AND serie = $serie AND numero = $number", {$typecode: typeCode, $serie: serie, $number: number},
			async function(row) {
				let handleDirectoryConfig = await globalDirHandle.getDirectoryHandle("docs")
				handleDirectoryConfig = await handleDirectoryConfig.getDirectoryHandle("xml")
				handleDirectoryConfig = await handleDirectoryConfig.getDirectoryHandle(new Date(row.fecha).toISOString().substr(0, 7))

				let fileHandle = await handleDirectoryConfig.getFileHandle(cdpName + ".xml", {})
				let file = await fileHandle.getFile()
				let xmlContent = await file.text()

				const tabla = document.getElementById("productos")
				while(tabla.hasChildNodes()) {
					tabla.removeChild(tabla.lastChild)
				}

				let xmlDoc = new DOMParser().parseFromString(xmlContent, "text/xml")

				document.getElementById("idComprobante").textContent = xmlDoc.evaluate("/*/cbc:ID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				document.getElementById("moneda").textContent = xmlDoc.evaluate("/*/cbc:DocumentCurrencyCode", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				let tipoDocumento = xmlDoc.evaluate("/*/cbc:InvoiceTypeCode", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				document.getElementById("tipoDocumento").textContent = tipoDocumento == "01" ? "Factura Electrónica" : tipoDocumento == "03" ? "Boleta de Venta Electrónica" : "Desconocido";
				document.getElementById("fecha").textContent = xmlDoc.evaluate("/*/cbc:IssueDate", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				document.getElementById("nombreEmisor").textContent = removeCdataTag( xmlDoc.evaluate("/*/cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue )
				let ruc = xmlDoc.evaluate("/*/cac:AccountingSupplierParty/cbc:CustomerAssignedAccountID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				if(ruc == "")
					ruc = xmlDoc.evaluate("/*/cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification/cbc:ID", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
				document.getElementById("ruc").textContent = ruc

				document.getElementById("nombreCliente").textContent = removeCdataTag( xmlDoc.evaluate("/*/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue )
				document.getElementById("direccionCliente").textContent = removeCdataTag( xmlDoc.evaluate("/*/cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cac:RegistrationAddress/cac:AddressLine/cbc:Line", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue )


				document.getElementById("codHash").textContent = xmlDoc.evaluate("/*/ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/ds:Signature/ds:SignedInfo/ds:Reference/ds:DigestValue", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue

				const count = xmlDoc.evaluate("count(/*/cac:InvoiceLine)", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue

				for(let i = 1; i <= count; ++i) {
					let quantity = xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cbc:InvoicedQuantity", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue
					let unitCode = xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cbc:InvoicedQuantity/@unitCode", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
					let description = xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cac:Item/cbc:Description", xmlDoc, nsResolver, XPathResult.STRING_TYPE, null ).stringValue
					let subtotal = xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cac:Price/cbc:PriceAmount", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue
					let igv = xmlDoc.evaluate("/*/cac:InvoiceLine[" + i + "]/cac:TaxTotal/cbc:TaxAmount", xmlDoc, nsResolver, XPathResult.NUMBER_TYPE, null ).numberValue

					let tr = tabla.insertRow()
					tr.insertCell().appendChild(document.createTextNode(quantity))
					tr.insertCell().appendChild(document.createTextNode(unitCode))
					tr.insertCell().appendChild(document.createTextNode(removeCdataTag(description)))
					tr.insertCell().appendChild(document.createTextNode(subtotal))

					let totalTag = tr.insertCell()
					totalTag.setAttribute("class", "item_r")
					totalTag.appendChild(document.createTextNode(igv))
				}

				new QRCode(document.getElementById("qrcode"), {
					text: //RUC | TIPO DE DOCUMENTO | SERIE | NUMERO | MTO TOTAL IGV | MTO TOTAL DEL COMPROBANTE | FECHA DE EMISION | TIPO DE DOCUMENTO ADQUIRENTE | NUMERO DE DOCUMENTO ADQUIRENTE
						taxpayer.getIdentification().getNumber() + '|'
						+ cdpName.replaceAll('-', '|') + '|'
						+ '18.00' + '|'
						+ '118.00' + '|'
						+ new Date(row.fecha).toISOString().substr(0, 10) + '|'
					,
					width: 100,
					height: 100,
					colorDark: "#111111",
					colorLight: "#ffffff",
					correctLevel : QRCode.CorrectLevel.H
				})
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
			const xhttp = new XMLHttpRequest()
			xhttp.onload = async function() {
				const xml = XAdES.Parse( this.responseText )
				let zipb64retornado
				try {
					//CDR
					zipb64retornado = xml.getElementsByTagName("applicationResponse")[0].textContent

					handleDirectory = await handleDocsDirectory.getDirectoryHandle("cdr", { create: true })
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

							//~ const confResponseCode = responseCode << 9 | 1 << 8

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

							if(isUpdateable) {
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
			xhttp.send( JSON.stringify( {zipb64: zipb64, filename: fileName} ) )
		})
	}

	this.reportAmounts = function(identity) {
		dbInvoices.each("SELECT subtotal FROM invoice WHERE id = $identity", {$identity: identity},
			function(row) {
				let encrSubtotal = BigInt("0x" + window.Encoding.bufToHex( row.subtotal ) )
				console.log( Number( taxpayer.getPaillierPrivateKey().decrypt(encrSubtotal) * 100n / 100n ) / 100 )
			}
		)
	}
}
