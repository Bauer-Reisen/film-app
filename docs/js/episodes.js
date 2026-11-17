// Serien: Wo bin ich gerade? (Staffel/Folge) – und was ist neu?
// Gespeichert an der Markierung der Serie: ep = [Staffel, Folge] (bis hierher gesehen), epT = wann eingetragen.
// Die Folgen-Daten kommen aus den Serien-Details von TMDB (seasons, last_episode_to_air, next_episode_to_air).
import * as store from './store.js?v=1.37.0';
import { dialog, esc } from './ui.js?v=1.37.0';
import { findEp } from './ep-find.js?v=1.37.0';

const cmp = (a, b) => a[0] - b[0] || a[1] - b[1];
const day = (t) => new Date(t).toLocaleDateString('sv-SE'); // JJJJ-MM-TT
export const fmt = (s) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '');
export const se = (x) => `S${x[0]} F${x[1]}`; // „S2 F7“

// Staffeln mit Folgen (ohne „Specials“ = Staffel 0)
export const seasonsOf = (d) => (d?.seasons || []).filter((s) => s.season_number > 0 && s.episode_count > 0).sort((a, b) => a.season_number - b.season_number);
const lastAired = (d) => (d?.last_episode_to_air ? [d.last_episode_to_air.season_number, d.last_episode_to_air.episode_number] : null);

// Die Folge nach x (oder null)
export function after(d, x) {
  const ss = seasonsOf(d);
  const cur = ss.find((s) => s.season_number === x[0]);
  if (cur && x[1] < cur.episode_count) return [x[0], x[1] + 1];
  const nextS = ss.find((s) => s.season_number > x[0]);
  return nextS ? [nextS.season_number, 1] : null;
}

// Wo steht man? kind: 'none' | 'ready' (nächste Folge ist schon draußen) | 'waiting' | 'finished'
export function progress(d, mark) {
  const ep = mark?.ep;
  const last = lastAired(d);
  if (!ep) return { kind: 'none', last };
  const nx = after(d, ep);
  if (nx && last && cmp(nx, last) <= 0) {
    // „neu“: die zuletzt erschienene Folge kam nach dem letzten Eintrag
    const isNew = !!(mark.epT && d.last_episode_to_air?.air_date && d.last_episode_to_air.air_date > day(mark.epT));
    return { kind: 'ready', ep, next: nx, last, isNew, since: d.last_episode_to_air?.air_date };
  }
  const up = d?.next_episode_to_air;
  if (up) return { kind: 'waiting', ep, upcoming: [up.season_number, up.episode_number], date: up.air_date };
  if (['Ended', 'Canceled'].includes(d?.status)) return { kind: 'finished', ep };
  return { kind: 'waiting', ep, upcoming: null };
}

export function setEp(profileId, id, ep) {
  const m = store.getMark(profileId, 'tv', id);
  if (!m) return;
  store.setMark(profileId, 'tv', id, m.s, { ep, epT: Date.now() });
}

// Zeile + Knöpfe für eine Serie unter „Weiterschauen“
export function progressBox(d, mark) {
  if (!d) return '';
  const p = progress(d, mark);
  const change = '<button type="button" class="btn btn-small" data-ep="pick">Stelle ändern</button>';
  if (p.kind === 'none') {
    return `<div class="ep-box"><p class="small">Wo bist du gerade?</p><p class="row"><button type="button" class="btn btn-small" data-ep="pick">Folge eintragen</button></p></div>`;
  }
  if (p.kind === 'ready') {
    return `<div class="ep-box">
      <p class="small">${p.isNew ? `<strong>🆕 Neue Folge seit ${esc(fmt(p.since))}</strong> · ` : ''}Gesehen bis ${se(p.ep)} – weiter mit <strong>${se(p.next)}</strong></p>
      <p class="row"><button type="button" class="btn btn-small btn-primary" data-ep="next">✓ ${se(p.next)} gesehen</button>${change}</p></div>`;
  }
  if (p.kind === 'waiting') {
    return `<div class="ep-box"><p class="small">Alles gesehen bis ${se(p.ep)}. ${p.upcoming ? `Nächste Folge (${se(p.upcoming)}) ${p.date ? `am <strong>${esc(fmt(p.date))}</strong>` : 'kommt noch – Termin offen'}.` : 'Noch keine neue Folge angekündigt.'}</p>
      <p class="row">${change}</p></div>`;
  }
  return `<div class="ep-box"><p class="small"><strong>Alles gesehen – die Serie ist zu Ende.</strong> Wie fandest du sie?</p>
    <p class="row"><button type="button" class="btn btn-small" data-ep="rate:liked">♥ Mag ich</button><button type="button" class="btn btn-small" data-ep="rate:seen">✓ Ganz okay</button><button type="button" class="btn btn-small" data-ep="rate:disliked">✕ Mag ich nicht</button></p>
    <p class="row">${change}</p></div>`;
}

// Auswahl Staffel + Folge; liefert [s, e] oder null
export async function pickEp(d, mark, title) {
  const ss = seasonsOf(d);
  if (!ss.length) return null;
  const last = lastAired(d);
  const cur = mark?.ep || (last ? [last[0], 1] : [ss[0].season_number, 1]);
  const count = (sn) => {
    const s = ss.find((x) => x.season_number === sn);
    const n = s?.episode_count || 1;
    return last && sn === last[0] ? Math.min(n, last[1]) : n; // nur erschienene Folgen
  };
  const epOptions = (sn, sel) => Array.from({ length: count(sn) }, (_, i) => `<option value="${i + 1}" ${i + 1 === sel ? 'selected' : ''}>Folge ${i + 1}</option>`).join('');
  const aired = ss.filter((s) => !last || s.season_number <= last[0]);
  const pr = dialog({
    title: 'Bis wohin gesehen?',
    body: `<p>${esc(title)}: Welche Folge hast du zuletzt geschaut?</p>
      <div class="ep-pick">
        <label class="field">Staffel <select name="s">${aired.map((s) => `<option value="${s.season_number}" ${s.season_number === cur[0] ? 'selected' : ''}>Staffel ${s.season_number}</option>`).join('')}</select></label>
        <label class="field">Folge <select name="e">${epOptions(cur[0], cur[1])}</select></label>
      </div>`,
    buttons: [{ label: 'Abbrechen', value: null }, { label: '🤔 Weiß nicht mehr', value: 'find' }, { label: 'Speichern', value: 'ok', primary: true }],
  });
  setTimeout(() => {
    const dlg = [...document.querySelectorAll('dialog.dlg')].at(-1);
    const sSel = dlg?.querySelector('select[name="s"]');
    const eSel = dlg?.querySelector('select[name="e"]');
    if (sSel && eSel) sSel.onchange = () => { eSel.innerHTML = epOptions(Number(sSel.value), 1); };
  }, 0);
  const res = await pr;
  if (res?.value === 'find') return findEp(d, title); // Hilfe: Stichworte + Bilder
  if (!res || res.value !== 'ok') return null;
  return [Number(res.fields.s), Number(res.fields.e)];
}
