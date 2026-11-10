/* features/leads/leads: The Leads page, new lead wizard and lead actions. */
import { CSTAGES, CTYPES, PTYPES, SOURCES, STAGES } from '../../config/constants.js';
import { previewNotice } from '../records/preview-notice.js';
import { onClick, onEvent } from '../../core/actions.js';
import { addDays, fd, today, weekRange } from '../../core/dates.js';
import { $, esc } from '../../core/dom.js';
import { csvDownload } from '../../ui/download.js';
import { m0, pc, sum } from '../../core/format.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { PHONES, addrOf, custCompat, mailOf, siteOf, telOf } from '../../domain/customers.js';
import { allLeads, leadProb } from '../../domain/leads.js';
import { nextLeadId, nid } from '../../domain/numbering.js';
import { FITL, OWNERS, RANDOM_SP, spResolve } from '../../domain/people.js';
import { canSee } from '../../domain/permissions.js';
import { need } from '../auth/session.js';
import { openContract } from '../contracts/contracts.js';
import { nextAppt } from '../records/appointments.js';
import { CUSTK } from '../records/fields.js';
import { stDots, stgPipe, yrSel } from '../records/list-parts.js';
import { docsMove } from '../records/photos-docs.js';
import { recOpen, recordWin } from '../records/record-window.js';
import { emptyArt } from '../../ui/components/art.js';
import { cmp, pagerH, paginate, thS } from '../../ui/components/table.js';
import { form } from '../../ui/forms/form.js';
import { wizard } from '../../ui/forms/wizard.js';
import { askYes, closeModal } from '../../ui/modal.js';
import { go, hit, render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { uiState } from '../../ui/ui-state.js';
import * as repos from '../../data/repository.js';

export function mvLead(id, d) {
  const l = state.leads.find((x) => x.id == id),
    i = STAGES.indexOf(l.stage) + d;
  if (i < 0 || i >= STAGES.length) return;
  const a = l.stage;
  l.stage = STAGES[i];
  (l.log = l.log || []).unshift({ d: today(), t: 'Stage: ' + a + ' to ' + l.stage, by: USER });
  audit('Lead stage', l.id, a + ' to ' + l.stage);
  store();
  render();
}
export function delLead(id) {
  if (!need('manage', 'Deleting leads')) return;
  const l = state.leads.find((x) => x.id == id);
  if (!l) return;
  askYes(
    'Delete lead ' + id + '?',
    l.name + ' will be removed. This cannot be undone.',
    'Delete lead',
    () => {
      repos.leads.remove((x) => x.id == id);
      audit('Lead deleted', id, l.name);
      store();
      render();
      if (typeof recordWin != 'undefined' && recordWin && String(recordWin.id) == String(id) && $('#mbox .rw')) {
        recordWin.dirty = 0;
        closeModal();
      }
    },
    true
  );
}
/* convert: the lead becomes a contract with the next 7-digit number; its L number is freed */
export function convertLead(id) {
  const l = state.leads.find((x) => x.id == id);
  if (!l) return;
  if (!canSee('contracts')) {
    toast('Your account cannot create contracts');
    return;
  }
  const cn = nid('C', state.contracts);
  form(
    'Convert ' + l.id + ' to Contract ' + cn,
    [
      { k: 'name', l: 'Customer', req: 1 },
      { k: 'phone', l: 'Phone', t: 'tel', max: 30 },
      { k: 'email', l: 'Email', t: 'email' },
      { k: 'address', l: 'Installation address', w: 'full', max: 200 },
      { k: 'town', l: 'Town' },
      { k: 'product', l: 'Product / work', w: 'full', req: 1 },
      { k: 'value', l: 'Contract value (£)', t: 'number', req: 1, pos: 1 },
      { k: 'paid', l: 'Deposit paid (£)', t: 'number' },
      { k: 'stage', l: 'Stage', t: 'select', o: CSTAGES },
      { k: 'fitter', l: 'Fitter', t: 'select', o: FITL() },
      { k: 'survey', l: 'Survey date', t: 'date' },
      { k: 'fit', l: 'Fit date', t: 'date' },
      { k: 'notes', l: 'Contract notes', t: 'area', w: 'full' },
    ],
    {
      ...l,
      address: siteOf(l),
      paid: 0,
      stage: 'Deposit due',
      fitter: FITL()[0],
      notes: 'From lead ' + l.id + (l.notes ? '. ' + l.notes : ''),
    },
    (o) => {
      const cust = {};
      CUSTK.forEach((k) => {
        if (l[k] != null && l[k] !== '') cust[k] = l[k];
      });
      const c = {
        id: nid('C', state.contracts),
        ...cust,
        ...o,
        email1: o.email || cust.email1,
        cdate: today(),
        soldBy: l.owner || USER,
        source: l.source,
        subSource: l.subSource,
        salesArea: l.branch,
        createdBy: USER,
        contractType: CTYPES[0],
        log: [{ d: today(), t: 'Contract created from lead ' + l.id, by: USER }],
        lead: l.id,
        openings: (l.openings || []).map((x) => ({ ...x })),
        pay: [],
        photos: (l.photos || []).slice(),
        chk: { 'Contract signed by customer': true },
        fromLead: { id: l.id, source: l.source, owner: l.owner, created: l.created, log: l.log || [] },
      };
      if (o.paid > 0) {
        c.pay.push({ amt: o.paid, date: today(), method: 'Deposit', note: 'Taken at conversion' });
        c.chk['Deposit taken'] = true;
      }
      if (o.phone && o.phone != telOf(l)) c.mob1 = o.phone;
      if (o.address && o.address != siteOf(l)) {
        c.siteSame = 'Different';
        c.siteAddr = o.address;
      }
      custCompat(c);
      if (o.phone) c.phone = o.phone;
      if (o.address) c.address = o.address;
      repos.contracts.add(c, { first: true });
      repos.leadArchive.add({ ...l, stage: 'Won', convertedTo: c.id, convertedOn: today() }, { keepMeta: true });
      repos.leads.remove((x) => x.id == l.id);
      audit('Lead converted', l.id, 'Became contract ' + c.id);
      docsMove('lead:' + l.id, 'contract:' + c.id);
      c.phTags = (l.phTags || []).slice();
      setTimeout(() => {
        toast(l.id + ' is now contract ' + c.id + '. ' + l.id + ' is free for a new lead.');
        go('contracts');
        openContract(c.id);
      }, 60);
    },
    false,
    'lg'
  );
}
export function leadCsv() {
  csvDownload('broadland-leads-' + today() + '.csv', [
    [
      'Ref',
      'Customer',
      'Phone',
      'Email',
      'Town',
      'Product',
      'Source',
      'Owner',
      'Stage',
      'Value',
      'Win %',
      'Follow-up',
      'Next step',
    ],
    ...state.leads.map((l) => [
      l.id,
      l.name,
      l.phone,
      l.email,
      l.town,
      l.product,
      l.source,
      l.owner || '',
      l.stage,
      l.value,
      leadProb(l),
      l.followup || '',
      l.next || '',
    ]),
  ]);
}
/* ---- entry points used across the app ---- */
export function openLead(id) {
  recOpen('lead', id);
}
export function editLead(id) {
  if (id) recOpen('lead', id);
  else leadWizard();
}
export function leadWizard() {
  setTimeout(() => previewNotice('lead'), 120);
  const id = nextLeadId();
  wizard({
    title: 'New Lead ' + id,
    saveLabel: 'Create lead',
    v: { title: '', source: 'Website', owner: RANDOM_SP, siteSame: 'Same as home', productType: '' },
    steps: [
      {
        t: 'Customer',
        d: 'Who is the customer?',
        f: [
          {
            k: 'title',
            l: 'Title',
            t: 'select',
            o: ['', 'Mr', 'Mrs', 'Miss', 'Ms', 'Mr & Mrs', 'Dr', 'Company'],
            req: 1,
          },
          { k: 'name', l: 'Name', req: 1 },
          { k: 'mob1', l: 'Mobile', t: 'tel', max: 30, hint: 'Fill in at least one: a mobile or a home phone' },
          { k: 'mob2', nx: 'mob1', l: 'Second mobile', t: 'tel', max: 30 },
          { k: 'home1', l: 'Home phone', t: 'tel', max: 30 },
          { k: 'mob3', nx: 'mob2', l: 'Third mobile', t: 'tel', max: 30 },
          { k: 'home2', nx: 'home1', l: 'Second home phone', t: 'tel', max: 30 },
          { k: 'home3', nx: 'home2', l: 'Third home phone', t: 'tel', max: 30 },
          { k: 'email1', l: 'Email', t: 'email', w: 'full', req: 1 },
          { k: 'email2', nx: 'email1', l: 'Second email', t: 'email', w: 'full' },
          { k: 'email3', nx: 'email2', l: 'Third email', t: 'email', w: 'full' },
          { k: 'company', l: 'Company (if business)', w: 'full' },
        ],
      },
      {
        t: 'Address',
        d: 'Where are they? Fill it in like a delivery address.',
        f: [
          { k: 'homeAddr', l: 'Address line 1', w: 'full', max: 120, req: 1, hint: 'House number or name and street' },
          { k: 'homeAddr2', l: 'Address line 2', w: 'full', max: 120 },
          { k: 'town', l: 'Town / city', max: 60, req: 1 },
          { k: 'county', l: 'County', max: 60 },
          { k: 'homePc', l: 'Postcode', max: 10, req: 1 },
          { k: 'addrType', l: 'Address type', t: 'select', o: ['Home', 'Business'], req: 1 },
        ],
      },
      {
        t: 'Enquiry',
        d: 'What do they want?',
        f: [
          { k: 'productType', l: 'Product type', t: 'select', o: PTYPES, req: 1 },
          { k: 'source', l: 'How did they find us?', t: 'select', o: SOURCES, req: 1 },
          { k: 'product', l: 'Work wanted', t: 'area', w: 'full', max: 300 },
          { k: 'value', l: 'Rough value (£)', t: 'number' },
          { k: 'owner', l: 'Salesperson', t: 'select', o: [RANDOM_SP, ...OWNERS()] },
        ],
      },
      {
        t: 'Next Step',
        d: 'What happens next?',
        f: [
          { k: 'apptDate', l: 'Appointment date', t: 'date' },
          { k: 'apptTime', l: 'Appointment time', t: 'time' },
          { k: 'next', l: 'Next action', w: 'full', hint: 'e.g. Call back Tuesday, send brochure' },
          { k: 'followup', l: 'Next action date', t: 'date' },
        ],
      },
      { t: 'Review', d: 'Check and create', review: 1 },
    ],
    check: (st, v) => {
      if (st == 0 && !v.name) return 'Please enter the customer name';
      if (st == 0 && !PHONES.some((k) => v[k])) return 'Add at least one phone number';
    },
    save: (v) => {
      const lid = nextLeadId(),
        l = {
          ...v,
          id: lid,
          stage: 'New',
          created: today(),
          takenBy: USER,
          invSame: 'Same as home',
          addrType: v.company ? 'Business' : 'Home',
          log: [{ d: today(), t: 'Lead created', by: USER }],
          appts: [],
          chk: {},
        };
      l.owner = spResolve(l.owner);
      custCompat(l);
      repos.leads.add(l);
      audit('Lead added', lid, l.name + ' · ' + l.owner);
      toast(lid + ' created and given to ' + l.owner + '. Open it any time to add more.');
    },
  });
}
/* ======================= list views (AdminBase-style "live views") ======================= */
export function leadList() {
  const U = uiState.lead,
    td = today(),
    tm = addDays(1),
    yd = addDays(-1),
    [ws, we] = weekRange();
  const ap = (l) => [l.apptDate, ...(l.appts || []).map((a) => a.d)].filter(Boolean),
    isOpen = (l) => !['Won', 'Lost'].includes(l.stage);
  const V =
    {
      live: isOpen,
      web: (l) => isOpen(l) && l.source == 'Website' && l.stage == 'New',
      today: (l) => ap(l).includes(td),
      tom: (l) => ap(l).includes(tm),
      yest: (l) => ap(l).includes(yd),
      week: (l) => ap(l).some((d) => d >= ws && d <= we),
      unassigned: (l) => isOpen(l) && (!l.owner || l.owner == 'Unassigned' || !ap(l).length),
      nores: (l) => ap(l).some((d) => d < td) && !l.result && isOpen(l),
      due: (l) => isOpen(l) && l.followup && l.followup <= td,
      won: (l) => l.stage == 'Won',
      lost: (l) => l.stage == 'Lost',
      all: () => true,
    }[U.f] || (() => true);
  const val =
    {
      id: (l) => l.id,
      created: (l) => l.created || '',
      name: (l) => l.name,
      town: (l) => addrOf(l),
      pc: (l) => l.homePc || '',
      tel: telOf,
      email: mailOf,
      owner: (l) => l.owner || '~',
      source: (l) => l.source,
      value: (l) => +l.value,
      followup: (l) => l.followup || '9999',
      stage: (l) => STAGES.indexOf(l.stage),
      appt: (l) => nextAppt(l) || '9999',
    }[U.sort] || ((l) => l.id);
  return state.leads
    .filter(
      (l) =>
        V(l) &&
        (!U.yr || U.yr == 'all' || String(l.created || '').startsWith(U.yr)) &&
        (!U.st || (l.stage || 'New') == U.st) &&
        (U.src == 'all' || l.source == U.src) &&
        (U.own == 'all' || (l.owner || 'Unassigned') == U.own) &&
        hit(l)
    )
    .sort((a, b) => cmp(val(a), val(b)) * U.dir || cmp(a.id, b.id));
}
export const LVIEWS = [
  ['live', 'Active Leads'],
  ['due', 'Next Action Due'],
  ['won', 'Won, To Convert'],
  ['lost', 'Lost'],
  ['all', 'All Leads'],
];
export function vLeads() {
  const U = uiState.lead,
    td = today(),
    open = state.leads.filter((l) => !['Won', 'Lost'].includes(l.stage)),
    pipe = sum(open, (l) => l.value),
    wt = sum(open, (l) => (l.value * leadProb(l)) / 100),
    due = open.filter((l) => l.followup && l.followup <= td),
    A2 = allLeads(),
    won = A2.filter((l) => l.stage == 'Won').length,
    lost = A2.filter((l) => l.stage == 'Lost').length,
    ready = state.leads.filter((l) => l.stage == 'Won');
  const L = leadList(),
    pg = paginate(U, L),
    cnt = (k) => {
      const f = U.f;
      U.f = k;
      const n = leadList().length;
      U.f = f;
      return n;
    };
  const sel = (k, arr, all) =>
    `<select class="fsel" ${onEvent('onchange', 'setUI', 'lead.' + k, 'this.value')}><option value="all">${all}</option>${arr.map((x) => `<option ${U[k] == x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
  const tog = `<div class="seg2"><button class="${U.v == 'list' ? 'on' : ''}" ${onClick('setUI', 'lead.v', 'list')}>List</button><button class="${U.v == 'board' ? 'on' : ''}" ${onClick('setUI', 'lead.v', 'board')}>Board</button></div>`;
  const list = `<div class="tw"><table class="ptb abt"><thead><tr>${thS('lead', 'id', 'Lead No')}${thS('lead', 'name', 'Customer')}<th class="stcol"><span class="srt" ${onClick('sortBy', 'lead', 'stage')} style="cursor:pointer">Stage${U.sort == 'stage' ? `<span class="ar">${U.dir > 0 ? '▲' : '▼'}</span>` : ''}</span></th>${thS('lead', 'town', 'Address', 'c-md')}${thS('lead', 'tel', 'Contact', 'c-sm')}${thS('lead', 'owner', 'Salesperson', 'c-md')}${thS('lead', 'source', 'Source', 'c-xl')}${thS('lead', 'appt', 'Next Visit', 'c-sm')}${thS('lead', 'value', 'Value', 'n')}<th class="ac"><span class="sr">Actions</span></th></tr></thead><tbody>
   ${pg.rows.map((l) => `<tr ${onClick('openLead', l.id)} class="clk-r"><td><b class="lref">${esc(l.id)}</b>${l.created ? `<small class="sub">${fd(l.created)}</small>` : ''}</td><td><b>${esc([l.title, l.name].filter(Boolean).join(' '))}</b>${l.company ? `<small class="sub">${esc(l.company)}</small>` : ''}</td><td class="stcol">${stDots('lead', l.stage)}</td><td class="c-md"><span class="cl2">${esc(addrOf(l) || '-')}</span>${l.homePc ? `<small class="sub">${esc(l.homePc)}</small>` : ''}</td><td class="c-sm">${esc(telOf(l) || '-')}${mailOf(l) ? `<small class="sub nocap">${esc(mailOf(l))}</small>` : ''}</td><td class="c-md">${esc(l.owner || 'Unassigned')}</td><td class="c-xl">${esc(l.source || '-')}</td><td class="c-sm">${nextAppt(l) ? fd(nextAppt(l)) : '-'}</td><td class="n">${m0(l.value)}</td><td class="ac" data-norow="1"><div class="acts r">${l.stage != 'Lost' && canSee('contracts') ? `<button class="mini ${l.stage == 'Won' ? 'pri' : ''}" ${onClick('convertLead', l.id)}>Convert</button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="10" class="empty">' + emptyArt('survey', 'No leads in this view.') + '</td></tr>'}</tbody></table></div>${pagerH('lead', pg, 'leads')}`;
  const board = `<div class="kan">${STAGES.map((s) => {
    const B = L.filter((l) => l.stage == s);
    return `<div class="col"><div class="colh"><b>${esc(s)}</b><span>${B.length} leads, ${m0(sum(B, (l) => l.value))}</span></div>${B.map((l) => `<div class="lc"><div class="lt"><b ${onClick('openLead', l.id)} title="Open lead">${esc(l.name)} <small class="muted">${esc(l.id)}</small></b><span>${m0(l.value)}</span></div><p>${esc(l.product)}</p><p class="muted">${esc(l.town || '')}, via ${esc(l.source)}</p><p class="muted">${esc(l.next || 'No next action set')}</p><div class="lb"><button class="mini" aria-label="Move back" ${onClick('mvLead', l.id, -1)}>&lsaquo;</button><button class="mini" aria-label="Move forward" ${onClick('mvLead', l.id, 1)}>&rsaquo;</button><button class="mini" ${onClick('openLead', l.id)}>Open</button>${s == 'Won' && canSee('contracts') ? `<button class="mini pri" ${onClick('convertLead', l.id)}>Convert</button>` : ''}</div></div>`).join('') || '<p class="empty">Nothing here.</p>'}</div>`;
  }).join('')}</div>`;
  return `<div class="head"><div><h1>Leads</h1><span class="muted">${esc((LVIEWS.find((x) => x[0] == U.f) || ['', 'All'])[1])}: ${L.length} records</span></div><div class="tools"><button class="mini" data-act="contactList" data-args="[&quot;lead&quot;]">Contact list</button><button class="mini" data-act="leadCsv">Export CSV</button><button class="btn" data-act="editLead">New lead</button></div></div>
  <div class="subbar"><span class="sb-l">Show</span><div class="views">${LVIEWS.map(([k, t]) => `<button class="chip ${U.f == k ? 'on' : ''}" ${onClick('setUI', 'lead.f', k)}>${esc(t)} <i>${cnt(k)}</i></button>`).join('')}<span class="vs"></span><label class="fl-own">Salesperson ${sel('own', OWNERS(), 'Everyone')}</label>${yrSel(
    'lead',
    state.leads.map((l) => l.created)
  )}</div><span class="sb-sp"></span>${tog}</div>
  ${stgPipe('lead')}
  <div class="kpis"><button class="kpi" ${onClick('setUI', 'lead.f', 'live')}><small>Open Leads</small><b>${open.length}</b></button><div class="kpi"><small>Pipeline Value</small><b>${m0(pipe)}</b></div><div class="kpi"><small>Weighted Pipeline</small><b>${m0(wt)}</b><span class="ksub">Value x win chance</span></div><button class="kpi ${due.length ? 'warn' : ''}" ${onClick('setUI', 'lead.f', 'due')}><small>Next Action Due</small><b>${due.length}</b></button><button class="kpi ${ready.length ? 'warn' : ''}" ${onClick('setUI', 'lead.f', 'won')}><small>Won, To Convert</small><b>${ready.length}</b></button><div class="kpi"><small>Conversion Rate</small><b>${pc(won, won + lost)}</b><span class="ksub">${won} won, ${lost} lost</span></div></div>
  ${U.v == 'board' ? board : list}`;
}
