// „Was ist neu?“ – nach einem Update einmal pro Profil, wenn man die App wieder öffnet.
// Neue Profile bekommen stattdessen den Rundgang (tour.js) und sehen die alten Neuigkeiten nicht.
// Neueste zuerst; nur Änderungen, die man sieht und kennen sollte.
import { dialog } from './ui.js?v=1.34.0';

// PFLICHT bei jedem Eintrag: „tour“ nennt die Rundgang-Karte(n) aus tour.js, die die Neuerung erklären,
// oder 'klein', wenn sie nicht in den Rundgang gehört. Größere Umbauten: Kartentext ergänzen und dort
// „stand“ auf diese Version setzen. Der Wächter scripts/check-tour.js stoppt sonst das Hochladen.
export const NEWS = [
  {
    v: '1.34.0', tour: ['mehr'], title: 'Kinderfilme neu – und Überraschungen nicht zu lang',
    items: [
      'Bei <strong>Kinderfilmen</strong> und <strong>Kinderserien</strong> wählst du oben <strong>🎈 Unterhaltung</strong> oder <strong>🎓 Wissen &amp; Natur</strong> – mit Themen wie Körper, Tiere, Weltall oder Geschichte und Sendungen wie „Checker Tobi“ oder „Es war einmal … das Leben“.',
      'Unterhaltung ist bunter: mehr deutsche und neuere Titel, und mit <strong>Kurz</strong> nur Filme unter 80 Minuten. Unter „Mehr dazu“ gibt es jetzt auch einen Link zur <strong>FBW</strong> (Prädikat „wertvoll“).',
      'Bei <strong>Überrasch mich</strong> kannst du sagen: <strong>nicht zu lang</strong> – bis 90 Minuten, 2 oder 2½ Stunden.',
    ],
  },
  {
    v: '1.33.0', tour: ['mehr'], title: 'Serien: Wo bin ich gerade?',
    items: [
      'Auf der Merkliste unter <strong>Weiterschauen</strong> trägst du ein, bis zu welcher Folge du bist. Nach jedem Abend ein Tipp auf <strong>✓ Folge gesehen</strong> – die App kennt Staffeln, Folgen und den Termin der nächsten Folge.',
      'Bei den Serien-Vorschlägen steht oben <strong>Neu für dich</strong>, wenn es etwas gibt: eine neue Folge deiner Serie, eine neue Staffel deiner Lieblingsserie oder bald ein Staffelstart.',
    ],
  },
  {
    v: '1.32.0', tour: ['vorschlaege'], title: 'Deine Trefferquote',
    items: [
      'Einen Vorschlag wirklich geschaut, gelesen oder gespielt? Nach „Schon gesehen“ steht in der Meldung unten <strong>👍 Wegen Vorschlag geschaut</strong> – ein Tipp genügt. Was du aus den Vorschlägen gemerkt und später abgehakt hast, zählt von selbst.',
      'Unter <strong>Profil</strong> siehst du, wie viele davon dir gefallen haben.',
    ],
  },
  {
    v: '1.30.0', tour: ['buecher'], title: 'Demnächst – jetzt auch bei Büchern',
    items: ['Bei den Buch-Vorschlägen steht oben ein kleiner Kasten, wenn es Neues gibt: <strong>neue Bände deiner Lieblingsreihen</strong> und neue Bücher deiner Autor·innen, noch bevor sie erscheinen. Gemerkte stehen mit Termin auf der Leseliste. (Nur bei Lesesprache Deutsch.)'],
  },
  {
    v: '1.29.2', tour: ['vorschlaege'], title: 'Demnächst von deinen Lieblingen',
    items: [
      'Bei den Film-Vorschlägen steht oben ein kleiner Kasten, wenn es Neues gibt: kommende Filme deiner Lieblingspersonen und -studios und <strong>neue Teile deiner Lieblings-Filmreihen</strong> – mit Kinostart. Gemerkte stehen mit Termin auf der Merkliste.',
      '<strong>Kinderfilme</strong> zeigen nur noch echte Kinder- und Familienfilme, ohne schon Gesehene. Abenteuerfilme wie Harry Potter holst du per Haken dazu.',
      'Im Suchfeld bei „Geschmack“ löscht das <strong>✕</strong> alles Eingetippte.',
    ],
  },
  {
    v: '1.26.0', tour: ['mehr'], title: 'Nach Genre filtern',
    items: ['Bei den Vorschlägen kannst du unter <strong>Filter &amp; mehr</strong> jetzt auch ein <strong>Genre</strong> wählen – z. B. nur Krimis oder nur Komödien. Das geht auch zusammen mit Thema und Zeit.'],
  },
  {
    v: '1.25.0', tour: ['vorschlaege', 'mehr'], title: 'Aufgeräumt',
    items: [
      'Weniger Knöpfe: <strong>✓ Schon gesehen</strong>, <strong>+ Merken</strong> und <strong>– Nein danke</strong>. Wie du es fandst, wählst du nach „Schon gesehen“.',
      'Inhalt, Darsteller·innen, Reihe und Links stecken jetzt unter <strong>Mehr dazu</strong>.',
      'Themen, Zeit, Gruppenabend und Kinderfilme findest du bei den Vorschlägen unter <strong>Filter &amp; mehr</strong>.',
    ],
  },
  {
    v: '1.24.0', tour: ['vorschlaege'], title: 'Personen antippen',
    items: ['Unter „Mehr dazu“ kannst du Regie und Darsteller·innen antippen. Dann siehst du alle ihre Filme und Serien zum Abhaken.'],
  },
  {
    v: '1.23.0', tour: ['buecher'], title: 'Autor·innen antippen',
    items: ['Bei Büchern kannst du den Namen der Autor·in antippen. Dann siehst du alle ihre Bücher und eine kurze Info.'],
  },
];
export const LATEST = NEWS[0].v;

// Größere Versionen (x.Y.0) ohne Eintrag – nur, wenn bestehende Nutzer nichts Neues sehen (mit Grund)
export const OHNE_EINTRAG = [
  '1.31.0', // Willkommen am Handy betrifft nur neue Nutzer, Zählung ist unsichtbar
];

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
