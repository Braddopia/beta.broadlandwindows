/* features/contracts/contract-record: The contract window: its steps, fields and saving. */
import { company } from '../../data/company.js';
import { jobTitle } from '../../domain/job-title.js';
import { CTYPES } from '../../config/constants.js';
import { onClick, rowClick } from '../../core/actions.js';
import { fd, today } from '../../core/dates.js';
import { esc } from '../../core/dom.js';
import { m0, money, sum } from '../../core/format.js';
import { audit } from '../../data/audit.js';
import { state } from '../../data/state.js';
import { CK } from '../../domain/checklists.js';
import { PHONES, custCompat } from '../../domain/customers.js';
import { pcNorm } from '../../domain/postcode.js';
import { custToBook } from '../contacts/customer-book.js';
import { nid } from '../../domain/numbering.js';
import { RANDOM_SP, spResolve } from '../../domain/people.js';
import { can } from '../../domain/permissions.js';
import { ctrList } from './contracts.js';
import { finTab } from './finance-step.js';
import { abList } from '../records/ab-list.js';
import { addrTab, detailsTab } from '../records/record-parts.js';
import { del } from '../records/delete.js';
import { crOpen } from './contract-reports.js';
import { commTab, costTab, costTotal, delTab, schedTable } from './contract-tabs.js';
import { ckTab } from '../records/checklist.js';
import { CDETF, CFINF, CFITF, CUSTF, FENSAF, GDPRF } from '../records/fields.js';
import { logTab } from '../records/notes.js';
import { photoTab } from '../records/photos-docs.js';
import { linesTab } from '../records/products.js';
import { RECORDS, recCall, recDelivery, recGo, recOpen, recSave, recordWin } from '../records/record-window.js';
import { store } from '../../data/persistence.js';
import { toast } from '../../ui/toast.js';
import { opsTab } from '../records/survey.js';
import { prTag } from '../../ui/components/tags.js';
import { askIn } from '../../ui/modal.js';
import * as repos from '../../data/repository.js';

