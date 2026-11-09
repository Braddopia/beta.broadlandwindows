// Business rules (src/domain): plain functions, tested without a browser.
// Run with: npm run test:unit
import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { replaceState } from '../../src/data/state.js';
import { dAuto, delWin } from '../../src/domain/deliveries.js';
import { nid, nextLeadId } from '../../src/domain/numbering.js';
import { leadProb, allLeads } from '../../src/domain/leads.js';
import { holDays, shutDays, svcExtra, allowTot, absCode, holLeft } from '../../src/domain/holidays.js';
import { forPerson, renamePerson, OWNERS } from '../../src/domain/people.js';
import { telOf, mailOf, addrOf, siteOf } from '../../src/domain/customers.js';
import { isLow, reorderQty, ikey, nextOrd, stkId, unitOf } from '../../src/domain/stock.js';
import { svcOpen } from '../../src/domain/service.js';

/* the same fixed day the browser tests use: Sunday 8 November 2026 */
beforeEach(() => mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-08T10:00:00') }));
afterEach(() => mock.timers.reset());

const blank = (extra = {}) => ({
  items: [],
  leads: [],
  leadArchive: [],
  contracts: [],
  calls: [],
  staff: [],
  hols: [],
  notes: [],
  abs: {},
  shut: {},
  seq: {},
  num: {},
  dash: {},
  ...extra,
});

test('delivery status comes from the due date', () => {
  const st = (due, status) => dAuto({ due, status });
  assert.equal(st('2026-11-01'), 'Overdue');
  assert.equal(st('2026-11-08'), 'Due today');
  assert.equal(st('2026-11-12'), 'In transit'); // 4 days
  assert.equal(st('2026-11-14'), 'Due'); // 6 days
  assert.equal(st('2026-11-20'), 'Ordered');
  assert.equal(st(''), 'Ordered');
  assert.equal(st('2026-11-01', 'Received'), 'Received');
});

test('delivery windows: at the weekend "this week" is the coming week', () => {
  const w = (due) => delWin({ due });
  assert.equal(w('2026-11-07'), 'od');
  assert.equal(w('2026-11-08'), 'td');
  assert.equal(w('2026-11-13'), 'wk');
  assert.equal(w('2026-11-15'), 'wk');
  assert.equal(w('2026-11-20'), 'mo');
  assert.equal(w('2026-12-02'), 'lt');
  assert.equal(delWin({ due: '2026-11-01', status: 'Received' }), 'rec');
});

test('numbering: one above the highest, or the start set in Settings', () => {
  replaceState(blank());
  assert.equal(nid('C', [{ id: '2400005' }]), '2400006');
  assert.equal(nid('C', []), '2400001');
  assert.equal(nid('S', [{ id: 'S-0007' }, { id: 'S-0002' }]), 'S-0008');
  replaceState(blank({ num: { contract: 2500001, call: 1000 } }));
  assert.equal(nid('C', [{ id: '2400005' }]), '2500001');
  assert.equal(nid('S', [{ id: 'S-0007' }]), 'S-1000');
});

test('lead numbers fill from the start number, skipping ones in use', () => {
  replaceState(blank({ leads: [{ id: 'L0001' }, { id: 'L0002' }, { id: 'L0004' }] }));
  assert.equal(nextLeadId(), 'L0003');
  replaceState(blank({ leads: [{ id: 'L0050' }], num: { lead: 50 } }));
  assert.equal(nextLeadId(), 'L0051');
});

test('win chance: won is 100%, lost 0%, otherwise typed or the stage default', () => {
  assert.equal(leadProb({ stage: 'Won', prob: 20 }), 100);
  assert.equal(leadProb({ stage: 'Lost', prob: 80 }), 0);
  assert.equal(leadProb({ stage: 'Quoted' }), 55);
  assert.equal(leadProb({ stage: 'Quoted', prob: '70' }), 70);
  assert.equal(leadProb({ stage: 'Unknown' }), 0);
});

test('converted leads count as won in the full lead list', () => {
  replaceState(blank({ leads: [{ id: 'L1', stage: 'New' }], leadArchive: [{ id: 'L2', stage: 'Quoted' }] }));
  assert.deepEqual(
    allLeads().map((l) => l.id + ':' + l.stage),
    ['L1:New', 'L2:Won']
  );
});

test('holiday days skip weekends, bank holidays and the Christmas shutdown', () => {
  replaceState(blank());
  assert.deepEqual(shutDays(2026), ['2026-12-23', '2026-12-24', '2026-12-29', '2026-12-30', '2026-12-31']);
  assert.equal(holDays('2026-11-09', '2026-11-15'), 5);
  assert.equal(holDays('2026-12-21', '2026-12-31'), 2);
  replaceState(blank({ shut: { 2026: ['2026-12-24'] } }));
  assert.equal(holDays('2026-12-21', '2026-12-31'), 6);
});

test('allowance: one extra day at 5, 10 and 15 years of service, 3 at most', () => {
  assert.equal(svcExtra({ start: '2022-01-01' }), 0);
  assert.equal(svcExtra({ start: '2021-01-01' }), 1);
  assert.equal(svcExtra({ start: '2016-01-01' }), 2);
  assert.equal(svcExtra({ start: '1990-01-01' }), 3);
  assert.equal(allowTot({ allow: 20, pension: 1, carry: 2, start: '2016-01-01' }), 25);
});

test('holiday chart codes and days left', () => {
  const s = { id: 's1', allow: 20 };
  replaceState(
    blank({
      abs: { s1: { '2026-11-02': 'S' } },
      hols: [
        { sid: 's1', status: 'Approved', from: '2026-11-10', to: '2026-11-11', days: 2 },
        { sid: 's1', status: 'Pending', from: '2026-11-16', to: '2026-11-16', days: 1 },
      ],
    })
  );
  assert.equal(absCode(s, '2026-11-02'), 'S'); // typed on the chart wins
  assert.equal(absCode(s, '2026-11-07'), ''); // Saturday
  assert.equal(absCode(s, '2026-12-25'), 'B');
  assert.equal(absCode(s, '2026-11-10'), 'H');
  assert.equal(absCode(s, '2026-11-16'), 'P');
  assert.equal(absCode(s, '2026-12-23'), 'H'); // shutdown
  // 20 - (2 approved + 5 shutdown) - 1 pending
  assert.equal(holLeft(s, 2026), 12);
});

test('people: jobs match a name or a team; renaming reaches every record', () => {
  assert.equal(forPerson({ name: 'Sam' }, 'Alex, Sam'), true);
  assert.equal(forPerson({ name: 'Sam', team: 'Team A' }, 'Team A'), true);
  assert.equal(forPerson({ name: 'Sam' }, 'Samuel'), false);
  const st = blank({
    leads: [{ owner: 'Old Name', takenBy: 'Old Name' }],
    contracts: [{ soldBy: 'Old Name', fitter: 'Alex, Old Name', fitter2: 'Old Name' }],
    calls: [{ fitter: 'Old Name' }],
    notes: [{ to: 'Old Name', by: 'Other' }],
    items: [{ user: 'Old Name' }],
    dash: { 'Old Name': { a: 1 } },
  });
  replaceState(st);
  renamePerson('Old Name', 'New Name');
  assert.equal(st.leads[0].owner, 'New Name');
  assert.equal(st.contracts[0].fitter, 'Alex, New Name');
  assert.equal(st.contracts[0].fitter2, 'New Name');
  assert.equal(st.calls[0].fitter, 'New Name');
  assert.equal(st.notes[0].to, 'New Name');
  assert.equal(st.items[0].user, 'New Name');
  assert.deepEqual(Object.keys(st.dash), ['New Name']);
});

test('salespeople list falls back to all staff', () => {
  replaceState(blank({ staff: [{ name: 'A', cat: 'Office' }] }));
  assert.deepEqual(OWNERS(), ['Unassigned', 'A']);
  replaceState(
    blank({
      staff: [
        { name: 'A', cat: 'Office' },
        { name: 'B', cat: 'Salespeople' },
      ],
    })
  );
  assert.deepEqual(OWNERS(), ['Unassigned', 'B']);
});

test('customer phone, email and addresses', () => {
  const r = {
    mob2: '07700 900 002',
    home1: '01603 000 000',
    email2: 'b@example.com',
    homeAddr: '1 Road',
    town: 'Norwich',
    homePc: 'NR1 1AA',
  };
  assert.equal(telOf(r), '07700 900 002');
  assert.equal(mailOf(r), 'b@example.com');
  assert.equal(addrOf(r), '1 Road, Norwich');
  assert.equal(siteOf(r), '1 Road, Norwich, NR1 1AA');
  assert.equal(siteOf({ ...r, siteSame: 'Different', siteAddr: '2 Lane', siteTown: 'Diss' }), '2 Lane, Diss');
});

test('stock: low level, reorder amount, matching key and numbers', () => {
  assert.equal(isLow({ stock: 2, reorder: 5 }), true);
  assert.equal(isLow({ stock: 5, reorder: 5 }), false);
  assert.equal(reorderQty({ stock: 2, reorder: 5 }), 8);
  assert.equal(reorderQty({ stock: 2, reorder: 5, reorderQty: 3 }), 3);
  assert.equal(ikey({ item: ' Frame ', length: '-', cInName: 'White' }), 'frame||white||');
  assert.equal(ikey({ item: 'X1', area: 'Stores' }), 'x1||||stores');
  assert.equal(unitOf({ unit: 'nonsense' }), 'Each');
  const st = blank({ items: [{ pid: '0003' }, { pid: '0007', type: 'request', ord: 'P0002' }], seq: { pend: 1 } });
  replaceState(st);
  assert.equal(stkId(), '0008');
  assert.equal(nextOrd('P'), 'P0003');
  assert.equal(st.seq.pend, 3);
  assert.equal(nextOrd(''), '0008'); // skips numbers used as Stock IDs
});

test('service calls are open until complete', () => {
  assert.equal(svcOpen({ status: 'Booked' }), true);
  assert.equal(svcOpen({ status: 'Complete' }), false);
});
