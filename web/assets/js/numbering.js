/**
 * Copyright from https://gist.github.com/alfchee/e563340276f89b22042a?permalink_comment_id=2682578#gistcomment-2682578
 */
function numberToWords(amount) {
	let numero
	amount = parseFloat(amount)

	if (amount == "0.00" || amount == "0") {
		return "CERO con 00/100 "
	}
	else {
		const ent = amount.toString().split(".")
		let arreglo = separar_split(ent[0])

		switch(arreglo.length) {
			case 1:
				numero = unidades(arreglo[0]);break
			case 2:
				numero = decenas(arreglo[0], arreglo[1]);break
			case 3:
				numero = centenas(arreglo[0], arreglo[1], arreglo[2]);break
			case 4:
				numero = unidadesdemillar(arreglo[0], arreglo[1], arreglo[2], arreglo[3]);break
			case 5:
				numero = decenasdemillar(arreglo[0], arreglo[1], arreglo[2], arreglo[3], arreglo[4]);break
			case 6:
				numero = centenasdemillar(arreglo[0], arreglo[1], arreglo[2], arreglo[3], arreglo[4], arreglo[5]);break
		}

		ent[1] = isNaN(ent[1]) ? '00' : ent[1]

		return numero + " con " + ent[1] + "/100"
	}
}

 function unidades(unidad) {
	const unidades = Array('UN ','DOS ','TRES ' ,'CUATRO ','CINCO ','SEIS ','SIETE ','OCHO ','NUEVE ')

	return unidades[unidad - 1]
}

 function decenas(decena, unidad) {
	const diez = Array('ONCE ','DOCE ','TRECE ','CATORCE ','QUINCE' ,'DIECISEIS ','DIECISIETE ','DIECIOCHO ','DIECINUEVE ')
	const decenas = Array('DIEZ ','VEINTE ','TREINTA ','CUARENTA ','CINCUENTA ','SESENTA ','SETENTA ','OCHENTA ','NOVENTA ')

	if(decena ==0 && unidad == 0) {
		return ""
	}

	if(decena == 0 && unidad > 0) {
		return unidades(unidad)
	}

	if(decena == 1) {
		if(unidad == 0) {
			return decenas[decena -1]
		}
		return diez[unidad -1]
	}
	else if(decena == 2) {
		if(unidad == 0) {
			return decenas[decena -1]
		}
		else if(unidad == 1) {
			return veinte = "VEINTIUNO"
		}
		return veinte = "VEINTI" + unidades(unidad)
	}
	else {
		if(unidad == 0) {
			return decenas[decena -1] + " "
		}
		if(unidad == 1) {
			return decenas[decena -1] + " Y " + "UNO"
		}

		return decenas[decena -1] + " Y " + unidades(unidad)
	}
}

 function centenas(centena, decena, unidad) {
	const centenas = Array( "CIENTO ", "DOSCIENTOS ", "TRESCIENTOS ", "CUATROCIENTOS ","QUINIENTOS ","SEISCIENTOS ","SETECIENTOS ", "OCHOCIENTOS ","NOVECIENTOS ")

	if(centena == 0 && decena == 0 && unidad == 0) {
		return ""
	}
	if(centena == 1 && decena == 0 && unidad == 0) {
		return "CIEN "
	}

	if(centena == 0 && decena == 0 && unidad > 0) {
		return unidades(unidad)
	}

	if(decena == 0 && unidad == 0) {
		return centenas[centena - 1]  +  ""
	}

	if(decena == 0) {
		let numero = centenas[centena - 1] + "" + decenas(decena, unidad)
		return numero.replace(" Y ", " ")
	}
	if(centena == 0) {
		return decenas(decena, unidad)
	}

	return centenas[centena - 1]  +  "" + decenas(decena, unidad)
}

 function unidadesdemillar(unimill, centena, decena, unidad) {
	let numero = unidades(unimill) + " MIL " + centenas(centena, decena, unidad)
	numero = numero.replace("UN  MIL ", "MIL " )
	if(unidad == 0) {
		return numero.replace(" Y ", " ")
	}
	return numero
}

function decenasdemillar(decemill, unimill, centena, decena, unidad) {
	return decenas(decemill, unimill) + " MIL " + centenas(centena, decena, unidad)
}

function centenasdemillar(centenamill,decemill, unimill, centena, decena, unidad) {
	return centenas(centenamill,decemill, unimill) + " MIL " + centenas(centena, decena, unidad)
}

function separar_split(texto){
	let contenido = new Array()
	for(let i = 0; i < texto.length; ++i) {
		contenido[i] = texto.substr(i,1)
	}
	return contenido
}
