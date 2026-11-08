/* ui/components/table: Tables: sorting and paging. */
import { onClick, onEvent } from '../../core/actions.js';
import { esc } from '../../core/dom.js';
import { render } from '../shell/router.js';
import { uiState } from '../ui-state.js';

/* ---- pagination ---- */
export function paginate(st, rows) {
  const per = +st.per || 0,
    pages = per > 0 ? Math.max(1, Math.ceil(rows.length / per)) : 1;
  st.page = Math.min(Math.max(1, st.page || 1), pages);
  const s = per > 0 ? (st.page - 1) * per : 0;
  return {
    rows: per > 0 ? rows.slice(s, s + per) : rows,
    from: rows.length ? s + 1 : 0,
    to: per > 0 ? Math.min(rows.length, s + per) : rows.length,
    total: rows.length,
    pages,
  };
}
export function pagerH(key, p, label) {
  const st = uiState[key];
  if (!p.total) return '';
  const nums = [];
  for (let i = 1; i <= p.pages; i++)
    if (i == 1 || i == p.pages || Math.abs(i - st.page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] != '…') nums.push('…');
  return `<div class="pager"><span>Showing ${p.from}–${p.to} of ${p.total} ${esc(label || 'rows')}</span><span class="acts">${p.pages > 1 ? `<button class="mini" ${onClick('setUI', key + '.page', st.page - 1)} ${st.page <= 1 ? 'disabled' : ''} aria-label="Previous page">&lsaquo;</button>${nums.map((n) => (n == '…' ? '<span class="muted">…</span>' : `<button class="mini ${n == st.page ? 'on' : ''}" ${onClick('setUI', key + '.page', n)}>${n}</button>`)).join('')}<button class="mini" ${onClick('setUI', key + '.page', st.page + 1)} ${st.page >= p.pages ? 'disabled' : ''} aria-label="Next page">&rsaquo;</button>` : ''}
   <select class="fsel" aria-label="Rows per page" ${onEvent('onchange', 'setUI', key + '.per', 'this.value')}>${[25, 50, 100, 0].map((n) => `<option value="${n}" ${+st.per == n ? 'selected' : ''}>${n || 'All'} per page</option>`).join('')}</select></span></div>`;
}
/* sortable header cell */
export const thS = (key, col, label, cls = '') => {
  const st = uiState[key];
  return `<th class="srt ${cls}" ${onClick('sortBy', key, col)} aria-sort="${st.sort == col ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}">${esc(label)}${st.sort == col ? `<span class="ar">${st.dir > 0 ? '▲' : '▼'}</span>` : ''}</th>`;
};
export function sortBy(key, col) {
  const st = uiState[key];
  st.dir = st.sort == col ? -st.dir : 1;
  st.sort = col;
  render();
}
export const cmp = (a, b) =>
  typeof a == 'number' && typeof b == 'number'
    ? a - b
    : String(a ?? '').localeCompare(String(b ?? ''), 'en', { numeric: true, sensitivity: 'base' });
