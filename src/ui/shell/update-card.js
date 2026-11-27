/* ui/shell/update-card: the Update Ready pop-up at the bottom of the screen (v19.17.3).
   features/app/desktop-app.js checks version.json often (every page change, coming back to the window, every 2
   minutes) and emits 'update-ready' with the new version and up to three lines of what is new. This card stays until
   the person restarts or picks Later; Later hides it for 10 minutes, then the next check brings it back. It waits
   while a pop-up window is open, so nothing being typed is lost. */
import { $ } from '../../core/dom.js';
import { html, raw } from '../../core/html.js';

const LATER_MS = 10 * 60 * 1000;
let laterUntil = 0;

const ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v4.5h-4.5"/><path d="M12 8v4.5l3 1.8"/></svg>';

/** show (or refresh) the card for update u = { version, notes, app } */
export function showUpdate(u) {
  if (!u || performance.now() < laterUntil || document.body.classList.contains('tv')) return;
  if ($('.ov.open') || $('#saver')) return;
  const where = u.app ? 'app' : 'page',
    notes = (u.notes || []).filter(Boolean);
  let e = $('#updCard');
  const fresh = !e;
  if (fresh) {
    e = document.createElement('div');
    e.id = 'updCard';
    e.className = 'upd';
    e.setAttribute('role', 'status');
    e.setAttribute('aria-live', 'polite');
    document.body.appendChild(e);
  }
  e.innerHTML = String(
    html`<span class="upd-i">${raw(ICON)}</span><div class="upd-t"><b>Update Ready<span class="upd-v">v${u.version}</span></b><small>Restart the ${where} to get the newest version. Your work is saved.</small>${notes.length ? html`<ul class="upd-n">${notes.map((n) => html`<li>${n}</li>`)}</ul>` : ''}</div><div class="upd-a"><button type="button" class="upd-l" data-act="updLater">Later</button><button type="button" class="upd-go" data-act="updRestart">Restart Now</button></div>`
  );
  if (fresh) requestAnimationFrame(() => e.classList.add('in'));
}
/** Restart Now: load the newest version */
export function updRestart() {
  const e = $('#updCard');
  if (e) e.classList.add('going');
  setTimeout(() => location.reload(), 120);
}
/** Later: hide for 10 minutes */
export function updLater() {
  laterUntil = performance.now() + LATER_MS;
  const e = $('#updCard');
  if (!e) return;
  e.classList.remove('in');
  e.classList.add('out');
  setTimeout(() => e.remove(), 220);
}
