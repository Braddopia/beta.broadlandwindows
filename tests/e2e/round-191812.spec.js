// v19.18.12: the owner's follow-ups: the Calendar grid has every divider, the Deliveries calendar ends level with the
// side menu, Messages in dark mode is not near black, and Processing folds away in the side menu.
const { test, expect } = require('../helpers');

test.beforeEach(async ({ app }) => {
  await app.role('beta');
});

test('Calendar month: every day has its divider except the last day of each row', async ({ app }) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.go('fitting');
  const rows = await app.run(() => {
    const cells = [...document.querySelectorAll('#main .cm.wn .dc2')];
    const out = [];
    for (let i = 0; i < cells.length; i += 7)
      out.push(cells.slice(i, i + 7).map((c) => getComputedStyle(c).borderRightWidth));
    return out;
  });
  expect(rows.length).toBeGreaterThanOrEqual(4);
  for (const r of rows) expect(r).toEqual(['1px', '1px', '1px', '1px', '1px', '1px', '0px']);
  expect(app.errors).toEqual([]);
});

test('Deliveries calendar ends level with the bottom of the side menu, at several screen sizes', async ({ app }) => {
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
  ]) {
    await app.page.setViewportSize({ width, height });
    await app.go('deliveries');
    // the calendar refits once the page has settled at its new size
    await expect
      .poll(
        () =>
          app.run(() => {
            const m = document.querySelector('#main'),
              gap =
                document.querySelector('.side').getBoundingClientRect().bottom -
                m.querySelector('.dcal').getBoundingClientRect().bottom;
            return Math.abs(gap) < 2 && m.scrollHeight <= m.clientHeight + 1;
          }),
        { message: `${width}x${height}` }
      )
      .toBe(true);
  }
});

test('Messages in dark mode: the chat area is between the page and the panels, not near black', async ({ app }) => {
  await app.go('messages');
  await app.call('setTh', 'dark');
  // the page colour in dark mode is rgb(13, 17, 23); the chat area is lifted towards the panels' colour (polled: the
  // switch to dark mode fades the colours over a moment)
  await expect
    .poll(() =>
      app.page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('#main .msn-t')).backgroundColor,
          c = s.match(/-?[\d.]+/g).map(Number);
        if (s.startsWith('oklab')) return c[0] > 0.17 && c[0] < 0.3; // a mixed colour can come back as oklab(lightness ...)
        if (s.startsWith('color(')) return c[0] + c[1] + c[2] > 0.29 && c[0] + c[1] + c[2] < 0.5;
        return c[0] + c[1] + c[2] > 73 && c[0] + c[1] + c[2] < 130;
      })
    )
    .toBe(true);
});

test('Processing folds away under its heading, remembers it, and opens by itself on one of its pages', async ({
  app,
}) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.run(() => localStorage.removeItem('bb_nav_open_processing'));
  await app.go('home');
  const head = app.page.locator('#nav .nlf');
  await expect(head).toHaveText('Processing');
  await expect(head).toHaveAttribute('aria-expanded', 'false');
  await expect(app.page.locator('#nav .nfold .nav').first()).toHaveAttribute('tabindex', '-1');
  await expect.poll(() => app.run(() => document.querySelector('#nav .nfold').offsetHeight)).toBe(0);
  await head.click();
  await expect(head).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => app.run(() => document.querySelector('#nav .nfold').offsetHeight)).toBeGreaterThan(60);
  await app.go('stock');
  await expect(app.page.locator('#nav .nlf')).toHaveAttribute('aria-expanded', 'true');
  await app.page.locator('#nav .nlf').click();
  await expect(app.page.locator('#nav .nlf')).toHaveAttribute('aria-expanded', 'false');
  await app.go('bars');
  await expect(app.page.locator('#nav .nlf')).toHaveAttribute('aria-expanded', 'true');
  await expect(app.page.locator('#nav .nav.on')).toHaveText('Cutting Optimiser');
  expect(app.errors).toEqual([]);
});
