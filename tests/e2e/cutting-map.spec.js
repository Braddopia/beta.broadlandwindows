// The service-call map and the Panel Optimiser.
const { test, expect } = require('../helpers');

test('service calls on a map of Norfolk: a pin per town, click one to list its calls', async ({ app }) => {
  await app.role('beta');
  await app.go('service');
  await app.run(() => setUI('svc.f', 'all'));
  await app.page.click('#main .seg2 >> text=Map');
  await expect(app.page.locator('#main .smap .land')).toHaveCount(1);
  const pins = app.page.locator('#main .pin');
  expect(await pins.count()).toBeGreaterThan(1);
  await app.page.locator('#main .pin[aria-label^="Norwich"]').dispatchEvent('click');
  await expect(app.page.locator('#main .smap-l h2')).toContainText('Norwich');
  const ids = await app.run(() =>
    state.calls.filter((c) => (c.town || '').toLowerCase() == 'norwich').map((c) => c.id)
  );
  for (const id of ids) await expect(app.page.locator('#main .smap-l')).toContainText(id);
  await app.page.click('#main .smap-l >> text=All Towns');
  await expect(app.page.locator('#main .smap-l h2')).toContainText('Towns');
  // standard users have the map too
  await app.role('staff');
  await app.go('service');
  await expect(app.page.locator('#main .smap')).toHaveCount(1);
  expect(app.errors).toEqual([]);
});

test('Panel Optimiser: change a piece, the plan updates; save, reopen and print it', async ({ app }) => {
  await app.role('staff');
  await app.go('cutting');
  await expect(app.page.locator('#main h1')).toHaveText('Panel Optimiser');
  await expect(app.page.locator('#main .cut-b')).toHaveCount(1);
  // more shelves than fit on one board
  // the plan updates while typing, and the box keeps its place
  await app.page.fill('#cut_parts_1_qty', '12');
  await expect(app.page.locator('#main .cut-b')).toHaveCount(4);
  await expect(app.page.locator('#cut_parts_1_qty')).toBeFocused();
  await expect(app.page.locator('#cutKpis')).toContainText('4');
  expect(await app.run(() => state.cut.parts[1].qty)).toBe(12);
  // a piece bigger than the board is reported, not lost
  await app.page.click('#main >> text=+ Add Piece');
  await app.page.fill('#cut_parts_2_L', '3000');
  await expect(app.page.locator('#main .note.bad')).toContainText('would not fit');
  await app.page.click('#main .cut-t >> nth=1 >> [aria-label="Remove row 3"]');
  await expect(app.page.locator('#main .note.bad')).toHaveCount(0);
  // save under a name, start again, reopen
  await app.page.click('#main .tools >> text=/^Save$/');
  await app.page.fill('#f_name', 'Sample kitchen');
  await app.page.click('#saveBtn');
  await app.call('closeModal');
  await app.page.click('#main >> text=New List');
  await app.page.click('.aski >> text=Start New');
  await expect(app.page.locator('#main .cut-b')).toHaveCount(0);
  await app.page.click('#main >> text=Saved Lists (1)');
  await app.page.click('#mbox >> text=Open');
  await expect(app.page.locator('#main .cut-b')).toHaveCount(4);
  // print
  const [w] = await Promise.all([app.nextPopup(), app.page.click('#main >> text=Print Plan')]);
  await w.waitForLoadState();
  // the company's standard A4 portrait report
  await expect(w.locator('h1')).toHaveText('Cutting Plan');
  await expect(w.locator('.pg')).toContainText('Cut List');
  await expect(w.locator('.ih img')).toHaveCount(1);
  await expect(w.locator('.cut-b')).toHaveCount(4);
  await expect(w.locator('table.dt').first()).toContainText('Name');
  await w.close();
  expect(app.errors).toEqual([]);
});

test('Panel Optimiser: the Smarts Aluminium boards are one click away', async ({ app }) => {
  await app.role('beta');
  await app.go('cutting');
  await app.page.click('#main .cut-pre >> text=Smarts Aluminium Half');
  expect(await app.run(() => state.cut.sheets.map((s) => [s.label, s.L, s.W]))).toContainEqual([
    'Smarts Aluminium Half',
    1195,
    1200,
  ]);
  await app.page.click('#main .cut-pre >> text=Smarts Aluminium Half');
  await expect(app.page.locator('.toast')).toContainText('already listed');
});

