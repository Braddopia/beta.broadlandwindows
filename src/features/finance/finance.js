/* features/finance/finance: The Finance page: money owed, bills and payroll. */
import { onClick, rowClick } from '../../core/actions.js';
import { fd, iso, today } from '../../core/dates.js';
import { $, esc } from '../../core/dom.js';
import { m0, money, sum } from '../../core/format.js';
import { shortId } from '../../core/ids.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { staffName } from '../../domain/people.js';
import { can } from '../../domain/permissions.js';
import { need } from '../auth/session.js';
import { openContract } from '../contracts/contracts.js';
import { payOpen } from '../contracts/finance-step.js';
import { recTab } from '../records/record-window.js';
import { stTag } from '../../ui/components/tags.js';
import { form } from '../../ui/forms/form.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { uiState } from '../../ui/ui-state.js';

/* ==========================================================================
   13 · Finance (admin/finance) and Admin console (owner accounts)
   ========================================================================== */
export function vFinance() {
  if (!can('money')) return '<p class="empty">Finance is for administrators only.</p>';
  const td = today(),
    F = uiState.fin,
    deb = state.contracts.filter((c) => c.value - c.paid > 0),
    owed = sum(deb, (c) => c.value - c.paid),
    bills = state.fin.filter((b) => b.status == 'Unpaid'),
    n = new Date(),
    mo = new Date(n.getFullYear(), n.getMonth() + F.pm, 1),
    mk = iso(mo).slice(0, 7),
    pr = sum(state.staff, (x) => x.salary / 12),
    paid = state.pay[mk] || {},
    Own = can('manage');
  const K = [
    ['Owed by customers', m0(owed)],
    ['Bills to pay', m0(sum(bills, (b) => b.amount))],
    ['Overdue bills', bills.filter((b) => b.due < td).length],
    ['Monthly payroll', m0(pr)],
    ['Net outlook', m0(owed - sum(bills, (b) => b.amount) - pr)],
  ];
  const tabs = {
    debtors: `<div class="tw"><table><thead><tr><th>Contract</th><th>Customer</th><th class="c-sm">Stage</th><th class="n c-md">Value</th><th class="n c-md">Paid</th><th class="n">Balance</th><th class="ac"></th></tr></thead><tbody>${deb.map((c) => `<tr class="clk-r" ${rowClick('openContract', c.id)}><td><b>${esc(c.id)}</b></td><td>${esc(c.name)}</td><td class="c-sm">${stTag(c.stage)}</td><td class="n c-md">${m0(c.value)}</td><td class="n c-md">${m0(c.paid)}</td><td class="n"><b>${m0(c.value - c.paid)}</b></td><td class="ac"><div class="acts r"><button class="mini pri" ${onClick('addPay', c.id)}>Record payment</button>${c.email && SAFE.email(c.email) ? `<a class="mini" href="mailto:${esc(c.email)}?subject=${encodeURIComponent('Balance due on contract ' + c.id)}&amp;body=${encodeURIComponent('Hello ' + c.name + ', our records show ' + money(c.value - c.paid) + ' is outstanding on contract ' + c.id + '. Please let us know when payment will be made. Thank you, Broadland')}">Remind</a>` : ''}<button class="mini" ${onClick('openContract', c.id)}>Open</button></div></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Nobody owes you anything.</td></tr>'}</tbody></table></div>`,
    payables: `<div class="tw"><table><thead><tr><th>Payee</th><th class="c-md">Type</th><th class="c-sm">Ref</th><th class="c-md">Job</th><th>Due</th><th class="n">Amount</th><th>Status</th><th class="ac"></th></tr></thead><tbody>${
      state.fin
        .slice()
        .sort((a, b) => (a.status == 'Paid') - (b.status == 'Paid') || a.due.localeCompare(b.due))
        .map(
          (b) =>
            `<tr class="clk-r" ${rowClick('editBill', b.id)}><td><b>${esc(b.payee)}</b></td><td class="c-md">${esc(b.type)}</td><td class="c-sm">${esc(b.ref)}</td><td class="c-md">${esc(b.job || '-')}</td><td>${fd(b.due)}</td><td class="n">${money(b.amount)}</td><td><span class="tag ${b.status == 'Paid' ? 'g' : b.due < td ? 'r' : 'y'}">${b.status == 'Paid' ? 'Paid ' + fd(b.paidOn) : b.due < td ? 'Overdue' : 'Unpaid'}</span></td><td class="ac"><div class="acts r">${b.status == 'Unpaid' ? `<button class="mini pri" ${onClick('payBill', b.id)}>Mark paid</button>` : ''}<button class="mini" ${onClick('editBill', b.id)}>Edit</button><button class="mini del" ${onClick('del', 'fin', b.id)}>Delete</button></div></td></tr>`
        )
        .join('') || '<tr><td colspan="8" class="empty">No bills.</td></tr>'
    }</tbody></table></div>`,
    payroll: Own
      ? `<div class="tw"><table><thead><tr><th>Employee</th><th class="c-sm">Role</th><th class="n">Monthly gross</th><th>Status</th><th class="ac"></th></tr></thead><tbody>${state.staff.map((x) => `<tr><td><b>${esc(x.name)}</b></td><td class="c-sm">${esc(x.role)}</td><td class="n">${money(x.salary / 12)}</td><td><span class="tag ${paid[x.id] ? 'g' : 'y'}">${paid[x.id] ? 'Paid ' + fd(paid[x.id]) : 'Due'}</span></td><td class="ac"><button class="mini ${paid[x.id] ? '' : 'pri'}" ${onClick('payStaff', x.id, mk)}>${paid[x.id] ? 'Undo' : 'Mark paid'}</button></td></tr>`).join('')}</tbody></table></div><p class="muted">Gross pay only (annual salary / 12). Tax, NI and pension are not calculated here.</p>`
      : '<p class="empty">Payroll is visible to administrators only.</p>',
  };
  return `<div class="head"><h1>Finance</h1><div class="tools">${F.t == 'payables' ? '<button class="btn" data-act="editBill">New bill</button>' : ''}${F.t == 'payroll' && Own ? `<button class="btn" ${onClick('payAll', mk)}>Pay everyone</button>` : ''}</div></div>
  <div class="kpis">${K.map((k) => `<div class="kpi"><small>${k[0]}</small><b>${k[1]}</b></div>`).join('')}</div>
  <div class="chips">${[
    ['debtors', 'Money owed to us'],
    ['payables', 'Suppliers & job costs'],
    ['payroll', 'Employees'],
  ]
    .map(([k, t]) => `<button class="chip ${F.t == k ? 'on' : ''}" ${onClick('setUI', 'fin.t', k)}>${t}</button>`)
    .join(
      ''
    )}${F.t == 'payroll' ? `<span style="margin-left:auto;display:flex;gap:.4rem;align-items:center"><button class="mini" ${onClick('setUI', 'fin.pm', F.pm - 1)}>&lsaquo;</button><b>${mo.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</b><button class="mini" ${onClick('setUI', 'fin.pm', F.pm + 1)}>&rsaquo;</button></span>` : ''}</div>${tabs[F.t]}`;
}
/* 'Record payment' on Money owed to us: open the contract on its Finance step with the payment box ready */
export function addPay(id) {
  if (!need('money', 'Taking payments')) return;
  openContract(id);
  recTab('finance');
  setTimeout(() => {
    if ($('#finPay') && $('#finPay').hidden) payOpen();
  }, 80);
}
export function payBill(id) {
  if (!need('money', 'Paying bills')) return;
  const b = state.fin.find((x) => x.id == id);
  b.status = 'Paid';
  b.paidOn = today();
  audit('Bill paid', b.payee, money(b.amount) + ' ' + b.ref);
  store();
  render();
  toast('Marked as paid');
}
export function payStaff(id, mk) {
  if (!need('manage', 'Payroll')) return;
  state.pay[mk] = state.pay[mk] || {};
  if (state.pay[mk][id]) delete state.pay[mk][id];
  else state.pay[mk][id] = today();
  audit('Payroll updated', staffName(id), mk);
  store();
  render();
}
export function payAll(mk) {
  if (!need('manage', 'Payroll')) return;
  state.pay[mk] = state.pay[mk] || {};
  state.staff.forEach((x) => {
    state.pay[mk][x.id] = state.pay[mk][x.id] || today();
  });
  audit('Payroll paid', 'Everyone', mk);
  store();
  render();
  toast('Payroll marked as paid');
}
export function editBill(id) {
  if (!need('money', 'Bills')) return;
  const b = state.fin.find((x) => x.id == id);
  form(
    b ? 'Edit Bill' : 'New Bill',
    [
      { k: 'payee', l: 'Payee', w: 'full', req: 1 },
      { k: 'type', l: 'Type', t: 'select', o: ['Supplier', 'Job cost', 'Subcontractor', 'Utilities', 'Other'] },
      { k: 'ref', l: 'Invoice / reference', max: 60 },
      { k: 'job', l: 'Job / contract no.', max: 30 },
      { k: 'amount', l: 'Amount (£)', t: 'number', req: 1, pos: 1, max: 1e7 },
      { k: 'due', l: 'Due date', t: 'date', req: 1 },
    ],
    b || { type: 'Supplier', due: today() },
    (o) => {
      if (b) Object.assign(b, o);
      else state.fin.push({ id: shortId('B'), status: 'Unpaid', ...o });
      audit(b ? 'Bill edited' : 'Bill added', o.payee, money(o.amount));
    }
  );
}
