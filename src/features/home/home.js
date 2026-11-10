/* features/home/home: The Overview page and its widgets. */
import { onClick } from '../../core/actions.js';
import { addDays, fd, greet, inWeek, today } from '../../core/dates.js';
import { $, esc } from '../../core/dom.js';
import { m0, pc, sum } from '../../core/format.js';
import { ICONS, svg } from '../../core/icons.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { dDueToday, dLate } from '../../domain/deliveries.js';
import { allowTot, hu, svcExtra } from '../../domain/holidays.js';
import { allLeads } from '../../domain/leads.js';
import { me } from '../../domain/people.js';
import { hasLoc, isLow, products } from '../../domain/stock.js';
import { ROLE } from '../../data/session.js';
import { can, canSee } from '../../domain/permissions.js';
import { need } from '../auth/session.js';
import { holBook } from '../holidays/holidays.js';
import { html, raw } from '../../core/html.js';
import { ratingsH } from './reviews.js';
import { dTag, prTag } from '../../ui/components/tags.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';

/* ==========================================================================
   05 · Overview (personal, per-role dashboard)
   ========================================================================== */
export function vHome() {
  const td = today(),
    R = ROLE,
    first = USER.split(' ')[0],
    m = me();
  const open = state.leads.filter((l) => !['Won', 'Lost'].includes(l.stage)),
    pipe = sum(open, (l) => l.value),
    live = state.contracts.filter((c) => c.stage != 'Complete'),
    bal = sum(live, (c) => c.value - c.paid),
    oc = state.calls.filter((c) => c.status != 'Complete'),
    urgent = oc.filter((c) => c.priority == 'Urgent').length;
  const P = products(),
    low = P.filter(isLow),
    out = P.filter((r) => r.stock <= 0).length,
    sv = sum(P, (r) => r.stock * r.cost),
    D = state.deliveries.filter((x) => x.status != 'Received'),
    dToday = D.filter(dDueToday).length,
    dOver = D.filter(dLate).length;
  const fits = state.contracts
      .filter((c) => c.fit && c.stage != 'Complete' && c.fit >= td)
      .sort((a, b) => a.fit.localeCompare(b.fit)),
    fitWk = state.contracts.filter((c) => c.fit && inWeek(c.fit) && c.stage != 'Complete').length;
  const bills = state.fin.filter((b) => b.status == 'Unpaid').sort((a, b) => a.due.localeCompare(b.due)),
    billsOver = bills.filter((b) => b.due < td),
    fol = open.filter((l) => l.followup && l.followup <= td),
    quoted = state.leads.filter((l) => l.stage == 'Quoted').length,
    won = allLeads().filter((l) => l.stage == 'Won').length,
    lost = allLeads().filter((l) => l.stage == 'Lost').length;
  const fort = addDays(14),
    dueFit = live.filter((c) => c.value - c.paid > 0 && c.fit && c.fit >= td && c.fit <= fort),
    dep = state.contracts.filter((c) => c.stage == 'Deposit due'),
    reqP = state.items.filter((r) => r.type == 'request' && r.reqStatus == 'Pending').length;
  const row = (a, b) => `<div class="row"><span>${a}</span><span>${b || ''}</span></div>`,
    pan = (t, h, e) => `<div class="panel"><h2>${t}</h2>${h || `<p class="empty">${e}</p>`}</div>`;
  const fitsP = pan(
    'Next Fittings',
    fits
      .slice(0, 4)
      .map((c) =>
        row(
          `<b>${fd(c.fit)}</b> ${esc(c.name)}<br><span class="muted">${esc(c.product)}, ${esc(c.town)}</span>`,
          `<span class="tag">${esc(c.fitter)}</span>`
        )
      )
      .join(''),
    'No fittings booked.'
  );
  const callsP = pan(
    'Service Calls To Action',
    oc
      .slice()
      .sort((a, b) => ['Urgent', 'Normal', 'Low'].indexOf(a.priority) - ['Urgent', 'Normal', 'Low'].indexOf(b.priority))
      .slice(0, 4)
      .map((c) => row(`<b>${esc(c.name)}</b><br><span class="muted">${esc(c.issue)}</span>`, prTag(c.priority)))
      .join(''),
    'All clear.'
  );
  const lowP = pan(
    'Reorder List',
    low
      .slice(0, 5)
      .map((r) =>
        row(
          `<b>${esc(r.item)}</b> <span class="muted">${esc(hasLoc(r) ? r.location : 'No location')}${r.supplier ? ', ' + esc(r.supplier) : ''}</span>`,
          `<span class="tag ${r.stock <= 0 ? 'r' : 'y'}">${r.stock} Left</span>`
        )
      )
      .join(''),
    'Nothing needs reordering.'
  );
  const delP = pan(
    'Deliveries Due',
    D.slice()
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 5)
      .map((x) => row(`<b>${esc(x.supplier)}</b><br><span class="muted">${esc(x.items)}</span>`, dTag(x)))
      .join(''),
    'Nothing outstanding.'
  );
  const chaseP = pan(
    'Leads To Chase',
    open
      .slice()
      .sort((a, b) => (a.followup || '9').localeCompare(b.followup || '9'))
      .slice(0, 5)
      .map((l) =>
        row(
          `<b>${esc(l.name)}</b><br><span class="muted">${esc(l.next || l.product)}</span>`,
          `<span class="tag">${m0(l.value)}</span>`
        )
      )
      .join(''),
    'No open leads.'
  );
  const depP = pan(
    'Awaiting Deposit',
    dep
      .map((c) =>
        row(
          `<b>${esc(c.name)}</b><br><span class="muted">${esc(c.product)}</span>`,
          `<span class="tag y">${m0(c.value)}</span>`
        )
      )
      .join(''),
    'No deposits outstanding.'
  );
  const payP = pan(
    'Payments Due Before Fit',
    dueFit
      .map((c) =>
        row(
          `<b>${esc(c.name)}</b><br><span class="muted">Fit ${fd(c.fit)}, #${esc(c.id)}</span>`,
          `<span class="tag r">${m0(c.value - c.paid)}</span>`
        )
      )
      .join(''),
    'No balances due before a fitting.'
  );
  const billP = pan(
    'Bills To Pay',
    bills
      .slice(0, 5)
      .map((b) =>
        row(
          `<b>${esc(b.payee)}</b><br><span class="muted">${esc(b.ref || '')} due ${fd(b.due)}</span>`,
          `<span class="tag ${b.due < td ? 'r' : ''}">${m0(b.amount)}</span>`
        )
      )
      .join(''),
    'No unpaid bills.'
  );
  const resP = pan('Lead Results', row('Won', won) + row('Lost', lost) + row('Conversion', pc(won, won + lost)));
  const cfg = {
    admin: {
      k: [
        ['Open Leads', open.length, '', 'leads'],
        ['Pipeline Value', m0(pipe), '', 'leads'],
        ['Live Contracts', m0(sum(live, (c) => c.value)), '', 'contracts'],
        ['Balance To Collect', m0(bal), 'warn', 'contracts'],
        ['Open Service Calls', oc.length, urgent ? 'bad' : '', 'service'],
        ['Stock Requests', reqP, reqP ? 'warn' : '', 'stock'],
      ],
      p: [fitsP, callsP, lowP, resP],
      s: `${fits.length} fittings coming up, ${urgent} urgent service calls and ${m0(bal)} still to collect.`,
    },
    staff: {
      k: [
        ['Next Fitting', fits[0] ? fd(fits[0].fit) : 'None', '', 'fitting'],
        ['Open Service Calls', oc.length, urgent ? 'bad' : '', 'service'],
        ['Deliveries Due Today', dToday, dToday ? 'warn' : '', 'deliveries'],
        ['Low Stock Lines', low.length, low.length ? 'warn' : '', 'stock'],
      ],
      p: [fitsP, callsP, delP],
      s: `${dToday} deliveries due today and ${oc.length} open service calls.`,
    },
  };
  cfg.beta = cfg.admin;
  const C = cfg[R] || cfg.staff;
  const holP = `<div class="panel"><h2><span>My Holiday</span><span class="acts"><button class="btn sm" data-act="bookMine">Book Holiday</button>${canSee('holidays') ? `<button class="mini" ${onClick('go', 'holidays')}>Holiday Planner</button>` : canSee('fitting') ? `<button class="mini" ${onClick('go', 'fitting')}>My Calendar</button>` : ''}</span></h2>${holBody(m)}</div>`;
  /* widgets: every tile and panel the person may see; they choose which show and in what order */
  const KP = {
    pipe: ['Pipeline Value', m0(pipe), '', 'leads'],
    live: ['Live Contracts', m0(sum(live, (c) => c.value)), '', 'contracts'],
    bal: ['Balance To Collect', m0(bal), 'warn', 'contracts'],
    calls: ['Open Service Calls', oc.length, urgent ? 'bad' : '', 'service'],
    leads: ['Open Leads', open.length, '', 'leads'],
    fol: ['Follow-Ups Due', fol.length, fol.length ? 'warn' : '', 'leads'],
    nfit: ['Next Fitting', fits[0] ? fd(fits[0].fit) : 'None', '', 'fitting'],
    fitwk: ['Fittings This Week', fitWk, '', 'fitting'],
    dtoday: ['Deliveries Due Today', dToday, dToday ? 'warn' : '', 'deliveries'],
    dover: ['Overdue Deliveries', dOver, dOver ? 'bad' : '', 'deliveries'],
    req: ['Stock Requests', reqP, reqP ? 'warn' : '', 'stock'],
    low: ['Low Stock Lines', low.length, low.length ? 'warn' : '', 'stock'],
    out: ['Out Of Stock', out, out ? 'bad' : '', 'stock'],
    quoted: ['Quotes Out', quoted, '', 'leads'],
    ...(can('money')
      ? {
          sval: ['Stock Value', m0(sv), '', 'stock'],
          bills: ['Bills Unpaid', m0(sum(bills, (b) => b.amount)), billsOver.length ? 'bad' : '', 'finance'],
        }
      : {}),
  };
  const PN = {
    hol: ['My Holiday', holP],
    fits: ['Next Fittings', fitsP],
    del: ['Deliveries Due', delP],
    res: ['Lead Results', resP],
    calls: ['Service Calls To Action', callsP],
    dep: ['Awaiting Deposit', depP],
    chase: ['Leads To Chase', chaseP],
    low: ['Reorder List', lowP],
    ...(can('money') ? { pay: ['Payments Due Before Fit', payP], bills: ['Bills To Pay', billP] } : {}),
  };
  const okK = (k) => KP[k] && canSee(KP[k][3]),
    okP = (k) =>
      PN[k] &&
      (['hol'].includes(k) ||
        canSee(
          {
            fits: 'fitting',
            calls: 'service',
            low: 'stock',
            del: 'deliveries',
            chase: 'leads',
            dep: 'contracts',
            res: 'leads',
            pay: 'contracts',
            bills: 'finance',
          }[k]
        ));
  DASH_AV = {
    k: Object.keys(KP)
      .filter(okK)
      .map((k) => [k, KP[k][0]]),
    p: Object.keys(PN)
      .filter(okP)
      .map((k) => [k, PN[k][0]]),
  };
  const DL = dashGet();
  return `<div class="hero lkp"><button class="hero-cz" data-act="dashEdit">${svg(ICONS.layout)} Customise Widgets</button><h1>Welcome back, ${esc(first)} <span class="wave">👋</span></h1><p>${greet()}. It's ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}. ${C.s}</p>${ratingsH()}</div>
  ${
    DL.k.filter(okK).length
      ? `<div class="kpis big">${DL.k
          .filter(okK)
          .map((x) => {
            const k = KP[x];
            return `<button class="kpi ${k[2]}" ${onClick('go', k[3])}><small>${k[0]}</small><b class="${String(k[1]).length > 5 ? 'lg' : ''}">${k[1]}</b></button>`;
          })
          .join('')}</div>`
      : ''
  }
  <div class="two">${
    DL.p
      .filter(okP)
      .map((x) => PN[x][1])
      .join('') || '<div class="panel"><p class="empty">No panels chosen. Press Customise to add some.</p></div>'
  }</div>`;
}
/* per-person dashboard layout */
export let DASH_AV = { k: [], p: [] };
export const DASH_DEF = {
  admin: { k: ['pipe', 'live', 'bal', 'calls'], p: ['hol', 'fits', 'del', 'res'] },
  beta: { k: ['pipe', 'live', 'bal', 'calls'], p: ['hol', 'fits', 'del', 'res'] },
  staff: { k: ['calls', 'nfit', 'dtoday', 'low'], p: ['hol', 'fits', 'del', 'calls'] },
};
export function dashGet() {
  state.dash = state.dash || {};
  const d = state.dash[USER];
  return d && Array.isArray(d.k) && Array.isArray(d.p) ? d : DASH_DEF[ROLE] || DASH_DEF.staff;
}
export let DZ = null;
export const FL_AV = {
  k: [
    ['dt', 'Deliveries Due Today'],
    ['od', 'Overdue Deliveries'],
    ['dw', 'Deliveries This Week'],
    ['jip', 'Jobs In Progress'],
    ['jw', 'Jobs Due This Week'],
    ['low', 'Low Stock Lines'],
    ['calls', 'Open Service Calls'],
    ['req', 'Stock Requests'],
    ['off', 'Staff Off Today'],
  ],
  p: [
    ['board', 'Deliveries Board'],
    ['next7', 'Deliveries, Next 7 Days'],
    ['prio', 'Priority'],
    ['stage', 'Jobs By Stage'],
    ['stock', 'Stock Activity'],
    ['orders', 'Smart Orders'],
    ['fits', 'Fittings This Week'],
    ['calls', 'Service Visits'],
    ['low', 'Low Stock'],
    ['off', "Who's Off Today"],
  ],
};
export const FL_DEF = { k: ['dt', 'od', 'dw', 'jip', 'jw'], p: ['board', 'next7', 'prio', 'stage', 'stock', 'orders'] };
export const flGet = () => (state.flLayout && Array.isArray(state.flLayout.k) ? state.flLayout : FL_DEF);
export const LAY = {
  dash: {
    t: 'Customise Your Overview',
    d: 'Tick what you want on your dashboard and use the arrows to set the order. Only you see this layout.',
    av: () => DASH_AV,
    get: () => dashGet(),
    set: (v) => {
      state.dash = state.dash || {};
      state.dash[USER] = v;
    },
    reset: () => {
      if (state.dash) delete state.dash[USER];
    },
  },
  fl: {
    t: 'Customise Factory Floor',
    d: 'Pick what shows on the factory screen and the order. This layout is shared by everyone who opens the factory floor.',
    av: () => FL_AV,
    get: flGet,
    set: (v) => {
      state.flLayout = v;
    },
    reset: () => {
      delete state.flLayout;
    },
  },
};
export function flEdit() {
  if (!need('manage', 'Changing the factory screen')) return;
  layEdit('fl');
}
export function dashEdit() {
  layEdit('dash');
}
export function layEdit(w) {
  const L = LAY[w],
    AV = L.av(),
    d = L.get();
  DZ = {
    w,
    k: [...d.k.filter((x) => AV.k.some((a) => a[0] == x)), ...AV.k.map((a) => a[0]).filter((x) => !d.k.includes(x))],
    p: [...d.p.filter((x) => AV.p.some((a) => a[0] == x)), ...AV.p.map((a) => a[0]).filter((x) => !d.p.includes(x))],
    on: new Set([...d.k.map((x) => 'k:' + x), ...d.p.map((x) => 'p:' + x)]),
  };
  dashDraw();
}
export function dashDraw() {
  const L = (g, t) =>
    `<section class="dz"><h3>${t}</h3>${DZ[g]
      .map((x, i) => {
        const lab = (LAY[DZ.w].av()[g].find((a) => a[0] == x) || [null, x])[1],
          on = DZ.on.has(g + ':' + x);
        return `<div class="dzr ${on ? 'on' : ''}"><label><input type="checkbox" ${on ? 'checked' : ''} ${onClick('dashTog', g, x)}><span>${esc(lab)}</span></label><span class="dza"><button type="button" class="mini" aria-label="Move up" ${i ? onClick('dashMv', g, i, -1) : 'disabled'}>&uarr;</button><button type="button" class="mini" aria-label="Move down" ${i < DZ[g].length - 1 ? onClick('dashMv', g, i, 1) : 'disabled'}>&darr;</button></span></div>`;
      })
      .join('')}</section>`;
  openModal(
    `<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>${esc(LAY[DZ.w].t)}</h2><p class="muted">${esc(LAY[DZ.w].d)}</p><div class="dzg">${L('k', 'Number Tiles')}${L('p', 'Panels')}</div>
   <div class="mact"><button class="btn ghost l" data-act="dashReset">Reset to default</button><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" data-act="dashSave">Save layout</button></div>`,
    'md'
  );
}
export function dashTog(g, x) {
  const k = g + ':' + x;
  DZ.on.has(k) ? DZ.on.delete(k) : DZ.on.add(k);
  dashDraw();
}
export function dashMv(g, i, d) {
  const a = DZ[g],
    j = i + d;
  if (j < 0 || j >= a.length) return;
  [a[i], a[j]] = [a[j], a[i]];
  dashDraw();
}
export function dashSave() {
  LAY[DZ.w].set({ k: DZ.k.filter((x) => DZ.on.has('k:' + x)), p: DZ.p.filter((x) => DZ.on.has('p:' + x)) });
  audit('Layout changed', DZ.w == 'fl' ? 'Factory floor' : 'Overview', '');
  store();
  closeModal();
  render();
  toast('Layout saved');
}
export function dashReset() {
  LAY[DZ.w].reset();
  audit('Layout reset', DZ.w, '');
  store();
  closeModal();
  render();
  toast('Back to the default layout');
}
export function bookMine() {
  const m = me();
  if (!m) {
    toast('Your name is not in the staff list yet');
    return;
  }
  holBook(m.id);
  if (!can('manage')) {
    const s = $('#hs');
    if (s) {
      [...s.options].forEach((o) => {
        if (o.value != m.id) o.remove();
      });
      s.disabled = true;
    }
  }
}
/** the My Holiday summary, the same on the overview and on My Calendar: a ring with the days left,
    the numbers beside it, then the next and previous holidays and a line about years of service */
