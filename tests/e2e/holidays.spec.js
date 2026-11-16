// Booking holiday: paid or unpaid must be chosen; unpaid leave does not use the allowance.
const { test, expect } = require('../helpers');

test('paid or unpaid is required, and unpaid leave keeps the allowance', async ({ app }) => {
  await app.role('beta');
  const sid = await app.run(() => state.staff[0].id);
  const left = () =>
    app.run(
      (id) =>
        holLeft(
          state.staff.find((s) => s.id == id),
          2026
        ),
      sid
    );
  const before = await left();
  await app.call('holBook', sid, '2026-11-16');
  await app.page.fill('#ht', '2026-11-17');
  await app.page.click('#mbox [data-act=holSave]');
  await expect(app.page.locator('#mbox .paidq')).toHaveClass(/bad/);
  await app.page.check('input[name=hpaid][value=unpaid]');
  await app.page.click('#mbox [data-act=holSave]');
  const h = await app.run(() => state.hols[state.hols.length - 1]);
  expect([h.paid, h.days]).toEqual([false, 2]);
  expect(await left()).toBe(before);
  expect(
    await app.run(
      (id) =>
        absCode(
          state.staff.find((s) => s.id == id),
          '2026-11-16'
        ),
      sid
    )
  ).toBe('U');
});

test('My Holiday shows days left in a ring, the numbers beside it, and Next / Previous / All open as pop-ups', async ({
  app,
}) => {
  await app.role('staff');
  await app.go('home');
  const ring = app.page.locator('.hring');
  await expect(ring).toContainText('Days Left');
  const big = await ring.locator('b').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  const other = await app.page
    .locator('.hlist dd')
    .first()
    .evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(big).toBeGreaterThan(other * 1.6);
  await expect(app.page.locator('.hlist')).toContainText('Allowance');
  await app.page.click('#main .hbtns >> text=Previous');
  await expect(app.page.locator('#mbox h2')).toContainText('Previous Holidays');
  // switch between the three lists inside the pop-up
  await app.page.click('#mbox .hol-seg >> text=Next');
  await expect(app.page.locator('#mbox h2')).toContainText('Coming Up');
  await app.call('closeModal');
  // the same panel on My Calendar
  await app.go('fitting');
  await expect(app.page.locator('#main .hring')).toBeVisible();
  await app.page.click('#main .hbtns >> text=All Holidays');
  await expect(app.page.locator('#mbox h2')).toContainText('All Holidays');
});

test('a booking can be undone from the banner, and a holiday that has not started can be cancelled (with Undo)', async ({
  app,
}) => {
  await app.role('beta');
  const sid = await app.run(() => me().id);
  const count = () => app.run((id) => state.hols.filter((h) => h.sid == id).length, sid);
  const n = await count();
  await app.call('holBook', sid, '2026-11-23');
  await app.page.check('input[name=hpaid][value=paid]');
  await app.page.click('#mbox [data-act=holSave]');
  expect(await count()).toBe(n + 1);
  // the banner at the bottom says it worked and offers Undo
  await expect(app.page.locator('.toast.ok')).toContainText('Holiday booked');
  await app.page.click('.toast .tp-a');
  expect(await count()).toBe(n);
  // book it again, then cancel it from the list of coming holidays
  await app.call('holBook', sid, '2026-11-23');
  await app.page.check('input[name=hpaid][value=paid]');
  await app.page.click('#mbox [data-act=holSave]');
  await app.call('myHolidays', sid, 'next');
  await app.page.click('#mbox .row:has-text("23 Nov") >> text=Cancel');
  expect(await count()).toBe(n);
  await expect(app.page.locator('.toast.ok')).toContainText('Holiday cancelled');
  await app.page.click('.toast .tp-a');
  expect(await count()).toBe(n + 1);
  expect(app.errors).toEqual([]);
});

test('Book Holiday uses the site form style: labelled boxes, paid or unpaid as two cards', async ({ app }) => {
  await app.role('beta');
  await app.call('bookMine');
  await expect(app.page.locator('#mbox label[for=hf]')).toHaveText('First day off');
  await expect(app.page.locator('#mbox .chq .chc')).toHaveCount(2);
  // tick boxes and radio buttons keep their own small size (not the 2.8rem of a text box)
  const h = await app.run(() => document.querySelector('#mbox input[name=hpaid]').getBoundingClientRect().height);
  expect(h).toBeLessThan(24);
});

