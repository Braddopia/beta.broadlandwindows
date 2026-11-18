// v19.10: the go-to-page countdown, one success banner, the Messages people list, half-day holidays and booking
// checks, the calendar Showing bar and notes, and customers already in leads and contracts in the Contact Book.
const { test, expect } = require('../helpers');

test('going to another page fills the Go button over 5 seconds and goes by itself; pointing at the box pauses it', async ({
  app,
}) => {
  await app.role('staff');
  await app.go('home');
  await app.page.mouse.move(5, 5);
  await app.page.click('#main button.kpi >> nth=0');
  /* the Go button's background fills up; there is no number on it */
  await expect(app.page.locator('.aski.cnt .cd-f')).toHaveCount(1);
  await expect(app.page.locator('.aski [data-a="1"]')).toHaveText('Go To Service Calls');
  await expect(app.page.locator('.aski [data-a="0"]')).toHaveText('Stay Here');
  /* paused while the pointer is on it */
  await app.page.hover('.aski-b');
  await app.page.waitForTimeout(1500);
  const fill = () => app.run(() => document.querySelector('.aski .cd-f').style.transform);
  const n = await fill();
  await app.page.waitForTimeout(1200);
  expect(await fill()).toBe(n);
  await expect(app.page.locator('.aski .cd-h')).toHaveText('Paused');
  /* moving away lets it finish, and it opens the page */
  await app.page.mouse.move(5, 5);
  await expect(app.page.locator('.aski')).toHaveCount(0, { timeout: 7000 });
  expect(await app.run(() => document.body.dataset.view)).toBe('service');
  expect(app.errors).toEqual([]);
});

test('a holiday request shows one banner low down, with the drawn tick, the dates and Undo', async ({ app }) => {
  await app.role('staff');
  await app.call('bookMine');
  await app.page.fill('#hf', '2026-12-07');
  await app.page.fill('#ht', '2026-12-08');
  await app.page.dispatchEvent('#ht', 'change');
  await app.page.check('input[name=hpaid][value=unpaid]');
  await app.page.click('#hGo');
  await expect(app.page.locator('#toast.big')).toContainText('Request Sent For Approval');
  await expect(app.page.locator('#toast.big .tp-s')).toHaveText('7 Dec to 8 Dec · 2 days');
  await expect(app.page.locator('#toast .tp-ring')).toHaveCount(1);
  await expect(app.page.locator('#yay')).toHaveCount(0);
  const n = await app.run(() => state.hols.length);
  await app.page.click('#toast .tp-a');
  expect(await app.run(() => state.hols.length)).toBe(n - 1);
});

test('holiday booking: half days (H1 / H2), no booking the same days twice, no requests in the past', async ({
  app,
}) => {
  await app.role('staff');
  const sid = await app.run(() => me().id);
  /* a morning off */
  await app.call('bookMine');
  await app.page.check('input[name=hlen][value=half]');
  await expect(app.page.locator('#htW')).toBeHidden();
  await expect(app.page.locator('#hhW')).toBeVisible();
  await app.page.fill('#hf', '2026-12-09');
  await app.page.dispatchEvent('#hf', 'change');
  await app.page.check('input[name=hpaid][value=paid]');
  await expect(app.page.locator('#hi .hsum-n b')).toHaveText('½');
  await app.page.click('#hGo');
  /* the same morning again is refused, the afternoon is fine */
  await app.call('bookMine');
  await app.page.check('input[name=hlen][value=half]');
  await app.page.fill('#hf', '2026-12-09');
  await app.page.dispatchEvent('#hf', 'change');
  await app.page.check('input[name=hpaid][value=paid]');
  await expect(app.page.locator('#hi .warn.bad')).toContainText('already have 9 Dec · Half day (morning)');
  await expect(app.page.locator('#hGo')).toHaveClass(/dim/);
  await app.page.check('input[name=hhalf][value=pm]');
  await expect(app.page.locator('#hi .warn.bad')).toHaveCount(0);
  await app.page.click('#hGo');
  /* a full day over a booked day is refused, and so is a day in the past */
  await app.call('bookMine');
  await app.page.fill('#hf', '2026-12-09');
  await app.page.fill('#ht', '2026-12-10');
  await app.page.dispatchEvent('#ht', 'change');
  await app.page.check('input[name=hpaid][value=paid]');
  await app.page.click('#hGo');
  await expect(app.page.locator('#toast.bad')).toContainText('already have');
  await app.page.fill('#hf', '2026-10-05');
  await app.page.fill('#ht', '2026-10-05');
  await app.page.dispatchEvent('#ht', 'change');
  await app.page.click('#hGo');
  await expect(app.page.locator('#toast.bad')).toContainText('Pick a day from today onwards');
  await app.closeAll();
  const mine = await app.run(
    (id) => state.hols.filter((h) => h.sid == id && h.from == '2026-12-09').map((h) => [h.half, h.days]),
    sid
  );
  expect(mine.sort()).toEqual([
    ['am', 0.5],
    ['pm', 0.5],
  ]);
  /* approved, the chart shows a whole day (both halves); one half alone is H1 or H2 */
  await app.role('beta');
  const codes = await app.run((id) => {
    state.hols.filter((h) => h.sid == id && h.status == 'Pending').forEach((h) => holSet(h.id, 'Approved'));
    const s = state.staff.find((x) => x.id == id);
    const both = absCode(s, '2026-12-09');
    state.hols = state.hols.filter((h) => !(h.sid == id && h.from == '2026-12-09' && h.half == 'pm'));
    return [both, absCode(s, '2026-12-09')];
  }, sid);
  expect(codes).toEqual(['H', 'H1']);
});

