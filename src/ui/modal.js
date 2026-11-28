/* ui/modal: Popups: opening and closing, our own confirm box, the "saved" tick, and returning to an open record. */
import { $, esc } from '../core/dom.js';
import { syncIfPending } from '../data/sync.js';
import { setPhotoList, tmp, tmpDraw } from './forms/photos.js';
import { toast } from './toast.js';

/* The lead/contract window plugs in here at start-up (features/records), so a popup opened from it
   can park it and hand back to it. ui/ never imports a page. */
let REC = { get: () => null, set: () => {}, back: () => {} };
export function plugInRecordWindow(h) {
  REC = { ...REC, ...h };
}
/* ---- modal ---- */
/* (v19.18.15) a window opened on top of a lead, contract or supplier window, or a product window, sets that window
   aside exactly as it was, and Close brings it back, one step at a time (a supplier's delivery or stock line, Edit
   Supplier, a product's report). Before, only lead and contract windows came back, one level deep. Other pop-ups, and
   a window drawn again (its own tabs, a product picked in it), replace what is there as they always did. */
const STACK = [];
export let REC_STASH = null; /* kept for older callers: true while a window is set aside */
function setAside(b) {
  const rw = b.querySelector(':scope>.rw'),
    rb = rw && rw.querySelector('.rw-b');
  STACK.push({
    nodes: [...b.childNodes],
    cls: b.className,
    rw: rw ? REC.get() : null,
    sy: rb ? rb.scrollTop : b.scrollTop,
    photos: tmp,
    draw: tmpDraw,
  });
  REC_STASH = true;
  b.replaceChildren();
}
export function openModal(h, size) {
  const b = $('#mbox'),
    isRec = /^\s*<div class="rw[ "]/.test(h),
    open = $('#modal').classList.contains('open') && b.childNodes.length,
    curRec = open && !!b.querySelector(':scope>.rw');
  if (open) {
    /* set aside only a lead, contract or supplier window, or a product window, when a different window opens on top;
       a window drawn again (its own tabs, a product picked in it) replaces itself */
    const curItem = !!b.querySelector(':scope>.ie-h'),
      newItem = /^\s*<div class="ie-h">/.test(h),
      isAsk = /^\s*<div class="ask">/.test(h);
    if (!isRec && (curRec || (curItem && !newItem && !isAsk))) setAside(b);
  }
  b.className = 'mb ' + (size || 'md');
  /* one standard width unless a window needs another */ b.innerHTML = h;
  $('#modal').classList.add('open');
  b.scrollTop = 0;
  if (size != 'full')
    setTimeout(() => {
      const f = b.querySelector('input:not([readonly]):not([type=hidden]):not([type=checkbox]),select,textarea');
      /* never pull the cursor out of a box the person has already clicked into and started typing in */
      const a = document.activeElement;
      if (a && a != f && b.contains(a) && a.matches('input,select,textarea')) return;
      if (f && f.isConnected && matchMedia('(pointer:fine)').matches) f.focus({ preventScroll: true });
    }, 60);
}
/* styled confirmation instead of the browser's own box */
export let ASK = null,
  ASK_NO = null;
export function askYes(title, msg, okLabel, cb, danger, noCb) {
  ASK = cb;
  ASK_NO = noCb || null;
  openModal(
    `<div class="ask"><div class="ask-ic ${danger ? 'r' : ''}">${danger ? '!' : '?'}</div><h2>${esc(title)}</h2><p class="muted">${esc(msg)}</p></div><div class="mact"><button class="btn ghost" data-act="askNo">${noCb ? 'No, go back' : 'Cancel'}</button><button class="btn ${danger ? 'red' : ''}" data-act="askGo">${esc(okLabel || 'Yes')}</button></div>`,
    'sm'
  );
}
/* askIn: our own confirm box, layered above any open window. Esc or Cancel closes it.
   opts.count = seconds: the yes button's background fills up and it says yes for you when the time runs out (paused while the pointer
   is on the box); opts.no = the cancel button's words; opts.icon = markup for the round icon at the top. */
