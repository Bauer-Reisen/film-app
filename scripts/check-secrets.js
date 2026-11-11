// Sucht vor jedem Hochladen nach versehentlich enthaltenen TMDB-Schlüsseln.
// Läuft automatisch vor `git push` (Git-Hook) und per `npm run check-secrets`.
// Findet es etwas, bricht es mit Fehler ab – dann wird NICHT hochgeladen.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATTERNS = [
  { name: 'TMDB-Lesetoken (beginnt mit eyJ)', re: /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'TMDB-API-Schlüssel (32 Zeichen)', re: /(?<![A-Za-z0-9])[a-f0-9]{32}(?![A-Za-z0-9])/i },
];

// Alle Dateien, die Git kennt oder kennen würde (ohne ignorierte)
const files = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => !/\.(png|jpg|jpeg|ico|gif|webp)$/i.test(f));

const hits = [];
for (const file of files) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  text.split('\n').forEach((line, i) => {
    for (const p of PATTERNS) {
      if (p.re.test(line)) hits.push(`${file}:${i + 1}  →  ${p.name}`);
    }
  });
}

if (hits.length) {
  console.error('\n✋ Achtung: Möglicher Schlüssel gefunden – es wird nichts hochgeladen.\n');
  hits.forEach((h) => console.error('   ' + h));
  console.error('\nBitte den Schlüssel aus der Datei entfernen.\n');
  process.exit(1);
}
console.log('✓ Kein Schlüssel im Code gefunden.');
