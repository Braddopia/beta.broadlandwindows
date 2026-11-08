// Shared test setup for the CRM.
// Every test gets a fresh browser with: a fixed date (8 Nov 2026), predictable "random" numbers,
// no network (so fonts and third-party scripts can't make results flaky), the welcome tour off,
// and an automatic check that no JavaScript error happened on the page.
//
// Tests talk to the app through `app.*` helpers below. If the app's internals are renamed during
// the refactor, only this file needs to change.
const path = require('path');
const { test: base, expect } = require('@playwright/test');

const APP_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const TODAY = '2026-11-08T10:00:00';

const test = base.extend({
  app: async ({ page, context }, use) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    context.on('page', (p) => p.on('pageerror', (e) => errors.push('popup: ' + e.message)));
    page.on('dialog', (d) => d.accept());
    await page.clock.setFixedTime(new Date(TODAY));
    await context.route(/^https?:\/\//, (r) => r.abort());
    await page.addInitScript(() => {
      try { localStorage.setItem('bb_tour_seen', '1'); } catch (e) {}
      let seed = 42;
      Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    });
    await page.goto(APP_URL);
    await page.waitForFunction(() => typeof window.render === 'function' && document.querySelector('#main').children.length > 0);

    const call = (fn, ...args) =>
      page.evaluate(([f, a]) => {
        const target = f.split('.').reduce((o, k) => o[k], window);
        return target(...a);
      }, [fn, args]);

    const app = {
      page,
      errors,
      call,
      /** run code inside the page */
      run: (fn, arg) => page.evaluate(fn, arg),
      role: (r) => call('setRole', r),
      go: (view) => call('go', view),
      openLead: (id) => call('openLead', id),
      openContract: (id) => call('openContract', id),
      step: (k) => call('recTab', k),
      closeAll: () => page.evaluate(() => { if (window.RW) RW.dirty = 0; closeModal(); closeModal(); }),
      text: (sel) => page.locator(sel).first().innerText(),
      popups: () => context.pages().filter((p) => p !== page),
      /** wait for the next popup window (printed documents) */
      nextPopup: () => context.waitForEvent('page'),
      /** fill every required box of the open record so it can be saved */
      fillRequired: () =>
        page.evaluate(() => {
          REC[RW.kind].fields(RW).filter((f) => f.req).forEach((f) => {
            const e = document.querySelector('#f_' + f.k);
            if (e && !e.value) e.value = f.t === 'select' ? f.o.find(Boolean) : f.t === 'email' ? 'a@example.com' : f.t === 'date' ? today() : 'X';
          });
          const m = document.querySelector('#f_mob1');
          if (m && !m.value) m.value = '07700 900 111';
        }),
    };
    await use(app);
    expect(errors, 'no JavaScript errors on the page').toEqual([]);
  },
});

module.exports = { test, expect, APP_URL };
