/* sw.js: the desktop app's helper (copied from src/app by the build). Network first: the newest version of the CRM
   always loads when online; the last copy is kept so the app still opens if the internet drops. Data is not touched
   (it lives in the browser's database, shared with the website). */
const CACHE = 'bw-crm-19.15.3';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k != CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
);
self.addEventListener('fetch', (e) => {
  const r = e.request,
    url = new URL(r.url);
  if (r.method != 'GET' || url.origin != location.origin) return;
  /* the page itself and the app's icons are kept for offline use; everything else just goes to the network */
  const keep =
    r.mode == 'navigate' || /\/app-sun-\d+\.png$|manifest\.webmanifest$/.test(url.pathname);
  if (!keep) return;
  e.respondWith(
    fetch(r)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(r.mode == 'navigate' ? './' : r, copy));
        }
        return res;
      })
      .catch(() => caches.match(r.mode == 'navigate' ? './' : r).then((m) => m || caches.match('./')))
  );
});
