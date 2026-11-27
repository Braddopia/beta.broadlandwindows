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
  /* a Norfolk drainage mill: tapered brick tower, boat-shaped cap, four lattice sails turning about the hub */
  const MILL =
    '<g class="sails"><path d="M68 74V4h4v70zM72 72h66v-4H72zM72 70v70h-4V70zM68 72H2v4h66z"/><path class="lat" d="M72 10h14v56H72zM78 72v14h56V72zM68 80H54v56h14zM62 72v-14H6v14z"/></g><path class="tw" d="M50 220l7-142h26l7 142z"/><path class="cap" d="M52 82c2-16 10-24 18-24s16 8 18 24z"/><path class="fan" d="M70 60l26-14v6z"/><circle class="hub" cx="70" cy="72" r="5"/>';
  el.innerHTML =
    '<div class="sv-sky sv-day"></div><div class="sv-sky sv-dusk"></div><div class="sv-sky sv-night"></div>' +
    '<div class="sv-stars"></div><div class="sv-moon"></div><div class="sv-sun"></div>' +
    [1, 2, 3, 4, 5]
      .map((i) => {
        /* each cloud starts at a random point of its journey, so they are spread across the sky (not all from the right) */
        const dur = 70 + Math.random() * 90,
          top = [1, 7, 13, 19, 25][i - 1] + Math.random() * 4,
          w = 9 + Math.random() * 16;
        return `<svg class="sv-cloud" style="top:${top.toFixed(1)}%;width:${w.toFixed(1)}vw;opacity:${(0.6 + Math.random() * 0.4).toFixed(2)};animation-duration:${dur.toFixed(0)}s,60s;animation-delay:-${(Math.random() * dur).toFixed(0)}s,0s" viewBox="0 -40 320 170">${cloud(i * 17 + Math.floor(Math.random() * 50))}</svg>`;
      })
      .join('') +
    /* the Broads, back to front: a far tree line with a round-tower church and a distant mill, a near tree line, the
       mill, water with its reflection, ripples, the sun's glint and evening mist, a wherry and a yacht, reeds */
    `<svg class="sv-trees far" viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="${treeLine(1, 34)}"/></svg>` +
    /* a Norfolk round-tower church: round flint tower with a battlemented top and slit windows, a long nave with a
       steep roof, a lower chancel at the east end and a south porch */
    '<svg class="sv-church" viewBox="0 0 220 130"><path class="rf" d="M60 70L108 40L156 70Z"/><path class="rf" d="M150 80L176 60L202 80Z"/><path d="M62 70H156V130H62ZM150 80H202V130H150ZM96 98h16l-8-10zM96 98h16v32H96Z"/><path d="M18 130V30a20 4 0 0 1 40 0V130Z"/><path d="M16 30V20h6v5h5v-5h6v5h5v-5h6v5h5v-5h6V30Z"/><path class="win" d="M35 46h6v12h-6zM35 78h6v10h-6zM76 82h8v16h-8zM124 82h8v16h-8zM176 92h8v14h-8z"/></svg>' +
    `<svg class="sv-mill far" viewBox="0 0 140 220">${MILL}</svg>` +
    `<svg class="sv-trees" viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="${treeLine(7, 46)}"/></svg>` +
    `<svg class="sv-mill" viewBox="0 0 140 220">${MILL}</svg>` +
    `<div class="sv-water"><svg class="sv-mill refl" viewBox="0 0 140 220">${MILL}</svg><div class="sv-mist"></div><svg class="sv-shim" viewBox="0 0 1600 320" preserveAspectRatio="none">${ripples(3)}</svg><svg class="sv-shim s2" viewBox="0 0 1600 320" preserveAspectRatio="none">${ripples(11)}</svg><svg class="sv-glint" viewBox="0 0 1600 320" preserveAspectRatio="none">${glint(5)}</svg><div class="sv-fog"></div></div>` +
    '<svg class="sv-boat wherry" viewBox="0 0 120 90"><path class="sail" d="M58 6L60 70H28C34 46 44 22 58 6Z"/><path class="mast" d="M59 2V72"/><path class="hull" d="M6 72H112L102 84H20Z"/></svg>' +
    '<svg class="sv-boat yacht" viewBox="0 0 80 70"><path class="sail" d="M42 4L42 52H14Z"/><path class="sail2" d="M45 12L45 52H64Z"/><path class="hull" d="M8 54H72L64 64H16Z"/></svg>' +
    `<svg class="sv-reeds l" viewBox="0 0 210 200" preserveAspectRatio="xMinYMax meet">${reeds}</svg>` +
    `<svg class="sv-reeds r" viewBox="0 0 210 200" preserveAspectRatio="xMaxYMax meet">${reeds}</svg>` +
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
const seeded = (seed) => {
  let r = seed * 7919 + 104729;
  return () => (r = (r * 9301 + 49297) % 233280) / 233280;
};
/** a puffy cloud in 320 x 130: a shadow underneath, the body of round puffs on a flat base, highlights on top. Its
    colour follows the sky (currentColor, see svCloudCol) */
function cloud(seed) {
  const rnd = seeded(seed),
    puffs = [];
  /* a dome: the biggest puffs in the middle, smaller towards the ends, a second smaller row in front for depth */
  for (let i = 0; i < 9; i++) {
    const t = i / 8,
      dome = Math.sin(Math.PI * (0.08 + t * 0.84)),
      r = 16 + dome * (26 + rnd() * 16),
      x = 34 + t * 252 + (rnd() - 0.5) * 12;
    puffs.push([x, 96 - r * (0.75 + rnd() * 0.2), r]);
  }
  for (let i = 0; i < 5; i++) {
    const x = 70 + i * 45 + (rnd() - 0.5) * 16,
      r = 14 + rnd() * 10;
    puffs.push([x, 96 - r * 0.6, r]);
  }
  const shape = (dy) =>
    puffs
      .map(([px, py, r]) => `<circle cx="${px.toFixed(0)}" cy="${(py + dy).toFixed(0)}" r="${r.toFixed(0)}"/>`)
      .join('') + `<rect x="26" y="${82 + dy}" width="268" height="20" rx="10"/>`;
  return (
    `<g class="shade">${shape(9)}</g>` +
    `<g class="body">${shape(0)}</g>` +
    `<g class="hi">${puffs
      .slice(0, 9)
      .map(
        ([px, py, r]) =>
          `<circle cx="${(px - r * 0.25).toFixed(0)}" cy="${(py - r * 0.35).toFixed(0)}" r="${(r * 0.5).toFixed(0)}"/>`
      )
      .join('')}</g>`
  );
}
/** the setting sun's glint: a column of broken gold strokes under the sun (74% across), narrow at the horizon and
    wider towards the front, in 1600 x 320 */
function glint(seed) {
  const rnd = seeded(seed),
    cx = 1600 * 0.74;
  let out = '',
    y = 3;
  while (y < 320) {
    const hw = 10 + y * 0.45;
    for (let i = 0; i < 3; i++) {
      const w = (0.25 + rnd() * 0.5) * hw,
        x = cx - hw + rnd() * (2 * hw - w);
      out += `<path d="M${x.toFixed(0)} ${y.toFixed(1)}h${w.toFixed(0)}" style="opacity:${(0.4 + rnd() * 0.6).toFixed(2)}"/>`;
    }
    y += 3 + (y / 320) * 9;
  }
  return out;
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
