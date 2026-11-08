/* features/service/service: Service calls: the page, the call sheet and service reports. */
import { SVC_CAT, SVC_PR, SVC_ST } from '../../config/constants.js';
import { onClick, rowClick } from '../../core/actions.js';
import { fd, fdl, today } from '../../core/dates.js';
import { $, esc } from '../../core/dom.js';
import { m0, money } from '../../core/format.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { state } from '../../data/state.js';
import { addrOf, mailOf, telOf } from '../../domain/customers.js';
import { nid } from '../../domain/numbering.js';
import { FITL, staffNames } from '../../domain/people.js';
import { SVCV, svcOpen } from '../../domain/service.js';
import { can } from '../../domain/permissions.js';
import { R } from '../reports/reports.js';
import { docChoice, printDoc } from '../../print/print.js';
import { pagerH, paginate } from '../../ui/components/table.js';
import { prTag, svcTag } from '../../ui/components/tags.js';
import { fieldErr, form } from '../../ui/forms/form.js';
import { phCount } from '../../ui/forms/photos.js';
import { hit } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { uiState } from '../../ui/ui-state.js';

/* at a glance: does the customer still owe money on their contract? */
export const svcBal = (c) => {
  const k = c.contract && state.contracts.find((x) => x.id == c.contract);
  if (!k) return '';
  const b = (+k.value || 0) - (+k.paid || 0);
  return b > 0
    ? `<span class="tag r svb" title="Contract ${esc(k.id)} still has a balance">${m0(b)} owed</span>`
    : '<span class="tag g svb">Paid up</span>';
};
export function vService() {
  const U = uiState.svc,
    V = SVCV(),
    f = (V.find((x) => x[0] == U.f) || V[0])[2],
    td = today(),
    O = state.calls.filter(svcOpen);
  const L0 = state.calls
    .filter((c) => f(c) && hit(c))
    .sort(
      (a, b) =>
        svcOpen(b) - svcOpen(a) ||
        SVC_PR.indexOf(a.priority) - SVC_PR.indexOf(b.priority) ||
        String(a.visit || '9').localeCompare(String(b.visit || '9'))
    );
  const L = L0,
    pg = paginate(U, L0);
  const k = (t, n, key, cls) =>
    `<button class="kpi ${cls || ''}" ${onClick('setUI', 'svc.f', key)}><small>${t}</small><b>${n}</b></button>`;
  return `<div class="head"><div><h1>Service Calls</h1><span class="muted">${esc((V.find((x) => x[0] == U.f) || V[0])[1])}: ${L.length}</span></div><div class="tools"><button class="mini" ${onClick('svcDaySheet', td)}>Today's Day Sheet</button><button class="mini" data-act="svcReport">Service Report</button><button class="btn" data-act="editCall">New Service Call</button></div></div>
  <div class="subbar"><span class="sb-l">Show</span><div class="views">${V.map(([key, n, fn]) => `<button class="chip ${U.f == key ? 'on' : ''}" ${onClick('setUI', 'svc.f', key)}>${esc(n)} <i>${state.calls.filter(fn).length}</i></button>`).join('')}</div></div>
  <div class="kpis">${k('Open Calls', O.length, 'open')}${k('Urgent', O.filter((c) => c.priority == 'Urgent').length, 'urgent', O.some((c) => c.priority == 'Urgent') ? 'bad' : '')}${k('Visits Today', O.filter((c) => c.visit == td).length, 'today')}${k('Awaiting Parts', O.filter((c) => c.status == 'Awaiting parts').length, 'parts')}${k('Not Booked Yet', O.filter((c) => !c.visit).length, 'nobook', O.some((c) => !c.visit) ? 'warn' : '')}${k('Overdue Visits', O.filter((c) => c.visit && c.visit < td).length, 'open', O.some((c) => c.visit && c.visit < td) ? 'bad' : '')}</div>
  <div class="tw"><table class="ptb abt"><thead><tr><th>Ref</th><th>Customer</th><th>Problem</th><th>Priority</th><th>Status</th><th class="c-sm">Visit</th><th class="c-md">Engineer</th><th class="ac"></th></tr></thead><tbody>
  ${pg.rows.map((c) => `<tr class="clk-r" ${rowClick('editCall', c.id)}><td><b class="lref">${esc(c.id)}</b>${c.contract ? `<small class="sub">${esc(c.contract)}</small>` : ''}</td><td><b>${esc(c.name)}</b><small class="sub">${esc([c.town, c.phone].filter(Boolean).join(' · '))}</small>${svcBal(c)}</td><td><span class="cl2">${esc(c.issue)}</span><small class="sub">${esc(c.cat || '')}${c.cat && c.photos && c.photos.length ? ' · ' : ''}${phCount(c.photos)}</small></td><td>${prTag(c.priority)}</td><td>${svcTag(c.status)}</td><td class="c-sm">${c.visit ? `<b class="${svcOpen(c) && c.visit < td ? 'od' : ''}">${fd(c.visit)}</b>${c.visitTime ? `<small class="sub">${esc(c.visitTime)}</small>` : ''}` : '<span class="muted">Not booked</span>'}</td><td class="c-md">${esc(c.fitter || '-')}</td><td class="ac"><div class="acts r"><button class="mini" ${onClick('reportCall', c.id)}>Report</button>${can('manage') ? `<button class="mini del" ${onClick('del', 'calls', c.id)}>Delete</button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="8" class="empty">No service calls here.</td></tr>'}
  </tbody></table></div>${pagerH('svc', pg, 'calls')}`;
}
/* the call sheet: who rang, what is wrong, who is going, what was done */
export const SVCF = () => [
  { t: 'h', l: 'The Call' },
  {
    k: 'existing',
    l: 'Existing customer?',
    t: 'select',
    o: ['Yes, we fitted it', 'No, new customer'],
    req: 1,
    w: 'full',
  },
  { k: 'takenBy', l: 'Call taken by', t: 'select', o: ['', ...staffNames().filter(Boolean)], req: 1 },
  { k: 'takenAt', l: 'Date taken', t: 'date', req: 1 },
  { k: 'takenTime', l: 'Time taken', t: 'time' },
  {
    k: 'contract',
    l: 'Contract number',
    max: 30,
    list: 'dlCon',
    hint: 'Type the number or pick the customer: their details fill in',
  },
  { k: 'name', l: 'Customer', req: 1 },
  { k: 'phone', l: 'Phone', t: 'tel', max: 30, hint: 'Needed for a new customer' },
  { k: 'email', l: 'Email', t: 'email' },
  { k: 'address', l: 'Address', w: 'full', max: 200, hint: 'Needed for a new customer' },
  { k: 'town', l: 'Town', hint: 'Needed for a new customer' },
  { t: 'h', l: 'The Problem' },
  { k: 'cat', l: 'Type of problem', t: 'select', o: ['', ...SVC_CAT], req: 1 },
  { k: 'priority', l: 'Priority', t: 'select', o: SVC_PR },
  { k: 'issue', l: 'What is wrong (in their words)', t: 'area', w: 'full', req: 1 },
  { k: 'guarantee', l: 'Under guarantee?', t: 'select', o: ['', 'Yes', 'No', 'Not sure'] },
  { t: 'h', l: 'The Visit' },
  { k: 'fitter', l: 'Service engineer attending', t: 'select', o: ['', ...FITL()] },
  { k: 'status', l: 'Status', t: 'select', o: SVC_ST },
  { k: 'visit', l: 'Visit date', t: 'date' },
  { k: 'visitTime', l: 'Visit time', t: 'time' },
  { k: 'arrived', l: 'Arrived on site', t: 'time' },
  { k: 'left', l: 'Left site', t: 'time' },
  { t: 'h', l: 'Work Done' },
  { k: 'notes', l: 'Work carried out', t: 'area', w: 'full' },
  { k: 'parts', l: 'Parts used or ordered', t: 'area', w: 'full', max: 400 },
  { k: 'followUp', l: 'Another visit needed?', t: 'select', o: ['', 'No', 'Yes'] },
  { k: 'followNote', l: 'What the next visit is for', max: 200 },
  { k: 'charge', l: 'Charge to customer (£)', t: 'number', hint: 'Leave at 0 if covered by the guarantee' },
  { k: 'signed', l: 'Customer signed off?', t: 'select', o: ['', 'Yes', 'No'] },
  {
    k: 'doneAt',
    l: 'Date completed',
    t: 'date',
    hint: 'Needed to close the call. It then moves to Past Tickets and stays on the contract history',
  },
];
export function editCall(id, cid) {
  const c = state.calls.find((x) => x.id == id),
    k = state.contracts.find((x) => x.id == cid) || {};
  if (id && !c) return;
  const v = c
    ? {
        ...c,
        existing:
          c.existing || (state.contracts.some((x) => x.id == c.contract) ? 'Yes, we fitted it' : 'No, new customer'),
      }
    : {
        name: k.name || '',
        phone: telOf(k) || '',
        email: mailOf(k) || '',
        address: addrOf(k) || '',
        town: k.town || '',
        contract: k.id || '',
        priority: 'Normal',
        status: 'Open',
        takenBy: USER,
        takenAt: today(),
        takenTime: new Date().toTimeString().slice(0, 5),
        guarantee: k.id ? 'Yes' : '',
        existing: k.id ? 'Yes, we fitted it' : 'No, new customer',
      };
  form(
    c ? 'Service Call ' + c.id : 'New Service Call',
    SVCF(),
    v,
    (o) => {
      const bad = (k, m) => {
        const e = $('#f_' + k);
        if (e) fieldErr(e, m);
        return false;
      };
      if (/^Yes/.test(o.existing)) {
        const x = state.contracts.find((z) => z.id == o.contract.trim());
        if (!x) return bad('contract', 'Pick the contract for this customer');
        o.contract = x.id;
      } else {
        if (!o.phone) return bad('phone', 'Add a phone number for a new customer');
        if (!o.address) return bad('address', 'Add the address for a new customer');
        if (!o.town) return bad('town', 'Add the town for a new customer');
      }
      if (o.status == 'Complete' && !o.doneAt) return bad('doneAt', 'Enter the date the work was completed');
      if (o.status != 'Complete') o.doneAt = '';
      if (o.visit && o.status == 'Open') o.status = 'Booked';
      if (c) {
        Object.assign(c, o);
        audit('Service call edited', c.id, o.status);
      } else {
        const n = { id: nid('S', state.calls), ...o };
        state.calls.unshift(n);
        audit('Service call added', n.id, o.name);
      }
    },
    'Up to 8 photos. They print with the service report and stay on the call.',
    'lg'
  );
  setTimeout(() => {
    const g = $('#mbox .grid');
    if (g && !$('#dlCon'))
      g.insertAdjacentHTML(
        'beforeend',
        `<datalist id="dlCon">${state.contracts.map((x) => `<option value="${esc(x.id)}">${esc([x.name, x.town].filter(Boolean).join(', '))}</option>`).join('')}</datalist>`
      );
    const ex = $('#f_existing'),
      cw = $('#f_contract') && $('#f_contract').closest('.ff'),
      sync = () => {
        if (cw) cw.hidden = !/^Yes/.test(ex.value);
      };
    if (ex) {
      ex.addEventListener('change', sync);
      sync();
    }
  }, 20);
  setTimeout(() => {
    const ct = $('#f_contract');
    if (ct)
      ct.addEventListener('change', () => {
        const x = state.contracts.find((z) => z.id == ct.value.trim());
        if (!x) return;
        [
          ['name', x.name],
          ['phone', telOf(x)],
          ['email', mailOf(x)],
          ['address', addrOf(x)],
          ['town', x.town],
        ].forEach(([f, val]) => {
          const e = $('#f_' + f);
          if (e && !e.value && val) e.value = val;
        });
        const g = $('#f_guarantee');
        if (g && !g.value) g.value = 'Yes';
        toast('Filled in from contract ' + x.id);
      });
  }, 30);
}
export function reportCall(id, mode) {
  const c = state.calls.find((x) => x.id == id);
  if (!c) return;

  if (!mode) {
    docChoice('Service Call ' + c.id, ['reportCall', id, 'c'], ['reportCall', id, 'i']);
    return;
  }
  const when = c.visit ? fdl(c.visit) + (c.visitTime ? ' at ' + c.visitTime : '') : 'To be arranged',
    onsite = c.arrived ? c.arrived + (c.left ? ' to ' + c.left : '') : '';
  if (mode == 'c') {
    printDoc(
      'Service Visit Report',
      c.status == 'Complete' ? 'Work completed' : 'Visit ' + when,
      [
        ['Your contract', c.contract],
        ['Problem reported', c.issue],
        ['Type of problem', c.cat],
        ['Visit', when],
        ['Engineer', c.fitter || 'To be confirmed'],
        ['Work carried out', c.notes || 'To be completed on the visit'],
        ['Parts', c.parts],
        ['Another visit', c.followUp == 'Yes' ? c.followNote || 'Yes, we will be in touch to book it' : ''],
        ['Charge', +c.charge > 0 ? money(c.charge) : c.guarantee == 'Yes' ? 'Covered by your guarantee' : ''],
        ['Status', c.status],
      ],
      c.photos,
      {
        customer: { name: c.name, address: [c.address, c.town].filter(Boolean).join(', ') },
        kind: 'Service visit',
        ref: c.id,
        sign: true,
        thanks: 'If the problem comes back or anything else needs attention, call us and quote reference ' + c.id + '.',
      }
    );
    return;
  }
  printDoc(
    'Service Call ' + c.id,
    c.name + (c.town ? ' · ' + c.town : ''),
    [
      ['Phone', c.phone],
      ['Address', [c.address, c.town].filter(Boolean).join(', ')],
      ['Contract', c.contract],
      [
        'Call taken',
        [c.takenAt ? fd(c.takenAt) : '', c.takenTime, c.takenBy ? 'by ' + c.takenBy : ''].filter(Boolean).join(' '),
      ],
      ['Type of problem', c.cat],
      ['Problem', c.issue],
      ['Under guarantee', c.guarantee],
      ['Visit', when],
      ['Engineer', c.fitter],
      ['On site', onsite],
      ['Work done', c.notes],
      ['Parts', c.parts],
      ['Another visit', c.followUp == 'Yes' ? c.followNote || 'Yes' : c.followUp],
      ['Charge', +c.charge > 0 ? money(c.charge) : ''],
      ['Customer signed off', c.signed],
      ['Completed', c.doneAt ? fd(c.doneAt) : ''],
    ],
    c.photos,
    {
      kind: 'Service sheet',
      ref: c.id,
      kpis: [
        ['Priority', c.priority],
        ['Status', c.status],
        ['Engineer', c.fitter || '-'],
      ],
      sign: true,
      barcode: c.id,
    }
  );
}
/* printable list of every visit on a day, one table per engineer */
export function svcDaySheet(d) {
  d = SAFE.date(d) || today();
  const V = state.calls
    .filter((c) => c.visit == d && svcOpen(c))
    .sort((a, b) => String(a.visitTime || '99').localeCompare(String(b.visitTime || '99')));
  if (!V.length) {
    toast('No service visits booked for ' + fd(d));
    return;
  }
  const G = {};
  V.forEach((c) => {
    (G[c.fitter || 'No engineer yet'] = G[c.fitter || 'No engineer yet'] || []).push(c);
  });
  printDoc('Engineer Day Sheet', fdl(d), [], [], {
    kind: 'Day sheet',
    sections: Object.entries(G).map(([e, L]) => ({
      t: e + ' (' + L.length + ' visit' + (L.length > 1 ? 's' : '') + ')',
      kpis: [],
      bars: [],
      tables: [
        {
          t: 'Visits',
          h: ['Time', 'Ref', 'Customer', 'Address', 'Phone', 'Problem', 'Priority', 'Parts'],
          r: L.map((c) => [
            c.visitTime || '-',
            c.id,
            c.name,
            [c.address, c.town].filter(Boolean).join(', '),
            c.phone || '',
            c.issue,
            c.priority,
            c.parts || '',
          ]),
        },
      ],
    })),
  });
  audit('Day sheet printed', 'Service', fd(d));
}
export function svcReport() {
  const d = R.service();
  printDoc(
    'Service Report',
    new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    [],
    [],
    { kind: 'Report', sections: [d] }
  );
}
