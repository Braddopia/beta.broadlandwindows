/* features/contracts/contract-reports: the Contract Reports window (v19.18), like the old system's: a list of report
   names on the left and a large preview of the one picked on the right, with Back, Email, Print, Sign, Preview,
   Customise and Edit List along the top. It opens over the contract window (Reports on its toolbar).
   Reports the CRM can draw are previewed straight away; a few open their own form first (the guarantee); the rest
   are listed as "Coming soon" until they are built. Which reports show is chosen with Edit List (administrators). */
import { company } from '../../data/company.js';
import { onClick, onEvent } from '../../core/actions.js';
import { fdl } from '../../core/dates.js';
import { $, $$ } from '../../core/dom.js';
import { html, raw } from '../../core/html.js';
import { money, sum } from '../../core/format.js';
import { svg } from '../../core/icons.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { CK } from '../../domain/checklists.js';
import { addrOf, mailOf, siteOf } from '../../domain/customers.js';
import { recTitle } from '../../domain/job-title.js';
import { can } from '../../domain/permissions.js';
import { need } from '../auth/session.js';
import { docOpen } from '../documents/documents.js';
import { docBuilder } from '../settings/doc-builder.js';
import { recordWin } from '../records/record-window.js';
import { invoicePrint, reportContract, reportCust, reportJob } from './documents.js';
import { captureDoc, printDoc } from '../../print/print.js';
import { toast } from '../../ui/toast.js';

/* ---- reports the old system had that the CRM did not: drawn in the CRM's own print style ---- */
const cust = (c) => ({ name: [c.title, c.name].filter(Boolean).join(' '), address: addrOf(c) });
const payRows = (c) => (c.pay || []).map((p) => [fdl(p.date), p.method || '', p.kind || '', money(p.amt)]);
export function reminderDoc(c) {
  const bal = (+c.value || 0) - (+c.paid || 0);
  printDoc(
    recTitle(c),
    'Payment reminder',
    [
      ['Contract', c.id],
      ['Work', c.product],
      ['Installation address', siteOf(c) || addrOf(c)],
    ],
    [],
    {
      customer: cust(c),
      kind: 'Payment reminder',
      ref: c.id,
      kpis: [
        ['Contract value', money(c.value)],
        ['Paid so far', money(c.paid)],
        ['Balance due', money(Math.max(0, bal))],
      ],
      money: { total: c.value, paid: c.paid },
      thanks:
        bal > 0
          ? 'Our records show a balance of ' +
            money(bal) +
            ' on this contract. If you have already paid, thank you, and please ignore this reminder. If not, please pay' +
            (company.terms ? ' within ' + company.terms + ' days' : ' at your earliest convenience') +
            ', quoting ' +
            c.id +
            '. '
          : 'This contract is paid in full. Thank you. ',
    }
  );
}
export function statementDoc(c) {
  const P = c.pay || [];
  printDoc(
    recTitle(c),
    'Contract statement',
    [
      ['Contract date', c.cdate ? fdl(c.cdate) : ''],
      ['Work', c.product],
    ],
    [],
    {
      customer: cust(c),
      kind: 'Contract statement',
      ref: c.id,
      kpis: [
        ['Contract value', money(c.value)],
        ['Paid', money(c.paid)],
        ['Balance', money(Math.max(0, (+c.value || 0) - (+c.paid || 0)))],
      ],
      money: { total: c.value, paid: c.paid },
      tables: [
        {
          t: 'Payments',
          h: ['Date', 'Paid by', 'What for', 'Amount'],
          r: payRows(c).length ? payRows(c) : [['', '', 'No payments yet', '']],
          foot: ['', '', 'Total paid', money(sum(P, (p) => p.amt))],
        },
      ],
    }
  );
}
export function receiptDoc(c) {
  const P = c.pay || [],
    last = P[P.length - 1];
  printDoc(
    recTitle(c),
    'Receipt',
    [
      ['Contract', c.id],
      ['Work', c.product],
    ],
    [],
    {
      customer: cust(c),
      kind: 'Receipt',
      ref: c.id + (P.length ? '-' + P.length : ''),
      kpis: last
        ? [
            ['Received', money(last.amt)],
            ['On', fdl(last.date)],
            ['Balance now', money(Math.max(0, (+c.value || 0) - (+c.paid || 0)))],
          ]
        : [['Paid so far', money(c.paid)]],
      tables: P.length ? [{ t: 'Payments received', h: ['Date', 'Paid by', 'What for', 'Amount'], r: payRows(c) }] : [],
      thanks: 'Thank you for your payment. ',
    }
  );
}
export function orderChecklistDoc(c) {
  const C = c.chk || {},
    T = c.chkAt || {};
  printDoc(
    recTitle(c),
    c.product || '',
    [
      ['Stage', c.stage],
      ['Fitting', c.fit ? fdl(c.fit) : 'Not booked'],
    ],
    [],
    {
      kind: 'Order checklist',
      ref: c.id,
      tables: [
        {
          t: 'Checklist',
          h: ['Step', 'Done', 'By', 'On'],
          r: CK.map((k) => [k, C[k] ? '☑' : '☐', (T[k] || {}).by || '', T[k] ? fdl(T[k].d) : '']),
        },
        ...((c.lines || []).length
          ? [
              {
                t: 'Products',
                h: ['Code', 'Product', 'Qty', 'Location'],
                r: c.lines.map((x) => [x.code, x.name, x.qty, x.loc]),
              },
            ]
          : []),
      ],
      sign: true,
      barcode: c.id,
    }
  );
}
function guarantee(c, years) {
  docOpen('guarantee', 'c:' + String(c.id).replace(/[^\w-]/g, ''));
  const y = $('#dy');
  if (y) y.value = years;
}

