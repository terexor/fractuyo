/**
 * Copyright from https://github.com/juanelas/paillier-bigint
 */

/**
 * Absolute value. abs(a)==a if a>=0. abs(a)==-a if a<0
 *
 * @param a
 *
 * @returns The absolute value of a
 */
function abs(a) {
	return (a >= 0) ? a : -a
}

/**
 * Returns the bitlength of a number
 *
 * @param a
 * @returns The bit length
 */
function bitLength(a) {
	if (typeof a === 'number')
		a = BigInt(a)
	if (a === 1n) {
		return 1
	}
	let bits = 1
	do {
		bits++
	} while ((a >>= 1n) > 1n)
	return bits
}

/**
 * An iterative implementation of the extended euclidean algorithm or extended greatest common divisor algorithm.
 * Take positive integers a, b as input, and return a triple (g, x, y), such that ax + by = g = gcd(a, b).
 *
 * @param a
 * @param b
 *
 * @throws {RangeError}
 * This excepction is thrown if a or b are less than 0
 *
 * @returns A triple (g, x, y), such that ax + by = g = gcd(a, b).
 */
function eGcd(a, b) {
	if (typeof a === 'number')
		a = BigInt(a)
	if (typeof b === 'number')
		b = BigInt(b)
	if (a <= 0n || b <= 0n)
		throw new RangeError('a and b MUST be > 0'); // a and b MUST be positive
	let x = 0n
	let y = 1n
	let u = 1n
	let v = 0n
	while (a !== 0n) {
		const q = b / a
		const r = b % a
		const m = x - (u * q)
		const n = y - (v * q)
		b = a
		a = r
		x = u
		y = v
		u = m
		v = n
	}
	return {
		g: b,
		x: x,
		y: y
	}
}

/**
 * Greatest-common divisor of two integers based on the iterative binary algorithm.
 *
 * @param a
 * @param b
 *
 * @returns The greatest common divisor of a and b
 */
function gcd(a, b) {
	let aAbs = (typeof a === 'number') ? BigInt(abs(a)) : abs(a)
	let bAbs = (typeof b === 'number') ? BigInt(abs(b)) : abs(b)
	if (aAbs === 0n) {
		return bAbs
	}
	else if (bAbs === 0n) {
		return aAbs
	}
	let shift = 0n
	while (((aAbs | bAbs) & 1n) === 0n) {
		aAbs >>= 1n
		bAbs >>= 1n
		shift++
	}
	while ((aAbs & 1n) === 0n)
		aAbs >>= 1n
	do {
		while ((bAbs & 1n) === 0n)
			bAbs >>= 1n
		if (aAbs > bAbs) {
			const x = aAbs
			aAbs = bAbs
			bAbs = x
		}
		bAbs -= aAbs
	} while (bAbs !== 0n)
	// rescale
	return aAbs << shift
}

/**
 * The least common multiple computed as abs(a*b)/gcd(a,b)
 * @param a
 * @param b
 *
 * @returns The least common multiple of a and b
 */
function lcm(a, b) {
	if (typeof a === 'number')
		a = BigInt(a)
	if (typeof b === 'number')
		b = BigInt(b)
	if (a === 0n && b === 0n)
		return BigInt(0)
	// return abs(a * b) as bigint / gcd(a, b)
	return abs((a / gcd(a, b)) * b)
}

/**
 * Finds the smallest positive element that is congruent to a in modulo n
 *
 * @remarks
 * a and b must be the same type, either number or bigint
 *
 * @param a - An integer
 * @param n - The modulo
 *
 * @throws {RangeError}
 * Excpeption thrown when n is not > 0
 *
 * @returns A bigint with the smallest positive representation of a modulo n
 */
function toZn(a, n) {
	if (typeof a === 'number')
		a = BigInt(a)
	if (typeof n === 'number')
		n = BigInt(n)
	if (n <= 0n) {
		throw new RangeError('n must be > 0')
	}
	const aZn = a % n
	return (aZn < 0n) ? aZn + n : aZn
}

