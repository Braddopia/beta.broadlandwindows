// v19.9: the top half of the site (Overview, Messages, Calendar, Contact Book, Leads, Contracts) made consistent:
// every widget leads somewhere (asking before leaving the page), buttons answer the pointer, drop-downs grow from the
// click, notes on the calendar, customers kept in the Contact Book, and a success tick when something new is made.
const { test, expect } = require('../helpers');

test('Overview: the greeting does not play again after the page settles, and every widget leads somewhere', async ({
  app,
}) => {
  await app.role('staff');
  await app.go('messages');
  await app.go('home');
  await app.page.waitForTimeout(1400);
  /* the slide-in belongs to the page entrance only, so it cannot restart when the entrance finishes */
  expect(await app.run(() => getComputedStyle(document.querySelector('.hero')).animationName)).toBe('none');
  const dead = await app.run(() =>
    [...document.querySelectorAll('#main .kpi, #main .hpan')].flatMap((w) =>
      [...w.querySelectorAll('*')]
        .filter((e) => !e.children.length && e.textContent.trim() && !e.closest('button,a,[data-row],[data-act],h2'))
        .map((e) => e.textContent.trim())
    )
  );
  expect(dead).toEqual([]);
  /* a tile asks before taking you to its page */
  await app.page.click('#main button.kpi >> nth=0');
  await expect(app.page.locator('.aski')).toBeVisible();
  await app.page.keyboard.press('Escape');
  expect(await app.run(() => document.body.dataset.view)).toBe('home');
  /* the holiday ring opens the holidays pop-up */
  await app.page.click('#main .hol2');
  await expect(app.page.locator('#modal')).toHaveClass(/open/);
  expect(app.errors).toEqual([]);
});

test('Report A Problem stays full size while a pop-up is open', async ({ app }) => {
  const w0 = await app.run(() => document.querySelector('#rpb').getBoundingClientRect().width);
  await app.call('editContact');
  const w1 = await app.run(() => document.querySelector('#rpb').getBoundingClientRect().width);
  expect(w1).toBeCloseTo(w0, 0);
  await expect(app.page.locator('#rpb span')).toBeVisible();
});

test('Messages: people in the chat on the right; the send button lights up and a sent message says Sent', async ({
  app,
}) => {
  await app.role('staff');
  await app.go('messages');
  const n = await app.run(() => state.staff.filter((s) => s.name).length);
  await expect(app.page.locator('#main .msn-p .msn-pp')).toHaveCount(n);
  await expect(app.page.locator('#main .msn-p .msn-pp.you .msn-you')).toHaveText('You');
  await expect(app.page.locator('#main .msn-send')).not.toHaveClass(/ready/);
  await app.page.fill('#m_t', 'Morning all');
  await expect(app.page.locator('#main .msn-send')).toHaveClass(/ready/);
  await app.page.keyboard.press('Enter');
  await expect(app.page.locator('#main .bw.me.new')).toContainText('Morning all');
  await expect(app.page.locator('#main .bub-ok')).toHaveText('Sent');
  /* clicking a person opens a chat with just them, with their phone and email beside it */
  await app.page.click('#main .msn-pp:has-text("Fitter A")');
  await expect(app.page.locator('#main .msn-h')).toContainText('Fitter A');
  await expect(app.page.locator('#main .msn-pc')).toContainText('fitter.a@example.com');
  expect(app.errors).toEqual([]);
});

test('drop-down lists grow out of the spot that was clicked', async ({ app }) => {
  await app.call('editContact');
  const b = await app.page.locator('#c_type').boundingBox();
  await app.page.mouse.click(b.x + b.width - 20, b.y + b.height / 2);
  await expect(app.page.locator('#pkpop')).toHaveClass(/open/);
  await expect(app.page.locator('#pkpop')).toHaveClass(/grow/);
  const [ox] = await app.run(() => document.querySelector('#pkpop').style.transformOrigin.split(' ').map(parseFloat));
  expect(ox).toBeGreaterThan(b.width / 2);
});

