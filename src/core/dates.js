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
export const fd = (d) =>
  d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Not set';
export const fdl = (d) => {
  const x = new Date(d + 'T00:00');
  return isNaN(x) ? '' : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};
export const dslash = (v) => (v ? v.split('-').reverse().join('/') : '');
export const nowT = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const isWk = (k) => {
  const g = new Date(k + 'T00:00').getDay();
  return g > 0 && g < 6;
};
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