/**
 * Modular inverse.
 *
 * @param a The number to find an inverse for
 * @param n The modulo
 *
 * @throws {RangeError}
 * Excpeption thorwn when a does not have inverse modulo n
 *
 * @returns The inverse modulo n
 */
function modInv(a, n) {
	const egcd = eGcd(toZn(a, n), n)
	if (egcd.g !== 1n) {
		throw new RangeError(`${a.toString()} does not have inverse modulo ${n.toString()}`); // modular inverse does not exist
	}
	else {
		return toZn(egcd.x, n)
	}
}

/**
 * Modular exponentiation b**e mod n. Currently using the right-to-left binary method
 *
 * @param b base
 * @param e exponent
 * @param n modulo
 *
 * @throws {RangeError}
 * Excpeption thrown when n is not > 0
 *
 * @returns b**e mod n
 */
function modPow(b, e, n) {
	if (typeof b === 'number')
		b = BigInt(b)
	if (typeof e === 'number')
		e = BigInt(e)
	if (typeof n === 'number')
		n = BigInt(n)
	if (n <= 0n) {
		throw new RangeError('n must be > 0')
	}
	else if (n === 1n) {
		return 0n
	}
	b = toZn(b, n)
	if (e < 0n) {
		return modInv(modPow(b, abs(e), n), n)
	}
	let r = 1n
	while (e > 0) {
		if ((e % 2n) === 1n) {
			r = r * b % n
		}
		e = e / 2n
		b = b ** 2n % n
	}
	return r
}

function fromBuffer(buf) {
	let ret = 0n
	for (const i of buf.values()) {
		const bi = BigInt(i)
		ret = (ret << 8n) + bi
	}
	return ret
}

/**
 * Secure random bytes for both node and browsers. Node version uses crypto.randomBytes() and browser one self.crypto.getRandomValues()
 *
 * @param byteLength - The desired number of random bytes
 * @param forceLength - If we want to force the output to have a bit length of 8*byteLength. It basically forces the msb to be 1
 *
 * @throws {RangeError}
 * byteLength MUST be > 0
 *
 * @returns A promise that resolves to a UInt8Array/Buffer (Browser/Node.js) filled with cryptographically secure random bytes
 */
function randBytes(byteLength, forceLength = false) {
	if (byteLength < 1)
		throw new RangeError('byteLength MUST be > 0')
	return new Promise(function (resolve, reject) {
		{ // browser
			const buf = new Uint8Array(byteLength)
			self.crypto.getRandomValues(buf)
			// If fixed length is required we put the first bit to 1 -> to get the necessary bitLength
			if (forceLength)
				buf[0] = buf[0] | 128
			resolve(buf)
		}
	})
}
/**
 * Secure random bytes for both node and browsers. Node version uses crypto.randomFill() and browser one self.crypto.getRandomValues()
 *
 * @param byteLength - The desired number of random bytes
 * @param forceLength - If we want to force the output to have a bit length of 8*byteLength. It basically forces the msb to be 1
 *
 * @throws {RangeError}
 * byteLength MUST be > 0
 *
 * @returns A UInt8Array/Buffer (Browser/Node.js) filled with cryptographically secure random bytes
 */
function randBytesSync(byteLength, forceLength = false) {
	if (byteLength < 1)
		throw new RangeError('byteLength MUST be > 0')
	/* eslint-disable no-lone-blocks */
	{ // browser
		const buf = new Uint8Array(byteLength)
		self.crypto.getRandomValues(buf)
		// If fixed length is required we put the first bit to 1 -> to get the necessary bitLength
		if (forceLength)
			buf[0] = buf[0] | 128
		return buf
	}
	/* eslint-enable no-lone-blocks */
}

