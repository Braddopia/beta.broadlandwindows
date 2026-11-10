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

test('My Holiday shows days left in a ring, the numbers beside it, and previous holidays', async ({ app }) => {
  await app.role('staff');
  await app.go('home');
  const ring = app.page.locator('.hring');
  await expect(ring).toContainText('Days Left');
  const big = await ring.locator('b').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  const other = await app.page
    .locator('.hlist dd')
    .first()
    .evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(big).toBeGreaterThan(other * 1.6);
  await expect(app.page.locator('.hlist')).toContainText('Allowance');
  await expect(app.page.locator('.hrows')).toContainText('Previous');
  // the same panel on My Calendar
  await app.go('fitting');
  await expect(app.page.locator('#main .hring')).toBeVisible();
  await app.page.click('text=All My Holidays');
  await expect(app.page.locator('#mbox h2')).toContainText('All Holidays');
});
