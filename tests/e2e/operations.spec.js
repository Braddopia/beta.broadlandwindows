// Service calls, deliveries, stock and holidays.
const { test, expect } = require('../helpers');

test('standard user: new service call step by step, from an existing contract', async ({ app }) => {
  await app.role('staff');
  expect(await app.run(() => canSee('service'))).toBe(true);
  await app.go('service');
  expect(await app.run(() => document.querySelectorAll('#main .mini.del').length)).toBe(0);
  await app.call('editCall');
  await expect(app.page.locator('#mbox .stp.wz')).toContainText('Customer');
  await app.page.selectOption('#f_existing', { index: 0 });
  await app.page.fill('#f_contract', '2402318');
  await app.page.dispatchEvent('#f_contract', 'change');
  expect(
    await app.run(() => [document.querySelector('#f_name').value, document.querySelector('#f_town').value])
  ).toEqual(['Sample Customer E', 'Aylsham']);
  await app.call('wzStep', 1);
  await app.page.selectOption('#f_cat', { index: 1 });
  await app.page.fill('#f_issue', 'Handle stiff on back door');
  await app.call('wzStep', 1);
  await expect(app.page.locator('#mbox .wz-info')).toContainText('2402318');
  await app.call('wzStep', 1);
  await app.page.fill('#f_visit', '2026-11-08');
  await app.call('wzStep', 1);
  await app.call('wzSave');
  const c = await app.run(() => state.calls[0]);
  expect([c.status, c.contract, c.takenBy, c.issue]).toEqual([
    'Booked',
    '2402318',
    'Demo User',
    'Handle stiff on back door',
  ]);
});

test('new service call for a new customer needs phone, address and town', async ({ app }) => {
  await app.role('staff');
  await app.call('editCall');
  await app.page.selectOption('#f_existing', 'No, new customer');
  await app.page.fill('#f_name', 'Sample Caller');
  await app.call('wzStep', 1);
  await expect(app.page.locator('.toast')).toContainText('phone');
  expect(await app.run(() => WZ.st)).toBe(0);
});

test('service call cannot close without a completion date', async ({ app }) => {
  await app.role('beta');
  await app.call('editCall', 'S-0871');
  // changing a call uses the same steps as a new one, plus Work Done
  await expect(app.page.locator('.stp.wz span')).toHaveText([
    /Customer/,
    /Problem/,
    /Check/,
    /Visit/,
    /Work Done/,
    /Photos/,
    /Review/,
  ]);
  await app.call('wzGo', 3);
  await app.page.selectOption('#f_status', 'Complete');
  await app.call('wzSave');
  expect(await app.run(() => state.calls.find((c) => c.id === 'S-0871').status)).not.toBe('Complete');
  expect(await app.run(() => WZ.steps[WZ.st].t)).toBe('Work Done');
  await expect(app.page.locator('.toast')).toContainText('date the work was completed');
});

test('service visits show on the calendar for every role that can see them', async ({ app }) => {
  for (const role of ['staff', 'beta']) {
    await app.role(role);
    expect(
      await app.run(() =>
        evs('2026-11-09')
          .map((e) => e.t)
          .join('|')
      ),
      role
    ).toContain('Service: Sample Customer I');
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
  const s = await app.run(() =>
    [addDays(-1), today(), addDays(2), addDays(6), addDays(20)].map((d) => dAuto({ due: d }))
  );
  expect(s).toEqual(['Overdue', 'Due today', 'In transit', 'Due', 'Ordered']);
  expect(await app.run(() => dAuto({ due: addDays(-3), status: 'Received' }))).toBe('Received');
});

test('receiving a delivery asks who checked it', async ({ app }) => {
  await app.role('beta');
  await app.call('recvD', 'D-1');
  await app.page.waitForSelector('#f_status');
  expect(await app.run(() => document.querySelector('#f_status').value)).toBe('Received');
  await app.page.click('#saveBtn');
  expect(await app.run(() => state.deliveries.find((d) => d.id === 'D-1').status)).not.toBe('Received');
});

test('stock movements keep their own "stock after" figure', async ({ app }) => {
  await app.role('beta');
  const r = await app.run(() => {
    const k = products()[0].pid,
      before = prodRows(k)
        .map((x) => x.stock)
        .join(',');
    stockForm('add', k);
    document.querySelector('#f_qty').value = 5;
    ieSave();
    return [
      before,
      prodRows(k)
        .map((x) => x.stock)
        .join(','),
      products().find((x) => x.pid === k).stock,
    ];
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
  expect(await app.run(() => [SAFE.date('2026-02-30'), SAFE.date('2026-02-28'), SAFE.date('2024-02-29')])).toEqual([
    '',
    '2026-02-28',
    '2024-02-29',
  ]);
});

test('every reports tab draws, with the added trend and performance tables', async ({ app }) => {
  await app.role('beta');
  await app.go('reports');
  const want = {
    sales: 'Salesperson performance',
    contracts: 'Sales by salesperson',
    service: 'Engineer performance',
    deliveries: 'Supplier delivery record',
    people: 'Holiday by person',
    stock: 'Stock value by area',
  };
  for (const [t, title] of Object.entries(want)) {
    await app.run((t) => setUI('rep.t', t), t);
    await expect(app.page.locator('#main')).toContainText(title);
  }
  expect(app.errors).toEqual([]);
});
