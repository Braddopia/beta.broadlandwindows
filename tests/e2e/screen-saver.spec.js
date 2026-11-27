// v19.16.2 screen saver: after a while with no activity the opening animation plays on a loop with a clock; any
// a click, tap or key closes it (moving the mouse alone does not, v19.17.6), and the click that wakes it does not
// press anything beneath.
const { test, expect } = require('../helpers');

test('starts after the chosen time without activity; moving the mouse leaves it, a key closes it', async ({ app }) => {
  await app.role('beta');
  await app.go('leads');
  await app.page.evaluate(() => localStorage.setItem('bb_saver', '0.05')); // 3 seconds, for the test
  const saver = app.page.locator('#saver');
  await expect(saver).toHaveClass(/on/, { timeout: 8000 });
  // the Broads scene: no birds; clouds, tree lines, a church, two mills (and the near one's reflection), boats, reeds
  await expect(saver.locator('.sv-crane, .sv-lead, .sv-flock')).toHaveCount(0);
  await expect(saver.locator('.sv-cloud')).toHaveCount(7);
  await expect(saver.locator('.sv-church')).toHaveCount(1);
  await expect(saver.locator('.sv-mill')).toHaveCount(3);
  await expect(saver.locator('.sv-boat')).toHaveCount(2);
  await expect(saver).not.toContainText('Move the mouse');
  await expect(saver.locator('.sv-trees')).toHaveCount(2);
  await expect(saver.locator('.sv-reeds')).toHaveCount(2);
  await expect(saver.locator('.sv-time')).toHaveText(/^\d\d:\d\d$/);
  await expect(saver.locator('.sv-date')).toContainText('November');
  await app.page.waitForTimeout(800);
  await app.page.mouse.move(400, 300);
  await app.page.mouse.move(420, 320);
  await app.page.waitForTimeout(300);
  await expect(saver).toHaveClass(/on/);
  await app.page.keyboard.press('Shift');
  await expect(saver).not.toHaveClass(/on/);
  expect(app.errors).toEqual([]);
});

test('the click that wakes it does not press the button beneath', async ({ app }) => {
  await app.role('beta');
  await app.go('leads');
  await app.call('saverTry');
  await expect(app.page.locator('#saver')).toHaveClass(/on/);
  await app.page.waitForTimeout(800);
  const box = await app.page.locator('#main .head .btn').last().boundingBox(); // New Lead
  await app.page.mouse.click(box.x + 5, box.y + 5);
  await expect(app.page.locator('#saver')).not.toHaveClass(/on/);
  await expect(app.page.locator('#modal.open')).toHaveCount(0);
});

test('Settings chooses when it starts (Off, 2, 5, 10 minutes), on this computer', async ({ app }) => {
  await app.go('settings');
  const row = app.page.locator('#main .set-r', { hasText: 'Screen Saver' });
  await expect(row.locator('#saverSel')).toHaveValue('5');
  await row.locator('#saverSel').selectOption('0');
  expect(await app.page.evaluate(() => localStorage.getItem('bb_saver'))).toBe('0');
  await expect(app.page.locator('#saverSel')).toHaveValue('0');
  // the row is no taller than the others (a drop-down, not a row of buttons)
  const h = await app.page.locator('#main .set-r').evaluateAll((L) => L.map((e) => e.offsetHeight));
  const mine = await app.page.locator('#main .set-r', { hasText: 'Screen Saver' }).evaluate((e) => e.offsetHeight);
  expect(mine).toBeLessThanOrEqual(Math.max(...h.filter((x) => x != mine)));
});

test('it never covers the Floor Boards TV display', async ({ app }) => {
  await app.role('beta');
  await app.run(() => document.body.classList.add('tv'));
  await app.call('saverTry');
  await expect(app.page.locator('#saver.on')).toHaveCount(0);
});

