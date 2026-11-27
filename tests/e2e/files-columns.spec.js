// Files: the header row of the Smart Systems Manuals list lines up with the rows (Category centred over the tags,
// Size centred over the sizes, v19.17), and the action buttons never cover the size.
const { test, expect } = require('../helpers');

for (const role of ['beta', 'staff'])
  test(`Files manuals list: headings line up with the rows (${role})`, async ({ app }) => {
    await app.role(role);
    await app.go('downloads');
    await expect(app.page.locator('#main .flist .frow:not(.fhead)').first()).toBeVisible();
    const m = await app.run(() => {
      const head = document.querySelector('#main .flist:not([id]) .fhead'), // the Smart Systems Manuals list
        row = head.parentElement.querySelector('.frow:not(.fhead)'),
        r = (e) => e.getBoundingClientRect(),
        hs = head.children;
      return {
        catHead: r(hs[1]).left + r(hs[1]).width / 2,
        catTag: r(row.querySelector('.tag')).left + r(row.querySelector('.tag')).width / 2,
        sizeHead: r(hs[2]).left + r(hs[2]).width / 2,
        sizeRow: r(row.querySelector('.sz')).left + r(row.querySelector('.sz')).width / 2,
        sizeEnd: r(row.querySelector('.sz')).right,
        actsStart: r(row.querySelector('.acts').firstElementChild).left,
        actsFit: row.querySelector('.acts').scrollWidth <= row.querySelector('.acts').clientWidth,
      };
    });
    expect(Math.abs(m.catHead - m.catTag)).toBeLessThan(2);
    expect(Math.abs(m.sizeHead - m.sizeRow)).toBeLessThan(2);
    expect(m.actsStart).toBeGreaterThan(m.sizeEnd);
    expect(m.actsFit).toBe(true);
  });
