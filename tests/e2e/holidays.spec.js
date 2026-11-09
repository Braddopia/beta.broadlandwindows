// Booking holiday: paid or unpaid must be chosen; unpaid leave does not use the allowance.
const { test, expect } = require('../helpers');

test('paid or unpaid is required, and unpaid leave keeps the allowance', async ({ app }) => {
  await app.role('beta');
  const sid = await app.run(() => state.staff[0].id);
  const left = () =>
    app.run(
      (id) =>
        holLeft(
          state.staff.find((s) => s.id == id),
          2026
        ),
      sid
    );
  const before = await left();
  await app.call('holBook', sid, '2026-11-16');
  await app.page.fill('#ht', '2026-11-17');
  await app.page.click('#mbox [data-act=holSave]');
  await expect(app.page.locator('#mbox .paidq')).toHaveClass(/bad/);
  await app.page.check('input[name=hpaid][value=unpaid]');
  await app.page.click('#mbox [data-act=holSave]');
  const h = await app.run(() => state.hols[state.hols.length - 1]);
  expect([h.paid, h.days]).toEqual([false, 2]);
  expect(await left()).toBe(before);
  expect(
    await app.run(
      (id) =>
        absCode(
          state.staff.find((s) => s.id == id),
          '2026-11-16'
        ),
      sid
    )
  ).toBe('U');
});

test('My Holiday shows days left large, and previous holidays', async ({ app }) => {
  await app.role('staff');
  await app.go('home');
  const big = await app.page.locator('.hl .big b').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  const other = await app.page
    .locator('.hl > div:not(.big) b')
    .first()
    .evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(big).toBeGreaterThan(other * 1.6);
  await expect(app.page.locator('.hprev')).toContainText('Previous Holidays');
  await app.page.click('text=All My Holidays');
  await expect(app.page.locator('#mbox h2')).toContainText('All Holidays');
});
