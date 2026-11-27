/* features/app/screen-saver: after a while with no mouse, keyboard or touch, the opening animation plays on a loop
   (the crane draws itself in light, fills in, floats while the glow breathes, fades, and starts again) with a large
   clock and the date. Any movement, key or touch closes it; the touch that wakes it does not click anything beneath.
   When it starts is a setting on this device (Settings, My Settings, Screen Saver: Off, 2, 5 or 10 minutes; 5 to
   start with), kept in localStorage 'bb_saver'. It never shows on a Floor Boards TV display, and with Fewer
   Animations it is still. */
import { $ } from '../../core/dom.js';
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
  const bird = $('#splash .sp-bird');
  el = document.createElement('div');
  el.id = 'saver';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    '<div class="sv-glow"></div><div class="sv-fly">' +
    (bird ? bird.outerHTML.replace(/id="spg"/, 'id="svg-sv"').replace(/url\(#spg\)/, 'url(#svg-sv)') : '') +
    '</div><div class="sv-clock"><b class="sv-time"></b><span class="sv-date"></span></div><p class="sv-hint">Move the mouse or press a key to carry on</p>';
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