/**
 * Secure random bits for both node and browsers. Node version uses crypto.randomFill() and browser one self.crypto.getRandomValues()
 *
 * @param bitLength - The desired number of random bits
 * @param forceLength - If we want to force the output to have a specific bit length. It basically forces the msb to be 1
 *
 * @throws {RangeError}
 * bitLength MUST be > 0
 *
 * @returns A Promise that resolves to a UInt8Array/Buffer (Browser/Node.js) filled with cryptographically secure random bits
 */
function randBits(bitLength, forceLength = false) {
	if (bitLength < 1)
		throw new RangeError('bitLength MUST be > 0')
	const byteLength = Math.ceil(bitLength / 8)
	const bitLengthMod8 = bitLength % 8
	return new Promise((resolve, reject) => {
		randBytes(byteLength, false).then(function (rndBytes) {
			if (bitLengthMod8 !== 0) {
				// Fill with 0's the extra bits
				rndBytes[0] = rndBytes[0] & (2 ** bitLengthMod8 - 1)
			}
			if (forceLength) {
				const mask = (bitLengthMod8 !== 0) ? 2 ** (bitLengthMod8 - 1) : 128
				rndBytes[0] = rndBytes[0] | mask
			}
			resolve(rndBytes)
		})
	})
}
/**
 * Secure random bits for both node and browsers. Node version uses crypto.randomFill() and browser one self.crypto.getRandomValues()
 * @param bitLength - The desired number of random bits
 * @param forceLength - If we want to force the output to have a specific bit length. It basically forces the msb to be 1
 *
 * @throws {RangeError}
 * bitLength MUST be > 0
 *
 * @returns A Uint8Array/Buffer (Browser/Node.js) filled with cryptographically secure random bits
 */
function randBitsSync(bitLength, forceLength = false) {
	if (bitLength < 1)
		throw new RangeError('bitLength MUST be > 0')
	const byteLength = Math.ceil(bitLength / 8)
	const rndBytes = randBytesSync(byteLength, false)
	const bitLengthMod8 = bitLength % 8
	if (bitLengthMod8 !== 0) {
		// Fill with 0's the extra bits
		rndBytes[0] = rndBytes[0] & (2 ** bitLengthMod8 - 1)
	}
	if (forceLength) {
		const mask = (bitLengthMod8 !== 0) ? 2 ** (bitLengthMod8 - 1) : 128
		rndBytes[0] = rndBytes[0] | mask
	}
	return rndBytes
}

/**
 * Returns a cryptographically secure random integer between [min,max].
 * @param max Returned value will be <= max
 * @param min Returned value will be >= min
 *
 * @throws {RangeError}
 * Arguments MUST be: max > min
 *
 * @returns A cryptographically secure random bigint between [min,max]
 */
function randBetween(max, min = 1n) {
	if (max <= min)
		throw new RangeError('Arguments MUST be: max > min')
	const interval = max - min
	const bitLen = bitLength(interval)
	let rnd
	do {
		const buf = randBitsSync(bitLen)
		rnd = fromBuffer(buf)
	} while (rnd > interval)
	return rnd + min
}

function _workerUrl(workerCode) {
	workerCode = `(() => {${workerCode}})()`; // encapsulate IIFE
	const _blob = new Blob([workerCode], { type: 'text/javascript' })
	return window.URL.createObjectURL(_blob)
}
let _useWorkers = false; // The following is just to check whether we can use workers
/* eslint-disable no-lone-blocks */
{ // Native JS
	if (self.Worker !== undefined)
		_useWorkers = true
}

/**
 * The test first tries if any of the first 250 small primes are a factor of the input number and then passes several
 * iterations of Miller-Rabin Probabilistic Primality Test (FIPS 186-4 C.3.1)
 *
 * @param w - A positive integer to be tested for primality
 * @param iterations - The number of iterations for the primality test. The value shall be consistent with Table C.1, C.2 or C.3
 * @param disableWorkers - Disable the use of workers for the primality test
 *
 * @throws {RangeError}
 * w MUST be >= 0
 *
 * @returns A promise that resolves to a boolean that is either true (a probably prime number) or false (definitely composite)
 */
