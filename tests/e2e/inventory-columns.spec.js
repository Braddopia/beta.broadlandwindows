// v19.11.6 Inventory columns: Item, Location and Supplier read from the left (heading and contents); every other
// column stays centred; and no column moves: the edges are the ones measured on v19.11.5 (same as v19.11.3).
const { test, expect } = require('../helpers');

/* left and right edge of each heading, measured on v19.11.5 */
const EDGES = {
  'beta 1280':
    'sel:216.3-248.0 pid:248.0-306.1 item:306.1-425.0 stock:425.0-480.5 location:480.5-578.3 unit:578.3-628.5 colours:628.5-781.3 supplier:781.3-920.1 cost:920.1-978.2 value:978.2-1054.9 status:1054.9-1139.5 act:1139.5-1255.8',
  'staff 1280':
    'sel:216.3-248.0 pid:248.0-306.1 item:306.1-425.0 stock:425.0-480.5 location:480.5-578.3 unit:578.3-628.5 colours:628.5-858.0 supplier:858.0-996.7 cost:996.7-1054.9 status:1054.9-1139.5 act:1139.5-1255.8',
  'beta 1920':
    'sel:282.6-317.7 pid:317.7-382.1 item:382.1-513.7 stock:513.7-575.1 location:575.1-692.1 unit:692.1-747.6 colours:747.6-1299.6 supplier:1299.6-1453.1 cost:1453.1-1517.5 value:1517.5-1602.3 status:1602.3-1695.8 act:1695.8-1893.3',
  'staff 1920':
    'sel:282.6-317.7 pid:317.7-382.1 item:382.1-513.7 stock:513.7-575.1 location:575.1-692.1 unit:692.1-747.6 colours:747.6-1384.4 supplier:1384.4-1537.9 cost:1537.9-1602.3 status:1602.3-1695.8 act:1695.8-1893.3',
};
const LEFT = ['item', 'location', 'supplier'];

for (const [key, want] of Object.entries(EDGES)) {
  test(`inventory columns, ${key}px`, async ({ app }) => {
    const [role, w] = key.split(' ');
    await app.page.setViewportSize({ width: +w, height: 900 });
    if (role == 'beta') await app.role('beta');
    await app.go('stock');
    await app.page.waitForTimeout(1200); // let the page settle before measuring
    const got = await app.run(() => {
      const t = document.querySelector('#main .t-inv');
      const ths = [...t.querySelectorAll('thead th')];
      const row = t.querySelector('tbody tr');
      return ths.map((th, i) => {
        const r = th.getBoundingClientRect();
        return {
          col: th.dataset.col,
          l: r.left,
          r: r.right,
          head: getComputedStyle(th).textAlign,
          cell: getComputedStyle(row.children[i]).textAlign,
        };
      });
    });
    // no column has moved
    const edges = want.split(' ').map((s) => {
      const [col, lr] = s.split(':');
      const [l, r] = lr.split('-').map(Number);
      return { col, l, r };
    });
    expect(got.map((g) => g.col)).toEqual(edges.map((e) => e.col));
    edges.forEach((e, i) => {
      expect(Math.abs(got[i].l - e.l), e.col + ' left edge').toBeLessThan(1);
      expect(Math.abs(got[i].r - e.r), e.col + ' right edge').toBeLessThan(1);
    });
    // Item, Location and Supplier from the left; the others centred; heading and contents the same way
    for (const g of got.filter((x) => !['sel', 'act'].includes(x.col))) {
      const way = LEFT.includes(g.col) ? 'left' : 'center';
      expect([g.col, g.head, g.cell]).toEqual([g.col, way, way]);
    }
  });
}
