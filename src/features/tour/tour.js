/* features/tour/tour: The welcome tour. */
import { $, esc } from '../../core/dom.js';
import { svg } from '../../core/icons.js';
import { ROLE } from '../../data/session.js';
import { can } from '../../domain/permissions.js';
import { ART_IC } from '../../ui/components/art.js';
import { go, render, view } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';

/* ---------------- welcome tour ----------------
   Steps go in screen order: the side menu top to bottom, then the top bar left to right, then the page. */
export const TOUR = [
  {
    art: 'team',
    t: 'Welcome to Broadland Windows CRM',
    d: 'A quick look round the main parts of the site. It takes about a minute.',
  },
  {
    sel: '#nav',
    t: 'Your menu',
    d: 'Every page you can use is here, grouped by job: sales, operations, stock and insights. What you see depends on your account.',
  },
  { sel: '#meBtn', t: 'Your details', d: 'Update your phone and email, and check your holiday allowance.' },
  {
    sel: '#acct',
    t: 'Switch account',
    d: 'Sign in as an administrator with your PIN when you need more access. It signs you out again after 30 minutes idle.',
  },
  {
    sel: '#sb',
    t: 'Search',
    d: 'Type a name, postcode, item code or contract number to filter the page you are on. Press / on the keyboard to jump here.',
  },
  { sel: '#scanBtn', t: 'Scan a barcode', d: 'Use the camera to find a product or book stock in and out.' },
  {
    sel: '#nwb',
    t: 'Add something new',
    d: 'Start a new lead, service call, contact or stock movement from any page.',
  },
  {
    sel: '#bell',
    t: 'Notifications',
    d: 'Stock requests, low stock, deliveries due and FENSA reminders all land here.',
  },
  {
    sel: '#lookBtn',
    t: 'Change the look',
    d: 'Pick the page background, and a pattern for the blue greeting box on the overview.',
  },
  { sel: '#thb', t: 'Light or dark', d: 'Switch the look to suit the room. The factory screen works well in dark.' },
  {
    sel: '.hero-cz',
    page: 'home',
    t: 'Make the overview yours',
    d: 'Choose which numbers and panels show on your dashboard, and in what order.',
  },
  { art: 'done', t: "You're all set", d: 'Press the ? button at the top any time to see this tour again.' },
];
export let TI = 0;
/* The first-ever tour can't be skipped: Next unlocks once a short timer bar fills, so each step gets read.
   A replay from the ? button keeps Skip and has no wait. Steps already seen open straight away. */
export const TOUR_WAIT = 7000;
let FIRST = false,
  SEEN = 0;