function isProbablyPrime(w, iterations = 16, disableWorkers = false) {
	if (typeof w === 'number') {
		w = BigInt(w)
	}
	if (w < 0n)
		throw RangeError('w MUST be >= 0')
	{ // browser
		return new Promise((resolve, reject) => {
			const worker = new Worker(_isProbablyPrimeWorkerUrl())
			worker.onmessage = (event) => {
				worker.terminate()
				resolve(event.data.isPrime)
			}
			worker.onmessageerror = (event) => {
				reject(event)
			}
			const msg = {
				rnd: w,
				iterations: iterations,
				id: 0
			}
			worker.postMessage(msg)
		})
	}
}
function _isProbablyPrime(w, iterations) {
	/*
	PREFILTERING. Even values but 2 are not primes, so don't test.
	1 is not a prime and the M-R algorithm needs w>1.
	*/
	if (w === 2n)
		return true
	else if ((w & 1n) === 0n || w === 1n)
		return false
	/*
	  Test if any of the first 250 small primes are a factor of w. 2 is not tested because it was already tested above.
	  */
	const firstPrimes = [
		3n,
		5n,
		7n,
		11n,
		13n,
		17n,
		19n,
		23n,
		29n,
		31n,
		37n,
		41n,
		43n,
		47n,
		53n,
		59n,
		61n,
		67n,
		71n,
		73n,
		79n,
		83n,
		89n,
		97n,
		101n,
		103n,
		107n,
		109n,
		113n,
		127n,
		131n,
		137n,
		139n,
		149n,
		151n,
		157n,
		163n,
		167n,
		173n,
		179n,
		181n,
		191n,
		193n,
		197n,
		199n,
		211n,
		223n,
		227n,
		229n,
		233n,
		239n,
		241n,
		251n,
		257n,
		263n,
		269n,
		271n,
		277n,
		281n,
		283n,
		293n,
		307n,
		311n,
		313n,
		317n,
		331n,
		337n,
		347n,
		349n,
		353n,
		359n,
		367n,
		373n,
		379n,
		383n,
		389n,
		397n,
		401n,
		409n,
		419n,
		421n,
		431n,
		433n,
		439n,
		443n,
		449n,
		457n,
		461n,
		463n,
		467n,
		479n,
		487n,
		491n,
		499n,
		503n,
		509n,
		521n,
		523n,
		541n,
		547n,
		557n,
		563n,
		569n,
		571n,
		577n,
		587n,
		593n,
		599n,
		601n,
		607n,
		613n,
		617n,
		619n,
		631n,
		641n,
		643n,
		647n,
		653n,
		659n,
		661n,
		673n,
		677n,
		683n,
		691n,
		701n,
		709n,
		719n,
		727n,
		733n,
		739n,
		743n,
		751n,
		757n,
		761n,
		769n,
		773n,
		787n,
		797n,
		809n,
		811n,
		821n,
		823n,
		827n,
		829n,
		839n,
		853n,
		857n,
		859n,
		863n,
		877n,
		881n,
		883n,
		887n,
		907n,
		911n,
		919n,
		929n,
		937n,
		941n,
		947n,
		953n,
		967n,
		971n,
		977n,
		983n,
		991n,
		997n,
		1009n,
		1013n,
		1019n,
		1021n,
		1031n,
		1033n,
		1039n,
		1049n,
		1051n,
		1061n,
		1063n,
		1069n,
		1087n,
		1091n,
		1093n,
		1097n,
		1103n,
		1109n,
		1117n,
		1123n,
		1129n,
		1151n,
		1153n,
		1163n,
		1171n,
		1181n,
		1187n,
		1193n,
		1201n,
		1213n,
		1217n,
		1223n,
		1229n,
		1231n,
		1237n,
		1249n,
		1259n,
		1277n,
		1279n,
		1283n,
		1289n,
		1291n,
		1297n,
		1301n,
		1303n,
		1307n,
		1319n,
		1321n,
		1327n,
		1361n,
		1367n,
		1373n,
		1381n,
		1399n,
		1409n,
		1423n,
		1427n,
		1429n,
		1433n,
		1439n,
		1447n,
		1451n,
		1453n,
		1459n,
		1471n,
		1481n,
		1483n,
		1487n,
		1489n,
		1493n,
		1499n,
		1511n,
		1523n,
		1531n,
		1543n,
		1549n,
		1553n,
		1559n,
		1567n,
		1571n,
		1579n,
		1583n,
		1597n
	]
	for (let i = 0; i < firstPrimes.length && (firstPrimes[i] <= w); i++) {
		const p = firstPrimes[i]
		if (w === p)
			return true
		else if (w % p === 0n)
			return false
	}
	/*
	  1. Let a be the largest integer such that 2**a divides w−1.
	  2. m = (w−1) / 2**a.
	  3. wlen = len (w).
	  4. For i = 1 to iterations do
		  4.1 Obtain a string b of wlen bits from an RBG.
		  Comment: Ensure that 1 < b < w−1.
		  4.2 If ((b ≤ 1) or (b ≥ w−1)), then go to step 4.1.
		  4.3 z = b**m mod w.
		  4.4 If ((z = 1) or (z = w − 1)), then go to step 4.7.
		  4.5 For j = 1 to a − 1 do.
		  4.5.1 z = z**2 mod w.
		  4.5.2 If (z = w−1), then go to step 4.7.
		  4.5.3 If (z = 1), then go to step 4.6.
		  4.6 Return COMPOSITE.
		  4.7 Continue.
		  Comment: Increment i for the do-loop in step 4.
	  5. Return PROBABLY PRIME.
	  */
	let a = 0n
	const d = w - 1n
	let aux = d
	while (aux % 2n === 0n) {
		aux /= 2n
		++a
	}
	const m = d / (2n ** a)
	do {
		const b = randBetween(d, 2n)
		let z = modPow(b, m, w)
		if (z === 1n || z === d)
			continue
		let j = 1
		while (j < a) {
			z = modPow(z, 2n, w)
			if (z === d)
				break
			if (z === 1n)
				return false
			j++
		}
		if (z !== d)
			return false
	} while (--iterations !== 0)
	return true
}
function _isProbablyPrimeWorkerUrl() {
	// Let's us first add all the required functions
	let workerCode = `'use strict';const ${eGcd.name}=${eGcd.toString()};const ${modInv.name}=${modInv.toString()};const ${modPow.name}=${modPow.toString()};const ${toZn.name}=${toZn.toString()};const ${randBitsSync.name}=${randBitsSync.toString()};const ${randBytesSync.name}=${randBytesSync.toString()};const ${randBetween.name}=${randBetween.toString()};const ${isProbablyPrime.name}=${_isProbablyPrime.toString()};${bitLength.toString()};${fromBuffer.toString()};`
	workerCode += `onmessage=async function(_e){const _m={isPrime:await ${isProbablyPrime.name}(_e.data.rnd,_e.data.iterations),value:_e.data.rnd,id:_e.data.id};postMessage(_m);}`
	return _workerUrl(workerCode)
}

