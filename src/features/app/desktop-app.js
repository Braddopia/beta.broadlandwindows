/* features/app/desktop-app: the CRM as a desktop app (an installable web app).
   Installed from Edge or Chrome (Settings, Desktop App, Install; or the install icon in the address bar), it opens in
   its own window from the Start menu, taskbar or Dock. It always loads the live website, so every update reaches the
   app and the website together, and it shares the website's saved data on that computer.
   - sw.js (src/app/sw.js) keeps a copy of the page for when the internet drops, but always fetches the newest first.
   - version.json (written by the build) says which version is live and what is new. An open app or tab checks it
     (v19.17.3) on every page change, whenever the window comes back into view or the internet comes back, and every
     2 minutes (at most once every 3 seconds). When a newer version has been published it asks for a restart with the
     Update Ready pop-up (ui/shell/update-card.js), again at every check until restarted. */
import { toast } from '../../ui/toast.js';
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
  lastCheck = 0,
  waiting = '',
  checked = false;
/** (v19.18.10) a newer version found by the last check ('' when none), and whether a check has answered yet */
export const updWaiting = () => waiting;
export const updChecked = () => checked || !!waiting;
/** the version running now (the build writes it into the page) */
export const appVersion = () => (typeof APP_BUILD == 'string' ? APP_BUILD : '');
/** look for a newer version in version.json: 'new' (the window is shown), 'latest', or 'error' */
export async function checkVersion(force, asked) {
  if (!force && performance.now() - lastCheck < 3e3) return 'latest';
  lastCheck = performance.now();
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return 'error';
    const j = await r.json(),
      v = String(j.version || '');
    if (!seen) seen = appVersion() || v;
    if (v && v != seen) {
      waiting = v;
      emit('update-ready', {
        version: v,
        date: /^\d{4}-\d{2}-\d{2}$/.test(j.date || '') ? j.date : '',
        notes: (Array.isArray(j.sections) ? j.sections : Array.isArray(j.notes) ? j.notes : [])
          .slice(0, 5)
          .map((n) =>
            n && typeof n == 'object'
              ? { t: String(n.t || '').slice(0, 60), d: String(n.d || '').slice(0, 400) }
              : String(n).slice(0, 400)
          ),
        app: appState() == 'installed',
        force: !!asked,
      });
      return 'new';
    }
    waiting = '';
    checked = true;
    return 'latest';
  } catch (e) {
    /* offline: try again later */
    return 'error';
  }
}
/** (v19.18.7) Settings, Check For Updates: look now and say what was found */
export async function updCheck() {
  if (!/^https?:$/.test(location.protocol)) {
    toast('This copy was opened from a file, so it cannot update itself. The website always has the newest version.');
    return;
  }
  const r = await checkVersion(true, true);
  if (document.body.dataset.view == 'settings') emit('data-replaced');
  if (r == 'latest') toast('You have the latest version (' + appVersion() + ')');
  else if (r == 'error') toast('Could not check for updates. Check the internet connection and try again.');
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
