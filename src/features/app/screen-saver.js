/* features/app/screen-saver: after a while with no mouse, keyboard or touch, the opening animation plays on a loop
   (the crane draws itself in light, fills in, floats while the glow breathes, fades, and starts again) with a large
   clock and the date. Any movement, key or touch closes it; the touch that wakes it does not click anything beneath.
   When it starts is a setting on this device (Settings, My Settings, Screen Saver: Off, 2, 5 or 10 minutes; 5 to
   start with), kept in localStorage 'bb_saver'. It never shows on a Floor Boards TV display, and with Fewer
   Animations it is still. */
import { emit } from '../../core/events.js';

const KEY = 'bb_saver';
export const SAVER_CHOICES = [
  ['0', 'Off'],
  ['2', '2 min'],
  ['5', '5 min'],
  ['10', '10 min'],
];
/** minutes before the screen saver starts on this device (0 = off) */
export function saverMinutes() {
  let v = null;
  try {
    v = localStorage.getItem(KEY);
  } catch (e) {}
  const n = parseFloat(v == null ? '5' : v);
  return isFinite(n) && n >= 0 ? n : 5;
}
export function saverSet(v) {
  try {
    localStorage.setItem(KEY, String(v));
  } catch (e) {}
  idle = 0;
  emit('data-replaced');
}

let idle = 0,
  el = null,
  clockT = 0;
const on = () => !!el && el.classList.contains('on');
/* the Floor Boards TV display and the sign-in screen stay as they are */
const blocked = () => document.body.classList.contains('tv') || document.body.classList.contains('signin');

