import { Invoice, Item, Share, Charge, Person, Taxpayer, Identification } from '../src/fractuyo.js';

if (typeof Invoice === 'undefined') {
	throw new Error('Invoice is not defined');
}
