/* features/auth/session: The current account type, switching account and the idle sign-out. */
import { IDLE_MIN, ROLES } from '../../config/roles.js';
import { ROLE, setRoleValue } from '../../data/session.js';
import { can, canSee } from '../../domain/permissions.js';
import { onClick, onEvent } from '../../core/actions.js';
import { $, esc } from '../../core/dom.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { render, setView, view } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';

export const HOME = () => (canSee('home') ? 'home' : 'live');
/* guard for privileged actions: checked again inside the action, not just by hiding buttons */
export function need(permission, what) {
  if (can(permission)) return true;
  toast((what || 'That') + ' needs an administrator account');
  return false;
}
/* ---- switching account ---- */
export let pendView = null;
export function setPendView(v) {
  pendView = v;
}
export function swRole() {
  openModal(
    `<h2>Switch Account</h2><div class="rl">${Object.entries(ROLES)
      .map(
        ([k, r]) =>
          `<button class="rb ${k == ROLE ? 'on' : ''}" ${onClick('pickRole', k)}><b>${esc(r.n)}</b><span>${esc(r.d)}</span></button>`
      )
      .join(
        ''
      )}</div><div class="mact">${window.SSO ? `<button class="btn ghost l" style="color:var(--red)" data-act="ssoOut">Sign out ${esc(SSO.email || USER)}</button>` : ''}<button class="btn ghost" data-act="closeModal">Cancel</button></div>`
  );
}
export function pickRole(k) {
  if (!ROLES[k]) return;
  if (k == 'staff' || k == ROLE) {
    closeModal();
    setRole(k);
    return;
  }
  openModal(
    `<h2>${esc(ROLES[k].n)} PIN</h2><div class="mf"><input id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="12" ${onEvent('onkeydown', 'pinKey', 'this')} data-r="${esc(k)}"><button class="btn" ${onClick('chkPin', k)}>Sign in</button></div><p class="muted" id="pinMsg" style="margin:0"></p><div class="mact"><button class="btn ghost" data-act="swRole">Back</button></div>`,
    'sm'
  );
  setTimeout(() => {
    const e = $('#pin');
    e && e.focus();
  }, 50);
}
export function setRole(r) {
  setRoleValue(r);
  try {
    sessionStorage.setItem('bb_role', r);
    sessionStorage.setItem('bb_role_at', Date.now());
  } catch (e) {}
  if (pendView && canSee(pendView) && (pendView != 'admin' || can('manage'))) setView(pendView);
  pendView = null;
  if (!canSee(view) || (view == 'admin' && !can('manage'))) setView(HOME());
  render();
  toast('Signed in as ' + ROLES[r].n);
}
/* ---- idle timeout: privileged accounts drop back to Standard user ---- */
export let lastAct = Date.now();
/* start-up step (run once by main.js) */
export function restoreRole() {
  try {
    const r = sessionStorage.getItem('bb_role'),
      at = +sessionStorage.getItem('bb_role_at') || 0;
    if (ROLES[r] && (r == 'staff' || Date.now() - at < IDLE_MIN * 6e4)) setRoleValue(r);
  } catch (e) {}
}
/* start-up step (run once by main.js) */
export function watchForIdle() {
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) =>
    addEventListener(
      t,
      () => {
        lastAct = Date.now();
        if (ROLE != 'staff') {
          try {
            sessionStorage.setItem('bb_role_at', Date.now());
          } catch (e) {}
        }
      },
      { passive: true }
    )
  );
  setInterval(() => {
    if (
      !window.SSO &&
      ROLE != 'staff' &&
      !document.body.classList.contains('tv') &&
      Date.now() - lastAct > IDLE_MIN * 6e4
    ) {
      const was = ROLES[ROLE].n;
      closeModal();
      setRole('staff');
      toast('Signed out of ' + was + ' after ' + IDLE_MIN + ' minutes idle');
    }
  }, 30000);
}
