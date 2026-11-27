/* features/contracts/contract-tabs: contract tabs from the old system (v19.18): Commissions, Job Costings, the
   Contract Schedule on Fitting and the Deliveries table. Commissions and Job Costings are money, so they show only to
   accounts that may see money (`can('money')`). */
import { onClick, rowClick } from '../../core/actions.js';
import { fd } from '../../core/dates.js';
import { $, $$ } from '../../core/dom.js';
import { html, raw } from '../../core/html.js';
import { money, sum } from '../../core/format.js';
import { SAFE } from '../../data/sanitize.js';
import { state } from '../../data/state.js';
import { staffNames } from '../../domain/people.js';
import { OTHER, schedData } from '../schedule/schedule.js';
import { readLines } from '../records/products.js';
import { recRail, recordWin } from '../records/record-window.js';
import { toast } from '../../ui/toast.js';

const tb = (fn, label, dis, ...args) =>
  html`<button type="button" class="abt-w" ${raw(onClick(fn, ...args))}${dis ? raw(' disabled') : ''}>${label}</button>`;
const num = (v) => SAFE.num(v, { max: 1e7 }) ?? 0;

/* ---------------- Commissions ---------------- */
export const COMM_ROLES = ['Salesperson', 'Sales Manager', 'Sales Director', 'Canvasser', 'Other'];
/** what a commission line comes to: a fixed amount, or a percentage of the contract value before VAT */
export const commAmt = (x, net) => (+x.pct ? Math.round((((+x.pct || 0) * net) / 100) * 100) / 100 : +x.amt || 0);
const netOf = (v) => {
  const val = +v.value || 0,
    rate = +(v.vatRate ?? 20) || 0;
  return Math.round((val / (1 + rate / 100)) * 100) / 100;
};
export function commTab(W) {
  return String(html`<div id="abComm">${commGrid(W)}</div>`);
}
function commGrid(W) {
  const L = (W.v.comm = W.v.comm || []),
    net = netOf(W.v),
    staff = staffNames().filter(Boolean);
  const opt = (o, v) => o.map((x) => html`<option${x == v ? raw(' selected') : ''}>${x}</option>`);
  return html`<div class="abt" role="toolbar" aria-label="Commission lines">${tb('commAdd', '+ Add Line')}${tb('commDefault', 'Default', false)}<span class="abt-n">Worked out on ${money(net)} before VAT</span></div>
  <div class="abgrid"><table class="plt"><thead><tr><th>Who</th><th>Role</th><th class="n">Rate %</th><th class="n">Fixed £</th><th class="n">Commission</th><th>Paid On</th><th>Note</th><th></th></tr></thead><tbody>${
    L.length
      ? L.map(
          (x, i) =>
            html`<tr><td><select class="cml" data-i="${i}" data-f="who" aria-label="Who, line ${i + 1}">${opt(['', ...new Set([...staff, x.who].filter(Boolean))], x.who)}</select></td><td><select class="cml" data-i="${i}" data-f="role" aria-label="Role, line ${i + 1}">${opt(COMM_ROLES, x.role)}</select></td><td><input class="cml" data-i="${i}" data-f="pct" type="number" step="any" min="0" max="100" value="${x.pct || ''}" aria-label="Rate, line ${i + 1}"></td><td><input class="cml" data-i="${i}" data-f="amt" type="number" step="any" min="0" value="${x.amt || ''}" aria-label="Fixed amount, line ${i + 1}"></td><td class="n">${money(commAmt(x, net))}</td><td><input class="cml" data-i="${i}" data-f="paid" type="date" value="${x.paid || ''}" aria-label="Paid on, line ${i + 1}"></td><td><input class="cml" data-i="${i}" data-f="note" maxlength="120" value="${x.note || ''}" aria-label="Note, line ${i + 1}"></td><td><button type="button" class="mini del" ${raw(onClick('commDel', i))} aria-label="Remove line ${i + 1}">&times;</button></td></tr>`
        )
      : raw(
          '<tr><td colspan="8" class="empty">No commission lines. Press Default for the salesperson, manager and director on this contract.</td></tr>'
        )
  }</tbody><tfoot><tr><td colspan="4" class="n"><b>Total commission</b></td><td class="n"><b>${money(sum(L, (x) => commAmt(x, net)))}</b></td><td colspan="3"></td></tr></tfoot></table></div>`;
}
export function readComm() {
  const L = (recordWin.v.comm || []).map((x) => ({ ...x }));
  $$('#mbox .cml').forEach((e) => {
    const x = L[+e.dataset.i];
    if (!x) return;
    const f = e.dataset.f;
    x[f] = f == 'pct' || f == 'amt' ? num(e.value) : f == 'paid' ? SAFE.date(e.value) || '' : SAFE.text(e.value, 120);
  });
  return L;
}
function commRedraw() {
  const p = $('#abComm');
  if (p) p.innerHTML = String(commGrid(recordWin));
  recordWin.dirty = 1;
}
export function commAdd() {
  recordWin.v.comm = readComm();
  recordWin.v.comm.push({ who: '', role: 'Salesperson', pct: 0, amt: 0, paid: '', note: '' });
  commRedraw();
}
export function commDel(i) {
  recordWin.v.comm = readComm();
  recordWin.v.comm.splice(i, 1);
  commRedraw();
}
/** one line each for the salesperson, sales manager and sales director named on Details */
export function commDefault() {
  const L = (recordWin.v.comm = readComm()),
    g = (k) => ($('#f_' + k) ? $('#f_' + k).value : recordWin.v[k]) || '',
    want = [
      [g('soldBy'), 'Salesperson'],
      [g('salesMgr'), 'Sales Manager'],
      [g('salesDir'), 'Sales Director'],
    ].filter(([w]) => w && !/random/i.test(w) && !L.some((x) => x.who == w));
  if (!want.length) return toast('Name the salesperson, manager or director on Details first');
  L.push(...want.map(([who, role]) => ({ who, role, pct: 0, amt: 0, paid: '', note: '' })));
  commRedraw();
}
export function commChange(e) {
  if (e.target.classList && e.target.classList.contains('cml') && /pct|amt/.test(e.target.dataset.f)) {
    recordWin.v.comm = readComm();
    const p = $('#abComm'),
      a = document.activeElement,
      sel = a && a.classList.contains('cml') ? `.cml[data-i="${a.dataset.i}"][data-f="${a.dataset.f}"]` : '';
    if (p) p.innerHTML = String(commGrid(recordWin));
    if (sel && $('#abComm ' + sel)) $('#abComm ' + sel).focus();
  }
}

