// Kurzer Rundgang für neue Profile: sechs Karten nacheinander, jederzeit überspringbar.
// Danach (oder beim Überspringen) gilt er als gesehen; unter „Profil“ lässt er sich nochmal ansehen.
import { dialog, esc } from './ui.js?v=1.36.2';

// Jede Karte hat eine Kennung (id) und den Stand (Version), in dem ihr Text zuletzt geprüft wurde.
// Der Wächter scripts/check-tour.js prüft vor jedem Hochladen, ob jede Neuerung hier erklärt ist.
export const STEPS = [
  {
    id: 'filme', stand: '1.31.2', icon: '🎬', title: 'Filme, Serien oder Bücher',
    text: 'Oben schaltest du zwischen <strong>Filme</strong>, <strong>Serien</strong> und <strong>Bücher</strong> um. Alle Seiten wechseln mit. Was du bei Filmen magst, hilft auch bei den Serien und Büchern – und umgekehrt.',
  },
  {
    id: 'geschmack', stand: '1.31.2', icon: '▦', title: 'Geschmack',
    text: 'Markiere Titel, die du kennst: <strong>Gesehen</strong>, <strong>Mag ich</strong>, <strong>Mag ich nicht</strong> oder <strong>Merken</strong>. Aufs Poster tippen = ★ Liebling. Personen, Studios, Sender und Themen bewertest du mit „Liebe“ oder „Gern“. Schon 5–10 reichen für den Anfang.',
  },
  {
    id: 'vorschlaege', stand: '1.32.0', icon: '☆', title: 'Vorschläge',
    text: 'Hier kommen Titel, die zu dir passen – jeweils mit einem Satz, warum. Pro Titel drei Knöpfe: <strong>✓ Schon gesehen</strong> (danach sagst du, wie du ihn fandst), <strong>+ Merken</strong> und <strong>– Nein danke</strong>. Unter <strong>Mehr dazu</strong> stehen Inhalt, Darsteller·innen und Links – Namen kannst du antippen. Kommt bald ein neuer Film deiner Lieblinge ins Kino (oder ein neuer Teil deiner Lieblingsreihe), steht er oben in einem kleinen Kasten. Hast du einen Vorschlag wirklich geschaut, tipp danach in der Meldung auf <strong>👍 Wegen Vorschlag geschaut</strong> – unter „Profil“ siehst du dann deine Trefferquote.',
  },
  {
    id: 'mehr', stand: '1.36.0', icon: '🍿', title: 'Noch mehr',
    text: '<strong>Überrasch mich</strong>: ein richtig guter Titel abseits deines Geschmacks, verdeckt wie in der Sneak Preview – auf Wunsch mit passender Länge (z. B. bis 2 Std. oder ein langes Epos). Bei den Vorschlägen unter <strong>Filter &amp; mehr</strong>: Genre, Themen, Zeit, <strong>Gruppenabend</strong>, <strong>Kinderfilme</strong> (zum Spaß oder <strong>🎓 Wissen &amp; Natur</strong>, mit Link zum Elternratgeber FLIMMO) und dein <strong>Lieblingsfilm</strong>. In der <strong>Merkliste</strong> steht alles Gemerkte – unter „Mehr dazu“ auch, wo du es schauen kannst. Bei Serien trägst du unter <strong>Weiterschauen</strong> ein, bis zu welcher Folge du bist (vergessen? <strong>🤔 Weiß nicht mehr</strong> findet es mit ein paar Bildern heraus); neue Folgen und Staffeln stehen dann oben bei den Serien-Vorschlägen.',
  },
  {
    id: 'buecher', stand: '1.31.2', icon: '📚', title: 'Bücher',
    text: 'Bei <strong>Bücher</strong> fängst du am besten mit deinem Regal an: <strong>📷 Bücher scannen</strong> – Strichcode hinten auf dem Buch, eins nach dem anderen. Danach fragt die App kurz, wie du sie fandst, und zeigt dir weitere Bücher deiner Autor·innen und Reihen. Den Namen einer Autor·in kannst du antippen und siehst alle ihre Bücher. Vorschläge passen auch zu deinen Filmen; oben stehen neue Bände deiner Reihen, bevor sie erscheinen. Auf der <strong>Leseliste</strong> steht unter „Mehr dazu“ ein Link zu Amazon.',
  },
  {
    id: 'sichern', stand: '1.31.2', icon: '💾', title: 'Profil sichern',
    text: 'Dein Profil liegt nur auf diesem Gerät – ohne Anmeldung. Unter <strong>Profil → Profil sichern</strong> machst du ab und zu eine kleine Sicherungsdatei, damit nichts verloren geht.',
  },
];

// Zeigt den Rundgang; liefert, wenn er fertig oder übersprungen ist
// Spiele (Testversion) nur erwähnen, wenn eingeschaltet
export const GAME_STEP = {
  id: 'spiele', stand: '1.31.2', icon: '🎮', title: 'Spiele (Test)',
  text: 'Bei <strong>Spiele</strong> fragt die App zuerst, worauf du spielst und wie lang Spiele sein dürfen. Dann markierst du Spiele (<strong>Gespielt</strong>, <strong>Mag ich</strong>, <strong>Mag ich nicht</strong>, <strong>Merken</strong>) und bekommst Vorschläge – nur für deine Plattformen. Unter <strong>Filter &amp; mehr</strong> wählst du, ob du heute allein, zu zweit auf der Couch, online oder gegeneinander spielst. Ein- und ausblenden kannst du Bereiche unter <strong>Profil</strong>.',
};
export async function runTour(name = '', withGames = false) {
  const steps = withGames ? [...STEPS.slice(0, -1), GAME_STEP, STEPS.at(-1)] : STEPS;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const last = i === steps.length - 1;
    const res = await dialog({
      title: i === 0 && name ? `Willkommen, ${name}!` : s.title,
      body: `
        <div class="tour">
          <div class="tour-icon" aria-hidden="true">${s.icon}</div>
          ${i === 0 && name ? `<h3>${esc(s.title)}</h3>` : ''}
          <p>${i === 0 && withGames ? s.text.replace(' und <strong>Bücher</strong> um.', ', <strong>Bücher</strong> und <strong>Spiele</strong> um.') : s.text}</p>
          <p class="tour-dots" aria-label="Schritt ${i + 1} von ${steps.length}">${steps.map((_, j) => `<span class="${j === i ? 'on' : ''}"></span>`).join('')}</p>
        </div>`,
      buttons: [
        { label: 'Überspringen', value: 'skip' },
        { label: last ? 'Los geht’s' : 'Weiter', value: 'next', primary: true },
      ],
    });
    if (!res || res.value !== 'next') return;
  }
}
