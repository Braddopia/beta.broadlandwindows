// v19.16.2 screen saver: after a while with no activity the opening animation plays on a loop with a clock; any
// movement closes it, and the click that wakes it does not press anything beneath.
const { test, expect } = require('../helpers');

test('starts after the chosen time without activity, and any movement closes it', async ({ app }) => {
  await app.role('beta');
  await app.go('leads');
  await app.page.evaluate(() => localStorage.setItem('bb_saver', '0.05')); // 3 seconds, for the test
  const saver = app.page.locator('#saver');
  await expect(saver).toHaveClass(/on/, { timeout: 8000 });
  await expect(saver.locator('.sp-line')).toHaveCount(1); // the opening screen's crane
  await expect(saver.locator('.sv-time')).toHaveText(/^\d\d:\d\d$/);
  await expect(saver.locator('.sv-date')).toContainText('November');
  await app.page.waitForTimeout(800);
  await app.page.mouse.move(400, 300);
  await app.page.mouse.move(420, 320);
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
  await expect(row.locator('.seg2 button.on')).toHaveText('5 min');
  await row.locator('.seg2 button:text-is("Off")').click();
  expect(await app.page.evaluate(() => localStorage.getItem('bb_saver'))).toBe('0');
  await expect(app.page.locator('#main .set-r', { hasText: 'Screen Saver' }).locator('.seg2 button.on')).toHaveText(
    'Off'
  );
});

test('it never covers the Floor Boards TV display', async ({ app }) => {
  await app.role('beta');
  await app.run(() => document.body.classList.add('tv'));
  await app.call('saverTry');
  await expect(app.page.locator('#saver.on')).toHaveCount(0);
});
