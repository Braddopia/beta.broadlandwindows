/* features/search/facts: straight answers to questions typed in the search bar, such as
   "amount outstanding", "how many open service calls", "stock value" or "holiday left".
   Each answer says what it is, where the number comes from, and opens the page behind it.
   Everything is worked out here in the browser from the CRM's own data: nothing is sent anywhere. */
import { fd, today, weekRange } from '../../core/dates.js';
import { m0 } from '../../core/format.js';
import { company } from '../../data/company.js';
import { state } from '../../data/state.js';
import { askScore, askWords } from '../../domain/ask.js';
import { dAuto } from '../../domain/deliveries.js';
import { allLeads } from '../../domain/leads.js';
import { allowTot, hu } from '../../domain/holidays.js';
import { jobTitle } from '../../domain/job-title.js';
import { me, staffName } from '../../domain/people.js';
import { can, canSee } from '../../domain/permissions.js';
import { isLow, products } from '../../domain/stock.js';
import { openContract } from '../contracts/contracts.js';
import { myHolidays } from '../holidays/holidays.js';
import { go } from '../../ui/shell/router.js';

const n = (x) => +x || 0;
const live = (c) => c.stage != 'Complete' && c.cancelled != 'Yes';
const bal = (c) => n(c.value) - n(c.paid);
const many = (k, w) =>
  k +
  ' ' +
  (k == 1 ? w : w == 'person' ? 'people' : w == 'Person' ? 'People' : w.replace(/([^aeiou])y$/i, '$1ie') + 's');

