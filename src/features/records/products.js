/* features/records/products: the products on a contract (v19.18: on the Details tab, like the old system's grid).
   A small toolbar moves between lines (first, previous, next, last), adds (+) and removes (−) a line, adds the default
   lines and makes lines from the job's deliveries. Info For FENSA sits underneath. */
import { onClick } from '../../core/actions.js';
import { $, $$ } from '../../core/dom.js';
import { html, raw } from '../../core/html.js';
import { money, sum } from '../../core/format.js';
import { SAFE } from '../../data/sanitize.js';
import { state } from '../../data/state.js';
import { recRail, recordWin } from './record-window.js';
import { abRow } from './ab-list.js';
import { FENSAF } from './fields.js';
import { toast } from '../../ui/toast.js';

/** the lines "Default" adds to a contract that has none of them yet; change the list here */
export const DEFAULT_LINES = [
  { code: 'LAB', name: 'Labour (fitting)', qty: 1, guar: '10 years', loc: '', rate: 0 },
  { code: 'TRIM', name: 'Trims and finishing', qty: 1, guar: '10 years', loc: '', rate: 0 },
  { code: 'WASTE', name: 'Removal and disposal of old frames', qty: 1, guar: '', loc: '', rate: 0 },
];
const COLS = ['code', 'name', 'qty', 'guar', 'loc', 'rate'];
const tb = (fn, label, txt, dis, ...args) =>
  html`<button type="button" class="abt-b" title="${label}" aria-label="${label}" ${raw(onClick(fn, ...args))}${dis ? raw(' disabled') : ''}>${raw(txt)}</button>`;