test('holidays start and end Monday to Friday; Next ignores a pending request; a turned-down request sends a System message', async ({
  app,
}) => {
  await app.role('beta');
  const sid = await app.run(() => me().id);
  // a Saturday is moved on to the Monday, and a weekend date typed in is refused
  await app.call('holBook', sid, '2026-11-21');
  await expect(app.page.locator('#hf')).toHaveValue('2026-11-23');
  await app.page.fill('#ht', '2026-11-28');
  await app.page.dispatchEvent('#ht', 'change');
  await expect(app.page.locator('#hi')).toContainText('Monday to Friday');
  await app.page.check('input[name=hpaid][value=paid]');
  const n = await app.run(() => state.hols.length);
  await app.page.click('#mbox [data-act=holSave]');
  expect(await app.run(() => state.hols.length)).toBe(n);
  await expect(app.page.locator('.toast')).toContainText('Monday to Friday');
  await app.closeAll();
  // My Holiday's Next button shows approved holidays only
  const pend = await app.run((id) => state.hols.find((h) => h.sid == id && h.status == 'Pending'), sid);
  await app.go('home');
  const next = await app.text('#main .hol-p .hbtns .btn');
  expect(next).not.toContain(await app.run((d) => fd(d), pend.from));
  // turned down: the person hears in Messages, from System, and cannot reply there
  await app.call('holSet', pend.id, 'Rejected');
  await app.go('messages');
  await app.run(() => setUI('msg.to', 'System'));
  await expect(app.page.locator('#main .msn-t')).toContainText('was not approved');
  await expect(app.page.locator('#main #m_t')).toHaveCount(0);
  expect(app.errors).toEqual([]);
});

test('cancelling an approved holiday is a request: it stays booked until an administrator approves, then System says so', async ({
  app,
}) => {
  await app.role('staff');
  const sid = await app.run(() => me().id);
  const id = await app.run((s) => {
    const h = { id: 'HTEST1', sid: s, from: '2026-12-07', to: '2026-12-08', days: 2, status: 'Approved', paid: true };
    state.hols.push(h);
    return h.id;
  }, sid);
  await app.call('myHolidays', sid, 'next');
  await app.page.click('#mbox .row:has-text("7 Dec") >> text=Ask To Cancel');
  await expect(app.page.locator('.toast')).toContainText('Cancellation request sent');
  // still booked, marked as waiting, and the button has gone
  expect(await app.run((i) => state.hols.find((h) => h.id == i).cancelReq, id)).toBe(true);
  await expect(app.page.locator('#mbox .row:has-text("7 Dec") .tag')).toContainText(['Cancel Requested']);
  await expect(app.page.locator('#mbox .row:has-text("7 Dec") >> text=Ask To Cancel')).toHaveCount(0);
  await app.closeAll();
  // a request still waiting for approval is withdrawn straight away
  await app.run(
    (s) =>
      state.hols.push({
        id: 'HTEST2',
        sid: s,
        from: '2026-12-14',
        to: '2026-12-14',
        days: 1,
        status: 'Pending',
        paid: true,
      }),
    sid
  );
  await app.call('holDel', 'HTEST2');
  expect(await app.run(() => state.hols.some((h) => h.id == 'HTEST2'))).toBe(false);
  // the administrator sees it waiting and approves the cancellation
  await app.role('beta');
  await app.run(() => {
    setUI('hol.v', 'chart');
    go('holidays');
  });
  await expect(app.page.locator('#main .row:has-text("wants to cancel") >> text=Approve Cancel')).toHaveCount(1);
  await app.page.click('#main .row:has-text("wants to cancel") >> text=Approve Cancel');
  expect(await app.run((i) => state.hols.some((h) => h.id == i), id)).toBe(false);
  const msg = await app.run((s) => state.notes.filter((n) => n.by == 'System' && n.to == staffName(s)).pop().t, sid);
  expect(msg).toContain('has been cancelled, approved by');
  expect(app.errors).toEqual([]);
});