test('Calendar: My Notes saves as you type, stays after a reload, and can be cleared with Undo', async ({ app }) => {
  await app.role('staff');
  await app.go('fitting');
  await app.page.fill('#calNote', 'Ring Fitter A about the handles');
  await expect(app.page.locator('#calNoteSt')).toHaveText('Saved');
  await app.page.reload();
  await app.page.waitForFunction(() => window.CRM && document.querySelector('#main').children.length > 0);
  await app.go('fitting');
  await expect(app.page.locator('#calNote')).toHaveValue('Ring Fitter A about the handles');
  await app.page.click('#main .cal-notes .mini:has-text("Clear")');
  await app.page.click('.aski [data-a="1"]');
  await expect(app.page.locator('#calNote')).toHaveValue('');
  await app.page.click('#toast .tp-a');
  await expect(app.page.locator('#calNote')).toHaveValue('Ring Fitter A about the handles');
  /* the notes belong to whoever is signed in */
  expect(await app.run(() => Object.keys(state.calNotes))).toEqual([await app.run(() => USER)]);
});

test('Calendar: a delivery opens in a pop-up, with the way on to the Deliveries page', async ({ app }) => {
  await app.role('staff');
  await app.go('fitting');
  await app.page.click('#main .ce.del >> nth=0');
  await expect(app.page.locator('#mbox h2')).toContainText('Delivery:');
  expect(await app.run(() => document.body.dataset.view)).toBe('fitting');
  await app.page.click('#mbox button:has-text("Continue To Deliveries")');
  expect(await app.run(() => document.body.dataset.view)).toBe('deliveries');
});

test('a new lead puts its customer in the Contact Book, a success tick shows, and the next lead can pick them', async ({
  app,
}) => {
  await app.role('beta');
  const before = await app.run(() => state.contacts.filter((c) => c.type == 'Customer').length);
  await app.call('leadWizard');
  await app.page.selectOption('#f_title', 'Mr');
  await app.page.fill('#f_name', 'Sample Customer Z');
  await app.page.fill('#f_mob1', '07700 900 777');
  await app.page.fill('#f_email1', 'z@example.com');
  await app.call('wzStep', 1);
  await expect(app.page.locator('#f_homeAddr')).toBeVisible();
  await app.page.fill('#f_homeAddr', '7 Sample Lane');
  await app.page.fill('#f_town', 'Norwich');
  await app.page.fill('#f_homePc', 'nr6 5dr');
  await app.call('wzStep', 1);
  await expect(app.page.locator('#f_productType')).toBeVisible();
  await app.page.selectOption('#f_productType', { index: 1 });
  await app.call('wzStep', 1);
  await app.call('wzStep', 1);
  await app.call('wzSave');
  await expect(app.page.locator('#toast.big')).toContainText('Lead Created');
  const k = await app.run(() => {
    const l = state.leads.find((x) => x.name == 'Sample Customer Z');
    return state.contacts.find((c) => c.id == l.contact);
  });
  expect([k.type, k.name, k.phone, k.email, k.pc, k.town]).toEqual([
    'Customer',
    'Sample Customer Z',
    '07700 900 777',
    'z@example.com',
    'NR6 5DR',
    'Norwich',
  ]);
  expect(await app.run(() => state.contacts.filter((c) => c.type == 'Customer').length)).toBe(before + 1);
  /* a new contract can start from that customer: picking them fills every step */
  await app.closeAll();
  await app.call('contractWizard');
  await app.page.selectOption('#f_contact', k.id);
  await expect(app.page.locator('#f_name')).toHaveValue('Sample Customer Z');
  await expect(app.page.locator('#f_mob1')).toHaveValue('07700 900 777');
  await app.call('wzStep', 1);
  await expect(app.page.locator('#f_homePc')).toHaveValue('NR6 5DR');
  expect(app.errors).toEqual([]);
});