/**
 * A probably-prime (Miller-Rabin), cryptographically-secure, random-number generator.
 * The browser version uses web workers to parallelise prime look up. Therefore, it does not lock the UI
 * main process, and it can be much faster (if several cores or cpu are available).
 * The node version can also use worker_threads if they are available (enabled by default with Node 11 and
 * and can be enabled at runtime executing node --experimental-worker with node >=10.5.0).
 *
 * @param bitLength - The required bit length for the generated prime
 * @param iterations - The number of iterations for the Miller-Rabin Probabilistic Primality Test
 *
 * @throws {RangeError}
 * bitLength MUST be > 0
 *
 * @returns A promise that resolves to a bigint probable prime of bitLength bits.
 */
function prime(bitLength, iterations = 16) {
	if (bitLength < 1)
		throw new RangeError('bitLength MUST be > 0')
	/* c8 ignore start */
	if (!_useWorkers) { // If there is no support for workers
		let rnd = 0n
		do {
			rnd = fromBuffer(randBitsSync(bitLength, true))
		} while (!_isProbablyPrime(rnd, iterations))
		return new Promise((resolve) => { resolve(rnd); })
	}
	/* c8 ignore stop */
	return new Promise((resolve, reject) => {
		const workerList = []
		const _onmessage = (msg, newWorker) => {
			if (msg.isPrime) {
				// if a prime number has been found, stop all the workers, and return it
				for (let j = 0; j < workerList.length; j++) {
					workerList[j].terminate(); // eslint-disable-line @typescript-eslint/no-floating-promises
				}
				while (workerList.length > 0) {
					workerList.pop()
				}
				resolve(msg.value)
			}
			else { // if a composite is found, make the worker test another random number
				const buf = randBitsSync(bitLength, true)
				const rnd = fromBuffer(buf)
				try {
					const msgToWorker = {
						rnd: rnd,
						iterations: iterations,
						id: msg.id
					}
					newWorker.postMessage(msgToWorker)
				}
				catch (error) {
					// The worker has already terminated. There is nothing to handle here
				}
			}
		}
		{ // browser
			const workerURL = _isProbablyPrimeWorkerUrl()
			for (let i = 0; i < self.navigator.hardwareConcurrency - 1; i++) {
				const newWorker = new Worker(workerURL)
				newWorker.onmessage = (event) => _onmessage(event.data, newWorker)
				workerList.push(newWorker)
			}
		}
		for (let i = 0; i < workerList.length; i++) {
			randBits(bitLength, true).then(function (buf) {
				const rnd = fromBuffer(buf)
				workerList[i].postMessage({
					rnd: rnd,
					iterations: iterations,
					id: i
				})
			}).catch(reject)
		}
	})
}
/**
 * A probably-prime (Miller-Rabin), cryptographically-secure, random-number generator.
 * The sync version is NOT RECOMMENDED since it won't use workers and thus it'll be slower and may freeze thw window in browser's javascript. Please consider using prime() instead.
 *
 * @param bitLength - The required bit length for the generated prime
 * @param iterations - The number of iterations for the Miller-Rabin Probabilistic Primality Test
 *
 * @throws {RangeError}
 * bitLength MUST be > 0
 *
 * @returns A bigint probable prime of bitLength bits.
 */
