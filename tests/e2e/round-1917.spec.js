// v19.17: brochures follow the website, sample dates stay current, Fewer Animations leaves the intro and screen saver
// alone, Settings buttons are one size, the Processing menu group, and Files lists set out like Inventory.
const { test, expect } = require('../helpers');

test('the brochure list follows the website: new ones appear (marked New), removed ones go', async ({ app }) => {
  await app.role('beta');
  await app.go('downloads');
  const n0 = await app.run(() => brochures().length);
  expect(n0).toBe(23);
  const today = await app.run(() => new Date().toISOString().slice(0, 10));
  const U = 'https://www.broadlandwindows.co.uk/wp-content/uploads/2026/11/';
  await app.run(
    ([U, today]) =>
      brochureFeed({
        updated: today + 'T05:23:00Z',
        items: [
          { cat: 'PVCu', title: 'Rose Collection 2026', url: U + 'Rose-2026.pdf', firstSeen: today },
          ...['A', 'B', 'C', 'D', 'E'].map((x) => ({
            cat: 'Aluminium',
            title: 'Smarts ' + x,
            url: U + x + '.pdf',
            firstSeen: '2025-01-01',
          })),
        ],
      }),
    [U, today]
  );
  await expect(app.page.locator('#main .bc')).toHaveCount(6);
  await expect(app.page.locator('#main .head .muted')).toContainText('6 of 6 brochures');
  await expect(app.page.locator('#main .bc', { hasText: 'Rose Collection 2026' }).locator('.bc-new')).toHaveText('New');
  await expect(app.page.locator('#main .bc', { hasText: 'Smarts A' }).locator('.bc-new')).toHaveCount(0);
  // a link that is not on the Broadland website is never shown
  await app.run(() =>
    brochureFeed({
      items: Array.from({ length: 6 }, (_, i) => ({ title: 'X' + i, url: 'https://evil.example/x' + i + '.pdf' })),
    })
  );
  await expect(app.page.locator('#main .bc')).toHaveCount(6);
  expect(app.errors).toEqual([]);
});

test('sample dates move forward to today; records someone has changed stay where they are', async ({ app }) => {
  const r = await app.run(() => {
    const d2 = state.deliveries.find((x) => x.id == 'D-2'),
      d1 = state.deliveries.find((x) => x.id == 'D-1');
    const back = (s, n) => {
      const d = new Date(s + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - n);
      return d.toISOString().slice(0, 10);
    };
    const before2 = d2.due;
    d2.due = back(d2.due, 5);
    d1.due = back(d1.due, 5);
    d1._meta = { version: 1 }; // changed by someone: a real record now
    const d1was = d1.due;
    state.sampleDay = back(today(), 5);
    sampleRoll();
    return [d2.due == before2, d1.due == d1was, state.sampleDay == today()];
  });
  expect(r).toEqual([true, true, true]);
});

test('Fewer Animations calms the page but the screen saver still moves', async ({ app }) => {
  await app.page.emulateMedia({ reducedMotion: 'no-preference' });
  await app.role('beta');
  await app.call('motionSet', true);
  await app.call('saverTry');
  const anim = await app.run(() => getComputedStyle(document.querySelector('#saver .sv-mill .sails')).animationName);
  expect(anim).toBe('svSails');
  const page = await app.run(
    () => getComputedStyle(document.querySelector('.kpi') || document.body).transitionDuration
  );
  expect(['0s', '1e-05s']).toContain(page);
});

test('Settings: every button in My Settings is the same size; the screen saver note is short', async ({ app }) => {
  await app.go('settings');
  const sizes = await app.run(() =>
    [...document.querySelectorAll('#main .set-c')[0].querySelectorAll('.set-a .btn')].map(
      (b) => b.offsetWidth + 'x' + b.offsetHeight
    )
  );
  expect(new Set(sizes).size).toBe(1);
  await expect(app.page.locator('#main .set-r', { hasText: 'Screen Saver' })).toContainText(
    'Starts when this computer is left idle'
  );
  await expect(app.page.locator('#main .set-c:has(h2 span:text-is("Company Details"))')).toContainText(
    'for you to refer to'
  );
});

