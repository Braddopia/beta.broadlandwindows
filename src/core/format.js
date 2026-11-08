/* core/format: Money, numbers and text formatting. */

/* ---- formatting ---- */
export const money = (n) =>
  '£' + (+n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const m0 = (n) => '£' + Math.round(+n || 0).toLocaleString('en-GB');
export const pad = (n) => String(n).padStart(2, '0');
export const pc = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '0%');
export const sum = (a, f) => a.reduce((x, y) => x + (+f(y) || 0), 0);
export const grp = (a, f) => {
  const m = {};
  a.forEach((x) => {
    const k = f(x) || 'Unknown';
    (m[k] = m[k] || []).push(x);
  });
  return Object.entries(m);
};
export const kb = (x) => (x < 1e6 ? Math.max(1, Math.round(x / 1e3)) + ' KB' : (x / 1e6).toFixed(1) + ' MB');
export const initials = (n) =>
  String(n || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
/* ---------------- suppliers (linked to inventory) ---------------- */
export const lines = (v) =>
  String(v || '')
    .split(/\r?\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);
export const tc = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase());
