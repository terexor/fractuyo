<?php
$json = file_get_contents('php://input');

$data = json_decode($json);

//We must verify data, connection, auth...

$soapUrl = 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService'; // asmx URL of WSDL

 // xml post structure

$xml_post_string = '<?xml version="1.0" encoding="utf-8"?>
				<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://service.sunat.gob.pe" xmlns:ns2="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
					<SOAP-ENV:Header>
						<ns2:Security>
							<ns2:UsernameToken>
								<ns2:Username>20606829265MODDATOS</ns2:Username>
								<ns2:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">moddatos</ns2:Password>
							</ns2:UsernameToken>
						</ns2:Security>
					</SOAP-ENV:Header>
					<SOAP-ENV:Body>
						<ns1:sendBill>
							<fileName>' . $data->filename . '.zip</fileName>
							<contentFile>' . $data->zipb64 . '</contentFile>
						</ns1:sendBill>
					</SOAP-ENV:Body>
				</SOAP-ENV:Envelope>';   // data from the form, e.g. some ID number

	$headers = array(
				"Content-type: text/xml;charset=\"utf-8\"",
				"Accept: text/xml",
				"Cache-Control: no-cache",
				"Pragma: no-cache",
				//~ "SOAPAction: http://connecting.website.com/WSDL_Service/GetPrice",
				"Content-length: ".strlen($xml_post_string),
			); //SOAPAction: your op URL

	$url = $soapUrl;

	// PHP cURL  for https connection with auth
	$ch = curl_init();
	//~ curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 1);
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	//~ curl_setopt($ch, CURLOPT_USERPWD, $soapUser.":".$soapPassword); // username and password - declared at the top of the doc
	//~ curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_ANY);
	//~ curl_setopt($ch, CURLOPT_TIMEOUT, 10);
	curl_setopt($ch, CURLOPT_POST, true);
	curl_setopt($ch, CURLOPT_POSTFIELDS, $xml_post_string); // the SOAP request
	curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

	// converting
	$response = curl_exec($ch);
	curl_close($ch);

	echo $response;
