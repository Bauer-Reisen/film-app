// Oberfläche: Seitenwechsel über die Adresse (#/vorschlaege usw.)
import { VERSION, LANGUAGES } from './config.js?v=0.7.0';
import * as store from './store.js?v=0.7.0';
import { saveBackup, readBackup, findSameName, importAsNew, mergeInto } from './backup.js?v=0.7.0';
import { esc, dialog, toast, formatDate } from './ui.js?v=0.7.0';
import * as platform from './platform.js?v=0.7.0';
import * as taste from './taste.js?v=0.7.0';
import * as suggest from './suggest.js?v=0.7.0';
import * as watchlist from './watchlist.js?v=0.7.0';
import * as sneak from './sneak.js?v=0.7.0';

const view = document.getElementById('view');
const tabs = document.querySelectorAll('.tabs a[data-tab]');
const whoBtn = document.getElementById('who');

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
          <h2 id="lang-h">Filme schauen auf</h2>
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

        <p class="row"><a class="btn" href="#/ueber">Über diese App</a></p>
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
        <p>„Was schaue ich?“ schlägt dir Filme vor, die zu deinem Geschmack passen.</p>
        <p class="muted">Filmdaten und Poster: TMDB (Logo und Hinweis folgen in Bauschritt 8).</p>
        <p class="muted">Version ${VERSION}</p>
      </div>`,
  },
};

// ---------- Aktionen ----------
async function createProfileDialog() {
  const res = await dialog({
    title: 'Profil anlegen',
    body: `
      <label class="field">Name
        <input name="name" type="text" maxlength="30" autocomplete="off" autocapitalize="words" required>
      </label>
      <fieldset class="field">
        <legend>Filme schauen auf</legend>
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
  if (currentKey === 'geschmack' && taste.handleClick(e)) return;
  if (currentKey === 'vorschlaege' && suggest.handleClick(e)) return;
  if (currentKey === 'merkliste' && watchlist.handleClick(e)) return;
  if (currentKey === 'ueberrasch' && sneak.handleClick(e)) return;
  const pick = e.target.closest('[data-pick]');
  if (pick) return selectProfile(pick.dataset.pick);

  const lang = e.target.closest('[data-lang]');
  if (lang) {
    store.updateProfile(currentId, { language: lang.dataset.lang });
    toast(`Filme jetzt auf ${LANGUAGES[lang.dataset.lang]}.`);
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
    case 'install': await platform.install(); platform.dismissInstallTip(); return show();
  }
});

whoBtn.addEventListener('click', () => leaveProfile());
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
  view.innerHTML = page.render();
  page.mount?.();
  document.title = `${page.title} · Was schaue ich?`;
  tabs.forEach((a) => {
    if (a.dataset.tab === activeTab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const p = current();
  whoBtn.textContent = p ? p.name : 'Wer schaut?';
  whoBtn.setAttribute('aria-label', p ? `Profil ${p.name} – Profil wechseln` : 'Profil wählen');
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', show);
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
