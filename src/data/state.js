/* data/state: The app data held in memory, loaded at start-up. */
import { KEY } from '../config/constants.js';
import { seed } from './seed.js';
import { toast } from '../ui/toast.js';

/* ---- load ---- */
export let state;
/* swap in a newer copy of the data (another tab saved, or a backup was restored) */
export function replaceState(n) {
  state = n;
}
export function load() {
  /* two copies may exist (browser database and localStorage): use the most recently saved one */
  let raw = typeof window.__BOOT == 'string' ? window.__BOOT : null,
    ls = null;
  try {
    ls = localStorage.getItem(KEY);
  } catch (e) {}
  window.__BOOT = null;
  const at = (j) => {
    const m = /"_saved":(\d+)/.exec(j ? j.slice(-60) : '');
    return m ? +m[1] : 0;
  };
  if (!raw || (ls && at(ls) > at(raw))) raw = ls || raw;
  if (raw) {
    try {
      state = JSON.parse(raw);
    } catch (e) {
      /* never silently throw data away: keep the unreadable copy */
      try {
        localStorage.setItem(KEY + '_unreadable_' + Date.now(), raw);
      } catch (x) {}
      setTimeout(() => toast('Saved data could not be read. A copy was kept and demo data loaded.'), 1800);
    }
  }
  if (!state || typeof state != 'object' || !Array.isArray(state.items)) state = seed();
  window.__BOOT_AT = +state._saved || 0;
}
/* start-up step (run once by main.js) */
export function defineCurrentUser() {
  /* ---- the signed-in person ---- */
  Object.defineProperty(window, 'USER', {
    get: () => (window.SSO && SSO.name) || (state.profile && state.profile.name) || 'Unknown',
  });
}
