/* domain/stock-lists: the fixed lists Inventory picks from: where things are kept, the product groups, and the
   colour codes used on the stock sheet, each linked to its RAL colour and finish (KL016 is RAL 7032 Matt).
   An administrator keeps them up to date in Inventory, Stock Lists. Plain data and functions (tests/unit). */
import { state } from '../data/state.js';

/* from the office stock sheet (locations named after a person are added by the office, not kept here) */
export const DEF_LOCS = ['Door Locks', 'Solar', 'Window Handles', 'Tilt & Turn', 'T/V'];
export const DEF_GROUPS = [
  'Window Accessories',
  'Door Accessories',
  'Window Hardware',
  'Door Hardware',
  'Window Locks',
  'Door Locks',
  'Door Cylinders',
];
/** (v19.18.4, the owner's list) the stock-take areas: the racks BTSS-01 to BTSS-40, BTDR-01 to BTDR-40 and
    BTWIN-01 to BTWIN-40, the Sobinco area and the four containers */
const rack = (p) => Array.from({ length: 40 }, (_, i) => p + '-' + String(i + 1).padStart(2, '0'));
export const STOCK_AREAS = [
  ...rack('BTSS'),
  'Sobinco',
  ...rack('BTDR'),
  ...rack('BTWIN'),
  'Red Container',
  'Grey Container',
  'Blue Container',
  'Green Container',
];
export const FINISHES = ['Matt', 'Satin', 'Gloss', 'Textured', 'Woodgrain', 'Anodised', 'Other'];
/* the colour codes on the stock sheet; a RAL code links to its own number, KL016 is RAL 7032 Matt, the rest are
   linked by the office */
const SHEET_CODES =
  'SSS SAN WP BL SA RAL2001 RAL6001 RAL1015 RAL1019 RAL6003 SEN012 SEN002 SEN018 SEN010 SEN015 SEN003 SEN014 CWD001 KL14ST CWD002 KL15ST RAL1013 RAL7030 RAL7012 RAL7037 RAL7026 RAL7011 KL017 RAL7044 KL016 RAL7009 RAL7038 RAL7005 RAL7043 RAL9002 18B29M RAL8007 RAL9003 KL006 RAL8015 KL013 RAL9011 RAL7031 SEN004 KL015ST RAL7021 RAL7023';
export const DEF_COLOURS = () =>
  SHEET_CODES.split(' ').map((code) => {
    const m = /^RAL(\d{4})$/.exec(code);
    return { code, ral: m ? m[1] : code == 'KL016' ? '7032' : '', fin: code == 'KL016' ? 'Matt' : '' };
  });

/** the lists in use: what the office has set, or the defaults until then */
export function stockLists() {
  const L = state.stockLists || {};
  return {
    locs: Array.isArray(L.locs) ? L.locs : DEF_LOCS.slice(),
    groups: Array.isArray(L.groups) ? L.groups : DEF_GROUPS.slice(),
    colours: Array.isArray(L.colours) ? L.colours : DEF_COLOURS(),
  };
}
/** the choices for a drop-down: the list, plus the value already saved if it is not on it (nothing is lost) */
export const listChoices = (list, cur) => ['', ...list, ...(cur && !list.includes(cur) ? [cur] : [])];
/** how a colour code reads everywhere: "KL016 (RAL 7032 Matt)", or just the code until it is linked */
export const codeText = (c) =>
  !c ? '' : c.ral ? c.code + ' (RAL ' + c.ral + (c.fin ? ' ' + c.fin : '') + ')' : c.code;
/** colour codes matching what was typed: the code itself, or its RAL number ("7032" finds KL016) */
export function codeFind(q, colours) {
  const t = String(q || '')
    .trim()
    .toUpperCase()
    .replace(/^RAL\s*/, '');
  if (!t) return [];
  return (colours || stockLists().colours).filter((c) => c.code.toUpperCase().startsWith(t) || c.ral == t);
}
/** the colour code a saved colour name came from ("KL016 (RAL 7032 Matt)" or "KL016"), if any */
export function codeOf(name, colours) {
  const t = String(name || '')
    .trim()
    .toUpperCase()
    .split(/[\s(]/)[0];
  return (colours || stockLists().colours).find((c) => c.code.toUpperCase() == t) || null;
}
