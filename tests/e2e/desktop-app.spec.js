// v19.15.1 desktop app (installable web app): the site served from a web address has a valid app description with
// icons, the Settings page offers it, and an open app shows Update Ready when a newer version is published (v19.17.3).
const fs = require('fs');
const path = require('path');
const { test, expect } = require('../helpers');

const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

/** serve the built site from https://crm.test/ (files from the project folder); version.json can be swapped */
async function serve(app, version) {
  await app.page.context().route('https://crm.test/**', (r) => {
    const p = new URL(r.request().url()).pathname.replace(/^\/$/, '/index.html');
    if (p == '/version.json' && version.now)
      return r.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ version: version.now, notes: version.notes || [] }),
      });
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await app.page.goto('https://crm.test/');
  await app.page.waitForFunction(() => window.CRM && document.querySelector('#main').children.length > 0);
}

test('the website describes itself as an app, with its icons', async ({ app }) => {
  await serve(app, {});
  const m = await app.page.evaluate(async () => {
    const href = document.querySelector('link[rel=manifest]').href;
    const j = await (await fetch(href)).json();
    const icons = await Promise.all(j.icons.map(async (i) => (await fetch(new URL(i.src, href))).status));
    return { name: j.name, display: j.display, start: j.start_url, sizes: j.icons.map((i) => i.sizes), icons };
  });
  expect(m).toEqual({
    name: 'Broadland Windows CRM',
    display: 'standalone',
    start: './',
    sizes: ['192x192', '512x512', '192x192', '512x512'],
    icons: [200, 200, 200, 200],
  });
  // the service worker file is published with this version's name in its cache
  const sw = await app.page.evaluate(async () => (await fetch('sw.js')).text());
  const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  expect(sw).toContain('bw-crm-' + v);
  // Settings has a Desktop App row
  await app.go('settings');
  await expect(app.page.locator('#main')).toContainText('Desktop App');
});

test('an open app shows the new-version window in the middle of the screen; Remind Me puts it away with a chip', async ({
  app,
}) => {
  const version = {};
  await serve(app, version);
  await expect(app.page.locator('#updWin')).toHaveCount(0);
  version.now = '99.0.0';
  version.notes = ['Service calls can have up to four engineers'];
  // checked on every page change and on coming back to the window (at most every 3 seconds)
  await app.page.waitForTimeout(3100);
  await app.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const win = app.page.locator('#updWin');
  await expect(win).toContainText('A New Version Is Ready');
  await expect(win).toContainText('Version 99.0.0');
  await expect(win).toContainText('Service calls can have up to four engineers');
  await expect(win.locator('.updw-go')).toBeFocused();
  // centred on the screen
  const c = await win.locator('.updw-card').evaluate((e) => {
    const b = e.getBoundingClientRect();
    return [Math.round(b.left + b.width / 2 - innerWidth / 2), Math.round(b.top + b.height / 2 - innerHeight / 2)];
  });
  expect(Math.abs(c[0])).toBeLessThan(3);
  expect(Math.abs(c[1])).toBeLessThan(20);
  // Remind Me In 10 Minutes: the window goes, a chip stays to restart from; the next check does not bring it back
  await win.locator('.updw-l').click();
  await expect(win).toHaveCount(0);
  await expect(app.page.locator('#updChip')).toContainText('Version 99.0.0 is ready');
  await app.page.waitForTimeout(3100);
  await app.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await app.page.waitForTimeout(400);
  await expect(app.page.locator('#updWin')).toHaveCount(0);
  await expect(app.page.locator('#updChip button')).toHaveText('Restart');
  expect(app.errors).toEqual([]);
});

test('on a Mac the app uses white rounded-tile icons, like the other Dock apps (v19.17.7)', async ({ app }) => {
  await app.page.addInitScript(() => Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' }));
  await serve(app, {});
  const m = await app.page.evaluate(async () => {
    const href = document.querySelector('link[rel=manifest]').href,
      j = await (await fetch(href)).json();
    const icons = await Promise.all(j.icons.map(async (i) => (await fetch(new URL(i.src, href))).status));
    return { file: href.split('/').pop(), srcs: j.icons.map((i) => i.src), icons };
  });
  expect(m).toEqual({
    file: 'manifest-mac.webmanifest',
    srcs: ['app-sun-mac-192.png', 'app-sun-mac-512.png'],
    icons: [200, 200],
  });
});
