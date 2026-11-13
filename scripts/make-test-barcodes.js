// Testbilder mit ISBN-Strichcodes (EAN-13) zum Ausprobieren des Scannens am Rechner.
// Aufruf: node scripts/make-test-barcodes.js → planung/testbilder/*.png
// Am Rechner unter „Bücher scannen“ → „Keine Kamera?“ → „Foto mit Strichcode wählen“ eines dieser Bilder wählen,
// oder das Bild auf dem Bildschirm öffnen und mit dem Handy scannen.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BOOKS = [
  ['9780451524935', '1984-englisch'],
  ['9783548234106', '1984-deutsch'],
  ['9780747532699', 'harry-potter-englisch'],
  ['9783551551672', 'harry-potter-deutsch'],
  ['9783570585016', 'hundertjaehrige-deutsch'],
  ['9783257229530', 'der-vorleser'],
  ['9780375707971', 'the-reader'],
  ['9780000000002', 'unbekannt'], // gültige Prüfziffer, aber kein Buch
];

// EAN-13: linke Hälfte mit L/G-Mustern je nach erster Ziffer, rechte Hälfte mit R-Mustern
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const R = L.map((p) => [...p].map((b) => (b === '1' ? '0' : '1')).join('')); // Gegenteil von L
const G = R.map((p) => [...p].reverse().join('')); // R rückwärts
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
function bits(code) {
  const d = [...code].map(Number);
  let out = '101';
  for (let i = 1; i <= 6; i++) out += (PARITY[d[0]][i - 1] === 'L' ? L : G)[d[i]];
  out += '01010';
  for (let i = 7; i <= 12; i++) out += R[d[i]];
  return `${out}101`;
}

// Einfaches Graustufen-PNG
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(width, height, pixel) {
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) raw[y * (width + 1) + 1 + x] = pixel(x, y);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('planung/testbilder', { recursive: true });
for (const [code, name] of BOOKS) {
  const b = bits(code);
  const module = 4; const quiet = 12 * module;
  const width = b.length * module + 2 * quiet; const height = 220;
  const img = png(width, height, (x, y) => {
    const i = Math.floor((x - quiet) / module);
    const bar = x >= quiet && i < b.length && b[i] === '1' && y > 30 && y < 190;
    return bar ? 20 : 250;
  });
  writeFileSync(`planung/testbilder/isbn-${code}-${name}.png`, img);
}
console.log(`${BOOKS.length} Testbilder in planung/testbilder/`);
