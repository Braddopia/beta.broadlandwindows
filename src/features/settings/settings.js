/* features/settings/settings: The Settings page. */
import { docCard } from './doc-builder.js';
import { company } from '../../data/company.js';
import { ROLES } from '../../config/roles.js';
import { onClick, onEvent } from '../../core/actions.js';
import { today } from '../../core/dates.js';
import { esc } from '../../core/dom.js';
import { csvDownload } from '../../ui/download.js';
import { ICONS, svg } from '../../core/icons.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { phRefs, phTidy } from '../../data/photos.js';
import { state } from '../../data/state.js';
import { mailOf, telOf } from '../../domain/customers.js';
import { dAuto } from '../../domain/deliveries.js';
import { numNext } from '../../domain/numbering.js';
import { products, unitOf } from '../../domain/stock.js';
import { ROLE } from '../../data/session.js';
import { can } from '../../domain/permissions.js';
import { need } from '../auth/session.js';
import { leadCsv } from '../leads/leads.js';
import { form } from '../../ui/forms/form.js';
import { lookPop } from '../../ui/shell/looks.js';
import { render } from '../../ui/shell/router.js';
import { setTh } from '../../ui/shell/theme.js';
import { toast } from '../../ui/toast.js';

/* ==========================================================================
   20 · Settings: my settings (everyone) and company settings (administrators)
   Company details live in S.co and are copied over the CO defaults at start-up,
   so printed documents, invoices and VAT sums all use them.
   ========================================================================== */
