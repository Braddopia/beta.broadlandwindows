// v19.13 Inventory layout: one toolbar row (search, Sort & Filter, quick filters), every heading lined up with its
// column, the Stock heading and each value centred, Item, Stock and Location evenly spaced on
// the left with Cost and Status by the buttons (v19.13.1), and the row buttons inside their cell, for an administrator and a standard user at the usual screen widths.
const { test, expect } = require('../helpers');

for (const role of ['beta', 'staff'])
  for (const w of [1000, 1280, 1440, 1920]) {
    test(`Inventory layout, ${role} at ${w}px`, async ({ app }) => {
      await app.page.setViewportSize({ width: w, height: 900 });
      if (role == 'beta') await app.role('beta');
      await app.go('stock');
      await app.page.waitForFunction(() => document.getAnimations().every((a) => a.playState != 'running'));
      const r = await app.run(() => {
        const t = document.querySelector('#main .t-inv');
        const ths = [...t.querySelectorAll('thead th')].filter((th) => th.offsetWidth);
        const rows = [...t.querySelectorAll('tbody tr')];
        const box = (e) => e.getBoundingClientRect();
        const q = box(document.querySelector('#main .invq')),
          f = box(document.querySelector('#invF'));
        const all = [...t.querySelectorAll('thead th')];
        const misaligned = ths
          .filter((th) => th.dataset.col != 'sel' && th.dataset.col != 'act')
          .filter((th) => {
            const i = all.indexOf(th);
            return rows.some((tr) => getComputedStyle(tr.children[i]).textAlign != getComputedStyle(th).textAlign);
          })
          .map((th) => th.dataset.col);
        // the Stock heading and each row's value are centred in the column (v19.14.1)
        const stockTh = t.querySelector('thead th[data-col=stock]'),
          thMid = (box(stockTh).left + box(stockTh).right) / 2;
        const w = (c) => (t.querySelector(`thead th[data-col=${c}]`) || {}).offsetWidth || 0;
        const buttonsFit = rows.every((tr) => {
          const c = box(tr.querySelector('td.ac'));
          return [...tr.querySelectorAll('td.ac button')]
            .filter((b) => b.offsetWidth)
            .every((b) => box(b).left >= c.left - 1 && box(b).right <= c.right + 1);
        });
        return {
          misaligned,
          numbersLineUp: rows.every((tr) => {
            const q = box(tr.querySelector('.i-qty'));
            return Math.abs((q.left + q.right) / 2 - thMid) < 1.5;
          }),
          filterLevelWithSearch: Math.abs(q.top - f.top) < 1 && Math.abs(q.height - f.height) < 1,
          evenlySpaced: w('item') == w('stock') && (!w('colours') || w('stock') == w('location')),
          // the right group: Cost, (Value,) Status, buttons side by side with nothing between them
          rightGroupTogether: (() => {
            const cols = ['cost', 'value', 'status', 'act']
              .map((c) => t.querySelector(`thead th[data-col=${c}]`))
              .filter((x) => x && x.offsetWidth);
            return (
              cols.every((c, i) => !i || Math.abs(box(c).left - box(cols[i - 1]).right) < 1) &&
              Math.abs(box(cols.at(-1)).right - box(t).right) < 2
            );
          })(),
          buttonsFit,
          stockCellsFit: rows.every((tr) => {
            const c = tr.querySelector('td.i-stock');
            return c.scrollWidth <= c.clientWidth + 1;
          }),
        };
      });
      expect(r).toEqual({
        misaligned: [],
        numbersLineUp: true,
        filterLevelWithSearch: true,
        evenlySpaced: true,
        rightGroupTogether: true,
        buttonsFit: true,
        stockCellsFit: true,
      });
      expect(app.errors).toEqual([]);
    });
  }