/** the products grid on its own (drawn again after a change) */
export function linesGrid(W) {
  const L = (W.v.lines = W.v.lines || []),
    n = L.length,
    s = Math.min(W.sel ?? 0, n - 1),
    tot = sum(L, (x) => (+x.qty || 0) * (+x.rate || 0));
  W.sel = s;
  return html`<div class="abt" role="toolbar" aria-label="Product lines">${tb('lineSel', 'First line', '&laquo;', s <= 0, 'first')}${tb('lineSel', 'Previous line', '&lsaquo;', s <= 0, -1)}${tb('lineSel', 'Next line', '&rsaquo;', s >= n - 1, 1)}${tb('lineSel', 'Last line', '&raquo;', s >= n - 1, 'last')}<span class="abt-sp"></span>${tb('lineAdd', 'Add a line', '+', false)}${tb('lineDel', 'Remove the chosen line', '&minus;', !n, s)}<span class="abt-sp"></span><button type="button" class="abt-w" data-act="lineDefault">Default</button><button type="button" class="abt-w" data-act="lineFromDeliveries">Create From Deliveries</button><span class="abt-n">${n ? `Line ${s + 1} of ${n}` : 'No lines'}</span></div>
  <div class="abgrid"><table class="plt"><thead><tr><th>Line No</th><th>Product Code</th><th>Product Name</th><th class="n">Qty</th><th>Guarantee</th><th>Location</th><th class="n">Rate</th><th class="n">Net Sales Value</th></tr></thead><tbody>
  ${
    L.length
      ? L.map(
          (x, i) =>
            html`<tr class="${i == s ? 'sel' : ''}" data-i="${i}"><td class="ln">${i + 1}</td>${COLS.map((f) => html`<td><input class="pl" data-i="${i}" data-f="${f}" value="${x[f] ?? ''}" aria-label="${{ code: 'Product code', name: 'Product name', qty: 'Quantity', guar: 'Guarantee', loc: 'Location', rate: 'Rate' }[f]} line ${i + 1}" ${raw(f == 'qty' || f == 'rate' ? 'type="number" step="any" min="0" inputmode="decimal"' : 'maxlength="120"')} ${raw(f == 'code' ? 'list="itemCodes"' : '')}></td>`)}<td class="n">${money((+x.qty || 0) * (+x.rate || 0))}</td></tr>`
        )
      : raw(
          '<tr><td colspan="8" class="empty">No products yet. Press + to add a line, or Default for the usual lines.</td></tr>'
        )
  }
  </tbody><tfoot><tr><td colspan="7" class="n"><b>Total</b></td><td class="n"><b>${money(tot)}</b></td></tr></tfoot></table></div>`;
}
/** the Products side of the Details tab: the grid, then Info For FENSA */
export function linesTab(W) {
  return String(
    html`<div id="abProd">${linesGrid(W)}</div>
  <section class="abfensa"><h4>Info For FENSA</h4><div class="abfensa-g">${raw(
    FENSAF()
      .map((f) => abRow(f, W.v))
      .join('')
  )}</div><button type="button" class="abt-more" ${raw(onClick('recGo', 'fensaCert'))}>More &raquo;</button></section>`
  );
}
export function readLines() {
  const L = (recordWin.v.lines || []).map((x) => ({ ...x }));
  $$('#mbox .pl').forEach((e) => {
    const x = L[+e.dataset.i];
    if (!x) return;
    const f = e.dataset.f;
    x[f] = f == 'qty' || f == 'rate' || f == 'cost' ? (SAFE.num(e.value, { max: 1e7 }) ?? 0) : SAFE.text(e.value, 120);
  });
  return L;
}
function redraw(focus) {
  const p = $('#abProd');
  if (p) p.innerHTML = String(linesGrid(recordWin));
  recRail();
  if (focus) {
    const e = $(`#abProd tr.sel input[data-f="${focus}"]`);
    if (e) e.focus();
  }
}
/** pick a line: a number moves by that many, or 'first' / 'last' */
export function lineSel(d) {
  const n = (recordWin.v.lines = readLines()).length,
    s = recordWin.sel || 0;
  recordWin.sel = Math.max(0, Math.min(n - 1, d == 'first' ? 0 : d == 'last' ? n - 1 : s + d));
  redraw();
}
export function lineAdd() {
  recordWin.v.lines = readLines();
  recordWin.v.lines.push({ code: '', name: '', qty: 1, guar: '10 years', loc: '', rate: 0 });
  recordWin.sel = recordWin.v.lines.length - 1;
  recordWin.dirty = 1;
  redraw('code');
}
export function lineDel(i) {
  const L = (recordWin.v.lines = readLines()),
    at = i ?? recordWin.sel ?? 0,
    gone = L[at];
  if (!gone) return;
  L.splice(at, 1);
  recordWin.sel = Math.max(0, at - 1);
  recordWin.dirty = 1;
  redraw();
  toast('Line removed', {
    action: {
      label: 'Undo',
      run: () => {
        if (!recordWin || !$('#abProd')) return;
        recordWin.v.lines = readLines();
        recordWin.v.lines.splice(at, 0, gone);
        recordWin.sel = at;
        redraw();
      },
    },
  });
}
/** the usual lines (labour, trims, waste), each added once */
export function lineDefault() {
  const L = (recordWin.v.lines = readLines()),
    add = DEFAULT_LINES.filter((d) => !L.some((x) => x.code == d.code));
  if (!add.length) return toast('The default lines are already there');
  L.push(...add.map((x) => ({ ...x })));
  recordWin.sel = L.length - 1;
  recordWin.dirty = 1;
  redraw();
  toast(add.length + ' default line' + (add.length == 1 ? '' : 's') + ' added');
}
/** one line for each delivery booked for this job that is not already a line */
export function lineFromDeliveries() {
  const L = (recordWin.v.lines = readLines()),
    D = state.deliveries.filter((d) => d.contract == recordWin.v.id),
    add = D.filter((d) => !L.some((x) => x.from == d.id));
  if (!D.length) return toast('No deliveries are booked for this contract yet');
  if (!add.length) return toast('Every delivery already has a line');
  L.push(
    ...add.map((d) => ({
      code: '',
      name: SAFE.text([d.supplier, d.items].filter(Boolean).join(': '), 120),
      qty: 1,
      guar: '10 years',
      loc: '',
      rate: 0,
      from: d.id,
    }))
  );
  recordWin.sel = L.length - 1;
  recordWin.dirty = 1;
  redraw();
  toast(add.length + ' line' + (add.length == 1 ? '' : 's') + ' made from deliveries');
}
/* clicking into a line picks it */
export function lineFocus(e) {
  const r = e.target.closest && e.target.closest('#abProd tbody tr[data-i]');
  if (!r || +r.dataset.i == recordWin.sel) return;
  recordWin.sel = +r.dataset.i;
  $$('#abProd tbody tr').forEach((x) => x.classList.toggle('sel', x === r));
  const n = $('#abProd .abt-n');
  if (n) n.textContent = 'Line ' + (recordWin.sel + 1) + ' of ' + recordWin.v.lines.length;
  $$('#abProd .abt-b').forEach((b, i) => {
    const s = recordWin.sel,
      last = recordWin.v.lines.length - 1;
    if (i < 2) b.disabled = s <= 0;
    else if (i < 4) b.disabled = s >= last;
  });
}