export const SET_CO = [
  { k: 'name', l: 'Business name', req: 1, w: 'full', max: 120 },
  { k: 'addr', l: 'Business address', w: 'full', max: 200 },
  { k: 'hours', l: 'Opening hours', w: 'full', max: 160, hint: 'For example: Mon to Fri 9am to 5pm, Sat 10am to 2pm' },
  { k: 'tel', l: 'Main phone', t: 'tel', max: 30 },
  { k: 'web', l: 'Website', max: 120 },
  { k: 'em', l: 'Sales email', t: 'email', max: 120 },
  { k: 'em2', l: 'Second email', t: 'email', max: 120 },
  { k: 'vatNo', l: 'VAT number', max: 30 },
  { k: 'coNo', l: 'Company number', max: 30 },
  { k: 'fensa', l: 'FENSA number', max: 30 },
];
export const SET_MONEY = [
  { k: 'vat', l: 'VAT rate for new contracts (%)', t: 'select', o: ['20', '5', '0'], show: (v) => v + '%' },
  { k: 'depRes', l: 'Deposit for home jobs (% of contract)', t: 'number', max: 100, dp: 0, show: (v) => v + '%' },
  {
    k: 'depCom',
    l: 'Deposit for commercial jobs (% of contract)',
    t: 'number',
    max: 100,
    dp: 0,
    show: (v) => v + '%',
  },
  {
    k: 'terms',
    l: 'Balance due (days after fitting)',
    t: 'number',
    max: 365,
    dp: 0,
    show: (v) => v + ' day' + (v == 1 ? '' : 's') + ' after fitting',
  },
  { k: 'invPrefix', l: 'Invoice number starts with', max: 12 },
  { k: 'bank', l: 'Bank account name', max: 80, w: 'full' },
  { k: 'sort', l: 'Sort code', max: 12 },
  { k: 'acct', l: 'Account number', max: 12 },
];
export function coEdit(title, F) {
  if (!need('manage', 'Company settings')) return;
  form(title, F, { ...company }, (o) => {
    Object.keys(o).forEach((k) => {
      if (typeof o[k] == 'string') o[k] = SAFE.text(o[k], 200);
    });
    state.co = Object.assign(state.co || {}, o);
    Object.assign(company, o);
    audit('Company settings changed', title, F.map((f) => f.l.replace(/ \(.*\)/, '')).join(', '));
    toast(title + ' saved');
  });
}
export function motionSet(on) {
  try {
    localStorage.setItem('bb_rm', on ? '1' : '');
  } catch (e) {}
  document.body.classList.toggle('rm', !!on);
}
export function vSettings() {
  const own = can('manage'),
    p = state.profile || {},
    dark = document.body.dataset.theme == 'dark',
    rm = document.body.classList.contains('rm');
  const row = (t, s, act) =>
    `<div class="set-r"><span><b>${esc(t)}</b>${s ? `<small>${s}</small>` : ''}</span><span class="set-a">${act}</span></div>`;
  /* only what is filled in is shown; the rest is named once underneath so it can be added */
  const dl = (F) => {
    const has = (f) => String(company[f.k] ?? '').trim() !== '',
      shown = F.filter(has),
      empty = F.filter((f) => !has(f)),
      lab = (f) => f.l.replace(/ \(.*\)/, '');
    return `<dl class="set-dl">${shown.map((f) => `<div class="${f.w == 'full' ? 'full' : ''}"><dt>${esc(lab(f))}</dt><dd class="${/em|web/.test(f.k) ? 'nocap' : ''}">${esc(f.show ? f.show(company[f.k]) : String(company[f.k]))}</dd></div>`).join('')}</dl>${empty.length ? `<p class="muted set-n">Not filled in yet: ${esc(empty.map(lab).join(', '))}</p>` : ''}`;
  };
  return `<div class="head"><h1>Settings</h1></div>
  <div class="set">
   <section class="panel set-c"><h2><span class="set-ic">${svg(ICONS.user)}</span><span>My Settings</span></h2>
    ${row('My Details', esc([p.name, p.phone || p.mobile].filter(Boolean).join(' · ')) || 'Name and phone', '<button class="btn ghost sm" data-act="editProfile">Edit</button>')}
    ${row('Light Or Dark', 'How the site looks for you', `<span class="seg"><button class="${dark ? '' : 'on'}" ${onClick('setThR', 'light')}>Light</button><button class="${dark ? 'on' : ''}" ${onClick('setThR', 'dark')}>Dark</button></span>`)}
    ${row('Page Background And Greeting Box', 'Patterns and colours', '<button class="btn ghost sm" data-act="lookOpen" data-stop="1">Change</button>')}
    ${row('Fewer Animations', 'Turns off movement and glow effects', `<label class="tsw"><input type="checkbox" ${rm ? 'checked' : ''} ${onEvent('onchange', 'motionSet', 'this.checked')}><span></span></label>`)}
    ${row('Help Tour', 'A short guide to the site', '<button class="btn ghost sm" data-act="startTour">Start</button>')}
    ${row('Report A Problem', 'Something not working or looking wrong? Tell us here', '<button class="btn sm" data-act="bugReport">Report</button>')}
    ${row('Account', 'Signed in as ' + esc(ROLES[ROLE].n), '<button class="btn ghost sm" data-act="swRole">Switch</button>')}
   </section>
   ${
     own
       ? `<section class="panel set-c"><h2><span class="set-ic">${svg(ICONS.contacts)}</span><span>Company Details</span><button class="btn sm" ${onClick('coEditK', 'co')}>Edit</button></h2>${dl(SET_CO)}<p class="muted set-n">Used on printed contracts, invoices and guarantees.</p></section>
   <section class="panel set-c"><h2><span class="set-ic">${svg(ICONS.finance)}</span><span>Money And Invoices</span><button class="btn sm" ${onClick('coEditK', 'money')}>Edit</button></h2>${dl(SET_MONEY)}</section>
   <section class="panel set-c"><h2><span class="set-ic">${svg(ICONS.admin)}</span><span>Security And Data</span></h2>
    ${row('Account PINs', 'Change the PIN for each account', '<button class="btn ghost sm" data-act="chPin">Change</button>')}
    ${row('Backup', 'Download everything as one file', '<button class="btn ghost sm" data-act="backupDl">Download</button>')}
    ${row('Restore', 'Load a backup file', '<label class="btn ghost sm" style="cursor:pointer">Choose File<input type="file" accept=".json,application/json" hidden data-onchange="backupLoad" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]"></label>')}
    ${row('Review Scores', 'Google, Trustpilot, Trusted Trader, ReferenceLine', '<button class="btn ghost sm" data-act="editRatings">Update</button>')}
    ${row('Admin Console', 'Approvals, audit trail and more', `<button class="btn ghost sm" ${onClick('go', 'admin')}>Open</button>`)}
    ${row('Photo Storage', `${phRefs().length} photos kept in their own store, so years of jobs stay quick`, '<button class="btn ghost sm" data-act="phTidyGo">Tidy Up</button>')}
   </section>
   <section class="panel set-c"><h2><span class="set-ic">${svg(ICONS.contracts)}</span><span>Numbering</span><button class="btn sm" data-act="numEdit">Change</button></h2>
    ${NUMS.map(([k, n]) => row(n, 'Next one will be <b class="nocap">' + esc(numNext(k)) + '</b>' + (state.num[k] ? ' (set by hand)' : ' (automatic)'), state.num[k] ? `<button class="btn ghost sm" ${onClick('numReset', k)}>Reset</button>` : '')).join('')}
   </section>
   ${docCard()}
   <section class="panel set-c"><h2><span class="set-ic">${svg(ICONS.reports)}</span><span>Export Data</span></h2>
    ${[
      ['leads', 'Leads'],
      ['contracts', 'Contracts'],
      ['calls', 'Service Calls'],
      ['deliveries', 'Deliveries'],
      ['contacts', 'Contact Book'],
      ['stock', 'Stock'],
    ]
      .map(([k, n]) =>
        row(
          n,
          'Spreadsheet (CSV) of every record',
          `<button class="btn ghost sm" ${onClick('csvAll', k)}>Export</button>`
        )
      )
      .join('')}
    ${row('Everything', 'One backup file with all data and photos', '<button class="btn ghost sm" data-act="backupDl">Download</button>')}
   </section>
   <section class="panel set-c set-w"><h2><span class="set-ic">${svg(ICONS.service)}</span><span>Reported Problems</span>${state.bugs.length ? `<button class="btn ghost sm" ${onClick('csvAll', 'bugs')}>Export</button>` : ''}</h2>
    ${state.bugs.map((b) => `<div class="set-r"><span><b>${esc(b.what.length > 90 ? b.what.slice(0, 90) + '…' : b.what)}</b><small>${esc([b.id, b.where, b.sev, b.by, new Date(b.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })].filter(Boolean).join(' · '))}${(b.photos || []).length ? ' · ' + (b.photos || []).length + ' photo' + ((b.photos || []).length > 1 ? 's' : '') : ''}</small></span><span class="set-a"><span class="tag ${b.status == 'Fixed' ? 'g' : b.status == 'Open' ? 'y' : 'n'}">${esc(b.status)}</span><button class="btn ghost sm" ${onClick('bugView', b.id)}>Open</button></span></div>`).join('') || '<p class="muted">Nothing reported. Everyone can report a problem from My Settings.</p>'}
   </section>`
       : `<section class="panel set-c"><h2><span class="set-ic">${svg(ICONS.lock)}</span><span>Company Settings</span></h2><p class="muted">Company details, VAT and invoice settings are for administrators.</p><button class="btn ghost sm" data-act="swRole">Switch Account</button></section>`
   }
  </div>`;
}
/* ---- numbering: set where new leads, contracts and service calls start from ---- */
export const NUMS = [
  ['lead', 'Lead numbers'],
  ['contract', 'Contract numbers'],
  ['call', 'Service call numbers'],
];
export function numEdit() {
  if (!need('manage', 'Numbering')) return;
  form(
    'Numbering',
    [
      {
        k: 'lead',
        l: 'Next lead number',
        t: 'number',
        max: 9999,
        dp: 0,
        hint: 'e.g. 50 gives L0050. Leave at 0 for automatic',
      },
      {
        k: 'contract',
        l: 'Next contract number',
        t: 'number',
        max: 9999999,
        dp: 0,
        hint: 'e.g. 2500001. Leave at 0 for automatic',
      },
      {
        k: 'call',
        l: 'Next service call number',
        t: 'number',
        max: 9999,
        dp: 0,
        hint: 'e.g. 1000 gives S-1000. Leave at 0 for automatic',
      },
    ],
    { ...state.num },
    (o) => {
      const u = state.num;
      ['lead', 'contract', 'call'].forEach((k) => {
        if (+o[k] > 0) u[k] = +o[k];
        else delete u[k];
      });
      audit('Numbering changed', 'Settings', NUMS.map(([k, n]) => n + ': ' + (u[k] || 'auto')).join(', '));
    }
  );
}
export function numReset(k) {
  if (!need('manage', 'Numbering')) return;
  delete state.num[k];
  audit('Numbering reset', k, '');
  store();
  render();
  toast('Back to automatic numbering');
}
export function phTidyGo() {
  if (!need('manage', 'Photo storage')) return;
  phTidy().then((n) => {
    toast(n ? n + ' unused photo' + (n > 1 ? 's' : '') + ' removed' : 'Nothing to tidy');
    render(true);
  });
}
/* ---- export any list as a spreadsheet ---- */
export function csvAll(k) {
  if (!need('manage', 'Exporting data')) return;
  const d = today();
  const T = {
    leads: () => {
      leadCsv();
      return null;
    },
    contracts: () => [
      [
        'Contract',
        'Date',
        'Customer',
        'Phone',
        'Email',
        'Address',
        'Town',
        'Postcode',
        'Type',
        'Stage',
        'Value',
        'Paid',
        'Balance',
        'Sold by',
        'Fit date',
        'Fitters',
      ],
      ...state.contracts.map((c) => [
        c.id,
        c.cdate || '',
        c.name,
        telOf(c),
        mailOf(c),
        c.homeAddr || c.address || '',
        c.town || '',
        c.homePc || '',
        c.contractType || '',
        c.stage || '',
        +c.value || 0,
        +c.paid || 0,
        (+c.value || 0) - (+c.paid || 0),
        c.soldBy || '',
        c.fit || '',
        c.fitter || '',
      ]),
    ],
    calls: () => [
      [
        'Ref',
        'Taken',
        'Taken by',
        'Customer',
        'Phone',
        'Town',
        'Contract',
        'Problem',
        'Type',
        'Priority',
        'Status',
        'Visit',
        'Engineer',
        'Completed',
        'Work done',
      ],
      ...state.calls.map((c) => [
        c.id,
        c.takenAt || '',
        c.takenBy || '',
        c.name,
        c.phone || '',
        c.town || '',
        c.contract || '',
        c.issue,
        c.cat || '',
        c.priority,
        c.status,
        c.visit || '',
        c.fitter || '',
        c.doneAt || '',
        c.notes || '',
      ]),
    ],
    deliveries: () => [
      ['Supplier', 'Items', 'Due', 'Status', 'Job', 'Received', 'Checked by', 'QC', 'Damaged', 'Damage'],
      ...state.deliveries.map((x) => [
        x.supplier,
        x.items,
        x.due,
        dAuto(x),
        x.contract || '',
        x.recvDate || '',
        x.checkedBy || '',
        x.qc || '',
        x.damaged || '',
        x.damage || '',
      ]),
    ],
    contacts: () => [
      ['Company', 'Name', 'Type', 'Job title', 'Phone', 'Email', 'Address', 'Town', 'Postcode'],
      ...state.contacts.map((c) => [
        c.co,
        c.name || '',
        c.type,
        c.role || '',
        c.phone || '',
        c.email || '',
        c.addr || '',
        c.town || '',
        c.pc || '',
      ]),
    ],
    stock: () => [
      ['Stock ID', 'Item', 'Length', 'Colour in', 'Colour out', 'Unit', 'Stock', 'Location', 'Supplier', 'Cost'],
      ...products().map((r) => [
        r.pid,
        r.item,
        r.length,
        r.cInName,
        r.cOutName,
        unitOf(r),
        r.stock,
        r.location || '',
        r.supplier || '',
        r.cost || 0,
      ]),
    ],
    bugs: () => [
      ['Ref', 'Reported', 'By', 'Where', 'How bad', 'Status', 'What', 'Before', 'Notes'],
      ...state.bugs.map((b) => [
        b.id,
        new Date(b.at).toISOString().slice(0, 10),
        b.by,
        b.where,
        b.sev,
        b.status,
        b.what,
        b.steps || '',
        b.reply || '',
      ]),
    ],
  };
  const rows = T[k] && T[k]();
  if (!rows) return;
  csvDownload('broadland-' + k + '-' + d + '.csv', rows);
  audit('Data exported', k, rows.length - 1 + ' rows');
}
export function coEditK(k) {
  if (k == 'co') coEdit('Company Details', SET_CO);
  else coEdit('Money And Invoices', SET_MONEY);
}
export function setThR(t) {
  setTh(t);
  render(true);
}
export function lookOpen() {
  lookPop(true);
}

export function restoreMotionSetting() {
  try {
    if (localStorage.getItem('bb_rm')) document.body.classList.add('rm');
  } catch (e) {}
}
