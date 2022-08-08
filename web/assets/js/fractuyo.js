const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

var contabilidad = 1

async function facturar(formulario) {
	// Find directory structure
	let handleDirectoryDocs = await globalDirHandle.getDirectoryHandle("docs", { create: true })
	let handleDirectoryXml = await handleDirectoryDocs.getDirectoryHandle("xml", { create: true })

	let fileHandle = await handleDirectoryXml.getFileHandle("F001-" + ++contabilidad + ".txt", { create: true })
	//~ const newFile = await fileHandle.getFile()

	//~ const handle = await window.showSaveFilePicker(options);
	const writable = await fileHandle.createWritable()

	await writable.write("<contenido XML></contenido XML>")
	await writable.close()
}

async function sign() {
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

	const xml = XAdES.Parse(getXml())

	var keys, signature, res = {};
	Promise.resolve()
		.then(function () {
			return generateKey(alg);
		})
		.then(function () {
			signature = new XAdES.SignedXml();

			return signature.Sign(    // Signing document
				alg,                  // algorithm
				key,      // key
				xml,                  // document
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
		.then(function () {
			// Add signature to document
			const xmlEl = xml.getElementsByTagNameNS("urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2", "ExtensionContent")[0]
			xmlEl.appendChild(signature.GetXml())
			document.getElementById("signature").value = new XMLSerializer().serializeToString(xml)
		})
		.catch(function (e) {
			console.error(e);
		});
}

var globalDirHandle

async function certificar() {
	globalDirHandle = await window.showDirectoryPicker();
	await dirHandler(globalDirHandle)
}

async function dirHandler(dirHandle) {
	let fileHandle, file, content

	fileHandle = await dirHandle.getFileHandle("cert.pem", {})
	file = await fileHandle.getFile()
	content = await file.text()
	window.localStorage.setItem("cert", content)

	fileHandle = await dirHandle.getFileHandle("key.pem", {})
	file = await fileHandle.getFile()
	content = await file.text()
	window.localStorage.setItem("pkey", content)
}