function primeSync(bitLength, iterations = 16) {
	if (bitLength < 1)
		throw new RangeError('bitLength MUST be > 0')
	let rnd = 0n
	do {
		rnd = fromBuffer(randBitsSync(bitLength, true))
	} while (!_isProbablyPrime(rnd, iterations))
	return rnd
}

/**
 * Class for a Paillier public key
 */
class PublicKey {
	/**
	   * Creates an instance of class PublicKey
	   * @param n - The public modulo
	   * @param g - The public generator
	   */
	constructor(n, g) {
		this.n = n
		this._n2 = this.n ** 2n; // cache n^2
		this.g = g
	}
	/**
	   * Get the bit length of the public modulo
	   * @returns The bit length of the public modulo
	   */
	get bitLength() {
		return bitLength(this.n)
	}
	/**
	   * Paillier public-key encryption
	   *
	   * @param m - A bigint representation of a plaintext message
	   * @param r - The random integer factor for encryption. By default is a random in (1,n)
	   *
	   * @returns The encryption of m with this public key
	   */
	encrypt(m, r) {
		if (r === undefined) {
			do {
				r = randBetween(this.n)
			} while (gcd(r, this.n) !== 1n)
		}
		return (modPow(this.g, m, this._n2) * modPow(r, this.n, this._n2)) % this._n2
	}
	/**
	   * Homomorphic addition
	   *
	   * @param ciphertexts - n >= 2 ciphertexts (c_1,..., c_n) that are the encryption of (m_1, ..., m_n) with this public key
	   *
	   * @returns The encryption of (m_1 + ... + m_n) with this public key
	   */
	addition(...ciphertexts) {
		return ciphertexts.reduce((sum, next) => sum * next % this._n2, 1n)
	}
	/**
	   * Pseudo-homomorphic addition of plaintext to chipertext
	   *
	   * @param ciphertext - an encryption of m1 with this public key
	   * @param plaintexts - 1 or more plaintexts (m_2, ..., m_n)
	   *
	   * @returns The encryption of (m_1 + ... + m_n) with this public key
	   */
	plaintextAddition(ciphertext, ...plaintexts) {
		return plaintexts.reduce((sum, next) => sum * modPow(this.g, next, this._n2) % this._n2, ciphertext)
	}
	/**
	   * Pseudo-homomorphic Paillier multiplication
	   *
	   * @param {bigint} c - a number m encrypted with this public key
	   * @param {bigint | number} k - either a bigint or a number
	   *
	   * @returns {bigint} - the encryption of k·m with this public key
	   */
	multiply(c, k) {
		return modPow(c, k, this._n2)
	}
}

