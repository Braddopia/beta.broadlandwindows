// v19.18.14: Lead, Contract and Supplier windows laid out like the Inventory window: numbered cards, each box with
// its label above it, in even columns.
const { test, expect } = require('../helpers');

test.beforeEach(async ({ app }) => {
  await app.role('staff');
  await app.page.setViewportSize({ width: 1440, height: 900 });
});

test('Contract Details: one card for the contract, numbered cards, labels above their boxes', async ({ app }) => {
  await app.openContract('1023421');
  const r = await app.run(() => {
    const L = document.querySelector('#mbox .abd-l');
    const cards = [...L.querySelectorAll('.abl>.abg')];
    const rf = L.querySelector('.abg-plain .rf'),
      lab = rf.querySelector('span').getBoundingClientRect(),
      box = rf.querySelector('input,select').getBoundingClientRect();
    return {
      plain: L.querySelectorAll('.abg-plain').length,
      first: cards[0].querySelector('.abg-t b').textContent.trim(),
      numbered: getComputedStyle(cards[0].querySelector('.abg-t b'), '::before').content,
      above: lab.bottom <= box.top + 1,
      ticks: [...L.querySelectorAll('.abg-ticks .abg-t b')].map((b) => b.textContent.trim()),
      ticksOneLine: new Set(
        [...L.querySelectorAll('.abg-ticks>.abg')].map((g) => Math.round(g.getBoundingClientRect().top))
      ).size,
    };
  });
  expect(r.plain).toBe(1);
  expect(r.first).toBe('Contract');
  expect(r.numbered).toMatch(/counter/);
  expect(r.above).toBe(true);
  expect(r.ticks.map((t) => t.toLowerCase())).toEqual(['supply only', 'on hold', 'cancelled']);
  expect(r.ticksOneLine).toBe(1);
  expect(app.errors).toEqual([]);
});

test('Lead Details and the Address window use the same cards', async ({ app }) => {
  await app.openLead('L0001');
  await expect(app.page.locator('#mbox .abd-l .abg-plain .abg-t b')).toHaveText('Lead');
  await app.call('recTab', 'customer');
  await expect(app.page.locator('#mbox .abh2 .abg-plain .abg-t b').first()).toHaveText('Customer');
  const cols = await app.run(
    () => getComputedStyle(document.querySelector('#mbox .abh2 .abg-plain .abg-b')).gridTemplateColumns.split(' ').length
  );
  expect(cols).toBeGreaterThanOrEqual(2);
  expect(app.errors).toEqual([]);
});
