/* ui/toast: Short messages at the bottom of the screen, and the busy state on buttons. */
import { $ } from '../core/dom.js';

/* ---- toast ---- */
/* short 'working' state on a button so a press always shows it was felt */
export function busyBtn(b, ms) {
  if (!b || b.classList.contains('busy')) return;
  b.classList.add('busy');
  b.setAttribute('aria-busy', 'true');
  setTimeout(() => {
    b.classList.remove('busy');
    b.removeAttribute('aria-busy');
  }, ms || 600);
}
/* Messages show as a small banner at the bottom of the screen (a "snackbar", the pattern most apps use):
   a tick for things that worked, a warning sign for problems, and an optional button such as Undo.
   Plain information ("Signed in as ...", "Opened ...") is not shown at all. */
const INFO = /^(signed in as|opened |getting the |picked at random|the tour will|back to (the default|automatic))/i;
const OK =
  /\b(saved|added|deleted|removed|created|booked|sent|updated|copied|approved|recorded|restored|imported|exported|undone|marked|moved|applied|uploaded|brought back|downloaded|filled in|given to|now contract|now order|paid|counts set|cancelled|completed|withdrawn)\b/i;
const BAD =
  /\b(not|no|cannot|can't|could not|only|first|already|must|needs?|pick|choose|enter|type a|use \d|fill|at least|allow|too|limit|invalid|harder|please|up to|no longer|still uses|nothing|signed out|split)\b/i;
export const toastKind = (t) =>
  INFO.test(t) ? 'info' : BAD.test(t) && !/^(saved|.* saved)$/i.test(t) ? 'bad' : OK.test(t) ? 'ok' : 'bad';
/* plain icons, no drawing animation */
const TICK = '<svg viewBox="0 0 24 24" class="tp-i" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const WARN = '<svg viewBox="0 0 24 24" class="tp-i" aria-hidden="true"><path d="M12 7v6.5M12 17v.5"/></svg>';
let undoFn = null;
/** show a message. opts.action = { label: 'Undo', run: fn } adds a button on the banner */
export function toast(t, opts) {
  if (document.body.classList.contains('tv')) return;
  t = String(t ?? '');
  const kind = toastKind(t);
  if (kind == 'info') return;
  const e = $('#toast'),
    act = opts && opts.action;
  undoFn = act ? act.run : null;
  e.className = 'toast tpop ' + kind;
  e.innerHTML = (kind == 'ok' ? TICK : WARN) + '<span class="tp-t"></span>';
  e.querySelector('.tp-t').textContent = t;
  if (act) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tp-a';
    b.textContent = act.label || 'Undo';
    e.appendChild(b);
  }
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'tp-x';
  x.setAttribute('aria-label', 'Close message');
  x.innerHTML = '&times;';
  e.appendChild(x);
  e.onclick = (ev) => {
    const a = ev.target.closest('.tp-a');
    if (a && undoFn) {
      const f = undoFn;
      undoFn = null;
      toastHide();
      f();
    } else if (ev.target.closest('.tp-x')) toastHide();
  };
  e.style.display = 'flex';
  /* restart the slide-in each time */
  e.classList.remove('in');
  void e.offsetWidth;
  e.classList.add('in');
  clearTimeout(toast.t);
  toast.t = setTimeout(
    () => {
      e.classList.remove('in');
      e.classList.add('out');
      toast.t = setTimeout(() => {
        e.style.display = 'none';
        undoFn = null;
      }, 200);
    },
    act ? 6000 : kind == 'ok' ? 3000 : 4500
  );
}
/* close the banner early */
export function toastHide() {
  const e = $('#toast');
  clearTimeout(toast.t);
  undoFn = null;
  if (e) e.style.display = 'none';
}
