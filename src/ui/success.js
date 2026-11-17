/* ui/success: the moment something new is made (a contract, a lead, a contact, a service call...), a tick draws
   itself in a ring that pops in the middle of the screen with what was made, then it fades away on its own.
   Exaggerated feedback with follow-through (docs/UX-PRINCIPLES.md); it never blocks: clicks pass through it, and any click or key sends it away,
   and with less motion asked for it simply shows and goes. The bottom banner still says it too. */
import { esc } from '../core/dom.js';

let el = null,
  t = 0;
/** show the success tick: celebrate('Contract Created', '1023431 - SAMPLE CUSTOMER') */
export function celebrate(title, sub) {
  if (document.body.classList.contains('tv')) return;
  if (!el) {
    el = document.createElement('div');
    el.id = 'yay';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  clearTimeout(t);
  el.innerHTML = `<div class="yay-b"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="yay-r" cx="32" cy="32" r="28"/><path class="yay-t" d="M19 33l9 9 17-19"/></svg><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  el.classList.remove('on', 'off');
  void el.offsetWidth;
  el.classList.add('on');
  /* it never gets in the way: clicks go straight through to the page, and any click or key sends it away */
  document.addEventListener('keydown', hide, { once: true, capture: true });
  document.addEventListener('pointerdown', hide, { once: true, capture: true });
  t = setTimeout(hide, 1600);
}
function hide() {
  if (!el || !el.classList.contains('on')) return;
  clearTimeout(t);
  el.classList.add('off');
  t = setTimeout(() => el && el.classList.remove('on', 'off'), 260);
}
