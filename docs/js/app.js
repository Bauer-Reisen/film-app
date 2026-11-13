// Oberfläche: Seitenwechsel über die Adresse (#/vorschlaege usw.)
import { VERSION, LANGUAGES } from './config.js?v=1.10.0';
import * as store from './store.js?v=1.10.0';
import { saveBackup, readBackup, findSameName, importAsNew, mergeInto } from './backup.js?v=1.10.0';
import { esc, dialog, toast, formatDate } from './ui.js?v=1.10.0';
import * as platform from './platform.js?v=1.10.0';
import * as taste from './taste.js?v=1.10.0';
import * as suggest from './suggest.js?v=1.10.0';
import * as watchlist from './watchlist.js?v=1.10.0';
import * as sneak from './sneak.js?v=1.10.0';
import * as group from './group.js?v=1.10.0';
import * as kids from './kids.js?v=1.10.0';
import * as rewatch from './rewatch.js?v=1.10.0';
import * as trailer from './trailer.js?v=1.10.0';
import { initRuntimes } from './runtime.js?v=1.10.0';
import { mediaOf } from './media.js?v=1.10.0';
import { runTour } from './tour.js?v=1.10.0';

const view = document.getElementById('view');
const APP_URL = 'https://bauer-reisen.github.io/film-app/';
const tabs = document.querySelectorAll('.tabs a[data-tab]');
const whoBtn = document.getElementById('who');
const mediaSwitch = document.querySelector('.media-switch');

// ---------- aktuelles Profil (gilt für diese Sitzung) ----------
const SESSION_KEY = 'filmapp.current';
let currentId = null;
try { currentId = sessionStorage.getItem(SESSION_KEY); } catch { /* egal */ }
if (!store.getProfile(currentId)) currentId = store.profiles().length === 1 ? store.profiles()[0].id : null;

export const current = () => store.getProfile(currentId);

function selectProfile(id, goTo = '#/vorschlaege') {
  currentId = id;
  try { sessionStorage.setItem(SESSION_KEY, id); } catch { /* egal */ }
  store.setLastProfile(id);
  location.hash = goTo;
  show();
}

function leaveProfile() {
  currentId = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* egal */ }
  location.hash = '#/wer';
  show();
}

// ---------- Bausteine ----------
const homeSteps = () => `
  <ol class="steps">
    <li>Unten auf das Teilen-Symbol ${platform.SHARE_ICON} tippen</li>
    <li>„Zum Home-Bildschirm“ wählen (evtl. etwas nach unten wischen)</li>
    <li>Oben rechts auf „Hinzufügen“ tippen</li>
  </ol>`;

function homeHintCard() {
  if (!platform.shouldShowHomeHint()) return '';
  const hasMarks = store.profiles().some((p) => store.markCount(p) > 0);
  return `
    <section class="card hint" aria-label="Tipp">
      <p><strong>Leg die App auf deinen Home-Bildschirm, dann bleibt dein Profil sicher gespeichert.</strong></p>
      ${hasMarks ? '<p class="muted">Du hast hier schon markiert. Die App auf dem Home-Bildschirm hat einen eigenen Speicher – deshalb zuerst unter „Profil“ auf „Profil sichern“ tippen, dann die App vom Home-Bildschirm öffnen und dort „Profil laden“.</p>' : ''}
      <details><summary class="btn">So geht's</summary>${homeSteps()}</details>
      <p><button class="btn" type="button" data-act="home-later">Später</button></p>
    </section>`;
}

function installTipCard() {
  if (!platform.shouldShowInstallTip()) return '';
  return `
    <section class="card hint" aria-label="Tipp">
      <p><strong>Tipp: Leg die App auf deinen Startbildschirm</strong> – dann öffnest du sie mit einem Tipp.</p>
      <p class="row">
        ${platform.canInstall() ? '<button class="btn btn-primary" type="button" data-act="install">App installieren</button>' : '<span class="muted">Im Chrome-Menü ⋮ → „Zum Startbildschirm hinzufügen“.</span>'}
        <button class="btn" type="button" data-act="install-later">Später</button>
      </p>
    </section>`;
}

const deviceNote = `
  <details class="note">
    <summary>Profile werden nur auf diesem Gerät gespeichert. <span class="link">Was heißt das?</span></summary>
    <p>Dein Handy kennt nur die Profile, die auf ihm angelegt wurden.</p>
    <p>Auf einem anderen Gerät siehst du sie nicht automatisch.</p>
    <p>Mit „Profil sichern“ und „Profil laden“ nimmst du dein Profil mit.</p>
  </details>`;

