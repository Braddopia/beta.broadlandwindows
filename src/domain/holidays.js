/* domain/holidays: Holiday allowance, days booked, bank holidays and the Christmas shutdown. */
import { BH, isWk, iso } from '../core/dates.js';
import { sum } from '../core/format.js';
import { state } from '../data/state.js';

/* ==========================================================================
   08 · Calendar, holiday planner, staff
   ========================================================================== */
export const hu = (s, y) => bookedDays(s, y || new Date().getFullYear());
/* days a booking really uses: weekdays that are not bank holidays or Christmas shutdown (already counted) */
export const holDays = (f, t) => {
  let n = 0;
  const d = new Date(f + 'T00:00'),
    e = new Date(t + 'T00:00');
  while (d <= e) {
    const k = iso(d);
    if (isWk(k) && !BH[k] && !shutDays(d.getFullYear()).includes(k)) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
};
export const holLeft = (s, y) =>
  allowTot(s) -
  hu(s, y) -
  sum(
    state.hols.filter(
      (h) => h.sid == s.id && h.status == 'Pending' && h.paid !== false && String(h.from).startsWith(String(y))
    ),
    (h) => +h.days || 0
  );
/* ---------------- holiday chart (same codes and rules as the office spreadsheet) ---------------- */
export const HCODES = [
  ['H', 'Holiday', 1, '#7cbc44'],
  ['H1', 'Half Day (Morning)', 0.5, '#add58a'],
  ['H2', 'Half Day (Afternoon)', 0.5, '#add58a'],
  ['S', 'Sickness', 0, '#f7a19a'],
  ['M', 'Maternity/Paternity', 0, '#fcc79b'],
  ['C', 'Compassionate', 0, '#f3a6f3'],
  ['A', 'Absent', 0, '#f6e39b'],
  ['B', 'Bank Holiday', 0, '#a8dcc0'],
  ['N', 'Non Working Day', 0, '#a8cff2'],
  ['U', 'Voluntary Unpaid', 0, '#eaf7a9'],
];
export const HC = Object.fromEntries(HCODES.map((c) => [c[0], c]));
/* Christmas shutdown: weekdays 23-31 Dec that are not bank holidays, unless an admin has changed them */
export const shutDays = (y) =>
  state.shut[y] || Array.from({ length: 9 }, (_, i) => y + '-12-' + (23 + i)).filter((k) => isWk(k) && !BH[k]);
export const svcYears = (s) =>
  s.start ? Math.max(0, Math.floor((Date.now() - new Date(s.start + 'T00:00')) / (365.25 * 864e5))) : 0;
export const svcExtra = (s) => Math.min(3, Math.floor(svcYears(s) / 5));
/* +1 day at 5, 10 and 15 years, 3 max */
export const allowTot = (s) => (+s.allow || 0) + svcExtra(s) + (+s.pension || 0) + (+s.carry || 0);
export function absCode(s, k) {
  const m = (state.abs[s.id] || {})[k];
  if (m !== undefined) return m;
  if (!isWk(k)) return '';
  if (BH[k]) return 'B';
  const h = state.hols.find((h) => h.sid == s.id && h.status != 'Rejected' && h.from <= k && h.to >= k);
  /* unpaid leave does not use the allowance: it shows as U (voluntary unpaid) */
  if (h) return h.status == 'Approved' ? (h.paid === false ? 'U' : 'H') : 'P';
  return shutDays(+k.slice(0, 4)).includes(k) ? 'H' : '';
}
export function yearCounts(s, y) {
  const c = {},
    d = new Date(y, 0, 1);
  while (d.getFullYear() == y) {
    const x = absCode(s, iso(d));
    if (x && HC[x]) c[x] = (c[x] || 0) + 1;
    d.setDate(d.getDate() + 1);
  }
  return c;
}
export const bookedDays = (s, y) => {
  const c = yearCounts(s, y);
  return sum(HCODES, (h) => (c[h[0]] || 0) * h[2]);
};
export const HGRP = ['Factory', 'Fitters', 'Office', 'Salespeople'];