function build() {
  if (el) return el;
  /* a crane in side view facing left, drawn in parts so its wings can beat: the far wing behind the body, the body
     (beak, head, long neck, body, tail, trailing legs), the near wing in front. Each wing turns about the shoulder. */
  const WING = 'M150 97C163 62 190 30 246 6C240 28 231 47 224 60C233 58 240 62 245 69C232 76 219 85 206 97Z';
  const crane = (cls) =>
    `<div class="${cls}"><div class="sv-bob"><svg class="sv-crane" viewBox="0 0 400 200" focusable="false">` +
    `<path class="sv-wing far" d="${WING}"/>` +
    '<path class="sv-legs" d="M236 108L392 121M238 112L388 128"/>' +
    '<path class="sv-body" d="M6 93L36 88C40 85 47 85 51 88C62 95 84 96 110 95C128 94 140 88 162 86C196 83 232 90 258 97L282 104L258 110C226 116 190 116 160 112C140 109 124 102 108 101C84 101 62 101 49 97C46 99 41 99 38 96Z"/>' +
    '<circle class="sv-crown" cx="43" cy="88" r="3"/>' +
    `<path class="sv-wing near" d="${WING}"/>` +
    '</svg></div></div>';
  el = document.createElement('div');
  el.id = 'saver';
  el.setAttribute('aria-hidden', 'true');
  const reeds = Array.from({ length: 22 }, (_, i) => {
    const x = 6 + i * 9 + (i % 3) * 2,
      h = 70 + ((i * 37) % 50),
      tx = x + (i % 2 ? 7 : -5),
      head = i % 3 == 0 ? `<ellipse class="hd" cx="${tx}" cy="${200 - h + 6}" rx="2.6" ry="8"/>` : '';
    return `<g><path d="M${x} 200Q${x + 4} ${200 - h / 2} ${tx} ${200 - h}"/>${head}</g>`;
  }).join('');
  el.innerHTML =
    '<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="sv-wg" x1="0" y1="1" x2=".4" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#dbe9fb"/><stop offset=".8" stop-color="#4a5a78"/><stop offset="1" stop-color="#1c2436"/></linearGradient><linearGradient id="sv-bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9dcf3"/></linearGradient></defs></svg>' +
    '<div class="sv-sky sv-day"></div><div class="sv-sky sv-dusk"></div><div class="sv-sky sv-night"></div>' +
    '<div class="sv-stars"></div><div class="sv-moon"></div><div class="sv-sun"></div>' +
    '<div class="sv-cloud c1"></div><div class="sv-cloud c2"></div><div class="sv-cloud c3"></div><div class="sv-cloud c4"></div>' +
    /* the Broads: a tree line on the horizon, a drainage mill with turning sails, water, a sailing boat, reeds */
    `<svg class="sv-trees far" viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="${treeLine(1, 34)}"/></svg>` +
    `<svg class="sv-trees" viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="${treeLine(7, 46)}"/></svg>` +
    '<svg class="sv-mill" viewBox="0 0 140 220"><g class="sails"><path d="M68 74V4h4v70zM72 72h66v-4H72zM72 70v70h-4V70zM68 72H2v4h66z"/><path class="lat" d="M72 10h14v56H72zM78 72v14h56V72zM68 80H54v56h14zM62 72v-14H6v14z"/></g><path class="tw" d="M50 220l7-142h26l7 142z"/><path class="cap" d="M52 82c2-16 10-24 18-24s16 8 18 24z"/><circle class="hub" cx="70" cy="72" r="5"/></svg>' +
    `<div class="sv-water"><div class="sv-mist"></div><svg class="sv-shim" viewBox="0 0 1600 320" preserveAspectRatio="none">${ripples(3)}</svg><svg class="sv-shim s2" viewBox="0 0 1600 320" preserveAspectRatio="none">${ripples(11)}</svg><div class="sv-glint"></div></div>` +
    '<svg class="sv-boat" viewBox="0 0 80 70"><path class="sail" d="M42 4L42 52H14Z"/><path class="sail2" d="M45 12L45 52H64Z"/><path class="hull" d="M8 54H72L64 64H16Z"/></svg>' +
    `<svg class="sv-reeds l" viewBox="0 0 210 200" preserveAspectRatio="xMinYMax meet">${reeds}</svg>` +
    `<svg class="sv-reeds r" viewBox="0 0 210 200" preserveAspectRatio="xMaxYMax meet">${reeds}</svg>` +
    crane('sv-lead') +
    '<div class="sv-flock">' +
    crane('f1') +
    crane('f2') +
    crane('f3') +
    '</div>' +
    '<div class="sv-clock"><b class="sv-time"></b><span class="sv-date"></span></div>';
  document.body.appendChild(el);
  return el;
}
function tickClock() {
  if (!el) return;
  const d = new Date();
  el.querySelector('.sv-time').textContent = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  el.querySelector('.sv-date').textContent = d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
/** scattered short ripple strokes across 1600 x 320: close together and short near the horizon, longer and further
    apart towards the front (seeded) */
function ripples(seed) {
  let r = seed * 7919 + 104729;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  let out = '',
    y = 6;
  while (y < 320) {
    const k = y / 320,
      n = 4 + Math.round(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const x = rnd() * 1600,
        w = 14 + k * 80 + rnd() * 40 * (0.4 + k);
      out += `<path d="M${x.toFixed(0)} ${y.toFixed(1)}h${w.toFixed(0)}" style="opacity:${(0.25 + rnd() * 0.6).toFixed(2)}"/>`;
    }
    y += 5 + k * 22 + rnd() * 6;
  }
  return out;
}
/** a line of rounded tree tops across 1440 x 120 (seeded, so it is the same every time) */
function treeLine(seed, base) {
  let r = seed * 9301 + 49297,
    x = 0,
    d = 'M0 120V' + base;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  while (x < 1440) {
    /* mostly low copses, now and then a taller tree */
    const tall = rnd() < 0.12,
      w = tall ? 24 + rnd() * 16 : 30 + rnd() * 60,
      h = base - 4 - (tall ? 26 + rnd() * 18 : rnd() * 16);
    d += `Q${(x + w / 2).toFixed(1)} ${(h - 14).toFixed(1)} ${(x + w).toFixed(1)} ${(base - rnd() * 8).toFixed(1)}`;
    x += w;
  }
  return d + 'V120Z';
}
/** show the screen saver now (also the Preview button in Settings) */
export function saverShow() {
  if (blocked()) return;
  build();
  tickClock();
  clearInterval(clockT);
  clockT = setInterval(tickClock, 1000);
  el.classList.add('on');
  idle = 0;
}
function hide() {
  if (!on()) return;
  el.classList.remove('on');
  clearInterval(clockT);
  idle = 0;
}

/* start-up step (run once by main.js) */
export function startScreenSaver() {
  let shownAt = 0;
  const activity = (e) => {
    if (on()) {
      /* ignore the tiny movements and the click that opened a preview in its first moment */
      if (performance.now() - shownAt < 600) return;
      hide();
      /* the touch or click that wakes it does nothing else */
      if (e.type == 'pointerdown' || e.type == 'mousedown' || e.type == 'touchstart' || e.type == 'keydown') {
        e.preventDefault();
        e.stopPropagation();
        swallow = true;
      }
      return;
    }
    idle = 0;
  };
  let swallow = false;
  const eat = (e) => {
    if (!swallow) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type == 'click') swallow = false;
  };
  ['mousemove', 'pointerdown', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach((t) =>
    addEventListener(t, activity, { capture: true, passive: false })
  );
  ['mouseup', 'pointerup', 'click'].forEach((t) => addEventListener(t, eat, true));
  /* counted in seconds of no activity (not the clock, which can jump when a laptop sleeps) */
  setInterval(() => {
    if (document.visibilityState != 'visible') return;
    idle += 1;
    const m = saverMinutes();
    if (m > 0 && !on() && idle >= m * 60 && !blocked()) {
      saverShow();
      shownAt = performance.now();
    }
  }, 1000);
  /* the Preview button: note when it opened, so the click that opened it does not close it */
  const show = saverShow;
  saverPreview = () => {
    show();
    shownAt = performance.now();
  };
}
let saverPreview = () => saverShow();
/** Settings, Screen Saver, Preview */
export function saverTry() {
  saverPreview();
}