/* each answer: the words that ask for it, who may see it, and how to work it out */
const FACTS = () => [
  {
    k: ['owed', 'customer owed', 'still collect', 'money owed'],
    ok: () => can('money') && canSee('contracts'),
    a: () => {
      const L = state.contracts.filter((c) => live(c) && bal(c) > 0);
      return [
        m0(L.reduce((t, c) => t + bal(c), 0)) + ' Still To Collect',
        'Outstanding on ' + many(L.length, 'open contract') + ', after deposits and payments',
        () => go('contracts'),
      ];
    },
  },
  {
    k: ['pipeline', 'lead value', 'lead worth', 'potential'],
    ok: () => canSee('leads'),
    a: () => {
      const L = state.leads.filter((l) => !['Won', 'Lost'].includes(l.stage));
      return [
        m0(L.reduce((t, l) => t + n(l.value), 0)) + ' In The Pipeline',
        many(L.length, 'open lead') + ', not yet won or lost',
        () => go('leads'),
      ];
    },
  },
  {
    k: ['sale', 'contract value', 'sale this year'],
    ok: () => can('money') && canSee('contracts'),
    a: () => {
      const y = today().slice(0, 4),
        L = state.contracts.filter((c) => c.cancelled != 'Yes' && (!c.cdate || c.cdate.startsWith(y)));
      return [
        m0(L.reduce((t, c) => t + n(c.value), 0)) + ' Sold This Year',
        'Total value of ' + many(L.length, 'contract') + ' in ' + y + ', including VAT',
        () => go('contracts'),
      ];
    },
  },
  {
    k: ['collected', 'paid', 'payment received'],
    ok: () => can('money') && canSee('contracts'),
    a: () => [
      m0(state.contracts.reduce((t, c) => t + n(c.paid), 0)) + ' Collected',
      'Deposits and payments taken on all contracts',
      () => go('contracts'),
    ],
  },
  {
    k: ['bill', 'we owed', 'supplier owed', 'bill pay'],
    ok: () => canSee('finance'),
    a: () => {
      const L = (state.fin || []).filter((b) => b.status != 'Paid'),
        od = L.filter((b) => b.due && b.due < today());
      return [
        m0(L.reduce((t, b) => t + n(b.amount), 0)) + ' Of Bills To Pay',
        many(L.length, 'unpaid bill') + (od.length ? ', ' + od.length + ' overdue' : ', none overdue'),
        () => go('finance'),
      ];
    },
  },
  {
    k: ['payroll', 'payroll month'],
    ok: () => canSee('finance') && can('money'),
    a: () => [
      m0(state.staff.reduce((t, s) => t + n(s.salary), 0) / 12) + ' Monthly Payroll',
      'Yearly salaries of ' + many(state.staff.length, 'person') + ', divided by 12',
      () => go('finance'),
    ],
  },
  {
    k: ['call', 'open call', 'urgent call', 'urgent'],
    ok: () => canSee('service'),
    a: () => {
      const L = state.calls.filter((c) => c.status != 'Complete'),
        u = L.filter((c) => c.priority == 'Urgent').length,
        nb = L.filter((c) => !c.visit).length;
      return [many(L.length, 'Open Service Call'), u + ' urgent · ' + nb + ' not booked yet', () => go('service')];
    },
  },
  {
    k: ['low stock', 'low', 'running low', 'out stock'],
    ok: () => canSee('stock'),
    a: () => {
      const P = products(),
        lo = P.filter(isLow),
        out = P.filter((r) => r.stock <= 0);
      return [
        many(lo.length, 'Product') + ' Running Low',
        out.length +
          ' out of stock' +
          (lo.length
            ? ' · ' +
              lo
                .slice(0, 3)
                .map((r) => r.item)
                .join(', ')
            : ''),
        () => go('stock'),
      ];
    },
  },
  {
    k: ['stock value', 'value stock', 'stock cost'],
    ok: () => canSee('stock') && can('money'),
    a: () => {
      const P = products();
      return [
        m0(P.reduce((t, r) => t + n(r.stock) * n(r.cost), 0)) + ' Of Stock Held',
        many(P.length, 'product') + ' at cost price',
        () => go('stock'),
      ];
    },
  },
  {
    k: ['delivery', 'delivery today', 'delivery due', 'delivery overdue'],
    ok: () => canSee('deliveries'),
    a: () => {
      const L = state.deliveries.filter((d) => d.status != 'Received'),
        td = L.filter((d) => d.due == today()).length,
        od = L.filter((d) => dAuto(d) == 'Overdue').length;
      return [
        many(td, 'Delivery') + ' Due Today',
        od + ' overdue · ' + L.length + ' still to arrive',
        () => go('deliveries'),
      ];
    },
  },
  {
    k: ['next fit', 'fit', 'fit this week', 'fit week'],
    ok: () => canSee('fitting'),
    a: () => {
      const L = state.contracts
          .filter((c) => c.fit && c.fit >= today() && live(c))
          .sort((a, b) => a.fit.localeCompare(b.fit)),
        [ws, we] = weekRange(),
        wk = state.contracts.filter((c) => c.fit >= ws && c.fit <= we && live(c)).length,
        c = L[0];
      return c
        ? [
            'Next Fitting ' + fd(c.fit),
            jobTitle(c.id, c.name) + ' · ' + (c.fitter || 'no fitter yet') + ' · ' + many(wk, 'fitting') + ' this week',
            () => (canSee('contracts') ? openContract(c.id) : go('fitting')),
          ]
        : ['No Fittings Booked', 'Nothing on the calendar from today', () => go('fitting')];
    },
  },
  {
    k: ['holiday', 'holiday left', 'my holiday', 'allowance', 'day left'],
    ok: () => !!me(),
    a: () => {
      const m = me(),
        left = allowTot(m) - hu(m);
      return [
        many(left, 'Day') + ' Of Holiday Left',
        'Your allowance this year is ' + allowTot(m) + ' days, ' + hu(m) + ' booked',
        () => myHolidays(m.id, 'next'),
      ];
    },
  },
  {
    k: ['who holiday', 'holiday today', 'who away'],
    ok: () => canSee('holidays'),
    a: () => {
      const td = today(),
        L = state.hols.filter((h) => h.status == 'Approved' && h.from <= td && h.to >= td).map((h) => staffName(h.sid));
      return [
        L.length ? L.join(', ') + (L.length == 1 ? ' Is' : ' Are') + ' Off Today' : 'Everyone Is In Today',
        'Approved holidays covering ' + fd(td),
        () => go('holidays'),
      ];
    },
  },
  {
    k: ['staff', 'how staff'],
    ok: () => canSee('staff'),
    a: () => {
      const by = {};
      state.staff.forEach((s) => (by[s.cat || 'Other'] = (by[s.cat || 'Other'] || 0) + 1));
      return [
        many(state.staff.length, 'Person') + ' On The Team',
        Object.entries(by)
          .map(([k, v]) => v + ' ' + k.toLowerCase())
          .join(' · '),
        () => go('staff'),
      ];
    },
  },
  {
    k: ['conversion', 'conversion rate', 'win rate'],
    ok: () => canSee('leads'),
    a: () => {
      /* the same sum as the Leads page: every lead ever won or lost, including ones made into contracts */
      const A = allLeads(),
        w = A.filter((x) => x.stage == 'Won').length,
        l = A.filter((x) => x.stage == 'Lost').length;
      return [
        (w + l ? Math.round((w / (w + l)) * 100) : 0) + '% Of Leads Won',
        w + ' won, ' + l + ' lost',
        () => go('leads'),
      ];
    },
  },
  {
    k: ['average contract', 'average value', 'average sale'],
    ok: () => can('money') && canSee('contracts'),
    a: () => {
      const L = state.contracts.filter((c) => c.cancelled != 'Yes' && n(c.value));
      return [
        m0(L.reduce((t, c) => t + n(c.value), 0) / (L.length || 1)) + ' Average Contract',
        'Across ' + many(L.length, 'contract') + ', including VAT',
        () => go('contracts'),
      ];
    },
  },
  {
    k: ['vat', 'vat rate'],
    ok: () => canSee('settings'),
    a: () => [
      'VAT Is ' + company.vat + '%',
      'Used on new contracts and invoices. Change it in Settings, Money And Invoices',
      () => go('settings'),
    ],
  },
  {
    k: ['deposit', 'deposit rate', 'deposit percent'],
    ok: () => canSee('settings'),
    a: () => [
      'Deposit ' + company.depRes + '% (Home) · ' + company.depCom + '% (Commercial)',
      'Taken when a contract is signed. Change it in Settings, Money And Invoices',
      () => go('settings'),
    ],
  },
  {
    k: ['phone', 'company phone', 'office phone', 'company email', 'our address', 'company address'],
    ok: () => true,
    a: () => [
      'Broadland Windows: ' + company.tel,
      [company.em, company.addr].filter(Boolean).join(' · '),
      () => go(canSee('settings') ? 'settings' : 'home'),
    ],
  },
];

/** the answers that best fit a question, best first (at most three) */
export function factsFor(q) {
  const W = askWords(q);
  if (!W.length) return [];
  return FACTS()
    .map((f) => ({ f, s: askScore(W, f.k) }))
    .filter((x) => x.s > 0 && x.f.ok())
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => {
      try {
        return x.f.a();
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);
}
