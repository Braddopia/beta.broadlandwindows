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
  await app.page.fill('#cut_parts_1_qty', '12');
  await app.page.locator('#cut_parts_1_qty').blur();
  await expect(app.page.locator('#main .cut-b')).toHaveCount(3);
  expect(await app.run(() => state.cut.parts[1].qty)).toBe(12);
  // a piece bigger than the board is reported, not lost
  await app.page.click('#main >> text=+ Add Piece');
  await app.page.fill('#cut_parts_2_L', '3000');
  await app.page.locator('#cut_parts_2_L').blur();
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
  await expect(app.page.locator('#main .cut-b')).toHaveCount(3);
  // print
  const [w] = await Promise.all([app.nextPopup(), app.page.click('#main >> text=Print Plan')]);
  await w.waitForLoadState();
  await expect(w.locator('h1')).toContainText('Sample kitchen');
  await expect(w.locator('svg')).toHaveCount(3);
  await w.close();
  expect(app.errors).toEqual([]);
});
