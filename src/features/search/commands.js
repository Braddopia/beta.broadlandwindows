/* features/search/commands: Typed commands in search: pay, call, email, won/lost, note. */
import { today } from '../../core/dates.js';
import { $ } from '../../core/dom.js';
import { money, tc } from '../../core/format.js';
import { ICONS } from '../../core/icons.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { mailOf, telOf } from '../../domain/customers.js';
import { can, canSee } from '../../domain/permissions.js';
import { need } from '../auth/session.js';
import { openContract } from '../contracts/contracts.js';
import { payOpen } from '../contracts/finance-step.js';
import { recTab, recordWin } from '../records/record-window.js';
import { cmdk, cmdkRun, srchMatch, srchText } from './search.js';
import { askIn } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';

/* ---- typed commands: do a job straight from search ---- */
export function recFind(q, kinds) {
  q = String(q || '')
    .trim()
    .toLowerCase();
  if (!q) return [];
  const o = [];
  if (kinds.includes('c') && canSee('contracts'))
    state.contracts.forEach((c) => {
      if (String(c.id).toLowerCase() == q || srchMatch(srchText(c), q))
        o.push({ k: 'c', r: c, id: c.id, n: c.name || 'Contract ' + c.id, x: String(c.id).toLowerCase() == q });
    });
  if (kinds.includes('l') && canSee('leads'))
    state.leads.forEach((l) => {
      if (String(l.id).toLowerCase() == q || srchMatch(srchText(l), q))
        o.push({ k: 'l', r: l, id: l.id, n: l.name || 'Lead ' + l.id, x: String(l.id).toLowerCase() == q });
    });
  if (kinds.includes('k') && canSee('contacts'))
    state.contacts.forEach((c) => {
      if (srchMatch(srchText(c), q)) o.push({ k: 'k', r: c, id: c.id, n: c.co || c.name });
    });
  return o.sort((a, b) => (b.x ? 1 : 0) - (a.x ? 1 : 0)).slice(0, 5);
}
export function cmdSmart(query) {
  const out = [],
    m = (re) => query.match(new RegExp(re.source, 'i'));
  let x;
  if ((x = m(/^(?:pay|payment|take payment|paid)\s+£?(\d+(?:\.\d{1,2})?)\s+(.+)$/)) && can('money')) {
    const amt = SAFE.num(x[1], { max: 1e7 });
    recFind(x[2], 'c').forEach((f) =>
      out.push([
        'Record ' + money(amt) + ' Payment On ' + f.id,
        f.n + ' · balance ' + money((+f.r.value || 0) - (+f.r.paid || 0)),
        () => quickPay(f.id, amt),
        ICONS.finance,
      ])
    );
  } else if ((x = m(/^(?:pay|payment|take payment)\s+(.+)$/)) && can('money'))
    recFind(x[1], 'c').forEach((f) =>
      out.push([
        'Take A Payment On ' + f.id,
        f.n + ' · balance ' + money((+f.r.value || 0) - (+f.r.paid || 0)),
        () => {
          openContract(f.id);
          recTab('finance');
          setTimeout(payOpen, 80);
        },
        ICONS.finance,
      ])
    );
  if ((x = m(/^(?:call|ring|phone)\s+(.+)$/)))
    recFind(x[1], 'clk').forEach((f) => {
      const n = f.k == 'k' ? f.r.phone : telOf(f.r);
      if (n)
        out.push([
          'Call ' + f.n,
          n,
          () => {
            location.href = 'tel:' + String(n).replace(/[^\d+]/g, '');
          },
          'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2',
        ]);
    });
  if ((x = m(/^(?:email|mail)\s+(.+)$/)))
    recFind(x[1], 'clk').forEach((f) => {
      const e = f.k == 'k' ? f.r.email : mailOf(f.r);
      if (e && SAFE.email(e))
        out.push([
          'Email ' + f.n,
          e,
          () => {
            location.href = 'mailto:' + e;
          },
          'M4 6h16v12H4zM4 7l8 6 8-6',
        ]);
    });
  if ((x = m(/^(?:mark\s+)?(won|lost)\s+(.+)$/)))
    recFind(x[2], 'l').forEach((f) =>
      out.push([
        'Mark ' + f.id + ' As ' + tc(x[1]),
        f.n + ' · now ' + (f.r.stage || 'New'),
        () => leadQuick(f.id, tc(x[1])),
        x[1] == 'won' ? 'M5 12l5 5L20 7' : 'M6 6l12 12M18 6L6 18',
      ])
    );
  if ((x = m(/^note\s+(\S+)\s+(.{2,})$/)))
    recFind(x[1], 'cl')
      .filter((f) => f.x)
      .forEach((f) =>
        out.push(['Add Note To ' + f.id, '“' + x[2].slice(0, 60) + '”', () => noteQuick(f.k, f.id, x[2]), ICONS.edit])
      );
  return out;
}
export const recIsOpen = (id) =>
  recordWin && $('#modal').classList.contains('open') && String(recordWin.id) == String(id);
