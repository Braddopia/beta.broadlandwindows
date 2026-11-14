// The Digital Fitting Schedule (Floor Boards): book jobs on the weekly sheet; a confirmed booking sets the contract's
// fit date and fitters; printed on A4 landscape like the paper sheet.
const { test, expect } = require('../helpers');

test('fitting schedule: pencil in, confirm (the contract follows), one block over several boxes, remove', async ({
  app,
}) => {
  await app.role('beta');
  await app.run(() => {
    schedData().cols = ['Fitter A', 'Fitter B', 'Fitter C'];
    setUI('board', 'schedule');
    go('live');
  });
  await expect(app.page.locator('#main h1')).toHaveText('Fitting Schedule');
  // 6 days x (3 installers + Other Installers)
  await expect(app.page.locator('#main .fs-b')).toHaveCount(24);
  const D = await app.run(() => weekDays(0));
  // book a job: Monday and Tuesday, two installers, pencilled in
  await app.run((d) => schedCell(d, 'Fitter A'), D[0]);
  await app.page.fill('#fs_job', '1023421');
  await app.page.dispatchEvent('#fs_job', 'change');
  await expect(app.page.locator('#fs_name')).toHaveValue('SAMPLE CUSTOMER E');
  await app.page.fill('#fs_note', '6W');
  await app.page.check(`#mbox .fs-dk[value="${D[1]}"]`);
  await app.page.check('#mbox .fs-ck[value="Fitter B"]');
  await app.page.click('#mbox [data-act=schedSave]');
  expect(await app.run(() => Object.keys(schedData().cells).length)).toBe(4);
  // pencilled in: one block, the name shown once; the contract is not changed yet
  await expect(app.page.locator('#main .fs-b.pen')).toHaveCount(4);
  await expect(app.page.locator('#main .fs-b.pen .fs-n')).toHaveCount(1);
  const fitBefore = await app.run(() => state.contracts.find((c) => c.id == '1023421').fit);
  // confirm it: pink, and the contract's fit date and fitters follow the board
  await app.run((d) => schedCell(d, 'Fitter B'), D[1]);
  await app.page.check('input[name=fs_conf][value="1"]');
  await app.page.click('#mbox [data-act=schedSave]');
  await expect(app.page.locator('#main .fs-b.conf')).toHaveCount(4);
  expect(await app.run(() => state.contracts.find((c) => c.id == '1023421')).then((c) => [c.fit, c.fitter])).toEqual([
    D[0],
    'Fitter A, Fitter B',
  ]);
  // printed like the paper sheet
  const [w] = await Promise.all([app.nextPopup(), app.call('schedPrint')]);
  await w.waitForLoadState();
  expect(await w.content()).toContain('size:A4 landscape');
  await expect(w.locator('.fs-b.conf')).toHaveCount(4);
  await expect(w.locator('.sh')).toContainText('WEEK');
  await w.close();
  // remove it: the board's fit date comes off the contract again
  await app.run((d) => schedCell(d, 'Fitter A'), D[0]);
  await app.page.click('#mbox [data-act=schedDel]');
  await app.page.click('#mbox [data-act=askGo]');
  expect(await app.run(() => Object.keys(schedData().cells).length)).toBe(0);
  expect(await app.run(() => state.contracts.find((c) => c.id == '1023421').fit)).toBe('');
  expect(fitBefore).not.toBe(undefined);
  expect(app.errors).toEqual([]);
});

test('fitting schedule: a standard account can look but not book', async ({ app }) => {
  await app.role('staff');
  await app.run(() => {
    setUI('board', 'schedule');
    go('live');
  });
  await expect(app.page.locator('#main h1')).toHaveText('Fitting Schedule');
  await expect(app.page.locator('#main [data-act=schedInstallers]')).toHaveCount(0);
  expect(await app.run(() => can('schedule'))).toBe(false);
  await app.call('schedSave');
  await expect(app.page.locator('.toast')).toContainText('needs an administrator');
});
