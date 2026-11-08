// Service calls, deliveries, stock and holidays.
const { test, expect } = require('../helpers');

test('standard user: service call from an existing contract fills in and saves', async ({ app }) => {
  await app.role('staff');
  expect(await app.run(() => canSee('service'))).toBe(true);
  await app.go('service');
  expect(await app.run(() => document.querySelectorAll('#main .mini.del').length)).toBe(0);
  await app.call('editCall');
  await app.page.selectOption('#f_existing', { index: 0 });
  await app.page.fill('#f_contract', '2402318');
  await app.page.dispatchEvent('#f_contract', 'change');
  expect(await app.run(() => [document.querySelector('#f_name').value, document.querySelector('#f_town').value])).toEqual(['Sample Customer E', 'Aylsham']);
  await app.page.selectOption('#f_cat', { index: 1 });
  await app.page.fill('#f_issue', 'Handle stiff on back door');
  await app.page.fill('#f_visit', '2026-11-08');
  await app.page.click('#saveBtn');
  const c = await app.run(() => S.calls[0]);
  expect([c.status, c.contract, c.takenBy]).toEqual(['Booked', '2402318', 'Demo User']);
});

test('service call cannot close without a completion date', async ({ app }) => {
  await app.role('beta');
  await app.call('editCall', 'S-0871');
  await app.page.selectOption('#f_status', 'Complete');
  await app.page.click('#saveBtn');
  expect(await app.run(() => S.calls.find((c) => c.id === 'S-0871').status)).not.toBe('Complete');
  expect(await app.run(() => !!document.querySelector('#modal.open'))).toBe(true);
});

test('service visits show on the calendar for every role that can see them', async ({ app }) => {
  for (const role of ['staff', 'beta']) {
    await app.role(role);
    expect(await app.run(() => evs('2026-11-09').map((e) => e.t).join('|')), role).toContain('Service: Sample Customer I');
  }
});

test('day sheet and service report print', async ({ app }) => {
  await app.role('beta');
  for (const fn of ['svcReport', 'invoicePrint']) {
    const [w] = await Promise.all([app.nextPopup(), fn === 'svcReport' ? app.call(fn) : app.call(fn, '2402318')]);
    await w.waitForLoadState();
    await w.close();
  }
});

test('delivery status follows the due date', async ({ app }) => {
  const s = await app.run(() => [addDays(-1), today(), addDays(2), addDays(6), addDays(20)].map((d) => dAuto({ due: d })));
  expect(s).toEqual(['Overdue', 'Due today', 'In transit', 'Due', 'Ordered']);
  expect(await app.run(() => dAuto({ due: addDays(-3), status: 'Received' }))).toBe('Received');
});

test('receiving a delivery asks who checked it', async ({ app }) => {
  await app.role('beta');
  await app.call('recvD', 'D-1');
  await app.page.waitForSelector('#f_status');
  expect(await app.run(() => document.querySelector('#f_status').value)).toBe('Received');
  await app.page.click('#saveBtn');
  expect(await app.run(() => S.deliveries.find((d) => d.id === 'D-1').status)).not.toBe('Received');
});

test('stock movements keep their own "stock after" figure', async ({ app }) => {
  await app.role('beta');
  const r = await app.run(() => {
    const k = products()[0].pid, before = prodRows(k).map((x) => x.stock).join(',');
    stockForm('add', k);
    document.querySelector('#f_qty').value = 5;
    ieSave();
    return [before, prodRows(k).map((x) => x.stock).join(','), products().find((x) => x.pid === k).stock];
  });
  expect(r).toEqual(['62', '67,62', 67]);
});

test('phone: stock page becomes big handheld buttons', async ({ app }) => {
  await app.page.setViewportSize({ width: 390, height: 844 });
  await app.role('beta');
  await app.go('stock');
  expect(await app.run(() => document.querySelectorAll('.pda-b').length)).toBe(6);
});

test('holiday days skip bank holidays and the Christmas shutdown; impossible dates are refused', async ({ app }) => {
  expect(await app.run(() => [holDays('2026-12-21', '2026-12-31'), wd('2026-12-21', '2026-12-31')])).toEqual([2, 9]);
  expect(await app.run(() => [SAFE.date('2026-02-30'), SAFE.date('2026-02-28'), SAFE.date('2024-02-29')])).toEqual(['', '2026-02-28', '2024-02-29']);
});
