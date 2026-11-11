// Settings, My Details, contact and supplier forms, the "saved" tick, numbering and the photo store.
const { test, expect } = require('../helpers');

test.beforeEach(async ({ app }) => {
  await app.role('beta');
});

test('report a problem shows the saved tick and lists it for admins', async ({ app }) => {
  await app.call('bugReport');
  await app.page.fill('#f_what', 'Button did nothing');
  await app.page.click('#saveBtn');
  await expect(app.page.locator('.donein')).toBeVisible();
  await expect(app.page.locator('#modal')).not.toHaveClass(/open/, { timeout: 3000 });
  expect(await app.run(() => state.bugs.length)).toBe(1);
  await app.go('settings');
  await expect(app.page.locator('#main')).toContainText('Button did nothing');
});

test('numbering can be forced and reset', async ({ app }) => {
  const r = await app.run(() => {
    state.num = { contract: 2500001, lead: 50, call: 1000 };
    const a = [nid('C', state.contracts), nextLeadId(), nid('S', state.calls)];
    state.num = {};
    return a;
  });
  expect(r).toEqual(['2500001', 'L0050', 'S-1000']);
});

test('my details: email and work phone required, up to 3 emergency contacts', async ({ app }) => {
  await app.call('editProfile');
  expect(await app.run(() => document.querySelector('#p_phone').value)).toBeTruthy();
  await app.page.selectOption('#p_en', '2');
  expect(await app.run(() => document.querySelectorAll('#p_emer .emr').length)).toBe(2);
  await app.page.fill('#pe_n0', 'Sample Person');
  await app.page.fill('#pe_t0', '07700 900 001');
  await app.page.fill('#pe_n1', 'Sample Two');
  await app.page.fill('#pe_t1', '07700 900 002');
  if (!(await app.page.inputValue('#p_email'))) await app.page.fill('#p_email', 'demo@example.com');
  await app.page.click('text=Save details');
  await expect(app.page.locator('.donein')).toBeVisible();
  expect(await app.run(() => state.profile.emer.length)).toBe(2);
});

test('contact form: required boxes depend on the type', async ({ app }) => {
  await app.call('editContact');
  const req = () =>
    app.run(() =>
      [...document.querySelectorAll('#mbox [data-rq]')]
        .filter((s) => s.innerHTML)
        .map((s) => s.dataset.rq)
        .join(',')
    );
  expect(await req()).toBe('type,co,name,role');
  await app.page.selectOption('#c_type', 'Customer');
  expect(await req()).toBe('type,name,email,addr,town,pc');
  expect(await app.run(() => [...document.querySelectorAll('#cphs select option')].map((o) => o.value))).not.toContain(
    'Fax'
  );
});

test('supplier with no contact to pick opens the contact form first', async ({ app }) => {
  await app.run(() => {
    state.contacts = state.contacts.filter(
      (c) => c.type !== 'Supplier' || state.suppliers.some((s) => s.name.toLowerCase() === c.co.toLowerCase())
    );
    editSup();
  });
  expect(await app.run(() => [!!document.querySelector('#c_co'), document.querySelector('#c_type').value])).toEqual([
    true,
    'Supplier',
  ]);
});

test('photos are stored separately and survive a reload', async ({ app }) => {
  const ref = await app.run(async () => {
    const c = document.createElement('canvas');
    c.width = 40;
    c.height = 30;
    c.getContext('2d').fillRect(0, 0, 20, 20);
    state.calls[0].photos = [c.toDataURL('image/jpeg', 0.7)];
    store();
    await new Promise((r) => setTimeout(r, 600));
    return state.calls[0].photos[0];
  });
  expect(ref.startsWith('ph:')).toBe(true);
  await app.page.reload();
  await app.page.waitForFunction(() => window.CRM);
  const ok = await app.run(async () => {
    const r = state.calls[0].photos[0];
    SAFE.img(r);
    await new Promise((x) => setTimeout(x, 300));
    return PH_OK(SAFE.img(r));
  });
  expect(ok).toBe(true);
});

test('Files page: Broadland Brochures with Category column', async ({ app }) => {
  await app.go('downloads');
  await expect(app.page.locator('#main h1')).toHaveText('Broadland Brochures');
  expect(await app.run(() => [...document.querySelectorAll('.fhead span')].map((s) => s.textContent))).toContain(
    'Category'
  );
});

test('report a problem from inside a form, then the form comes back as it was', async ({ app }) => {
  // the browser's "share this tab" is stood in for by a small drawn picture
  await app.page.evaluate(() => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 40;
      const g = c.getContext('2d');
      g.fillStyle = '#034ea2';
      g.fillRect(0, 0, 64, 40);
      const s = c.captureStream(5);
      setInterval(() => g.fillRect(0, 0, 64, 40), 50);
      return s;
    };
  });
  await app.call('editContact');
  await app.page.fill('#c_name', 'Half typed');
  // one report button, bottom right, over popups too
  await expect(app.page.locator('#mbox .mrp')).toHaveCount(0);
  await app.page.click('#rpb');
  await expect(app.page.locator('#mbox h2')).toHaveText('Report A Problem');
  expect(await app.page.inputValue('#f_where')).toContain('Contact');
  await expect(app.page.locator('#thumbs .phb.on')).toHaveCount(1);
  await app.page.fill('#f_what', 'Save did nothing');
  await app.page.click('#saveBtn');
  await expect(app.page.locator('#c_name')).toHaveValue('Half typed', { timeout: 4000 });
  expect(await app.run(() => [state.bugs[0].what, (state.bugs[0].photos || []).length])).toEqual([
    'Save did nothing',
    1,
  ]);
});

