// v19.14: review counts update themselves, Messages layout, full-width Fitting Schedule and Stock Take,
// a side menu that scrolls on short screens, and no blue fill on hover over the holiday ring or calendar days.
const { test, expect } = require('../helpers');

test('new review figures from the daily file reach the Overview and the Office floor board', async ({ app }) => {
  await app.role('beta');
  await app.go('home');
  await expect(app.page.locator('#main .rate')).toContainText('(21 reviews)');
  await app.run(() =>
    reviewFeed({
      updated: '2026-11-08T05:23:00Z',
      google: { score: 4.6, count: 140 },
      trustpilot: { score: 4.7, count: 34 },
    })
  );
  await expect(app.page.locator('#main .rate')).toContainText('Trustpilot (34 reviews)');
  await expect(app.page.locator('#main .rate')).toContainText('Google (140 reviews)');
  // the links typed in Admin Console are kept, and the change is in the audit log
  expect(await app.run(() => [state.brand.tp.count, typeof state.brand.tp.url])).toEqual([34, 'string']);
  expect(
    await app.run(() => state.audit.some((a) => /Review scores updated automatically/.test(JSON.stringify(a))))
  ).toBe(true);
  await app.call('setUI', 'board', 'office');
  await app.go('live');
  await expect(app.page.locator('#main')).toContainText('34 reviews');
  expect(app.errors).toEqual([]);
});

test('Messages: People as wide as Chats, Report A Problem at the bottom of People on the right', async ({ app }) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.role('beta');
  await app.go('messages');
  const r = await app.run(() => {
    const b = (s) => document.querySelector(s).getBoundingClientRect();
    const rp = b('.msn-p .msn-rp .btn'),
      p = b('.msn-p');
    return {
      sameWidth: Math.abs(b('.msn-l').width - p.width) < 1,
      inPeople: !!document.querySelector('.msn-p .msn-rp') && !document.querySelector('.msn-l .msn-rp'),
      right: Math.abs(p.right - rp.right) < 30,
      bottom: Math.abs(p.bottom - rp.bottom) < 30,
    };
  });
  expect(r).toEqual({ sameWidth: true, inPeople: true, right: true, bottom: true });
});

test('the Fitting Schedule board and the Stock Take page use the full width', async ({ app }) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.role('beta');
  const full = (sel) =>
    app.run((s) => {
      const main = document.querySelector('#main'),
        cs = getComputedStyle(main),
        r = main.getBoundingClientRect(),
        left = r.left + parseFloat(cs.paddingLeft),
        right = r.left + main.clientWidth - parseFloat(cs.paddingRight),
        e = document.querySelector(s).getBoundingClientRect();
      return Math.abs(e.left - left) < 2 && Math.abs(e.right - right) < 2;
    }, sel);
  await app.call('setUI', 'board', 'schedule');
  await app.go('live');
  expect(await full('#main .fs-wrap')).toBe(true);
  await app.go('stock');
  await app.call('setUI', 'inv.v', 'take');
  expect(await full('#main .take-home')).toBe(true);
});

test('on a short screen the side menu keeps its group names and scrolls', async ({ app }) => {
  await app.page.setViewportSize({ width: 1440, height: 480 }); // short enough that the menu cannot fit with any font
  await app.role('beta');
  await app.go('home');
  const r = await app.run(() => {
    const n = document.querySelector('#nav');
    return {
      groupNames: [...n.querySelectorAll('.nl')].every((x) => x.offsetHeight > 0),
      scrolls: n.scrollHeight > n.clientHeight && getComputedStyle(n).overflowY == 'auto',
    };
  });
  expect(r).toEqual({ groupNames: true, scrolls: true });
});

test('no blue fill on hover over the holiday ring or a calendar day', async ({ app }) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.role('beta');
  await app.go('home');
  await app.page.locator('#main .hol2').hover();
  expect(await app.run(() => getComputedStyle(document.querySelector('#main .hol2')).backgroundColor)).toBe(
    'rgba(0, 0, 0, 0)'
  );
  await app.go('fitting');
  const day = app.page.locator('#main .dc2').nth(10);
  await day.hover();
  expect(
    await day.evaluate((e) => getComputedStyle(e).backgroundImage + getComputedStyle(e).backgroundColor)
  ).not.toContain('226, 237, 250');
});
