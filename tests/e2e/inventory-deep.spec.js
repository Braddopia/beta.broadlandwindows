// Inventory, tested hard: the problems found by clicking through every part of it, so they stay fixed.
const { test, expect } = require('../helpers');
const fs = require('fs');
const os = require('os');
const path = require('path');

const total = (app) => app.run(() => products().reduce((a, r) => a + (+r.stock || 0), 0));

test('the first tiles do something: Products shows everything, Units and Value sort the list', async ({ app }) => {
  await app.role('beta');
  await app.go('stock');
  await app.page.click('#main .kpi:has-text("Units On Shelf")');
  expect(await app.run(() => [uiState.inv.sort, uiState.inv.dir])).toEqual(['stock', -1]);
  await app.page.click('#main .kpi:has-text("Stock Value")');
  expect(await app.run(() => [uiState.inv.sort, uiState.inv.dir])).toEqual(['value', -1]);
  await app.page.click('#main .chip:has-text("Low")');
  await app.page.click('#main .kpi:has-text("Products")');
  expect(await app.run(() => [uiState.inv.f, uiState.inv.sort, uiState.inv.dir])).toEqual(['all', 'item', 1]);
  await expect(app.page.locator('#toast')).toContainText('Showing all');
});

test('deleting a history entry never changes stock or loses the product, and can be undone', async ({ app }) => {
  await app.role('beta');
  await app.go('stock');
  const t0 = await total(app),
    n0 = await app.run(() => products().length);
  await app.run(() => setUI('inv.v', 'moves'));
  /* delete the newest entry of several products, one by one */
  for (let i = 0; i < 3; i++) {
    await app.page.locator('#main tbody button[aria-label="Delete entry"]').first().click();
    await app.page.click('#mbox [data-act=askGo]');
    await expect(app.page.locator('#toast')).toContainText('Entry deleted');
  }
  expect(await total(app)).toBe(t0);
  expect(await app.run(() => products().length)).toBe(n0);
  await app.page.click('#toast .tp-a');
  expect(await total(app)).toBe(t0);
  expect(app.errors).toEqual([]);
});

test('rejecting a request and clearing an alert say so, with Undo', async ({ app }) => {
  await app.role('beta');
  await app.go('stock');
  await app.run(() => setUI('inv.v', 'moves'));
  await app.page.click('#main tr:has-text("Pending") button:has-text("Reject") >> nth=0');
  await expect(app.page.locator('#toast')).toContainText('rejected');
  await app.page.click('#toast .tp-a');
  expect(await app.run(() => state.items.filter((r) => r.reqStatus == 'Rejected').length)).toBe(0);
  await app.page.click('#main tr:has-text("Alert") button:has-text("Clear") >> nth=0');
  await expect(app.page.locator('#toast')).toContainText('Alert cleared');
});

test('Add Stock / Remove Stock in the product window, and a batch remove never takes more than is there', async ({
  app,
}) => {
  await app.role('beta');
  await app.go('stock');
  const pid = await app.run(() => products().find((r) => r.stock > 0 && r.stock < 20).pid);
  const have = await app.run((p) => products().find((r) => r.pid == p).stock, pid);
  await app.page.locator(`#main .t-inv tbody tr:has(code:text-is("${pid}")) input[type=checkbox]`).check();
  await app.page.click('#main .selbar button:has-text("Remove Stock")');
  await app.page.fill('#mbox #f_qty', String(have + 50));
  await app.page.click('#mbox .mact .btn:not(.ghost)');
  await expect(app.page.locator('#toast')).toContainText('so all of theirs was removed');
  const last = await app.run((p) => prodRows(p)[0], pid);
  expect([last.stock, last.qty]).toEqual([0, have]);
});

test('Batch Add: an existing product keeps its description and group; locations match the list in any case', async ({
  app,
}) => {
  await app.role('beta');
  await app.go('stock');
  await app.run(() => {
    const p = products().find((r) => r.item == 'KL010');
    prodRows(p.pid).forEach((x) => Object.assign(x, { desc: 'Packer 10mm', group: 'Window Accessories' }));
  });
  const p0 = await app.run(() => products().find((r) => r.item == 'KL010'));
  await app.call('invNew');
  await app.page.fill(
    '#bn',
    [
      ['KL010', 3, '1.10', p0.supplier, p0.location, p0.length, p0.cInName, p0.cOutName, 'PCS'].join('\t'),
      ['NEWLINE1', 2, '1.00', p0.supplier, 'door locks'].join('\t'),
    ].join('\n')
  );
  await app.page.click('#mbox [data-act=invNewRun]');
  const p1 = await app.run((pid) => products().find((r) => r.pid == pid), p0.pid);
  expect([p1.stock, p1.desc, p1.group]).toEqual([p0.stock + 3, 'Packer 10mm', 'Window Accessories']);
  expect(await app.run(() => products().find((r) => r.item == 'NEWLINE1').location)).toBe('Door Locks');
});

test('typing counts in a stock take does not break the page', async ({ app }) => {
  await app.role('beta');
  await app.go('stock');
  await app.run(() => setUI('inv.v', 'take'));
  await app.call('takeStart');
  await app.page.click('#mbox .mact .btn:not(.ghost)');
  await expect(app.page.locator('#toast.big')).toContainText('Stock Take Started');
  const boxes = app.page.locator('#main input.cnt');
  await boxes.nth(0).fill('5');
  await boxes.nth(0).press('Enter');
  await boxes.nth(1).fill('7');
  await boxes.nth(1).press('Tab');
  await expect(app.page.locator('#main .tk-done')).toHaveCount(2);
  await app.page.click('#main button:has-text("Finish And Apply Counts")');
  await expect(app.page.locator('#mbox h2')).toContainText('Apply 2 counts');
  expect(app.errors).toEqual([]);
});

test('importing a stock sheet with no colours does not double up products that share a code', async ({ app }) => {
  await app.role('beta');
  await app.go('stock');
  const f = path.join(os.tmpdir(), 'bb-take-' + Date.now() + '.csv');
  fs.writeFileSync(
    f,
    'Area,Stock Code,Description,Quantity In Stock\nMain,ACET848,,61\nMain,VG920,,9\nMain,NEWONE,New thing,2\n'
  );
  const n0 = await app.run(() => products().length);
  await app.run(() => setUI('inv.v', 'take'));
  await app.page.click('#main button:has-text("Import Stock Sheet") >> nth=0');
  await app.page.setInputFiles('#mbox input[type=file]', f);
  await expect(app.page.locator('#mbox .tk-uns')).toContainText('ACET848');
  await app.page.click('#mbox [data-act=takeImportRun]');
  /* VG920 (one product) is matched, NEWONE is new, the three ACET848 products are left alone */
  expect(await app.run(() => products().length)).toBe(n0 + 1);
  expect(await app.run(() => products().filter((r) => r.item == 'ACET848').length)).toBe(3);
  fs.unlinkSync(f);
});

test('the tick-box cell is never cut short (that drew a stray dot beside the box)', async ({ app }) => {
  await app.role('beta');
  await app.go('stock');
  const cut = await app.run(() =>
    [...document.querySelectorAll('#main .t-inv tbody td:first-child')].map((td) => getComputedStyle(td).textOverflow)
  );
  expect(cut.length).toBeGreaterThan(0);
  expect(cut.every((x) => x == 'clip')).toBe(true);
});
