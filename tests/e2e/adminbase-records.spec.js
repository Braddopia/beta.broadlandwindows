// v19.18: lead and contract windows laid out like the office's old system (AdminBase): a large centred window that
// can go full page, the record toolbar, the title line, the old system's tabs, a two-half Details tab with groups that
// fold, the products grid with Info For FENSA, and the Address window.
const { test, expect } = require('../helpers');

test.beforeEach(async ({ app }) => {
  await app.role('beta');
});

test('contract window: large and centred, goes full page (remembered), tabs in the old order', async ({ app }) => {
  await app.openContract('1023421');
  const box = () => app.page.locator('#mbox').boundingBox();
  const vw = app.page.viewportSize().width;
  let b = await box();
  expect(b.width).toBeLessThan(vw - 20);
  expect(b.x).toBeGreaterThan(5);
  await expect(app.page.locator('#mbox .ab-tabs button')).toHaveText([
    'Details',
    'Survey',
    'Checklist',
    'Finance',
    'Deliveries',
    'Fitting',
    'Notes etc',
    'Documents',
    'Commissions',
    'Job Costings',
    'Service Calls',
  ]);
  await app.page.click('#mbox .rw-fp');
  await expect(app.page.locator('#mbox')).toHaveClass(/fp/);
  await app.closeAll();
  await app.openContract('1023421');
  await expect(app.page.locator('#mbox')).toHaveClass(/fp/);
  b = await box();
  expect(Math.round(b.width)).toBe(vw);
  await app.page.click('#mbox .rw-fp');
  await expect(app.page.locator('#mbox')).not.toHaveClass(/fp/);
  expect(app.errors).toEqual([]);
});

test('title line shows the contract, its customer and how many contracts they have', async ({ app }) => {
  await app.openContract('1023421');
  await expect(app.page.locator('#mbox .rw-h h2')).toContainText('1023421 - SAMPLE CUSTOMER E');
  await expect(app.page.locator('#mbox .rw-h > div > small')).toHaveText('Contract · 5 of 5');
  await expect(app.page.locator('#rwCustB')).toHaveText('1 Contract For This Customer');
  await app.page.click('#rwCustB');
  await expect(app.page.locator('#fpop.open .pm-i')).toHaveCount(1);
  await expect(app.page.locator('#fpop.open')).toContainText('1023421');
});

test('record navigation: first, previous, next, last, Page Up / Page Down, and Ctrl+S saves', async ({ app }) => {
  await app.openContract('1023415');
  const id = () => app.run(() => recordWin.id);
  await app.page.click('#mbox .rw-nav [aria-label="Next contract"]');
  expect(await id()).toBe('1023418');
  await app.page.click('#mbox .rw-nav [aria-label="First contract"]');
  expect(await id()).toBe('1023409');
  await app.page.click('#mbox .rw-nav [aria-label="Last contract"]');
  expect(await id()).toBe('1023421');
  await expect(app.page.locator('#mbox .rw-nav [aria-label="Next contract"]')).toBeDisabled();
  await app.page.click('#mbox .ab-tabs button[data-t=details]');
  await app.page.keyboard.press('PageUp');
  expect(await id()).toBe('1023418');
  // Ctrl+S saves without closing
  await app.page.locator('#mbox .abg[data-g="Office Refs"] .abg-t').click();
  await app.page.fill('#f_officeRef2', 'REF-2');
  await app.page.keyboard.press('Control+s');
  await expect(app.page.locator('#mbox .rw')).toHaveCount(1);
  expect(await app.run(() => state.contracts.find((c) => c.id == '1023418').officeRef2)).toBe('REF-2');
  expect(app.errors).toEqual([]);
});

