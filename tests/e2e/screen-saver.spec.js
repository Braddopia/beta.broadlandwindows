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
  await expect(saver.locator('.sv-cloud')).toHaveCount(5);
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
