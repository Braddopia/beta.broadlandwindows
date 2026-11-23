// Inventory, Stock Lists: locations, product groups and colour codes linked to RAL (from the office stock sheet).
const { test, expect } = require('../helpers');

test('Stock Lists: an administrator adds a location and links a colour code; products pick from the lists', async ({
  app,
}) => {
  await app.role('beta');
  await app.go('stock');
  await app.page.click('#main [data-act=invLists]');
  await expect(app.page.locator('#mbox h2')).toHaveText('Stock Lists');
  /* the stock sheet's locations and groups are there to start with */
  await expect(app.page.locator('#mbox .sl-list input').first()).toHaveValue('Door Locks');
  await app.page.click('#mbox button:has-text("+ Add Location")');
  await app.page.locator('#mbox .sl-r input').last().fill('Bench 2');
  await app.page.click('#mbox .sl-tabs button:has-text("Product Groups")');
  await expect(app.page.locator('#mbox .sl-list input')).toHaveCount(7);
  /* colour codes: KL016 is already RAL 7032 Matt; link SEN012 to RAL 7016 Satin */
  await app.page.click('#mbox .sl-tabs button:has-text("Colour Codes")');
  await expect(app.page.locator('#mbox .sl-c:has(input[value="KL016"]) .sl-t')).toHaveText('KL016 (RAL 7032 Matt)');
  const row = app.page.locator('#mbox .sl-c').filter({ has: app.page.locator('input[value="SEN012"]') });
  await row.locator('input').nth(1).fill('7016');
  await row.locator('select').selectOption('Satin');
  /* a wrong RAL number is refused */
  await app.page.click('#mbox button:has-text("+ Add Colour Code")');
  const last = app.page.locator('#mbox .sl-c').last();
  await last.locator('input').nth(0).fill('zz1');
  await last.locator('input').nth(1).fill('1234');
  await app.page.click('#mbox [data-act=listsSave]');
  await expect(app.page.locator('#toast.bad')).toContainText('not a RAL colour number');
  await last.locator('input').nth(1).fill('9016');
  await app.page.click('#mbox [data-act=listsSave]');
  const L = await app.run(() => state.stockLists);
  expect(L.locs).toContain('Bench 2');
  expect(L.colours.find((c) => c.code == 'SEN012')).toEqual({ code: 'SEN012', ral: '7016', fin: 'Satin' });
  expect(L.colours.find((c) => c.code == 'ZZ1')).toEqual({ code: 'ZZ1', ral: '9016', fin: '' });

  /* a product: location and group from the lists; typing a code in a colour box links it */
  const pid = await app.run(() => products()[0].pid);
  await app.call('editItem', pid);
  await app.page.selectOption('#f_location', 'Bench 2');
  await app.page.selectOption('#f_group', 'Door Cylinders');
  await app.page.selectOption('#f_unit', 'Kit');
  await app.page.fill('#f_cInName', 'sen012');
  await app.page.dispatchEvent('#f_cInName', 'change');
  await expect(app.page.locator('#f_cInName')).toHaveValue('SEN012 (RAL 7016 Satin)');
  await app.page.click('#mbox [data-act=ieSave]');
  const p = await app.run((id) => products().find((r) => r.pid == id), pid);
  expect([p.location, p.group, p.unit, p.cInName]).toEqual([
    'Bench 2',
    'Door Cylinders',
    'Kit',
    'SEN012 (RAL 7016 Satin)',
  ]);
  /* the colour picker offers the linked codes, and finds a code by its RAL number */
  await app.call('editItem', pid);
  await app.call('cpOpen', 'cOutName');
  await expect(app.page.locator('#cpop .cp-codes')).toContainText('KL016');
  await app.page.fill('#cpRal', '7032');
  await app.page.dispatchEvent('#cpRal', 'input');
  await expect(app.page.locator('#cpSug')).toContainText('KL016 (RAL 7032 Matt)');
  await app.closeAll();
  /* the Inventory filter by group finds it */
  await app.run(() => {
    uiState.inv.grp = 'Door Cylinders';
    render();
  });
  await expect(app.page.locator('#main .t-inv tbody tr')).toHaveCount(1);
  expect(app.errors).toEqual([]);
});

test('Stock Lists are for administrators; a standard user does not see the button', async ({ app }) => {
  await app.role('staff');
  await app.go('stock');
  await expect(app.page.locator('#main [data-act=invLists]')).toHaveCount(0);
});
