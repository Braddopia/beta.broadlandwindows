/* data/sources/indexeddb-source: today's storage, in this browser only.
   - the app data: database 'bb_state', store 's', one key (KEY), with a copy in localStorage while it fits
   - photos: database 'broadland_photos', store 'p', one entry per photo id
   - other open tabs hear about saves through a BroadcastChannel (or the localStorage 'storage' event)
   src/boot-loader.js reads the same database before the app starts, so the names here must not change. */
import { KEY } from '../../config/constants.js';
import { emit } from '../../core/events.js';

const openDb = (name, store) =>
  new Promise((ok, no) => {
    try {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(store);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    } catch (e) {
      no(e);
    }
  });

let stateDb = null,
  photoDb = null,
  lastSize = 0;
const sdb = () => stateDb || (stateDb = openDb('bb_state', 's'));
const pdb = () => photoDb || (photoDb = openDb('broadland_photos', 'p'));
const channel = typeof BroadcastChannel == 'function' ? new BroadcastChannel('bb_state') : null;

/** @type {import('./data-source.js').DataSource} */
export const indexedDbSource = {
  name: 'This browser',

  savedSize: () => lastSize,

  readAll() {
    return sdb().then(
      (d) =>
        new Promise((ok) => {
          const g = d.transaction('s', 'readonly').objectStore('s').get(KEY);
          g.onsuccess = () => ok(g.result ?? null);
          g.onerror = () => ok(null);
        })
    );
  },

  saveAll(j) {
    lastSize = j.length;
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
          channel && channel.postMessage('saved');
        };
        t.onerror = () => emit('notice', 'Could not save. Export a backup from Admin Console.');
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
  },

  replaceAll(j) {
    return sdb().then(
      (d) =>
        new Promise((ok, no) => {
          const t = d.transaction('s', 'readwrite');
          t.objectStore('s').put(j, KEY);
          t.oncomplete = () => {
            try {
              localStorage.removeItem(KEY);
            } catch (e) {}
            ok();
          };
          t.onerror = () => no(t.error);
        })
    );
  },

  subscribe(onChange) {
    const fromChannel = () => onChange(null);
    const fromStorage = (e) => {
      if (!channel && e.key == KEY && e.newValue) onChange(e.newValue);
    };
    if (channel) channel.onmessage = fromChannel;
    window.addEventListener('storage', fromStorage);
    return () => {
      if (channel) channel.onmessage = null;
      window.removeEventListener('storage', fromStorage);
    };
  },

  putPhotos(pairs) {
    return pdb().then(
      (d) =>
        new Promise((ok, no) => {
          const t = d.transaction('p', 'readwrite'),
            s = t.objectStore('p');
          pairs.forEach(([id, v]) => s.put(v, id));
          t.oncomplete = () => ok();
          t.onerror = () => no(t.error);
          t.onabort = () => no(t.error);
        })
    );
  },

  removePhotosExcept(used) {
    return pdb().then(
      (d) =>
        new Promise((ok) => {
          const t = d.transaction('p', 'readwrite'),
            s = t.objectStore('p'),
            k = s.getAllKeys();
          let n = 0;
          k.onsuccess = () => {
            (k.result || []).forEach((id) => {
              if (!used.has(id)) {
                s.delete(id);
                n++;
              }
            });
          };
          t.oncomplete = () => ok(n);
          t.onerror = () => ok(0);
        })
    );
  },

  getPhotos(ids) {
    return pdb().then(
      (d) =>
        new Promise((ok, no) => {
          const t = d.transaction('p', 'readonly'),
            s = t.objectStore('p'),
            o = {};
          ids.forEach((id) => {
            const g = s.get(id);
            g.onsuccess = () => {
              o[id] = g.result;
            };
          });
          t.oncomplete = () => ok(o);
          t.onerror = () => no(t.error);
        })
    );
  },
};
