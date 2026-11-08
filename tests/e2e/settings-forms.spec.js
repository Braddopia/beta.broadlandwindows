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
