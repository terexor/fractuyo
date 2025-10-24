# FracTuyo

Now it's a library for generating electronic invoices with JavaScript. This library follows 🇵🇪 Sunat's regulations on invoices.

When items are added, receipt amounts are calculated.

It doesn't contain anything visual so it doesn't generate a PDF file for printing either.

This library is similar to Greenter (PHP), but although Sunat has not standardized all its channels to reach its servers, Fractuyo uses the same interface for everything.

## What do you need?

To generate a document you only need the data.

To sign the document you will need a digital certificate and the private key.

## What documents can you generate?

### Invoice

This is the main document. Two types can be represented: _factura_ and _boleta de venta_.

### Note

Two types can be generated: _credit note_ and _debit note_.

### Despatch

For _carrier_ or _remitter_.


## Usage

```javascript
// needed classes
import { Invoice, Person, Taxpayer, Identification } from "fractuyo";

const customer = new Person();
customer.setName("George A. Garro");
customer.setIdentification(new Identification(6, "10000000001"));

const taxpayer = new Taxpayer();
taxpayer.setIdentification(new Identification(6, "20000000001"));
taxpayer.setName("Monsters Inc.");
taxpayer.setSolUser("usuarioSOL"); // for SOAP
taxpayer.setSolPass("claveSOL");
taxpayer.setSolId("id"); // for REST
taxpayer.setCert("rsaCertContent");
taxpayer.setKey("rsaKeyContent");

const receipt = new Invoice(taxpayer, customer);
invoice.setCurrencyId("USD");
invoice.setTypeCode(1); // factura
invoice.setSerie("F000");
invoice.setNumeration(19970601);

const product = new Item("Description");
product.setIgvPercentage(18);
product.setExemptionReasonCode(10);
product.setQuantity(1);
product.setUnitValue(100.00);

product.calcMounts();
// after applying previous calculations.
receipt.addItem(product);

receipt.toXml();
// maybe pass window.crypto
receipt.sign(cryptoLibrary);

// you must save this XML
console.log(receipt.toString());

// send signed XML inside ZIP
const zipStream = await receipt.createZip();
const serverZipStream = await receipt.declare(zipStream);

// also for despatch use receipt.handleTicket()
// save server answer

const [ serverCode, serverDescription ] = await receipt.handleProof(serverZipStream);
```

### Endpoints

You may not need to use the methods of the Endpoint class, as the classes that handle the documents use them internally.

The library includes the HTTP endpoints for SUNAT, both for testing and for production use.

```javascript
import { Endpoint } from "fractuyo";
```

#### Deployment or test

The generation of documents up to the inclusion of the electronic signature is identical in both deployment mode and test mode.

By default, the test endpoints are assigned, and you can switch to the production endpoint by using the following code (before declaring):

```javascript
const receipt = new Invoice(taxpayer, customer);
Endpoint.setDeploymentMode(true); // false for test
receipt.declare(zipStream);
```

#### Change endpoints

If the endpoints are not what you need, then you can assign your own endpoints for both modes individually.

```javascript
let deploymentMode = true; // or false for test
Endpoint.setUrl(Endpoint.INDEX_INVOICE, "new URL", deploymentMode);
Endpoint.setUrl(Endpoint.INDEX_RETENTION, "new URL", deploymentMode);
// and used for despatchs
Endpoint.setUrl(Endpoint.INDEX_TOKEN, "new URL", deploymentMode);
Endpoint.setUrl(Endpoint.INDEX_SEND, "new URL", deploymentMode);
Endpoint.setUrl(Endpoint.INDEX_STATUS, "new URL", deploymentMode);
```

View documentation or source code to check URL structure.

## Test locally

Clone the project.

```bash
  git clone https://github.com/terexor/fractuyo.git
```

Go to the project directory.

```bash
  cd fractuyo
```

Install dependencies.

```bash
  npm install
```

Start test of invoice with AVA.

```bash
  npm run test:invoice
```
In addition to ``invoice`` are available ``credit``, ``debit`` and ``despatch``.

### Validating against XSD schemas

Follow these steps to run XSD validation tests:

1. Add XSD files
Place the required .xsd files inside the folder:

```bash
tests/xsd/2.1/
```
The official XSD files provided by Sunat or OASIS are usually organized in the following subfolders, which must be preserved:

```bash
tests/xsd/2.1/common/
tests/xsd/2.1/maindoc/
```

2. Enable validation tests
Test functions related to XSD validation — such as those under "signing note" — contain a return statement that skips execution.
To actually run those tests, remove the return line inside that test function.

## FAQ

#### Does it generate documents with all the necessary XML tags?

This library has not been tested yet with all possible cases and there may be some missing tags so we ask you to help us with that by reporting or fixing it.

#### Why is everything written in English?

Because I suspect that more people may use or contribute to this library. Also many variables have the names of XML tags defined in UML.

#### Why JavaScript?

Because it can be used directly from the web browser. There is only one technical problem with the web browser when sending to the Sunat server and that is that the Sunat server does not include the necessary header so that the web browser does not block the request.