/* ---------------- Job Costings ---------------- */
export function costTab(W) {
  return String(html`<div id="abCost">${costGrid(W)}</div>`);
}
function costGrid(W) {
  const L = W.v.lines || [],
    X = (W.v.costs = W.v.costs || []),
    sale = sum(L, (x) => (+x.qty || 0) * (+x.rate || 0)),
    lc = sum(L, (x) => +x.cost || 0),
    xc = sum(X, (x) => +x.amt || 0),
    cost = lc + xc,
    profit = sale - cost;
  return html`<div class="jc-k"><span><small>Sales (net)</small><b>${money(sale)}</b></span><span><small>Costs</small><b>${money(cost)}</b></span><span class="${profit < 0 ? 'neg' : ''}"><small>Profit</small><b>${money(profit)}</b></span><span><small>Margin</small><b>${sale && cost ? Math.round((100 * profit) / sale) + '%' : '-'}</b></span></div>
  <h4 class="jc-h">Products</h4>
  <div class="abgrid jc"><table class="plt"><thead><tr><th>Line No</th><th>Product Code</th><th>Product Name</th><th class="n">Qty</th><th class="n">Net Sales Value</th><th class="n">Cost £</th><th class="n">Margin</th></tr></thead><tbody>${
    L.length
      ? L.map((x, i) => {
          const s = (+x.qty || 0) * (+x.rate || 0);
          return html`<tr><td class="ln">${i + 1}</td><td>${x.code || ''}</td><td>${x.name || ''}</td><td class="n">${x.qty || 0}</td><td class="n">${money(s)}</td><td><input class="pl" data-i="${i}" data-f="cost" type="number" step="any" min="0" value="${x.cost || ''}" aria-label="Cost, line ${i + 1}"></td><td class="n">${s && +x.cost ? Math.round((100 * (s - +x.cost)) / s) + '%' : '-'}</td></tr>`;
        })
      : raw('<tr><td colspan="7" class="empty">No products yet. Add them on the Details tab.</td></tr>')
  }</tbody></table></div>
  <h4 class="jc-h">Other Costs <button type="button" class="abt-w" data-act="costAdd">+ Add Cost</button></h4>
  <div class="abgrid jc"><table class="plt"><thead><tr><th>What</th><th class="n">Cost £</th><th></th></tr></thead><tbody>${
    X.length
      ? X.map(
          (x, i) =>
            html`<tr><td><input class="jcx" data-i="${i}" data-f="what" maxlength="120" value="${x.what || ''}" aria-label="What, cost ${i + 1}"></td><td><input class="jcx" data-i="${i}" data-f="amt" type="number" step="any" min="0" value="${x.amt || ''}" aria-label="Cost ${i + 1}"></td><td><button type="button" class="mini del" ${raw(onClick('costDel', i))} aria-label="Remove cost ${i + 1}">&times;</button></td></tr>`
        )
      : raw('<tr><td colspan="3" class="empty">No other costs (skips, scaffolding, sub-contractors...).</td></tr>')
  }</tbody></table></div>
  <p class="muted jc-n">The total cost is saved as the Job Cost on Finance.</p>`;
}
export function readCosts() {
  const X = (recordWin.v.costs || []).map((x) => ({ ...x }));
  $$('#mbox .jcx').forEach((e) => {
    const x = X[+e.dataset.i];
    if (x) x[e.dataset.f] = e.dataset.f == 'amt' ? num(e.value) : SAFE.text(e.value, 120);
  });
  return X;
}
/** draw Job Costings again from what is typed (products may have changed on Details) */
export function costRedraw() {
  const p = $('#abCost');
  if (!p) return;
  recordWin.v.lines = readLines();
  recordWin.v.costs = readCosts();
  const a = document.activeElement,
    sel =
      a && p.contains(a) && a.dataset.f
        ? `[data-i="${a.dataset.i}"][data-f="${a.dataset.f}"].${a.className.split(' ')[0]}`
        : '';
  p.innerHTML = String(costGrid(recordWin));
  if (sel && p.querySelector(sel)) p.querySelector(sel).focus();
  recRail();
}
export function costAdd() {
  recordWin.v.costs = readCosts();
  recordWin.v.costs.push({ what: '', amt: 0 });
  recordWin.dirty = 1;
  costRedraw();
  const i = $$('#abCost .jcx[data-f=what]').pop();
  if (i) i.focus();
}
export function costDel(i) {
  recordWin.v.costs = readCosts();
  recordWin.v.costs.splice(i, 1);
  recordWin.dirty = 1;
  costRedraw();
}
/** the job's total cost from Job Costings (lines and other costs), or null when nothing is costed there */
export function costTotal(lines, costs) {
  const t = sum(lines || [], (x) => +x.cost || 0) + sum(costs || [], (x) => +x.amt || 0);
  return t > 0 ? Math.round(t * 100) / 100 : null;
}

