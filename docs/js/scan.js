// Seite „Bücher scannen“: ISBN-Strichcodes am Stück mit der Handykamera erfassen.
// Erkennung: eingebaute Strichcode-Erkennung des Browsers (Android/Chrome) oder die freie Bibliothek ZXing
// (docs/vendor/zxing.min.js, Apache-Lizenz, wird erst hier geladen – iPhone/Safari kann es nicht von sich aus).
// Das Kamerabild bleibt auf dem Gerät, gesendet wird nur die erkannte ISBN.
import * as store from './store.js?v=1.25.0';
import * as books from './books.js?v=1.25.0';
import { esc, toast, dialog } from './ui.js?v=1.25.0';
import { coverImg, bookMeta } from './book-taste.js?v=1.25.0';
import { stateLabel } from './media.js?v=1.25.0';
import { startRating, takeAutoCamera } from './book-rate.js?v=1.25.0';
import { shareIds, shareText, importList, takePaste } from './book-share.js?v=1.25.0';


let profile = null;
let items = []; // { isbn, status: 'loading' | 'found' | 'missing', book }
let stream = null;
let loopTimer = null;
let detector = null; // BarcodeDetector oder ZXing
let lastCode = ''; let lastTime = 0;
let busyFrame = false;

const box = () => document.getElementById('scan');

export function render(p) {
  profile = p;
  return `
    <p class="back"><a href="#/geschmack" data-scan="back">← Geschmack</a></p>
    <h1>Bücher scannen</h1>
    <div id="scan">
      <p class="muted">Scanne einfach alle Bücher, die du hast – gelesene, ungelesene, abgebrochene. Du musst vorher nichts auswählen: Danach fragt die App bei jedem Buch kurz, wie es war.</p>
      <div class="scan-cam" id="scan-cam" hidden>
        <video id="scan-video" playsinline muted autoplay></video>
        <div class="scan-frame" aria-hidden="true"></div>
        <p class="scan-status" id="scan-status" role="status">Halte den Strichcode hinten auf dem Buch in den Rahmen.</p>
      </div>
      <p class="row scan-buttons">
        <button class="btn btn-primary btn-big" type="button" data-scan="start" id="scan-start"><span aria-hidden="true">📷</span> Kamera starten</button>
        <button class="btn btn-big" type="button" data-scan="stop" id="scan-stop" hidden>Kamera aus</button>
      </p>
      <details class="note">
        <summary>Keine Kamera? <span class="link">ISBN eintippen oder Foto wählen</span></summary>
        <form class="row scan-manual" data-scanform>
          <label class="field grow">ISBN (10 oder 13 Ziffern)
            <input id="scan-isbn" type="text" inputmode="numeric" autocomplete="off" enterkeyhint="done" placeholder="978…">
          </label>
          <button class="btn" type="submit">Hinzufügen</button>
        </form>
        <p><label class="btn">Foto mit Strichcode wählen<input type="file" accept="image/*" id="scan-photo" hidden></label></p>
      </details>
      <h2 id="scan-list-h" hidden>Erkannt</h2>
      <ul class="scan-list" id="scan-list" aria-labelledby="scan-list-h"></ul>
      <p class="row center-row" id="scan-done-row" hidden><button class="btn btn-primary btn-big" type="button" data-scan="done" id="scan-done">Fertig – speichern</button></p>
      ${missingSection()}
      ${shareSection()}
      <p class="muted small">Datenschutz: Das Kamerabild bleibt auf deinem Handy. Gesendet wird nur die ISBN-Nummer an Open Library.</p>
    </div>`;
}

