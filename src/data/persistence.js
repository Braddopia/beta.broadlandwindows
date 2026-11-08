/* data/persistence: Saving to the browser database and keeping other open tabs in step. */
import { KEY } from '../config/constants.js';
import { $ } from '../core/dom.js';
import { phBack, phOut, phPutMany, photosOff } from './photos.js';
import { replaceState, state } from './state.js';
import { render } from '../ui/shell/router.js';
import { toast } from '../ui/toast.js';

/* ---- save ---- */
export let storeWarned = 0;
/* saving: the browser database (IndexedDB) is the main store; localStorage keeps a copy while it fits */
export let SDB = null,
  storeSize = 0;
export const sdb = () =>
  SDB ||
  (SDB = new Promise((ok, no) => {
    try {
      const r = indexedDB.open('bb_state', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('s');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    } catch (e) {
      no(e);
    }
  }));
export const BC = typeof BroadcastChannel == 'function' ? new BroadcastChannel('bb_state') : null;
export function saveRaw(j) {
  storeSize = j.length;
  sdb()
    .then((d) => {
      const t = d.transaction('s', 'readwrite'),
        os = t.objectStore('s');
      /* the database answered late at start-up: never write over a newer copy we have not loaded */
      if (window.__BOOT_MISS) {
        const g = os.get(KEY);
        g.onsuccess = () => {
          const v = g.result,
            m = /"_saved":(\d+)/.exec(typeof v == 'string' ? v.slice(-60) : '');
          if (m && +m[1] > (window.__BOOT_AT || 0)) {
            t.abort();
            window.__bootReload();
            return;
          }
          window.__BOOT_MISS = false;
          os.put(j, KEY);
        };
      } else os.put(j, KEY);
      t.oncomplete = () => {
        BC && BC.postMessage('saved');
      };
      t.onerror = () => toast('Could not save. Export a backup from Admin Console.');
    })
    .catch(() => {});
  if (window.__BOOT_MISS) return; /* wait until the database check above has passed */
  try {
    if (j.length < 4.5e6) localStorage.setItem(KEY, j);
    else localStorage.removeItem(KEY);
  } catch (e) {
    try {
      localStorage.removeItem(KEY);
    } catch (x) {}
  }
}
export function store() {
  try {
    delete state._saved;
    state._saved = Date.now();
    const N = phOut();
    if (!N.length) {
      saveRaw(JSON.stringify(state));
      return;
    }
    /* new photos go to the photo store first; if that fails they stay inside the record */
    phPutMany(N).then(
      () => saveRaw(JSON.stringify(state)),
      () => {
        photosOff();
        phBack(N);
        saveRaw(JSON.stringify(state));
      }
    );
  } catch (e) {
    toast('Could not save: ' + e.message);
  }
}
/* ---- cross-tab sync ---- */
export let syncPend = 0;
export function syncPull() {
  sdb().then((d) => {
    const g = d.transaction('s', 'readonly').objectStore('s').get(KEY);
    g.onsuccess = () => {
      try {
        const n = JSON.parse(g.result);
        if (!n || !Array.isArray(n.items)) return;
        if ($('.ov.open')) {
          syncPend = 1;
          return;
        }
        syncPend = 0;
        replaceState(n);
        render();
      } catch (x) {}
    };
  });
}
/* start-up step (run once by main.js) */
export function askBrowserToKeepData() {
  /* ask the browser to keep the data even when the disk is low */
  try {
    navigator.storage && navigator.storage.persist && navigator.storage.persist();
  } catch (e) {}
}
/* start-up step (run once by main.js) */
export function listenForOtherTabs() {
  if (BC)
    BC.onmessage = () => {
      if ($('.ov.open')) {
        syncPend = 1;
        return;
      }
      syncPull();
    };
  window.addEventListener('storage', (e) => {
    if (!BC && e.key == KEY && e.newValue) {
      try {
        const n = JSON.parse(e.newValue);
        if (n && Array.isArray(n.items)) {
          replaceState(n);
          render();
        }
      } catch (x) {}
    }
  });
}
