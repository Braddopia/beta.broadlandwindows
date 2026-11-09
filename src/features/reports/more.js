/* features/reports/more: extra charts and tables added to the Reports tabs (month by month trends,
   per-person performance, supplier delivery record, holiday by person, stock value by area).
   Each function receives the tab's { kpis, bars, tables } and adds to it. */
import { fd, today } from '../../core/dates.js';
import { grp, m0, sum } from '../../core/format.js';
import { state } from '../../data/state.js';
import { allowTot, hu, holLeft, yearCounts } from '../../domain/holidays.js';
import { allLeads } from '../../domain/leads.js';
import { can } from '../../domain/permissions.js';
import { areaOf, products } from '../../domain/stock.js';
import { bar } from './reports.js';

const pc = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '-');
/** the last 12 months as [key 'YYYY-MM', label 'Nov 26'] */
function months() {
  const out = [],
    d = new Date();
  d.setDate(1);
  for (let i = 11; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push([
      x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'),
      x.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    ]);
  }
  return out;
}
const byMonth = (L, date, val = () => 1) =>
  months().map(([k, n]) => [
    n,
    sum(
      L.filter((x) => String(date(x) || '').startsWith(k)),
      val
    ),
  ]);
const ageDays = (a, b) => (new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5;

export const MORE = {
  sales(d) {
    const L = allLeads(),
      created = (l) => l.created || (l.log && l.log.length ? l.log[l.log.length - 1].d : '');
    d.bars.push(
      bar(
        'Leads by month (last 12)',
        byMonth(L, created).map((r) => [...r, String])
      )
    );
    d.tables.push({
      t: 'Salesperson performance',
      h: ['Salesperson', 'Leads', 'Open', 'Won', 'Lost', 'Won value', 'Conversion'],
      r: grp(L, (l) => l.owner || 'Unassigned')
        .map(([o, x]) => {
          const w = x.filter((l) => l.stage == 'Won'),
            lo = x.filter((l) => l.stage == 'Lost').length;
          return [
            o,
            x.length,
            x.length - w.length - lo,
            w.length,
            lo,
            m0(sum(w, (l) => l.value)),
            pc(w.length, w.length + lo),
          ];
        })
        .sort((a, b) => b[3] - a[3]),
    });
    d.tables.push({
      t: 'Open leads with no next step',
      h: ['Lead', 'Customer', 'Stage', 'Salesperson', 'Value'],
      r: L.filter((l) => !['Won', 'Lost'].includes(l.stage) && !l.next && !l.followup && !l.apptDate).map((l) => [
        l.id,
        l.name,
        l.stage,
        l.owner || '-',
        m0(l.value),
      ]),
    });
  },
  contracts(d) {
    const C = state.contracts,
      Ad = can('money'),
      td = today(),
      in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    d.bars.push(
      bar(
        'Contracts sold by month (last 12)',
        byMonth(C, (c) => c.cdate).map((r) => [...r, String])
      )
    );
    if (Ad)
      d.bars.push(
        bar(
          'Value sold by month (last 12)',
          byMonth(
            C,
            (c) => c.cdate,
            (c) => +c.value || 0
          ).map((r) => [...r, m0])
        )
      );
    d.tables.push({
      t: 'Sales by salesperson',
      h: ['Salesperson', 'Contracts', ...(Ad ? ['Value', 'Paid', 'Owed', 'Average'] : [])],
      r: grp(C, (c) => c.soldBy || 'Not set')
        .map(([s, x]) => [
          s,
          x.length,
          ...(Ad
            ? [
                m0(sum(x, (c) => +c.value || 0)),
                m0(sum(x, (c) => +c.paid || 0)),
                m0(sum(x, (c) => (+c.value || 0) - (+c.paid || 0))),
                m0(sum(x, (c) => +c.value || 0) / (x.length || 1)),
              ]
            : []),
        ])
        .sort((a, b) => b[1] - a[1]),
    });
    d.tables.push({
      t: 'Fittings in the next 30 days',
      h: ['Contract', 'Customer', 'Fitting', 'Fitters', 'Stage', ...(Ad ? ['Owed'] : [])],
      r: C.filter((c) => c.fit && c.fit >= td && c.fit <= in30)
        .sort((a, b) => a.fit.localeCompare(b.fit))
        .map((c) => [
          c.id,
          c.name,
          fd(c.fit),
          c.fitter || '-',
          c.stage,
          ...(Ad ? [m0((+c.value || 0) - (+c.paid || 0))] : []),
        ]),
    });
  },
  service(d) {
    const C = state.calls;
    d.bars.push(
      bar(
        'Calls by month (last 12)',
        byMonth(C, (c) => c.takenAt).map((r) => [...r, String])
      )
    );
    d.tables.push({
      t: 'Engineer performance',
      h: ['Engineer', 'Calls', 'Completed', 'Open', 'Average days to fix', 'Another visit needed'],
      r: grp(C, (c) => c.fitter || 'Not assigned').map(([f, x]) => {
        const done = x.filter((c) => c.status == 'Complete'),
          days = done.filter((c) => c.takenAt && c.doneAt).map((c) => ageDays(c.takenAt, c.doneAt));
        return [
          f,
          x.length,
          done.length,
          x.length - done.length,
          days.length ? String(Math.round((sum(days, (n) => n) / days.length) * 10) / 10) : '-',
          x.filter((c) => c.followUp == 'Yes').length,
        ];
      }),
    });
    d.tables.push({
      t: 'Repeat callers',
      h: ['Customer', 'Calls', 'Contract', 'Last call', 'Last problem'],
      r: grp(C, (c) => c.contract || c.name)
        .filter(([, x]) => x.length > 1)
        .map(([, x]) => {
          const last = x.slice().sort((a, b) => String(b.takenAt).localeCompare(String(a.takenAt)))[0];
          return [last.name, x.length, last.contract || '-', last.takenAt ? fd(last.takenAt) : '-', last.issue || ''];
        })
        .sort((a, b) => b[1] - a[1]),
    });
  },
  deliveries(d) {
    const R = state.deliveries.filter((x) => x.status == 'Received');
    const late = (x) => x.recvDate && x.due && x.recvDate > x.due;
    d.kpis.push(['On time', pc(R.filter((x) => !late(x)).length, R.length)]);
    d.kpis.push([
      'Damaged or failed QC',
      state.deliveries.filter((x) => x.damaged == 'Yes' || x.qc == 'Failed').length,
    ]);
    d.tables.push({
      t: 'Supplier delivery record',
      h: ['Supplier', 'Received', 'Late', 'On time', 'Damaged', 'Something missing', 'Failed QC'],
      r: grp(state.deliveries, (x) => x.supplier || 'Not set')
        .map(([s, x]) => {
          const r = x.filter((y) => y.status == 'Received');
          return [
            s,
            r.length,
            r.filter(late).length,
            pc(r.filter((y) => !late(y)).length, r.length),
            x.filter((y) => y.damaged == 'Yes').length,
            x.filter((y) => y.complete == 'Some missing').length,
            x.filter((y) => y.qc == 'Failed').length,
          ];
        })
        .sort((a, b) => b[1] - a[1]),
    });
  },
  people(d) {
    const y = new Date().getFullYear();
    d.tables.push({
      t: 'Holiday by person (' + y + ')',
      h: ['Person', 'Allowance', 'Paid days taken', 'Pending', 'Left', 'Unpaid days', 'Sick days'],
      r: state.staff.map((s) => {
        const c = yearCounts(s, y);
        return [
          s.name,
          allowTot(s),
          hu(s, y),
          sum(
            state.hols.filter((h) => h.sid == s.id && h.status == 'Pending' && String(h.from).startsWith(String(y))),
            (h) => h.days
          ),
          holLeft(s, y),
          c.U || 0,
          c.S || 0,
        ];
      }),
    });
  },
  stock(d) {
    if (!can('money')) return;
    const P = products(),
      v = (r) => (+r.stock || 0) * (+r.cost || 0);
    d.bars.push(
      bar(
        'Stock value by area',
        grp(P, areaOf)
          .map(([a, x]) => [a, sum(x, v), m0])
          .sort((a, b) => b[1] - a[1])
      )
    );
    d.bars.push(
      bar(
        'Stock value by supplier',
        grp(P, (r) => r.supplier || 'No supplier')
          .map(([a, x]) => [a, sum(x, v), m0])
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
      )
    );
  },
};
