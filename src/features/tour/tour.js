/* features/tour/tour: The welcome tour. */
import { $, $$, esc } from '../../core/dom.js';
import { svg } from '../../core/icons.js';
import { ROLE } from '../../data/session.js';
import { can } from '../../domain/permissions.js';
import { ART_IC } from '../../ui/components/art.js';
import { go, render, view } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { TAB_TOURS, WELCOME } from './tour-steps.js';

/* ---------------- tours ----------------
   The welcome tour plays once, the very first time someone opens the site. Each tab then has its own short
   tour the first time it is opened (TAB_TOURS in tour-steps.js). Both are "locked" when they play by
   themselves: no Skip, and Next unlocks once a timer bar fills. (Hidden: Esc three times in a row leaves.)
   The ? button replays the tour for the tab you are on (or the welcome tour), with Skip and no wait. */
export { TAB_TOURS };
export let TI = 0;
let STEPS = WELCOME,
  KEY = 'welcome';
export const TOUR_WAIT = 4000;
let FIRST = false,
  SEEN = 0,
  ESCS = 0,
  ESC_AT = 0;
const OPEN_AT = {};
/* time left before Next unlocks on this step (the closing "all set" card has no wait) */
const waitLeft = () =>
  FIRST && TI >= SEEN && STEPS[TI].art != 'done'
    ? Math.max(0, TOUR_WAIT - (performance.now() - (OPEN_AT[TI] || 0)))
    : 0;

/* which tours have played: the welcome one, and each tab's ('*' means all of them, e.g. for tests) */
const SEEN_KEY = 'bb_tours_seen';
function seenTabs() {
  try {
    const v = localStorage.getItem(SEEN_KEY) || '';
    return v == '*' ? '*' : v.split(',').filter(Boolean);
  } catch (e) {
    return [];
  }
}
function markSeen(k) {
  if (k == 'welcome') {
    try {
      localStorage.setItem('bb_tour_seen', '1');
    } catch (e) {}
    return;
  }
  const s = seenTabs();
  if (s == '*' || s.includes(k)) return;
  try {
    localStorage.setItem(SEEN_KEY, s.concat(k).join(','));
  } catch (e) {}
}
const welcomeSeen = () => {
  try {
    return localStorage.getItem('bb_tour_seen') == '1';
  } catch (e) {
    return false;
  }
};
export const tourOpen = () => !!$('#tour.open');

export const tourTest = () => {
  try {
    return localStorage.getItem('bb_tour_test') == '1';
  } catch (e) {
    return false;
  }
};
export function tourToggle(on) {
  try {
    localStorage.setItem('bb_tour_test', on ? '1' : '0');
  } catch (e) {}
  toast(on ? 'The tour will show every time the site opens' : 'The tour will only show once');
  const c = $('#tourTest');
  if (c) c.checked = on;
  render();
}
/** start a tour: first=true when it plays by itself (locked); key = 'welcome' or a tab's view name */
export function startTour(first, key) {
  KEY = typeof key == 'string' && TAB_TOURS[key] ? key : 'welcome';
  STEPS = KEY == 'welcome' ? WELCOME : TAB_TOURS[KEY];
  FIRST = first === true;
  SEEN = 0;
  ESCS = 0;
  for (const k in OPEN_AT) delete OPEN_AT[k];
  if (KEY == 'welcome' && view != 'home' && STEPS.some((s) => s.page == 'home')) go('home');
  /* a tour that plays by itself only ever plays once */
  if (FIRST) markSeen(KEY);
  TI = 0;
  let o = $('#tour');
  if (!o) {
    o = document.createElement('div');
    o.id = 'tour';
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-modal', 'true');
    document.body.appendChild(o);
  }
  o.classList.add('open');
  setTimeout(tourDraw, 60);
}
/** the ? button: this tab's tour if it has one, otherwise the welcome tour */
export function tourHere() {
  startTour(false, TAB_TOURS[view] ? view : 'welcome');
}
const splashUp = () => {
  const sp = $('#splash');
  return !!sp && getComputedStyle(sp).visibility != 'hidden' && getComputedStyle(sp).display != 'none';
};
/** the first visit to a tab: play its tour once (after the welcome tour, and not over a window or notice) */
/* ======== BEFORE GOING LIVE: set TOURS_AUTO to true. ========
   The welcome tour and every tab's first-visit tour are built and tested, but switched off while the
   site is still being designed, so they do not keep popping up. The ? button still plays them.
   (Tests turn them on for themselves with localStorage 'bb_tours_force'.) */
