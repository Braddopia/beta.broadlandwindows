// Inventory: exact-code search, the stock-take import, counting, count sheets, Excel export and applying counts.
const path = require('path');
const { test, expect } = require('../helpers');

const SAMPLE = path.join(__dirname, '..', 'fixtures', 'stock-take-sample.xlsx');

test.beforeEach(async ({ app }) => {
  await app.role('beta');
  await app.go('stock');
});

const importSample = async (app) => {
  await app.run(() => setUI('inv.v', 'take'));
  await app.page.click('#main >> text=Import Stock Sheet >> nth=0');
  await app.page.setInputFiles('#mbox input[type=file]', SAMPLE);
  await expect(app.page.locator('#mbox')).toContainText('New Products');
  await app.page.click('#mbox >> text=/^Import \\d+ Lines$/');
  await expect(app.page.locator('#modal')).not.toHaveClass(/open/);
};

test('typing an exact Stock ID or code puts that product first and highlights it', async ({ app }) => {
  const code = await app.run(() => products()[3].item);
  await app.page.fill('#invQ', code.toLowerCase());
  await expect(app.page.locator('tr.xhit')).toHaveCount(1);
  await expect(app.page.locator('tbody tr').first()).toHaveClass(/xhit/);
  // the top search offers the same product first, and Enter opens it
  await app.page.fill('#sb input', code);
  await expect(app.page.locator('#sres .sri').first()).toHaveClass(/sri-x/);
});

test('import the stock sheet: one line per code and area, areas in sheet order', async ({ app }) => {
  await importSample(app);
  const r = await app.run(() => {
    const P = products().filter((p) => /sample/i.test(p.desc || ''));
    return {
      lines: P.map((p) => [p.nocode ? '' : p.item, p.area]).sort(),
      areas: state.stockAreas,
      moves: state.items.filter((x) => x.type == 'import' && x.qty == 0).length >= P.length,
    };
  });
  expect(r.lines).toEqual([
    ['', 'Stores'],
    ['SAMP100', 'Fitters Vans'],
    ['SAMP100', 'Stores'],
    ['SAMP200', 'Stores'],
    ['SAMP300', 'Fitters Vans'],
  ]);
  expect(r.areas).toEqual(['Stores', 'Fitters Vans']);
  expect(r.moves).toBe(true);
  // importing again updates instead of duplicating
  await importSample(app);
  expect(await app.run(() => products().filter((p) => /sample/i.test(p.desc || '')).length)).toBe(5);
});

test('count by area, print count sheets, export to Excel, then apply', async ({ app }) => {
  await importSample(app);
  await app.page.click('text=Start Stock Take');
  await app.page.click('#mbox >> text=Save');
  await app.page.click('.tk-areas >> text=Stores');
  const boxes = app.page.locator('input.cnt');
  await expect(boxes).toHaveCount(3);
  await boxes.nth(0).fill('12');
  await boxes.nth(0).press('Enter');
  await expect(app.page.locator('input.cnt').nth(1)).toBeFocused();
  await app.page.keyboard.type('4');
  await app.page.keyboard.press('Enter');
  await expect(app.page.locator('.kpis')).toContainText('2');

  await app.page.click('#main >> text=Count Sheets >> nth=0');
  await app.page.selectOption('#tkA', 'Stores');
  const [sheet] = await Promise.all([app.nextPopup(), app.page.click('#mbox >> text=/^Print$/')]);
  await sheet.waitForLoadState();
  await expect(sheet.locator('h1')).toHaveText('Stores');
  await expect(sheet.locator('thead th')).toHaveText(['Stock Code', 'Description', 'Quantity In Stock', 'Location', 'Notes']);
  await sheet.close();

  await app.page.click('#main >> text=Export To Excel >> nth=0');
  const [dl] = await Promise.all([app.page.waitForEvent('download'), app.page.click('text=With Counts So Far')]);
  expect(dl.suggestedFilename()).toMatch(/\.xlsx$/);
  const back = await app.page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const s = await window.CRM.readXlsx(new Blob([bin]));
    return s.find((x) => x.name == 'Stores').rows.slice(0, 3);
  }, require('fs').readFileSync(await dl.path()).toString('base64'));
  expect(back[0]).toEqual(['Stock Code', 'Description', 'Quantity In Stock', 'Location', 'Notes']);
  expect(back[1][2]).toBe(12);

  await app.page.click('text=Finish And Apply Counts');
  await app.page.click('#modal >> text=Apply counts');
  const after = await app.run(() => ({
    done: state.stakes[0].status,
    stock: products()
      .filter((p) => p.area == 'Stores' && /sample/i.test(p.desc))
      .map((p) => p.stock)
      .sort(),
    audit: state.audit[0].a,
  }));
  expect(after).toEqual({ done: 'done', stock: [0, 12, 4].sort(), audit: 'Stock take applied' });
});

test('standard users count blind and cannot apply', async ({ app }) => {
  await importSample(app);
  await app.page.click('text=Start Stock Take');
  await app.page.click('#mbox >> text=Save');
  await app.role('staff');
  await app.go('stock');
  await app.run(() => setUI('inv.v', 'take'));
  await expect(app.page.locator('#main')).not.toContainText('Finish And Apply Counts');
  await expect(app.page.locator('#main thead')).not.toContainText('System');
  expect(await app.run(() => (takeApply(), state.stakes[0].status))).toBe('open');
});
