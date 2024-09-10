/**
 * For encrypting secret data.
 * @ref https://github.com/Ajaxy/telegram-tt/blob/master/src/util/passcode.ts
 */
var Passcode = function() {
	var SALT = "[salt]FRACTUYO"
	var IV_LENGTH = 12

	var currentPasscodeHash

	var dataSessionVector

	this.setupPasscode = async function(passcode) {
		currentPasscodeHash = await sha256(passcode)
	}

	/**
	 * Decrypt data that must be inside file.
	 * @encryptedData is all serialized data needed.
	 */
	this.decryptSession = async function(encryptedDataVector) {
		dataSessionVector = new Array()

		//Taxpayer metadata
		let decrypted = await aesDecrypt(encryptedDataVector[0])
		dataSessionVector.push(decrypted)

		//Cert
		decrypted = await aesDecrypt(encryptedDataVector[1])
		dataSessionVector.push(decrypted)

		//Key
		decrypted = await aesDecrypt(encryptedDataVector[2])
		dataSessionVector.push(decrypted)

		//Paillier public
		decrypted = await aesDecrypt(encryptedDataVector[3])
		dataSessionVector.push(decrypted)

		//Paillier private
		if(encryptedDataVector[4]) {
			decrypted = await aesDecrypt(encryptedDataVector[4])
			dataSessionVector.push(decrypted)
		}
	}

	this.getDataSession = function() {
		return dataSessionVector
	}

	/**
	 * @data is all serialized data needed.
	 */
	this.encryptSession = async function(data) {
		if(!currentPasscodeHash) {
			throw new Error("Clave no asignada")
		}

		const sessionEncrypted = await aesEncrypt(data)
		return sessionEncrypted
	}

	var sha256 = function(plaintext) {
		return crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${plaintext}${SALT}`))
	}

	var aesEncrypt = async function(plaintext) {
		const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
		const alg = { name: "AES-GCM", iv }
		const key = await crypto.subtle.importKey("raw", currentPasscodeHash, alg, false, ["encrypt"])
		const ptUint8 = new TextEncoder().encode(plaintext)
		const ctBuffer = await crypto.subtle.encrypt(alg, key, ptUint8)
		const ct = new Uint8Array(ctBuffer)
		const result = new Uint8Array(IV_LENGTH + ct.length)
		result.set(iv, 0)
		result.set(ct, IV_LENGTH)
		return result.buffer
	}

	var aesDecrypt = async function(data) {
		const dataArray = new Uint8Array(data)
		const iv = dataArray.slice(0, IV_LENGTH)
		const alg = { name: "AES-GCM", iv }
		const key = await crypto.subtle.importKey("raw", currentPasscodeHash, alg, false, ["decrypt"])
		const ct = dataArray.slice(IV_LENGTH)
		const plainBuffer = await crypto.subtle.decrypt(alg, key, ct)
		return new TextDecoder().decode(plainBuffer)
	}
}
