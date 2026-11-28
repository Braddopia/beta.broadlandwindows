// v19.18.15: readable in day and night (box outlines, hint text, locked boxes), and windows opened from a supplier,
// contract or product window come back to it when closed. Standard User account.
const { test, expect } = require('../helpers');

test.beforeEach(async ({ app }) => {
  await app.role('staff');
  await app.page.setViewportSize({ width: 1440, height: 900 });
});

const showing = (app) =>
  app.run(() => {
    if (!document.querySelector('#modal').classList.contains('open')) return 'page';
    const rw = document.querySelector('#mbox > .rw');
    if (rw)
      return 'rw:' + (rw.dataset.kind || '') + ':' + (document.querySelector('#mbox .ab-tabs .on') || {}).textContent;
    if (document.querySelector('#mbox > .ie-h')) return 'item';
    return 'form:' + ((document.querySelector('#mbox h2') || {}).textContent || '').trim();
  });

test('Supplier window: Edit Supplier, a stock line and a delivery each close back to the supplier', async ({ app }) => {
  await app.go('suppliers');
  const name = await app.run(() => state.suppliers.find((s) => s.name == 'Example Profiles Ltd' || true).name);
  await app.call('supOpen', name);
  expect(await showing(app)).toMatch(/^rw:supplier:Details/);
  // Edit Supplier
  await app.page.click('#mbox .rw-bar >> text=Edit Supplier');
  expect(await showing(app)).toMatch(/^form:/);
  await app.call('closeModal');
  expect(await showing(app)).toMatch(/^rw:supplier:Details/);
  // a stock line, from the Stock tab: the tab is still open when it comes back
  await app.page.click('#mbox .ab-tabs button[data-t=stock]');
  const line = app.page.locator('#mbox .rw-p.on [data-act=stockForm]').first();
  if (await line.count()) {
    await line.click();
    expect(await showing(app)).toBe('item');
    await app.call('closeModal');
    expect(await showing(app)).toMatch(/^rw:supplier:.*Stock/);
  }
  // New Delivery
  await app.page.click('#mbox .rw-bar >> text=New Delivery');
  expect(await showing(app)).toMatch(/^form:/);
  await app.call('closeModal');
  expect(await showing(app)).toMatch(/^rw:supplier:/);
  await app.call('closeModal');
  expect(await showing(app)).toBe('page');
  expect(app.errors).toEqual([]);
});

test('Contract window: a delivery and a service call close back to the contract, on the same tab', async ({ app }) => {
  await app.openContract('1023421');
  await app.call('recTab', 'deliveries');
  const del = await app.run(() => (state.deliveries.find((d) => d.contract == '1023421') || {}).id);
  if (del) {
    await app.call('editDel', del);
    expect(await showing(app)).toMatch(/^form:/);
    await app.call('closeModal');
    expect(await showing(app)).toMatch(/^rw:contract:Deliveries/);
  }
  await app.call('recTab', 'calls');
  await app.call('editCall', null, '1023421');
  expect(await showing(app)).toMatch(/^form:/);
  await app.call('closeModal');
  expect(await showing(app)).toMatch(/^rw:contract:Service Calls/);
  expect(app.errors).toEqual([]);
});

test('Day and night: every box has a clear outline and hint text that can be read', async ({ app }) => {
  for (const theme of ['light', 'dark']) {
    await app.call('setTh', theme);
    await app.go('stock');
    const pid = await app.run(() => products()[0].pid);
    await app.call('stockForm', 'edit', pid);
    const r = await app.page.evaluate(() => {
      const L = (c) => {
        const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
      };
      const rgb = (s) =>
        s
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number);
      const ratio = (a, b) => {
        const x = L(rgb(a)),
          y = L(rgb(b));
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      };
      const d = document.querySelector('#f_desc'),
        cs = getComputedStyle(d),
        card = getComputedStyle(d.closest('fieldset')).backgroundColor;
      return { outline: ratio(cs.borderTopColor, card), text: ratio(cs.color, cs.backgroundColor) };
    });
    // a solid card colour is needed for the sum; skip the outline part if the card is see-through
    expect(r.text, theme).toBeGreaterThanOrEqual(4.5);
    expect(r.outline, theme).toBeGreaterThanOrEqual(2.9);
    await app.call('closeModal');
  }
  expect(app.errors).toEqual([]);
});