export let ASKI = null;
export function askIn(title, msg, okLabel, cb, danger, opts = {}) {
  if (ASKI) ASKI.remove();
  const o = document.createElement('div');
  o.className = 'aski';
  o.setAttribute('role', 'alertdialog');
  o.setAttribute('aria-modal', 'true');
  o.setAttribute('aria-label', title);
  const N = +opts.count || 0;
  if (N) o.classList.add('cnt');
  o.innerHTML = `<div class="aski-b"><div class="ask-ic ${danger ? 'r' : ''} ${opts.icon ? 'go' : ''}">${opts.icon || (danger ? '!' : '?')}</div><h3>${esc(title)}</h3>${msg ? `<p>${esc(msg)}</p>` : ''}<div class="aski-a"><button type="button" class="btn ghost" data-a="0">${esc(opts.no || 'Cancel')}</button><button type="button" class="btn ${danger ? 'red' : N ? '' : 'green'}" data-a="1">${N ? '<i class="cd-f" aria-hidden="true"></i>' : ''}<span>${esc(okLabel || 'Yes')}</span></button></div>${N ? '<p class="cd-h" aria-live="polite">Point at this box to pause</p>' : ''}</div>`;
  const key = (e) => {
      if (e.key == 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        done(false);
      }
    },
    done = (ok) => {
      clearInterval(tick);
      o.remove();
      document.removeEventListener('keydown', key, true);
      if (ASKI === o) ASKI = null;
      if (ok && cb) cb();
    };
  o.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]');
    if (b) done(b.dataset.a == '1');
    else if (e.target == o) done(false);
  });
  document.addEventListener('keydown', key, true);
  ASKI = o;
  document.body.appendChild(o);
  o.querySelector('[data-a="1"]').focus();
  /* the countdown: the button fills from left to right, the number counts down, and it goes by itself at the end */
  let tick = 0;
  if (N) {
    const box = o.querySelector('.aski-b'),
      fill = o.querySelector('.cd-f'),
      hint = o.querySelector('.cd-h');
    let left = N * 1000,
      paused = false,
      last = performance.now();
    box.addEventListener('pointerenter', () => {
      paused = true;
      o.classList.add('paused');
      hint.textContent = 'Paused';
    });
    box.addEventListener('pointerleave', () => {
      paused = false;
      o.classList.remove('paused');
      hint.textContent = 'Point at this box to pause';
    });
    const step = () => {
      const now = performance.now();
      if (!paused) left -= now - last;
      last = now;
      fill.style.transform = 'scaleX(' + Math.min(1, 1 - left / (N * 1000)).toFixed(3) + ')';
      o.dataset.left = Math.max(0, Math.ceil(left / 1000));
      if (left <= 0) done(true);
    };
    tick = setInterval(step, 50);
    step();
  }
}
/* a save inside a window: the window closes and the banner at the bottom says it worked (same as everywhere) */
export function doneIn(msg) {
  if ($('#modal').classList.contains('open')) closeModal();
  toast(msg || 'Saved');
}
export function askNo() {
  const f = ASK_NO;
  ASK = ASK_NO = null;
  closeModal();
  if (f) f();
}
export function askGo() {
  const f = ASK;
  ASK = null;
  closeModal();
  if (f) f();
}
/* a popup set aside (with whatever was typed in it) while another opens on top, e.g. Report A Problem */
let PARKED = null;
/** set the open popup aside; the next closeModal() puts it back exactly as it was */
export function parkModal() {
  const b = $('#mbox');
  if (!$('#modal').classList.contains('open') || PARKED || b.querySelector(':scope>.rw')) return false;
  PARKED = { nodes: [...b.childNodes], cls: b.className, photos: tmp, draw: tmpDraw };
  b.replaceChildren();
  return true;
}
export function closeModal() {
  if (PARKED && !STACK.length) {
    const p = PARKED,
      b = $('#mbox');
    PARKED = null;
    b.className = p.cls;
    b.replaceChildren(...p.nodes);
    setPhotoList(p.photos, p.draw);
    $('#modal').classList.add('open');
    return;
  }
  if (STACK.length) {
    const s = STACK.pop(),
      b = $('#mbox');
    REC_STASH = STACK.length ? true : null;
    b.className = s.cls;
    b.replaceChildren(...s.nodes);
    setPhotoList(s.photos, s.draw);
    $('#modal').classList.add('open');
    const rb = b.querySelector('.rw-b');
    if (rb) rb.scrollTop = s.sy;
    else b.scrollTop = s.sy;
    if (s.rw) {
      REC.set(s.rw);
      REC.back();
    }
    return;
  }
  $('#modal').classList.remove('open');
  syncIfPending();
  const a = document.activeElement;
  if (a && a !== document.body && !a.closest('#modal')) a.blur();
}
/* start-up step (run once by main.js) */
export function listenForBackdropClicks() {
  $('#modal').addEventListener('mousedown', (e) => {
    if (e.target.id == 'modal') closeModal();
  });
}
/** close every window, including any set aside underneath (used when leaving for another page) */
export function closeAllModals() {
  STACK.length = 0;
  REC_STASH = null;
  PARKED = null;
  closeModal();
}
