// Kurzer Rundgang für neue Profile: sechs Karten nacheinander, jederzeit überspringbar.
// Danach (oder beim Überspringen) gilt er als gesehen; unter „Profil“ lässt er sich nochmal ansehen.
import { dialog, esc } from './ui.js?v=1.27.0';

const STEPS = [
  {
    icon: '🎬', title: 'Filme, Serien oder Bücher',
    text: 'Oben schaltest du zwischen <strong>Filme</strong>, <strong>Serien</strong> und <strong>Bücher</strong> um. Alle Seiten wechseln mit. Was du bei Filmen magst, hilft auch bei den Serien und Büchern – und umgekehrt.',
  },
  {
    icon: '▦', title: 'Geschmack',
    text: 'Markiere Titel, die du kennst: <strong>Gesehen</strong>, <strong>Mag ich</strong>, <strong>Mag ich nicht</strong> oder <strong>Merken</strong>. Aufs Poster tippen = ★ Liebling. Personen, Studios, Sender und Themen bewertest du mit „Liebe“ oder „Gern“. Schon 5–10 reichen für den Anfang.',
  },
  {
    icon: '☆', title: 'Vorschläge',
    text: 'Hier kommen Titel, die zu dir passen – jeweils mit einem Satz, warum. Pro Titel drei Knöpfe: <strong>✓ Schon gesehen</strong> (danach sagst du, wie du ihn fandst), <strong>+ Merken</strong> und <strong>– Nein danke</strong>. Unter <strong>Mehr dazu</strong> stehen Inhalt, Darsteller·innen und Links – Namen kannst du antippen.',
  },
  {
    icon: '🍿', title: 'Noch mehr',
    text: '<strong>Überrasch mich</strong>: ein richtig guter Titel abseits deines Geschmacks, verdeckt wie in der Sneak Preview. Bei den Vorschlägen unter <strong>Filter &amp; mehr</strong>: Themen, Zeit, <strong>Gruppenabend</strong>, <strong>Kinderfilme</strong> (mit Link zum Elternratgeber FLIMMO) und dein <strong>Lieblingsfilm</strong>. In der <strong>Merkliste</strong> steht alles Gemerkte – unter „Mehr dazu“ auch, wo du es schauen kannst.',
  },
  {
    icon: '📚', title: 'Bücher',
    text: 'Bei <strong>Bücher</strong> fängst du am besten mit deinem Regal an: <strong>📷 Bücher scannen</strong> – Strichcode hinten auf dem Buch, eins nach dem anderen. Danach fragt die App kurz, wie du sie fandst, und zeigt dir weitere Bücher deiner Autor·innen und Reihen. Vorschläge passen auch zu deinen Filmen. Auf der <strong>Leseliste</strong> steht unter „Mehr dazu“ ein Link zu Amazon.',
  },
  {
    icon: '💾', title: 'Profil sichern',
    text: 'Dein Profil liegt nur auf diesem Gerät – ohne Anmeldung. Unter <strong>Profil → Profil sichern</strong> machst du ab und zu eine kleine Sicherungsdatei, damit nichts verloren geht.',
  },
];

// Zeigt den Rundgang; liefert, wenn er fertig oder übersprungen ist
export async function runTour(name = '') {
  for (let i = 0; i < STEPS.length; i++) {
    const s = STEPS[i];
    const last = i === STEPS.length - 1;
    const res = await dialog({
      title: i === 0 && name ? `Willkommen, ${name}!` : s.title,
      body: `
        <div class="tour">
          <div class="tour-icon" aria-hidden="true">${s.icon}</div>
          ${i === 0 && name ? `<h3>${esc(s.title)}</h3>` : ''}
          <p>${s.text}</p>
          <p class="tour-dots" aria-label="Schritt ${i + 1} von ${STEPS.length}">${STEPS.map((_, j) => `<span class="${j === i ? 'on' : ''}"></span>`).join('')}</p>
        </div>`,
      buttons: [
        { label: 'Überspringen', value: 'skip' },
        { label: last ? 'Los geht’s' : 'Weiter', value: 'next', primary: true },
      ],
    });
    if (!res || res.value !== 'next') return;
  }
}
