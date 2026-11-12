/* domain/stock: Products, stock levels, reorder rules and stock movements. */
import { LOW, UNITS } from '../config/constants.js';
import { nowT } from '../core/dates.js';
import { uuid } from '../core/ids.js';
import { barLenOf } from './barcut.js';
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
/* what makes a product line unique: code, length, colours and stock-take area
   (the same code kept in two areas, e.g. Stores and Fitters Vans, is two lines with their own counts) */
export const ikey = (r) =>
  [r.item, r.length, r.cInName, r.cOutName, r.area]
    .map((v) => {
      v = String(v || '')
        .trim()
        .toLowerCase();
      return v == '-' ? '' : v;
    })
    .join('|');
export const key = (r) => r.pid;
/* one row per product: the newest row of each Stock ID (rows are kept newest first).
   Kept until the list changes or the next save, because pages ask for it many times per draw. */
let pCache = null,
  pKey = [];
export const products = () => {
  const I = state.items,
    k = [I, I.length, I[0], state._saved];
  if (pCache && k.every((x, i) => x === pKey[i])) return pCache;
  const m = new Map();
  I.forEach((r) => {
    if (!m.has(r.pid)) m.set(r.pid, r);
  });
  pKey = k;
  return (pCache = [...m.values()]);
};
export const prodRows = (k) => state.items.filter((x) => x.pid == k);
export const prod = (k) => state.items.find((x) => x.pid == k);
export const ro = (r) => (r.reorder == null || r.reorder === '' ? LOW : +r.reorder || 0);
export const reorderQty = (r) => +r.reorderQty || Math.max(ro(r) * 2 - r.stock, 1);
export const isLow = (r) => r.stock < ro(r);
export const hasLoc = (r) => r.location && r.location != '-';
export const unitOf = (r) => (UNITS.includes(r.unit) ? r.unit : 'Each');
/** the Unit column: stock kept in lengths shows its length (6.5M), pairs show Pairs, everything else PCS */
export function unitLabel(r) {
  const mm = barLenOf(r.length);
  if (mm) return +(mm / 1000).toFixed(3) + 'M';
  const u = unitOf(r);
  return u == 'Meters (M)' ? 'M' : u == 'Pair' ? 'Pairs' : 'PCS';
}
/** the size to show under the item when it is not already the Unit (e.g. 4MM packers) */
export const sizeNote = (r) => (r.length && r.length != '-' && !barLenOf(r.length) ? String(r.length) : '');
export const colTxt = (r) => [r.cInName, r.cOutName].filter((x) => x && x != '-').join(' / ') || '-';
export const stt = (r) => (r.stock <= 0 ? ['Out', 'r'] : isLow(r) ? ['Low', 'y'] : ['OK', 'g']);
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
/* a real stock movement (in or out), not a request or an imported starting line */
export const isMove = (r) => (r.type == 'add' || r.type == 'remove') && !r.undone;
/* anyone may undo a stock movement or request for this many minutes after it was made */
export const UNDO_MIN = 15;
/** can this movement still be undone? (not already undone, not an undo itself, request still pending) */
export const canUndo = (r, now = Date.now()) =>
  !!r &&
  !r.undone &&
  !r.undoOf &&
  !r.stake &&
  now - (r.at || 0) < UNDO_MIN * 6e4 &&
  (r.type == 'add' || r.type == 'remove' || (r.type == 'request' && r.reqStatus == 'Pending'));
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

/* ---- quality checks ---- */
export const QC_STATUS = ['', 'Passed', 'Awaiting check', 'Quarantine', 'Failed'];
export const CONDITIONS = ['', 'New', 'Good', 'Used', 'Damaged', 'Faulty'];
/* needs attention: failed or quarantined, damaged items, or past its expiry date */
export const qcIssue = (r, td) =>
  r.qc == 'Failed' ||
  r.qc == 'Quarantine' ||
  r.cond == 'Damaged' ||
  r.cond == 'Faulty' ||
  +r.damaged > 0 ||
  !!(r.expiry && td && r.expiry < td);
/* the stock-take area a product is counted in (the sheet name on the count sheets) */
export const areaOf = (r) => (r.area && r.area != '-' ? r.area : 'No Area');
/* exact match on Stock ID, item code or barcode (case and spaces ignored) */
export const normCode = (v) =>
  String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
export function exactProduct(q) {
  const c = normCode(q);
  if (!c) return null;
  const P = products();
  return (
    P.find((r) => normCode(r.pid) == c) ||
    P.find((r) => normCode(r.item) == c) ||
    P.find((r) => normCode(r.barcode) == c) ||
    null
  );
}
