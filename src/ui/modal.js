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
export let REC_STASH = null;
export function openModal(h, size) {
  const b = $('#mbox'),
    isRec = /^\s*<div class="rw[ "]/.test(h);
  if (isRec) REC_STASH = null;
  else if (!REC_STASH && $('#modal').classList.contains('open') && REC.get()) {
    const rw = b.querySelector(':scope>.rw');
    if (rw) {
      const rb = rw.querySelector('.rw-b');
      REC_STASH = { node: rw, cls: b.className, rw: REC.get(), sy: rb ? rb.scrollTop : 0 };
      rw.remove();
    }
  }
  b.className = 'mb ' + (size || 'md');
  /* one standard width unless a window needs another */ b.innerHTML = h;
  $('#modal').classList.add('open');
  b.scrollTop = 0;
  if (size != 'full')
    setTimeout(() => {
      const f = b.querySelector('input:not([readonly]):not([type=hidden]):not([type=checkbox]),select,textarea');
      if (f && matchMedia('(pointer:fine)').matches) f.focus({ preventScroll: true });
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
/* askIn: our own confirm box, layered above any open window. Esc or Cancel closes it. */
export let ASKI = null;
export function askIn(title, msg, okLabel, cb, danger) {
  if (ASKI) ASKI.remove();
  const o = document.createElement('div');
  o.className = 'aski';
  o.setAttribute('role', 'alertdialog');
  o.setAttribute('aria-modal', 'true');
  o.setAttribute('aria-label', title);
  o.innerHTML = `<div class="aski-b"><div class="ask-ic ${danger ? 'r' : ''}">${danger ? '!' : '?'}</div><h3>${esc(title)}</h3>${msg ? `<p>${esc(msg)}</p>` : ''}<div class="aski-a"><button type="button" class="btn ghost" data-a="0">Cancel</button><button type="button" class="btn ${danger ? 'red' : 'green'}" data-a="1">${esc(okLabel || 'Yes')}</button></div></div>`;
  const key = (e) => {
      if (e.key == 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        done(false);
      }
    },
    done = (ok) => {
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
  if (PARKED && !REC_STASH) {
    const p = PARKED,
      b = $('#mbox');
    PARKED = null;
    b.className = p.cls;
    b.replaceChildren(...p.nodes);
    setPhotoList(p.photos, p.draw);
    $('#modal').classList.add('open');
    return;
  }
  if (REC_STASH) {
    const s = REC_STASH,
      b = $('#mbox');
    REC_STASH = null;
    b.innerHTML = '';
    b.className = s.cls;
    b.appendChild(s.node);
    REC.set(s.rw);
    $('#modal').classList.add('open');
    const rb = b.querySelector('.rw-b');
    if (rb) rb.scrollTop = s.sy;
    REC.back();
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
