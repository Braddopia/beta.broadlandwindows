// v19.18.4: the owner's follow-ups: stock-take areas, aluminium-only bar profiles, simpler inventory reports, the
// Hallmark feed on Deliveries.
const { test, expect } = require('../helpers');

test.beforeEach(async ({ app }) => {
  await app.role('beta');
});

test('Stock-Take Area is a drop-down of the racks and containers, TEXT-NUMBER', async ({ app }) => {
  await app.go('stock');
  await app.call('stockForm', 'add');
  const o = await app.page.locator('#f_area option').allTextContents();
  expect(o).toContain('BTSS-01');
  expect(o).toContain('BTSS-40');
  expect(o).toContain('BTDR-17');
  expect(o).toContain('BTWIN-40');
  expect(o).toContain('Sobinco');
  expect(o).toEqual(expect.arrayContaining(['Red Container', 'Grey Container', 'Blue Container', 'Green Container']));
  expect(o.indexOf('BTSS-40')).toBeLessThan(o.indexOf('Sobinco'));
  expect(o.indexOf('Sobinco')).toBeLessThan(o.indexOf('BTDR-01'));
  expect(app.errors).toEqual([]);
});

test('inventory reports: the stock list says where and how many; supplier only on a Detailed report', async ({
  app,
}) => {
  await app.go('stock');
  const run = async (code, detailed) => {
    await app.call('invRep');
    if (detailed) await app.page.check('#rdet');
    const [w] = await Promise.all([app.nextPopup(), app.call('invRun', code)]);
    await w.waitForLoadState();
    return w.evaluate(() => [...document.querySelectorAll('th')].map((t) => t.textContent.trim()));
  };
  const plain = await run('all');
  expect(plain.slice(0, 7)).toEqual(['Location', 'Area', 'Item', 'Description', 'Length', 'Colours', 'Qty']);
  expect(plain).not.toContain('Supplier');
  expect(plain).not.toContain('Cost');
  const det = await run('all', true);
  expect(det).toContain('Supplier');
  expect(det).toContain('Cost');
  const find = await run('find');
  expect(find).toEqual(['Item', 'Description', 'Length', 'Colours', 'Where', 'Qty']);
  expect(app.errors).toEqual([]);
});

test('a contract opens in the page area: the side menu stays, and using it closes the record (asking first if changed)', async ({
  app,
}) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.run(() => localStorage.removeItem('bb_rw_full'));
  await app.openContract('1023421');
  const [mb, side] = await app.run(() => [
    document.querySelector('#mbox').getBoundingClientRect().left,
    document.querySelector('.side').getBoundingClientRect().right,
  ]);
  expect(mb).toBeGreaterThanOrEqual(side);
  await expect(app.page.locator('.side')).toBeVisible();
  // changed: the side menu asks first
  await app.run(() => (recordWin.dirty = 1));
  await app.page.click('.side >> text=Deliveries');
  await expect(app.page.locator('#rwAsk')).toBeVisible();
  await app.page.click('#rwAsk [data-act=closeModal]');
  await expect(app.page.locator('#modal')).not.toHaveClass(/open/);
  // not changed: it simply goes
  await app.openContract('1023421');
  await app.page.click('.side >> text=Deliveries');
  await expect(app.page.locator('#modal')).not.toHaveClass(/open/);
  expect(await app.run(() => document.body.dataset.view)).toBe('deliveries');
  expect(app.errors).toEqual([]);
});

test('Deliveries: the month fits on one screen; the Hallmark Feed bar is on the List view', async ({ app }) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.go('deliveries');
  await expect(app.page.locator('#main')).not.toContainText('Hallmark Feed');
  const bottom = await app.run(() => document.querySelector('#main .dcal-g').getBoundingClientRect().bottom);
  expect(bottom).toBeLessThanOrEqual(900);
  await app.run(() => setUI('del.v', 'list'));
  await expect(app.page.locator('#main')).toContainText('Hallmark Feed');
  expect(app.errors).toEqual([]);
});