const fileInput = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json,.json', hidden: true });
document.body.append(fileInput);

// ---------- Seiten ----------
const pages = {
  wer: {
    title: 'Wer schaut?',
    noTabs: true,
    noProfile: true,
    render: () => {
      const list = store.profilesForPicker();
      const last = store.lastProfileId();
      return `
        ${homeHintCard()}
        ${platform.isIOS && platform.isStandalone && list.length === 0 ? '<section class="card hint"><p><strong>Kommst du aus Safari?</strong> Dann lade hier dein gesichertes Profil.</p></section>' : ''}
        <h1 class="center">Wer schaut?</h1>
        ${list.length ? `<div class="people">${list.map((p) => `
          <button class="person ${p.id === last ? 'is-last' : ''}" type="button" data-pick="${p.id}">
            <span class="avatar" aria-hidden="true">${esc(p.name.slice(0, 1).toUpperCase())}</span>
            <span class="pname">${esc(p.name)}</span>
            ${p.id === last ? '<span class="tag">zuletzt</span>' : ''}
          </button>`).join('')}</div>` : '<p class="center muted">Noch kein Profil auf diesem Gerät.</p>'}
        <div class="row center-row">
          <button class="btn btn-primary btn-big" type="button" data-act="create">+ Profil anlegen</button>
          <button class="btn btn-big" type="button" data-act="load">Profil laden</button>
        </div>
        ${deviceNote}`;
    },
  },
  vorschlaege: {
    title: 'Vorschläge',
    render: () => installTipCard() + suggest.render(current()),
    mount: () => suggest.mount(current()),
  },
  ueberrasch: {
    title: 'Überrasch mich',
    render: () => sneak.render(current()),
    mount: () => sneak.mount(current()),
  },
  gruppe: {
    title: 'Gruppenabend',
    tab: 'vorschlaege',
    render: () => group.render(current()),
    mount: () => group.mount(current()),
  },
  kinder: {
    title: 'Kinderfilme',
    titleTv: 'Kinderserien',
    tab: 'vorschlaege',
    render: () => kids.render(current()),
    mount: () => kids.mount(current()),
  },
  liebling: {
    title: 'Lieblingsfilm',
    titleTv: 'Lieblingsserie',
    tab: 'vorschlaege',
    render: () => rewatch.render(current()),
    mount: () => rewatch.mount(current()),
  },
  geschmack: {
    title: 'Geschmack',
    render: () => taste.render(current()),
    mount: () => taste.mount(view, current()),
  },
  merkliste: {
    title: 'Merkliste',
    render: () => watchlist.render(current()),
    mount: () => watchlist.mount(current()),
  },
  profil: {
    title: 'Profil',
    render: () => {
      const p = current();
      const showHome = platform.isIOS && !platform.isStandalone;
      return `
        <h1>${esc(p.name)}</h1>

        <section class="card stack">
          <h2 id="lang-h">Filme und Serien schauen auf</h2>
          <div class="segmented" role="group" aria-labelledby="lang-h">
            ${Object.entries(LANGUAGES).map(([code, label]) => `
              <button type="button" class="seg" data-lang="${code}" aria-pressed="${p.language === code}">${label}</button>`).join('')}
          </div>
          <p class="muted small">Titel, Poster und Inhaltsangaben richten sich danach. Deine Markierungen bleiben beim Wechsel erhalten.</p>
        </section>

        <section class="card stack">
          <h2>Sichern</h2>
          <p class="muted small">Zuletzt gesichert: ${p.lastBackup ? formatDate(p.lastBackup) : 'nie'}</p>
          <div class="row">
            <button class="btn btn-primary" type="button" data-act="backup">Profil sichern</button>
            <button class="btn" type="button" data-act="load">Profil laden</button>
          </div>
          <p class="muted small">Die Sicherung ist eine kleine Datei. Damit nimmst du dein Profil auf ein anderes Gerät mit.</p>
        </section>

        ${showHome ? `
        <section class="card stack">
          <h2>Auf den Home-Bildschirm</h2>
          <p class="muted small">Als App auf dem Home-Bildschirm bleibt dein Profil sicher gespeichert. Sonst kann Safari die Daten nach einer Woche ohne Besuch löschen.</p>
          ${homeSteps()}
          <p class="muted small">Wichtig: Die App auf dem Home-Bildschirm hat einen eigenen Speicher. Sichere dein Profil vorher und lade es dort wieder.</p>
        </section>` : ''}
        ${platform.canInstall() ? `
        <section class="card stack">
          <h2>Auf den Startbildschirm</h2>
          <p><button class="btn btn-primary" type="button" data-act="install">App installieren</button></p>
        </section>` : ''}

        <section class="card stack">
          <h2>Profil</h2>
          <div class="row">
            <button class="btn" type="button" data-act="switch">Profil wechseln</button>
            <button class="btn" type="button" data-act="rename">Profil umbenennen</button>
            <button class="btn btn-danger" type="button" data-act="delete">Profil löschen</button>
          </div>
        </section>

        <p class="row"><button class="btn" type="button" data-act="tour">Rundgang ansehen</button> <a class="btn" href="#/ueber">Über diese App</a></p>
        <p class="muted small">Version ${VERSION}</p>`;
    },
  },
  ueber: {
    title: 'Über diese App',
    tab: 'profil',
    noProfile: true,
    render: () => `
      <h1>Über diese App</h1>
      <div class="card stack">
        <p>„Was schaue ich?“ schlägt dir Filme und Serien vor, die zu deinem Geschmack passen – mit einem Satz, warum. Dazu gibt es „Überrasch mich“, den Gruppenabend, Kinderfilme und Kinderserien.</p>
        <p>Oben schaltest du zwischen <strong>Filme</strong> und <strong>Serien</strong> um. Was du bei Filmen magst, hilft auch bei den Serien – und umgekehrt.</p>
      </div>

      <h2>Filmdaten</h2>
      <div class="card stack about-tmdb">
        <a href="https://www.themoviedb.org/" target="_blank" rel="noopener" class="tmdb-logo-link">
          <img class="tmdb-logo" src="img/tmdb.svg" alt="The Movie Database (TMDB)" width="180" height="24">
        </a>
        <p>Alle Film- und Seriendaten und Poster kommen von <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">The Movie Database (TMDB)</a>.</p>
        <p lang="en" class="muted">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </div>

      <h2>App weitergeben</h2>
      <div class="card stack about-share">
        <img class="qr" src="img/qr.svg" alt="QR-Code zur App" width="200" height="200">
        <p><a href="${APP_URL}">${APP_URL.replace('https://', '')}</a></p>
        <p class="row center-row"><button class="btn btn-primary" type="button" data-act="share-app">Link teilen</button></p>
        <p class="muted small">Jede Person legt auf dem eigenen Handy ein eigenes Profil an.</p>
      </div>

      <h2>Deine Daten</h2>
      <div class="card stack">
        <p>Es gibt keine Anmeldung und kein Konto. Deine Profile liegen nur auf diesem Gerät.</p>
        <p class="muted">Für Filmdaten fragt die App über einen kleinen Zwischenhändler (Cloudflare) bei TMDB an. Dabei werden keine Namen oder Markierungen übertragen, nur die Filmsuche selbst.</p>
        <p class="muted">Trailer kommen von YouTube. YouTube wird erst geladen, wenn du auf „Trailer“ tippst, in der datensparsamen Variante ohne Werbe-Cookies.</p>
        <p class="muted">Streaming-Angebote zeigt die App bewusst nicht an.</p>
      </div>
      <p class="muted small center">Version ${VERSION}</p>`,
    mount: () => {
      const logo = view.querySelector('.tmdb-logo');
      logo?.addEventListener('error', () => { logo.replaceWith(Object.assign(document.createElement('span'), { className: 'tmdb-badge', textContent: 'TMDB' })); });
    },
  },
};