// Bücherliste weitergeben (z. B. an jemanden im Haushalt) oder einfügen
function shareSection() {
  const n = shareIds(profile).length;
  return `
    <section class="card stack" id="share">
      <h2>Bücher weitergeben</h2>
      <p class="muted small">Zum Beispiel an jemanden aus deinem Haushalt: Weitergegeben werden nur die Bücher, nicht deine Bewertungen. Die andere Person bewertet sie dann selbst.</p>
      ${n ? `<p class="row"><button class="btn btn-primary" type="button" data-share="send"><span aria-hidden="true">📤</span> Bücherliste teilen (${n})</button>
        <button class="btn" type="button" data-share="copy"><span aria-hidden="true">📋</span> Kopieren</button></p>` : '<p class="muted small">Sobald du Bücher gescannt hast, kannst du die Liste hier teilen.</p>'}
      <details class="note" id="share-paste" ${takePaste() ? 'open' : ''}>
        <summary>Liste von jemandem bekommen? <span class="link">Liste einfügen</span></summary>
        <label class="field">Die ganze Nachricht hier einfügen
          <textarea id="share-in" rows="4" autocomplete="off" placeholder="📚 … Liste: OL…"></textarea>
        </label>
        <p><button class="btn btn-primary" type="button" data-share="paste">Bücher übernehmen</button></p>
      </details>
    </section>`;
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* unten */ }
  // Ersatz: Text markieren und kopieren
  const ta = Object.assign(document.createElement('textarea'), { value: text });
  ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.append(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* egal */ }
  ta.remove();
  return ok;
}

async function share(kind) {
  const text = shareText(store.getProfile(profile.id));
  if (kind === 'send' && navigator.share) {
    try { await navigator.share({ text }); return; } catch (err) { if (err?.name === 'AbortError') return; }
  }
  if (await copyText(text)) toast('Liste kopiert – jetzt z. B. in WhatsApp einfügen und abschicken.');
  else dialog({ title: 'Liste kopieren', body: `<p>Bitte den Text markieren und kopieren:</p><textarea rows="6" readonly style="width:100%">${esc(text)}</textarea>`, buttons: [{ label: 'Schließen', value: 'ok', primary: true }] });
}

async function paste(btn) {
  const text = document.getElementById('share-in')?.value || '';
  if (!/OL\d+W|\d{10}/.test(text)) { toast('In dem Text steht keine Bücherliste. Bitte die ganze Nachricht einfügen.'); return; }
  btn.disabled = true; btn.textContent = 'Lädt …';
  let res;
  try { res = await importList(store.getProfile(profile.id), text); } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = 'Bücher übernehmen'; return; }
  profile = store.getProfile(profile.id);
  const parts = [`${res.added.length} ${res.added.length === 1 ? 'Buch' : 'Bücher'} übernommen`];
  if (res.known) parts.push(`${res.known} kanntest du schon`);
  if (res.missing) parts.push(`${res.missing} nicht gefunden`);
  toast(`${parts.join(', ')}.`);
  if (res.added.length) { startRating(res.added); location.hash = '#/bewerten'; } else { btn.disabled = false; btn.textContent = 'Bücher übernehmen'; }
}

function missingSection() {
  const list = profile.scanMissing || [];
  if (!list.length) return '';
  return `<details class="note" id="scan-missing"><summary>${list.length} früher nicht gefunden</summary>
    <p class="muted small">Diese Nummern kannte Open Library beim Scannen nicht. Such das Buch unter „Geschmack“ nach Titel.</p>
    <ul class="plain">${list.map((x) => `<li>ISBN ${esc(x.isbn)} <button class="btn btn-small" type="button" data-missdel="${esc(x.isbn)}">Entfernen</button></li>`).join('')}</ul></details>`;
}

export function mount(p) {
  profile = p;
  const form = document.querySelector('[data-scanform]');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('scan-isbn');
    const isbn = books.cleanIsbn(input.value);
    if (!isbn) { toast('Das ist keine gültige ISBN. Bitte die 10 oder 13 Ziffern prüfen.'); return; }
    add(isbn);
    input.value = '';
  });
  document.getElementById('scan-photo')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const code = await decodeFile(file).catch(() => null);
    const isbn = books.cleanIsbn(code);
    if (isbn) add(isbn); else toast('Auf dem Foto wurde kein ISBN-Strichcode erkannt.');
  });
  paintList();
  if (takeAutoCamera()) startCamera();
  const pasteBox = document.getElementById('share-paste');
  if (pasteBox?.open) { pasteBox.scrollIntoView({ block: 'center' }); document.getElementById('share-in')?.focus(); }
}

