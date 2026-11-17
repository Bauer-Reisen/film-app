// Erkennt das Gerät und kümmert sich um „Auf den Home-Bildschirm“.
import { device, updateDevice, profiles } from './store.js?v=1.37.0';
import { hitStats } from './via.js?v=1.37.0';
import { WORKER_URL } from './config.js?v=1.37.0';

export const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isAndroid = /Android/.test(navigator.userAgent);
export const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// Android/Chrome: eigener „App installieren“-Knopf
let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  window.dispatchEvent(new Event('installable'));
});
export const canInstall = () => !!installEvent;
export async function install() {
  if (!installEvent) return false;
  installEvent.prompt();
  const { outcome } = await installEvent.userChoice;
  installEvent = null;
  return outcome === 'accepted';
}

const WEEK = 7 * 24 * 3600 * 1000;

// iPhone in Safari: Hinweis gleich beim ersten Öffnen, nach „Später“ frühestens
// nach 7 Tagen wieder, höchstens zweimal.
export function shouldShowHomeHint() {
  if (!isIOS || isStandalone) return false;
  const d = device();
  if (d.homeHintShown >= 2) return false;
  return !d.homeHintLast || Date.now() - d.homeHintLast > WEEK;
}
export function dismissHomeHint() {
  const d = device();
  updateDevice({ homeHintShown: d.homeHintShown + 1, homeHintLast: Date.now() });
}

// Allererster Start im Browser am Handy, noch ohne Profil: zuerst „Auf den Startbildschirm“
export const isMobile = isIOS || isAndroid;
export const isIOSSafari = isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
export const shouldWelcome = (hasProfiles) => isMobile && !isStandalone && !hasProfiles && !device().welcomeDone;
export function doneWelcome() { updateDevice({ welcomeDone: Date.now() }); if (isIOS) dismissHomeHint(); }

// Android: einmal ein freundlicher Tipp
// Erster Besuch auf diesem Gerät? Dann noch keinen Tipp – erst einmal die App kennenlernen
const firstVisit = (() => { try { const d = device(); if (d.firstSeen) return false; updateDevice({ firstSeen: Date.now() }); return true; } catch { return false; } })();
export function shouldShowInstallTip() {
  return isAndroid && !isStandalone && !firstVisit && !device().installTipShown;
}
export function dismissInstallTip() { updateDevice({ installTipShown: true }); }

// Teilen-Symbol von Safari (Quadrat mit Pfeil nach oben)
export const SHARE_ICON = '<svg class="inline-icon" viewBox="0 0 24 24" aria-label="Teilen-Symbol"><path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 10H5v11h14V10h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

// Anonyme Nutzungs-Zählung: einmal am Tag „dieses Gerät war da“ (Zufallsnummer, Gerätetyp, installiert ja/nein).
// Keine Namen, keine Markierungen. Lokal beim Entwickeln nur mit ?statstest=1.
export function countVisit() {
  try {
    if (/^(localhost|127.0.0.1)$/.test(location.hostname) && !location.search.includes('statstest')) return;
    // iPhone im Browser erst zählen, wenn dort wirklich ein Profil angelegt wurde – sonst zählt jedes iPhone doppelt
    // (erst Safari, dann die App vom Home-Bildschirm, die einen eigenen Speicher hat)
    if (isIOS && !isStandalone && !profiles().length) return;
    const d = device();
    const day = new Date().toLocaleDateString('sv-SE');
    if (d.lastPing === day) return;
    const id = d.sid || (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join(''));
    const kind = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';
    // Trefferquote aller Profile auf diesem Gerät, nur als drei Zahlen (gefallen / okay / nicht)
    const hit = { good: 0, ok: 0, bad: 0 };
    for (const p of profiles()) for (const r of Object.values(hitStats(p))) { hit.good += r.good; hit.ok += r.ok; hit.bad += r.bad; }
    fetch(`${WORKER_URL}/stats/ping?d=${id}&p=${kind}&i=${isStandalone ? 1 : 0}&hg=${hit.good}&ho=${hit.ok}&hb=${hit.bad}`)
      .then((r) => { if (r.ok) updateDevice({ sid: id, lastPing: day }); })
      .catch(() => {});
    if (!d.sid) updateDevice({ sid: id });
  } catch { /* Zählen ist nie wichtiger als die App */ }
}