/* ---------------- Fitting: the Contract Schedule ---------------- */
export function schedTable(W) {
  const S = Object.entries(schedData().cells || {})
    .filter(([, x]) => String(x.job) == String(W.v.id))
    .map(([k, x]) => {
      const [d, who] = k.split('|');
      return { d, who: who == OTHER ? x.name || 'Other installer' : who, conf: x.conf, note: x.note || '' };
    })
    .sort((a, b) => a.d.localeCompare(b.d) || a.who.localeCompare(b.who));
  return String(
    html`<section class="abfensa sched-t"><h4>Contract Schedule <small class="muted">from the Fitting Schedule on Floor Boards</small></h4><div class="abgrid"><table class="plt"><thead><tr><th>Day</th><th>Installer</th><th>Booking</th><th>Note</th></tr></thead><tbody>${
      S.length
        ? S.map(
            (x) =>
              html`<tr><td>${new Date(x.d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td><td>${x.who}</td><td><span class="tag ${x.conf ? 'g' : ''}">${x.conf ? 'Confirmed' : 'Pencilled in'}</span></td><td>${x.note}</td></tr>`
          )
        : raw('<tr><td colspan="4" class="empty">No fitting days booked on the Fitting Schedule yet.</td></tr>')
    }</tbody></table></div></section>`
  );
}

/* ---------------- Deliveries: a table with its own toolbar ---------------- */
export function delTab(W) {
  const D = state.deliveries
    .filter((d) => d.contract == W.v.id)
    .sort((a, b) => String(a.due || '').localeCompare(String(b.due || '')));
  return String(
    html`<div class="abt" role="toolbar" aria-label="Deliveries">${tb('recDelivery', '+ New Delivery')}<span class="abt-n">${D.length} deliver${D.length == 1 ? 'y' : 'ies'} for this job</span></div><div class="abgrid"><table class="plt"><thead><tr><th>Ref</th><th>Supplier</th><th>Items</th><th>Due</th><th>Stage</th><th>Status</th></tr></thead><tbody>${
      D.length
        ? D.map(
            (d) =>
              html`<tr class="clk-r" ${raw(rowClick('editDel', d.id))}><td><b>${d.id}</b></td><td>${d.supplier || ''}</td><td>${d.items || ''}</td><td>${fd(d.due)}</td><td>${d.stage || ''}</td><td><span class="tag ${d.status == 'Received' ? 'g' : ''}">${d.status || 'Booked'}</span></td></tr>`
          )
        : raw('<tr><td colspan="6" class="empty">No deliveries linked to this contract number.</td></tr>')
    }</tbody></table></div>`
  );
}