test('Remove Stock has a scan icon inside the Stock ID and item code boxes', async ({ app }) => {
  await app.role('staff');
  await app.go('stock');
  await app.call('stockForm', 'remove');
  await expect(app.page.locator('#mbox .ff:has(#f_pid) .fscan-b')).toHaveCount(1);
  await expect(app.page.locator('#mbox .ff:has(#f_item) .fscan-b')).toHaveCount(1);
  await app.page.click('#mbox .ff:has(#f_pid) .fscan-b');
  await expect(app.page.locator('#scanner')).toHaveClass(/open/);
});

test('Panel Optimiser: job number and name lead everywhere, and the plan can be kept on the contract', async ({
  app,
}) => {
  await app.role('beta');
  await app.go('cutting');
  await expect(app.page.locator('#cutToC')).toBeHidden();
  await app.page.fill('#cut_job_no', '1023421');
  // a known contract fills the job name in and offers Save To Contract
  await expect(app.page.locator('#cut_job_name')).toHaveValue('Sample Customer E');
  await expect(app.page.locator('#cutTitle')).toHaveText('1023421 - SAMPLE CUSTOMER E');
  await expect(app.page.locator('#cutToC')).toBeVisible();
  // printed plan: the job first
  const [w] = await Promise.all([app.nextPopup(), app.page.click('#main >> text=Print Plan')]);
  await w.waitForLoadState();
  await expect(w.locator('h1')).toHaveText('1023421 - SAMPLE CUSTOMER E');
  await expect(w.locator('.pg')).toContainText('Job number');
  await w.close();
  // kept with the contract's documents
  await app.page.click('#cutToC');
  await expect(app.page.locator('.toast')).toContainText('Saved to contract 1023421');
  const docs = await app.page.evaluate(
    () =>
      new Promise((ok) => {
        const r = indexedDB.open('bb_files');
        r.onsuccess = () => {
          const q = r.result.transaction('f').objectStore('f').getAll();
          q.onsuccess = () => ok(q.result.map((f) => [f.ref, f.name, f.cat]));
        };
        r.onerror = () => ok([]);
      })
  );
  expect(
    docs.some(([ref, name]) => ref == 'contract:1023421' && /^1023421 - SAMPLE CUSTOMER E Cutting Plan/.test(name))
  ).toBe(true);
  expect(app.errors).toEqual([]);
});

test('contracts are named "number - NAME" in the window, the list, search and the calendar', async ({ app }) => {
  await app.role('beta');
  await app.openContract('1023421');
  await expect(app.page.locator('#mbox .rw-h h2')).toContainText('1023421 - SAMPLE CUSTOMER E');
  await app.closeAll();
  await app.go('contracts');
  await expect(app.page.locator('#main tbody')).toContainText('SAMPLE CUSTOMER E');
  await app.page.fill('#sb input', 'Sample Customer E');
  await expect(app.page.locator('#sres')).toContainText('1023421 - SAMPLE CUSTOMER E');
  expect(await app.run(() => evs('2026-11-12').map((e) => e.t))).toContain('1023421 - SAMPLE CUSTOMER E');
});

