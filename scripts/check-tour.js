// Wächter für Rundgang und „Was ist neu?“ – läuft vor jedem Hochladen (pre-push).
// Stoppt, wenn eine größere Neuerung nicht im Rundgang erklärt ist.
// Aufruf: node scripts/check-tour.js
import { readFileSync } from 'node:fs';
import { STEPS, GAME_STEP } from '../docs/js/tour.js';
import { NEWS, OHNE_EINTRAG } from '../docs/js/news.js';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const zahl = (v) => v.split('.').map(Number);
const mindestens = (a, b) => {
  const x = zahl(a); const y = zahl(b);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return true;
};

const karten = [...STEPS, GAME_STEP];
const fehler = [];

for (const k of karten) if (!k.id || !k.stand) fehler.push(`Karte „${k.title}“ braucht id und stand`);
if (new Set(karten.map((k) => k.id)).size !== karten.length) fehler.push('Zwei Karten haben dieselbe id');

for (const n of NEWS) {
  if (n.tour === 'klein') continue;
  if (!Array.isArray(n.tour) || !n.tour.length) { fehler.push(`${n.v} „${n.title}“: tour fehlt (Karten-ids oder 'klein')`); continue; }
  for (const id of n.tour) {
    const k = karten.find((x) => x.id === id);
    if (!k) fehler.push(`${n.v} „${n.title}“: Karte ${id} gibt es nicht`);
    else if (!mindestens(k.stand, n.v)) fehler.push(`${n.v} „${n.title}“: Karte „${k.title}“ ist noch Stand ${k.stand} – Text ergänzen und stand auf ${n.v} setzen`);
  }
}

if (!mindestens(version, NEWS[0].v)) fehler.push(`Neuester Eintrag ${NEWS[0].v} ist neuer als die App-Version ${version}`);
for (const k of karten) if (!mindestens(version, k.stand)) fehler.push(`Karte „${k.title}“ hat stand ${k.stand}, neuer als die App-Version ${version}`);
if (zahl(version)[2] === 0 && !NEWS.some((n) => n.v === version) && !OHNE_EINTRAG.includes(version)) {
  fehler.push(`Version ${version} ist ein größeres Update: Eintrag in „Was ist neu?“ ergänzen (oder in OHNE_EINTRAG mit Grund)`);
}

if (fehler.length) {
  console.error('Rundgang nicht aktuell – Hochladen gestoppt:\n- ' + fehler.join('\n- '));
  process.exit(1);
}
console.log(`Rundgang aktuell (${karten.length} Karten, ${NEWS.length} Neuigkeiten).`);