// Beim Verlassen der Seite: Kamera aus
export function leave() { stopCamera(); }

// ---------- Erkennung ----------
let zxingLoad = null;
function loadZxing() {
  if (window.ZXing) return Promise.resolve(window.ZXing);
  zxingLoad ||= new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement('script'), { src: 'vendor/zxing.min.js', async: true });
    s.onload = () => resolve(window.ZXing);
    s.onerror = () => { zxingLoad = null; reject(new Error('Die Strichcode-Erkennung konnte nicht geladen werden.')); };
    document.head.append(s);
  });
  return zxingLoad;
}

async function makeDetector() {
  if (detector) return detector;
  if ('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats.includes('ean_13')) {
        const bd = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a'].filter((f) => formats.includes(f)) });
        detector = { kind: 'native', detect: async (src) => (await bd.detect(src))[0]?.rawValue || null };
        return detector;
      }
    } catch { /* dann ZXing */ }
  }
  const Z = await loadZxing();
  const reader = new Z.MultiFormatReader();
  reader.setHints(new Map([
    [Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A]],
    [Z.DecodeHintType.TRY_HARDER, true],
  ]));
  detector = {
    kind: 'zxing',
    detect: async (canvas) => {
      try {
        const bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(canvas)));
        return reader.decode(bmp).getText();
      } catch { return null; } finally { reader.reset(); }
    },
  };
  return detector;
}

// Bild (Foto oder Kamerabild) in eine Leinwand zeichnen; band = nur der mittlere Streifen (schneller, Strichcode liegt im Rahmen)
const canvas = document.createElement('canvas');
function draw(src, w, h, band) {
  const scale = Math.min(1, 1280 / Math.max(w, h));
  const cw = Math.round(w * scale);
  const ch = Math.round((band ? h * 0.5 : h) * scale);
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, band ? h * 0.25 : 0, w, band ? h * 0.5 : h, 0, 0, cw, ch);
  return canvas;
}

// Für Fotos und zum Ausprobieren am Rechner (Testbilder)
export async function decodeFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return await decodeImage(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function decodeImage(img, w, h) {
  const d = await makeDetector();
  if (d.kind === 'native') return d.detect(img);
  return d.detect(draw(img, w, h, false));
}

// ---------- Kamera ----------
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast('Dieser Browser kann die Kamera nicht öffnen. Tipp die ISBN unten ein.');
    document.querySelector('#scan details.note')?.setAttribute('open', '');
    return;
  }
  const status = document.getElementById('scan-status');
  try {
    await makeDetector();
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (err) {
    stream = null;
    const denied = err?.name === 'NotAllowedError';
    await dialog({
      title: denied ? 'Kamera nicht erlaubt' : 'Kamera nicht verfügbar',
      body: denied
        ? '<p>Die App darf die Kamera nicht benutzen. Erlaube es in den Einstellungen des Browsers (iPhone: Einstellungen → Safari → Kamera) und versuch es noch mal.</p><p class="muted small">Oder tipp die ISBN unten von Hand ein.</p>'
        : `<p>${esc(err?.message || 'Keine Kamera gefunden.')}</p><p class="muted small">Du kannst die ISBN unten von Hand eintippen.</p>`,
    });
    return;
  }
  const video = document.getElementById('scan-video');
  if (!video) { stopCamera(); return; }
  video.srcObject = stream;
  await video.play().catch(() => {});
  document.getElementById('scan-cam').hidden = false;
  document.getElementById('scan-start').hidden = true;
  document.getElementById('scan-stop').hidden = false;
  if (status) status.textContent = 'Halte den Strichcode hinten auf dem Buch in den Rahmen.';
  loop();
}

