/* features/reports/reports: The Reports page. */
import { MORE } from './more.js';
import { CSTAGES, SOURCES, STAGES } from '../../config/constants.js';
import { onClick } from '../../core/actions.js';
import { addDays, fd, today } from '../../core/dates.js';
import { esc } from '../../core/dom.js';
import { csvDownload } from '../../ui/download.js';
import { grp, m0, money, pc, sum } from '../../core/format.js';
import { state } from '../../data/state.js';
import { DWIN, delWin } from '../../domain/deliveries.js';
import { allowTot, hu } from '../../domain/holidays.js';
import { allLeads } from '../../domain/leads.js';
import { callsOf, holOn, jobsOf, staffName } from '../../domain/people.js';
import { colTxt, hasLoc, isLow, products, stt, unitOf } from '../../domain/stock.js';
import { can } from '../../domain/permissions.js';
import { DH, delRows } from '../deliveries/deliveries.js';
import { DOCS } from '../documents/documents.js';
import { printDoc } from '../../print/print.js';
import { stTag } from '../../ui/components/tags.js';
import { uiState } from '../../ui/ui-state.js';

/* ---------------- reports page ---------------- */
export const bar = (t, rows) => ({ t, rows });
export const R = {
  summary() {
    const L = allLeads(),
      open = L.filter((l) => !['Won', 'Lost'].includes(l.stage)),
      won = L.filter((l) => l.stage == 'Won').length,
      lost = L.filter((l) => l.stage == 'Lost').length,
      C = state.contracts,
      live = C.filter((c) => c.stage != 'Complete'),
      oc = state.calls.filter((c) => c.status != 'Complete'),
      P = products(),
      td = today(),
      att = [],
      Ad = can('money');
    oc.filter((c) => c.priority == 'Urgent').forEach((c) =>
      att.push(['Service', c.name + ' (' + c.id + ')', c.issue, c.visit ? fd(c.visit) : 'No visit'])
    );
    state.deliveries
      .filter((d) => d.status != 'Received' && d.due <= td)
      .forEach((d) => att.push(['Delivery', d.supplier, d.items, d.due < td ? 'Overdue ' + fd(d.due) : 'Due today']));
    P.filter(isLow).forEach((r) =>
      att.push([
        'Stock',
        r.item + ' ' + r.length + ' ' + colTxt(r),
        r.stock + ' ' + unitOf(r) + ' left',
        hasLoc(r) ? r.location : '',
      ])
    );
    state.items
      .filter((r) => r.type == 'request' && r.reqStatus == 'Pending')
      .forEach((r) =>
        att.push(['Request', r.ord + ' ' + r.item, r.qty + ' ' + unitOf(r) + ' by ' + r.user, 'Awaiting approval'])
      );
    if (Ad) {
      C.filter((c) => c.value - c.paid > 0 && c.fit && c.fit >= td && c.fit <= addDays(7)).forEach((c) =>
        att.push(['Payment', c.name + ' (#' + c.id + ')', 'Balance ' + m0(c.value - c.paid) + ' before fit', fd(c.fit)])
      );
      state.hols
        .filter((h) => h.status == 'Pending')
        .forEach((h) => att.push(['Holiday', staffName(h.sid), fd(h.from) + ' to ' + fd(h.to), 'Awaiting approval']));
      state.fin
        .filter((b) => b.status == 'Unpaid' && b.due < td)
        .forEach((b) => att.push(['Bill', b.payee, m0(b.amount) + ' ' + b.ref, 'Overdue ' + fd(b.due)]));
    }
    const k = [
      ['Open leads', open.length],
      ['Pipeline', m0(sum(open, (l) => l.value))],
      ['Win rate', pc(won, won + lost)],
      ['Live contracts', live.length],
      ['Open service calls', oc.length],
      ['Stock value', m0(sum(P, (r) => r.stock * r.cost))],
    ];
    if (Ad)
      k.push(['Still to collect', m0(sum(C, (c) => c.value - c.paid))], ['Cash collected', m0(sum(C, (c) => c.paid))]);
    return {
      t: 'Summary',
      kpis: k,
      bars: [
        bar(
          'Pipeline value by stage',
          STAGES.map((s) => [
            s,
            sum(
              L.filter((l) => l.stage == s),
              (l) => l.value
            ),
            m0,
          ])
        ),
        bar(
          'Contracts by stage',
          CSTAGES.map((s) => [s, C.filter((c) => c.stage == s).length, String])
        ),
      ],
      tables: [{ t: 'Needs attention', h: ['Area', 'Item', 'Detail', 'When'], r: att }],
    };
  },
  sales() {
    const L = allLeads(),
      open = L.filter((l) => !['Won', 'Lost'].includes(l.stage)),
      won = L.filter((l) => l.stage == 'Won'),
      lost = L.filter((l) => l.stage == 'Lost');
    const src = SOURCES.map((s) => {
      const x = L.filter((l) => l.source == s),
        w = x.filter((l) => l.stage == 'Won').length,
        lo = x.filter((l) => l.stage == 'Lost').length;
      return [s, x.length, w, lo, m0(sum(x, (l) => l.value)), pc(w, w + lo)];
    });
    return {
      t: 'Sales',
      kpis: [
        ['Total leads', L.length],
        ['Open', open.length],
        ['Pipeline value', m0(sum(open, (l) => l.value))],
        ['Won', won.length, m0(sum(won, (l) => l.value))],
        ['Lost', lost.length, m0(sum(lost, (l) => l.value))],
        ['Win rate', pc(won.length, won.length + lost.length)],
        ['Average lead value', m0(L.length ? sum(L, (l) => l.value) / L.length : 0)],
      ],
      bars: [
        bar(
          'Value by stage',
          STAGES.map((s) => [
            s,
            sum(
              L.filter((l) => l.stage == s),
              (l) => l.value
            ),
            m0,
          ])
        ),
        bar(
          'Leads by source',
          SOURCES.map((s) => [s, L.filter((l) => l.source == s).length, String])
        ),
        bar(
          'Quoted value by source',
          SOURCES.map((s) => [
            s,
            sum(
              L.filter((l) => l.source == s),
              (l) => l.value
            ),
            m0,
          ])
        ),
      ],
      tables: [
        { t: 'Source performance', h: ['Source', 'Leads', 'Won', 'Lost', 'Quoted value', 'Conversion'], r: src },
        {
          t: 'Lead book',
          h: ['Ref', 'Name', 'Town', 'Product', 'Source', 'Stage', 'Value', 'Next step'],
          r: [...L]
            .sort((a, b) => b.value - a.value)
            .map((l) => [l.id, l.name, l.town, l.product, l.source, l.stage, m0(l.value), l.next || '']),
        },
        {
          t: 'Leads by town',
          h: ['Town', 'Leads', 'Value'],
          r: grp(L, (l) => l.town)
            .map(([t, x]) => [t, x.length, m0(sum(x, (l) => l.value))])
            .sort((a, b) => b[1] - a[1]),
        },
      ],
    };
  },
  contracts() {
    const C = state.contracts,
      Ad = can('money'),
      v = sum(C, (c) => c.value),
      p = sum(C, (c) => c.paid),
      wc = C.filter((c) => c.cost),
      mg = sum(wc, (c) => c.value - c.cost) / (sum(wc, (c) => c.value) || 1);
    const k = [
      ['Contracts', C.length],
      ['Live', C.filter((c) => c.stage != 'Complete').length],
      ['Total value', m0(v)],
      ['Average value', m0(C.length ? v / C.length : 0)],
    ];
    if (Ad)
      k.push(
        ['Collected', m0(p), pc(p, v)],
        ['Outstanding', m0(v - p)],
        ['Average margin', wc.length ? Math.round(mg * 100) + '%' : 'n/a']
      );
    return {
      t: 'Contracts',
      kpis: k,
      bars: [
        bar(
          'Value by stage',
          CSTAGES.map((s) => [
            s,
            sum(
              C.filter((c) => c.stage == s),
              (c) => c.value
            ),
            m0,
          ])
        ),
        bar(
          'Value by fitter',
          grp(C, (c) => c.fitter).map(([f, x]) => [f, sum(x, (c) => c.value), m0])
        ),
        ...(Ad
          ? [
              bar(
                'Outstanding balance by customer',
                [...C]
                  .filter((c) => c.value > c.paid)
                  .sort((a, b) => b.value - b.paid - (a.value - a.paid))
                  .slice(0, 8)
                  .map((c) => [c.name, c.value - c.paid, m0])
              ),
            ]
          : []),
      ],
      tables: [
        {
          t: 'Contract book',
          h: [
            'Ref',
            'Customer',
            'Town',
            'Product',
            'Stage',
            'Fitter',
            'Fit date',
            'Value',
            ...(Ad ? ['Paid', 'Balance', 'Paid %', 'Margin'] : []),
          ],
          r: C.map((c) => [
            c.id,
            c.name,
            c.town,
            c.product,
            c.stage,
            c.fitter || '',
            c.fit ? fd(c.fit) : 'Not set',
            m0(c.value),
            ...(Ad
              ? [
                  m0(c.paid),
                  m0(c.value - c.paid),
                  pc(c.paid, c.value),
                  c.cost && c.value ? Math.round((100 * (c.value - c.cost)) / c.value) + '%' : 'n/a',
                ]
              : []),
          ]),
        },
        {
          t: 'By town',
          h: ['Town', 'Contracts', 'Value'],
          r: grp(C, (c) => c.town).map(([t, x]) => [t, x.length, m0(sum(x, (c) => c.value))]),
        },
      ],
    };
  },
  service() {
    const C = state.calls,
      td = today(),
      o = C.filter((c) => c.status != 'Complete'),
      done = C.filter((c) => c.status == 'Complete'),
      rep = grp(C, (c) => c.name).filter(([, x]) => x.length > 1);
    const days = done
        .filter((c) => c.takenAt && c.doneAt)
        .map((c) => (new Date(c.doneAt) - new Date(c.takenAt)) / 864e5),
      avg = days.length ? Math.round((sum(days, (x) => x) / days.length) * 10) / 10 : null;
    return {
      t: 'Service calls',
      kpis: [
        ['Total calls', C.length],
        ['Open', o.length],
        ['Urgent open', o.filter((c) => c.priority == 'Urgent').length],
        ['Visits booked', o.filter((c) => c.visit && c.visit >= td).length],
        ['Overdue visits', o.filter((c) => c.visit && c.visit < td).length],
        ['Not booked yet', o.filter((c) => !c.visit).length],
        ['Awaiting parts', o.filter((c) => c.status == 'Awaiting parts').length],
        ['Average days to fix', avg == null ? '-' : String(avg)],
        ['Charged to customers', m0(sum(C, (c) => +c.charge || 0))],
        ['Repeat customers', rep.length],
      ],
      bars: [
        bar(
          'Calls by type of problem',
          grp(C, (c) => c.cat || 'Not set').map(([s, x]) => [s, x.length, String])
        ),
        bar(
          'Open calls by engineer',
          grp(o, (c) => c.fitter || 'Not assigned').map(([f, x]) => [f, x.length, String])
        ),
        bar(
          'Calls by priority',
          ['Urgent', 'Normal', 'Low'].map((p) => [p, C.filter((c) => c.priority == p).length, String])
        ),
        bar(
          'Calls by status',
          grp(C, (c) => c.status).map(([s, x]) => [s, x.length, String])
        ),
        bar(
          'Calls taken by',
          grp(C, (c) => c.takenBy || 'Not recorded').map(([s, x]) => [s, x.length, String])
        ),
      ],
      tables: [
        {
          t: 'Open calls',
          h: ['Ref', 'Customer', 'Town', 'Problem', 'Priority', 'Status', 'Visit', 'Engineer'],
          r: o.map((c) => [
            c.id,
            c.name,
            c.town,
            c.issue,
            c.priority,
            c.status,
            c.visit ? fd(c.visit) : 'Not booked',
            c.fitter || '',
          ]),
        },
        {
          t: 'Awaiting parts',
          h: ['Ref', 'Customer', 'Parts', 'Engineer'],
          r: o.filter((c) => c.status == 'Awaiting parts').map((c) => [c.id, c.name, c.parts || '', c.fitter || '']),
        },
        {
          t: 'Needs another visit',
          h: ['Ref', 'Customer', 'What for', 'Engineer'],
          r: C.filter((c) => c.followUp == 'Yes').map((c) => [c.id, c.name, c.followNote || '', c.fitter || '']),
        },
        {
          t: 'Service log',
          h: ['Ref', 'Customer', 'Town', 'Problem', 'Taken by', 'Priority', 'Status', 'Visit', 'Engineer', 'Contract'],
          r: C.map((c) => [
            c.id,
            c.name,
            c.town,
            c.issue,
            c.takenBy || '',
            c.priority,
            c.status,
            c.visit ? fd(c.visit) : 'Not booked',
            c.fitter || '',
            c.contract || '',
          ]),
        },
        {
          t: 'Calls by town',
          h: ['Town', 'Calls', 'Open'],
          r: grp(C, (c) => c.town).map(([t, x]) => [t, x.length, x.filter((c) => c.status != 'Complete').length]),
        },
      ],
    };
  },
  stock() {
    const P = products(),
      mv = state.items,
      Ad = can('money');
    return {
      t: 'Stock',
      kpis: [
        ['Stock lines', P.length],
        ['Units in stock', sum(P, (r) => r.stock)],
        ...(Ad ? [['Stock value', m0(sum(P, (r) => r.stock * r.cost))]] : []),
        ['Low stock lines', P.filter(isLow).length],
        ['Movements logged', mv.length],
        ['Pending requests', mv.filter((r) => r.type == 'request' && r.reqStatus == 'Pending').length],
      ],
      bars: [
        ...(Ad
          ? [
              bar(
                'Value by item',
                grp(P, (r) => r.item)
                  .map(([i, x]) => [i, sum(x, (r) => r.stock * r.cost), m0])
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
              ),
            ]
          : []),
        bar(
          'Movements by person',
          grp(mv, (r) => r.user)
            .map(([u, x]) => [u, x.length, String])
            .sort((a, b) => b[1] - a[1])
        ),
      ],
      tables: [
        {
          t: 'Stock valuation',
          h: [
            'ID',
            'Item',
            'Length',
            'Colours',
            'Unit',
            'Location',
            'In stock',
            ...(Ad ? ['Cost each', 'Value'] : []),
            'Status',
          ],
          r: P.map((r) => [
            r.pid,
            r.item,
            r.length,
            colTxt(r),
            unitOf(r),
            r.location || '',
            r.stock,
            ...(Ad ? [money(r.cost), money(r.stock * r.cost)] : []),
            stt(r)[0],
          ]),
        },
        {
          t: 'Movements by person',
          h: ['Person', 'Added', 'Removed', 'Requested', 'Units moved'],
          r: grp(mv, (r) => r.user).map(([u, x]) => {
            const c = (t) => x.filter((r) => r.type == t).length;
            return [u, c('add'), c('remove'), c('request'), sum(x, (r) => r.qty)];
          }),
        },
        {
          t: 'Recent movements',
          h: ['Time', 'Type', 'Order No.', 'Item', 'Length', 'Qty', 'Person'],
          r: mv
            .slice(0, 40)
            .map((r) => [r.time, r.type, r.ord || '', r.item, r.length, r.qty + ' ' + unitOf(r), r.user]),
        },
      ],
    };
  },
  finance() {
    const td = today(),
      bills = state.fin,
      un = bills.filter((b) => b.status == 'Unpaid'),
      od = un.filter((b) => b.due < td),
      C = state.contracts,
      owed = sum(C, (c) => c.value - c.paid),
      pr = sum(state.staff, (s) => s.salary / 12),
      d7 = addDays(7),
      d14 = addDays(14),
      bk = [
        ['Overdue', un.filter((b) => b.due < td)],
        ['Due in 7 days', un.filter((b) => b.due >= td && b.due <= d7)],
        ['Due in 8 to 14 days', un.filter((b) => b.due > d7 && b.due <= d14)],
        ['Due later', un.filter((b) => b.due > d14)],
      ];
    return {
      t: 'Finance',
      kpis: [
        ['Owed by customers', m0(owed)],
        ['Bills unpaid', m0(sum(un, (b) => b.amount))],
        ['Overdue bills', od.length, m0(sum(od, (b) => b.amount))],
        ['Monthly payroll', m0(pr)],
        ['Net outlook', m0(owed - sum(un, (b) => b.amount) - pr)],
        [
          'Paid bills',
          m0(
            sum(
              bills.filter((b) => b.status == 'Paid'),
              (b) => b.amount
            )
          ),
        ],
      ],
      bars: [
        bar(
          'Bills by due window',
          bk.map(([n, x]) => [n, sum(x, (b) => b.amount), m0])
        ),
        bar(
          'Receivables by customer',
          C.filter((c) => c.value > c.paid).map((c) => [c.name, c.value - c.paid, m0])
        ),
        bar(
          'Payroll by person (monthly)',
          state.staff.map((s) => [s.name, s.salary / 12, m0])
        ),
      ],
      tables: [
        {
          t: 'Bills',
          h: ['Payee', 'Type', 'Ref', 'Job', 'Due', 'Amount', 'Status'],
          r: [...bills]
            .sort((a, b) => a.due.localeCompare(b.due))
            .map((b) => [b.payee, b.type, b.ref, b.job || '', fd(b.due), money(b.amount), b.status]),
        },
        {
          t: 'Receivables',
          h: ['Contract', 'Customer', 'Stage', 'Value', 'Paid', 'Balance'],
          r: C.filter((c) => c.value > c.paid).map((c) => [
            c.id,
            c.name,
            c.stage,
            money(c.value),
            money(c.paid),
            money(c.value - c.paid),
          ]),
        },
        {
          t: 'Payroll',
          h: ['Employee', 'Role', 'Annual', 'Monthly'],
          r: state.staff.map((s) => [s.name, s.role, money(s.salary), money(s.salary / 12)]),
        },
      ],
    };
  },
  deliveries() {
    const D = state.deliveries,
      out = D.filter((x) => x.status != 'Received');
    return {
      t: 'Deliveries',
      kpis: DWIN.map(([k, n]) => [n, D.filter((x) => delWin(x) == k).length]),
      bars: [
        bar(
          'Outstanding by supplier',
          [...new Set(out.map((x) => x.supplier))].map((s) => [s, out.filter((x) => x.supplier == s).length, String])
        ),
        bar(
          'Outstanding by when due',
          DWIN.filter((x) => x[0] != 'rec').map(([k, n]) => [n, out.filter((x) => delWin(x) == k).length, String])
        ),
      ],
      tables: DWIN.map(([k, n]) => ({ t: n, h: DH, r: delRows(D.filter((x) => delWin(x) == k)) })).filter(
        (x) => x.r.length
      ),
    };
  },
  people() {
    const td = today(),
      H = state.hols.filter((h) => h.status == 'Approved'),
      mo = Array(12).fill(0),
      y = new Date().getFullYear();
    H.forEach((h) => {
      const d = new Date(h.from + 'T00:00'),
        e = new Date(h.to + 'T00:00');
      while (d <= e) {
        const g = d.getDay();
        if (g && g < 6 && d.getFullYear() == y) mo[d.getMonth()]++;
        d.setDate(d.getDate() + 1);
      }
    });
    return {
      t: 'People and holidays',
      kpis: [
        ['Headcount', state.staff.length],
        ['Off today', state.staff.filter((s) => holOn(s.id, td)).length],
        ['Days booked', sum(H, (h) => h.days)],
        ['Pending requests', state.hols.filter((h) => h.status == 'Pending').length],
        ['Jobs on hand', sum(state.staff, (s) => jobsOf(s).length)],
        ['Open calls', sum(state.staff, (s) => callsOf(s).length)],
      ],
      bars: [
        bar(
          'Holiday days by month (' + y + ')',
          mo.map((n, i) => [new Date(y, i, 1).toLocaleDateString('en-GB', { month: 'long' }), n, String])
        ),
        bar(
          'Jobs on hand per person',
          state.staff.map((s) => [s.name, jobsOf(s).length, String])
        ),
      ],
      tables: [
        {
          t: 'Team',
          h: ['Name', 'Role', 'Team', 'Allowance', 'Booked', 'Pending', 'Left', 'Jobs', 'Open calls'],
          r: state.staff.map((s) => {
            const t = hu(s),
              p = sum(
                state.hols.filter((h) => h.sid == s.id && h.status == 'Pending'),
                (h) => h.days
              );
            return [
              s.name,
              s.role,
              s.team || '',
              allowTot(s),
              t,
              p,
              allowTot(s) - t,
              jobsOf(s).length,
              callsOf(s).length,
            ];
          }),
        },
        {
          t: 'Holiday bookings',
          h: ['Name', 'From', 'To', 'Days', 'Status', 'Note'],
          r: [...state.hols]
            .sort((a, b) => a.from.localeCompare(b.from))
            .map((h) => [staffName(h.sid), fd(h.from), fd(h.to), h.days, h.status, h.note || '']),
        },
      ],
    };
  },
};
/** a tab's numbers, charts and tables, with the extra ones from more.js */
export function reportData(T) {
  const d = R[T]();
  if (MORE[T]) MORE[T](d);
  return d;
}
export const TABS = () => [
  ['summary', 'Summary'],
  ['sales', 'Sales'],
  ['contracts', 'Contracts'],
  ['service', 'Service'],
  ['deliveries', 'Deliveries'],
  ['stock', 'Stock'],
  ...(can('money') ? [['finance', 'Finance']] : []),
  ['people', 'People'],
  ['docs', 'Documents'],
];
export const isNum = (v) => /^[£\d.,%\-\s]+$/.test(String(v)) && String(v).trim() != '';
export function vReports() {
  if (uiState.rep.t == 'finance' && !can('money')) uiState.rep.t = 'summary';
  const T = uiState.rep.t;
  let body;
  if (T == 'docs')
    body = `<div class="panel" style="margin-bottom:1rem"><h2>Customer Documents</h2><div class="docs">${Object.entries(
      DOCS
    )
      .map(
        ([k, v]) =>
          `<button class="dc" ${onClick('docOpen', k)}><b>${esc(v[0])}</b><span class="muted">${esc(v[1])}</span></button>`
      )
      .join(
        ''
      )}</div></div><div class="panel" style="padding:0"><h2 style="padding:1rem 1.1rem 0">Issue A Guarantee For A Contract</h2><div class="tw" style="border:0;box-shadow:none"><table><thead><tr><th>Ref</th><th>Customer</th><th class="c-sm">Product</th><th>Stage</th><th class="ac"></th></tr></thead><tbody>${[
      ...state.contracts,
    ]
      .sort((a, b) => ['Fitted', 'Complete'].includes(b.stage) - ['Fitted', 'Complete'].includes(a.stage))
      .map(
        (c) =>
          `<tr><td><b>${esc(c.id)}</b></td><td>${esc(c.name)}</td><td class="c-sm">${esc(c.product)}</td><td>${stTag(c.stage)}</td><td class="ac"><div class="acts r"><button class="mini pri" ${onClick('docOpen', 'guarantee', 'c:' + c.id)}>Guarantee</button><button class="mini" ${onClick('docOpen', 'completion', 'c:' + c.id)}>Handover</button><button class="mini" ${onClick('docOpen', 'letter', 'c:' + c.id)}>Letter</button></div></td></tr>`
      )
      .join('')}</tbody></table></div></div>`;
  else {
    const d = reportData(T);
    body =
      `<div class="kpis">${d.kpis.map((k) => `<div class="kpi"><small>${esc(k[0])}</small><b>${esc(k[1])}</b>${k[2] ? `<span class="ksub">${esc(k[2])}</span>` : ''}</div>`).join('')}</div>` +
      (d.bars.length
        ? `<div class="two" style="margin-bottom:1rem">${d.bars
            .map((b) => {
              const mx = Math.max(1, ...b.rows.map((r) => +r[1] || 0));
              return `<div class="panel"><h2>${esc(b.t)}</h2>${b.rows.map((r) => `<div class="hb"><span>${esc(r[0])}</span><div class="bar2"><i style="width:${Math.round((100 * (+r[1] || 0)) / mx)}%"></i></div><b>${esc(r[2](r[1]))}</b></div>`).join('') || '<p class="empty">No data.</p>'}</div>`;
            })
            .join('')}</div>`
        : '') +
      d.tables
        .map(
          (t) =>
            `<div class="panel" style="margin-bottom:1rem;padding:0"><h2 style="padding:1rem 1.1rem 0">${esc(t.t)} <span class="muted" style="font:500 .78rem var(--body)">${t.r.length} row${t.r.length == 1 ? '' : 's'}</span></h2><div class="tw" style="border:0;box-shadow:none"><table><thead><tr>${t.h.map((h, i) => `<th class="${t.r.length && isNum(t.r[0][i]) ? 'n' : ''}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.r.map((r) => `<tr>${r.map((v) => `<td class="${isNum(v) ? 'n' : ''}">${esc(v)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${t.h.length}" class="muted">Nothing to show.</td></tr>`}</tbody></table></div></div>`
        )
        .join('');
  }
  return `<div class="head"><div><h1>Reports</h1><span class="muted">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div><div class="tools"><button class="btn ghost" ${onClick('repPrint', false)}>Print this report</button><button class="btn ghost" data-act="repCsv">Export CSV</button><button class="btn" ${onClick('repPrint', true)}>Full management report</button></div></div><div class="chips">${TABS()
    .map(([k, n]) => `<button class="chip ${k == T ? 'on' : ''}" ${onClick('setUI', 'rep.t', k)}>${n}</button>`)
    .join('')}</div>${body}`;
}
export function repPrint(all) {
  const ks = all
      ? TABS()
          .map((t) => t[0])
          .filter((k) => k != 'docs')
      : [uiState.rep.t == 'docs' ? 'summary' : uiState.rep.t],
    ds = ks.map((k) => reportData(k));
  printDoc(
    all ? 'Management Report' : ds[0].t + ' Report',
    all ? 'Sales, contracts, service, stock' + (can('money') ? ' and finance' : '') : '',
    [],
    [],
    { kind: all ? 'Management Report' : 'Report', sections: ds }
  );
}
export function repCsv() {
  const d = reportData(uiState.rep.t == 'docs' ? 'summary' : uiState.rep.t),
    rows = [];
  d.kpis.forEach((k) => rows.push([k[0], k[1]]));
  d.tables.forEach((t) => {
    rows.push([]);
    rows.push([t.t]);
    rows.push(t.h);
    t.r.forEach((r) => rows.push(r));
  });
  csvDownload('broadland-' + uiState.rep.t + '.csv', rows);
}
