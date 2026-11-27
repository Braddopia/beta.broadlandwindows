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

test('an open app shows Update Ready when a newer version is published: Later hides it, Restart Now reloads', async ({
  app,
}) => {
  const version = {};
  await serve(app, version);
  await expect(app.page.locator('#updCard')).toHaveCount(0);
  version.now = '99.0.0';
  version.notes = ['Service calls can have up to four engineers'];
  // checked on every page change and on coming back to the window (at most every 3 seconds)
  await app.page.waitForTimeout(3100);
  await app.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const card = app.page.locator('#updCard');
  await expect(card).toContainText('Update Ready');
  await expect(card).toContainText('v99.0.0');
  await expect(card).toContainText('Service calls can have up to four engineers');
  await expect(card.locator('.upd-go')).toHaveText('Restart Now');
  // Later hides it for 10 minutes, even when the next check finds the same update
  await card.locator('.upd-l').click();
  await expect(card).toHaveCount(0);
  await app.page.waitForTimeout(3100);
  await app.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await app.page.waitForTimeout(400);
  await expect(app.page.locator('#updCard')).toHaveCount(0);
  expect(app.errors).toEqual([]);
});