test('Panel Optimiser, Cutting Optimiser and Job Stock Tags sit under Processing in the menu', async ({ app }) => {
  await app.role('beta');
  const groups = await app.run(() => {
    const out = {};
    let g = '';
    for (const e of document.querySelectorAll('#nav > *')) {
      if (e.classList.contains('nl')) g = e.textContent.trim();
      else if (e.classList.contains('nav')) (out[g] = out[g] || []).push(e.textContent.trim().replace(/\d+$/, ''));
    }
    return out;
  });
  expect(groups.Processing).toEqual(['Panel Optimiser', 'Cutting Optimiser', 'Job Stock Tags']);
  expect(groups.Stock).toEqual(['Inventory', 'Suppliers']);
});

test('Files lists line up like Inventory: the heading and every row share one grid, Category and Size centred', async ({
  app,
}) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.role('beta');
  await app.go('downloads');
  const r = await app.run(() => {
    const list = document.querySelector('#main .flist:has(.fhead)'),
      rows = [...list.querySelectorAll('.frow')].slice(0, 6);
    const lefts = (i) => new Set(rows.map((x) => Math.round(x.children[i].getBoundingClientRect().left)));
    return {
      catLined: new Set(
        rows.map((x) => Math.round(((b) => (b.left + b.right) / 2)(x.children[1].getBoundingClientRect())))
      ).size,
      nameLined: lefts(0).size,
    };
  });
  expect(r).toEqual({ catLined: 1, nameLined: 1 });
});

test('Deliveries open on a month calendar: each delivery on its due day, coloured; a day starts a new delivery', async ({
  app,
}) => {
  await app.page.setViewportSize({ width: 1440, height: 1000 });
  await app.role('beta');
  await app.go('deliveries');
  await expect(app.page.locator('#main .seg2 button.on')).toHaveText('Calendar');
  const td = await app.run(() => today());
  // D-2 is due today, so it sits in today's box, amber
  const todayBox = app.page.locator('#main .dcal-d.td');
  await expect(todayBox).toContainText('Example Aluminium Ltd');
  await expect(todayBox.locator('.dcal-c.td').first()).toBeVisible();
  // the overdue one is red
  await expect(app.page.locator('#main .dcal-c.od')).toContainText('Example Glass Ltd');
  // a chip opens its delivery; an empty part of a day starts a new delivery due that day
  await todayBox.locator('.dcal-c').first().click();
  await expect(app.page.locator('#mbox h2')).toContainText('Delivery: Example Aluminium Ltd');
  await app.call('closeModal');
  await todayBox.locator('.dcal-n').click();
  await expect(app.page.locator('#mbox h2')).toHaveText('New Delivery');
  await expect(app.page.locator('#f_due')).toHaveValue(td);
  await app.call('closeModal');
  // next month and back to today
  await app.page.click('#main .dcal-nav button[aria-label="Next month"]');
  await expect(app.page.locator('#main .dcal-d.td')).toHaveCount(0);
  await app.page.click('#main .dcal-nav button:text-is("Today")');
  await expect(app.page.locator('#main .dcal-d.td')).toHaveCount(1);
  expect(app.errors).toEqual([]);
});

test('Job Stock Tags: one tab per tag; the boxes and the preview are the same height', async ({ app }) => {
  await app.page.setViewportSize({ width: 1440, height: 1000 });
  await app.go('tags');
  await app.page.click('#main .jt-tab.add');
  await expect(app.page.locator('#main .jt-tab:not(.add)')).toHaveCount(2);
  await expect(app.page.locator('#main .jt-tab.on')).toContainText('Tag 2');
  await app.page.click('#main .jt-tab >> text=Tag 1');
  await expect(app.page.locator('#tag_0_jobNo')).toBeVisible();
  const h = await app.run(() => {
    const b = (s) => document.querySelector(s).getBoundingClientRect();
    return Math.abs(b('#main .jt-edit').height - b('#main .jt-stage').height);
  });
  expect(h).toBeLessThan(2);
});

test('v19.17.9: no current brochure shows New, even when the daily check re-dates them all to today', async ({
  app,
}) => {
  const B = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../../brochures.json'), 'utf8'));
  await app.role('beta');
  await app.go('downloads');
  await app.run((B) => brochureFeed(B), B);
  await expect(app.page.locator('#main .bc')).toHaveCount(B.items.length);
  await expect(app.page.locator('#main .bc-new')).toHaveCount(0);
  // the worst case: every address looks new to the check and is dated today
  const today = await app.run(() => new Date().toISOString().slice(0, 10));
  await app.run((B) => brochureFeed(B), { ...B, items: B.items.map((x) => ({ ...x, firstSeen: today })) });
  await expect(app.page.locator('#main .bc-new')).toHaveCount(0);
  expect(app.errors).toEqual([]);
});