/** every report: n = name; draw(c) prints it (previewed by drawing it into the pane); form(c) opens its own form
    first; soon = not built yet; doc = its name in Settings, Printed Documents (for Customise) */
export const CONTRACT_REPORTS = [
  { n: 'Customer Contract Record', draw: (c) => reportContract(c.id, 'c'), doc: 'Contract summary' },
  { n: 'Invoice Reminder', draw: reminderDoc, doc: 'Payment reminder' },
  {
    n: '10 Year Completion Documents',
    form: (c) => guarantee(c, 10),
    d: 'The guarantee certificate, filled in with this customer, their address, the contract number and the date. It opens its form first so the dates and terms can be checked.',
  },
  {
    n: '5 Year Completion Documents',
    form: (c) => guarantee(c, 5),
    d: 'The guarantee certificate for 5 years. It opens its form first so the dates and terms can be checked.',
  },
  { n: '10 Year Completion Documents Conservatory', soon: 1 },
  { n: 'Domestic Aluminium Checklist', soon: 1 },
  { n: 'Quality Plan', soon: 1 },
  { n: 'Contract Statement', draw: statementDoc, doc: 'Contract statement' },
  { n: 'Order Acknowledgement Letter', soon: 1 },
  { n: 'Order Checklist', draw: orderChecklistDoc, doc: 'Order checklist' },
  { n: 'Receipt', draw: receiptDoc, doc: 'Receipt' },
  { n: 'Sales Invoice', draw: (c) => invoicePrint(c.id), doc: 'Invoice' },
  { n: 'Standing Order Letter', soon: 1 },
  { n: 'Credit Control Letter 14 Days', soon: 1 },
  /* the CRM's own */
  { n: 'Contract Sheet (Internal)', draw: (c) => reportContract(c.id, 'i'), doc: 'Contract sheet' },
  { n: 'Fitting Job Sheet', draw: (c) => reportJob(c.id), doc: 'Fitting job sheet' },
  { n: 'Customer Details', draw: (c) => reportCust('contract', c.id), doc: 'Customer details' },
];
const R = { pick: 0, edit: false };
const hidden = () => new Set(state.rptHide || []);
const shown = () => CONTRACT_REPORTS.filter((r) => !hidden().has(r.n));
const con = () => recordWin && state.contracts.find((x) => x.id == recordWin.id);
const picked = () => CONTRACT_REPORTS.find((r) => r.n == R.pick) || shown()[0] || CONTRACT_REPORTS[0];

/** open the Reports window over the contract */
export function crOpen() {
  const c = con();
  if (!c) return toast('Save the contract first');
  R.edit = false;
  if (!shown().some((r) => r.n == R.pick)) R.pick = (shown()[0] || CONTRACT_REPORTS[0]).n;
  let el = $('#crWin');
  if (!el) {
    $('#mbox .rw').insertAdjacentHTML(
      'beforeend',
      '<div class="ab-rep" id="crWin" role="dialog" aria-label="Contract Reports"></div>'
    );
    el = $('#crWin');
  }
  crDraw();
  const b = $('#crWin .cr-l button.on');
  if (b) b.focus({ preventScroll: true });
}
const tb = (act, label, icon, dis, title) =>
  html`<button type="button" class="rb1" data-act="${act}"${dis ? raw(' disabled') : ''}${title ? html` title="${title}"` : ''}>${raw(svg(icon))}${label}</button>`;
