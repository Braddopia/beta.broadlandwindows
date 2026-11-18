// Half days (H1 morning, H2 afternoon) and booking clashes.
import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { replaceState } from '../../src/data/state.js';
import { absCode, bookedDays, holClash, holLen } from '../../src/domain/holidays.js';

beforeEach(() => mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-18T10:00:00') }));
afterEach(() => mock.timers.reset());
const S = { id: 'U1', name: 'Sample Person', allow: 25 };
const st = (hols) => replaceState({ staff: [S], hols, abs: {}, shut: {}, contracts: [] });
const H = (o) => ({ id: 'H' + Math.random(), sid: 'U1', status: 'Approved', paid: true, ...o });

test('a half day shows as H1 (morning) or H2 (afternoon) and counts half a day', () => {
  st([
    H({ from: '2026-12-08', to: '2026-12-08', days: 0.5, half: 'am' }),
    H({ from: '2026-12-09', to: '2026-12-09', days: 0.5, half: 'pm' }),
  ]);
  assert.equal(absCode(S, '2026-12-08'), 'H1');
  assert.equal(absCode(S, '2026-12-09'), 'H2');
  st([]);
  const none = bookedDays(S, 2026);
  st([H({ from: '2026-12-08', to: '2026-12-08', days: 0.5, half: 'am' })]);
  assert.equal(bookedDays(S, 2026) - none, 0.5);
});
test('a morning and an afternoon on the same day make a whole day', () => {
  st([
    H({ from: '2026-12-08', to: '2026-12-08', days: 0.5, half: 'am' }),
    H({ from: '2026-12-08', to: '2026-12-08', days: 0.5, half: 'pm' }),
  ]);
  assert.equal(absCode(S, '2026-12-08'), 'H');
});
test('waiting for approval shows P; unpaid shows U', () => {
  st([H({ from: '2026-12-08', to: '2026-12-08', days: 0.5, half: 'am', status: 'Pending' })]);
  assert.equal(absCode(S, '2026-12-08'), 'P');
  st([H({ from: '2026-12-08', to: '2026-12-08', days: 0.5, half: 'am', paid: false })]);
  assert.equal(absCode(S, '2026-12-08'), 'U');
});
test('a booking cannot cover days already booked, but the other half of a half day can be booked', () => {
  st([
    H({ id: 'A', from: '2026-12-01', to: '2026-12-03', days: 3 }),
    H({ id: 'B', from: '2026-12-08', to: '2026-12-08', days: 0.5, half: 'am' }),
  ]);
  assert.equal(holClash('U1', '2026-12-03', '2026-12-04', '').id, 'A');
  assert.equal(holClash('U1', '2026-12-04', '2026-12-05', ''), null);
  assert.equal(holClash('U1', '2026-12-08', '2026-12-08', 'pm'), null);
  assert.equal(holClash('U1', '2026-12-08', '2026-12-08', 'am').id, 'B');
  assert.equal(holClash('U1', '2026-12-08', '2026-12-08', '').id, 'B');
  assert.equal(holClash('U1', '2026-12-01', '2026-12-01', '', 'A'), null);
});
test('turned-down requests do not block the days', () => {
  st([H({ from: '2026-12-01', to: '2026-12-03', days: 3, status: 'Rejected' })]);
  assert.equal(holClash('U1', '2026-12-02', '2026-12-02', ''), null);
});
test('how long a booking is, in words', () => {
  assert.equal(holLen({ days: 2 }), '2 days');
  assert.equal(holLen({ days: 1 }), '1 day');
  assert.equal(holLen({ days: 0.5, half: 'pm' }), 'Half day (afternoon)');
});
