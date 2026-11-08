/* features/contracts/finance-step: The contract Finance step: balance, VAT and taking payments. */
import { company } from '../../config/company.js';
import { PAYK, PAYM } from '../../config/constants.js';
import { onClick } from '../../core/actions.js';
import { fd, today } from '../../core/dates.js';
import { $, esc } from '../../core/dom.js';
import { money } from '../../core/format.js';
import { ICONS, svg } from '../../core/icons.js';
import { SAFE } from '../../core/sanitize.js';
import { ISADM, need } from '../auth/session.js';
import { depPct } from './contracts.js';
import { byGroup, grpInit } from '../records/cards.js';
import { CFINF } from '../records/fields.js';
import { recRedraw, recordWin } from '../records/record-window.js';
import { fieldErr, readFields } from '../../ui/forms/form.js';
import { askIn } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

export function fitSync(c) {
  if (c && c.fitter && ![1, 2, 3, 4, 5, 6].some((i) => c['fitter' + i]))
    String(c.fitter)
      .split(/,\s*/)
      .slice(0, 6)
      .forEach((x, i) => (c['fitter' + (i + 1)] = x));
}
/* fitters 2 to 6 only appear once the one before is filled in */
export function fitReveal() {
  if (!recordWin || recordWin.kind != 'contract') return;
  for (let i = 2; i <= 6; i++) {
    const e = $('#f_fitter' + i),
      pv = $('#f_fitter' + (i - 1));
    if (!e) continue;
    const w = e.closest('.rf') || e,
      pw = pv && (pv.closest('.rf') || pv);
    const show = !!e.value || !!(pv && pv.value && !(pw && pw.hidden));
    if (w.hidden == show) {
      w.hidden = !show;
      if (show) {
        w.classList.remove('fin-in');
        void w.offsetWidth;
        w.classList.add('fin-in');
      }
    }
  }
}
export function finNums() {
  const g = (k) => {
      const e = $('#f_' + k);
      return e ? e.value : recordWin.v[k];
    },
    val = +g('value') || 0,
    paid = +g('paid') || 0,
    rate = +(g('vatRate') ?? company.vat ?? 20) || 0,
    dep = +g('deposit') || 0;
  const vat = Math.round((val - val / (1 + rate / 100)) * 100) / 100;
  return {
    val,
    paid,
    rate,
    vat,
    net: val - vat,
    bal: Math.round((val - paid) * 100) / 100,
    dep,
    depDue: g('depDue'),
    balDue: g('balDue'),
  };
}
export function finTab(W) {
  const P = W.v.pay || [],
    adm = ISADM();
  return `<div class="fin"><div class="fin-sum" id="finSum"></div>
   <div class="fin-pay" id="finPay" hidden></div>
   <section class="rg fin-list"><h4><span>Payments Received</span><small class="muted">${P.length} payment${P.length == 1 ? '' : 's'}</small></h4>
    ${P.map((p, i) => `<div class="row fin-row"><span><b>${money(p.amt)}</b> <span class="tag">${esc(p.kind || p.method)}</span><br><small class="muted">${fd(p.date)} · ${esc(p.method)}${p.ref ? ' · ' + esc(p.ref) : ''}${p.by ? ' · ' + esc(p.by) : ''}</small></span>${adm ? `<button type="button" class="mini del" ${onClick('recPayDel', i)} aria-label="Remove this payment">Remove</button>` : ''}</div>`).join('') || '<p class="empty">No payments yet. Press Make A Payment when money comes in.</p>'}
   </section>
   <div class="rcols">${byGroup(CFINF(), W.v)}</div></div>`;
}
export function finSum() {
  const el = $('#finSum');
  if (!el || !recordWin) return;
  const n = finNums(),
    pc = n.val ? Math.min(100, Math.round((100 * n.paid) / n.val)) : 0,
    adm = ISADM(),
    td = today();
  const depLeft = Math.max(0, n.dep - n.paid),
    late = (d) => d && d < td;
  const st = !n.val
    ? ['No contract value yet', '']
    : n.bal <= 0
      ? ['Paid in full', 'g']
      : late(n.balDue)
        ? ['Balance overdue', 'r']
        : depLeft > 0 && late(n.depDue)
          ? ['Deposit overdue', 'r']
          : depLeft > 0
            ? ['Deposit to collect', 'y']
            : ['Balance to collect', 'y'];
  const h = `<div class="fin-top"><div class="fin-big"><small>Outstanding Balance</small><b>${money(Math.max(0, n.bal))}</b><span class="tag ${st[1]}">${esc(st[0])}</span></div>
   <div class="fin-act"><button type="button" class="btn green fin-pb" ${adm ? onClick('payOpen') : 'disabled title="Only administrators can take payments"'}>${svg(adm ? ICONS.plus : ICONS.lock)}Make A Payment</button>${recordWin.isNew ? '' : `<button type="button" class="btn ghost" ${onClick('invoicePrint', recordWin.id)}>${svg(ICONS.reports)}Print Invoice</button>`}</div></div>
   <div class="fin-bar" role="progressbar" aria-valuenow="${pc}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pc}%"></i></div><small class="muted">${money(n.paid)} paid of ${money(n.val)} (${pc}%)</small>
   <dl class="fin-g"><div><dt>Contract Value</dt><dd>${money(n.val)}</dd></div><div><dt>VAT At ${n.rate}%</dt><dd>${money(n.vat)}</dd></div><div><dt>Before VAT</dt><dd>${money(n.net)}</dd></div>
    <div><dt>Deposit</dt><dd>${n.dep ? money(n.dep) + (depLeft > 0 ? '' : ' ✓') : n.val && depPct(recordWin.v) ? `<span class="muted">${money(Math.round(n.val * depPct(recordWin.v)) / 100)} (${depPct(recordWin.v)}%)</span>` : '-'}${n.depDue ? `<small>by ${fd(n.depDue)}</small>` : ''}</dd></div><div><dt>Balance Due</dt><dd>${n.balDue ? fd(n.balDue) : '-'}</dd></div></dl>`;
  if (el.dataset.h !== h) {
    el.dataset.h = h;
    el.innerHTML = h;
  }
}
export function payOpen() {
  if (!need(ISADM, 'Taking payments')) return;
  const el = $('#finPay');
  if (!el) return;
  if (!el.hidden) {
    el.hidden = true;
    return;
  }
  const n = finNums(),
    depLeft = Math.max(0, n.dep - n.paid);
  const q = (l, v) =>
    v > 0 ? `<button type="button" class="td-i" ${onClick('payFill', v)}>${esc(l)} ${money(v)}</button>` : '';
  el.innerHTML = `<h4>Make A Payment</h4><div class="fin-q">${q('Whole balance', n.bal)}${q('Deposit', depLeft)}${!n.dep && depPct(recordWin.v) ? q(depPct(recordWin.v) + '% deposit', Math.round(n.val * depPct(recordWin.v)) / 100) : ''}</div>
   <div class="fin-f"><label class="rf"><span>Amount (£) *</span><input id="ra_amt" type="number" step="any" min="0" inputmode="decimal" placeholder="0.00"></label>
    <label class="rf"><span>Date</span><input id="ra_date" type="date" value="${today()}"></label>
    <label class="rf"><span>Paid by</span><select id="ra_method">${PAYM.map((x) => `<option>${x}</option>`).join('')}</select></label>
    <label class="rf"><span>What for</span><select id="ra_kind">${PAYK.map((x) => `<option${x == (n.paid ? 'Stage payment' : 'Deposit') ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
    <label class="rf full"><span>Reference (optional)</span><input id="ra_ref" maxlength="60" placeholder="Card receipt, cheque number..."></label></div>
   <div class="fin-b"><button type="button" class="btn ghost" data-act="payOpen">Cancel</button><button type="button" class="btn green" data-act="recPay">${svg('M5 12l5 5L20 7')}Record Payment</button></div>`;
  el.hidden = false;
  el.classList.remove('fin-in');
  void el.offsetWidth;
  el.classList.add('fin-in');
  setTimeout(() => {
    const a = $('#ra_amt');
    if (!a) return;
    a.focus();
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, 40);
}
export function finRe() {
  const P = $('#mbox .rw-p.on');
  if (P) {
    delete P.dataset.ginit;
    grpInit(P);
  }
  finSum();
}
export function payFill(v) {
  const e = $('#ra_amt');
  if (e) {
    e.value = v;
    e.classList.remove('flash');
    void e.offsetWidth;
    e.classList.add('flash');
  }
}
export function finKeep() {
  const cur = readFields(CFINF());
  if (!cur) return false;
  Object.assign(recordWin.v, cur);
  return true;
}
export function recPay() {
  if (!need(ISADM, 'Recording payments')) return;
  const e = $('#ra_amt'),
    amt = SAFE.num(e.value, { max: 1e7 });
  if (!(amt > 0)) {
    fieldErr(e, 'Type the amount paid');
    return;
  }
  if (!finKeep()) return;
  const n = finNums();
  if (amt > n.bal + 0.005 && n.val > 0 && !recPay.ok) {
    askIn(
      'That is more than the balance',
      'The balance is ' + money(n.bal) + '. Record ' + money(amt) + ' anyway?',
      'Record It',
      () => {
        recPay.ok = 1;
        recPay();
      }
    );
    return;
  }
  recPay.ok = 0;
  recordWin.v.pay = recordWin.v.pay || [];
  recordWin.v.pay.push({
    amt,
    date: SAFE.date($('#ra_date').value) || today(),
    method: PAYM.includes($('#ra_method').value) ? $('#ra_method').value : 'Other',
    kind: PAYK.includes($('#ra_kind').value) ? $('#ra_kind').value : 'Other',
    ref: SAFE.text($('#ra_ref').value, 60),
    by: USER,
  });
  recordWin.v.paid = Math.round(((+recordWin.v.paid || 0) + amt) * 100) / 100;
  recordWin.dirty = 1;
  recRedraw('finance');
  finRe();
  const b = $('#finSum .fin-big');
  if (b) b.classList.add('pop');
  toast(money(amt) + ' payment added. Press Save to keep it.');
}
export function recPayDel(i) {
  if (!need(ISADM, 'Removing payments')) return;
  const p = (recordWin.v.pay || [])[i];
  if (!p) return;
  askIn('Remove this payment?', money(p.amt) + ' from ' + fd(p.date) + '.', 'Remove', () => recPayGo(i), true);
}
export function recPayGo(i) {
  const p = (recordWin.v.pay || [])[i];
  if (!p || !finKeep()) return;
  recordWin.v.pay.splice(i, 1);
  recordWin.v.paid = Math.max(0, Math.round(((+recordWin.v.paid || 0) - p.amt) * 100) / 100);
  recordWin.dirty = 1;
  recRedraw('finance');
  finRe();
  toast('Payment removed. Press Save to keep the change.');
}