/**
 * Class for Paillier private keys.
 */
class PrivateKey {
	/**
	   * Creates an instance of class PrivateKey
	   *
	   * @param lambda
	   * @param mu
	   * @param publicKey
	   * @param p - a big prime
	   * @param q- a big prime
	   */
	constructor(lambda, mu, publicKey, p, q) {
		this.lambda = lambda
		this.mu = mu
		this._p = p
		this._q = q
		this.publicKey = publicKey
	}
	/**
	 * Get the bit length of the public modulo
	 * @returns The bit length of the public modulo
	 */
	get bitLength() {
		return bitLength(this.publicKey.n)
	}
	/**
	 * Get the public modulo n=p·q
	 * @returns The public modulo n=p·q
	 */
	get n() {
		return this.publicKey.n
	}
	/**
	 * Paillier private-key decryption
	 *
	 * @param c - A bigint encrypted with the public key
	 *
	 * @returns The decryption of c with this private key
	 */
	decrypt(c) {
		return (L(modPow(c, this.lambda, this.publicKey._n2), this.publicKey.n) * this.mu) % this.publicKey.n
	}
	/**
	 * Recover the random factor used for encrypting a message with the complementary public key.
	 * The recovery function only works if the public key generator g was using the simple variant
	 * g = 1 + n
	 * It is also necessary to know p and q (usually stored in the private key)
	 *
	 * @param c - The encryption using the public of message m with random factor r
	 *
	 * @returns The random factor (mod n)
	 *
	 * @throws {RangeError}
	 * Cannot recover the random factor if publicKey.g != publicKey.n + 1. You should generate yout keys using the simple variant, e.g. generateRandomKeys(3072, true) )
	 *
	 * @throws {Error}
	 * Cannot get random factor without knowing p and q
	 *
	 */
	getRandomFactor(c) {
		if (this.publicKey.g !== this.n + 1n)
			throw RangeError('Cannot recover the random factor if publicKey.g != publicKey.n + 1. You should generate yout keys using the simple variant, e.g. generateRandomKeys(3072, true) )')
		if (this._p === undefined || this._q === undefined) {
			throw Error('Cannot get random factor without knowing p and q')
		}
		const m = this.decrypt(c)
		const phi = (this._p - 1n) * (this._q - 1n)
		const nInvModPhi = modInv(this.n, phi)
		const c1 = c * (1n - m * this.n) % this.publicKey._n2
		return modPow(c1, nInvModPhi, this.n)
	}
}
function L(a, n) {
	return (a - 1n) / n
}

