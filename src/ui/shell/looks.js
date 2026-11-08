/* ui/shell/looks: Page background and greeting box designs. */
import { onClick } from '../../core/actions.js';
import { $, $$, esc } from '../../core/dom.js';
import { svg } from '../../core/icons.js';

/* ==========================================================================
   18 · Looks, picked from the top bar (palette button), saved per device
   Page Background and Greeting Box pattern are separate choices.
   Styles live in css/07-looks.css.
   ========================================================================== */
export const LOOK_BG = [
  ['aurora', 'Aurora'],
  ['glow', 'Soft Glow'],
  ['plain', 'Plain'],
];
export const LOOK_HERO = [
  ['contour', 'Contour Lines'],
  ['dots', 'Dot Grid'],
  ['blueprint', 'Blueprint'],
  ['leaded', 'Leaded Light'],
  ['none', 'None'],
];
export const lsGet = (k) => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  lsSet = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  };
export function lookNow() {
  /* older versions kept one choice under 'bb_look': move it to the right place */
  const old = lsGet('bb_look');
  if (old) {
    if (LOOK_HERO.some((l) => l[0] == old)) lsSet('bb_hero', old);
    if (old == 'aurora') lsSet('bb_bg', 'aurora');
    try {
      localStorage.removeItem('bb_look');
    } catch (e) {}
  }
  const bg = lsGet('bb_bg'),
    hero = lsGet('bb_hero');
  return {
    bg: LOOK_BG.some((l) => l[0] == bg) ? bg : 'aurora',
    hero: LOOK_HERO.some((l) => l[0] == hero) ? hero : 'contour',
  };
}
export function setLook(kind, k) {
  const L = kind == 'bg' ? LOOK_BG : LOOK_HERO;
  if (!L.some((l) => l[0] == k)) return;
  document.body.dataset[kind] = k;
  lsSet(kind == 'bg' ? 'bb_bg' : 'bb_hero', k);
  $$(`#lookPop .lkb[data-kind="${kind}"]`).forEach((b) => {
    const on = b.dataset.k == k;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
}
export function lookPop(open) {
  let p = $('#lookPop');
  if (!p) {
    p = document.createElement('div');
    p.id = 'lookPop';
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', 'Look');
    const grid = (kind, L, cls) =>
      `<div class="lkg">${L.map(([k, n]) => `<button type="button" class="lkb ${cls} ${cls}-${esc(k)}" data-kind="${kind}" data-k="${esc(k)}" ${onClick('setLook', kind, k)}><i></i>${esc(n)}</button>`).join('')}</div>`;
    p.innerHTML = `<h3>Page Background</h3>${grid('bg', LOOK_BG, 'bg')}<h3>Greeting Box</h3>${grid('hero', LOOK_HERO, 'hp')}`;
    document.body.appendChild(p);
  }
  const show = open ?? !p.classList.contains('open');
  p.classList.toggle('open', show);
  if (show) {
    const n = lookNow();
    setLook('bg', n.bg);
    setLook('hero', n.hero);
    const r = $('#lookBtn').getBoundingClientRect(),
      w = p.offsetWidth;
    p.style.top = r.bottom + 8 + 'px';
    p.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.right - w)) + 'px';
    const on = $('#lookPop .lkb.on');
    on && on.focus();
  }
}
export function looks() {
  const n = lookNow();
  document.body.dataset.bg = n.bg;
  document.body.dataset.hero = n.hero;
  const b = document.createElement('button');
  b.className = 'ib';
  b.id = 'lookBtn';
  b.type = 'button';
  b.title = 'Look';
  b.setAttribute('aria-label', 'Look: page background and greeting box');
  b.innerHTML = svg(
    'M12 3a9 9 0 100 18c1 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.5-.7-.5-1.1 0-1 .8-1.7 1.7-1.7H16a5 5 0 005-5c0-4-4-7.4-9-7.4zM7.5 11.5h.01M9.5 7.5h.01M14.5 7.5h.01M17 11h.01'
  );
  b.onclick = (e) => {
    e.stopPropagation();
    lookPop();
  };
  const t = $('#thb');
  if (t) t.before(b);
  document.addEventListener('click', (e) => {
    const p = $('#lookPop');
    if (p && p.classList.contains('open') && !p.contains(e.target)) lookPop(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key == 'Escape' && $('#lookPop.open')) {
      lookPop(false);
      $('#lookBtn').focus();
    }
  });
  addEventListener('resize', () => {
    if ($('#lookPop.open')) lookPop(true);
  });
}