/* start-up step (run once by main.js) */
export function defineContractRecord() {
  RECORDS.contract = {
    label: 'Contract',
    get: (id) => state.contracts.find((c) => c.id == id),
    order: () => ctrList().map((c) => c.id),
    blank: () => ({
      id: nid('C', state.contracts),
      cdate: today(),
      stage: 'Deposit due',
      value: 0,
      paid: 0,
      fitter: '',
      vatRate: String(company.vat ?? '20'),
      contractType: CTYPES[0],
      soldBy: USER,
      createdBy: USER,
      invSame: 'Same as home',
      siteSame: 'Same as home',
      addrType: 'Home',
      pay: [],
      chk: {},
      lines: [],
      log: [],
    }),
    heading: (W) =>
      (W.v.name ? jobTitle(W.v.id, W.v.name) : W.v.id + '  New contract') + (W.v.company ? ' · ' + W.v.company : ''),
    headStats: (W) =>
      `${W.v.flash ? `<span class="flash">${esc(W.v.flash)}</span>` : ''}<span><small>Value</small><b>${m0(W.v.value)}</b></span><span><small>Paid</small><b>${m0(W.v.paid)}</b></span><span class="${(+W.v.value || 0) - (+W.v.paid || 0) > 0 ? 'hk-due' : 'hk-ok'}"><small>Outstanding</small><b>${(+W.v.value || 0) - (+W.v.paid || 0) > 0 ? m0((+W.v.value || 0) - (+W.v.paid || 0)) : 'Paid'}</b></span><span><small>Fit</small><b>${W.v.fit ? fd(W.v.fit) : '-'}</b></span>`,
    reports: () => crOpen(),
    /* the Advanced menu: [words, action, arguments, style] */
    advanced: () => [
      ['New Service Call', 'call'],
      ['New Delivery', 'delivery'],
      ['Change Customer', 'customer'],
      ['Duplicate This Contract', 'dup'],
      ...(can('manage') ? [['Delete This Contract', 'remove', [], 'del']] : []),
    ],
    run: {
      call: () => recCall(),
      delivery: () => recDelivery(),
      customer: () => recGo('contact'),
      dup: () => ctrDuplicate(),
      remove: () => del('contracts', recordWin.id),
    },
    fields: (W) => [
      ...CDETF(W).filter((f) => f.t != 'calc'),
      ...FENSAF(),
      ...CUSTF,
      ...GDPRF,
      ...CFINF(),
      ...CFITF(),
      { k: 'notes', l: 'Notes', t: 'area' },
    ],
    tabs: (W) => {
      const calls = state.calls.filter((c) => c.contract == W.v.id);
      return [
        { k: 'customer', t: 'Address', h: addrTab },
        { k: 'details', t: 'Details', h: (W) => detailsTab(W, CDETF(W), linesTab(W)) },
        { k: 'survey', t: 'Survey', h: opsTab },
        { k: 'check', t: 'Checklist', h: (W) => ckTab(W, CK) },
        { k: 'finance', t: 'Finance', h: finTab },
        { k: 'deliveries', t: 'Deliveries', h: delTab },
        {
          k: 'fitting',
          t: 'Fitting',
          h: (W) => `<div class="abh2">${abList(CFITF(), W.v)}</div>${schedTable(W)}`,
        },
        { k: 'notes', t: 'Notes etc', h: (W) => logTab(W, 'notes') },
        { k: 'docs', t: 'Documents', one: 'Document', cnt: 1, n: (W.v.photos || []).length, h: photoTab },
        ...(can('money')
          ? [
              { k: 'comm', t: 'Commissions', h: commTab },
              { k: 'costs', t: 'Job Costings', h: costTab },
            ]
          : []),
        {
          k: 'calls',
          t: 'Service Calls',
          one: 'Service Call',
          cnt: 1,
          n: calls.length,
          h: (W) =>
            `<div class="rg wide"><h4><span>Service Calls</span><button class="mini pri" ${onClick('recCall')}>New Service Call</button></h4>${
              calls
                .slice()
                .sort(
                  (a, b) =>
                    (a.status == 'Complete') - (b.status == 'Complete') ||
                    String(b.takenAt || b.visit || '').localeCompare(String(a.takenAt || a.visit || ''))
                )
                .map(
                  (c) =>
                    `<div class="row clk-r" ${rowClick('editCall', c.id)}><span><b>${esc(c.id)}</b> ${esc(c.issue)}<br><span class="muted">${c.status == 'Complete' ? 'Past ticket, completed ' + (c.doneAt ? fd(c.doneAt) : '') : esc(c.status) + ', ' + (c.visit ? 'visit ' + fd(c.visit) : 'no visit booked')}${c.fitter ? ', ' + esc(c.fitter) : ''}</span></span>${c.status == 'Complete' ? '<span class="tag g">Past</span>' : prTag(c.priority)}</div>`
                )
                .join('') || '<p class="empty">No service calls for this contract.</p>'
            }</div>`,
        },
      ];
    },
    check: (W, o) => {
      if (!o.name) return 'Customer name is needed (Customer step)';
      if (!PHONES.some((k) => o[k])) return 'Add at least one phone number (Customer step)';
      if (!o.homeAddr) return 'Address line 1 is needed (Customer step)';
      if (!o.town) return 'Town is needed (Customer step)';
      if (!pcNorm(o.homePc))
        return o.homePc
          ? 'That postcode does not look right, for example NR6 5DR (Customer step)'
          : 'Postcode is needed (Customer step)';
      if (o.paid > o.value && o.value > 0 && !W.okOver) {
        askIn('Paid is more than the contract value', 'Save it anyway?', 'Save Anyway', () => {
          W.okOver = 1;
          recSave(W.closeAfter);
        });
        return 'ASK';
      }
    },
    save: (W, o) => {
      if (o.soldBy == RANDOM_SP) o.soldBy = spResolve(o.soldBy);
      const isNew = W.isNew,
        c = isNew ? { id: W.v.id } : state.contracts.find((x) => x.id == W.id);
      if (!c) return;
      delete o.id;
      delete o.lead;
      delete o.createdBy;
      const np = (W.v.pay || []).length - (c.pay || []).length,
        dp = Math.round(((+o.paid || 0) - (+c.paid || 0)) * 100) / 100,
        a0 = c.stage;
      if (np > 0)
        audit(
          'Payment recorded',
          c.id || W.v.id,
          np + ' payment' + (np > 1 ? 's' : '') + ', ' + money(sum((W.v.pay || []).slice(-np), (x) => x.amt))
        );
      else if (o.paid !== undefined && dp)
        audit(dp > 0 ? 'Paid amount raised' : 'Payment removed', c.id || W.v.id, money(Math.abs(dp)));
      if (!can('money')) {
        delete o.cost;
        delete o.comm;
        delete o.costs;
      } else if (o.costs || (o.lines || []).some((x) => +x.cost)) {
        /* Job Costings: its total is the job cost */
        const t = costTotal(o.lines, o.costs);
        if (t != null) o.cost = t;
      }
      Object.assign(c, o, { pay: W.v.pay || [], log: W.v.log || [], createdBy: c.createdBy || W.v.createdBy || USER });
      c.fitter = [1, 2, 3, 4, 5, 6]
        .map((i) => c['fitter' + i])
        .filter(Boolean)
        .join(', ');
      c.paid = +c.paid || 0;
      c.value = +c.value || 0;
      if (!isNew && a0 && c.stage && a0 != c.stage)
        (c.log = c.log || []).unshift({ t: 'Stage', n: a0 + ' to ' + c.stage, by: USER, at: today() });
      if (isNew) {
        if (state.contracts.some((x) => x.id == c.id)) c.id = nid('C', state.contracts);
        repos.contracts.add(c, { first: true });
      } else repos.contracts.changed(c);
      custCompat(c);
      c.homePc = pcNorm(c.homePc) || c.homePc;
      custToBook(c);
      audit(isNew ? 'Contract added' : 'Contract edited', c.id, c.name);
      return c.id;
    },
  };
}

