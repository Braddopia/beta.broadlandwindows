/* ui/shell/update-card: the "A New Version Is Ready" window (v19.17.5, the owner's choice: in the middle of the
   screen until restarted).
   features/app/desktop-app.js checks version.json often (every page change, coming back to the window, every 2
   minutes) and emits 'update-ready' with the new version and up to three lines of what is new. The window sits in the
   middle of a dimmed screen with Restart Now. "Remind Me In 10 Minutes" (or Esc) puts it away and leaves a small
   "Update ready" chip at the bottom, which restarts in one click; after 10 minutes the next check brings the window
   back. It waits while another pop-up window, a tour or the screen saver is open, so nothing being typed is lost. */
import { $ } from '../../core/dom.js';
import { html } from '../../core/html.js';
import { LOGO_SRC } from '../../core/assets.js';

const LATER_MS = 10 * 60 * 1000;
let laterUntil = 0,
  last = null,
  retryT = 0;

/** show the window for update u = { version, notes, app }; while snoozed, only the chip */
export function showUpdate(u) {
  if (!u || document.body.classList.contains('tv')) return;
  last = u;
  if (performance.now() < laterUntil) return showChip(u);
  if ($('#updWin')) return;
  /* (v19.18.3) wait while a pop-up window, a tour or the screen saver is showing, then try again by itself. The
     screen saver's scene stays on the page once it has been used, so it counts only while it is on ('#saver.on');
     before, its hidden scene stopped the window from ever showing again. */
  if ($('.ov.open') || $('#saver.on') || $('#tour.open')) {
    clearTimeout(retryT);
    retryT = setTimeout(() => showUpdate(last), 15e3);
    return;
  }
  const where = u.app ? 'app' : 'page',
    notes = (u.notes || []).filter(Boolean);
  $('#updChip')?.remove();
  const e = document.createElement('div');
  e.id = 'updWin';
  e.className = 'updw';
  e.innerHTML = String(
    html`<div class="updw-card" role="dialog" aria-modal="true" aria-labelledby="updT" aria-describedby="updS">
      <div class="updw-ic"><img src="${LOGO_SRC.icon}" alt=""></div>
      <span class="updw-v">Version ${u.version}</span>
      <h2 id="updT">A New Version Is Ready</h2>
      <p id="updS">Restart the ${where} to start using it. Everything you have done is saved.</p>
      ${notes.length ? html`<div class="updw-n"><b>What's New</b><ul>${notes.map((n) => html`<li>${n}</li>`)}</ul></div>` : ''}
      <button type="button" class="btn updw-go" data-act="updRestart">Restart Now</button>
      <button type="button" class="updw-l" data-act="updLater">Remind Me In 10 Minutes</button>
    </div>`
  );
  document.body.appendChild(e);
  e.addEventListener('keydown', (ev) => {
    if (ev.key == 'Escape') updLater();
    /* keep the keyboard inside the window */
    if (ev.key == 'Tab') {
      const b = [...e.querySelectorAll('button')],
        i = b.indexOf(document.activeElement);
      ev.preventDefault();
      b[(i + (ev.shiftKey ? b.length - 1 : 1)) % b.length].focus();
    }
  });
  requestAnimationFrame(() => {
    e.classList.add('in');
    e.querySelector('.updw-go').focus();
  });
}
/** the small reminder at the bottom while the window is put away */
function showChip(u) {
  if ($('#updChip')) return;
  const c = document.createElement('div');
  c.id = 'updChip';
  c.className = 'updc';
  c.setAttribute('role', 'status');
  c.innerHTML = String(
    html`<span class="updc-dot"></span><span>Version ${u.version} is ready</span><button type="button" data-act="updRestart">Restart</button>`
  );
  document.body.appendChild(c);
}
/** Restart Now: load the newest version */
export function updRestart() {
  document.body.classList.add('upd-going');
  setTimeout(() => location.reload(), 150);
}
/** Remind Me In 10 Minutes: put the window away, keep the chip */
export function updLater() {
  laterUntil = performance.now() + LATER_MS;
  const e = $('#updWin');
  if (e) {
    e.classList.remove('in');
    e.classList.add('out');
    setTimeout(() => e.remove(), 220);
  }
  if (last) showChip(last);
}
