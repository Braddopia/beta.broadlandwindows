// Service calls, deliveries, stock and holidays.
const { test, expect } = require('../helpers');

test('standard user: new service call step by step, from an existing contract', async ({ app }) => {
  await app.role('staff');
  expect(await app.run(() => canSee('service'))).toBe(true);
  await app.go('service');
  /* every row has its next step and a More menu (with Delete: anyone may delete a service call) */
  expect(await app.run(() => document.querySelectorAll('#main .svc-more').length)).toBeGreaterThan(0);
  await app.call('editCall');
  await expect(app.page.locator('#mbox .stp.wz')).toContainText('Customer');
  await app.page.selectOption('#f_existing', { index: 0 });
  await app.page.fill('#f_contract', '1023421');
  await app.page.dispatchEvent('#f_contract', 'change');
  expect(
    await app.run(() => [document.querySelector('#f_name').value, document.querySelector('#f_town').value])
  ).toEqual(['Sample Customer E', 'Aylsham']);
  await app.call('wzStep', 1);
  await app.page.selectOption('#f_cat', { index: 1 });
  await app.page.fill('#f_issue', 'Handle stiff on back door');
  await app.call('wzStep', 1);
  await expect(app.page.locator('#mbox .wz-info')).toContainText('1023421');
  await app.call('wzStep', 1);
  await app.page.fill('#f_visit', '2026-11-08');
  await app.call('wzStep', 1);
  await app.call('wzSave');
  const c = await app.run(() => state.calls[0]);
  expect([c.status, c.contract, c.takenBy, c.issue]).toEqual([
    'Booked',
    '1023421',
    'Demo User',
    'Handle stiff on back door',
  ]);
});

test('new service call for a new customer needs phone, address and town', async ({ app }) => {
  await app.role('staff');
  await app.call('editCall');
  await app.page.selectOption('#f_existing', 'No, new customer');
  await app.page.fill('#f_name', 'Sample Caller');
  await app.call('wzStep', 1);
  await expect(app.page.locator('.toast')).toContainText('phone');
  expect(await app.run(() => WZ.st)).toBe(0);
});

test('service call cannot close without a completion date', async ({ app }) => {
  await app.role('beta');
  await app.call('editCall', 'S-0871');
  // changing a call uses the same steps as a new one, plus Work Done
  await expect(app.page.locator('.stp.wz span')).toHaveText([
    /Customer/,
    /Problem/,
    /Check/,
    /Visit/,
    /Work Done/,
    /Photos/,
    /Review/,
  ]);
  await app.call('wzGo', 3);
  await app.page.selectOption('#f_status', 'Complete');
  await app.call('wzSave');
  expect(await app.run(() => state.calls.find((c) => c.id === 'S-0871').status)).not.toBe('Complete');
  expect(await app.run(() => WZ.steps[WZ.st].t)).toBe('Work Done');
  await expect(app.page.locator('.toast')).toContainText('date the work was completed');
});

test('service visits show on the calendar for every role that can see them', async ({ app }) => {
  for (const role of ['staff', 'beta']) {
    await app.role(role);
    expect(
      await app.run(() =>
        evs('2026-11-09')
          .map((e) => e.t)
          .join('|')
      ),
      role
    ).toContain('Service: 1023418 - SAMPLE CUSTOMER I');
  }
});

test('day sheet and service report print', async ({ app }) => {
  await app.role('beta');
  for (const fn of ['svcReport', 'invoicePrint']) {
    const [w] = await Promise.all([app.nextPopup(), fn === 'svcReport' ? app.call(fn) : app.call(fn, '1023421')]);
    await w.waitForLoadState();
    await w.close();
  }
});

test('delivery status follows the due date', async ({ app }) => {
  const s = await app.run(() =>
    [addDays(-1), today(), addDays(2), addDays(6), addDays(20)].map((d) => dAuto({ due: d }))
  );
  expect(s).toEqual(['Overdue', 'Due today', 'In transit', 'Due', 'Ordered']);
  expect(await app.run(() => dAuto({ due: addDays(-3), status: 'Received' }))).toBe('Received');
});

test('receiving a delivery asks who checked it', async ({ app }) => {
  await app.role('beta');
  await app.call('recvD', 'D-1');
  await app.page.waitForSelector('#f_status');
  expect(await app.run(() => document.querySelector('#f_status').value)).toBe('Received');
  await app.page.click('#saveBtn');
  expect(await app.run(() => state.deliveries.find((d) => d.id === 'D-1').status)).not.toBe('Received');
});