test('Details: groups fold and remember it; a folded group shows its summary; tick boxes save as Yes / No', async ({
  app,
}) => {
  await app.openContract('1023421');
  const g = (n) => app.page.locator(`#mbox .abg[data-g="${n}"]`);
  await expect(g('Office Refs')).not.toHaveClass(/open/);
  await expect(g('Sales Information')).toHaveClass(/open/);
  await g('Sales Information').locator('.abg-t').click();
  await expect(g('Sales Information')).not.toHaveClass(/open/);
  await expect(g('Sales Information').locator('.abg-sum')).toHaveText('Sales A');
  await g('Office Refs').locator('.abg-t').click();
  await expect(app.page.locator('#f_officeRef')).toBeVisible();
  // remembered next time
  await app.closeAll();
  await app.openContract('1023418');
  await expect(g('Office Refs')).toHaveClass(/open/);
  await expect(g('Sales Information')).not.toHaveClass(/open/);
  // tick box on a group heading, and the new boxes, save with the contract
  await app.page.check('#f_onHold');
  await g('On Hold').locator('.abg-t').click();
  await app.page.fill('#f_holdWhy', 'Waiting for planning');
  await g('Sales Information').locator('.abg-t').click();
  await app.page.selectOption('#f_salesDir', { index: 1 });
  await app.page.fill('#f_subSubSource', 'Leaflet drop');
  await app.page.selectOption('#f_ccol', '#12794c');
  await expect(app.page.locator('#ccsw')).toHaveAttribute('style', /rgb\(18, 121, 76\)/);
  await app.fillRequired();
  expect(await app.call('recSave', true)).toBe(true);
  const c = await app.run(() => state.contracts.find((c) => c.id == '1023418'));
  expect([c.onHold, c.holdWhy, !!c.salesDir, c.subSubSource, c.ccol, c.cancelled]).toEqual([
    'Yes',
    'Waiting for planning',
    true,
    'Leaflet drop',
    '#12794c',
    'No',
  ]);
  // the contract colour shows down the side of its row in the list
  await app.go('contracts');
  await expect(app.page.locator('#main tr', { hasText: '1023418' }).locator('td').first()).toHaveAttribute(
    'style',
    /#12794c/
  );
  expect(app.errors).toEqual([]);
});

test('Products grid: add, pick, remove with Undo, Default lines and lines from deliveries; Info For FENSA', async ({
  app,
}) => {
  await app.openContract('1023421');
  const rows = app.page.locator('#abProd tbody tr[data-i]');
  await expect(rows).toHaveCount(9);
  await app.page.click('#abProd [aria-label="Add a line"]');
  await expect(rows).toHaveCount(10);
  await expect(app.page.locator('#abProd tr.sel td.ln')).toHaveText('10');
  await app.page.click('#abProd [aria-label="First line"]');
  await expect(app.page.locator('#abProd tr.sel td.ln')).toHaveText('1');
  await app.page.click('#abProd [aria-label="Remove the chosen line"]');
  await expect(rows).toHaveCount(9);
  await app.page.click('#toast button');
  await expect(rows).toHaveCount(10);
  await app.page.click('#abProd [data-act=lineDefault]');
  await expect(rows).toHaveCount(13);
  await app.page.click('#abProd [data-act=lineDefault]');
  await expect(rows).toHaveCount(13);
  await app.page.click('#abProd [data-act=lineFromDeliveries]');
  await expect(rows).toHaveCount(14);
  // Info For FENSA under the grid; More goes to the FENSA boxes on the Fitting tab
  await app.page.check('#f_roofline');
  await app.page.fill('#f_winCount', '7');
  await app.page.click('#mbox .abt-more');
  await expect(app.page.locator('#mbox .ab-tabs button.on')).toHaveText('Fitting');
  await app.fillRequired();
  expect(await app.call('recSave', true)).toBe(true);
  const c = await app.run(() => state.contracts.find((c) => c.id == '1023421'));
  expect([c.lines.length, c.roofline, c.winCount]).toEqual([14, 'Yes', 7]);
  expect(app.errors).toEqual([]);
});

