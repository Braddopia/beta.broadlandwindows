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
/* Messages pop up as a small card in the middle of the screen: a drawn tick for things that worked,
   a warning sign for problems. Plain information ("Signed in as ...", "Opened ...") is not shown at all. */
const INFO = /^(signed in as|opened |getting the |picked at random|the tour will|back to (the default|automatic))/i;
const OK =
  /\b(saved|added|deleted|removed|created|booked|sent|updated|copied|approved|recorded|restored|imported|exported|undone|marked|moved|applied|uploaded|brought back|downloaded|filled in|given to|now contract|now order|paid|counts set)\b/i;
const BAD =
  /\b(not|no|cannot|can't|could not|only|first|already|must|needs?|pick|choose|enter|type a|use \d|fill|at least|allow|too|limit|invalid|harder|please|up to|no longer|still uses|nothing|signed out|split)\b/i;
export const toastKind = (t) =>
  INFO.test(t) ? 'info' : BAD.test(t) && !/^(saved|.* saved)$/i.test(t) ? 'bad' : OK.test(t) ? 'ok' : 'bad';
const TICK =
  '<svg viewBox="0 0 52 52" class="tp-i" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="M15 27l7 7 15-15"/></svg>';
const WARN =
  '<svg viewBox="0 0 52 52" class="tp-i" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="M26 14v15M26 37v.5"/></svg>';
export function toast(t) {
  if (document.body.classList.contains('tv')) return;
  t = String(t ?? '');
  const kind = toastKind(t);
  if (kind == 'info') return;
  const e = $('#toast');
  e.className = 'toast tpop ' + kind;
  e.innerHTML = (kind == 'ok' ? TICK : WARN) + '<span></span>';
  e.lastChild.textContent = t;
  e.onclick = toastHide;
  e.style.display = 'flex';
  /* restart the pop-in each time */
  e.classList.remove('in');
  void e.offsetWidth;
  e.classList.add('in');
  clearTimeout(toast.t);
  toast.t = setTimeout(
    () => {
      e.classList.remove('in');
      e.classList.add('out');
      toast.t = setTimeout(() => (e.style.display = 'none'), 220);
    },
    kind == 'ok' ? 1900 : 3400
  );
}
/* tap the card to close it early */
export function toastHide() {
  const e = $('#toast');
  clearTimeout(toast.t);
  if (e) e.style.display = 'none';
}