// v19.17.8 the scene is moved by saver-scene.js: clouds start spread across the sky and drift, the sun travels on an
// arc (up from the left, highest in the middle, down on the right) and the moon at night, boats move across the water.
test('clouds are spread across the sky and drift; the sun arcs over; a boat sails', async ({ app }) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  // the tests run with reduce-motion on (a still picture); this one checks the moving scene
  await app.page.emulateMedia({ reducedMotion: 'no-preference' });
  await app.call('saverTry');
  const box = (s) =>
    app.run(
      (s) =>
        [...document.querySelectorAll('#saver ' + s)].map((e) => e.getBoundingClientRect()).map((b) => [b.left, b.top]),
      s
    );
  await app.page.waitForTimeout(300);
  const c1 = await box('.sv-cloud');
  // spread out: some on the left half, some on the right, not stacked in one place
  expect(c1.some(([x]) => x < 600)).toBe(true);
  expect(c1.some(([x]) => x > 840)).toBe(true);
  expect(new Set(c1.map(([x]) => Math.round(x / 100))).size).toBeGreaterThan(3);
  await app.page.waitForTimeout(1500);
  const c2 = await box('.sv-cloud');
  expect(c2.filter(([x], i) => x > c1[i][0]).length).toBeGreaterThan(4); // drifting with the wind
  // the sun: rising on the left, high in the middle, low on the right
  const sunAt = async (p) => {
    await app.run((p) => sceneAt(p), p);
    return (await box('.sv-sun'))[0];
  };
  const [x1, y1] = await sunAt(0.05),
    [x2, y2] = await sunAt(0.24),
    [x3, y3] = await sunAt(0.45);
  expect(x1).toBeLessThan(x2);
  expect(x2).toBeLessThan(x3);
  expect(y2).toBeLessThan(y1);
  expect(y2).toBeLessThan(y3);
  // night: the moon is up, the stars show and the church windows are lit
  await app.run(() => sceneAt(0.76));
  const night = await app.run(() => [
    +getComputedStyle(document.querySelector('#saver .sv-moon')).opacity,
    +getComputedStyle(document.querySelector('#saver .sv-stars')).opacity,
    +getComputedStyle(document.querySelector('#saver .sv-church .win')).opacity,
  ]);
  expect(night.every((v) => v > 0.8)).toBe(true);
  // a boat is on the water and moving
  const b1 = (await box('.sv-boat')).map(([x]) => x);
  await app.page.waitForTimeout(1200);
  const b2 = (await box('.sv-boat')).map(([x]) => x);
  expect(b1.some((x, i) => x > -200 && x < 1440 && Math.abs(x - b2[i]) > 2)).toBe(true);
  expect(app.errors).toEqual([]);
});

test('v19.18.4: the sun sinks below the horizon and fades at sunset, and rises the same way (no vanishing)', async ({
  app,
}) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.page.emulateMedia({ reducedMotion: 'no-preference' });
  await app.call('saverTry');
  await app.page.waitForTimeout(200);
  const sun = (p) =>
    app.run((p) => {
      sceneAt(p);
      const e = document.querySelector('#saver .sv-sun'),
        b = e.getBoundingClientRect();
      return [+getComputedStyle(e).opacity, (b.top + b.height / 2) / innerHeight];
    }, p);
  const seen = [];
  for (let p = 0.44; p <= 0.6; p += 0.004) seen.push(await sun(p));
  // fades step by step: never a sudden drop
  for (let i = 1; i < seen.length; i++) expect(seen[i - 1][0] - seen[i][0]).toBeLessThan(0.2);
  // it is below the horizon (68% down) before it has gone completely
  const lastShown = seen.filter(([o]) => o > 0).pop();
  expect(lastShown[1]).toBeGreaterThan(0.68);
  // sunrise the same way round
  const rise = [];
  for (let p = 0.96; p <= 1.06; p += 0.004) rise.push(await sun(p % 1));
  for (let i = 1; i < rise.length; i++) expect(rise[i][0] - rise[i - 1][0]).toBeLessThan(0.2);
  expect(app.errors).toEqual([]);
});
