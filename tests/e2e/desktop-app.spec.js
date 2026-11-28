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
        body: JSON.stringify({
          version: version.now,
          notes: version.notes || [],
          ...(version.sections ? { sections: version.sections, date: version.date } : {}),
        }),
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

test('v19.18.3: the new-version window still shows after the screen saver has been used once', async ({ app }) => {
  const version = {};
  await serve(app, version);
  // the screen saver has run once: its (hidden) scene stays on the page
  await app.page.evaluate(() => {
    const s = document.createElement('div');
    s.id = 'saver';
    document.body.appendChild(s);
  });
  version.now = '99.0.1';
  await app.page.waitForTimeout(3100);
  await app.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(app.page.locator('#updWin')).toContainText('Version 99.0.1');
  expect(app.errors).toEqual([]);
});

test('v19.18.7: Settings shows the version for every account, and Check For Updates looks straight away', async ({
  app,
}) => {
  const version = {};
  await serve(app, version);
  const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  await app.role('staff');
  await app.go('settings');
  const row = app.page.locator('#main .set-r', { hasText: 'Version' });
  await expect(row).toContainText('This is version ' + v);
  // nothing newer: it says so, and the row says it is the latest
  await row.locator('[data-act=updCheck]').click();
  await expect(app.page.locator('#toast')).toContainText('You have the latest version (' + v + ')');
  await expect(row).toContainText('the latest');
  // a newer one: the New Version window, even after Remind Me Later
  version.now = '99.1.0';
  await row.locator('[data-act=updCheck]').click();
  await expect(app.page.locator('#updWin')).toContainText('Version 99.1.0');
  await app.page.locator('#updWin .updw-l').click();
  await expect(app.page.locator('#updWin')).toHaveCount(0);
  // (v19.18.10) Settings now says a new version is ready, with Update Now
  await expect(row).toContainText('Version 99.1.0 is ready');
  await expect(row.locator('[data-act=updRestart]')).toHaveText('Update Now');
  expect(app.errors).toEqual([]);
});

test("v19.18.10: the New Version window reads like a What's New: date, sections with headings, no ticks", async ({
  app,
}) => {
  const version = {};
  await serve(app, version);
  Object.assign(version, {
    now: '99.2.0',
    date: '2026-11-28',
    notes: ['Old copies read this line'],
    sections: [
      { t: 'Deliveries Calendar', d: 'The whole month fits on the screen.' },
      { t: 'Settings', d: 'The Version row says when a new version is ready.' },
    ],
  });
  await app.page.waitForTimeout(3100);
  await app.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const win = app.page.locator('#updWin');
  await expect(win.locator('h2')).toHaveText("What's New");
  await expect(win.locator('.updw-v')).toHaveText('Version 99.2.0 · 28 November 2026');
  await expect(win.locator('.updw-s h3')).toHaveText(['Deliveries Calendar', 'Settings']);
  await expect(win.locator('.updw-s p').first()).toHaveText('The whole month fits on the screen.');
  await expect(win.locator('li')).toHaveCount(0);
  await expect(win.locator('.updw-go')).toBeFocused();
  // the cross puts it away like Remind Me In 10 Minutes
  await win.locator('.updw-x').click();
  await expect(win).toHaveCount(0);
  await expect(app.page.locator('#updChip')).toContainText('Version 99.2.0 is ready');
  expect(app.errors).toEqual([]);
});
