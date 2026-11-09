/* ui/ui-state: Remembered page settings: filters, sort order, page number and view. */
import { render } from './shell/router.js';

/* ==========================================================================
   04 · Shell: views registry, navigation, render loop, modal, forms,
        photos, pagination, toast, theme, top bar
   ========================================================================== */
/* All page-level UI state lives here (instead of a dozen loose globals) */
export const uiState = {
  svc: { f: 'open', page: 1, per: 50 },
  inv: { v: 'products', f: 'all', q: '', sup: 'all', loc: 'all', area: 'all', unit: 'all', sort: 'item', dir: 1, page: 1, per: 50 },
  take: { area: '', f: 'all', q: '', show: false, page: 1, per: 100 },
  mov: { f: 'all', sort: '', dir: 1, page: 1, per: 50 },
  cal: { m: 'month', o: 0, sd: null, ly: { fit: 1, svc: 1, del: 1, hol: 1 } },
  hol: { m: 0, v: 'chart', cm: new Date().getMonth(), y: new Date().getFullYear(), brush: '' },
  rep: { t: 'summary' },
  fin: { t: 'debtors', pm: 0 },
  del: { f: 'out', s: 'all', v: 'list' },
  files: { cat: 'all', az: 0, list: 0, ssq: '', page: 1, per: 50 },
  con: { f: 'all' },
  board: 'factory',
  msg: { box: 'in', to: 'Everyone' },
  staff: { c: 'all' },
  sup: { open: '' },
  lead: { v: 'list', f: 'live', src: 'all', own: 'all', sort: 'id', dir: 1, page: 1, per: 50 },
  ctr: { v: 'list', f: 'cur', sort: 'id', dir: 1, page: 1, per: 50 },
  nc: { t: 'All' },
  audit: { page: 1, per: 50 },
};
export function setUI(path, val) {
  const p = path.split('.');
  let o = uiState;
  for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
  o[p[p.length - 1]] = val;
  if (p.length == 2 && p[1] != 'page' && uiState[p[0]] && typeof uiState[p[0]] == 'object' && 'page' in uiState[p[0]])
    uiState[p[0]].page = 1;
  render();
}
export function togUI(path) {
  const p = path.split('.');
  let o = uiState;
  for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
  const k = p[p.length - 1];
  o[k] = o[k] ? 0 : 1;
  render();
}
