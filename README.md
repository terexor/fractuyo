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
taxpayer.setSolId("id"); // for REST
taxpayer.setSolUser("user"); // for SOAP
taxpayer.setCert("rsaPublic");

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

The library includes the HTTP endpoints for SUNAT, both for testing and for production use. By default, the test endpoints are assigned, and you can switch to the production endpoint by using the following (before declaring):

```javascript
import { Endpoint } from "fractuyo";
Endpoint.setMode(true); // false for test
```

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

## FAQ

#### Does it generate documents with all the necessary XML tags?

This library has not been tested yet with all possible cases and there may be some missing tags so we ask you to help us with that by reporting or fixing it.

#### Why is everything written in English?

Because I suspect that more people may use or contribute to this library. Also many variables have the names of XML tags defined in UML.

#### Why JavaScript?

Because it can be used directly from the web browser. There is only one technical problem with the web browser when sending to the Sunat server and that is that the Sunat server does not include the necessary header so that the web browser does not block the request.
