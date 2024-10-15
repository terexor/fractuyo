# FracTuyo
Now it's a library for generating electronic invoices with JavaScript. This library follows 🇵🇪 Sunat's regulations on invoices.

When items are added, receipt amounts are calculated.

It doesn't contain anything visual so it doesn't generate a PDF file for printing either.
## Demonstration of usefulness
Since it is written entirely in JavaScript, [it can be run in web browsers](https://fractuyo.terexor.com/) just after setting required data.

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
