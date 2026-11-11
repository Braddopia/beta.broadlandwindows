// Security checks: a standard account can't do admin-only things, PIN guessing is limited,
// tampering with the session doesn't grant admin, and no stored text can ever run as code.
const { test, expect } = require('../helpers');

test('standard account cannot delete, edit staff or open admin pages', async ({ app }) => {
  await app.role('staff');
  const r = await app.run(() => {
    const n = { l: state.leads.length, c: state.contracts.length, st: state.staff.length };
    const tryIt = (f) => {
      try {
        f();
      } catch (e) {}
      closeModal();
    };
    tryIt(() => delLead(state.leads[0].id));
    tryIt(() => del('contracts', state.contracts[0].id));
    tryIt(() => del('staff', state.staff[0].id));
    tryIt(() => editStaff(state.staff[0].id));
    const views = ['finance', 'admin', 'staff'].map((v) => {
      go(v);
      closeModal();
      return view;
    });
    return {
      same: [state.leads.length === n.l, state.contracts.length === n.c, state.staff.length === n.st],
      views,
      adm: can('money'),
    };
  });
  expect(r.same).toEqual([true, true, true]);
  expect(r.views).not.toContain('finance');
  expect(r.views).not.toContain('admin');
  expect(r.adm).toBe(false);
});

test('PIN guessing locks after 5 wrong tries', async ({ app }) => {
  const msgs = await app.run(async () => {
    const out = [];
    for (let i = 0; i < 7; i++) {
      pickRole('admin');
      const e = document.querySelector('#pin');
      if (!e) {
        out.push('locked');
        closeModal();
        continue;
      }
      e.value = String(1000 + i);
      chkPin('admin');
      await new Promise((r) => setTimeout(r, 20));
      out.push(ROLE + ':' + ((document.querySelector('#pinMsg') || {}).textContent || ''));
      closeModal();
    }
    return out;
  });
  expect(msgs.every((m) => !m.startsWith('admin'))).toBe(true);
  expect(msgs.join('|')).toMatch(/Locked/);
});

test('tampered or unknown session role falls back to standard', async ({ app }) => {
  await app.run(() => {
    sessionStorage.setItem('bb_role', 'admin');
    sessionStorage.setItem('bb_role_at', '0');
  });
  await app.page.reload();
  await app.page.waitForFunction(() => window.CRM);
  expect(await app.run(() => ROLE)).toBe('staff');
  await app.run(() => sessionStorage.setItem('bb_role', 'owner'));
  await app.page.reload();
  await app.page.waitForFunction(() => window.CRM);
  expect(await app.run(() => ROLE)).toBe('staff');
});