test('Esc closes every kind of popup, top-most first', async ({ app }) => {
  await app.role('beta');
  const esc = () => app.page.keyboard.press('Escape');
  // a form popup
  await app.call('editContact');
  await expect(app.page.locator('#modal')).toHaveClass(/open/);
  await esc();
  await expect(app.page.locator('#modal')).not.toHaveClass(/open/);
  // the colour picker closes before the product window under it
  await app.call('stockForm', 'add');
  await app.call('cpOpen', 'cInName');
  await expect(app.page.locator('#cpop')).toHaveClass(/open/);
  await esc();
  await expect(app.page.locator('#cpop')).not.toHaveClass(/open/);
  await expect(app.page.locator('#modal')).toHaveClass(/open/);
  await esc();
  await expect(app.page.locator('#modal')).not.toHaveClass(/open/);
  // the search list, even after clicking away from the box
  await app.page.fill('#sb input', 'sample');
  await expect(app.page.locator('#sres')).toHaveClass(/open/);
  await app.page.evaluate(() => document.querySelector('#sb input').blur());
  await esc();
  await expect(app.page.locator('#sres')).not.toHaveClass(/open/);
  // the Ctrl+K box
  await app.call('cmdk', true);
  await expect(app.page.locator('#cmdk')).toHaveClass(/open/);
  await esc();
  await expect(app.page.locator('#cmdk')).not.toHaveClass(/open/);
  // the barcode scanner
  await app.page.evaluate(() => document.querySelector('#scanner').classList.add('open'));
  await esc();
  await expect(app.page.locator('#scanner')).not.toHaveClass(/open/);
  expect(app.errors).toEqual([]);
});

test('contact lines pair a label with a phone and an email; old main and accounts emails are paired up', async ({
  app,
}) => {
  await app.role('beta');
  await app.go('contacts');
  const id = await app.run(() => state.contacts.find((c) => c.co == 'Example Glass Ltd').id);
  await app.call('editContact', id);
  const rows = app.page.locator('#cphs .cphr');
  await expect(rows.first().locator('input[type=email]')).toHaveValue('sales@glass.example.com');
  // add an Accounts line with its own number and email
  const last = rows.nth(1); // typing in a line adds a fresh empty one below it
  await last.locator('select').selectOption('Accounts');
  await last.locator('input[type=tel]').fill('01632 960 202');
  await last.locator('input[type=email]').fill('Accounts@Glass.Example.com');
  await app.page.click('#saveBtn');
  const c = await app.run((i) => state.contacts.find((x) => x.id == i), id);
  expect(c.lines).toContainEqual({ t: 'Accounts', n: '01632 960 202', e: 'accounts@glass.example.com' });
  expect(c.email).toBe('sales@glass.example.com');
  expect(c.email2).toBe('accounts@glass.example.com');
  await expect(app.page.locator('#main .cc2', { hasText: 'Example Glass Ltd' })).toContainText(
    'accounts@glass.example.com'
  );
  expect(app.errors).toEqual([]);
});

test('Document Builder: switch parts of a printed document off and the next print leaves them out', async ({ app }) => {
  await app.role('beta');
  await app.go('cutting');
  // print once, so the builder knows this document's tables
  let [w] = await Promise.all([app.nextPopup(), app.page.click('#main >> text=Print Plan')]);
  await w.waitForLoadState();
  await expect(w.locator('h3', { hasText: 'Cut List' })).toHaveCount(1);
  await expect(w.locator('.figs')).toHaveCount(1);
  await w.close();
  await app.go('settings');
  await app.page.click('#main .set-c:has-text("Printed Documents") >> text=Customise');
  await app.page.click('#mbox .db-d:has-text("Cutting Plan")');
  await app.page.locator('#mbox .db-sw', { hasText: 'Key figures panel' }).locator('input').uncheck();
  await app.page.locator('#mbox .db-sw', { hasText: 'Cut List' }).locator('input').uncheck();
  await expect(app.page.locator('#mbox .db-d.on')).toContainText('2 off');
  await app.call('closeModal');
  await app.go('cutting');
  [w] = await Promise.all([app.nextPopup(), app.page.click('#main >> text=Print Plan')]);
  await w.waitForLoadState();
  await expect(w.locator('h3', { hasText: 'Cut List' })).toHaveCount(0);
  await expect(w.locator('.figs')).toHaveCount(0);
  await expect(w.locator('.cut-b').first()).toBeVisible();
  await w.close();
  // labels: the barcode can be left off
  await app.run(() => docToggle('Stock labels', 'barcode', false));
  expect(await app.run(() => state.docOpts['Stock labels'])).toEqual({ barcode: false });
  expect(await app.run(() => state.audit.some((a) => a.a == 'Document changed'))).toBe(true);
  expect(app.errors).toEqual([]);
});
