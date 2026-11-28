// v19.18.13: the owner's follow-ups: the Cutting Optimiser takes a profile's colours from Inventory as they are now,
// has fewer buttons showing (the rest under More) and a Reset button.
const { test, expect } = require('../helpers');

test.beforeEach(async ({ app }) => {
  await app.role('staff');
});

test('Cutting Optimiser: typing a code again brings in the colour changed in Inventory', async ({ app }) => {
  const item = await app.run(() => {
    const r = products().find((x) => x.stock >= 1);
    state.cutProf = { ...(state.cutProf || {}), [r.pid]: { bar: 6500 } };
    state.items.filter((x) => x.pid == r.pid).forEach((x) => ((x.cInName = 'White'), (x.cOutName = 'Anthracite')));
    return r.item;
  });
  await app.go('bars');
  await app.page.fill('#bar_p_0_code', item);
  await expect(app.page.locator('#bar_p_0_cIn')).toHaveValue('White');
  await expect(app.page.locator('#bar_p_0_cOut')).toHaveValue('Anthracite');
  // the colour is changed in Inventory, then the code is typed in again
  await app.run((it) => {
    const r = products().find((x) => x.item == it);
    state.items.filter((x) => x.pid == r.pid).forEach((x) => ((x.cInName = 'Black'), (x.cOutName = 'Grey')));
  }, item);
  await app.page.fill('#bar_p_0_code', '');
  await app.page.fill('#bar_p_0_code', item);
  await expect(app.page.locator('#bar_p_0_cIn')).toHaveValue('Black');
  await expect(app.page.locator('#bar_p_0_cOut')).toHaveValue('Grey');
  expect(await app.run(() => [state.bars.profiles[0].cIn, state.bars.profiles[0].cOut])).toEqual(['Black', 'Grey']);
  expect(app.errors).toEqual([]);
});

test('Cutting Optimiser: Reset, Save, More and Print showing; the rest under More; Reset clears the list', async ({
  app,
}) => {
  await app.go('bars');
  const shown = await app.run(() =>
    [...document.querySelectorAll('#main .head .tools button')]
      .filter((b) => !b.hidden)
      .map((b) => b.textContent.trim())
  );
  expect(shown).toEqual(['Reset', 'Save', 'More▾', 'Print Cutting List']);
  await app.page.click('#barMoreB');
  await expect(app.page.locator('#fpop .pm-i')).toHaveText(['Saved Lists (0)', 'Saw Settings']);
  await app.page.keyboard.press('Escape');
  await app.call('closeFpop');
  await app.page.fill('#bar_c_0_0_label', 'Kitchen');
  await app.page.fill('#bar_c_0_0_len', '1200');
  await app.call('barCutAdd', 0);
  await expect(app.page.locator('#main .bar-r')).toHaveCount(2);
  await app.page.click('#main .tools >> text=Reset');
  await app.page.click('.aski button >> text=/^Reset$/');
  await expect(app.page.locator('#main .bar-r')).toHaveCount(1);
  await expect(app.page.locator('#bar_c_0_0_label')).toHaveValue('');
  expect(app.errors).toEqual([]);
});