function stopCamera() {
  clearTimeout(loopTimer);
  loopTimer = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  const cam = document.getElementById('scan-cam');
  if (cam) cam.hidden = true;
  const start = document.getElementById('scan-start');
  if (start) { start.hidden = false; document.getElementById('scan-stop').hidden = true; }
}

function loop() {
  if (!stream) return;
  loopTimer = setTimeout(async () => {
    const video = document.getElementById('scan-video');
    if (!video || !stream) return;
    if (!busyFrame && video.readyState >= 2 && video.videoWidth) {
      busyFrame = true;
      try {
        const d = detector;
        const code = d.kind === 'native' ? await d.detect(video) : await d.detect(draw(video, video.videoWidth, video.videoHeight, true));
        if (code) found(code);
      } catch { /* nächstes Bild */ }
      busyFrame = false;
    }
    loop();
  }, detector?.kind === 'native' ? 120 : 200);
}

function found(code) {
  const now = Date.now();
  if (code === lastCode && now - lastTime < 3000) return; // dasselbe Buch hängt noch vor der Kamera
  lastCode = code; lastTime = now;
  const isbn = books.cleanIsbn(code);
  const status = document.getElementById('scan-status');
  if (!isbn || !/^97[89]/.test(isbn) && isbn.length === 13) {
    if (status) status.textContent = 'Das ist kein Buch-Strichcode (ISBN beginnt mit 978 oder 979).';
    return;
  }
  add(isbn);
}

// ---------- Liste ----------
let audio = null;
function confirmSignal(ok = true) {
  try { navigator.vibrate?.(ok ? 60 : [40, 60, 40]); } catch { /* egal */ }
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(); const g = audio.createGain();
    o.frequency.value = ok ? 1200 : 400; g.gain.value = 0.08;
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + (ok ? 0.08 : 0.2));
  } catch { /* ohne Ton */ }
}

async function add(isbn) {
  const status = document.getElementById('scan-status');
  if (items.some((x) => x.isbn === isbn)) {
    if (status) status.textContent = 'Schon in der Liste.';
    return;
  }
  const item = { isbn, status: 'loading', book: null };
  items.unshift(item);
  paintList();
  let book = null;
  try { book = await books.byIsbn(isbn, books.readLang(profile)); } catch (err) { item.error = err.message; }
  if (!items.includes(item)) return;
  // Dasselbe Werk schon gescannt (andere Ausgabe)? Dann nur einmal
  if (book && items.some((x) => x !== item && x.book?.id === book.id)) {
    items = items.filter((x) => x !== item);
    if (status) status.textContent = `„${book.title}“ ist schon in der Liste (andere Ausgabe).`;
    paintList();
    return;
  }
  item.book = book;
  item.status = book ? 'found' : 'missing';
  confirmSignal(!!book);
  if (status) status.textContent = book ? `✓ ${book.title}` : `ISBN ${isbn} nicht gefunden – gemerkt, weiter geht's.`;
  if (!book) toast(`ISBN ${isbn} kennt Open Library nicht. Sie bleibt in der Liste.`);
  paintList();
}

function itemRow(x) {
  const dup = x.book && !profile.books?.[x.book.id] ? books.knownMatcher(profile)(x.book) : null;
  const old = x.book ? (profile.books?.[x.book.id] || profile.books?.[dup])?.s : null;
  const body = x.status === 'loading'
    ? `<span class="muted">ISBN ${esc(x.isbn)} – suche …</span>`
    : x.status === 'missing'
      ? `<strong>Nicht gefunden</strong><span class="muted small">ISBN ${esc(x.isbn)} – zum späteren Nachschauen gemerkt</span>`
      : `<strong>${esc(x.book.title)}</strong><span class="muted small">${esc(bookMeta(x.book))}</span>${old ? `<span class="small">Schon markiert: ${esc(stateLabel('book', old))}</span>` : ''}`;
  return `
    <li class="scan-item ${x.status}" data-scanitem="${x.isbn}">
      <span class="scan-cover">${x.book ? coverImg(x.book.cover) : '<div class="poster noimg" aria-hidden="true">?</div>'}</span>
      <span class="scan-text">${body}</span>
      <span class="scan-actions"><button class="btn btn-small" type="button" data-scandel="${x.isbn}" aria-label="Aus der Liste nehmen">✕</button></span>
    </li>`;
}

