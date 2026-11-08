// Security checks: a standard account can't do admin-only things, PIN guessing is limited,
// tampering with the session doesn't grant admin, and no stored text can ever run as code.
const { test, expect } = require('../helpers');

test('standard account cannot delete, edit staff or open admin pages', async ({ app }) => {
  await app.role('staff');
  const r = await app.run(() => {
    const n = { l: S.leads.length, c: S.contracts.length, st: S.staff.length };
    const tryIt = (f) => { try { f(); } catch (e) {} closeModal(); };
    tryIt(() => delLead(S.leads[0].id));
    tryIt(() => del('contracts', S.contracts[0].id));
    tryIt(() => del('staff', S.staff[0].id));
    tryIt(() => editStaff(S.staff[0].id));
    const views = ['finance', 'admin', 'staff'].map((v) => { go(v); closeModal(); return view; });
    return { same: [S.leads.length === n.l, S.contracts.length === n.c, S.staff.length === n.st], views, adm: ISADM() };
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
      if (!e) { out.push('locked'); closeModal(); continue; }
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
  await app.run(() => { sessionStorage.setItem('bb_role', 'admin'); sessionStorage.setItem('bb_role_at', '0'); });
  await app.page.reload();
  await app.page.waitForFunction(() => typeof window.render === 'function');
  expect(await app.run(() => ROLE)).toBe('staff');
  await app.run(() => sessionStorage.setItem('bb_role', 'owner'));
  await app.page.reload();
  await app.page.waitForFunction(() => typeof window.render === 'function');
  expect(await app.run(() => ROLE)).toBe('staff');
});

test('script payloads in saved data never run (pages, records, reports)', async ({ app, context }) => {
  const hits = [];
  await context.exposeBinding('hit', (src, w) => hits.push(w));
  await context.addInitScript(() => {
    Object.defineProperty(window, '__x', { set(v) { window.hit && window.hit(location.href + ' ' + v); }, get() { return undefined; } });
  });
  await app.page.reload();
  await app.page.waitForFunction(() => typeof window.render === 'function');
  await app.run(() => {
    const PL = ['"><img src=x onerror="window.__x=1">', "'><svg onload=window.__x=2>", '</script><script>window.__x=3</script>', 'javascript:window.__x=4', '" onmouseover="window.__x=5" x="', '${window.__x=6}'];
    let i = 0;
    const skip = /^(id|pid|uid|ord|sid|stage|status|type|reqStatus|unit|date|due|fit|survey|order|created|from|to|d|at|visit|cdate|delDate|followup|apptDate|time|photos|cIn|cOut|hex|lines|openings|pay|log|chk|appts|cat|role|invSame|siteSame)$/;
    const walk = (o) => {
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (o && typeof o === 'object') for (const k of Object.keys(o)) {
        const v = o[k];
        if (typeof v === 'string' && !skip.test(k)) o[k] = v + PL[i++ % PL.length];
        else if (v && typeof v === 'object' && k !== 'sec' && k !== 'brand') walk(v);
      }
    };
    ['leads', 'contracts', 'calls', 'contacts', 'suppliers', 'deliveries', 'staff', 'items', 'fin', 'orders', 'notes', 'leadArchive'].forEach((k) => S[k] && walk(S[k]));
    S.leads[0].openings = [{ ref: PL[0], room: PL[1], type: 'Bifold door', glaz: PL[2], notes: PL[3] }];
    S.contracts[0].openings = S.leads[0].openings;
    S.contracts[0].lines = [{ code: PL[0], name: PL[1], qty: 1, rate: 1, loc: PL[4] }];
    S.contracts[0].pay = [{ amt: 5, date: '2026-01-01', method: PL[0] }];
    ROLE = 'beta'; store(); render();
  });
  for (const v of await app.run(() => Object.keys(VIEWS))) await app.run((v) => { try { go(v); } catch (e) {} }, v);
  await app.run(() => { go('leads'); setUI('lead.v', 'board'); go('contracts'); setUI('ctr.v', 'board'); });
  for (const k of ['lead', 'contract']) {
    await app.run((k) => recOpen(k, k === 'lead' ? S.leads[0].id : S.contracts[0].id), k);
    for (const s of await app.run(() => RW.steps)) await app.step(s);
    await app.closeAll();
  }
  await app.run(() => { supOpen(S.suppliers[0].name); closeModal(); ncToggle(true); ncToggle(false); });
  const reports = ['reportContract(S.contracts[0].id,"c")', 'reportContract(S.contracts[0].id,"i")', 'reportJob(S.contracts[0].id)', 'reportCust("contract",S.contracts[0].id)', 'reportCust("lead",S.leads[0].id)', 'contactList("contract")', 'reportCall(S.calls[0].id,"c")', 'reportCall(S.calls[0].id,"i")', 'repPrint(true)', 'invoicePrint(S.contracts[0].id)'];
  for (const r of reports) {
    const [w] = await Promise.all([app.nextPopup(), app.page.evaluate(r)]);
    await w.waitForLoadState();
    await w.close();
  }
  expect(hits, 'payloads that ran').toEqual([]);
});
