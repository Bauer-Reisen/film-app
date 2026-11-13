// „Was ist neu?“ – nach einem Update einmal pro Profil, wenn man die App wieder öffnet.
// Neue Profile bekommen stattdessen den Rundgang (tour.js) und sehen die alten Neuigkeiten nicht.
// Neueste zuerst; nur Änderungen, die man sieht und kennen sollte.
import { dialog } from './ui.js?v=1.25.0';

export const NEWS = [
  {
    v: '1.25.0', title: 'Aufgeräumt',
    items: [
      'Weniger Knöpfe: <strong>✓ Schon gesehen</strong>, <strong>+ Merken</strong> und <strong>– Nein danke</strong>. Wie du es fandst, wählst du nach „Schon gesehen“.',
      'Inhalt, Darsteller·innen, Reihe und Links stecken jetzt unter <strong>Mehr dazu</strong>.',
      'Themen, Zeit, Gruppenabend und Kinderfilme findest du bei den Vorschlägen unter <strong>Filter &amp; mehr</strong>.',
    ],
  },
  {
    v: '1.24.0', title: 'Personen antippen',
    items: ['Unter „Mehr dazu“ kannst du Regie und Darsteller·innen antippen. Dann siehst du alle ihre Filme und Serien zum Abhaken.'],
  },
  {
    v: '1.23.0', title: 'Autor·innen antippen',
    items: ['Bei Büchern kannst du den Namen der Autor·in antippen. Dann siehst du alle ihre Bücher und eine kurze Info.'],
  },
];
export const LATEST = NEWS[0].v;

const num = (v) => (v || '0').split('.').map(Number);
const newer = (a, b) => { const x = num(a); const y = num(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };

// Was hat dieses Profil noch nicht gesehen? (ohne Eintrag: alles aus der Liste)
export const unseen = (p) => NEWS.filter((n) => !p.settings?.newsSeen || newer(n.v, p.settings.newsSeen));

export async function showNews(list) {
  await dialog({
    title: 'Was ist neu?',
    body: `<div class="news">${list.map((n) => `
      <h3>${n.title}</h3>
      <ul>${n.items.map((t) => `<li>${t}</li>`).join('')}</ul>`).join('')}</div>`,
    buttons: [{ label: 'Alles klar', value: true, primary: true }],
  });
}