test('stock movements keep their own "stock after" figure', async ({ app }) => {
  await app.role('beta');
  const r = await app.run(() => {
    const k = products()[0].pid,
      before = prodRows(k)
        .map((x) => x.stock)
        .join(',');
    stockForm('add', k);
    document.querySelector('#f_qty').value = 5;
    ieSave();
    return [
      before,
      prodRows(k)
        .map((x) => x.stock)
        .join(','),
      products().find((x) => x.pid === k).stock,
    ];
  });
  expect(r).toEqual(['62', '67,62', 67]);
});

test('phone: stock page becomes big handheld buttons', async ({ app }) => {
  await app.page.setViewportSize({ width: 390, height: 844 });
  await app.role('beta');
  await app.go('stock');
  expect(await app.run(() => document.querySelectorAll('.pda-b').length)).toBe(6);
});

test('holiday days skip bank holidays and the Christmas shutdown; impossible dates are refused', async ({ app }) => {
  expect(await app.run(() => [holDays('2026-12-21', '2026-12-31'), wd('2026-12-21', '2026-12-31')])).toEqual([2, 9]);
  expect(await app.run(() => [SAFE.date('2026-02-30'), SAFE.date('2026-02-28'), SAFE.date('2024-02-29')])).toEqual([
    '',
    '2026-02-28',
    '2024-02-29',
  ]);
});

test('every reports tab draws, with the added trend and performance tables', async ({ app }) => {
  await app.role('beta');
  await app.go('reports');
  const want = {
    sales: 'Salesperson performance',
    contracts: 'Sales by salesperson',
    service: 'Engineer performance',
    deliveries: 'Supplier delivery record',
    people: 'Holiday by person',
    stock: 'Stock value by area',
  };
  for (const [t, title] of Object.entries(want)) {
    await app.run((t) => setUI('rep.t', t), t);
    await expect(app.page.locator('#main')).toContainText(title);
  }
  expect(app.errors).toEqual([]);
});

test('calendar: fittings show on every view for every account; the chip hides them; clicking one opens the job', async ({
  app,
}) => {
  for (const role of ['staff', 'beta']) {
    await app.role(role);
    await app.go('fitting');
    for (const m of ['month', 'week', 'agenda']) {
      await app.run(`setUI('cal.m', '${m}')`);
      await app.run(`setUI('cal.o', ${m == 'week' ? 1 : 0})`);
      await expect(app.page.locator('#main .ce.fit', { hasText: '1023421 - SAMPLE CUSTOMER E' }).first()).toBeVisible();
    }
    await app.run(`setUI('cal.m', 'month')`);
    await app.run(`setUI('cal.o', 0)`);
    await app.page.click('#main .chip:has-text("Fittings")');
    await expect(app.page.locator('#main .ce.fit')).toHaveCount(0);
    await app.page.click('#main .chip:has-text("Fittings")');
  }
  await app.role('staff');
  await app.go('fitting');
  await app.page.locator('#main .ce.fit', { hasText: '1023421' }).first().click();
  // accounts that can open contracts get the contract; others a pop-up with the job
  await expect(app.page.locator('#mbox')).toContainText('1023421 - SAMPLE CUSTOMER E');
  expect(app.errors).toEqual([]);
});

test('service call form: the job list drops down in the app style and fills the customer in; dates pick from our calendar', async ({
  app,
}) => {
  await app.role('staff');
  await app.go('service');
  await app.call('callWizard');
  await app.page.selectOption('#f_existing', { index: 0 });
  await app.page.click('#f_contract');
  await app.page.keyboard.type('aylsham');
  const list = app.page.locator('#pkpop.pk-list.open');
  await expect(list.locator('.pk-i')).toHaveCount(1);
  await expect(list).toContainText('1023421 - SAMPLE CUSTOMER E');
  // Enter picks the job without moving the wizard on
  await app.page.keyboard.press('Enter');
  await expect(app.page.locator('#f_contract')).toHaveValue('1023421');
  await expect(app.page.locator('#f_name')).toHaveValue('Sample Customer E');
  await expect(app.page.locator('#mbox')).toContainText('Step 1 of 6');
  await expect(list).toHaveCount(0);
  // picking another job replaces what the first one filled in
  await app.page.fill('#f_contract', '');
  await app.page.keyboard.type('1023418');
  await app.page.locator('#f_contract').blur();
  await expect(app.page.locator('#f_name')).toHaveValue('Sample Customer I');
  await app.page.click('#mbox .mact >> text=Next');
  await app.page.selectOption('#f_cat', { index: 2 });
  await app.page.fill('#f_issue', 'Handle stiff');
  await app.page.click('#mbox .mact >> text=Next');
  await app.page.click('#mbox .mact >> text=Next');
  // the visit date: our month calendar, not the browser's
  await app.page.click('#f_visit');
  const cal = app.page.locator('#pkpop.pk-cal.open');
  await expect(cal).toContainText('November 2026');
  await cal.locator('[data-dp=next]').click();
  await expect(cal).toContainText('December 2026');
  await cal.locator('[data-d="2026-12-03"]').click();
  await expect(app.page.locator('#f_visit')).toHaveValue('2026-12-03');
  await expect(cal).toHaveCount(0);
  expect(app.errors).toEqual([]);
});

