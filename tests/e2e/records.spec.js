// Leads and contracts: saving, stages, payments, fitters, popups over a record, and the list pages.
const { test, expect } = require('../helpers');

test.beforeEach(async ({ app }) => { await app.role('beta'); });

test('new lead: "Pick at random" appoints a salesperson on save', async ({ app }) => {
  const r = await app.run(() => {
    recOpen('lead');
    const before = document.querySelector('#f_owner').value;
    document.querySelector('#f_name').value = 'Sample Test';
    document.querySelector('#f_mob1').value = '07700 900 444';
    REC.lead.fields(RW).filter((f) => f.req).forEach((f) => { const e = document.querySelector('#f_' + f.k); if (e && !e.value) e.value = f.t === 'select' ? f.o.find(Boolean) : 'X'; });
    const ok = recSave(true);
    const l = S.leads.find((x) => x.name === 'Sample Test');
    return { before, ok, owner: l && l.owner };
  });
  expect(r.before).toBe('Pick at random');
  expect(r.ok).toBe(true);
  expect(r.owner).not.toBe('Pick at random');
  expect(r.owner).toBeTruthy();
});

test('stage path: mark a lead as won through the in-app confirm box', async ({ app }) => {
  await app.openLead('L0004');
  await app.fillRequired();
  await app.page.click('#rwStg .path li:nth-child(4) button');
  await expect(app.page.locator('.aski h3')).toHaveText(/won/i);
  await app.page.click('.aski [data-a="1"]');
  expect(await app.run(() => S.leads.find((l) => l.id === 'L0004').stage)).toBe('Won');
});

test('contract header shows value, paid and outstanding', async ({ app }) => {
  await app.openContract('2402318');
  const t = await app.text('#mbox .rw-hk');
  expect(t).toMatch(/Value/i);
  expect(t).toMatch(/Paid/i);
  expect(t).toMatch(/Outstanding/i);
});

test('finance: make a payment, then remove it', async ({ app }) => {
  await app.openContract('2402318');
  await app.step('finance');
  await app.page.click('.fin-pb');
  await app.page.fill('#ra_amt', '1000');
  await app.page.click('#finPay .btn.green');
  let r = await app.run(() => [RW.v.pay.length, RW.v.paid]);
  expect(r).toEqual([1, 3826]);
  await app.page.click('.fin-row .mini.del');
  await app.page.click('.aski [data-a="1"]');
  r = await app.run(() => [RW.v.pay.length, RW.v.paid]);
  expect(r).toEqual([0, 2826]);
});

test('fitters 2 to 6 appear in turn and save as one fitter list', async ({ app }) => {
  await app.openContract('2402318');
  await app.step('fitting');
  const vis = () => app.run(() => [1, 2, 3, 4, 5, 6].map((i) => (document.querySelector('#f_fitter' + i).closest('.rf').hidden ? 0 : 1)).join(''));
  expect(await vis()).toBe('110000');
  await app.run(() => { const e = document.querySelector('#f_fitter2'); e.value = FITL()[1]; e.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(await vis()).toBe('111000');
  await app.fillRequired();
  expect(await app.call('recSave', true)).toBe(true);
  expect(await app.run(() => S.contracts.find((c) => c.id === '2402318').fitter)).toBe('Team A, Fitter B');
});

test('a popup opened from a contract returns to it with unsaved typing kept', async ({ app }) => {
  await app.openContract('2402318');
  await app.step('customer');
  await app.run(() => { const e = document.querySelector('#f_name'); e.value = 'Typed But Not Saved'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await app.call('recCall');
  expect(await app.run(() => [!!document.querySelector('#mbox .rw'), !!document.querySelector('#f_issue')])).toEqual([false, true]);
  await app.page.keyboard.press('Escape');
  expect(await app.run(() => document.querySelector('#f_name').value)).toBe('Typed But Not Saved');
});

test('Escape on a record with changes asks before closing', async ({ app }) => {
  await app.openContract('2402318');
  await app.run(() => { RW.dirty = 1; });
  await app.page.keyboard.press('Escape');
  expect(await app.run(() => [!!document.querySelector('#rwAsk'), document.querySelector('#modal').classList.contains('open')])).toEqual([true, true]);
});

test('new contract goes through the wizard', async ({ app }) => {
  await app.go('contracts');
  await app.call('editContract');
  await expect(app.page.locator('#mbox h2')).toHaveText(/New Contract/);
});

test('list pages: stage filter and year filter', async ({ app }) => {
  await app.go('leads');
  await app.page.click('.pp >> nth=2');
  expect(await app.run(() => [UI.lead.st, document.querySelectorAll('#main tbody tr').length])).toEqual(['Quoted', 2]);
});

test('the invoice prints with VAT and balance', async ({ app }) => {
  const [w] = await Promise.all([app.nextPopup(), app.call('invoicePrint', '2402318')]);
  await w.waitForLoadState();
  const t = await w.evaluate(() => document.body.innerText);
  expect(t).toContain('INV-2402318');
  expect(t).toMatch(/VAT at 20%/);
  expect(t).toContain('£6,594.00');
});
