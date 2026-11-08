/* data/sync: keeping this tab in step when another tab (later: another person) saves.
   A newer copy is never swapped in while a popup is open; it waits until the popup closes. */
import { emit } from '../core/events.js';
import { source } from './sources/data-source.js';
import { replaceState } from './state.js';

let pending = false,
  busy = () => false;

/** the screen tells us how to know the person is in the middle of something (a popup is open) */
export function setBusyCheck(fn) {
  busy = fn;
}

const apply = (json) => {
  try {
    const n = JSON.parse(json);
    if (!n || !Array.isArray(n.items)) return;
    replaceState(n);
    emit('data-replaced');
  } catch (x) {}
};

/** read the saved copy again and show it (or wait if a popup is open) */
export function syncPull() {
  source.readAll().then((json) => {
    try {
      const n = JSON.parse(json);
      if (!n || !Array.isArray(n.items)) return;
      if (busy()) {
        pending = true;
        return;
      }
      pending = false;
      replaceState(n);
      emit('data-replaced');
    } catch (x) {}
  });
}

/** called when a popup closes: catch up with any save we held back */
export function syncIfPending() {
  if (pending) setTimeout(syncPull, 0);
}

/* start-up step (run once by main.js) */
export function listenForOtherTabs() {
  source.subscribe((json) => {
    if (json != null) return apply(json);
    if (busy()) {
      pending = true;
      return;
    }
    syncPull();
  });
}
