// v19.11.6: the Service Calls More button sits cleanly in its row, its menu opens fully on top, and every item in
// it works. The columns follow Inventory: names and the problem from the left, short values centred, Ref never cut.
const { test, expect } = require('../helpers');

/** measure one row's buttons and the open menu */
const look = (app) =>
  app.run(() => {
    const more = document.querySelector('#main .svc-more'),
      next = more.previousElementSibling,
      cell = more.closest('td').getBoundingClientRect(),
      m = more.getBoundingClientRect(),
      n = next.getBoundingClientRect(),
      pop = document.querySelector('#fpop.open');
    const items = pop
      ? [...pop.querySelectorAll('.pm-i')].map((b) => {
          const r = b.getBoundingClientRect();
          return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b;
        })
      : [];
    const p = pop && pop.getBoundingClientRect();
    return {
      textFits: more.scrollWidth <= more.clientWidth + 1,
      inCell: m.left >= cell.left - 1 && m.right <= cell.right + 1,
      sameHeight: more.offsetHeight == next.offsetHeight, // real size, not mid-press (the press animation shrinks a button)
      noOverlap: n.right <= m.left,
      menuOnScreen: !!p && p.left >= 0 && p.top >= 0 && p.right <= innerWidth && p.bottom <= innerHeight,
      itemsOnTop: items.length > 0 && items.every(Boolean),
    };
  });

for (const w of [390, 900, 1000, 1280, 1366, 1600, 1920]) {
  test(`More button and menu at ${w}px`, async ({ app }) => {
    await app.page.setViewportSize({ width: w, height: 900 });
    await app.role('beta');
    await app.go('service');
    const more = app.page.locator('#main .svc-more').first();
    await more.scrollIntoViewIfNeeded();
    await more.click();
    await expect(app.page.locator('#fpop.open .pm')).toBeVisible();
    expect(await look(app)).toEqual({
      textFits: true,
      inCell: true,
      sameHeight: true,
      noOverlap: true,
      menuOnScreen: true,
      itemsOnTop: true,
    });
    // pressing More again closes it; pressing outside closes it too
    await more.click();
    await expect(app.page.locator('#fpop.open')).toHaveCount(0);
    await more.click();
    await app.page.mouse.click(5, 5);
    await expect(app.page.locator('#fpop.open')).toHaveCount(0);
    expect(app.errors).toEqual([]);
  });
}

test('the More menu closes when its button scrolls away', async ({ app }) => {
  await app.page.setViewportSize({ width: 390, height: 844 });
  await app.role('beta');
  await app.go('service');
  const more = app.page.locator('#main .svc-more').first();
  await more.scrollIntoViewIfNeeded();
  await more.click();
  await expect(app.page.locator('#fpop.open')).toHaveCount(1);
  await app.run(() => document.querySelector('#main .tw').scrollBy(-200, 0));
  await expect(app.page.locator('#fpop.open')).toHaveCount(0);
});

test('every item in the More menu works', async ({ app }) => {
  await app.page.setViewportSize({ width: 1280, height: 900 });
  await app.role('beta');
  await app.go('service');
  await app.call('setUI', 'svc.f', 'all'); // a completed call stays on the list to be reopened
  const id = await app.run(() => state.calls.find((c) => c.status != 'Complete' && c.visit).id);
  const pick = async (label) => {
    await app.page.locator(`#main tr:has-text("${id}") .svc-more`).click();
    await app.page.click(`#fpop .pm-i:text-is("${label}")`);
    await expect(app.page.locator('#fpop.open')).toHaveCount(0);
  };
  const call = () => app.run((i) => state.calls.find((c) => c.id == i), id);

  await pick('Open the call');
  await expect(app.page.locator('#mbox')).toBeVisible();
  await expect(app.page.locator('#mbox')).toContainText(id);
  await app.closeAll();

  await pick('Change the visit');
  await expect(app.page.locator('#mbox h2')).toHaveText('Change The Visit');
  await app.page.fill('#f_visitTime', '14:30');
  await app.page.click('#svcGo');
  expect((await call()).visitTime).toBe('14:30');

  await pick('Waiting for parts');
  await app.page.fill('#f_parts', 'Two hinges');
  await app.page.click('#svcGo');
  expect((await call()).status).toBe('Awaiting parts');

  await pick('Parts are in');
  expect((await call()).status).not.toBe('Awaiting parts');
  await app.closeAll();

  await pick('Complete the call');
  await app.page.fill('#f_notes', 'Hinges fitted');
  await app.page.click('#svcGo');
  expect((await call()).status).toBe('Complete');

  await pick('Reopen the call');
  await app.page.click('#mbox [data-act=askGo]');
  expect((await call()).status).not.toBe('Complete');

  await pick('Service report');
  await expect(app.page.locator('#mbox')).toContainText('Customer copy');
  await app.closeAll();

  const n = await app.run(() => state.calls.length);
  await pick('Delete');
  await app.page.click('#mbox [data-act=askGo]');
  expect(await app.run(() => state.calls.length)).toBe(n - 1);
  expect(app.errors).toEqual([]);
});

test('service call columns: text from the left, short values centred, Ref never cut', async ({ app }) => {
  await app.page.setViewportSize({ width: 1280, height: 900 });
  await app.role('beta');
  await app.go('service');
  const r = await app.run(() => {
    const al = (s) => getComputedStyle(document.querySelector('#main .t-svc ' + s)).textAlign;
    const id = document.querySelector('#main .t-svc td.s-id');
    return {
      left: [
        'th[data-col=id]',
        'th[data-col=name]',
        'th[data-col=issue]',
        'th[data-col=fitter]',
        'td.s-name',
        'td.s-issue',
        'td.s-fit',
      ].map(al),
      centre: [
        'th[data-col=pr]',
        'th[data-col=st]',
        'th[data-col=visit]',
        'th[data-col=age]',
        'td.c',
        'td.s-visit',
        'td.svc-age',
      ].map(al),
      refFits: id.scrollWidth <= id.clientWidth + 1,
      hover: !!document.querySelector('#main .t-svc td.s-issue').title,
    };
  });
  expect(r.left.every((a) => a == 'left' || a == 'start')).toBe(true);
  expect(r.centre.every((a) => a == 'center')).toBe(true);
  expect(r.refFits).toBe(true);
  expect(r.hover).toBe(true);
});