export const TOURS_AUTO = false;
const toursAuto = () => {
  try {
    if (localStorage.getItem('bb_tours_force') == '1') return true;
  } catch (e) {}
  return TOURS_AUTO;
};
export function tabTour(v, tries = 0) {
  if (!toursAuto() || !TAB_TOURS[v] || document.body.classList.contains('gated')) return;
  if (!welcomeSeen() && !tourTest()) return;
  const s = seenTabs();
  if (s == '*' || s.includes(v)) return;
  setTimeout(() => {
    if (view != v) return;
    const busy = tourOpen() || $('#modal.open') || $('#pvn') || $('.aski') || splashUp();
    if (busy) {
      if (tries < 40) tabTour(v, tries + 1);
      return;
    }
    startTour(true, v);
  }, 600);
}
export function endTour() {
  const o = $('#tour');
  if (o) o.classList.remove('open');
  clearTimeout(tourDraw.u);
  if (document.body.dataset.tourMenu) {
    document.body.classList.remove('sopen');
    delete document.body.dataset.tourMenu;
  }
  markSeen(KEY);
}
export function tourGo(d) {
  if (d > 0 && waitLeft() > 0) return;
  if (d > 0) SEEN = Math.max(SEEN, TI + 1);
  TI = Math.max(0, Math.min(STEPS.length - 1, TI + d));
  tourDraw();
}
/* the element a step points at: the first match, or the first whose text starts with `txt` */
function stepEl(s) {
  if (!s.sel) return null;
  if (!s.txt) return $(s.sel);
  return [...$$(s.sel)].find((e) => (e.innerText || '').trim().toLowerCase().startsWith(s.txt.toLowerCase())) || null;
}
export function tourDraw() {
  const o = $('#tour');
  if (!o) return;
  const s = STEPS[TI],
    last = TI == STEPS.length - 1;
  if (FIRST && !OPEN_AT[TI]) OPEN_AT[TI] = performance.now();
  const left = waitLeft();
  const el = stepEl(s);
  const inSide = el && el.closest('.side'),
    narrow = matchMedia('(max-width:900px)').matches;
  /* on a phone the menu is tucked away: slide it open for steps that point at it */
  if (inSide && narrow && !document.body.classList.contains('sopen')) {
    document.body.classList.add('sopen');
    document.body.dataset.tourMenu = '1';
    setTimeout(tourDraw, 320);
    return;
  }
  if (!(inSide && narrow) && document.body.dataset.tourMenu) {
    document.body.classList.remove('sopen');
    delete document.body.dataset.tourMenu;
  }
  /* bring a step lower down the page into view first */
  if (el && el.offsetParent !== null) {
    const b = el.getBoundingClientRect();
    if (b.top < 0 || b.top > innerHeight - 80) el.scrollIntoView({ block: 'center' });
  }
  let rr = el && el.getBoundingClientRect();
  const vis = !!(
    el &&
    el.offsetParent !== null &&
    rr.width > 0 &&
    rr.right > 0 &&
    rr.bottom > 0 &&
    rr.left < innerWidth &&
    rr.top < innerHeight
  );
  /* a big block (a whole table) only lights up the part on screen */
  if (vis) {
    const t = Math.max(rr.top, 8),
      b = Math.min(rr.bottom, innerHeight - 8);
    rr = { left: rr.left, right: rr.right, width: rr.width, top: t, bottom: b, height: b - t };
  }
  const r = vis ? rr : null,
    pad = 8;
  o.innerHTML = `<div class="tspot ${vis ? '' : 'none'}" style="${vis ? `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px` : ''}"></div>
   <div class="tcard ${vis ? '' : 'mid'}">${!vis && s.art && ART_IC[s.art] ? `<div class="tban lkp">${svg(ART_IC[s.art])}</div>` : ''}<small>${TI + 1} of ${STEPS.length}</small><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p>
    <div class="tdots">${STEPS.map((_, i) => `<i class="${i == TI ? 'on' : ''}"></i>`).join('')}</div>
    ${KEY == 'welcome' && (can('manage') || ROLE == 'beta') ? `<label class="ttest"><input type="checkbox" id="tourTest" ${tourTest() ? 'checked' : ''} data-onchange="tourToggle" data-args-change="[{&quot;$&quot;:&quot;checked&quot;}]"> Show every time (testing)</label>` : ''}
    ${left ? `<div class="ttime" aria-hidden="true"><i style="animation-duration:${TOUR_WAIT}ms;animation-delay:-${TOUR_WAIT - left}ms"></i></div>` : ''}
    <div class="tbtn">${FIRST ? '' : `<button class="btn ghost sm" data-act="endTour">${last ? 'Close' : 'Skip Tour'}</button>`}<span></span>${TI ? '<button class="btn ghost sm" data-act="tourGo" data-args="[-1]">Back</button>' : ''}<button class="btn sm" ${left ? 'disabled title="Next unlocks when the bar fills"' : ''} ${last ? 'data-act="endTour"' : 'data-act="tourGo" data-args="[1]"'}>${last ? 'Finish' : 'Next'}</button></div></div>`;
  clearTimeout(tourDraw.u);
  if (left)
    tourDraw.u = setTimeout(() => {
      const n = o.querySelector('.tbtn .btn:last-child');
      if (n) {
        n.disabled = false;
        n.removeAttribute('title');
        n.focus({ preventScroll: true });
      }
      const t = o.querySelector('.ttime');
      if (t) t.classList.add('done');
    }, left);
  const c = o.querySelector('.tcard');
  const sm = innerWidth < 640;
  if (vis && sm) {
    c.classList.add('sheet');
    const below = r.top + r.height / 2 < innerHeight / 2;
    c.style.left = '';
    c.style.top = below ? '' : '12px';
    c.style.bottom = below ? '12px' : '';
  } else if (vis) {
    const cw = c.offsetWidth,
      ch = c.offsetHeight;
    let top = r.bottom + 16,
      left = r.left;
    if (inSide) {
      /* anything in the side menu: the card sits just right of the menu, level with what it points at */
      const side = el.closest('.side').getBoundingClientRect();
      left = side.right + 16;
      top = r.height > innerHeight * 0.5 ? r.top + 40 : r.bottom - ch;
    } else {
      /* line the card up with the page's own edges: things on the right share the page's right edge,
         things on the left share its left edge; below what it points at, or above if there is no room */
      const head = $('#main > *'),
        pg = head ? head.getBoundingClientRect() : { left: r.left, right: r.right };
      const onRight = r.left + r.width / 2 > (pg.left + pg.right) / 2;
      left = onRight ? pg.right - cw : pg.left;
      if (top + ch > innerHeight - 12) top = r.top - ch - 16;
      /* a tall block with no room above or below: beside it if it is narrow, otherwise over its top edge */
      if (top < 12 && r.bottom + 16 + ch > innerHeight - 12) {
        if (r.right + 20 + cw < innerWidth - 12) {
          left = r.right + 20;
          top = r.top;
        } else top = r.top + 16;
      }
    }
    c.style.left = Math.max(12, Math.min(innerWidth - cw - 12, left)) + 'px';
    c.style.top = Math.max(12, Math.min(innerHeight - ch - 12, top)) + 'px';
  }
  const b = o.querySelector('.tbtn .btn:last-child');
  if (b) b.focus({ preventScroll: true });
}
export function tourBoot() {
  const b = document.createElement('button');
  b.className = 'ib';
  b.id = 'helpBtn';
  b.type = 'button';
  b.title = 'Show the tour for this page';
  b.setAttribute('aria-label', 'Show the tour for this page');
  b.innerHTML = svg('M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 100-20 10 10 0 000 20z');
  b.onclick = tourHere;
  const t = $('#thb');
  if (t) t.after(b);
  let seen = false;
  try {
    seen = localStorage.getItem('bb_tour_seen') == '1';
  } catch (e) {}
  if (toursAuto() && (tourTest() || !seen)) setTimeout(() => startTour(true), 2800);
}
/* start-up step (run once by main.js) */
export function listenForTourKeys() {
  document.addEventListener(
    'keydown',
    (e) => {
      const o = $('#tour');
      if (!o || !o.classList.contains('open')) return;
      if (e.key == 'Escape') {
        e.stopPropagation();
        if (!FIRST) return endTour();
        /* a locked tour: Esc three times in a row leaves it */
        const now = performance.now();
        ESCS = now - ESC_AT < 1500 ? ESCS + 1 : 1;
        ESC_AT = now;
        /* hidden way out: Esc three times in a row */
        if (ESCS >= 3) endTour();
      } else if (e.key == 'ArrowRight') tourGo(1);
      else if (e.key == 'ArrowLeft') tourGo(-1);
    },
    true
  );
  /* keep the tour in place when the screen turns or resizes */
  addEventListener('resize', () => {
    const o = $('#tour');
    if (o && o.classList.contains('open')) {
      clearTimeout(tourDraw.t);
      tourDraw.t = setTimeout(tourDraw, 120);
    }
  });
}
