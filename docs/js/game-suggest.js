// Spiele: Vorschläge berechnen (harte Filter, Punkte, Indie-Mischung) und die Seite „Vorschläge“.
import * as store from './store.js?v=1.31.1';
import * as games from './games.js?v=1.31.1';
import { esc, toast } from './ui.js?v=1.31.1';
import { RECOMMEND_GAME as R } from './config.js?v=1.31.1';
import { GENRES, INDIE, MODES } from './game-data.js?v=1.31.1';
import { WORLDS } from './seeds-games.js?v=1.31.1';
import { markButtons, moreBox, filterBox } from './cards.js?v=1.31.1';

const MAIN = [['known', '✓', 'Schon gespielt'], ['want', '+', 'Merken'], ['noInterest', '–', 'Nein danke']];
const KNOWN = [['liked', '♥', 'Mag ich'], ['seen', '✓', 'Ganz okay'], ['disliked', '✕', 'Mag ich nicht']];
const LIKED = new Set(['loved', 'liked']);
const W = games.W;

// ---------- Berechnen ----------
const lovedness = (s) => (s === 'loved' ? 'loved' : 'liked');
const kindWord = { movie: 'den Film', tv: 'die Serie', book: 'das Buch' };

// Welche Welten mag man (über Filme, Serien, Bücher)? → [{ world, s, n, md }]
function likedWorlds(p) {
  const out = [];
  for (const w of WORLDS) {
    const hits = [
      ...w.movie.map((id) => ['movie', p.movies?.[id]]), ...w.tv.map((id) => ['tv', p.shows?.[id]]), ...w.books.map((id) => ['book', p.books?.[id]]),
    ].filter(([, m]) => m && LIKED.has(m.s)).sort((a, b) => (b[1].s === 'loved') - (a[1].s === 'loved'));
    if (hits.length) out.push({ world: w, md: hits[0][0], s: hits[0][1].s, n: hits[0][1].n || w.w });
  }
  return out;
}
export const worldsForGame = (id) => WORLDS.filter((w) => w.games.some((g) => g.id === id));

