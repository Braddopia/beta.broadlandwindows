/* features/auth/pins: Account PINs: checking, locking after wrong tries and changing them. */
import { PIN_LOCK_S, PIN_TRIES, ROLES } from '../../config/roles.js';
import { onClick } from '../../core/actions.js';
import { sha256 } from '../../core/crypto.js';
import { $, esc } from '../../core/dom.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { ISOWN, need, setRole } from './session.js';
import { form } from '../../ui/forms/form.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

export function pinHash(role, pin) {
  return sha256(state.sec.salt + ':' + role + ':' + pin);
}
export function pinKey(el) {
  if (event.key == 'Enter') chkPin(el.dataset.r);
}
export function pinState() {
  try {
    return JSON.parse(sessionStorage.getItem('bb_pin')) || { n: 0, until: 0 };
  } catch (e) {
    return { n: 0, until: 0 };
  }
}
export function chkPin(k) {
  const st = pinState(),
    wait = Math.ceil((st.until - Date.now()) / 1000);
  if (wait > 0) {
    $('#pinMsg').textContent = 'Too many wrong PINs. Try again in ' + wait + ' seconds.';
    return;
  }
  const v = $('#pin').value;
  if (state.sec.pins[k] && pinHash(k, v) === state.sec.pins[k].h) {
    try {
      sessionStorage.removeItem('bb_pin');
    } catch (e) {}
    closeModal();
    setRole(k);
    audit('Signed in', ROLES[k].n, '');
    store();
    if (state.sec.pins[k].def && ISOWN())
      setTimeout(() => toast('This account still uses the default PIN. Change it in Admin console.'), 800);
    return;
  }
  st.n++;
  if (st.n >= PIN_TRIES) {
    st.until = Date.now() + PIN_LOCK_S * 1000;
    st.n = 0;
    audit('PIN locked', ROLES[k].n, PIN_TRIES + ' wrong attempts');
    store();
  }
  try {
    sessionStorage.setItem('bb_pin', JSON.stringify(st));
  } catch (e) {}
  $('#pin').value = '';
  $('#pinMsg').textContent =
    st.until > Date.now()
      ? 'Locked for ' + PIN_LOCK_S + ' seconds.'
      : 'Wrong PIN, ' + (PIN_TRIES - st.n) + ' tries left.';
}
/* ---- PIN management (owner accounts) ---- */
export function chPin() {
  if (!need(ISOWN, 'Changing PINs')) return;
  openModal(
    `<h2>Account PINs</h2><p class="muted">PINs are stored as salted SHA-256 hashes. Use 4 to 12 digits.</p>${Object.entries(
      ROLES
    )
      .filter(([k]) => k != 'staff')
      .map(
        ([k, r]) =>
          `<div class="row"><span><b>${esc(r.n)}</b><br><span class="muted">${state.sec.pins[k].def ? '<span class="tag y">Default PIN</span>' : 'Custom PIN set'}</span></span><button class="mini pri" ${onClick('setPin', k)}>Change</button></div>`
      )
      .join('')}<div class="mact"><button class="btn" data-act="closeModal">Done</button></div>`
  );
}
export function setPin(k) {
  if (!need(ISOWN, 'Changing PINs')) return;
  form(
    'New PIN: ' + ROLES[k].n,
    [
      { k: 'a', l: 'New PIN', t: 'password', req: 1, max: 12 },
      { k: 'b', l: 'Repeat new PIN', t: 'password', req: 1, max: 12 },
    ],
    {},
    (o) => {
      if (!/^\d{4,12}$/.test(o.a)) {
        toast('Use 4 to 12 digits');
        return false;
      }
      if (o.a !== o.b) {
        toast('The PINs do not match');
        return false;
      }
      if (o.a == '1234' || /^(\d)\1+$/.test(o.a)) {
        toast('Pick a PIN that is harder to guess');
        return false;
      }
      state.sec.pins[k] = { h: pinHash(k, o.a), def: 0 };
      audit('PIN changed', ROLES[k].n, '');
      setTimeout(chPin, 50);
    }
  );
}
