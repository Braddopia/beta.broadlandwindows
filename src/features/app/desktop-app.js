/* features/app/desktop-app: the CRM as a desktop app (an installable web app).
   Installed from Edge or Chrome (Settings, Desktop App, Install; or the install icon in the address bar), it opens in
   its own window from the Start menu, taskbar or Dock. It always loads the live website, so every update reaches the
   app and the website together, and it shares the website's saved data on that computer.
   - sw.js (src/app/sw.js) keeps a copy of the page for when the internet drops, but always fetches the newest first.
   - version.json (written by the build) says which version is live and what is new. An open app or tab checks it
     (v19.17.3) on every page change, whenever the window comes back into view or the internet comes back, and every
     2 minutes (at most once every 3 seconds). When a newer version has been published it asks for a restart with the
     Update Ready pop-up (ui/shell/update-card.js), again at every check until restarted. */
import { emit, on } from '../../core/events.js';

let promptEvent = null;
/** 'installed' (running as the app), 'ready' (the browser can install it now), 'browser' (use the browser's menu),
    'file' (opened from a file: no app) */
export function appState() {
  if (!/^https?:$/.test(location.protocol)) return 'file';
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return 'installed';
  return promptEvent ? 'ready' : 'browser';
}
/** the Install button: the browser's own "Install app?" box */
export async function installApp() {
  if (!promptEvent) {
    emit(
      'notice',
      'Use the browser menu: Edge "Apps, Install this site as an app"; Chrome "Cast, save and share, Install page as app"'
    );
    return;
  }
  promptEvent.prompt();
  await promptEvent.userChoice.catch(() => null);
  promptEvent = null;
  emit('data-replaced');
}

let seen = '',
  lastCheck = 0;
export async function checkVersion(force) {
  if (!force && performance.now() - lastCheck < 3e3) return;
  lastCheck = performance.now();
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json(),
      v = String(j.version || '');
    if (!seen) seen = typeof APP_BUILD == 'string' ? APP_BUILD : v;
    if (v && v != seen)
      emit('update-ready', {
        version: v,
        notes: (Array.isArray(j.notes) ? j.notes : []).slice(0, 3).map(String),
        app: appState() == 'installed',
      });
  } catch (e) {
    /* offline: try again later */
  }
}
/* start-up step (run once by main.js) */
/** a Mac: its Dock icons are white rounded tiles with the picture inside, so it gets its own icon set */
export const isMac = () =>
  (navigator.userAgentData && navigator.userAgentData.platform == 'macOS') ||
  /Mac/i.test(navigator.platform || '') ||
  /Macintosh/.test(navigator.userAgent || '');
export function startDesktopApp() {
  if (!/^https?:$/.test(location.protocol)) return;
  /* (v19.17.7) on a Mac the app is described with the white-tile icons (manifest-mac.webmanifest); Windows keeps the
     plain sun. Done first, before the browser offers to install it. */
  const ml = document.querySelector('link[rel=manifest]');
  if (ml && isMac()) ml.setAttribute('href', 'manifest-mac.webmanifest');
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptEvent = e;
    emit('data-replaced');
  });
  addEventListener('appinstalled', () => {
    promptEvent = null;
    emit('notice', 'Installed: the CRM is now in your Start menu or Dock');
  });
  if ('serviceWorker' in navigator && location.protocol == 'https:')
    navigator.serviceWorker.register('sw.js').catch(() => {});
  checkVersion(true);
  setInterval(() => checkVersion(), 2 * 60 * 1000);
  document.addEventListener('visibilitychange', () => document.visibilityState == 'visible' && checkVersion());
  addEventListener('focus', () => checkVersion());
  addEventListener('online', () => checkVersion(true));
  on('view-changed', () => checkVersion());
}