export async function compute(p, mode = '') {
  const marks = p.games || {};
  const now = Date.now() / 1000;
  const set = games.settingsOf(p);
  const plats = games.myPlatformIds(p).join(',');
  // IGDB-Spielweisen: 2 Mehrspieler, 3 Koop, 4 geteilter Bildschirm, 5 MMO, 6 Battle Royale
  const MODE_IDS = { couch: [3, 4], online: [3, 5], versus: [2, 6] };
  const modeIds = MODE_IDS[mode] || [];
  const massiveOk = mode === 'online' || mode === 'versus';
  const cand = new Map(); // id → { g, reasons: [{ pts, text }] }
  const take = (g) => { if (!cand.has(g.id)) cand.set(g.id, { g, reasons: [] }); return cand.get(g.id); };
  const reason = (g, pts, text) => take(g).reasons.push({ pts, text });

  // Ausgangspunkte: ★/♥-Spiele, ★ zuerst, neueste zuerst
  const favs = Object.entries(marks).filter(([, m]) => LIKED.has(m.s))
    .sort((a, b) => (b[1].s === 'loved') - (a[1].s === 'loved') || b[1].t - a[1].t).slice(0, R.sources);
  const disliked = Object.values(marks).filter((m) => m.s === 'disliked');

  // Lieblingsgenres (ohne Indie): Gewicht je Genre
  const genreW = new Map();
  for (const [, m] of favs) for (const x of m.g || []) if (x !== INDIE) genreW.set(x, (genreW.get(x) || 0) + (m.s === 'loved' ? 2 : 1));
  const badGenres = new Set();
  for (const m of disliked) for (const x of m.g || []) if (x !== INDIE && !genreW.has(x)) badGenres.add(x);
  const topGenres = [...genreW.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([x]) => x);

  // Abfragen: Quellen (mit „ähnlichen Spielen“), Entdecken nach Plattform/Genre, Indies
  const jobs = [
    favs.length ? games.byIds(favs.map(([id]) => id)) : [],
    games.get('discover', { platforms: plats, min: R.minVotes, rating: R.minRating }),
    games.get('discover', { platforms: plats, min: R.indieMinVotes, rating: R.minRating, genres: INDIE }),
    ...topGenres.map((x) => games.get('discover', { platforms: plats, min: R.minVotes, rating: R.minRating, genres: x })),
    games.get('discover', { platforms: plats, min: R.minVotes, rating: R.minRating, offset: 50 }),
    // Spielweise gewählt (außer allein)? Dann gezielt passende Spiele holen – sonst bleiben zu wenige übrig
    ...(modeIds.length ? [
      games.get('discover', { platforms: plats, min: R.indieMinVotes, rating: R.minRating, modes: modeIds.join(',') }),
      games.get('discover', { platforms: plats, min: R.indieMinVotes, rating: R.minRating, modes: modeIds.join(','), offset: 50 }),
    ] : []),
  ];
  const [sources, popular, indies, ...byGenre] = await Promise.all(jobs);

  // 1. Ähnliche Spiele zu ★/♥-Spielen
  const simOf = new Map(); // ähnliches Spiel → beste Quelle
  for (const src of sources) {
    const m = marks[src.id];
    for (const sid of src.s || []) {
      const prev = simOf.get(sid);
      if (!prev || (m.s === 'loved' && prev.s !== 'loved')) simOf.set(sid, { s: m.s, n: m.n || src.n });
    }
  }
  const simGames = simOf.size ? await games.byIds([...simOf.keys()].slice(0, 150)) : [];
  for (const g of simGames) {
    const src = simOf.get(g.id);
    reason(g, R.points.similar[lovedness(src.s)], `Ähnlich wie „${src.n}“, das du ${src.s === 'loved' ? 'liebst' : 'magst'}.`);
  }
  // 2. Gleiche Welt wie gemochte Filme, Serien, Bücher
  for (const x of likedWorlds(p)) {
    for (const g of x.world.games) {
      const verb = x.s === 'loved' ? 'liebst' : 'magst';
      const tail = x.world.k === 'Vorlage' ? (x.md === 'book' ? 'das Spiel spielt in derselben Welt' : 'das Spiel ist die Vorlage') : 'das Spiel spielt in derselben Welt';
      reason(g, R.points.world[lovedness(x.s)], `Du ${verb} ${kindWord[x.md]} „${x.n}“ – ${tail}.`);
    }
  }
  // 3. Beliebte Spiele, Indies, Lieblingsgenres
  for (const g of [...popular, ...indies, ...byGenre.flat()]) take(g);

  // Harte Filter und Mindestqualität
  const worldIds = new Set(WORLDS.flatMap((w) => w.games.map((g) => g.id)));
  const ok = (g) => !marks[g.id]
    && games.onMine(g, p)
    && games.fitsModes(g, mode)
    && g.d && g.d < now
    && (massiveOk || !(g.m || []).some((x) => R.noMassive.includes(x)))
    && (worldIds.has(g.id) || ((g.r || 0) >= R.minRating && g.rc >= (games.isIndie(g) ? R.indieMinVotes : R.minVotes)));
  let list = [...cand.values()].filter((x) => ok(x.g));

  // Punkte
  for (const x of list) {
    const g = x.g;
    const gs = (g.g || []).filter((y) => genreW.has(y)).map((y) => genreW.get(y)).sort((a, b) => b - a).slice(0, R.points.genreMax);
    if (gs.length) {
      const pts = gs.reduce((sum, w) => sum + (w >= 2 ? R.points.genre.loved : R.points.genre.liked), 0);
      const names = (g.g || []).filter((y) => genreW.has(y)).map((y) => GENRES[y]).filter(Boolean).slice(0, 2).join(' und ');
      x.reasons.push({ pts, text: `Passt zu deinen Lieblingsgenres: ${names}.` });
    }
    if ((g.g || []).some((y) => badGenres.has(y))) x.reasons.push({ pts: R.points.dislikedGenre, text: '' });
    // kleiner Zuschlag für sehr gute und bekannte Spiele (ordnet Gleichstände)
    x.base = ((g.r || 0) - 75) / 25 + Math.min(1, g.rc / 2000);
  }
  const score = (x) => x.reasons.reduce((s, r) => s + r.pts, 0) + x.base;
  list.sort((a, b) => score(b) - score(a));

  // Spielzeit: nur für die besten 100 nachladen; zwei Stufen daneben → raus, eine → −5 (unbekannt → nichts)
  list = list.slice(0, 100);
  await games.loadTimes(list.map((x) => x.g.id));
  list = list.filter((x) => games.timeDistance(x.g, p) < 2);
  for (const x of list) if (games.timeDistance(x.g, p) === 1) x.reasons.push({ pts: R.points.timeOff, text: '' });
  list.sort((a, b) => score(b) - score(a));

  for (const x of list) {
    const best = x.reasons.filter((r) => r.text).sort((a, b) => b.pts - a.pts)[0];
    x.text = best?.text || (games.isIndie(x.g) ? 'Ein starkes Indie-Spiel, das viele lieben.' : 'Gehört zu den beliebtesten Spielen auf deiner Plattform.');
  }
  // Höchstens 2 Teile derselben Reihe (sonst z. B. FIFA 15, 16, 17, 18 hintereinander)
  const perSeries = new Map();
  const seriesKey = (n) => n.split(/[:–-]/)[0].replace(/s+(d+|[IVX]+)s*$/i, '').trim().toLowerCase();
  list = list.filter((x) => { const k = seriesKey(x.g.n); perSeries.set(k, (perSeries.get(k) || 0) + 1); return perSeries.get(k) <= 2; });
  return mixIndies(list);
}