const OPEN_AT = {};
const waitLeft = () =>
  FIRST && TI >= SEEN && TI < TOUR.length - 1 ? Math.max(0, TOUR_WAIT - (performance.now() - (OPEN_AT[TI] || 0))) : 0;
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
export function startTour(first) {
  FIRST = first === true;
  SEEN = 0;
  for (const k in OPEN_AT) delete OPEN_AT[k];
  if (view != 'home' && TOUR.some((s) => s.page == 'home')) go('home');
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
export function endTour() {
  const o = $('#tour');
  if (o) o.classList.remove('open');
  if (document.body.dataset.tourMenu) {
    document.body.classList.remove('sopen');
    delete document.body.dataset.tourMenu;
  }
  try {
    localStorage.setItem('bb_tour_seen', '1');
  } catch (e) {}
}
export function tourGo(d) {
  if (d > 0 && waitLeft() > 0) return;
  if (d > 0) SEEN = Math.max(SEEN, TI + 1);
  TI = Math.max(0, Math.min(TOUR.length - 1, TI + d));
  tourDraw();
}
export function tourDraw() {
  const o = $('#tour');
  if (!o) return;
  const s = TOUR[TI],
    last = TI == TOUR.length - 1;
  if (FIRST && !OPEN_AT[TI]) OPEN_AT[TI] = performance.now();
  const left = waitLeft();
  let el = s.sel && $(s.sel);
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
  const rr = el && el.getBoundingClientRect(),
    vis = !!(
      el &&
      el.offsetParent !== null &&
      rr.width > 0 &&
      rr.right > 0 &&
      rr.bottom > 0 &&
      rr.left < innerWidth &&
      rr.top < innerHeight
    );
  const r = vis ? rr : null,
    pad = 8;
  o.innerHTML = `<div class="tspot ${vis ? '' : 'none'}" style="${vis ? `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px` : ''}"></div>
   <div class="tcard ${vis ? '' : 'mid'}">${!vis && s.art && ART_IC[s.art] ? `<div class="tban lkp">${svg(ART_IC[s.art])}</div>` : ''}<small>${TI + 1} of ${TOUR.length}</small><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p>
    <div class="tdots">${TOUR.map((_, i) => `<i class="${i == TI ? 'on' : ''}"></i>`).join('')}</div>
    ${can('manage') || ROLE == 'beta' ? `<label class="ttest"><input type="checkbox" id="tourTest" ${tourTest() ? 'checked' : ''} data-onchange="tourToggle" data-args-change="[{&quot;$&quot;:&quot;checked&quot;}]"> Show every time (testing)</label>` : ''}
    ${left ? `<div class="ttime" aria-hidden="true"><i style="animation-duration:${TOUR_WAIT}ms;animation-delay:-${TOUR_WAIT - left}ms"></i></div>` : ''}
    <div class="tbtn">${FIRST && !last ? '' : `<button class="btn ghost sm" data-act="endTour">${last ? 'Close' : 'Skip Tour'}</button>`}<span></span>${TI ? '<button class="btn ghost sm" data-act="tourGo" data-args="[-1]">Back</button>' : ''}<button class="btn sm" ${left ? 'disabled title="Next unlocks when the bar fills"' : ''} ${last ? 'data-act="endTour"' : 'data-act="tourGo" data-args="[1]"'}>${last ? 'Finish' : 'Next'}</button></div></div>`;
  clearTimeout(tourDraw.u);
  if (left)
    tourDraw.u = setTimeout(() => {
      const n = o.querySelector('.tbtn .btn:last-child');
      if (n) {
        n.disabled = false;
        n.removeAttribute('title');
        n.focus();
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
    if (top + ch > innerHeight - 12) top = Math.max(12, r.top - ch - 16);
    if (r.width < 260 && r.left > innerWidth / 2) left = r.right - cw;
    if (r.left < 300 && r.height > innerHeight * 0.5) {
      left = r.right + 20;
      top = Math.max(12, Math.min(innerHeight - ch - 12, r.top + 40));
    }
    c.style.left = Math.max(12, Math.min(innerWidth - cw - 12, left)) + 'px';
    c.style.top = Math.max(12, Math.min(innerHeight - ch - 12, top)) + 'px';
  }
  const b = o.querySelector('.tbtn .btn:last-child');
  if (b) b.focus();
}
export function tourBoot() {
  const b = document.createElement('button');
  b.className = 'ib';
  b.id = 'helpBtn';
  b.type = 'button';
  b.title = 'Show the tour';
  b.setAttribute('aria-label', 'Show the tour');
  b.innerHTML = svg('M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 100-20 10 10 0 000 20z');
  b.onclick = () => startTour();
  const t = $('#thb');
  if (t) t.after(b);
  let seen = false;
  try {
    seen = localStorage.getItem('bb_tour_seen') == '1';
  } catch (e) {}
  if (tourTest() || !seen) setTimeout(() => startTour(true), 4200);
}
/* start-up step (run once by main.js) */
export function listenForTourKeys() {
  document.addEventListener('keydown', (e) => {
    const o = $('#tour');
    if (!o || !o.classList.contains('open')) return;
    if (e.key == 'Escape') {
      if (!FIRST) endTour();
    } else if (e.key == 'ArrowRight') tourGo(1);
    else if (e.key == 'ArrowLeft') tourGo(-1);
  });
  addEventListener('resize', () => {
    const o = $('#tour');
    if (o && o.classList.contains('open')) tourDraw();
  });
  /* keep the tour in place when the screen turns or resizes */
  addEventListener('resize', () => {
    const o = $('#tour');
    if (o && o.classList.contains('open')) {
      clearTimeout(tourDraw.t);
      tourDraw.t = setTimeout(tourDraw, 120);
    }
  });
}
