// v19.12 site-wide tidy-up: every page uses the same spacing between its blocks, its title sits at the same height,
// and number cards never leave one card alone on a row.
const { test, expect } = require('../helpers');

const VIEWS = [
  'admin',
  'bars',
  'contacts',
  'contracts',
  'cutting',
  'deliveries',
  'downloads',
  'finance',
  'fitting',
  'holidays',
  'leads',
  'reports',
  'service',
  'settings',
  'staff',
  'stock',
  'suppliers',
  'tags',
];

for (const w of [1000, 1440]) {
  test(`same spacing, title height and balanced number cards on every page at ${w}px`, async ({ app }) => {
    await app.page.setViewportSize({ width: w, height: 900 });
    await app.role('beta');
    const seen = {};
    for (const v of VIEWS) {
      await app.go(v);
      // let the page finish sliding in
      await app.page.waitForFunction(() => document.getAnimations().every((a) => a.playState != 'running'));
      await app.page.waitForTimeout(200);
      seen[v] = await app.run(() => {
        const kids = [...document.querySelectorAll('#main > *')].filter((e) => e.offsetHeight > 0);
        const gaps = [];
        // the page numbers sit straight under their table, so that one gap is not counted
        for (let i = 1; i < kids.length; i++)
          if (!kids[i].matches('.pager'))
            gaps.push(Math.round(kids[i].getBoundingClientRect().top - kids[i - 1].getBoundingClientRect().bottom));
        const h1 = document.querySelector('#main > .head h1');
        const rows = [...document.querySelectorAll('#main .kpis')].map((g) => {
          const n = {};
          [...g.children].forEach(
            (c) =>
              (n[Math.round(c.getBoundingClientRect().top)] = (n[Math.round(c.getBoundingClientRect().top)] || 0) + 1)
          );
          return Object.values(n);
        });
        return { gaps, top: h1 && Math.round(h1.getBoundingClientRect().top), rows };
      });
    }
    const allGaps = Object.values(seen).flatMap((s) => s.gaps);
    expect(Math.max(...allGaps) - Math.min(...allGaps), JSON.stringify(seen)).toBeLessThanOrEqual(1);
    const tops = new Set(Object.values(seen).map((s) => s.top));
    expect([...tops]).toHaveLength(1);
    for (const [v, s] of Object.entries(seen))
      for (const r of s.rows)
        if (r.length > 1) expect(r[r.length - 1], v + ' has a card alone on a row').toBeGreaterThan(1);
    expect(app.errors).toEqual([]);
  });
}
