/* features/records/products: The products step: what is supplied and fitted. */
import { onClick } from '../../core/actions.js';
import { $$, esc } from '../../core/dom.js';
import { money, sum } from '../../core/format.js';
import { SAFE } from '../../data/sanitize.js';
import { recRedraw, recordWin } from './record-window.js';

/* ---- product lines (contracts) ---- */
export function linesTab(W) {
  const L = (W.v.lines = W.v.lines || []);
  const tot = sum(L, (x) => (+x.qty || 0) * (+x.rate || 0));
  return `<div class="rg wide"><h4><span>Products</span><button class="mini pri" data-act="lineAdd">+ Add line</button></h4><div class="tw" style="box-shadow:none"><table class="plt"><thead><tr><th>No</th><th>Code</th><th>Product</th><th class="n">Qty</th><th>Guarantee</th><th>Location</th><th class="n">Rate</th><th class="n">Net Value</th><th></th></tr></thead><tbody>
  ${L.map((x, i) => `<tr><td>${i + 1}</td>${['code', 'name', 'qty', 'guar', 'loc', 'rate'].map((f) => `<td><input class="pl" data-i="${i}" data-f="${f}" value="${esc(x[f] ?? '')}" ${f == 'qty' || f == 'rate' ? 'type="number" step="any" min="0" inputmode="decimal"' : 'maxlength="120"'} ${f == 'code' ? 'list="itemCodes"' : ''}></td>`).join('')}<td class="n">${money((+x.qty || 0) * (+x.rate || 0))}</td><td><button class="mini del" ${onClick('lineDel', i)} aria-label="Remove line">&times;</button></td></tr>`).join('') || '<tr><td colspan="9" class="empty">No products yet. Add the windows, doors and labour on this contract.</td></tr>'}
  </tbody><tfoot><tr><td colspan="7" class="n"><b>Total</b></td><td class="n"><b>${money(tot)}</b></td><td></td></tr></tfoot></table></div></div>`;
}
export function readLines() {
  const L = (recordWin.v.lines || []).map((x) => ({ ...x }));
  $$('#mbox .pl').forEach((e) => {
    const x = L[+e.dataset.i];
    if (!x) return;
    const f = e.dataset.f;
    x[f] = f == 'qty' || f == 'rate' ? (SAFE.num(e.value, { max: 1e7 }) ?? 0) : SAFE.text(e.value, 120);
  });
  return L;
}
export function lineAdd() {
  recordWin.v.lines = readLines();
  recordWin.v.lines.push({ code: '', name: '', qty: 1, guar: '10 years', loc: '', rate: 0 });
  recordWin.dirty = 1;
  recRedraw('products');
}
export function lineDel(i) {
  recordWin.v.lines = readLines();
  recordWin.v.lines.splice(i, 1);
  recordWin.dirty = 1;
  recRedraw('products');
}