// ---------- Aktionen ----------
async function shareApp() {
  const data = { title: 'Was schaue ich?', text: 'Film-App: Was schaue ich als Nächstes?', url: APP_URL };
  try {
    if (navigator.share) { await navigator.share(data); return; }
    await navigator.clipboard.writeText(APP_URL);
    toast('Link kopiert.');
  } catch (err) {
    if (err?.name !== 'AbortError') toast(`Link: ${APP_URL}`);
  }
}

async function createProfileDialog() {
  const res = await dialog({
    title: 'Profil anlegen',
    body: `
      <label class="field">Name
        <input name="name" type="text" maxlength="30" autocomplete="off" autocapitalize="words" required>
      </label>
      <fieldset class="field">
        <legend>Filme und Serien schauen auf</legend>
        <label class="radio"><input type="radio" name="language" value="de-DE" checked> Deutsch</label>
        <label class="radio"><input type="radio" name="language" value="en-US"> Englisch</label>
      </fieldset>
      <p class="muted small">Dein Profil wird nur auf diesem Gerät gespeichert.</p>`,
    buttons: [{ label: 'Abbrechen', value: false }, { label: 'Speichern', value: true, primary: true }],
    validate: ({ name }) => !name?.trim() ? 'Bitte einen Namen eingeben.' : store.nameTaken(name) ? 'Diesen Namen gibt es auf diesem Gerät schon.' : '',
  });
  if (!res?.value) return;
  const p = store.createProfile(res.fields.name, res.fields.language);
  store.askPersist();
  selectProfile(p.id, '#/geschmack');
  toast(`Profil „${p.name}“ angelegt.`);
  if (!p.settings?.tourDone) await tour();
}

