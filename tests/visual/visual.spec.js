// Screenshot baselines. The refactor must not change how anything looks: any difference fails.
// Update baselines only when a change in look is intended:  npm run test:visual:update
const { test, expect } = require('../helpers');

const shot = async (app, name) => {
  await app.page.addStyleTag({
    content:
      '*,*::before,*::after{scroll-behavior:auto!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
  });
  await app.page.waitForTimeout(400);
  await expect(app.page).toHaveScreenshot(name + '.png', {
    mask: [app.page.locator('#q'), app.page.locator('#toast'), app.page.locator('#cq')],
  });
};
const views = [
  'home',
  'messages',
  'live',
  'deliveries',
  'suppliers',
  'leads',
  'contracts',
  'fitting',
  'service',
  'stock',
  'contacts',
  'staff',
  'holidays',
  'reports',
  'downloads',
  'finance',
  'admin',
  'settings',
];

test.describe('desktop, light', () => {
  for (const v of views) {
    test(v, async ({ app }) => {
      await app.role('beta');
      await app.go(v);
      await app.run(
        () => document.querySelector('#toast') && (document.querySelector('#toast').style.display = 'none')
      );
      await shot(app, `desktop-${v}`);
    });
  }
});

test.describe('desktop, dark', () => {
  for (const v of ['home', 'leads', 'contracts', 'service', 'settings']) {
    test(v, async ({ app }) => {
      await app.role('beta');
      await app.call('setTh', 'dark');
      await app.go(v);
      await shot(app, `dark-${v}`);
    });
  }
});

test.describe('phone', () => {
  for (const v of ['home', 'leads', 'contracts', 'service', 'stock', 'settings']) {
    test(v, async ({ app }) => {
      await app.page.setViewportSize({ width: 390, height: 844 });
      await app.role('beta');
      await app.go(v);
      await shot(app, `phone-${v}`);
    });
  }
  test('standard user home', async ({ app }) => {
    await app.page.setViewportSize({ width: 390, height: 844 });
    await app.go('home');
    await shot(app, 'phone-staff-home');
  });
});

test.describe('windows and popups', () => {
  test.beforeEach(async ({ app }) => {
    await app.role('beta');
  });
  test('lead record', async ({ app }) => {
    await app.openLead('L0001');
    await shot(app, 'popup-lead');
  });
  test('contract finance', async ({ app }) => {
    await app.openContract('2402318');
    await app.step('finance');
    await shot(app, 'popup-contract-finance');
  });
  test('contract fitting', async ({ app }) => {
    await app.openContract('2402318');
    await app.step('fitting');
    await shot(app, 'popup-contract-fitting');
  });
  test('new lead wizard', async ({ app }) => {
    await app.call('editLead');
    await shot(app, 'popup-new-lead');
  });
  test('service call form', async ({ app }) => {
    await app.call('editCall', 'S-0871');
    await shot(app, 'popup-service-call');
  });
  test('delivery form', async ({ app }) => {
    await app.call('editDel', 'D-1');
    await shot(app, 'popup-delivery');
  });
  test('contact form', async ({ app }) => {
    await app.call('editContact', 'K-1');
    await shot(app, 'popup-contact');
  });
  test('my details', async ({ app }) => {
    await app.call('editProfile');
    await shot(app, 'popup-profile');
  });
  test('confirm box', async ({ app }) => {
    await app.call('askIn', 'Mark this lead as won?', 'It is saved straight away.', 'Yes, Won', null, false);
    await shot(app, 'popup-confirm');
  });
  test('search box', async ({ app }) => {
    await app.call('cmdk', true);
    await app.call('cmdkRun', 'fittings this week');
    await shot(app, 'popup-search');
  });
});
