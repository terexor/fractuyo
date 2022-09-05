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
