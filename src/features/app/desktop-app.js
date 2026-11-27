/* features/app/desktop-app: the CRM as a desktop app (an installable web app).
   Installed from Edge or Chrome (Settings, Desktop App, Install; or the install icon in the address bar), it opens in
   its own window from the Start menu, taskbar or Dock. It always loads the live website, so every update reaches the
   app and the website together, and it shares the website's saved data on that computer.
   - sw.js (src/app/sw.js) keeps a copy of the page for when the internet drops, but always fetches the newest first.
   - version.json (written by the build) says which version is live; an open app or tab checks it every 15 minutes
     and when it comes back into view, and offers Reload when a newer one has been published. */
import { emit } from '../../core/events.js';

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

let seen = '';
async function checkVersion() {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const v = String((await r.json()).version || '');
    if (!seen) seen = typeof APP_BUILD == 'string' ? APP_BUILD : v;
    /* reminds at each check (every 15 minutes, or on coming back to the window) until reloaded */
    if (v && v != seen) emit('update-ready', v);
  } catch (e) {
    /* offline: try again later */
  }
}
/* start-up step (run once by main.js) */
export function startDesktopApp() {
  if (!/^https?:$/.test(location.protocol)) return;
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
  checkVersion();
  setInterval(checkVersion, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => document.visibilityState == 'visible' && checkVersion());
}
