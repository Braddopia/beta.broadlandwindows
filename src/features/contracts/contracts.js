/* features/contracts/contracts: The Contracts page, new contract wizard and contract actions. */
import { company } from '../../data/company.js';
import { CSTAGES, CTYPES, SOURCES } from '../../config/constants.js';
import { onClick } from '../../core/actions.js';
import { fd, iso, today, weekRange } from '../../core/dates.js';
import { esc } from '../../core/dom.js';
import { m0, sum } from '../../core/format.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { PHONES, addrOf, custCompat, siteOf } from '../../domain/customers.js';
import { nid } from '../../domain/numbering.js';
import { OWNERS, RANDOM_SP, spResolve } from '../../domain/people.js';
import { can, canSee } from '../../domain/permissions.js';
import { fitSync } from './finance-step.js';
import { stDots, stgPipe, yrSel } from '../records/list-parts.js';
import { RECORDS, recOpen } from '../records/record-window.js';
import { emptyArt } from '../../ui/components/art.js';
import { cmp, pagerH, paginate, thS } from '../../ui/components/table.js';
import { wizard } from '../../ui/forms/wizard.js';
import { hit, render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { uiState } from '../../ui/ui-state.js';
import * as repos from '../../data/repository.js';

export function ckpi(L) {
  const v = sum(L, (c) => c.value),
    p = sum(L, (c) => c.paid),
    wc = L.filter((c) => c.cost),
    mg = wc.length ? Math.round(100 * (1 - sum(wc, (c) => c.cost) / sum(wc, (c) => c.value))) : '-';
  return `<div class="kpis">${[['Contracts', L.length], ['Total value', m0(v)], ['Collected', m0(p)], ['Outstanding', m0(v - p)], ...(can('money') ? [['Avg margin', mg == '-' ? '-' : mg + '%']] : [])].map((k) => `<div class="kpi"><small>${k[0]}</small><b>${k[1]}</b></div>`).join('')}</div>`;
}
export const fensaDue = (c) =>
  ['Fitted', 'Complete'].includes(c.stage) && c.fensaExported != 'Yes' && c.supplyOnly != 'Yes' && c.cancelled != 'Yes';
/* ---- customer details sheet, contact list, fitter job sheet ---- */
export const yn = (v) => (v == 'Yes' ? 'Yes' : v == 'No' ? 'No' : '');
/* project timeline for printed contracts: [label, date, done] */
export function ctrSteps(c) {
  const i = CSTAGES.indexOf(c.stage);
  return [
    ['Contract signed', c.cdate ? fd(c.cdate) : '', true],
    ['Survey', c.survey ? fd(c.survey) : '', i >= 1],
    ['Products ordered', c.order ? fd(c.order) : '', i >= 2],
    ['Fitting', c.fit ? fd(c.fit) : '', i >= 4],
    ['Complete', '', i >= 5],
  ];
}
export function markFit(id) {
  const c = state.contracts.find((x) => x.id == id);
  c.stage = 'Fitted';
  audit('Marked fitted', id, '');
  store();
  render();
  toast('Contract ' + id + ' marked as fitted');
}
export function openContract(id) {
  recOpen('contract', id);
}
export function editContract(id) {
  if (id) recOpen('contract', id);
  else contractWizard();
}
/* a new contract in a few plain steps, like a new lead, then the full contract opens */
export function depPct(c) {
  return +(c && c.contractType == 'Commercial' ? (company.depCom ?? 25) : (company.depRes ?? 20)) || 0;
}
export function contractWizard() {
  if (!canSee('contracts')) {
    toast('Your account cannot create contracts');
    return;
  }
  const nx = nid('C', state.contracts);
  wizard({
    title: 'New Contract ' + nx,
    saveLabel: 'Create contract',
    v: { title: '', contractType: CTYPES[0], soldBy: RANDOM_SP, cdate: today() },
    steps: [
      {
        t: 'Customer',
        d: 'Who is the customer?',
        f: [
          { k: 'title', l: 'Title', t: 'select', o: ['', 'Mr', 'Mrs', 'Miss', 'Ms', 'Mr & Mrs', 'Dr', 'Company'] },
          { k: 'name', l: 'Name', req: 1 },
          { k: 'mob1', l: 'Mobile', t: 'tel', max: 30, hint: 'Fill in at least one: a mobile or a home phone' },
          { k: 'home1', l: 'Home phone', t: 'tel', max: 30 },
          { k: 'email1', l: 'Email', t: 'email', w: 'full', req: 1 },
          { k: 'company', l: 'Company (if business)', w: 'full' },
        ],
      },
      {
        t: 'Address',
        d: 'Where is the work being done?',
        f: [
          { k: 'homeAddr', l: 'Address line 1', w: 'full', max: 120, req: 1 },
          { k: 'homeAddr2', l: 'Address line 2', w: 'full', max: 120 },
          { k: 'town', l: 'Town / city', max: 60, req: 1 },
          { k: 'homePc', l: 'Postcode', max: 10, req: 1 },
        ],
      },
      {
        t: 'The Job',
        d: 'What is being supplied and fitted?',
        f: [
          { k: 'contractType', l: 'Contract type', t: 'select', o: CTYPES, req: 1 },
          { k: 'product', l: 'Work / products', t: 'area', w: 'full', max: 300, req: 1 },
          { k: 'value', l: 'Contract value, including VAT (£)', t: 'number' },
          { k: 'cdate', l: 'Contract date', t: 'date' },
          { k: 'soldBy', l: 'Salesperson', t: 'select', o: [RANDOM_SP, ...OWNERS()] },
          { k: 'source', l: 'How did they find us?', t: 'select', o: ['', ...SOURCES] },
        ],
      },
      { t: 'Review', d: 'Check and create', review: 1 },
    ],
    check: (st, v) => {
      if (st == 0 && !v.name) return 'Please enter the customer name';
      if (st == 0 && !PHONES.some((k) => v[k])) return 'Add at least one phone number';
      if (st == 0 && !SAFE.email(v.email1 || '')) return 'Enter a real email address';
    },
    save: (v) => {
      const c = {
        ...RECORDS.contract.blank(),
        ...v,
        id: nid('C', state.contracts),
        createdBy: USER,
        addrType: v.company ? 'Business' : 'Home',
        vatRate: String(company.vat ?? '20'),
      };
      c.soldBy = spResolve(c.soldBy);
      c.value = +c.value || 0;
      c.paid = 0;
      if (c.value) c.deposit = Math.round(c.value * depPct(c)) / 100;
      fitSync(c);
      custCompat(c);
      repos.contracts.add(c, { first: true });
      audit('Contract added', c.id, c.name + ' · ' + c.soldBy);
      setTimeout(() => openContract(c.id), 80);
    },
  });
}
export function ctrList() {
  const U = uiState.ctr,
    [ws, we] = weekRange(),
    nws = iso(new Date(new Date(ws + 'T00:00').getTime() + 7 * 864e5)),
    nwe = iso(new Date(new Date(we + 'T00:00').getTime() + 7 * 864e5));
  const dd = (c) => c.delDate || '',
    cur = (c) => c.stage != 'Complete' && c.cancelled != 'Yes';
  const V =
    {
      cur,
      delw: (c) => dd(c) >= ws && dd(c) <= we,
      deln: (c) => dd(c) >= nws && dd(c) <= nwe,
      bal: (c) => c.value - c.paid > 0,
      uninv: (c) => cur(c) && c.invoiced != 'Yes',
      sf: (c) => cur(c) && c.supplyOnly != 'Yes',
      so: (c) => cur(c) && c.supplyOnly == 'Yes',
      hold: (c) => c.onHold == 'Yes',
      fensa: fensaDue,
      comp: (c) => c.stage == 'Complete',
      all: () => true,
    }[U.f] || (() => true);
  const val =
    {
      id: (c) => c.id,
      name: (c) => c.name,
      addr: (c) => addrOf(c),
      sold: (c) => c.soldBy || '',
      office: (c) => c.officeRef || '',
      site: siteOf,
      stage: (c) => CSTAGES.indexOf(c.stage),
      fit: (c) => c.fit || '9999',
      value: (c) => +c.value,
      bal: (c) => c.value - c.paid,
    }[U.sort] || ((c) => c.id);
  return state.contracts
    .filter(
      (c) =>
        V(c) &&
        (!U.yr || U.yr == 'all' || String(c.cdate || '').startsWith(U.yr)) &&
        (!U.st || (c.stage || 'Deposit due') == U.st) &&
        hit(c)
    )
    .sort((a, b) => cmp(val(a), val(b)) * U.dir || cmp(a.id, b.id));
}
export const CVIEWS = [
  ['cur', 'All Current'],
  ['delw', 'Deliveries This Week'],
  ['deln', 'Deliveries Next Week'],
  ['bal', 'Balances Outstanding'],
  ['uninv', 'Uninvoiced'],
  ['sf', 'Supply & Fit'],
  ['so', 'Supply Only'],
  ['hold', 'On Hold'],
  ['fensa', 'FENSA To Notify'],
  ['comp', 'Complete'],
  ['all', 'All'],
];
export function vContracts() {
  const U = uiState.ctr,
    L = ctrList(),
    pg = paginate(U, L),
    tv = sum(L, (c) => c.value),
    bal = sum(L, (c) => c.value - c.paid),
    cnt = (k) => {
      const f = U.f;
      U.f = k;
      const n = ctrList().length;
      U.f = f;
      return n;
    };
  const tog = `<div class="seg2"><button class="${U.v == 'list' ? 'on' : ''}" ${onClick('setUI', 'ctr.v', 'list')}>List</button><button class="${U.v == 'board' ? 'on' : ''}" ${onClick('setUI', 'ctr.v', 'board')}>Board</button></div>`;
  const board = `<div class="kan" style="grid-template-columns:repeat(${CSTAGES.length},minmax(11rem,1fr))">${CSTAGES.map(
    (s) => {
      const B = L.filter((c) => c.stage == s);
      return `<div class="col"><div class="colh"><b>${esc(s)}</b><span>${B.length}, ${m0(sum(B, (c) => c.value))}</span></div>${B.map((c) => `<div class="lc"><div class="lt"><b ${onClick('openContract', c.id)}>${esc(c.name)} <small class="muted">${esc(c.id)}</small></b><span>${m0(c.value)}</span></div><p>${esc(c.product)}</p><p class="muted">${esc(c.town || '')}${c.fit ? ', fit ' + fd(c.fit) : ''}</p>${c.value - c.paid > 0 ? `<p class="muted">Balance ${m0(c.value - c.paid)}</p>` : '<p><span class="tag g">Paid</span></p>'}</div>`).join('') || '<p class="empty">Nothing here.</p>'}</div>`;
    }
  ).join('')}</div>`;
  const list = `<div class="tw"><table class="ptb abt ctb"><thead><tr>${thS('ctr', 'id', 'Contract No')}${thS('ctr', 'name', 'Cust Name')}<th class="stcol"><span class="srt" ${onClick('sortBy', 'ctr', 'stage')} style="cursor:pointer">Stage${U.sort == 'stage' ? `<span class="ar">${U.dir > 0 ? '▲' : '▼'}</span>` : ''}</span></th>${thS('ctr', 'addr', 'Address', 'c-md')}${thS('ctr', 'sold', 'Sold By', 'c-sm')}${thS('ctr', 'office', 'Office Ref', 'c-xl')}${thS('ctr', 'site', 'Site Address', 'c-xl')}${thS('ctr', 'fit', 'Fit Date', 'c-sm')}${thS('ctr', 'value', 'Value', 'n')}${thS('ctr', 'bal', 'Balance', 'n c-sm')}</tr></thead><tbody>
   ${pg.rows.map((c) => `<tr ${onClick('openContract', c.id)} class="clk-r"><td><b class="lref">${esc(c.id)}</b>${c.lead ? `<br><span class="muted" style="font-size:.7rem">From ${esc(c.lead)}</span>` : ''}</td><td><b>${esc(c.name)}</b>${c.flash ? `<br><span class="flash">${esc(c.flash)}</span>` : ''}</td><td class="stcol">${stDots('contract', c.stage)}</td><td class="c-md wrapc">${esc(addrOf(c) || '-')}</td><td class="c-sm">${esc(c.soldBy || '-')}</td><td class="c-xl">${esc(c.officeRef || '')}</td><td class="c-xl wrapc">${esc(siteOf(c) || '-')}</td><td class="c-sm">${fd(c.fit)}</td><td class="n">${m0(c.value)}</td><td class="n c-sm">${m0(c.value - c.paid)}</td></tr>`).join('') || '<tr><td colspan="10" class="empty">' + emptyArt('files', 'No contracts in this view.') + '</td></tr>'}</tbody></table></div>${pagerH('ctr', pg, 'contracts')}`;
  return `<div class="head"><div><h1>Contracts</h1><span class="muted">${esc((CVIEWS.find((x) => x[0] == U.f) || ['', 'All'])[1])}: ${L.length} records, ${m0(tv)} total, ${m0(bal)} to collect</span></div><div class="tools"><button class="mini" data-act="contactList" data-args="[&quot;contract&quot;]">Contact list</button><button class="btn" data-act="editContract">New contract</button></div></div>
  <div class="subbar"><span class="sb-l">Show</span><div class="views">${CVIEWS.map(([k, t]) => `<button class="chip ${U.f == k ? 'on' : ''}" ${onClick('setUI', 'ctr.f', k)}>${esc(t)} <i>${cnt(k)}</i></button>`).join('')}<span class="vs"></span>${yrSel(
    'ctr',
    state.contracts.map((c) => c.cdate)
  )}</div><span class="sb-sp"></span>${tog}</div>
  ${stgPipe('contract')}${ckpi(L)}${U.v == 'board' ? board : list}`;
}