export function quickPay(id, amt) {
  if (!need('money', 'Taking payments')) return;
  if (recIsOpen(id)) {
    toast('That contract is open. Use its Finance step, or close it first');
    return;
  }
  const c = state.contracts.find((x) => x.id == id);
  if (!c || !(amt > 0)) return;
  askIn(
    'Record a ' + money(amt) + ' payment?',
    'On contract ' + id + (c.name ? ' (' + c.name + ')' : '') + '.',
    'Record Payment',
    () => quickPayGo(id, amt)
  );
}
export function quickPayGo(id, amt) {
  const c = state.contracts.find((x) => x.id == id);
  if (!c || !need('money', 'Taking payments')) return;
  c.pay = c.pay || [];
  c.pay.push({
    amt,
    date: today(),
    method: 'Bank transfer',
    kind: +c.paid || 0 ? 'Stage payment' : 'Deposit',
    ref: 'From search',
    by: USER,
  });
  c.paid = Math.round(((+c.paid || 0) + amt) * 100) / 100;
  audit('Payment recorded', id, money(amt));
  store();
  render(true);
  toast(money(amt) + ' recorded on ' + id + '. Balance now ' + money((+c.value || 0) - c.paid) + '.');
}
export function leadQuick(id, st) {
  const l = state.leads.find((x) => x.id == id);
  if (!l) return;
  if (recIsOpen(id)) {
    toast('That lead is open. Use the stage bar in it, or close it first');
    return;
  }
  const a = l.stage;
  if (a == st) {
    toast(id + ' is already ' + st);
    return;
  }
  l.stage = st;
  l.prob = st == 'Won' ? 100 : 0;
  l.log = l.log || [];
  l.log.unshift({ d: today(), t: 'Stage: ' + (a || 'New') + ' to ' + st, by: USER });
  audit('Lead edited', id, 'Stage ' + st);
  store();
  render(true);
  toast(id + ' marked as ' + st);
}
export function noteQuick(k, id, txt) {
  if (recIsOpen(id)) {
    toast('That record is open. Add the note in it, or close it first');
    return;
  }
  const r = (k == 'c' ? state.contracts : state.leads).find((x) => x.id == id);
  txt = SAFE.text(txt, 300);
  if (!r || !txt) return;
  r.log = r.log || [];
  r.log.unshift({ t: 'Note', n: txt, by: USER, at: today() });
  audit('Note added', id, txt.slice(0, 60));
  store();
  render(true);
  toast('Note added to ' + id);
}
export function cmdkSet(v) {
  cmdk(true);
  setTimeout(() => {
    const ci = $('#cq');
    if (ci) {
      ci.value = v;
      cmdkRun(v);
      ci.focus();
    }
  }, 30);
}
