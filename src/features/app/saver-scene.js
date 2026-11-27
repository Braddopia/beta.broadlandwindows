/* features/app/saver-scene: what moves in the screen saver (v19.17.8, rebuilt after the owner found it "cheap": the
   clouds bunched in the middle, the sun only slid down, clouds and boats vanished half way across).
   One loop (requestAnimationFrame) runs while the screen saver shows:
   - a day of about four minutes: dawn, morning, midday, golden hour, sunset, dusk, night, back to dawn. Every colour in
     the scene comes from that moment (sky, sun glow, water, the land and buildings, clouds, stars, the church windows,
     mist), set as CSS variables on #saver and blended smoothly between the keyframes below;
   - the sun rises on the left, arcs over and sets on the right, its glint on the water following underneath; the moon
     does the same at night;
   - clouds at three depths (far ones smaller, lower, slower and fainter) start spread across the sky at random and
     drift with the wind; one that leaves on the right comes back on the left with a new shape, size and height;
   - the two boats sail right across, rest out of sight for a while, and come back from either side, bobbing gently.
   Nothing ever disappears on screen: everything leaves past an edge. It starts at a random time of the morning, so
   each time it opens looks a little different. The computer's reduce-motion setting gets one still daytime picture. */

const CYCLE = 240; // seconds in a day
const HORIZON = 68; // vh, where the water starts

/* the look of the day: [moment, sky top, sky middle, horizon, land, far land, water near the bank, deep water,
   cloud, cloud shade, stars, lit windows, mist] */
const KEYS = [
  [0.0, '#35558f', '#b9879d', '#f3c69c', '#1b2541', '#4b5b86', '#e3b49e', '#26386a', '#ffdacb', '#8a6f8f', 0.15, 0.5, 0.55],
  [0.08, '#1d5cb6', '#5a9be2', '#cfe4fa', '#0b2d57', '#3e6ba6', '#a7cdf1', '#123f7b', '#ffffff', '#8aa3c6', 0, 0, 0.18],
  [0.28, '#0a4dac', '#3a89df', '#acd5f8', '#0b2d57', '#3f6fab', '#9cc7ef', '#0f3a74', '#ffffff', '#8ea8cc', 0, 0, 0.1],
  [0.41, '#28509c', '#d39b74', '#ffd590', '#2a2643', '#776a8c', '#f2bd8c', '#2a305c', '#ffe3c6', '#a98a8e', 0, 0, 0.15],
  [0.5, '#232f6c', '#c2556a', '#ff9b55', '#1d1631', '#5b4a72', '#ea8c60', '#211840', '#f5aa8f', '#7a5578', 0.05, 0.3, 0.3],
  [0.58, '#0d1a45', '#3b3b79', '#a3668a', '#0b0f25', '#2b3159', '#5c4b7b', '#0b1030', '#6b6b9b', '#3a3a64', 0.55, 1, 0.6],
  [0.7, '#020a20', '#061a42', '#133563', '#040b19', '#0e2141', '#12294f', '#030915', '#3b4b6f', '#1e2944', 1, 1, 0.7],
  [0.9, '#030c26', '#0a1f4d', '#1d3c6e', '#050d1c', '#132648', '#163056', '#040b18', '#46567a', '#222e4a', 0.9, 1, 0.65],
  [1.0, '#35558f', '#b9879d', '#f3c69c', '#1b2541', '#4b5b86', '#e3b49e', '#26386a', '#ffdacb', '#8a6f8f', 0.15, 0.5, 0.55],
];
const VARS = ['--sky1', '--sky2', '--sky3', '--land', '--far', '--w1', '--w2', '--cloud', '--cshade'];
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, t) =>
  'rgb(' +
  hexRgb(a)
    .map((v, i) => Math.round(v + (hexRgb(b)[i] - v) * t))
    .join(',') +
  ')';
