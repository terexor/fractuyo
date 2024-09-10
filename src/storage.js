/**
 * For managing encrypted "sessions".
 * @ref https://www.tutorialspoint.com/html5/html5_indexeddb.htm
 */
var Storage = function(fractuyo) {
	var db

	var request = window.indexedDB.open("business", 1)

	request.onerror = function(event) {
		Notiflix.Report.warning(event.target.error.message, "No se pudo leer lista de organizaciones.", "Aceptar")
		console.log("error:", event)
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
			Notiflix.Report.success("Datos guardados.", "Ahora podrás usar Fractuyo con los datos proporcionados.", "Gracias")
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
