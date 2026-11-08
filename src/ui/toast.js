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
export function toast(t) {
  if (document.body.classList.contains('tv')) return;
  const e = $('#toast');
  e.textContent = t;
  e.style.display = 'block';
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (e.style.display = 'none'), 3400);
}