const ease = (t) => t * t * (3 - 2 * t);
/** the scene's colours and lights at moment p of the day (0 to 1) */
export function lookAt(p) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= p) i++;
  const a = KEYS[i],
    b = KEYS[i + 1],
    t = ease(Math.min(1, Math.max(0, (p - a[0]) / (b[0] - a[0] || 1))));
  const out = {};
  VARS.forEach((v, k) => (out[v] = mixHex(a[k + 1], b[k + 1], t)));
  out.stars = a[10] + (b[10] - a[10]) * t;
  out.lights = a[11] + (b[11] - a[11]) * t;
  out.fog = a[12] + (b[12] - a[12]) * t;
  return out;
}
/** where a body on an arc is at progress t (0 rising on the left, 1 setting on the right): [left vw, top vh] */
const arc = (t, height) => [4 + t * 92, HORIZON - Math.sin(Math.PI * t) * height];

let raf = 0,
  root = null,
  t0 = 0,
  p0 = 0,
  last = 0,
  clouds = [],
  boats = [],
  cloudSvg = null;
const R = (a, b) => a + Math.random() * (b - a);

/** a fresh cloud: depth 0 (far) to 1 (near) sets its size, height, speed and how solid it looks */
function newCloud(c, x) {
  const d = Math.random();
  c.d = d;
  c.w = 7 + d * 17; // vw wide
  c.y = 31 - d * 26 + R(-3, 3); // vh from the top: far ones low near the horizon, near ones high
  c.v = 0.18 + d * 0.55; // vw a second
  c.x = x;
  c.el.style.width = c.w.toFixed(1) + 'vw';
  c.el.style.top = c.y.toFixed(1) + 'vh';
  c.el.style.opacity = (0.5 + d * 0.5).toFixed(2);
  c.el.style.zIndex = String(Math.round(d * 3));
  c.el.innerHTML = cloudSvg(Math.floor(Math.random() * 1e4));
}
/** a boat sets off from one side or the other */
function sail(b) {
  b.dir = Math.random() < 0.5 ? 1 : -1;
  b.x = b.dir > 0 ? -b.w - 2 : 102;
  b.v = R(b.vmin, b.vmax);
  b.wait = 0;
}
function frame() {
  raf = requestAnimationFrame(frame);
  step();
}
/* a back-up beat: if the browser stops giving animation frames while the scene shows (some test clocks replace
   them), it keeps moving at about 20 frames a second */
