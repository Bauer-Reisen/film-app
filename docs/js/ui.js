// Kleine Bausteine für die Oberfläche: Text absichern, Dialoge, Meldungen.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const formatDate = (ts) => new Date(ts).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

// Dialog mit Knöpfen. Gibt den value des gedrückten Knopfs zurück (oder null).
// body darf HTML enthalten; Formularfelder werden als Objekt mitgeliefert.
export function dialog({ title, body = '', buttons = [{ label: 'OK', value: true, primary: true }], validate }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'dlg';
    d.innerHTML = `
      <form novalidate>
        <h2>${esc(title)}</h2>
        <div class="dlg-body">${body}</div>
        <p class="dlg-error" role="alert"></p>
        <div class="dlg-buttons">
          ${buttons.map((b, i) => `<button type="${b.primary ? 'submit' : 'button'}" class="btn ${b.primary ? 'btn-primary' : ''} ${b.danger ? 'btn-danger' : ''}" value="${i}">${esc(b.label)}</button>`).join('')}
        </div>
      </form>`;
    document.body.append(d);
    const form = d.querySelector('form');
    const fields = () => Object.fromEntries(new FormData(form).entries());

    // Ergebnis direkt liefern – nicht auf das „close"-Ereignis des Browsers warten
    let done = false;
    const finish = (btn) => {
      if (done) return;
      done = true;
      const data = fields();
      if (d.open) d.close();
      d.remove();
      resolve(btn ? { value: btn.value, fields: data } : null);
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = buttons[e.submitter?.value] || buttons.find((b) => b.primary);
      if (btn && btn.primary && validate) {
        const msg = validate(fields());
        if (msg) {
          d.querySelector('.dlg-error').textContent = msg;
          return;
        }
      }
      finish(btn);
    });
    // Knöpfe ohne Prüfung (Abbrechen, Löschen …) direkt auswerten
    d.querySelectorAll('button[type="button"]').forEach((b) =>
      b.addEventListener('click', () => finish(buttons[b.value])));
    d.addEventListener('cancel', (e) => { e.preventDefault(); finish(null); }); // Esc-Taste
    d.addEventListener('close', () => finish(null));
    d.showModal();
    const first = d.querySelector('input:not([type=radio]), input[type=radio]:checked');
    if (first) first.focus();
  });
}

// Meldung über der Tab-Leiste, optional mit Knopf (z. B. „Rückgängig“)
let toastTimer;
export function toast(text, action) {
  const el = document.getElementById('toast');
  clearTimeout(toastTimer);
  el.innerHTML = `<span>${esc(text)}</span>${action ? `<button class="btn btn-small" type="button">${esc(action.label)}</button>` : ''}`;
  el.classList.add('show');
  if (action) el.querySelector('button').onclick = () => { el.classList.remove('show'); action.run(); };
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? 6000 : 4000);
}
