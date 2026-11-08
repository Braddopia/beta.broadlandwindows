/* data/photos: Photos live in their own browser database; records keep a short "ph:<id>" reference. */
import { $ } from '../core/dom.js';
import { uuid } from '../core/ids.js';
import { state } from './state.js';
import { tmpDraw } from '../ui/forms/photos.js';
import { render } from '../ui/shell/router.js';

/* ---- ids ---- */
/* ---- photos live in their own browser database; records keep only a short "ph:<id>" reference.
   The main save stays small however many years of jobs and photos build up. ---- */
export const PHC = new Map(),
  PH_BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
  phWait = new Set();
export let PH_OFF = false,
  phDbP = null,
  phT = 0;
export const PH_OK = (v) => /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(String(v || '')),
  phIsRef = (v) => /^ph:[A-Za-z0-9-]{6,48}$/.test(String(v || ''));
export function photosOff() {
  PH_OFF = true;
}
export function phDb() {
  if (!phDbP)
    phDbP = new Promise((ok, no) => {
      try {
        const r = indexedDB.open('broadland_photos', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('p');
        r.onsuccess = () => ok(r.result);
        r.onerror = () => no(r.error);
      } catch (e) {
        no(e);
      }
    });
  return phDbP;
}
export function phPutMany(N) {
  return phDb().then(
    (d) =>
      new Promise((ok, no) => {
        const t = d.transaction('p', 'readwrite'),
          s = t.objectStore('p');
        N.forEach(([id, v]) => s.put(v, id));
        t.oncomplete = () => ok();
        t.onerror = () => no(t.error);
        t.onabort = () => no(t.error);
      })
  );
}
export function phGetMany(ids) {
  return phDb().then(
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
}
export function phWant(id) {
  if (PHC.has(id) || phWait.has(id)) return;
  phWait.add(id);
  clearTimeout(phT);
  phT = setTimeout(phFlush, 0);
}
export function phFlush() {
  const ids = [...phWait];
  if (!ids.length) return;
  phGetMany(ids)
    .then((o) => {
      ids.forEach((id) => {
        phWait.delete(id);
        PHC.set(id, PH_OK(o[id]) ? o[id] : PH_BLANK);
      });
      phRefresh();
    })
    .catch(() =>
      ids.forEach((id) => {
        phWait.delete(id);
        PHC.set(id, PH_BLANK);
      })
    );
}
/* load photos before something needs them all at once (printing, backups) */
export function phLoad(list) {
  const ids = [...new Set((list || []).filter(phIsRef).map((r) => r.slice(3)))].filter((id) => !PHC.has(id));
  if (!ids.length) return Promise.resolve();
  return phGetMany(ids)
    .then((o) => ids.forEach((id) => PHC.set(id, PH_OK(o[id]) ? o[id] : PH_BLANK)))
    .catch(() => {});
}
export function phRefresh() {
  try {
    if ($('#modal.open') && typeof tmpDraw == 'function' && tmpDraw) tmpDraw();
  } catch (e) {}
  try {
    render(true);
  } catch (e) {}
}
/* every list of photos in the data, so they can be moved out, put back or gathered */
export function phLists() {
  const L = [];
  ['leads', 'contracts', 'calls', 'deliveries', 'bugs', 'leadArchive'].forEach((k) =>
    (state[k] || []).forEach((r) => {
      if (r && Array.isArray(r.photos)) L.push(r.photos);
    })
  );
  Object.values(state.pphotos || {}).forEach((a) => {
    if (Array.isArray(a)) L.push(a);
  });
  return L;
}
export function phOut() {
  if (PH_OFF || !window.indexedDB) return [];
  const N = [];
  phLists().forEach((a) => {
    for (let i = 0; i < a.length; i++) {
      const p = a[i];
      if (typeof p == 'string' && p.startsWith('data:image/') && PH_OK(p)) {
        const id = uuid();
        PHC.set(id, p);
        N.push([id, p]);
        a[i] = 'ph:' + id;
      }
    }
  });
  return N;
}
export function phBack(N) {
  const m = new Map(N.map(([id, p]) => ['ph:' + id, p]));
  phLists().forEach((a) => {
    for (let i = 0; i < a.length; i++) if (m.has(a[i])) a[i] = m.get(a[i]);
  });
}
export function phRefs() {
  return phLists().flat().filter(phIsRef);
}
/* remove stored photos that no record uses any more */
export function phTidy() {
  const used = new Set(phRefs().map((r) => r.slice(3)));
  return phDb().then(
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
}