let beat = 0;
function step() {
  /* the running clock (not the frame's timestamp, which a frozen test clock also freezes) */
  const now = performance.now();
  const dt = Math.min(0.1, (now - (last || now)) / 1000);
  last = now;
  const sec = (now - t0) / 1000,
    p = (p0 + sec / CYCLE) % 1;
  paint(p, sec);
  for (const c of clouds) {
    c.x += c.v * dt;
    if (c.x > 104) newCloud(c, -c.w - R(2, 18));
    c.el.style.transform = `translate3d(${c.x.toFixed(2)}vw,0,0)`;
  }
  for (const b of boats) {
    if (b.wait > 0) {
      b.wait -= dt;
      if (b.wait <= 0) sail(b);
      continue;
    }
    b.x += b.v * b.dir * dt;
    if (b.x > 104 || b.x < -b.w - 4) {
      /* out of sight past an edge: rest a while, then come back */
      b.wait = R(12, 40);
      b.el.style.transform = 'translate3d(-60vw,0,0)';
      continue;
    }
    const bob = Math.sin(sec * 1.4 + b.ph) * 0.22,
      tilt = Math.sin(sec * 1.1 + b.ph) * 0.8;
    b.el.style.transform = `translate3d(${b.x.toFixed(2)}vw,${bob.toFixed(2)}vh,0) rotate(${tilt.toFixed(2)}deg) scaleX(${b.dir == b.face ? 1 : -1})`;
  }
}
/** colours, sun, moon and glint for moment p */
function paint(p) {
  const L = lookAt(p),
    s = root.style;
  for (const k of VARS) s.setProperty(k, L[k]);
  s.setProperty('--stars', L.stars.toFixed(3));
  s.setProperty('--lights', L.lights.toFixed(3));
  s.setProperty('--fog', L.fog.toFixed(3));
  /* the sun: up from just before p = 0, down just after 0.5 */
  const ts = (p + 0.03) / 0.56,
    tm = (p - 0.56) / 0.4;
  const sun = root.querySelector('.sv-sun'),
    moon = root.querySelector('.sv-moon'),
    glint = root.querySelector('.sv-glint');
  let gx = -100,
    gop = 0,
    gcol = '#ffd98a';
  if (ts > 0 && ts < 1) {
    const [x, y] = arc(ts, 54),
      low = Math.max(0, 1 - (HORIZON - y) / 30); // 1 at the horizon, 0 high up
    sun.style.transform = `translate3d(${x.toFixed(2)}vw,${y.toFixed(2)}vh,0)`;
    sun.style.setProperty('--low', low.toFixed(3));
    s.setProperty('--sx', x.toFixed(1) + '%');
    s.setProperty('--sy', y.toFixed(1) + '%');
    s.setProperty('--halo', (0.25 + low * 0.55).toFixed(3));
    gx = x;
    gop = 0.25 + low * 0.75;
  } else {
    sun.style.transform = 'translate3d(-50vw,0,0)';
    s.setProperty('--halo', '0');
  }
  if (tm > 0 && tm < 1) {
    const [x, y] = arc(tm, 46);
    moon.style.transform = `translate3d(${x.toFixed(2)}vw,${y.toFixed(2)}vh,0)`;
    moon.style.opacity = Math.min(1, Math.sin(Math.PI * tm) * 3).toFixed(3);
    if (gop == 0) {
      gx = x;
      gop = 0.35 * Math.min(1, Math.sin(Math.PI * tm) * 3);
      gcol = '#dfe8ff';
    }
  } else moon.style.opacity = '0';
  /* the glint column sits under whichever light is up */
  glint.style.transform = `translate3d(${(gx - 50).toFixed(2)}vw,0,0)`;
  glint.style.opacity = gop.toFixed(3);
  s.setProperty('--glintc', gcol);
}

/** start the scene in the #saver element; make draws one cloud's SVG markup */
export function sceneStart(el, make) {
  sceneStop();
  root = el;
  cloudSvg = make;
  /* a random moment between early and late morning */
  p0 = R(0.06, 0.3);
  t0 = performance.now();
  last = 0;
  clouds = [...el.querySelectorAll('.sv-cloud')].map((c) => ({ el: c }));
  /* spread across the sky from the start, at random */
  clouds.forEach((c, i) => newCloud(c, -20 + ((i + Math.random()) / clouds.length) * 120));
  boats = [...el.querySelectorAll('.sv-boat')].map((b, i) => ({
    el: b,
    face: b.classList.contains('wherry') ? -1 : 1, // the way each is drawn heading
    w: b.classList.contains('wherry') ? 11 : 6,
    vmin: b.classList.contains('wherry') ? 0.6 : 0.9,
    vmax: b.classList.contains('wherry') ? 0.9 : 1.4,
    ph: i * 2.1,
    x: -60,
    wait: 0,
  }));
  /* the first boat is already on its way somewhere on the water; the other follows later */
  if (boats[0]) {
    sail(boats[0]);
    boats[0].x = R(10, 70);
  }
  if (boats[1]) boats[1].wait = R(6, 25);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    paint(0.2);
    clouds.forEach((c) => (c.el.style.transform = `translate3d(${c.x.toFixed(2)}vw,0,0)`));
    if (boats[0]) boats[0].el.style.transform = `translate3d(${boats[0].x.toFixed(2)}vw,0,0)`;
    return;
  }
  raf = requestAnimationFrame(frame);
  beat = setInterval(() => {
    if (!document.hidden && performance.now() - last > 200) step();
  }, 50);
}
export function sceneStop() {
  cancelAnimationFrame(raf);
  clearInterval(beat);
  raf = 0;
}
/** for checking the scene: jump to moment p of the day (0 to 1) */
export function sceneAt(p) {
  p0 = ((p % 1) + 1) % 1;
  t0 = performance.now();
  if (root) paint(p0);
}
