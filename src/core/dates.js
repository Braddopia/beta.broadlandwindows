/* core/dates: Dates: today, adding days, working days, weeks, UK bank holidays and how dates are shown. */
import { pad } from './format.js';

/* ---- dates ---- */
export const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const today = () => iso(new Date());
export const addDays = (n) => {
  const x = new Date();
  x.setDate(x.getDate() + n);
  return iso(x);
};
/* (v19.18.6) dates are shown with one shared formatter each, and each date's text is remembered: making a new
   formatter for every date shown was the slowest part of drawing pages full of dates (Holiday Planner) */
const FD = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }),
  FDL = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const memo = (fn) => {
  const M = new Map();
  return (k) => {
    let v = M.get(k);
    if (v === undefined) {
      if (M.size > 5000) M.clear();
      M.set(k, (v = fn(k)));
    }
    return v;
  };
};
const fdOf = memo((d) => {
  const x = new Date(d + 'T00:00');
  return isNaN(x) ? 'Invalid Date' : FD.format(x);
});
const fdlOf = memo((d) => {
  const x = new Date(d + 'T00:00');
  return isNaN(x) ? '' : FDL.format(x);
});
export const fd = (d) => (d ? fdOf(String(d)) : 'Not set');
export const fdl = (d) => fdlOf(String(d));
export const dslash = (v) => (v ? v.split('-').reverse().join('/') : '');
export const nowT = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const wkOf = memo((k) => {
  const g = new Date(k + 'T00:00').getDay();
  return g > 0 && g < 6;
});
export const isWk = (k) => wkOf(String(k));
export const wd = (a, b) => {
  let n = 0;
  const d = new Date(a + 'T00:00'),
    e = new Date(b + 'T00:00');
  while (d <= e) {
    const g = d.getDay();
    if (g && g < 6) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
};
export const weekRange = () => {
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  const a = new Date(n);
  a.setDate(n.getDate() - ((n.getDay() + 6) % 7));
  const b = new Date(a);
  b.setDate(a.getDate() + 6);
  return [iso(a), iso(b)];
};
export const inWeek = (d) => {
  const [a, b] = weekRange();
  return d >= a && d <= b;
};
export const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};
export const BH = {
  '2026-01-01': "New Year's Day",
  '2026-04-03': 'Good Friday',
  '2026-04-06': 'Easter Monday',
  '2026-05-04': 'Early May bank holiday',
  '2026-05-25': 'Spring bank holiday',
  '2026-08-31': 'Summer bank holiday',
  '2026-12-25': 'Christmas Day',
  '2026-12-28': 'Boxing Day (substitute)',
  '2027-01-01': "New Year's Day",
  '2027-03-26': 'Good Friday',
  '2027-03-29': 'Easter Monday',
  '2027-05-03': 'Early May bank holiday',
  '2027-05-31': 'Spring bank holiday',
  '2027-08-30': 'Summer bank holiday',
  '2027-12-27': 'Christmas Day (substitute)',
  '2027-12-28': 'Boxing Day (substitute)',
};

/** ISO week number (weeks start on Monday; week 1 holds the year's first Thursday), e.g. 47 */
export function isoWeek(k) {
  const d = new Date(typeof k == 'string' ? k + 'T00:00' : k);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}