test('service calls: the next step on each row asks for what it needs; Complete cannot close a call by accident', async ({
  app,
}) => {
  await app.role('staff');
  await app.go('service');
  // a booked call: the main button is Complete, which opens a short form (nothing changes until it is filled in)
  const id = await app.run(() => state.calls.find((c) => c.status == 'Booked').id);
  const row = app.page.locator(`#main tr:has-text("${id}")`);
  await row.locator('button:text-is("Complete")').click();
  await expect(app.page.locator('#mbox h2')).toHaveText('Complete The Call');
  expect(await app.run((i) => state.calls.find((c) => c.id == i).status, id)).toBe('Booked');
  await app.page.fill('#f_notes', '');
  await app.page.click('#svcGo');
  await expect(app.page.locator('#mbox .ferr')).toContainText('Work carried out');
  await app.page.fill('#f_notes', 'Adjusted the hinge and lubricated the lock');
  await app.page.click('#svcGo');
  expect(
    await app.run((i) => [state.calls.find((c) => c.id == i).status, state.calls.find((c) => c.id == i).doneAt], id)
  ).toEqual(['Complete', '2026-11-08']);
  await expect(app.page.locator('.toast.ok')).toContainText('completed');
  await app.page.click('.toast .tp-a');
  expect(await app.run((i) => state.calls.find((c) => c.id == i).status, id)).toBe('Booked');
  // the More menu: waiting for parts, with what is needed
  await app.page.locator(`#main tr:has-text("${id}") .svc-more`).click();
  await app.page.click('#fpop >> text=Waiting for parts');
  await app.page.fill('#f_parts', 'Replacement hinge');
  await app.page.click('#svcGo');
  expect(await app.run((i) => state.calls.find((c) => c.id == i).status, id)).toBe('Awaiting parts');
  // its main button is now Parts In
  await expect(app.page.locator(`#main tr:has-text("${id}") button:text-is("Parts In")`)).toHaveCount(1);
  // an open call without a visit: Book Visit
  const open = await app.run(() => state.calls.find((c) => c.status == 'Open' && !c.visit).id);
  await app.page.locator(`#main tr:has-text("${open}") button:text-is("Book Visit")`).click();
  await app.page.selectOption('#f_fitter', { index: 1 });
  await app.page.click('#svcGo');
  expect(await app.run((i) => state.calls.find((c) => c.id == i).status, open)).toBe('Booked');
  expect(await app.run(() => getComputedStyle(document.querySelector('#main .t-svc td.c')).textAlign)).toBe('center');
  // a standard account may delete a service call (from the More menu, after a check)
  const n = await app.run(() => state.calls.length);
  await app.page.locator(`#main tr:has-text("${id}") .svc-more`).click();
  await app.page.click('#fpop >> text=Delete');
  await app.page.click('#mbox [data-act=askGo]');
  expect(await app.run(() => state.calls.length)).toBe(n - 1);
  expect(app.errors).toEqual([]);
});

test('service report: tick which of the call and contract photos to print', async ({ app }) => {
  await app.role('beta');
  const RED =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  const BLUE =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADAgH/6Q0CYwAAAABJRU5ErkJggg==';
  const id = await app.run(
    ([r, b]) => {
      const c = state.calls.find((x) => x.contract && state.contracts.some((k) => k.id == x.contract));
      c.photos = [r];
      state.contracts.find((k) => k.id == c.contract).photos = [b];
      return c.id;
    },
    [RED, BLUE]
  );
  await app.call('reportCall', id, 'c');
  await expect(app.page.locator('#mbox .rp-ck')).toHaveCount(2);
  // the call's own photo starts ticked, the contract's does not
  await expect(app.page.locator('#mbox .rp-ck:checked')).toHaveCount(1);
  await app.page.click('#mbox .rp-all >> nth=1');
  await app.page.locator('#mbox .rp-ck >> nth=0').uncheck();
  const [w] = await Promise.all([app.nextPopup(), app.page.click('#mbox >> text=Print report')]);
  await w.waitForLoadState();
  const html = await w.content();
  expect(html.includes(BLUE)).toBe(true);
  expect(html.includes(RED)).toBe(false);
  await w.close();
});
