// Every page, for every account type, at desktop, tablet and phone size:
// it renders, shows no error panel, raises no JavaScript error and never scrolls sideways.
const { test, expect } = require('../helpers');

const SIZES = { desktop: [1440, 900], tablet: [1024, 768], phone: [390, 844] };

for (const role of ['staff', 'admin', 'beta']) {
  for (const [size, [w, h]] of Object.entries(SIZES)) {
    test(`every page renders: ${role} at ${size}`, async ({ app }) => {
      await app.page.setViewportSize({ width: w, height: h });
      await app.role(role);
      const views = await app.run(() =>
        Object.keys(VIEWS).filter((k) => canSee(k) && (k !== 'admin' || can('manage')))
      );
      expect(views.length).toBeGreaterThan(5);
      for (const v of views) {
        await app.go(v);
        const r = await app.run(() => ({
          view,
          html: document.querySelector('#main').innerHTML.length,
          broken: document.querySelector('#main').innerText.includes('Something Went Wrong'),
          overflow: document.documentElement.scrollWidth - innerWidth,
        }));
        expect(r.view, `opened ${v}`).toBe(v);
        expect(r.html, `${v} has content`).toBeGreaterThan(200);
        expect(r.broken, `${v} has no error panel`).toBe(false);
        expect(r.overflow, `${v} does not scroll sideways`).toBeLessThanOrEqual(1);
      }
    });
  }
}

test('lead and contract windows open on every step without errors', async ({ app }) => {
  await app.role('beta');
  for (const [kind, id] of [
    ['lead', 'L0001'],
    ['contract', '2402318'],
  ]) {
    await app.call('recOpen', kind, id);
    const steps = await app.run(() => recordWin.steps);
    expect(steps.length).toBeGreaterThan(6);
    for (const s of steps) {
      await app.step(s);
      expect(await app.run(() => document.querySelector('#mbox .rw-p.on').dataset.t)).toBe(s);
    }
    await app.closeAll();
  }
});

test('phone: record window never scrolls sideways', async ({ app }) => {
  await app.page.setViewportSize({ width: 390, height: 844 });
  await app.role('beta');
  for (const [kind, id] of [
    ['lead', 'L0001'],
    ['contract', '2402318'],
  ]) {
    await app.call('recOpen', kind, id);
    for (const s of await app.run(() => recordWin.steps)) {
      await app.step(s);
      const w = await app.run(
        () => document.querySelector('#mbox').scrollWidth - document.querySelector('#mbox').clientWidth
      );
      expect(w, `${kind} ${s}`).toBeLessThanOrEqual(2);
    }
    await app.closeAll();
  }
});
