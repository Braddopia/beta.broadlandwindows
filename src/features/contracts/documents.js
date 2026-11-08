/* features/contracts/documents: Printed contract documents: summary, job sheet, customer details and invoice. */
import { company } from '../../data/company.js';
import { fd, fdl, today } from '../../core/dates.js';
import { esc } from '../../core/dom.js';
import { money, sum } from '../../core/format.js';
import { audit } from '../../data/audit.js';
import { state } from '../../data/state.js';
import { CK } from '../../domain/checklists.js';
import { addrOf, mailOf, siteOf, telOf } from '../../domain/customers.js';
import { can } from '../../domain/permissions.js';
import { ctrList, ctrSteps, yn } from './contracts.js';
import { leadList } from '../leads/leads.js';
import { opSafe } from '../records/survey.js';
import { blankV, docChoice, printDoc } from '../../print/print.js';

export function reportContract(id, mode) {
  const c = state.contracts.find((x) => x.id == id);
  if (!c) return;
  if (!mode) {
    docChoice(
      'Contract ' + c.id,
      ['reportContract', id, 'c'],
      ['reportContract', id, 'i'],
      [
        [
          'Guarantee certificate',
          'The 10 year guarantee with your terms, filled in with this customer, address, contract number and date.',
          ['docOpen', 'guarantee', 'c:' + String(id).replace(/[^\w-]/g, '')],
        ],
        [
          'Fitting job sheet',
          'For the fitters: site address, access, contacts, every opening and the sign-off.',
          ['reportJob', id],
        ],
        ['Customer details', 'All phone numbers, emails and addresses on one page.', ['reportCust', 'contract', id]],
      ]
    );
    return;
  }
  const bal = c.value - c.paid,
    addr = c.address || c.town || '',
    pays = c.pay || [],
    payT = pays.length
      ? {
          h: ['Date', 'Method', 'Amount'],
          r: pays.map((p) => [fdl(p.date), p.method || '', money(p.amt)]),
          foot: ['Total paid', '', money(sum(pays, (p) => p.amt))],
        }
      : null;
  if (mode == 'c') {
    printDoc(
      'Contract ' + c.id,
      c.product,
      [
        ['Installation address', addr],
        ['Survey', c.survey ? fdl(c.survey) : ''],
        ['Fitting date', c.fit ? fdl(c.fit) : 'To be confirmed'],
        ['Fitting team', c.fitter || 'To be confirmed'],
      ],
      [],
      {
        customer: { name: c.name, address: addr, contact: c.soldBy && c.soldBy != 'Unassigned' ? c.soldBy : '' },
        kind: 'Contract summary',
        ref: c.id,
        kpis: [
          ['Contract value', money(c.value)],
          ['Paid to date', money(c.paid)],
          ['Balance', money(bal)],
        ],
        money: { total: c.value, paid: c.paid },
        steps: ctrSteps(c),
        tables: payT ? [{ t: 'Payments received', ...payT }] : [],
        thanks: bal > 0 ? 'The balance of ' + money(bal) + ' is due on completion.' : 'Your contract is fully paid.',
      }
    );
    return;
  }
  const Ad = can('money'),
    todo = CK.filter((k) => !(c.chk || {})[k]),
    mg = c.cost && c.value ? Math.round((100 * (c.value - c.cost)) / c.value) + '%' : '';
  printDoc(
    'Contract ' + c.id,
    c.name + (c.product ? ' · ' + c.product : ''),
    [
      ['Phone', telOf(c)],
      ['Email', mailOf(c)],
      ['Address', addr],
      ['Stage', c.stage],
      ['Sold by', c.soldBy],
      ['Survey', c.survey ? fdl(c.survey) : ''],
      ['Ordered', c.order ? fdl(c.order) : ''],
      ['Fitting', c.fit ? fdl(c.fit) : ''],
      ['Fitter', c.fitter],
      ...(Ad ? [['Job cost', c.cost ? money(c.cost) : '']] : []),
      ['Still to do', todo.length ? todo.join(', ') : 'Checklist complete'],
      ['Notes', c.notes],
    ],
    c.photos,
    {
      kind: 'Contract sheet',
      ref: c.id,
      kpis: [
        ['Value', money(c.value)],
        ['Paid', money(c.paid)],
        ['Balance', money(bal)],
        ...(Ad && mg ? [['Margin', mg]] : []),
      ],
      money: { total: c.value, paid: c.paid },
      steps: ctrSteps(c),
      tables: payT ? [{ t: 'Payments', ...payT }] : [],
      barcode: c.id,
    }
  );
}
export function custGroups(r) {
  const inv = r.invSame == 'Different' ? [r.invAddr, r.invPc].filter(Boolean).join(' ') : 'Same as home';
  return [
    {
      t: 'Customer',
      r: [
        ['Name', [r.title, r.name].filter(Boolean).join(' ')],
        ['Company', r.company],
        ['Dear', r.salutation],
        ['Best contact', r.prefContact],
      ],
    },
    {
      t: 'Phone numbers',
      r: [
        ['Mobile', r.mob1],
        ['Mobile 2', r.mob2],
        ['Home', r.home1],
        ['Home 2', r.home2],
        ['Work', r.work],
        ...(!r.mob1 && !r.home1 && !r.work && r.phone ? [['Phone', r.phone]] : []),
      ],
    },
    {
      t: 'Email',
      r: [
        ['Email', r.email1 || r.email],
        ['Email 2', r.email2],
      ],
    },
    {
      t: 'Home address',
      r: [
        ['Address', r.homeAddr || r.address],
        ['Town', r.town],
        ['Postcode', r.homePc],
      ],
    },
    {
      t: 'Installation address',
      r: [
        ['Address', siteOf(r)],
        ['Access and parking', r.siteAccess],
      ],
    },
    { t: 'Invoice address', r: [['Address', inv]] },
    {
      t: 'Marketing consent',
      r: [
        ['Email', yn(r.gdprEmail)],
        ['Text', yn(r.gdprSms)],
        ['Phone', yn(r.gdprPhone)],
        ['Post', yn(r.gdprPost)],
        ['Given on', r.gdprDate ? fdl(r.gdprDate) : ''],
        ['How', r.gdprHow],
      ],
    },
  ];
}
export function reportCust(kind, id) {
  const r = kind == 'lead' ? state.leads.find((x) => x.id == id) : state.contracts.find((x) => x.id == id);
  if (!r) return;
  printDoc(
    'Customer details',
    [r.title, r.name].filter(Boolean).join(' ') + (r.company ? ' · ' + r.company : ''),
    [],
    [],
    {
      kind: (kind == 'lead' ? 'Lead ' : 'Contract ') + r.id,
      ref: r.id,
      groups: custGroups(r),
      post:
        kind == 'contract'
          ? `<h3>Job</h3><div class="dg one">${[
              ['Work', r.product],
              ['Stage', r.stage],
              ['Fitting', r.fit ? fdl(r.fit) : ''],
              ['Fitter', r.fitter],
              ['Salesperson', r.soldBy],
            ]
              .filter((x) => !blankV(x[1]))
              .map((x) => `<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`)
              .join('')}</div>`
          : '',
    }
  );
}
export function contactList(kind) {
  const L = kind == 'lead' ? leadList() : ctrList(),
    ph = (r) => [r.mob1, r.mob2, r.home1, r.home2, r.work].filter(Boolean).join(' / ') || r.phone || '';
  printDoc(
    (kind == 'lead' ? 'Lead' : 'Customer') + ' contact list',
    L.length + ' ' + (kind == 'lead' ? 'leads' : 'contracts') + ' in the current view',
    [],
    [],
    {
      kind: 'Contact list',
      tables: [
        {
          t: 'Contacts',
          h: ['Ref', 'Name', 'Phone numbers', 'Email', 'Installation address'],
          r: L.map((r) => [
            r.id,
            [r.title, r.name].filter(Boolean).join(' '),
            ph(r),
            [r.email1 || r.email, r.email2].filter(Boolean).join(' / '),
            siteOf(r),
          ]),
        },
      ],
    }
  );
}
export function reportJob(id) {
  const c = state.contracts.find((x) => x.id == id);
  if (!c) return;
  const O = c.openings || [],
    L = c.lines || [],
    bal = c.value - c.paid,
    ph = [c.mob1, c.mob2, c.home1, c.home2, c.work].filter(Boolean),
    bad = O.filter(opSafe).length;
  printDoc('Fitting job sheet', [c.title, c.name].filter(Boolean).join(' ') + ' · ' + siteOf(c), [], c.photos, {
    kind: 'Job ' + c.id,
    ref: c.id,
    kpis: [
      [
        'Fitting',
        c.fit
          ? new Date(c.fit + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          : 'Not booked',
      ],
      ['Team', c.fitter || '-'],
      ['Openings', O.length || '-'],
      ['To collect', bal > 0 ? money(bal) : 'Paid'],
    ],
    groups: [
      {
        t: 'On site',
        r: [
          ['Address', siteOf(c)],
          ['Access and parking', c.siteAccess],
          ['Work', c.product],
        ],
      },
      {
        t: 'Contact',
        r: [
          ['Name', [c.title, c.name].filter(Boolean).join(' ')],
          ...ph.map((p, i) => ['Phone' + (i ? ' ' + (i + 1) : ''), p]),
          ['Email', c.email1 || c.email],
        ],
      },
    ],
    pre:
      (c.flash ? `<div class="call"><b>Note</b>${esc(c.flash)}</div>` : '') +
      (c.fitNotes ? `<div class="call"><b>Fitting notes</b>${esc(c.fitNotes)}</div>` : '') +
      (bad
        ? `<div class="call"><b>Safety glass</b>${bad} opening${bad == 1 ? '' : 's'} marked below need toughened or laminated glass. Check before fitting.</div>`
        : ''),
    tables: [
      ...(O.length
        ? [
            {
              t: 'Survey schedule',
              h: ['Ref', 'Room', 'Type', 'W x H mm', 'Glass', 'Fire escape', 'Vents', 'Colour', 'Notes'],
              r: O.map((x) => [
                x.ref,
                x.room,
                x.type,
                (x.w || '?') + ' x ' + (x.h || '?'),
                opSafe(x) ? 'Needs safety glass (' + (x.glaz || 'none') + ')' : x.glaz,
                x.esc,
                x.vents,
                x.col,
                x.notes,
              ]),
            },
          ]
        : []),
      ...(L.length
        ? [
            {
              t: 'Products',
              h: ['Code', 'Product', 'Qty', 'Location'],
              r: L.map((x) => [x.code, x.name, x.qty, x.loc]),
            },
          ]
        : []),
      {
        t: 'Sign-off',
        h: ['Check', 'Done'],
        r: [
          'Old frames removed and disposed of',
          'Frames fixed, level and sealed',
          'Glass and beads correct, safety glass where needed',
          'Trickle vents and fire escape hinges fitted',
          'All sashes and doors open, close and lock',
          'Keys handed over',
          'Site cleaned',
          'Customer shown how to use and care for products',
        ].map((x) => [x, '☐']),
      },
    ],
    sign: true,
    barcode: c.id,
  });
}
/* a customer invoice from the contract: VAT split, payments so far, balance and how to pay */
export function invoicePrint(id) {
  const c = state.contracts.find((x) => x.id == id);
  if (!c) return;
  const val = +c.value || 0,
    paid = +c.paid || 0,
    rate = +(c.vatRate ?? company.vat ?? 20) || 0,
    vat = Math.round((val - val / (1 + rate / 100)) * 100) / 100,
    no = c.invoiceNo || String(company.invPrefix || 'INV-') + c.id,
    P = c.pay || [];
  const howPay = [
    company.bank ? 'Account name ' + company.bank : '',
    company.sort ? 'sort code ' + company.sort : '',
    company.acct ? 'account ' + company.acct : '',
  ]
    .filter(Boolean)
    .join(', ');
  printDoc(
    'Invoice ' + no,
    c.product || '',
    [
      ['Invoice number', no],
      ['Invoice date', fdl(c.invoiceDate || today())],
      ['Contract', c.id],
      ['Work', c.product],
      ['Installation address', siteOf(c) || addrOf(c)],
      ['VAT number', company.vatNo],
    ],
    [],
    {
      customer: { name: [c.title, c.name].filter(Boolean).join(' '), address: addrOf(c) },
      kind: 'Invoice',
      ref: no,
      kpis: [
        ['Total (inc VAT)', money(val)],
        ['VAT at ' + rate + '%', money(vat)],
        ['Paid so far', money(paid)],
        ['Balance due', money(Math.max(0, val - paid))],
      ],
      money: { total: val, paid },
      tables: P.length
        ? [
            {
              t: 'Payments received',
              h: ['Date', 'Paid by', 'What for', 'Amount'],
              r: P.map((p) => [fd(p.date), p.method || '', p.kind || '', money(p.amt)]),
              foot: ['', '', 'Total paid', money(sum(P, (p) => p.amt))],
            },
          ]
        : [],
      thanks:
        val - paid > 0
          ? 'Please pay the balance of ' +
            money(val - paid) +
            (company.terms ? ' within ' + company.terms + ' days of fitting' : '') +
            (howPay ? ' by bank transfer (' + howPay + ')' : '') +
            ', quoting ' +
            no +
            '. '
          : 'This invoice is paid in full. Thank you. ',
    }
  );
  audit('Invoice printed', c.id, no);
}