test('asking to cancel an approved paid holiday: it stays booked until an administrator says yes', async ({ app }) => {
  await app.role('staff');
  const sid = await app.run(() => me().id);
  await app.run(
    (id) =>
      state.hols.push({
        id: 'HZ',
        sid: id,
        from: '2026-12-14',
        to: '2026-12-15',
        days: 2,
        status: 'Approved',
        paid: true,
      }),
    sid
  );
  await app.call('myHolidays', sid, 'next');
  await app.page.click('#mbox .row:has-text("14 Dec") >> text=Ask To Cancel');
  expect(await app.run(() => state.hols.find((h) => h.id == 'HZ').cancelReq)).toBe(true);
  await app.role('beta');
  await app.call('holSet', 'HZ', 'Approved');
  expect(await app.run(() => state.hols.some((h) => h.id == 'HZ'))).toBe(false);
  expect(await app.run(() => state.notes.some((m) => m.by == 'System' && /cancelled/.test(m.t)))).toBe(true);
});

test('Messages: the people list matches the chat list; deleting a message has Undo; an empty send shakes', async ({
  app,
}) => {
  await app.role('staff');
  await app.go('messages');
  await expect(app.page.locator('#main .msn-p h1')).toHaveText('People');
  /* the same row style as the chats on the left */
  const [l, r] = await app.run(() =>
    ['.msn-l .msn-c .mav', '.msn-p .msn-c .mav'].map((s) => document.querySelector(s).getBoundingClientRect().width)
  );
  expect(r).toBe(l);
  await app.page.click('#main .msn-send');
  await expect(app.page.locator('#m_t')).toHaveClass(/shake/);
  await app.page.fill('#m_t', 'Delete me');
  await app.page.keyboard.press('Enter');
  await app.page.click('#main .bub-x');
  await app.page.click('#mbox [data-act=askGo]');
  await expect(app.page.locator('#main .bw.me')).toHaveCount(0);
  await app.page.click('#toast .tp-a');
  await expect(app.page.locator('#main .bw.me')).toContainText('Delete me');
});

test('Calendar: the Showing bar has no ticks, and My Notes is a big note pad', async ({ app }) => {
  await app.role('staff');
  await app.go('fitting');
  const tick = await app.run(() => getComputedStyle(document.querySelector('#main .lay.on .lck'), '::after').content);
  expect(tick == 'none' || tick == 'normal').toBe(true);
  const h = await app.run(() => document.querySelector('#calNote').getBoundingClientRect().height);
  expect(h).toBeGreaterThan(250);
});

test('Contact Book: customers from leads and contracts are already in it, and supplier cards say what they supply', async ({
  app,
}) => {
  await app.role('beta');
  const r = await app.run(() => {
    const cust = state.contacts.filter((c) => c.type == 'Customer');
    return [cust.length, state.contracts.every((c) => !c.name || cust.some((k) => k.id == c.contact))];
  });
  expect(r[0]).toBeGreaterThan(0);
  expect(r[1]).toBe(true);
  await app.run(() => {
    state.contacts.find((c) => c.co == 'Example Glass Ltd').cat = 'Sealed units and glass';
  });
  await app.go('contacts');
  await expect(app.page.locator('#main .cc2:has-text("Example Glass Ltd") small').first()).toContainText(
    'Sealed units and glass'
  );
});