test('Cutting Optimiser: cuts with angles plan into bars as you type, print as a saw list, link profiles from Inventory', async ({
  app,
}) => {
  await app.role('beta');
  // mark a stock item as a profile with its bar length, in its own window (there is no separate Cutting Data list)
  await app.go('stock');
  await expect(app.page.locator('#main .tools')).not.toContainText('Cutting Data');
  const pid = await app.run(() => products()[0].pid);
  const item = await app.run(() => products()[0].item);
  await app.call('stockForm', 'edit', pid);
  await app.page.selectOption('#f_isBar', 'Yes');
  await app.page.selectOption('#f_barLen', '6500');
  await app.page.click('#mbox [data-act=ieSave]');
  expect(await app.run((p) => state.cutProf[p].bar, pid)).toBe(6500);

  await app.go('bars');
  await expect(app.page.locator('#main h1')).toHaveText('Cutting Optimiser');
  // a new list: 10mm saw blade, 50mm off each end, offcuts kept only from 1M; the saw sheet this test copies used 4 and 10
  expect(await app.run(() => [state.bars.kerf, state.bars.trim, state.bars.keep])).toEqual([10, 50, 1000]);
  await app.page.click('#main .tools >> text=Saw Settings');
  await app.page.fill('#f_kerf', '4');
  await app.page.fill('#f_trim', '10');
  // shorter offcuts than 1M are never kept: 500 is refused
  await app.page.fill('#f_keep', '500');
  await app.page.click('#saveBtn');
  await expect(app.page.locator('#mbox .ferr')).toContainText('between 1000');
  await app.page.fill('#f_keep', '1000');
  await app.page.click('#saveBtn');
  expect(await app.run(() => [state.bars.kerf, state.bars.trim, state.bars.keep])).toEqual([4, 10, 1000]);
  await app.call('closeModal');
  // picking the linked profile fills in its bar length and shows the stock
  await app.page.fill('#bar_p_0_bar', '3000');
  await app.page.fill('#bar_p_0_code', item);
  await expect(app.page.locator('#bar_p_0_bar')).toHaveValue('6500');
  await expect(app.page.locator('#barOut_0 .bar-sum')).toContainText('in stock');
  // the frame from the saw sheet
  await app.page.fill('#bar_c_0_0_label', 'Ensuite');
  await app.page.fill('#bar_c_0_0_len', '1603');
  await app.page.fill('#bar_c_0_0_qty', '4');
  await expect(app.page.locator('#bar_c_0_0_qty')).toBeFocused();
  await app.page.click('#main >> text=+ Add Cut');
  await app.page.fill('#bar_c_0_1_len', '1210');
  await app.page.fill('#bar_c_0_1_qty', '4');
  await expect(app.page.locator('#barOut_0 .bar-sum')).toContainText('2 bars');
  await expect(app.page.locator('#barOut_0 .bar-sum')).toContainText('1,748mm = 13.4%');
  // any angle can be typed
  await app.page.fill('#bar_c_0_1_aL', '67.5');
  expect(await app.run(() => state.bars.profiles[0].cuts[1].aL)).toBe(67.5);
  // print: our report, job first, a section per profile with its bars
  await app.page.fill('#bar_job_no', '1023421');
  await expect(app.page.locator('#barTitle')).toHaveText('1023421 - SAMPLE CUSTOMER E');
  const [w] = await Promise.all([app.nextPopup(), app.page.click('#main >> text=Print Cutting List')]);
  await w.waitForLoadState();
  await expect(w.locator('h1')).toHaveText('1023421 - SAMPLE CUSTOMER E');
  await expect(w.locator('.bsec')).toHaveCount(1);
  await expect(w.locator('.bsec .bar-s')).toHaveCount(2);
  await expect(w.locator('.bsec')).toContainText('Bar length 6,500mm');
  await expect(w.locator('.pg')).toContainText('Cut List');
  // the line under the job: Title Case, with the saw blade and end trim
  await expect(w.locator('.pg')).toContainText('Cutting List · Saw Blade 4mm · End Trim 10mm');
  await expect(w.locator('table').first()).toContainText('Bar colour');
  await w.close();
  // kept with the contract
  await app.page.click('#barToC');
  await expect(app.page.locator('.toast')).toContainText('Saved to contract 1023421');
  // Book Into Stock: the 2 full bars come out, and the 1,624mm offcut goes back in as its own stock line
  const before = await app.run((p) => prod(p).stock, pid);
  await app.page.click('#barBookB');
  await expect(app.page.locator('#mbox')).toContainText('1,624mm');
  await app.page.click('#mbox .mact >> text=Book Into Stock');
  expect(await app.run((p) => prod(p).stock, pid)).toBe(before - 2);
  const off = await app.run((it) => products().find((r) => r.item == it && r.length == '1624MM'), item);
  expect(off.stock).toBe(1);
  expect(off.pid).not.toBe(pid);
  expect(await app.run(() => state.bars.bookedAt)).toBeTruthy();
  expect(app.errors).toEqual([]);
});