function paintList() {
  const ul = document.getElementById('scan-list');
  if (!ul) return;
  ul.innerHTML = items.map(itemRow).join('');
  document.getElementById('scan-list-h').hidden = !items.length;
  document.getElementById('scan-done-row').hidden = !items.length;
  const n = items.filter((x) => x.status === 'found').length;
  document.getElementById('scan-done').textContent = n ? `Fertig – ${n} ${n === 1 ? 'Buch' : 'Bücher'} bewerten` : 'Fertig';
}

// Speichern: neue Bücher kommen auf die Warteliste (noch nicht bewertet) – gleich danach fragt die Bewertungsrunde nach.
// Schon bewertete Bücher bleiben, wie sie sind.
function finish() {
  stopCamera();
  let added = 0; let known = 0;
  const toRate = [];
  for (const x of [...items].reverse().filter((i) => i.status === 'found')) { // in der Reihenfolge des Scannens
    const p = store.getProfile(profile.id);
    const old = p.books?.[x.book.id];
    const waiting = (p.pendingBooks || []).some((w) => w.id === x.book.id);
    if (!old && !waiting && books.knownMatcher(p)(x.book)) { known++; continue; } // dasselbe Buch, andere Werk-Nummer
    if (!old && !waiting) { store.addPending(profile.id, [books.pendingEntry(x.book)]); added++; } else known++;
    if (!old || (old.s === 'seen' && !old.r)) toRate.push(x.book.id);
  }
  const missing = items.filter((i) => i.status === 'missing').map((i) => ({ isbn: i.isbn, t: Date.now() }));
  if (missing.length) {
    const p = store.getProfile(profile.id);
    store.updateProfile(profile.id, { scanMissing: [...new Map([...(p.scanMissing || []), ...missing].map((x) => [x.isbn, x])).values()] });
  }
  items = [];
  if (toRate.length) startRating(toRate);
  toast(`${added} ${added === 1 ? 'Buch' : 'Bücher'} gespeichert${known ? `, ${known} kanntest du schon` : ''}${missing.length ? `, ${missing.length} nicht gefunden (gemerkt)` : ''}.`);
  location.hash = toRate.length ? '#/bewerten' : '#/geschmack';
}

export function handleClick(e) {
  const del = e.target.closest('[data-scandel]');
  if (del) { items = items.filter((x) => x.isbn !== del.dataset.scandel); paintList(); return true; }
  const miss = e.target.closest('[data-missdel]');
  if (miss) {
    store.updateProfile(profile.id, { scanMissing: (profile.scanMissing || []).filter((x) => x.isbn !== miss.dataset.missdel) });
    profile = store.getProfile(profile.id);
    miss.closest('li').remove();
    return true;
  }
  const sh = e.target.closest('[data-share]')?.dataset.share;
  if (sh === 'send' || sh === 'copy') { share(sh); return true; }
  if (sh === 'paste') { paste(e.target.closest('[data-share]')); return true; }
  const act = e.target.closest('[data-scan]')?.dataset.scan;
  if (act === 'start') { startCamera(); return true; }
  if (act === 'stop') { stopCamera(); return true; }
  if (act === 'done') { finish(); return true; }
  if (act === 'back' && items.some((x) => x.status === 'found')) {
    e.preventDefault();
    dialog({
      title: 'Liste speichern?',
      body: `<p>Du hast ${items.filter((x) => x.status === 'found').length} Bücher gescannt, die noch nicht gespeichert sind.</p>`,
      buttons: [{ label: 'Verwerfen', value: 'drop' }, { label: 'Speichern', value: 'save', primary: true }],
    }).then((r) => { if (r?.value === 'save') finish(); else if (r?.value === 'drop') { items = []; stopCamera(); location.hash = '#/geschmack'; } });
    return true;
  }
  return false;
}