// Rundgang zeigen und als gesehen merken
async function tour() {
  const p = current();
  if (!p) return;
  await runTour(p.name);
  store.updateProfile(p.id, { settings: { ...(p.settings || {}), tourDone: true } });
}

async function renameDialog() {
  const p = current();
  const res = await dialog({
    title: 'Profil umbenennen',
    body: `<label class="field">Neuer Name <input name="name" type="text" maxlength="30" value="${esc(p.name)}" autocomplete="off" required></label>`,
    buttons: [{ label: 'Abbrechen', value: false }, { label: 'Speichern', value: true, primary: true }],
    validate: ({ name }) => !name?.trim() ? 'Bitte einen Namen eingeben.' : store.nameTaken(name, p.id) ? 'Diesen Namen gibt es auf diesem Gerät schon.' : '',
  });
  if (!res?.value) return;
  store.updateProfile(p.id, { name: res.fields.name.trim() });
  show();
}

async function deleteDialog() {
  const p = current();
  const res = await dialog({
    title: 'Profil löschen?',
    body: `<p>Profil „${esc(p.name)}“ auf diesem Gerät löschen? Das lässt sich nicht rückgängig machen.</p>
           <p class="muted small">Tipp: Vorher „Profil sichern“, dann kannst du es später wieder laden.</p>`,
    buttons: [{ label: 'Abbrechen', value: false }, { label: 'Löschen', value: true, danger: true }],
  });
  if (!res?.value) return;
  store.deleteProfile(p.id);
  toast(`Profil „${p.name}“ gelöscht.`);
  leaveProfile();
}

async function backup() {
  const result = await saveBackup(currentId);
  if (result === 'cancelled') return;
  toast(result === 'shared' ? 'Profil gesichert.' : 'Sicherung heruntergeladen.');
  show();
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  fileInput.value = '';
  if (!file) return;
  let incoming;
  try {
    incoming = await readBackup(file);
  } catch (err) {
    await dialog({ title: 'Das hat nicht geklappt', body: `<p>${esc(err.message)}</p>` });
    return;
  }
  const same = findSameName(incoming);
  let targetId;
  if (same) {
    const res = await dialog({
      title: 'Profil gibt es schon',
      body: `<p>Profil „${esc(same.name)}“ gibt es auf diesem Gerät schon.</p>
             <p class="muted small">„Zusammenführen“ übernimmt alles aus der Sicherung; wo beide etwas haben, gilt die neuere Markierung.</p>`,
      buttons: [{ label: 'Abbrechen', value: null }, { label: 'Als neues Profil', value: 'new' }, { label: 'Zusammenführen', value: 'merge', primary: true }],
    });
    if (!res?.value) return;
    if (res.value === 'merge') { mergeInto(same.id, incoming); targetId = same.id; }
    else targetId = importAsNew(incoming).id;
  } else {
    targetId = importAsNew(incoming).id;
  }
  store.askPersist();
  selectProfile(targetId);
  toast(`Profil „${store.getProfile(targetId).name}“ geladen. Änderungen hier gelten nur auf diesem Gerät.`);
});

