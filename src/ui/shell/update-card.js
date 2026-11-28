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
/** "28 November 2026" */
const longDate = (d) =>
  new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
let laterUntil = 0,
  last = null,
  retryT = 0;

/** show the window for update u = { version, notes, app }; while snoozed, only the chip */
export function showUpdate(u) {
  if (!u || document.body.classList.contains('tv')) return;
  last = u;
  /* put away with Remind Me Later: only the chip, unless someone pressed Check For Updates */
  if (!u.force && performance.now() < laterUntil) return showChip(u);
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
    notes = (u.notes || []).filter((n) => n && (typeof n != 'object' || n.t || n.d));
  $('#updChip')?.remove();
  const e = document.createElement('div');
  e.id = 'updWin';
  e.className = 'updw';
  e.innerHTML = String(
    html`<div class="updw-card" role="dialog" aria-modal="true" aria-labelledby="updT" aria-describedby="updS">
      <button type="button" class="updw-x" data-act="updLater" aria-label="Remind me in 10 minutes">&times;</button>
      <div class="updw-h"><div class="updw-ic"><img src="${LOGO_SRC.icon}" alt=""></div><div><h2 id="updT">What's New</h2><span class="updw-v">Version ${u.version}${u.date ? ' · ' + longDate(u.date) : ''}</span></div></div>
      <div class="updw-b">${
        notes.length
          ? notes.map((n, k) =>
              typeof n == 'object'
                ? html`<section class="updw-s c${k % 4}">${n.t ? html`<h3>${n.t}</h3>` : ''}<p>${n.d}</p></section>`
                : html`<section class="updw-s"><p>${n}</p></section>`
            )
          : html`<section class="updw-s"><p>Small fixes and improvements.</p></section>`
      }</div>
      <div class="updw-f"><b class="updw-r">A New Version Is Ready</b><p id="updS">Restart the ${where} to start using it. Everything you have done is saved.</p>
      <button type="button" class="btn updw-go" data-act="updRestart">Restart Now</button>
      <button type="button" class="updw-l" data-act="updLater">Remind Me In 10 Minutes</button></div>
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