test('Address window opens over the tabs and Done goes back; a missing customer box opens it', async ({ app }) => {
  await app.openContract('1023421');
  await app.page.click('#mbox .ab-tabs button[data-t=finance]');
  await app.page.click('#rwAddrB');
  await expect(app.page.locator('#rwAddr')).toBeVisible();
  await expect(app.page.locator('#f_homePc')).toBeVisible();
  await app.page.click('#rwAddr [data-act=recAddrDone]');
  await expect(app.page.locator('#rwAddr')).toBeHidden();
  await expect(app.page.locator('#mbox .ab-tabs button.on')).toHaveText('Finance');
  await app.run(() => (document.querySelector('#f_town').value = ''));
  expect(await app.call('recSave', false)).toBe(false);
  await expect(app.page.locator('#rwAddr')).toBeVisible();
  expect(app.errors).toEqual([]);
});

test('Search opens another contract without closing; Clipboard and Advanced menus', async ({ app }) => {
  await app.openContract('1023421');
  await app.page.fill('#rwFind', '1023409');
  await app.page.keyboard.press('Enter');
  expect(await app.run(() => recordWin.id)).toBe('1023409');
  await app.page.click('#rwClipB');
  await expect(app.page.locator('#fpop.open .pm-i')).toHaveText([
    'Copy Customer Details',
    'Copy Name And Address',
    'Copy Phone Number',
    'Copy Email Address',
    'Copy Contract Number',
  ]);
  await app.page.click('#rwAdvB');
  await expect(app.page.locator('#fpop.open')).toContainText('New Service Call');
  await expect(app.page.locator('#fpop.open')).toContainText('Delete This Contract');
  expect(app.errors).toEqual([]);
});

test('lead window: the same frame with the lead tabs; Advanced converts', async ({ app }) => {
  await app.openLead('L0001');
  await expect(app.page.locator('#mbox .ab-tabs button')).toHaveText([
    'Details',
    'Appointments',
    'Survey',
    'Checklist',
    'Notes etc',
    'Documents',
  ]);
  await expect(app.page.locator('#rwCustB')).toHaveText('1 Lead For This Customer');
  await app.page.click('#rwAdvB');
  await expect(app.page.locator('#fpop.open')).toContainText('Convert To Contract');
  await expect(app.page.locator('#fpop.open')).toContainText('Mark As Lost');
  expect(app.errors).toEqual([]);
});

// ---- round 2 (v19.18.1): Contract Reports, Commissions, Job Costings, Fitting schedule, Deliveries, Advanced ----

test('Contract Reports: report names on the left, a preview on the right; Esc goes back to the contract', async ({
  app,
}) => {
  await app.openContract('1023421');
  await app.page.click('#mbox .rw-wide [data-act=recReports]');
  await expect(app.page.locator('#crWin')).toBeVisible();
  const names = await app.page.locator('#crWin .cr-l .cr-i span').allTextContents();
  expect(names.slice(0, 3)).toEqual(['Customer Contract Record', 'Invoice Reminder', '10 Year Completion Documents']);
  expect(names).toContain('Credit Control Letter 14 Days');
  // the first report is previewed straight away
  const frame = app.page.frameLocator('#crPrev iframe');
  await expect(frame.locator('body')).toContainText('1023421');
  // the invoice preview is not counted as printed
  const before = await app.run(() => state.audit.filter((a) => /Invoice printed/.test(a.what || a.a || '')).length);
  await app.page.click('#crWin .cr-i:has-text("Sales Invoice")');
  await expect(frame.locator('body')).toContainText('INV-1023421');
  expect(await app.run(() => state.audit.filter((a) => /Invoice printed/.test(a.what || a.a || '')).length)).toBe(
    before
  );
  // a report not built yet says so, and Print is greyed out
  await app.page.click('#crWin .cr-i:has-text("Quality Plan")');
  await expect(app.page.locator('#crPrev')).toContainText('coming soon');
  await expect(app.page.locator('#crWin [data-act=crPrint]')).toBeDisabled();
  await expect(app.page.locator('#crWin .cr-f')).toHaveText(/Need a change to a report\? Ask an administrator\./);
  await app.page.keyboard.press('Escape');
  await expect(app.page.locator('#crWin')).toHaveCount(0);
  await expect(app.page.locator('#mbox .rw')).toHaveCount(1);
  expect(app.errors).toEqual([]);
});