// In jedem 20er-Block mindestens 5 Indies (nachrücken lassen, Reihenfolge sonst gleich)
function mixIndies(list) {
  const out = [];
  const rest = [...list];
  while (rest.length) {
    const block = rest.splice(0, R.blockSize);
    let need = R.indiesPerBlock - block.filter((x) => games.isIndie(x.g)).length;
    while (need > 0) {
      const i = rest.findIndex((x) => games.isIndie(x.g));
      if (i < 0) break;
      const j = block.map((x) => games.isIndie(x.g)).lastIndexOf(false);
      if (j < 0) break;
      rest.unshift(block.splice(j, 1)[0]); // verdrängtes Spiel kommt im nächsten Block
      block.push(rest.splice(i + 1, 1)[0]);
      need--;
    }
    block.sort((a, b) => b.reasons.reduce((s, r) => s + r.pts, 0) + b.base - (a.reasons.reduce((s, r) => s + r.pts, 0) + a.base));
    out.push(...block);
  }
  return out;
}

// ---------- Seite ----------
let profile = null;
let pool = [];
let shown = 0;
let run = 0;
const byId = new Map();
const box = () => document.getElementById('suggest-list');
let mode = ''; // „Heute: …“ – gilt nur, solange die App offen ist
const modeName = () => MODES.find((m) => m.id === mode)?.n || '';

export function render(p) {
  profile = p;
  return `
    <h1>Vorschläge</h1>
    <p class="muted small game-settings">Für: ${esc(games.settingsText(p))} · <button type="button" class="link-btn" data-gsg="setup">ändern</button></p>
    ${filterBox(modeName() ? `heute ${modeName()}` : '', `
      <label class="mood"><span>Heute spiele ich</span>
        <select id="gmode">
          <option value="">egal</option>
          ${MODES.map((m) => `<option value="${m.id}" ${m.id === mode ? 'selected' : ''}>${esc(m.n)}</option>`).join('')}
        </select>
      </label>`)}
    <div id="suggest-list" aria-live="polite"><p class="muted center">Suche passende Spiele …</p></div>
    ${games.igdbLink}`;
}

export async function mount(p) {
  profile = p;
  const mine = ++run;
  const sel = document.getElementById('gmode');
  if (sel) sel.onchange = () => {
    mode = sel.value;
    const now = document.querySelector('.filters-now');
    if (now) now.textContent = modeName() ? `heute ${modeName()}` : 'alles, was zu dir passt';
    box().innerHTML = '<p class="muted center">Suche passende Spiele …</p>';
    mount(profile);
  };
  if (!p.settings?.gameSetup) {
    box().innerHTML = `<div class="card placeholder"><p><strong>Erst zwei kurze Fragen</strong></p>
      <p class="muted">Plattform und Spiellänge – dann kommen nur Spiele, die du auch spielen kannst.</p>
      <p><button class="btn btn-primary btn-big" type="button" data-gsg="setup">Los geht’s</button></p></div>`;
    return;
  }
  try { pool = await compute(p, mode); } catch (err) {
    if (mine === run && box()) box().innerHTML = `<div class="card center"><p>${esc(err.message)}</p><button class="btn" type="button" data-gsg="retry">Nochmal versuchen</button></div>`;
    return;
  }
  if (mine !== run || !box()) return;
  byId.clear();
  pool.forEach((x) => byId.set(x.g.id, x));
  const first = pool.slice(0, R.blockSize);
  shown = first.length;
  const few = Object.values(p.games || {}).filter((m) => LIKED.has(m.s)).length < 3;
  if (!first.length) {
    box().innerHTML = `<div class="card placeholder"><p><strong>Gerade keine passenden Spiele.</strong></p>
      <p class="muted">Vielleicht ist die Spiellänge oder „Heute spiele ich“ zu eng gewählt? Oben auf „ändern“ bzw. „Filter &amp; mehr“ tippen – oder unter „Geschmack“ weitere Spiele markieren.</p></div>`;
    return;
  }
  box().innerHTML = `
    ${few ? '<div class="card hint"><p>Markiere unter <a href="#/geschmack">Geschmack</a> ein paar Spiele mit „Mag ich“ – dann werden die Vorschläge persönlicher.</p></div>' : ''}
    <p class="muted small">Tipp aufs Cover = ★ ${W.fav}.</p>
    <div class="suggestions">${first.map(card).join('')}</div>
    <div class="row center-row"><button class="btn btn-primary" type="button" data-gsg="more">Mehr Vorschläge</button></div>`;
  games.fillTimes(box());
}

