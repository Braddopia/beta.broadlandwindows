// v19.17.3: the owner's follow-ups to round 3. Up to four engineers on a service call (two boxes to start with, the
// list shows them centred); Files Category and Size beside the buttons; Job Stock Tags one box per line, capitals in
// the wording, colours filled in from the contract; an Inventory colour keeps its colour dot; the screen saver's
// church and second mill stand down at the water.
const { test, expect } = require('../helpers');

test('service calls: a second engineer box to start with, a third once the second is filled; both shown centred', async ({
  app,
}) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.role('beta');
  await app.go('service');
  const id = await app.run(() => state.calls.find((c) => c.status != 'Complete' && !c.visit).id);
  await app.call('svcBook', id);
  await expect(app.page.locator('#f_fitter2')).toBeVisible();
  await expect(app.page.locator('#f_fitter3')).toBeHidden();
  const fitters = await app.page.locator('#f_fitter option').evaluateAll((L) => L.map((o) => o.value).filter(Boolean));
  await app.page.selectOption('#f_fitter', fitters[0]);
  await app.page.selectOption('#f_fitter2', fitters[1]);
  await expect(app.page.locator('#f_fitter3')).toBeVisible();
  await expect(app.page.locator('#f_fitter4')).toBeHidden();
  await app.page.selectOption('#f_fitter3', fitters[2]);
  await app.page.click('#svcGo');
  const c = await app.run((id) => state.calls.find((x) => x.id == id), id);
  expect([c.fitter, c.fitter2, c.fitter3, c.fitter4, c.status]).toEqual([
    fitters[0],
    fitters[1],
    fitters[2],
    '',
    'Booked',
  ]);
  // the list: the first two names, one under the other, then "+1 more", centred under the heading
  const cell = app.page.locator('#main .t-svc tr', { hasText: id }).locator('td.s-fit');
  await expect(cell.locator('.s-eng > span')).toHaveText([fitters[0], fitters[1]]);
  await expect(cell).toContainText('+1 more');
  const m = await app.run(() => {
    const th = document.querySelector('#main .t-svc th[data-col=fitter]').getBoundingClientRect(),
      e = [...document.querySelectorAll('#main .t-svc .s-eng')].pop().getBoundingClientRect();
    return Math.abs(th.left + th.width / 2 - (e.left + e.width / 2));
  });
  expect(m).toBeLessThan(3);
  // each engineer finds it under My Calls (people.js callsOf)
  expect(await app.run((n) => callsOf({ name: n }).length > 0, fitters[2])).toBe(true);
  expect(app.errors).toEqual([]);
});

test('Files: Category and Size sit on the right beside the buttons, never under them', async ({ app }) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.role('beta');
  await app.go('downloads');
  const r = await app.run(() => {
    const list = document.querySelector('#main .flist:not([id])'),
      row = list.querySelector('.frow:not(.fhead)'),
      b = (e) => e.getBoundingClientRect(),
      L = b(list);
    return {
      catPastMiddle: b(row.querySelector('.tag')).left > L.left + L.width / 2,
      sizeBeforeButtons: b(row.querySelector('.sz')).right < b(row.querySelector('.acts')).left,
      buttonsAtEnd: Math.abs(b(row.querySelector('.acts')).right - b(row).right) < 4,
    };
  });
  expect(r).toEqual({ catPastMiddle: true, sizeBeforeButtons: true, buttonsAtEnd: true });
});

test('Job Stock Tags: one box per line, wording in capitals, colours filled in from the contract', async ({ app }) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.go('tags');
  const k = await app.run(() => state.contracts.find((c) => (c.openings || []).some((o) => o.col)));
  const w = (s) => app.page.locator(s).evaluate((e) => Math.round(e.getBoundingClientRect().width));
  // job number, job name and both colours are each a full-width line
  const widths = await Promise.all(['#tag_0_jobNo', '#tag_0_jobName', '#tag_0_cIn', '#tag_0_cOut'].map(w));
  expect(new Set(widths).size).toBe(1);
  // the labels no longer say "(in red)", and the wording is kept in capitals as it is typed
  await expect(app.page.locator('.jt-shared')).not.toContainText('in red');
  await expect(app.page.locator('label[for=tag_warn]')).toHaveText('Warning');
  await app.page.fill('#tag_note', 'handle with care');
  await expect(app.page.locator('#tag_note')).toHaveValue('HANDLE WITH CARE');
  expect(await app.run(() => tagData().note)).toBe('HANDLE WITH CARE');
  // a contract number fills in the job name and its colour
  await app.page.fill('#tag_0_jobNo', k.id);
  const col = await app.run((c) => jobColour(c), k);
  expect(col).not.toBe('');
  await expect(app.page.locator('#tag_0_cIn')).toHaveValue(col);
  await expect(app.page.locator('#tag_0_cOut')).toHaveValue(col);
  await expect(app.page.locator('#tag_0_jobName')).toHaveValue(k.name.toLocaleUpperCase('en-GB'));
  expect(app.errors).toEqual([]);
});

test('Inventory: a colour keeps its dot, picked or typed, when the product is opened again', async ({ app }) => {
  await app.role('beta');
  await app.go('stock');
  const pid = await app.run(() => products()[0].pid);
  // picked from the swatches
  await app.call('editItem', pid);
  await app.page.click('#mbox .sws .sw[title=Blue] >> nth=0');
  await app.page.click('#mbox [data-act=ieSave]');
  expect(await app.run((id) => products().find((r) => r.pid == id).cIn, pid)).toBe('#034ea2');
  await app.page.waitForTimeout(300);
  await app.call('editItem', pid);
  await expect(app.page.locator('#cb_cInName')).toHaveCSS('background-color', 'rgb(3, 78, 162)');
  // typed in, never picked
  await app.page.fill('#f_cOutName', 'Red');
  await app.page.dispatchEvent('#f_cOutName', 'change');
  await expect(app.page.locator('#cb_cOutName')).toHaveCSS('background-color', 'rgb(163, 48, 48)');
  await app.page.click('#mbox [data-act=ieSave]');
  expect(await app.run((id) => products().find((r) => r.pid == id).cOut, pid)).toBe('#a33030');
  expect(app.errors).toEqual([]);
});

test('screen saver: the church and the second mill stand down at the water, like the big mill', async ({ app }) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.run(() => saverTry());
  const r = await app.run(() => {
    const b = (s) => Math.round(document.querySelector('#saver ' + s).getBoundingClientRect().bottom);
    return [b('.sv-mill:not(.far):not(.refl)'), b('.sv-mill.far'), b('.sv-church')];
  });
  expect(new Set(r).size).toBe(1);
});