view.addEventListener('click', async (e) => {
  if (current() && trailer.handleClick(e, current().language)) return;
  if (currentKey === 'geschmack' && taste.handleClick(e)) return;
  if (currentKey === 'vorschlaege' && suggest.handleClick(e)) return;
  if (currentKey === 'merkliste' && watchlist.handleClick(e)) return;
  if (currentKey === 'ueberrasch' && sneak.handleClick(e)) return;
  if (currentKey === 'gruppe' && group.handleClick(e)) return;
  if (currentKey === 'kinder' && kids.handleClick(e)) return;
  if (currentKey === 'liebling' && rewatch.handleClick(e)) return;
  const pick = e.target.closest('[data-pick]');
  if (pick) return selectProfile(pick.dataset.pick);

  const lang = e.target.closest('[data-lang]');
  if (lang) {
    store.updateProfile(currentId, { language: lang.dataset.lang });
    toast(`Filme und Serien jetzt auf ${LANGUAGES[lang.dataset.lang]}.`);
    return show();
  }

  const act = e.target.closest('[data-act]')?.dataset.act;
  switch (act) {
    case 'create': return createProfileDialog();
    case 'load': return fileInput.click();
    case 'backup': return backup();
    case 'switch': return leaveProfile();
    case 'rename': return renameDialog();
    case 'delete': return deleteDialog();
    case 'home-later': platform.dismissHomeHint(); return show();
    case 'install-later': platform.dismissInstallTip(); return show();
    case 'share-app': return shareApp();
    case 'tour': return tour();
    case 'install': await platform.install(); platform.dismissInstallTip(); return show();
  }
});

whoBtn.addEventListener('click', () => leaveProfile());

// Umschalter Filme · Serien – jedes Profil merkt sich die letzte Wahl
mediaSwitch.addEventListener('click', (e) => {
  const b = e.target.closest('[data-media]');
  const p = current();
  if (!b || !p || mediaOf(p) === b.dataset.media) return;
  store.updateProfile(p.id, { settings: { ...(p.settings || {}), media: b.dataset.media } });
  show();
});

// ---------- Tabs: Wechsel ohne Browser-Verlauf ----------
// Tab-Wechsel ersetzen den Eintrag im Verlauf. Sonst blättert die Wisch-Geste
// des Browsers (vom Rand aus) durch alte Seiten statt durch die Tabs.
tabs.forEach((a) => a.addEventListener('click', (e) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  // Nochmal auf den aktiven Reiter tippen = nach oben (wie in vielen Apps)
  if (a.getAttribute('aria-current') === 'page' && location.hash === a.getAttribute('href')) { toTop(); return; }
  location.replace(a.getAttribute('href'));
}));

// ---------- Nach oben ----------
const topBtn = document.getElementById('to-top');
const toTop = () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
topBtn.addEventListener('click', toTop);
let topTick = false;
window.addEventListener('scroll', () => {
  if (topTick) return;
  topTick = true;
  requestAnimationFrame(() => { topBtn.hidden = window.scrollY < 1200; topTick = false; });
}, { passive: true });

window.addEventListener('installable', () => show());

// ---------- Anzeigen ----------
let currentKey = null;
function show() {
  let key = (location.hash.replace(/^#\/?/, '') || 'vorschlaege').split('?')[0];
  if (!pages[key]) key = 'vorschlaege';
  if (!pages[key].noProfile && !current()) key = 'wer';
  const page = pages[key];
  const activeTab = page.tab || key;

  document.body.classList.toggle('no-tabs', !!page.noTabs);
  currentKey = key;
  const p = current();
  const media = p ? mediaOf(p) : 'movie';
  document.body.dataset.media = media;
  view.innerHTML = page.render();
  page.mount?.();
  mediaSwitch.hidden = !p || !!page.noTabs;
  mediaSwitch.querySelectorAll('[data-media]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.media === media)));
  document.title = `${(media === 'tv' && page.titleTv) || page.title} · Was schaue ich?`;
  tabs.forEach((a) => {
    if (a.dataset.tab === activeTab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  whoBtn.textContent = p ? p.name : 'Wer schaut?';
  whoBtn.setAttribute('aria-label', p ? `Profil ${p.name} – Profil wechseln` : 'Profil wählen');
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', show);
initRuntimes(view, () => current()?.language || 'de-DE');
show();

// ---------- Update-Prüfung ----------
// Handys heben die Seite eine Weile auf. Beim Öffnen (und beim Zurückkehren in
// die App) fragen wir kurz nach, ob es eine neue Version gibt, und laden sie.
async function checkForUpdate() {
  if (location.hostname === 'localhost') return;
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    const { version } = await res.json();
    if (!version || version === VERSION) return;
    const key = 'filmapp.reloadedFor';
    if (sessionStorage.getItem(key) === version) return; // nie endlos neu laden
    sessionStorage.setItem(key, version);
    location.replace(`${location.pathname}?v=${version}${location.hash}`);
  } catch { /* offline – egal */ }
}
checkForUpdate();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