function card(x) {
  const g = x.g;
  const listed = (profile.games || {})[g.id]?.s === 'want';
  return `
    <article class="film sg game" data-sggame="${g.id}">
      <button type="button" class="poster-btn" data-gfb="loved" aria-label="${esc(g.n)} als ${W.fav}">
        ${games.coverImg(g.c)}<span class="poster-star" aria-hidden="true">☆</span>
      </button>
      <div class="film-info">
        <h3 class="film-title">${esc(g.n)}</h3>
        <p class="muted small">${esc(games.metaLine(g))}${games.playtimeSlot(g.id)}</p>
        <p class="reason">${listed ? '🔖 Steht schon auf deiner Merkliste' : esc(x.text)}</p>
        <p class="small">🎮 ${esc(games.platformText(g, profile))}</p>
        ${games.couchText(g) ? `<p class="small">${esc(games.couchText(g))}</p>` : ''}
        <p class="row"><button type="button" class="btn btn-small" data-gtrailer="${g.id}" data-title="${esc(g.n)}"><span aria-hidden="true">▶</span> Trailer</button></p>
        <div class="film-extra">${gameMore(g)}</div>
        ${markButtons('data-gfb', g.n, listed ? MAIN.filter(([k]) => k !== 'want') : MAIN, KNOWN)}
      </div>
    </article>`;
}
// „Mehr dazu“: Inhalt (englisch, lädt beim Aufklappen) und Link zu IGDB
export const gameMore = (g) => moreBox(`<p class="muted" data-gsummary="${g.id}">Lädt …</p>`, `
  <p class="muted small">${g.r ? `Bewertung ${g.r} von 100 (${(g.rc || 0).toLocaleString('de-DE')} Stimmen) · ` : ''}<a href="${esc(games.gameUrl(g))}" target="_blank" rel="noopener">bei IGDB ansehen ↗</a></p>`);

async function feedback(el, status) {
  const id = Number(el.dataset.sggame);
  const x = byId.get(id);
  if (!x) return;
  const old = store.setMark(profile.id, 'game', id, status, games.markMeta(x.g));
  el.hidden = true;
  toast(`${games.label(status) || 'Nein danke'}: ${x.g.n}`, {
    label: 'Rückgängig',
    run: () => { store.restoreMark(profile.id, 'game', id, old); el.hidden = false; },
  });
  append(1);
}
function append(n) {
  const list = box()?.querySelector('.suggestions');
  const marks = store.getProfile(profile.id).games || {};
  const items = [];
  while (items.length < n && shown < pool.length) { const x = pool[shown++]; if (!marks[x.g.id]) items.push(x); }
  if (!list || !items.length) return 0;
  list.insertAdjacentHTML('beforeend', items.map(card).join(''));
  games.fillTimes(box());
  return items.length;
}

export function handleClick(e, setup) {
  const fb = e.target.closest('[data-gfb]');
  if (fb) { feedback(fb.closest('[data-sggame]'), fb.dataset.gfb); return true; }
  const act = e.target.closest('[data-gsg]');
  if (act?.dataset.gsg === 'more') {
    if (!append(R.blockSize)) { act.hidden = true; toast('Mehr Vorschläge gibt es gerade nicht. Markiere weitere Spiele!'); }
    return true;
  }
  if (act?.dataset.gsg === 'retry') { mount(profile); return true; }
  if (act?.dataset.gsg === 'setup') { setup?.(store.getProfile(profile.id)).then((ok) => ok && window.dispatchEvent(new HashChangeEvent('hashchange'))); return true; }
  return false;
}
