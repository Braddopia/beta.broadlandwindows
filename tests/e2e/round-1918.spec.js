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

test('v19.18.5: colour boxes marked (A) or (B) say which is typically inside and outside', async ({ app }) => {
  await app.go('stock');
  await app.call('stockForm', 'add');
  await expect(app.page.locator('#mbox .ff:has(#f_cInName) .hint')).toHaveText('B – Typically Inside');
  await expect(app.page.locator('#mbox .ff:has(#f_cOutName) .hint')).toHaveText('A – Typically Outside');
  await app.closeAll();
  await app.go('tags');
  await expect(app.page.locator('.ff:has(#tag_0_cIn) .hint')).toHaveText('B – Typically Inside');
  await app.go('bars');
  await expect(app.page.locator('#main .bar-col').first()).toContainText('B – Typically Inside');
  expect(app.errors).toEqual([]);
});

test('v19.18.5: a long drop-down has a search box that narrows the list as you type', async ({ app }) => {
  await app.go('stock');
  await app.call('stockForm', 'add');
  await app.page.click('#f_area');
  const q = app.page.locator('#pkpop.open .pk-s input');
  await expect(q).toBeFocused();
  await app.page.keyboard.type('green');
  await expect(app.page.locator('#pkpop .pk-o')).toHaveText(['Green Container']);
  await app.page.keyboard.press('Enter');
  await expect(app.page.locator('#f_area')).toHaveValue('Green Container');
  // a short list stays as it was, with no search box
  await app.page.click('#f_unit');
  await expect(app.page.locator('#pkpop.open')).toBeVisible();
  await expect(app.page.locator('#pkpop .pk-s')).toHaveCount(0);
  expect(app.errors).toEqual([]);
});

test('v19.18.6 performance: a still page runs no animations and page surfaces are not blurred', async ({ app }) => {
  await app.page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const v of ['home', 'stock', 'contracts']) {
    await app.go(v);
    await app.page.mouse.move(5, 890);
    await app.page.waitForTimeout(200);
    const r = await app.run(() => ({
      running: document
        .getAnimations()
        .filter((a) => a.playState == 'running' && a.effect.getTiming().iterations == Infinity).length,
      blurred: [...document.querySelectorAll('.panel,.kpi,.tw,.side,.top')].filter(
        (e) => getComputedStyle(e).backdropFilter != 'none'
      ).length,
    }));
    expect(r, v).toEqual({ running: 0, blurred: 0 });
  }
  // dates shown the same as before
  expect(await app.run(() => [fd('2026-11-08'), fdl('2026-11-08'), fd(''), isWk('2026-11-08')])).toEqual([
    '8 Nov',
    '8 November 2026',
    'Not set',
    false,
  ]);
  expect(app.errors).toEqual([]);
});