test('Contract Reports: Edit List hides a report for everyone (administrators)', async ({ app }) => {
  await app.openContract('1023421');
  await app.call('recReports');
  await app.page.click('#crWin [data-act=crEdit]');
  await app.page.locator('#crWin .cr-i.ed', { hasText: 'Quality Plan' }).locator('input').uncheck();
  await app.page.click('#crWin [data-act=crEdit]');
  await expect(app.page.locator('#crWin .cr-i', { hasText: 'Quality Plan' })).toHaveCount(0);
  expect(await app.run(() => state.rptHide)).toEqual(['Quality Plan']);
  expect(app.errors).toEqual([]);
});

test('Commissions and Job Costings save with the contract; the costs become the job cost', async ({ app }) => {
  await app.openContract('1023421');
  await app.page.click('#mbox .ab-tabs button[data-t=comm]');
  await app.page.click('#abComm [data-act=commDefault]');
  await expect(app.page.locator('#abComm tbody tr')).toHaveCount(1);
  await app.page.fill('#abComm .cml[data-f=pct]', '5');
  await app.page.locator('#abComm .cml[data-f=pct]').dispatchEvent('change');
  await expect(app.page.locator('#abComm tfoot')).toContainText('£392.50');
  await app.page.click('#mbox .ab-tabs button[data-t=costs]');
  await app.page.fill('#abCost .pl[data-i="0"][data-f=cost]', '400');
  await app.page.locator('#abCost .pl[data-i="0"][data-f=cost]').dispatchEvent('change');
  await app.page.click('#abCost [data-act=costAdd]');
  await app.page.fill('#abCost .jcx[data-f=what]', 'Skip hire');
  await app.page.fill('#abCost .jcx[data-f=amt]', '250');
  await app.page.locator('#abCost .jcx[data-f=amt]').dispatchEvent('change');
  await expect(app.page.locator('#abCost .jc-k')).toContainText('£650.00');
  await app.fillRequired();
  expect(await app.call('recSave', true)).toBe(true);
  const c = await app.run(() => state.contracts.find((c) => c.id == '1023421'));
  expect([c.comm.length, c.comm[0].pct, c.comm[0].role, c.lines[0].cost, c.costs[0].what, c.cost]).toEqual([
    1,
    5,
    'Salesperson',
    400,
    'Skip hire',
    650,
  ]);
  expect(app.errors).toEqual([]);
});

test('accounts that may not see money have no Commissions or Job Costings tabs', async ({ app }) => {
  await app.role('staff');
  await app.openContract('1023421');
  await expect(app.page.locator('#mbox .ab-tabs button[data-t=comm]')).toHaveCount(0);
  await expect(app.page.locator('#mbox .ab-tabs button[data-t=costs]')).toHaveCount(0);
});

test('Fitting shows the Contract Schedule; Deliveries is a table; Advanced duplicates a contract', async ({ app }) => {
  await app.run(() => {
    schedData().cells['2026-11-12|Team A'] = { job: '1023421', name: 'Sample Customer E', conf: 1 };
  });
  await app.openContract('1023421');
  await app.page.click('#mbox .ab-tabs button[data-t=fitting]');
  await expect(app.page.locator('#mbox .sched-t tbody tr')).toHaveCount(1);
  await expect(app.page.locator('#mbox .sched-t')).toContainText('Confirmed');
  await app.page.click('#mbox .ab-tabs button[data-t=deliveries]');
  await expect(app.page.locator('#mbox .rw-p[data-t=deliveries] tbody tr')).toHaveCount(1);
  const n = await app.run(() => state.contracts.length);
  await app.page.click('#rwAdvB');
  await app.page.click('#fpop.open .pm-i:has-text("Duplicate This Contract")');
  await app.page.click('.aski [data-a="1"]');
  expect(await app.run(() => state.contracts.length)).toBe(n + 1);
  const d = await app.run(() => ({ id: recordWin.id, v: recordWin.v }));
  expect(d.id).not.toBe('1023421');
  expect([d.v.name, d.v.paid, d.v.pay.length, d.v.lines.length, d.v.stage]).toEqual([
    'Sample Customer E',
    0,
    0,
    9,
    'Deposit due',
  ]);
  expect(app.errors).toEqual([]);
});
