// Saving and loading: data survives a reload, other open tabs catch up, and a backup restores.
const { test, expect } = require('../helpers');

test.beforeEach(async ({ app }) => {
  await app.role('beta');
});

const reloadApp = async (page) => {
  await page.reload();
  await page.waitForFunction(() => window.CRM && document.querySelector('#main').children.length > 0);
};

test('a saved change survives a reload', async ({ app }) => {
  await app.run(() => {
    state.leads[0].notes = 'Saved note 123';
    store();
  });
  await app.page.waitForTimeout(400);
  await reloadApp(app.page);
  expect(await app.run(() => state.leads[0].notes)).toBe('Saved note 123');
});

test('another open tab picks up a save, but waits while a popup is open', async ({ app }) => {
  const other = await app.page.context().newPage();
  await other.goto(app.page.url());
  await other.waitForFunction(() => window.CRM && document.querySelector('#main').children.length > 0);
  const otherNote = () => other.evaluate(() => window.CRM.state.leads[0].notes);

  await other.evaluate(() => window.CRM.openLead(window.CRM.state.leads[0].id));
  await app.run(() => {
    state.leads[0].notes = 'From the first tab';
    store();
  });
  await other.waitForTimeout(600);
  expect(await otherNote()).not.toBe('From the first tab');

  await other.evaluate(() => {
    window.CRM.recordWin.dirty = 0;
    window.CRM.closeModal();
  });
  await expect.poll(otherNote, { timeout: 3000 }).toBe('From the first tab');
  await other.close();
});

test('restoring a backup replaces the data but keeps this device PINs', async ({ app }) => {
  const before = await app.run(() => ({ salt: state.sec.salt, leads: state.leads.length }));
  const reloaded = app.page.waitForEvent('load');
  await app.run(() => {
    const copy = JSON.parse(JSON.stringify(state));
    copy.leads = copy.leads.slice(0, 1);
    copy.sec = { salt: 'from-backup', pins: {} };
    backupApply(copy);
  });
  await reloaded;
  await app.page.waitForFunction(() => window.CRM && document.querySelector('#main').children.length > 0);
  const after = await app.run(() => ({ salt: state.sec.salt, leads: state.leads.length }));
  expect(before.leads).toBeGreaterThan(1);
  expect(after).toEqual({ salt: before.salt, leads: 1 });
});