test('script payloads in saved data never run (pages, records, reports)', async ({ app, context }) => {
  const hits = [];
  await context.exposeBinding('hit', (src, w) => hits.push(w));
  await context.addInitScript(() => {
    Object.defineProperty(window, '__x', {
      set(v) {
        window.hit && window.hit(location.href + ' ' + v);
      },
      get() {
        return undefined;
      },
    });
  });
  await app.page.reload();
  await app.page.waitForFunction(() => window.CRM);
  await app.run(() => {
    const PL = [
      '"><img src=x onerror="window.__x=1">',
      "'><svg onload=window.__x=2>",
      '</script><script>window.__x=3</script>',
      'javascript:window.__x=4',
      '" onmouseover="window.__x=5" x="',
      '${window.__x=6}',
    ];
    let i = 0;
    const skip =
      /^(id|pid|uid|ord|sid|stage|status|type|reqStatus|unit|date|due|fit|survey|order|created|from|to|d|at|visit|cdate|delDate|followup|apptDate|time|photos|cIn|cOut|hex|lines|openings|pay|log|chk|appts|cat|role|invSame|siteSame)$/;
    const walk = (o) => {
      if (Array.isArray(o)) {
        o.forEach(walk);
        return;
      }
      if (o && typeof o === 'object')
        for (const k of Object.keys(o)) {
          const v = o[k];
          if (typeof v === 'string' && !skip.test(k)) o[k] = v + PL[i++ % PL.length];
          else if (v && typeof v === 'object' && k !== 'sec' && k !== 'brand') walk(v);
        }
    };
    [
      'leads',
      'contracts',
      'calls',
      'contacts',
      'suppliers',
      'deliveries',
      'staff',
      'items',
      'fin',
      'orders',
      'notes',
      'leadArchive',
    ].forEach((k) => state[k] && walk(state[k]));
    state.leads[0].openings = [{ ref: PL[0], room: PL[1], type: 'Bifold door', glaz: PL[2], notes: PL[3] }];
    state.contracts[0].openings = state.leads[0].openings;
    state.contracts[0].lines = [{ code: PL[0], name: PL[1], qty: 1, rate: 1, loc: PL[4] }];
    state.contracts[0].pay = [{ amt: 5, date: '2026-01-01', method: PL[0] }];
    setRoleValue('beta');
    store();
    render();
  });
  for (const v of await app.run(() => Object.keys(VIEWS)))
    await app.run((v) => {
      try {
        go(v);
      } catch (e) {}
    }, v);
  await app.run(() => {
    go('leads');
    setUI('lead.v', 'board');
    go('contracts');
    setUI('ctr.v', 'board');
  });
  for (const k of ['lead', 'contract']) {
    await app.run((k) => recOpen(k, k === 'lead' ? state.leads[0].id : state.contracts[0].id), k);
    for (const s of await app.run(() => recordWin.steps)) await app.step(s);
    await app.closeAll();
  }
  await app.run(() => {
    supOpen(state.suppliers[0].name);
    closeModal();
    ncToggle(true);
    ncToggle(false);
  });
  const reports = [
    'reportContract(state.contracts[0].id,"c")',
    'reportContract(state.contracts[0].id,"i")',
    'reportJob(state.contracts[0].id)',
    'reportCust("contract",state.contracts[0].id)',
    'reportCust("lead",state.leads[0].id)',
    'contactList("contract")',
    'reportCall(state.calls[0].id,"c")',
    'reportCall(state.calls[0].id,"i")',
    'repPrint(true)',
    'invoicePrint(state.contracts[0].id)',
  ];
  for (const r of reports) {
    const [w] = await Promise.all([app.nextPopup(), app.run(r)]);
    await w.waitForLoadState();
    await w.close();
  }
  expect(hits, 'payloads that ran').toEqual([]);
});

test('strict security policy: injected scripts and inline handlers are blocked', async ({ app }) => {
  const ran = await app.run(async () => {
    const s = document.createElement('script');
    s.textContent = 'window.__csp1=1';
    document.body.appendChild(s);
    const d = document.createElement('div');
    d.innerHTML = '<img src="data:," onerror="window.__csp2=1">';
    document.body.appendChild(d);
    await new Promise((r) => setTimeout(r, 200));
    return [window.__csp1, window.__csp2];
  });
  expect(ran).toEqual([null, null].map(() => undefined));
  const csp = app.errors.filter((e) => e.startsWith('CSP:'));
  expect(csp.length, 'the browser reported the blocked code').toBeGreaterThan(0);
  app.errors.splice(0, app.errors.length, ...app.errors.filter((e) => !e.startsWith('CSP:')));
});

test('PINs are stored stretched with their own salt; an old-style PIN still works once and is upgraded', async ({
  app,
}) => {
  await app.role('beta');
  const r = await app.run(() => {
    const out = {};
    // a new PIN, saved the way the Account PINs window saves it
    state.sec.pins.admin = pinMake('admin', '482913', 0);
    const p = state.sec.pins.admin;
    out.shape = [p.v, p.n == PIN_ROUNDS, p.s.length, p.h.length, JSON.stringify(p).includes('482913')];
    out.right = pinOk('admin', '482913');
    out.wrong = pinOk('admin', '482914');
    out.otherRole = pinOk('beta', '482913');
    // the same PIN twice never stores the same thing
    out.differs = pinMake('admin', '482913', 0).h != p.h;
    // a PIN saved the old way (one salted hash): accepted, then re-saved the new way
    state.sec.pins.admin = { h: sha256(state.sec.salt + ':admin:771204'), def: 0 };
    out.oldWrong = pinOk('admin', '000000');
    out.stillOld = state.sec.pins.admin.v === undefined;
    out.oldRight = pinOk('admin', '771204');
    out.upgraded = state.sec.pins.admin.v == 2 && pinOk('admin', '771204');
    return out;
  });
  expect(r.shape).toEqual([2, true, 32, 64, false]);
  expect([r.right, r.wrong, r.otherRole, r.differs]).toEqual([true, false, false, true]);
  expect([r.oldWrong, r.stillOld, r.oldRight, r.upgraded]).toEqual([false, true, true, true]);
});
