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
    ['contract', '1023421'],
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
    ['contract', '1023421'],
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

test('Overview: every card links to its page, and each line opens its own record', async ({ app }) => {
  await app.role('beta');
  await app.go('home');
  await app.page.click('#main .pan-go:has-text("Next Fittings")');
  expect(await app.run(() => document.body.dataset.view)).toBe('fitting');
  await app.go('home');
  await app.page.click('#main .hpan:has-text("Next Fittings") .row.clk-r >> nth=0');
  await expect(app.page.locator('#mbox .rw')).toHaveCount(1);
  await app.closeAll();
  await app.go('home');
  await app.page.click('#main .hpan:has-text("Deliveries Due") .row.clk-r >> nth=0');
  await expect(app.page.locator('#modal')).toHaveClass(/open/);
  expect(app.errors).toEqual([]);
});

test('Overview on a phone: the greeting shows the stars per platform, not the review numbers', async ({ app }) => {
  await app.page.setViewportSize({ width: 390, height: 844 });
  await app.role('beta');
  await app.go('home');
  await expect(app.page.locator('.hero .rate .rt-c').first()).toBeHidden();
  await expect(app.page.locator('.hero .rate .rt-n').first()).toBeHidden();
  await expect(app.page.locator('.hero .rate')).toContainText('Google');
});

test('Inventory columns: ID, Item, Stock, Location, Unit (PCS or the length), Colours, Cost, Total Value, Supplier, Status', async ({
  app,
}) => {
  await app.role('beta');
  await app.go('stock');
  const th = await app.run(() =>
    [...document.querySelectorAll('#main .t-inv thead th')].map((t) => t.innerText.replace(/[▲▼]/g, '').trim())
  );
  expect(th.slice(1, 11)).toEqual([
    'ID',
    'Item',
    'Stock',
    'Location',
    'Unit',
    'Colours',
    'Cost',
    'Total Value',
    'Supplier',
    'Status',
  ]);
  await expect(app.page.locator('#main .t-inv td.c-u').first()).toHaveText(/^(PCS|Pairs|M|[\d.]+M)$/);
  await expect(app.page.locator('#main .tools')).not.toContainText('Cutting Data');
});

test("Calendar: week numbers down the side, every kind of event can be shown, and one person's diary", async ({
  app,
}) => {
  await app.role('beta');
  await app.go('fitting');
  const rows = await app.run(() => document.querySelectorAll('#main .cm .wkn').length);
  expect(rows).toBeGreaterThanOrEqual(4);
  expect(await app.run(() => [...document.querySelectorAll('#main .cm .wkn')].map((e) => +e.textContent))).toContain(
    await app.run(() => isoWeek(today()))
  );
  await expect(app.page.locator('#main .cal-f .chip')).toHaveText([
    'Fittings',
    'Surveys',
    'Appointments',
    'Service Visits',
    'Deliveries',
    'Follow-Ups',
    'Holidays',
  ]);
  // one person's diary: only what is theirs
  const sid = await app.run(() => state.staff.find((s) => s.cat == 'Fitters').id);
  await app.page.selectOption('#main .cal-who select', sid);
  expect(
    await app.run((id) => {
      const s = state.staff.find((x) => x.id == id);
      return [...Array(28)].every((_, i) => evs(iso(new Date(2026, 10, i + 1))).every((e) => forPerson(s, e.p)));
    }, sid)
  ).toBe(true);
  // the week view says which week it is
  await app.call('calMode', 'week');
  await expect(app.page.locator('#main h2').first()).toContainText('Week');
});

test('Overview: drawing the page again (after a save here or in another tab) does not replay the greeting animation', async ({
  app,
}) => {
  await app.role('beta');
  await app.go('home');
  await app.run(() => render());
  expect(await app.run(() => getComputedStyle(document.querySelector('.hero')).animationName)).toBe('none');
  await app.go('leads');
  expect(await app.run(() => document.querySelector('#main').classList.contains('still'))).toBe(false);
});

test('Stock Take page: the four steps as cards and the areas to count', async ({ app }) => {
  await app.role('beta');
  await app.go('stock');
  await app.run(() => setUI('inv.v', 'take'));
  await expect(app.page.locator('#main .tk-step')).toHaveCount(4);
  await expect(app.page.locator('#main .tk-step').nth(2)).toContainText('Start Stock Take');
  await expect(app.page.locator('#main .tk-ac')).not.toHaveCount(0);
});

test('service map: main roads with their numbers, and places past the 45-mile area', async ({ app }) => {
  await app.role('beta');
  await app.go('service');
  await app.run(() => setUI('svc.mode', 'map'));
  await expect(app.page.locator('#main .smap .rsg')).not.toHaveCount(0);
  await expect(app.page.locator('#main .smap .rsg').first()).toContainText('A');
  await expect(app.page.locator('#main .smap .lm')).toContainText(['Newmarket']);
});