export function crDraw() {
  const el = $('#crWin'),
    c = con();
  if (!el || !c) return;
  const r = picked(),
    H = hidden(),
    L = R.edit ? CONTRACT_REPORTS : shown(),
    ready = !!r.draw;
  el.innerHTML =
    String(html`<div class="rw-bar cr-bar">${tb('crBack', 'Back', 'M15 6l-6 6 6 6')}<i class="rw-div"></i>${tb('crEmail', 'Email', 'M4 6h16v12H4zM4 7l8 6 8-6', !ready && !r.form)}${tb('crPrint', 'Print', 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z', r.soon)}${tb('crSign', 'Sign', 'M3 17c3-1 4-6 6-6s1 5 3 5 2-3 4-3 3 2 5 2M3 21h18', true, 'Signing on screen is coming soon')}${tb('crPreview', 'Preview', 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z', r.soon)}${tb('crCustom', 'Customise', 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4', !r.doc)}${tb('crEdit', R.edit ? 'Done' : 'Edit List', 'M4 20h4L19 9l-4-4L4 16v4z')}<span class="rw-sp"></span><b class="cr-t">Contract Reports · ${recTitle(c)}</b></div>
  <div class="cr-x"><nav class="cr-l" aria-label="Report name"><p class="cr-h">Report Name</p>${L.map((x) =>
    R.edit
      ? html`<label class="cr-i ed"><input type="checkbox" ${raw(H.has(x.n) ? '' : 'checked')} ${raw(onEvent('onchange', 'crShow', x.n, 'this.checked'))}><span>${x.n}</span></label>`
      : html`<button type="button" class="cr-i ${x.n == r.n ? 'on' : ''} ${x.soon ? 'soon' : ''}" aria-current="${String(x.n == r.n)}" ${raw(onClick('crPick', x.n))}><span>${x.n}</span>${x.soon ? html`<small>Coming soon</small>` : ''}</button>`
  )}</nav><div class="cr-p" id="crPrev"></div></div>
  <p class="cr-f">Need a change to a report? Ask an administrator. ${R.edit ? 'Untick a report to hide it from this list for everyone.' : ''}</p>`);
  crPreviewDraw();
}
function crPreviewDraw() {
  const P = $('#crPrev'),
    c = con(),
    r = picked();
  if (!P || !c) return;
  if (r.draw) {
    const doc = captureDoc(() => r.draw(c));
    P.innerHTML = '<iframe class="cr-fr" title="Preview"></iframe>';
    P.querySelector('iframe').srcdoc = doc || '<p>Nothing to show.</p>';
    return;
  }
  P.innerHTML = String(
    html`<div class="cr-card">${raw(svg('M6 3h9l4 4v14H6zM14 3v5h5'))}<h3>${r.n}</h3><p>${r.soon ? 'This report is coming soon. Tell an administrator what it should show and it can be built in the same style as the others.' : r.d || ''}</p>${r.form ? html`<button type="button" class="btn" data-act="crPreview">Open The Form</button>` : ''}</div>`
  );
}
export function crPick(n) {
  R.pick = n;
  $$('#crWin .cr-l .cr-i').forEach((b) => {
    const on = b.querySelector('span').textContent == n;
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on);
  });
  crDraw();
  const b = $('#crWin .cr-l button.on');
  if (b) b.focus({ preventScroll: true });
}
export function crBack() {
  const el = $('#crWin');
  if (el) el.remove();
}
/** Print: the preview prints as it is; a report with its own form opens the form */
export function crPrint() {
  const r = picked(),
    c = con();
  if (!c || r.soon) return;
  if (r.form) return r.form(c);
  const f = $('#crPrev iframe');
  try {
    f.contentWindow.focus();
    f.contentWindow.print();
    if (r.n == 'Sales Invoice') audit('Invoice printed', c.id, c.invoiceNo || '');
  } catch (e) {
    r.draw(c);
  }
}
/** Preview: the report in its own window, full size (with its own Print and Close) */
export function crPreview() {
  const r = picked(),
    c = con();
  if (!c || r.soon) return;
  if (r.form) return r.form(c);
  r.draw(c);
}
/** Email: a new email to the customer, ready for the report saved as a PDF to be attached */
export function crEmail() {
  const r = picked(),
    c = con();
  if (!c) return;
  const to = mailOf(c);
  if (!to) return toast('This customer has no email address yet');
  const a = document.createElement('a');
  a.href =
    'mailto:' +
    encodeURIComponent(to) +
    '?subject=' +
    encodeURIComponent(r.n + ', contract ' + c.id) +
    '&body=' +
    encodeURIComponent(
      'Dear ' +
        ([c.title, c.name].filter(Boolean).join(' ') || 'customer') +
        ',\n\nPlease find your ' +
        r.n.toLowerCase() +
        ' attached.\n\nKind regards,\n' +
        company.name
    );
  a.click();
  toast('Email started. Print the report as a PDF and attach it.');
}
export function crSign() {
  toast('Signing on screen is coming soon');
}
export function crCustom() {
  const r = picked();
  if (!r.doc) return;
  docBuilder(r.doc);
}
export function crEdit() {
  if (!R.edit && !need('manage', 'Changing the report list')) return;
  R.edit = !R.edit;
  crDraw();
}
/** show or hide a report in the list, for everyone */
export function crShow(n, on) {
  if (!can('manage')) return;
  const H = hidden();
  if (on) H.delete(n);
  else H.add(n);
  state.rptHide = [...H].filter((x) => CONTRACT_REPORTS.some((r) => r.n == x));
  store();
  audit(on ? 'Report shown' : 'Report hidden', 'Contract Reports', n);
}
