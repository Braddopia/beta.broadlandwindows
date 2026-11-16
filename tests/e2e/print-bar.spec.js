// Every printout opens with a bar at the top: Print and Close must both work (the Fitting Schedule and
// Job Stock Tags printouts once showed the buttons without wiring them up).
const { test, expect } = require('../helpers');

const PRINTOUTS = [
  ['Panel Optimiser plan', () => cutPrint()],
  ['Fitting Schedule', () => schedPrint()],
  [
    'Job Stock Tags',
    () => {
      tagData().list[0].jobNo = '1023421';
      tagPrint();
    },
  ],
  ['Service calls report', () => svcReport()],
  ['Contract report', () => reportContract(state.contracts[0].id, 'i')],
];

for (const [name, open] of PRINTOUTS)
  test(`printout bar works: ${name}`, async ({ app }) => {
    await app.role('beta');
    const [w] = await Promise.all([app.nextPopup(), app.run(open)]);
    await w.waitForLoadState();
    await expect(w.locator('[data-pa=print]')).toHaveCount(1);
    await w.evaluate(() => {
      window.__printed = 0;
      window.print = () => (window.__printed = 1);
    });
    await w.click('[data-pa=print]');
    expect(await w.evaluate(() => window.__printed)).toBe(1);
    const closed = w.waitForEvent('close');
    await w.click('[data-pa=close]').catch(() => {});
    await closed;
    expect(w.isClosed()).toBe(true);
    expect(app.errors).toEqual([]);
  });