async function generateKeys(p, q, bitlength = 2048, simpleVariant = false) {
	let n, g, lambda, mu
	n = p * q
	if (simpleVariant) {
		// If using p,q of equivalent length, a simpler variant of the key
		// generation steps would be to set
		// g=n+1, lambda=(p-1)(q-1), mu=lambda.invertm(n)
		g = n + 1n
		lambda = (p - 1n) * (q - 1n)
		mu = modInv(lambda, n)
	}
	else {
		const n2 = n ** 2n
		g = getGenerator(n, n2)
		lambda = lcm(p - 1n, q - 1n)
		mu = modInv(L(modPow(g, lambda, n2), n), n)
	}
	const publicKey = new PublicKey(n, g)
	const privateKey = new PrivateKey(lambda, mu, publicKey, p, q)
	return { publicKey, privateKey }
}

/**
 * Generates a pair private, public key for the Paillier cryptosystem.
 *
 * @param bitlength - The bit length of the public modulo
 * @param simplevariant - Use the simple variant to compute the generator (g=n+1). This is REQUIRED if you want to be able to recover the random integer factor used when encrypting with the public key
 *
 * @returns A promise that resolves to a {@link KeyPair} of public, private keys
 */
async function generateRandomKeys(bitlength = 3072, simpleVariant = false) {
	let p, q, n, g, lambda, mu
	// if p and q are bitLength/2 long ->  2**(bitLength - 2) <= n < 2**(bitLength)
	do {
		p = await prime(Math.floor(bitlength / 2) + 1)
		q = await prime(Math.floor(bitlength / 2))
		n = p * q
	} while (q === p || bitLength(n) !== bitlength)
	if (simpleVariant) {
		// If using p,q of equivalent length, a simpler variant of the key
		// generation steps would be to set
		// g=n+1, lambda=(p-1)(q-1), mu=lambda.invertm(n)
		g = n + 1n
		lambda = (p - 1n) * (q - 1n)
		mu = modInv(lambda, n)
	}
	else {
		const n2 = n ** 2n
		g = getGenerator(n, n2)
		lambda = lcm(p - 1n, q - 1n)
		mu = modInv(L(modPow(g, lambda, n2), n), n)
	}
	const publicKey = new PublicKey(n, g)
	const privateKey = new PrivateKey(lambda, mu, publicKey, p, q)
	return { publicKey, privateKey }
}
/**
 * Generates a pair private, public key for the Paillier cryptosystem in synchronous mode.
 * Synchronous mode is NOT RECOMMENDED since it won't use workers and thus it'll be slower and may freeze thw window in browser's javascript.
 *
 * @param bitlength - The bit length of the public modulo
 * @param simplevariant - Use the simple variant to compute the generator (g=n+1)
 *
 * @returns A pair of public, private keys
 */
function generateRandomKeysSync(bitlength = 3072, simpleVariant = false) {
	let p, q, n, g, lambda, mu
	// if p and q are bitLength/2 long ->  2**(bitLength - 2) <= n < 2**(bitLength)
	do {
		p = primeSync(Math.floor(bitlength / 2) + 1)
		q = primeSync(Math.floor(bitlength / 2))
		n = p * q
	} while (q === p || bitLength(n) !== bitlength)
	if (simpleVariant) {
		// If using p,q of equivalent length, a simpler variant of the key
		// generation steps would be to set
		// g=n+1, lambda=(p-1)(q-1), mu=lambda.invertm(n)
		g = n + 1n
		lambda = (p - 1n) * (q - 1n)
		mu = modInv(lambda, n)
	}
	else {
		const n2 = n ** 2n
		g = getGenerator(n, n2)
		lambda = lcm(p - 1n, q - 1n)
		mu = modInv(L(modPow(g, lambda, n2), n), n)
	}
	const publicKey = new PublicKey(n, g)
	const privateKey = new PrivateKey(lambda, mu, publicKey, p, q)
	return { publicKey, privateKey }
}
function getGenerator(n, n2) {
	const alpha = randBetween(n)
	const beta = randBetween(n)
	return ((alpha * n + 1n) * modPow(beta, n, n2)) % n2
}