export function holBody(m) {
  if (!m) return '<p class="empty">Your name is not in the staff list yet, so there is no allowance to show.</p>';
  const td = today(),
    allow = allowTot(m),
    used = hu(m),
    left = allow - used,
    pend = sum(
      state.hols.filter((h) => h.sid == m.id && h.status == 'Pending'),
      (h) => h.days
    ),
    mine = state.hols.filter((h) => h.sid == m.id && h.status != 'Rejected'),
    nxt = mine.filter((h) => h.to >= td).sort((x, y) => x.from.localeCompare(y.from))[0],
    prev = mine.filter((h) => h.to < td).sort((x, y) => y.from.localeCompare(x.from)),
    xd = svcExtra(m),
    /* ring: what is left (blue) and what is waiting for approval (amber) */
    R = 52,
    C = 2 * Math.PI * R,
    part = (n) => (allow ? Math.max(0, Math.min(1, n / allow)) : 0) * C;
  return String(html`<div class="hol2">
    <div class="hring" role="img" aria-label="${left} of ${allow} days left">
      <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="t" cx="60" cy="60" r="${R}"/><circle class="p" cx="60" cy="60" r="${R}" stroke-dasharray="${part(left).toFixed(1)} ${C.toFixed(1)}"/>${pend > 0 && left > 0 ? raw(`<circle class="w" cx="60" cy="60" r="${R}" stroke-dasharray="${part(Math.min(pend, left)).toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-part(left - Math.min(pend, left))).toFixed(1)}"/>`) : ''}</svg>
      <div><b>${left}</b><small>Days Left</small></div>
    </div>
    <dl class="hlist">
      <div><dt>Booked</dt><dd>${used}</dd></div>
      <div><dt>Pending</dt><dd class="${pend ? 'pd' : ''}">${pend}</dd></div>
      <div><dt>Allowance</dt><dd>${allow}</dd></div>
      <div><dt>Service days</dt><dd>${xd ? '+' + xd : '0'}</dd></div>
    </dl>
  </div>
  <div class="hbtns">
    <button class="btn ghost sm" ${raw(onClick('myHolidays', m.id, 'next'))}>Next${nxt ? html` <small>${fd(nxt.from)}</small>` : ''}</button>
    <button class="btn ghost sm" ${raw(onClick('myHolidays', m.id, 'prev'))}>Previous${prev.length ? html` <small>${prev.length}</small>` : ''}</button>
    <button class="btn ghost sm" ${raw(onClick('myHolidays', m.id, 'all'))}>All Holidays</button>
  </div>`);
}
