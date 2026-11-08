/* ui/components/popover: Small pop-over panels. */
import { $ } from '../../core/dom.js';

/* ---- floating sort/filter popover ---- */
export function openFpop(btn, html) {
  const p = $('#fpop');
  if (p.classList.contains('open') && p.dataset.for == btn.id) {
    closeFpop();
    return;
  }
  p.innerHTML = html;
  p.dataset.for = btn.id;
  p.classList.add('open');
  const r = btn.getBoundingClientRect(),
    w = p.offsetWidth;
  p.style.top = Math.min(innerHeight - p.offsetHeight - 8, r.bottom + 6) + 'px';
  p.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
}
export function closeFpop() {
  const p = $('#fpop');
  if (p) p.classList.remove('open');
}
/* start-up step (run once by main.js) */
export function listenForOutsideClicks() {
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#fpop,.fbtn')) closeFpop();
  });
}
