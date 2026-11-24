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
  at = { x: r.left, y: r.top };
}
/* where the pop-over's button was when it opened */
let at = null;
export function closeFpop() {
  const p = $('#fpop');
  if (p) p.classList.remove('open');
}
/* the button a pop-over belongs to toggles it, so a press on it is not an outside click */
const OWNERS = '#fpop,.fbtn,[aria-haspopup]';
/* start-up step (run once by main.js) */
export function listenForOutsideClicks() {
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest(OWNERS)) closeFpop();
  });
  /* the pop-over is pinned to the screen, so when its button scrolls away (the page, or a table scrolled sideways
     on a phone) it closes instead of floating over other rows. A nudge of a few pixels (the browser bringing a
     tapped button into view) does not count. */
  document.addEventListener(
    'scroll',
    () => {
      const p = $('#fpop'),
        btn = p && p.classList.contains('open') && document.getElementById(p.dataset.for);
      if (!btn || !at) return;
      const r = btn.getBoundingClientRect();
      if (Math.abs(r.left - at.x) > 12 || Math.abs(r.top - at.y) > 12) closeFpop();
    },
    true
  );
  /* a new window width closes it; a phone's address bar showing or hiding (height only) does not */
  let wide = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth != wide) closeFpop();
    wide = innerWidth;
  });
}
