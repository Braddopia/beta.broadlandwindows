// Search: records, typed commands, plain-English questions and the Ctrl+K box.
const { test, expect } = require('../helpers');

test.beforeEach(async ({ app }) => {
  await app.role('beta');
});

test('plain-English questions find the right records', async ({ app }) => {
  const cases = {
    'fittings this week': 'Fittings this week = 1',
    'contracts with money owed': 'Contracts with money owed = 4',
    'leads from website': 'Leads from Website = 2',
    'urgent service calls': 'urgent service calls = 1',
    'deliveries overdue': 'overdue deliveries = 1',
    'stock running low': 'Stock running low = 1',
    'contracts in Norwich': 'Contracts in Norwich = 1',
    'won leads': 'won leads = 1',
  };
  for (const [q, want] of Object.entries(cases)) {
    expect(
      await app.run((q) => {
        const n = nlq(q);
        return n ? n.title + ' = ' + n.L.length : 'none';
      }, q),
      q
    ).toBe(want);
  }
});

test('Ctrl+K opens the big box; typed payment command offers the action', async ({ app }) => {
  await app.page.keyboard.press('Control+KeyK');
  await expect(app.page.locator('#cmdk')).toHaveClass(/open/);
  await expect(app.page.locator('#cq')).toBeFocused();
  await app.page.keyboard.type('pay 100 1023421');
  await expect(app.page.locator('#cres')).toContainText('Record £100.00 Payment On 1023421');
});

test('search finds a contract by number and a lead by name', async ({ app }) => {
  const r = await app.run(() => {
    const b = srchBuild('1023421', true).html + srchBuild('Sample Customer A', true).html;
    return [b.includes('1023421'), b.includes('Sample Customer A')];
  });
  expect(r).toEqual([true, true]);
});

test('note typed in search keeps its capitals', async ({ app }) => {
  const html = await app.run(() => srchBuild('note 1023421 Rang Mrs Smith', true).html);
  expect(html).toContain('Rang Mrs Smith');
});

test('an exact number, name or phone is highlighted first, for every kind of record', async ({ app }) => {
  await app.role('beta');
  for (const [page, q, label] of [
    ['contracts', '1023415', 'Sample Customer J'],
    ['leads', 'L0003', 'Sample Customer C'],
    ['leads', '01632 963 882', 'Sample Customer C'],
    ['service', 'S-0871', 'Sample Customer I'],
  ]) {
    await app.go(page);
    await app.page.fill('#sb input', q);
    const first = app.page.locator('#sres .sri').first();
    await expect(first, q).toHaveClass(/sri-x/);
    await expect(first, q).toContainText(new RegExp(label, 'i'));
    const row = app.page.locator('#main .clk-r.xhit');
    await expect(row, q).toHaveCount(1);
    await expect(row, q).toContainText('Exact Match');
    await expect(app.page.locator('#main .clk-r').first(), q).toHaveClass(/xhit/);
    await app.page.fill('#sb input', '');
  }
  // part of a name is not exact
  await app.page.fill('#sb input', 'Sample');
  await expect(app.page.locator('#sres .sri-x')).toHaveCount(0);
});

test('search answers questions and finds labels on any page: "amount outstanding", "vat", "trickle vents"', async ({ app }) => {
  await app.role('beta');
  await app.page.fill('#sb input', 'amount outstanding');
  await expect(app.page.locator('#sres .srg.ans')).toHaveText('Answer');
  await expect(app.page.locator('#sres .sri-a').first()).toContainText('£26,742 Still To Collect');
  await expect(app.page.locator('#sres')).toContainText('Balance To Collect: £26,742');
  // a label found on a page opens that page and lights the spot up
  await app.page.locator('#sres .sri', { hasText: 'Balance To Collect' }).first().click();
  await expect(app.page.locator('#main .sx-hit')).toHaveCount(1);
  await app.page.fill('#sb input', 'vat');
  await expect(app.page.locator('#sres .sri-a').first()).toContainText('VAT Is 20%');
  await app.page.fill('#sb input', 'trickle vents');
  await expect(app.page.locator('#sres')).toContainText('Column in the Survey step');
  // money answers stay hidden from accounts without money access
  await app.role('staff');
  await app.page.fill('#sb input', 'amount outstanding');
  await expect(app.page.locator('#sres')).not.toContainText('Still To Collect');
  expect(app.errors).toEqual([]);
});

test('a question typed on a list page filters the list the way the search answers it, and never empties it by mistake', async ({ app }) => {
  await app.role('beta');
  await app.go('contracts');
  await app.run(() => setUI('con.f', 'all'));
  const rows = app.page.locator('#main tbody tr.clk-r');
  await app.page.fill('#sb input', 'jobs in norwich');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('1023418');
  // no kind of record named: on its own page the question is about that page's records
  await app.page.fill('#sb input', 'balance outstanding');
  await expect(rows).toHaveCount(4);
  // a question about something else leaves the list alone
  await app.page.fill('#sb input', 'stock value');
  await expect(rows).toHaveCount(5);
  // plain words still filter as before, and nonsense still finds nothing
  await app.page.fill('#sb input', 'aylsham');
  await expect(rows).toHaveCount(1);
  await app.page.fill('#sb input', 'zzzz');
  await expect(rows).toHaveCount(0);
  expect(app.errors).toEqual([]);
});

test('Mark All Read clears the number on the bell and dims the rows; a new alert counts again', async ({ app }) => {
  await app.role('beta');
  const before = await app.run(() => ncCount());
  expect(before).toBeGreaterThan(0);
  await app.page.click('#bell');
  await app.page.click('#nc >> text=Mark All Read');
  expect(await app.run(() => ncCount())).toBe(0);
  await expect(app.page.locator('#bellN')).toBeHidden();
  expect(await app.page.locator('#nc .nrow:not(.seen)').count()).toBe(0);
  // nothing was deleted: the alerts are still listed
  expect(await app.page.locator('#nc .nrow').count()).toBeGreaterThan(0);
  // a low-stock alert whose stock level changes is new again
  await app.run(() => {
    const a = ncData().alr.find((x) => x.k == 'Low Stock');
    const r = state.items.find((x) => 'low:' + x.pid == a.key);
    r.stock = Math.max(0, r.stock - 1);
    render();
  });
  expect(await app.run(() => ncCount())).toBe(1);
  expect(app.errors).toEqual([]);
});
