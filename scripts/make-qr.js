// Erzeugt docs/img/qr.svg mit dem Link zur App (einmalig bzw. wenn sich der Link ändert)
// Aufruf: node scripts/make-qr.js
import QRCode from 'qrcode';
import { writeFileSync, mkdirSync } from 'node:fs';
const URL = 'https://bauer-reisen.github.io/film-app/';
mkdirSync('docs/img', { recursive: true });
const svg = await QRCode.toString(URL, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } });
writeFileSync('docs/img/qr.svg', svg);
console.log('docs/img/qr.svg geschrieben für', URL);
