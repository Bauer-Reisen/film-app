// Oberfläche: Seitenwechsel über die Adresse (#/vorschlaege usw.)
import { VERSION } from './config.js';

const view = document.getElementById('view');
const tabs = document.querySelectorAll('.tabs a[data-tab]');

const pages = {
  vorschlaege: {
    title: 'Vorschläge',
    render: () => `
      <h1>Vorschläge</h1>
      <div class="card placeholder">
        <p><strong>Hier erscheinen bald deine Filmvorschläge.</strong></p>
        <p class="muted">Dafür markierst du zuerst unter „Geschmack“ ein paar Filme.</p>
        <p><a class="btn btn-primary btn-big" href="#/geschmack">Zum Geschmack</a></p>
      </div>`,
  },
  ueberrasch: {
    title: 'Überrasch mich',
    render: () => `
      <h1>Überrasch mich</h1>
      <div class="card placeholder">
        <p><strong>Ein Film abseits deines Geschmacks – verdeckt wie in der Sneak Preview.</strong></p>
        <p class="muted">Kommt in einem späteren Bauschritt.</p>
      </div>`,
  },
  geschmack: {
    title: 'Geschmack',
    render: () => `
      <h1>Geschmack</h1>
      <div class="card placeholder">
        <p><strong>Hier klickst du dich durch Filme, Personen und Studios.</strong></p>
        <p class="muted">Kommt in Bauschritt 4.</p>
      </div>`,
  },
  merkliste: {
    title: 'Merkliste',
    render: () => `
      <h1>Merkliste</h1>
      <div class="card placeholder">
        <p class="muted">Noch nichts gemerkt – tippe bei einem Film auf „Merken“.</p>
      </div>`,
  },
  profil: {
    title: 'Profil',
    render: () => `
      <h1>Profil</h1>
      <div class="card placeholder">
        <p class="muted">Profile anlegen, wechseln und sichern kommt in Bauschritt 3.</p>
      </div>
      <p><a class="btn" href="#/ueber">Über diese App</a></p>
      <p class="muted">Version ${VERSION}</p>`,
  },
  ueber: {
    title: 'Über diese App',
    tab: 'profil',
    render: () => `
      <h1>Über diese App</h1>
      <div class="card">
        <p>„Was schaue ich?“ schlägt dir Filme vor, die zu deinem Geschmack passen.</p>
        <p class="muted">Filmdaten und Poster: TMDB (Logo und Hinweis folgen in Bauschritt 8).</p>
        <p class="muted">Version ${VERSION}</p>
      </div>`,
  },
};

function show() {
  const key = (location.hash.replace(/^#\/?/, '') || 'vorschlaege').split('?')[0];
  const page = pages[key] || pages.vorschlaege;
  const activeTab = page.tab || (pages[key] ? key : 'vorschlaege');
  view.innerHTML = page.render();
  document.title = `${page.title} · Was schaue ich?`;
  tabs.forEach((a) => {
    if (a.dataset.tab === activeTab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', show);
document.getElementById('who').addEventListener('click', () => { location.hash = '#/profil'; });
show();