/** Advanced, Duplicate: a new contract for the same customer with the same products and details. Payments, ticks,
   photos, dates, invoices and commissions are not copied. */
export function ctrDuplicate() {
  if (!recordWin || recordWin.isNew) return;
  if (recordWin.dirty && !recSave(false)) return;
  const src = state.contracts.find((x) => x.id == recordWin.id);
  if (!src) return;
  askIn(
    'Duplicate this contract?',
    'A new contract is made for the same customer with the same products. Payments, ticks, photos, dates and invoices are not copied.',
    'Duplicate',
    () => {
      const c = JSON.parse(JSON.stringify(src));
      delete c._meta;
      Object.assign(c, {
        id: nid('C', state.contracts),
        cdate: today(),
        stage: 'Deposit due',
        paid: 0,
        pay: [],
        chk: {},
        chkAt: {},
        photos: [],
        phTags: [],
        comm: [],
        log: [{ t: 'Note', n: 'Duplicated from ' + src.id, by: USER, at: today() }],
        createdBy: USER,
        fitFromBoard: 0,
        fitter: '',
      });
      ['survey', 'order', 'delDate', 'fit', 'invoiced', 'invoiceNo', 'invoiceDate', 'depDue', 'balDue', 'lead'].forEach(
        (k) => (c[k] = '')
      );
      for (let i = 1; i <= 6; i++) c['fitter' + i] = '';
      repos.contracts.add(c, { first: true });
      store();
      audit('Contract duplicated', c.id, 'from ' + src.id);
      recOpen('contract', c.id);
      toast('Contract ' + c.id + ' made from ' + src.id);
    }
  );
}
