// The welcome tour: the first-ever tour can't be skipped and Next waits for a timer bar; replays can be skipped.
const { test, expect } = require('../helpers');

test('first-ever tour: no Skip, Next unlocks when the bar fills; a replay keeps Skip', async ({ app }) => {
  test.setTimeout(30000);
  await app.call('startTour', true);
  const card = app.page.locator('#tour .tcard');
  await expect(card).toContainText('1 of');
  await expect(card.locator('text=Skip Tour')).toHaveCount(0);
  await expect(card.locator('.ttime')).toHaveCount(1);
  const next = card.locator('.tbtn .btn:last-child');
  await expect(next).toBeDisabled();
  // one Escape and the arrow key don't jump past it
  await app.page.keyboard.press('Escape');
  await app.page.keyboard.press('ArrowRight');
  await expect(app.page.locator('#tour')).toHaveClass(/open/);
  await expect(card).toContainText('1 of');
  await expect(next).toBeEnabled({ timeout: 9000 });
  await next.click();
  await expect(card).toContainText('2 of');
  await expect(card.locator('.tbtn .btn:last-child')).toBeDisabled();
  // going back to a step already read doesn't make you wait again
  await card.locator('text=Back').click();
  await expect(card).toContainText('1 of');
  await expect(card.locator('.tbtn .btn:last-child')).toBeEnabled();
  await app.call('endTour');

  // replay from the ? button on the overview: the welcome tour, with Skip, and Next works at once
  await app.page.click('#helpBtn');
  await expect(card).toContainText('Welcome To Broadland Windows CRM');
  await expect(card.locator('text=Skip Tour')).toHaveCount(1);
  await expect(card.locator('.ttime')).toHaveCount(0);
  await expect(card.locator('.tbtn .btn:last-child')).toBeEnabled();
  await app.page.keyboard.press('Escape');
  await expect(app.page.locator('#tour')).not.toHaveClass(/open/);
  expect(app.errors).toEqual([]);
});

test('each tab plays its own tour once, the first time it opens; Esc three times leaves it', async ({ app }) => {
  test.setTimeout(30000);
  await app.role('beta');
  await app.page.evaluate(() => localStorage.setItem('bb_tours_seen', ''));
  await app.go('stock');
  const card = app.page.locator('#tour .tcard');
  await expect(card).toContainText('Find Stock');
  await expect(card).toContainText('1 of 7');
  await expect(card.locator('text=Skip Tour')).toHaveCount(0);
  await expect(card.locator('.tbtn .btn:last-child')).toBeDisabled();
  // the spotlight is on the stock search box
  const spot = await app.page.locator('#tour .tspot').boundingBox();
  const box = await app.page.locator('#invQ').boundingBox();
  expect(Math.abs(spot.x + 8 - box.x)).toBeLessThan(3);
  for (let i = 0; i < 3; i++) await app.page.keyboard.press('Escape');
  await expect(app.page.locator('#tour')).not.toHaveClass(/open/);
  // never again by itself
  await app.go('home');
  await app.go('stock');
  await app.page.waitForTimeout(1000);
  await expect(app.page.locator('#tour.open')).toHaveCount(0);
  expect(await app.page.evaluate(() => localStorage.getItem('bb_tours_seen'))).toContain('stock');
  // the ? button replays this tab's tour, with Skip
  await app.page.click('#helpBtn');
  await expect(card).toContainText('Find Stock');
  await expect(card.locator('text=Skip Tour')).toHaveCount(1);
  await app.call('endTour');
  // every tab's tour points at things that are really on the page
  const missing = await app.run(() => {
    const out = [];
    for (const [v, steps] of Object.entries(TAB_TOURS)) {
      go(v);
      for (const s of steps) {
        const els = [...document.querySelectorAll(s.sel)];
        const el = s.txt
          ? els.find((e) => (e.innerText || '').trim().toLowerCase().startsWith(s.txt.toLowerCase()))
          : els[0];
        if (!el) out.push(v + ': ' + s.t);
      }
    }
    return out;
  });
  expect(missing).toEqual([]);
  expect(app.errors).toEqual([]);
});

test('every page lines up with the top bar, left and right, and Report A Problem lines up on the right', async ({
  app,
}) => {
  await app.role('beta');
  await app.page.waitForTimeout(300); // the page padding settles once the scrollbar room is measured
  const off = await app.run(() => {
    const out = [];
    for (const v of ['home', 'leads', 'contracts', 'service', 'stock', 'contacts', 'settings']) {
      go(v);
      const t = document.querySelector('.top').getBoundingClientRect();
      const m = document.querySelector('#main > *').getBoundingClientRect();
      const r = document.querySelector('#rpb').getBoundingClientRect();
      if (Math.abs(t.left - m.left) > 1 || Math.abs(t.right - m.right) > 1 || Math.abs(t.right - r.right) > 1)
        out.push(v);
    }
    return out;
  });
  expect(off).toEqual([]);
});

test('tours are switched off until go-live: no tab tour starts by itself, the ? button still plays one', async ({
  app,
}) => {
  await app.role('beta');
  await app.page.evaluate(() => {
    localStorage.removeItem('bb_tours_force');
    localStorage.setItem('bb_tours_seen', '');
  });
  expect(await app.run(() => TOURS_AUTO)).toBe(false);
  await app.go('stock');
  await app.page.waitForTimeout(1200);
  await expect(app.page.locator('#tour.open')).toHaveCount(0);
  await app.page.click('#helpBtn');
  await expect(app.page.locator('#tour .tcard')).toContainText('Find Stock');
  expect(app.errors).toEqual([]);
});
