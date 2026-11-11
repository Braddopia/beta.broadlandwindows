/* features/auth/pins: Account PINs: checking, locking after wrong tries and changing them. */
import { PIN_LOCK_S, PIN_TRIES, ROLES } from '../../config/roles.js';
import { onClick } from '../../core/actions.js';
import { randomSalt, sha256, stretch } from '../../core/crypto.js';
import { $, esc } from '../../core/dom.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { can } from '../../domain/permissions.js';
import { need, setRole } from './session.js';
import { form } from '../../ui/forms/form.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

/* How a PIN is kept: never the PIN itself. Each PIN has its own random salt and is hashed PIN_ROUNDS times
   over (v: 2), so a copy of the data cannot be searched for the PIN quickly. PINs saved the older way
   (one salted hash) still work, and are re-saved the stronger way the next time they are used. */
export const PIN_ROUNDS = 12000;
/** the record to store for a PIN */
export function pinMake(role, pin, def) {
  const s = randomSalt();
  /* the default PIN is public knowledge, so there is nothing to protect by working hard on it */
  const n = def ? 500 : PIN_ROUNDS;
  return { v: 2, s, n, h: stretch(role + ':' + pin, s, n), def: def ? 1 : 0 };
}
const legacyHash = (role, pin) => sha256(state.sec.salt + ':' + role + ':' + pin);
/** is this the PIN for the role? */
export function pinOk(role, pin) {
  const p = state.sec.pins[role];
  if (!p || typeof pin != 'string' || !pin) return false;
  if (p.v == 2) return stretch(role + ':' + pin, p.s, p.n || PIN_ROUNDS) === p.h;
  if (legacyHash(role, pin) !== p.h) return false;
  state.sec.pins[role] = pinMake(role, pin, p.def);
  return true;
}
export function pinKey(el) {
  if (event.key == 'Enter') chkPin(el.dataset.r);
}
export function pinState() {
  try {
    /* kept in the browser, not the tab: closing the tab does not hand out fresh tries */
    return JSON.parse(localStorage.getItem('bb_pin')) || { n: 0, until: 0, locks: 0 };
  } catch (e) {
    return { n: 0, until: 0, locks: 0 };
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
  if (pinOk(k, v)) {
    try {
      localStorage.removeItem('bb_pin');
    } catch (e) {}
    closeModal();
    setRole(k);
    audit('Signed in', ROLES[k].n, '');
    store();
    if (state.sec.pins[k].def && can('manage'))
      setTimeout(() => toast('This account still uses the default PIN. Change it in Admin console.'), 800);
    return;
  }
  st.n++;
  if (st.n >= PIN_TRIES) {
    /* each lock-out in a row lasts twice as long as the one before (up to 15 minutes) */
    st.locks = (st.locks || 0) + 1;
    st.until = Date.now() + Math.min(900, PIN_LOCK_S * 2 ** (st.locks - 1)) * 1000;
    st.n = 0;
    audit('PIN locked', ROLES[k].n, PIN_TRIES + ' wrong attempts');
    store();
  }
  try {
    localStorage.setItem('bb_pin', JSON.stringify(st));
  } catch (e) {}
  $('#pin').value = '';
  $('#pinMsg').textContent =
    st.until > Date.now()
      ? 'Locked for ' + Math.ceil((st.until - Date.now()) / 1000) + ' seconds.'
      : 'Wrong PIN, ' + (PIN_TRIES - st.n) + ' tries left.';
}
/* ---- PIN management (owner accounts) ---- */
export function chPin() {
  if (!need('manage', 'Changing PINs')) return;
  openModal(
    `<h2>Account PINs</h2><p class="muted">PINs are never stored as typed: each is scrambled thousands of times with its own random salt. Use 4 to 12 digits; longer is safer.</p>${Object.entries(
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
  if (!need('manage', 'Changing PINs')) return;
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
      state.sec.pins[k] = pinMake(k, o.a, 0);
      audit('PIN changed', ROLES[k].n, '');
      setTimeout(chPin, 50);
    }
  );
}
