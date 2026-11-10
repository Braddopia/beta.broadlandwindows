// The service-call map and the Panel Optimiser.
const { test, expect } = require('../helpers');

test('service calls on a map of Norfolk: a pin per town, click one to list its calls', async ({ app }) => {
  await app.role('beta');
  await app.go('service');
  await app.run(() => setUI('svc.f', 'all'));
  await app.page.click('#main .seg2 >> text=Map');
  await expect(app.page.locator('#main .smap .land')).toHaveCount(1);
  const pins = app.page.locator('#main .pin');
  expect(await pins.count()).toBeGreaterThan(1);
  await app.page.locator('#main .pin[aria-label^="Norwich"]').dispatchEvent('click');
  await expect(app.page.locator('#main .smap-l h2')).toContainText('Norwich');
  const ids = await app.run(() =>
    state.calls.filter((c) => (c.town || '').toLowerCase() == 'norwich').map((c) => c.id)
  );
  for (const id of ids) await expect(app.page.locator('#main .smap-l')).toContainText(id);
  await app.page.click('#main .smap-l >> text=All Towns');
  await expect(app.page.locator('#main .smap-l h2')).toContainText('Towns');
  // standard users have the map too
  await app.role('staff');
  await app.go('service');
  await expect(app.page.locator('#main .smap')).toHaveCount(1);
  expect(app.errors).toEqual([]);
});

test('Panel Optimiser: change a piece, the plan updates; save, reopen and print it', async ({ app }) => {
  await app.role('staff');
  await app.go('cutting');
  await expect(app.page.locator('#main h1')).toHaveText('Panel Optimiser');
  await expect(app.page.locator('#main .cut-b')).toHaveCount(1);
  // more shelves than fit on one board
  // the plan updates while typing, and the box keeps its place
  await app.page.fill('#cut_parts_1_qty', '12');
  await expect(app.page.locator('#main .cut-b')).toHaveCount(4);
  await expect(app.page.locator('#cut_parts_1_qty')).toBeFocused();
  await expect(app.page.locator('#cutKpis')).toContainText('4');
  expect(await app.run(() => state.cut.parts[1].qty)).toBe(12);
  // a piece bigger than the board is reported, not lost
  await app.page.click('#main >> text=+ Add Piece');
  await app.page.fill('#cut_parts_2_L', '3000');
  await expect(app.page.locator('#main .note.bad')).toContainText('would not fit');
  await app.page.click('#main .cut-t >> nth=1 >> [aria-label="Remove row 3"]');
  await expect(app.page.locator('#main .note.bad')).toHaveCount(0);
  // save under a name, start again, reopen
  await app.page.click('#main .tools >> text=/^Save$/');
  await app.page.fill('#f_name', 'Sample kitchen');
  await app.page.click('#saveBtn');
  await app.call('closeModal');
  await app.page.click('#main >> text=New List');
  await app.page.click('.aski >> text=Start New');
  await expect(app.page.locator('#main .cut-b')).toHaveCount(0);
  await app.page.click('#main >> text=Saved Lists (1)');
  await app.page.click('#mbox >> text=Open');
  await expect(app.page.locator('#main .cut-b')).toHaveCount(4);
  // print
  const [w] = await Promise.all([app.nextPopup(), app.page.click('#main >> text=Print Plan')]);
  await w.waitForLoadState();
  // the company's standard A4 portrait report
  await expect(w.locator('h1')).toHaveText('Cutting Plan');
  await expect(w.locator('.pg')).toContainText('Sample kitchen');
  await expect(w.locator('.ih img')).toHaveCount(1);
  await expect(w.locator('.cut-b')).toHaveCount(4);
  await expect(w.locator('table.dt').first()).toContainText('Name');
  await w.close();
  expect(app.errors).toEqual([]);
});

test('Panel Optimiser: the Smarts Aluminium boards are one click away', async ({ app }) => {
  await app.role('beta');
  await app.go('cutting');
  await app.page.click('#main .cut-pre >> text=Smarts Aluminium Half');
  expect(await app.run(() => state.cut.sheets.map((s) => [s.label, s.L, s.W]))).toContainEqual([
    'Smarts Aluminium Half',
    1195,
    1200,
  ]);
  await app.page.click('#main .cut-pre >> text=Smarts Aluminium Half');
  await expect(app.page.locator('.toast')).toContainText('already listed');
});

test('Remove Stock has Scan buttons for the Stock ID and the item code', async ({ app }) => {
  await app.role('staff');
  await app.go('stock');
  await app.call('stockForm', 'remove');
  await expect(app.page.locator('#mbox .ff:has(#f_pid) .scan')).toHaveCount(1);
  await expect(app.page.locator('#mbox .ff:has(#f_item) .scan')).toHaveCount(1);
  await app.page.click('#mbox .ff:has(#f_pid) .scan');
  await expect(app.page.locator('#scanner')).toHaveClass(/open/);
});
