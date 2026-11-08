// Search: records, typed commands, plain-English questions and the Ctrl+K box.
const { test, expect } = require('../helpers');

test.beforeEach(async ({ app }) => { await app.role('beta'); });

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
    expect(await app.run((q) => { const n = nlq(q); return n ? n.title + ' = ' + n.L.length : 'none'; }, q), q).toBe(want);
  }
});

test('Ctrl+K opens the big box; typed payment command offers the action', async ({ app }) => {
  await app.page.keyboard.press('Control+KeyK');
  await expect(app.page.locator('#cmdk')).toHaveClass(/open/);
  await app.page.keyboard.type('pay 100 2402318');
  await expect(app.page.locator('#cres')).toContainText('Record £100.00 Payment On 2402318');
});

test('search finds a contract by number and a lead by name', async ({ app }) => {
  const r = await app.run(() => { const b = srchBuild('2402318', true).html + srchBuild('Sample Customer A', true).html; return [b.includes('2402318'), b.includes('Sample Customer A')]; });
  expect(r).toEqual([true, true]);
});

test('note typed in search keeps its capitals', async ({ app }) => {
  const html = await app.run(() => srchBuild('note 2402318 Rang Mrs Smith', true).html);
  expect(html).toContain('Rang Mrs Smith');
});
