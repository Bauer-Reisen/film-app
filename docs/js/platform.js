// Erkennt das Gerät und kümmert sich um „Auf den Home-Bildschirm“.
import { device, updateDevice } from './store.js?v=1.11.0';

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

// Android: einmal ein freundlicher Tipp
export function shouldShowInstallTip() {
  return isAndroid && !isStandalone && !device().installTipShown;
}
export function dismissInstallTip() { updateDevice({ installTipShown: true }); }

// Teilen-Symbol von Safari (Quadrat mit Pfeil nach oben)
export const SHARE_ICON = '<svg class="inline-icon" viewBox="0 0 24 24" aria-label="Teilen-Symbol"><path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 10H5v11h14V10h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
