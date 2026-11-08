/* domain/stock: Products, stock levels, reorder rules and stock movements. */
import { LOW, UNITS } from '../config/constants.js';
import { nowT } from '../core/dates.js';
import { uuid } from '../core/ids.js';
import { SAFE } from '../core/sanitize.js';
import { state } from '../data/state.js';

/* ---- migrate older versions, fill gaps ---- */
export function stkId() {
  return String(
    Math.max(
      0,
      ...state.items.map((r) => (/^\d{4}$/.test(r.pid) ? +r.pid : 0)),
      ...state.items.map((r) => (r.type == 'request' && /^\d{4,}$/.test(r.ord || '') ? +r.ord : 0))
    ) + 1
  ).padStart(4, '0');
}
export const ikey = (r) =>
  [r.item, r.length, r.cInName, r.cOutName]
    .map((v) => {
      v = String(v || '')
        .trim()
        .toLowerCase();
      return v == '-' ? '' : v;
    })
    .join('|');
export const key = (r) => r.pid;
export const products = () => {
  const m = new Map();
  state.items.forEach((r) => {
    if (!m.has(r.pid)) m.set(r.pid, r);
  });
  return [...m.values()];
};
export const prodRows = (k) => state.items.filter((x) => x.pid == k);
export const prod = (k) => state.items.find((x) => x.pid == k);
export const ro = (r) => (r.reorder == null || r.reorder === '' ? LOW : +r.reorder || 0);
export const reorderQty = (r) => +r.reorderQty || Math.max(ro(r) * 2 - r.stock, 1);
export const isLow = (r) => r.stock < ro(r);
export const hasLoc = (r) => r.location && r.location != '-';
export const unitOf = (r) => (UNITS.includes(r.unit) ? r.unit : 'Each');
export const colTxt = (r) => [r.cInName, r.cOutName].filter((x) => x && x != '-').join(' / ') || '-';
export const stt = (r) => (r.stock <= 0 ? ['Out', 'r'] : isLow(r) ? ['Low', 'y'] : ['OK', 'g']);
export const pphotos = (k) => (state.pphotos[k] || []).filter(SAFE.img);
export function moveRow(b, kind, qty, stock, extra) {
  return {
    ...b,
    at: Date.now(),
    time: nowT(),
    type: kind,
    flag: false,
    cleared: false,
    uid: uuid(),
    user: USER,
    qty,
    stock,
    reqStatus: undefined,
    ord: undefined,
    pref: undefined,
    note: undefined,
    ...(extra || {}),
  };
}
export const byUid = (u) => state.items.find((x) => x.uid == u);
/* request numbers: P0001 while pending, then the next order number (0001, 0002...) once approved */
/* next order / pending number: one above the highest already used, so numbers never repeat.
   Approved order numbers also skip numbers used as Stock IDs, so 0001 can't mean two things. */
export function nextOrd(pre) {
  const re = new RegExp('^' + pre + '(\\d+)$'),
    used = [
      ...state.items
        .map((x) => re.exec(x.ord || ''))
        .filter(Boolean)
        .map((m) => +m[1]),
      ...(pre ? [] : state.items.filter((x) => /^\d{4,}$/.test(x.pid || '')).map((x) => +x.pid)),
    ],
    key = pre ? 'pend' : 'order',
    n = Math.max(+state.seq[key] || 0, 0, ...used) + 1;
  state.seq[key] = n;
  return pre + String(n).padStart(4, '0');
}
