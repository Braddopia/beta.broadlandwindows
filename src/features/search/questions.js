/* features/search/questions: Understanding plain-English searches such as "fittings this week". */
import { CSTAGES, SOURCES, STAGES } from '../../config/constants.js';
import { fd, iso, today, weekRange } from '../../core/dates.js';
import { m0 } from '../../core/format.js';
import { state } from '../../data/state.js';
import { dAuto } from '../../domain/deliveries.js';
import { FITL, OWNERS } from '../../domain/people.js';
import { hasLoc, isLow, key, products, unitOf } from '../../domain/stock.js';
import { canSee } from '../../domain/permissions.js';
import { openContract } from '../contracts/contracts.js';
import { editDel } from '../deliveries/deliveries.js';
import { openLead } from '../leads/leads.js';
import { nextAppt } from '../records/appointments.js';
import { editCall } from '../service/service.js';
import { viewItem } from '../stock/item-window.js';

/* ======== plain-English search: "fittings this week", "unpaid contracts", "leads from facebook",
   "urgent service calls", "deliveries overdue", "contracts in norwich over £10000", "won leads for sales a" ======== */
export const NLE = () => [
  {
    k: 'fit',
    re: /\b(fit|fits|fitting|fittings|install|installs|installation)\b/,
    v: 'contracts',
    n: 'Fittings',
    L: () => state.contracts.filter((c) => c.fit && c.cancelled != 'Yes'),
    d: (c) => c.fit,
    sh: (c) => [c.name, ['Fit ' + fd(c.fit), c.fitter || 'No fitter', c.id].join(' · ')],
    o: (c) => openContract(c.id),
  },
  {
    k: 'call',
    re: /\b(service|services|call|calls|repair|repairs|ticket|tickets|callout|callouts)\b/,
    v: 'service',
    n: 'Service calls',
    L: () => state.calls,
    d: (c) => c.visit || c.takenAt,
    sh: (c) => [
      c.name,
      [c.id, c.status, c.visit ? 'Visit ' + fd(c.visit) : 'Not booked', c.fitter].filter(Boolean).join(' · '),
    ],
    o: (c) => editCall(c.id),
  },
  {
    k: 'del',
    re: /\b(delivery|deliveries|delivering|order|orders)\b/,
    v: 'deliveries',
    n: 'Deliveries',
    L: () => state.deliveries,
    d: (x) => x.due,
    sh: (x) => [x.supplier + ': ' + x.items, [dAuto(x), fd(x.due), x.contract].filter(Boolean).join(' · ')],
    o: (x) => editDel(x.id),
  },
  {
    k: 'lead',
    re: /\b(lead|leads|enquiry|enquiries|prospect|prospects)\b/,
    v: 'leads',
    n: 'Leads',
    L: () => state.leads,
    d: (l) => nextAppt(l) || l.followup || l.created,
    sh: (l) => [l.name, [l.id, l.stage, l.source, l.owner].filter(Boolean).join(' · ')],
    o: (l) => openLead(l.id),
  },
  {
    k: 'con',
    re: /\b(contract|contracts|job|jobs|customer|customers|sale|sales)\b/,
    v: 'contracts',
    n: 'Contracts',
    L: () => state.contracts,
    d: (c) => c.fit || c.cdate,
    sh: (c) => [
      c.name,
      [
        c.id,
        c.stage,
        (+c.value || 0) - (+c.paid || 0) > 0 ? m0((+c.value || 0) - (+c.paid || 0)) + ' owed' : 'Paid',
      ].join(' · '),
    ],
    o: (c) => openContract(c.id),
  },
  {
    k: 'stock',
    re: /\b(stock|inventory|items|products)\b/,
    v: 'stock',
    n: 'Stock',
    L: () => products(),
    d: () => '',
    sh: (r) => [
      r.item,
      [r.stock + ' ' + unitOf(r), hasLoc(r) ? r.location : '', r.supplier].filter(Boolean).join(' · '),
    ],
    o: (r) => viewItem(key(r)),
  },
];
export function nlRange(q) {
  const td = today(),
    D = (s) => {
      const x = new Date(td + 'T00:00');
      x.setDate(x.getDate() + s);
      return iso(x);
    },
    [ws, we] = weekRange(),
    n = new Date(td + 'T00:00'),
    m0d = (y, m) => iso(new Date(y, m, 1)),
    m1d = (y, m) => iso(new Date(y, m + 1, 0));
  if (/\btoday\b/.test(q)) return [td, td, 'today'];
  if (/\btomorrow\b/.test(q)) return [D(1), D(1), 'tomorrow'];
  if (/\byesterday\b/.test(q)) return [D(-1), D(-1), 'yesterday'];
  if (/\bnext week\b/.test(q))
    return [
      iso(new Date(new Date(ws + 'T00:00').getTime() + 7 * 864e5)),
      iso(new Date(new Date(we + 'T00:00').getTime() + 7 * 864e5)),
      'next week',
    ];
  if (/\blast week\b/.test(q))
    return [
      iso(new Date(new Date(ws + 'T00:00').getTime() - 7 * 864e5)),
      iso(new Date(new Date(we + 'T00:00').getTime() - 7 * 864e5)),
      'last week',
    ];
  if (/\bthis week\b|\bweek\b/.test(q)) return [ws, we, 'this week'];
  if (/\bnext month\b/.test(q))
    return [m0d(n.getFullYear(), n.getMonth() + 1), m1d(n.getFullYear(), n.getMonth() + 1), 'next month'];
  if (/\blast month\b/.test(q))
    return [m0d(n.getFullYear(), n.getMonth() - 1), m1d(n.getFullYear(), n.getMonth() - 1), 'last month'];
  if (/\bthis month\b|\bmonth\b/.test(q))
    return [m0d(n.getFullYear(), n.getMonth()), m1d(n.getFullYear(), n.getMonth()), 'this month'];
  const MN = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ],
    mi = MN.findIndex((m) => new RegExp('\\b' + m.slice(0, 3) + '(?:' + m.slice(3) + ')?\\b').test(q));
  if (mi >= 0) {
    const y = (q.match(/\b(20\d\d)\b/) || [])[1] || n.getFullYear();
    return [m0d(+y, mi), m1d(+y, mi), MN[mi] + (q.match(/\b20\d\d\b/) ? ' ' + y : '')];
  }
  const y = (q.match(/\b(?:in|during|for)\s+(20\d\d)\b/) || [])[1];
  if (y) return [y + '-01-01', y + '-12-31', y];
  return null;
}
/** dflt: the kind of record to assume when the question names none (a list page passes its own) */
export function nlq(raw, dflt) {
  const q =
    ' ' +
    String(raw || '')
      .toLowerCase()
      .replace(/[?.!,]/g, ' ')
      .replace(/\s+/g, ' ') +
    ' ';
  if (q.trim().length < 4) return null;
  const E = NLE().find((e) => e.re.test(q) && canSee(e.v)) || (dflt && NLE().find((e) => e.k == dflt && canSee(e.v)));
  if (!E) return null;
  const td = today(),
    F = [],
    T = [];
  let L = E.L();
  const open = (r) =>
    E.k == 'lead'
      ? !['Won', 'Lost'].includes(r.stage)
      : E.k == 'call'
        ? r.status != 'Complete'
        : E.k == 'del'
          ? r.status != 'Received'
          : E.k == 'stock'
            ? true
            : r.stage != 'Complete' && r.cancelled != 'Yes';
  const bal = (c) => (+c.value || 0) - (+c.paid || 0);
  const R = nlRange(q);
  if (R) {
    const [a, b, t] = R;
    F.push((r) => {
      const d = E.k == 'lead' ? [nextAppt(r), r.followup, r.created].filter(Boolean) : [E.d(r)];
      return d.some((x) => x && x >= a && x <= b);
    });
    T.push(t);
  }
  if (/\b(overdue|late|behind|past due)\b/.test(q)) {
    F.push(
      (r) =>
        open(r) &&
        (E.k == 'del'
          ? dAuto(r) == 'Overdue'
          : E.k == 'lead'
            ? r.followup && r.followup < td
            : E.k == 'call'
              ? r.visit && r.visit < td
              : (E.d(r) || '9') < td)
    );
    T.push('overdue');
  }
  if (
    /\b(unpaid|owing|owe|owed|outstanding|balance|balances|not paid|money owed|debt)\b/.test(q) &&
    ['con', 'fit'].includes(E.k)
  ) {
    F.push((c) => bal(c) > 0);
    T.push('with money owed');
  }
  if (/\b(paid in full|fully paid|paid up|all paid)\b/.test(q) && ['con', 'fit'].includes(E.k)) {
    F.push((c) => bal(c) <= 0 && +c.value > 0);
    T.push('paid in full');
  }
  const num = (s) => {
    const m = String(s)
      .replace(/,/g, '')
      .match(/(\d+(?:\.\d+)?)(k)?/);
    return m ? +m[1] * (m[2] ? 1000 : 1) : null;
  };
  let m = q.match(/\b(?:over|above|more than|bigger than|at least)\s*£?\s*([\d,.]+k?)/);
  if (m) {
    const v = num(m[1]);
    F.push((r) => (+r.value || 0) >= v);
    T.push('over ' + m0(v));
  }
  m = q.match(/\b(?:under|below|less than|smaller than|up to)\s*£?\s*([\d,.]+k?)/);
  if (m) {
    const v = num(m[1]);
    F.push((r) => (+r.value || 0) <= v);
    T.push('under ' + m0(v));
  }
  const STW =
    E.k == 'lead'
      ? [...STAGES.map((s) => [s, s]), ['enquiry', 'New'], ['home visit', 'Surveyed'], ['quote', 'Quoted']]
      : ['con', 'fit'].includes(E.k)
        ? [...CSTAGES.map((s) => [s, s]), ['deposit', 'Deposit due'], ['check survey', 'Survey done']]
        : E.k == 'call'
          ? [
              ['awaiting parts', 'Awaiting parts'],
              ['booked', 'Booked'],
              ['complete', 'Complete'],
              ['past', 'Complete'],
              ['closed', 'Complete'],
              ['open', 'Open'],
            ]
          : [];
  const st = STW.find(([w]) => new RegExp('\\b' + w.toLowerCase() + '\\b').test(q));
  if (st) {
    F.push((r) => (r.stage || r.status) == st[1]);
    T.push(st[1].toLowerCase());
  } else if (/\b(open|active|live|current|ongoing)\b/.test(q)) {
    F.push(open);
    T.push('open');
  }
  if (E.k == 'call' && /\burgent\b/.test(q)) {
    F.push((c) => c.priority == 'Urgent' && open(c));
    T.push('urgent');
  }
  if (E.k == 'del') {
    if (/\bin transit\b/.test(q)) {
      F.push((x) => dAuto(x) == 'In transit');
      T.push('in transit');
    }
    if (/\breceived|arrived|delivered\b/.test(q)) {
      F.push((x) => x.status == 'Received');
      T.push('received');
    }
    if (/\bdamaged?\b/.test(q)) {
      F.push((x) => x.damaged == 'Yes');
      T.push('damaged');
    }
  }
  if (E.k == 'stock') {
    if (/\bout of stock|\bnone left|\bempty\b/.test(q)) {
      F.push((r) => r.stock <= 0);
      T.push('out of stock');
    } else if (/\blow\b|\brunning low|\breorder/.test(q)) {
      F.push((r) => isLow(r));
      T.push('running low');
    }
  }
  const src = SOURCES.find((s) => s && new RegExp('\\b' + s.toLowerCase().replace(/[^a-z0-9 ]/g, '.') + '\\b').test(q));
  if (src && ['lead', 'con'].includes(E.k)) {
    F.push((r) => r.source == src);
    T.push('from ' + src);
  }
  const ppl = [
    ...new Set([...state.staff.map((s) => s.name), ...OWNERS(), ...FITL()].filter((x) => x && x != 'Unassigned')),
  ]
    .sort((a, b) => b.length - a.length)
    .find((nm) => q.includes(' ' + nm.toLowerCase() + ' '));
  if (ppl) {
    F.push((r) => [r.owner, r.soldBy, r.takenBy, r.checkedBy, ...String(r.fitter || '').split(/,\s*/)].includes(ppl));
    T.push('for ' + ppl);
  }
  const towns = [
      ...new Set([...state.leads, ...state.contracts, ...state.calls].map((r) => r.town).filter(Boolean)),
    ].sort((a, b) => b.length - a.length),
    tw = towns.find((t) => q.includes(' ' + t.toLowerCase() + ' '));
  if (tw) {
    F.push((r) => (r.town || '') == tw);
    T.push('in ' + tw);
  }
  const pc = q.match(/\b([a-z]{1,2}\d{1,2}[a-z]?)\b/);
  if (pc && !tw && /^(nr|ip|pe|cb|co)/.test(pc[1])) {
    const P = pc[1].toUpperCase();
    F.push((r) =>
      String(r.homePc || r.sitePc || '')
        .toUpperCase()
        .startsWith(P)
    );
    T.push('in ' + P);
  }
  if (!F.length && q.trim().split(' ').length > 2) return null;
  L = L.filter((r) =>
    F.every((f) => {
      try {
        return f(r);
      } catch (e) {
        return false;
      }
    })
  );
  L.sort((a, b) => String(E.d(a) || '9').localeCompare(String(E.d(b) || '9')));
  const PRE = [
      'urgent',
      'open',
      'won',
      'lost',
      'quoted',
      'surveyed',
      'new',
      'booked',
      'complete',
      'received',
      'damaged',
      'overdue',
      'fitted',
      'ordered',
      'awaiting parts',
    ],
    pre = T.filter((x) => PRE.includes(x)),
    rest = T.filter((x) => !PRE.includes(x));
  return {
    E,
    L,
    /* how many things the question narrowed the list by (0 = it only named the kind of record) */
    n: F.length,
    title: (pre.length ? pre.join(', ') + ' ' + E.n.toLowerCase() : E.n) + (rest.length ? ' ' + rest.join(', ') : ''),
  };
}
