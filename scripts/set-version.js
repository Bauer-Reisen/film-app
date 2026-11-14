// Setzt eine neue Versionsnummer überall, wo sie gebraucht wird.
// Aufruf: node scripts/set-version.js 0.3.0
// Damit holen sich Handys nach einem Update garantiert die neuen Dateien.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v || '')) {
  console.error('Bitte eine Version angeben, z. B.: node scripts/set-version.js 0.3.0');
  process.exit(1);
}

const edit = (file, fn) => writeFileSync(file, fn(readFileSync(file, 'utf8')));

edit('docs/js/config.js', (s) => s.replace(/VERSION = '[^']*'/, `VERSION = '${v}'`));
edit('docs/index.html', (s) => s.replace(/\?v=[\d.]+/g, `?v=${v}`));
edit('package.json', (s) => s.replace(/"version": "[^"]*"/, `"version": "${v}"`));
writeFileSync('docs/version.json', JSON.stringify({ version: v }) + '\n');

// Alle Importe zwischen den Modulen bekommen dieselbe Versionsnummer
for (const f of readdirSync('docs/js').filter((f) => f.endsWith('.js'))) {
  // statisch (from './x.js') und dynamisch (import('./x.js'))
  edit(`docs/js/${f}`, (s) => s
    .replace(/from '(\.\/[\w-]+\.js)(\?v=[\d.]+)?'/g, `from '$1?v=${v}'`)
    .replace(/import\('(\.\/[\w-]+\.js)(\?v=[\d.]+)?'\)/g, `import('$1?v=${v}')`));
}
console.log(`Version ${v} gesetzt.`);
