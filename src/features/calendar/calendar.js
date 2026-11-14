/* features/calendar/calendar: The Calendar: fittings, service visits, deliveries and holidays. */
import { onClick, onEvent } from '../../core/actions.js';
import { jobTitle } from '../../domain/job-title.js';
import { html } from '../../core/html.js';
import { siteOf } from '../../domain/customers.js';
import { openModal } from '../../ui/modal.js';
import { openContract } from '../contracts/contracts.js';
import { BH, fd, isWk, iso, isoWeek, today } from '../../core/dates.js';
import { esc } from '../../core/dom.js';
import { state } from '../../data/state.js';
import { forPerson, me, staffName } from '../../domain/people.js';
import { can, canSee } from '../../domain/permissions.js';
import { holBody } from '../home/home.js';
import { emptyArt } from '../../ui/components/art.js';
import { setUI, uiState } from '../../ui/ui-state.js';
import { render } from '../../ui/shell/router.js';

/* ---------------- calendar ---------------- */
/* what can be shown, each with its colour; a layer only shows to accounts that may open what it lists */
export const CAL_LAYERS = [
  ['fit', 'Fittings', '#034ea2', () => true],
  ['surv', 'Surveys', '#0e7490', () => canSee('contracts') || canSee('leads')],
  ['appt', 'Appointments', '#b33a0a', () => canSee('leads')],
  ['svc', 'Service Visits', '#e08a00', () => true],
  ['del', 'Deliveries', '#7a4fd0', () => canSee('deliveries') || canSee('contracts')],
  ['fol', 'Follow-Ups', '#a3216b', () => canSee('leads')],
  ['hol', 'Holidays', '#12794c', () => true],
];
const LAYER_ON = { fit: 1, surv: 1, appt: 1, svc: 1, del: 1, fol: 0, hol: 1 };
export const layerOn = (k) => {
  const L = uiState.cal.ly,
    x = CAL_LAYERS.find((y) => y[0] == k);
  return !!x && !!(L[k] ?? LAYER_ON[k]) && x[3]();
};
const open = (l) => !['Won', 'Lost'].includes(l.stage);
/** everything on one day, as { c: colour class, t: title, s: small print, f: action, k: kind, p: who it is for } */
export function evs(k) {
  const e = [],
    Ad = can('manage'),
    m = me(),
    mine = (x) => Ad || (m && forPerson(m, x));
  if (layerOn('fit'))
    state.contracts
      /* every fitting shows for everyone, so the calendar matches the Next Fitting card on the overview */
      .filter((c) => c.fit == k && c.stage != 'Complete')
      .forEach((c) =>
        e.push({
          c: 'fit' + (Ad || mine(c.fitter) ? '' : ' oth'),
          t: jobTitle(c.id, c.name),
          s: c.product + ' (' + (c.fitter || 'no fitter') + ')',
          f: ['calFit', c.id],
          k: 'Fitting',
          p: c.fitter,
        })
      );
  if (layerOn('surv')) {
    if (canSee('contracts'))
      state.contracts
        .filter((c) => c.survey == k && c.stage != 'Complete')
        .forEach((c) =>
          e.push({
            c: 'surv',
            t: 'Survey: ' + jobTitle(c.id, c.name),
            s: [c.town, c.surveyor ? 'surveyor ' + c.surveyor : 'no surveyor yet'].filter(Boolean).join(', '),
            f: ['openContract', c.id],
            k: 'Survey',
            p: c.surveyor,
          })
        );
    if (canSee('leads')) leadVisits(k, true).forEach((x) => e.push(x));
  }
  if (layerOn('appt')) leadVisits(k, false).forEach((x) => e.push(x));
  if (layerOn('svc'))
    state.calls
      .filter((c) => c.visit == k && c.status != 'Complete' && (Ad || canSee('service') || mine(c.fitter)))
      .forEach((c) =>
        e.push({
          c: 'svc',
          t:
            (c.visitTime ? c.visitTime + ' ' : '') + 'Service: ' + (c.contract ? jobTitle(c.contract, c.name) : c.name),
          s: c.issue + (c.fitter ? ' (' + c.fitter + ')' : ''),
          f: ['editCall', c.id],
          k: 'Service visit',
          p: c.fitter,
        })
      );
  if (layerOn('del')) {
    if (canSee('deliveries'))
      state.deliveries
        .filter((d) => d.due == k && d.status != 'Received')
        .forEach((d) =>
          e.push({
            c: 'del',
            t: 'Delivery in: ' + d.supplier,
            s: d.items,
            f: ['go', 'deliveries'],
            k: 'Delivery',
            p: '',
          })
        );
    if (canSee('contracts'))
      state.contracts
        .filter((c) => c.delDate == k && c.stage != 'Complete')
        .forEach((c) =>
          e.push({
            c: 'del',
            t: 'Delivery to site: ' + jobTitle(c.id, c.name),
            s: [c.product, c.town].filter(Boolean).join(', '),
            f: ['openContract', c.id],
            k: 'Delivery to site',
            p: c.fitter,
          })
        );
  }
  if (layerOn('fol'))
    state.leads
      .filter((l) => l.followup == k && open(l))
      .forEach((l) =>
        e.push({
          c: 'fol',
          t: 'Follow up: ' + l.name,
          s: l.next || l.product || '',
          f: ['openLead', l.id],
          k: 'Follow-up',
          p: l.owner,
        })
      );
  if (layerOn('hol') && isWk(k))
    state.hols
      .filter((h) => h.status != 'Rejected' && h.from <= k && h.to >= k && (Ad || (m && h.sid == m.id)))
      .forEach((h) => {
        const n = staffName(h.sid);
        e.push({
          c: 'hol' + (h.status == 'Pending' ? ' pd' : ''),
          t: n.split(' ')[0] + ' off',
          s: n + ' on holiday' + (h.status == 'Pending' ? ' (pending)' : ''),
          f: ['holEdit', h.id],
          k: 'Holiday',
          p: n,
        });
      });
  /* one person's diary: only what is theirs */
  const who = uiState.cal.who && state.staff.find((x) => x.id == uiState.cal.who);
  return who ? e.filter((x) => forPerson(who, x.p)) : e;
}
/* a lead's visits on a day: the main appointment and any others in its list; surveys (any visit with "survey" in
   its type) or the rest */
function leadVisits(k, surveys) {
  const out = [];
  state.leads.filter(open).forEach((l) => {
    const V = [
      { ty: l.apptType, d: l.apptDate, tm: l.apptTime, w: l.apptWith, st: l.apptStatus },
      ...(Array.isArray(l.appts) ? l.appts : []),
    ];
    const seen = new Set();
    V.filter((a) => {
      if (!a || a.d != k || /cancel/i.test(a.st || '') || /survey/i.test(a.ty || 'Home survey') != surveys)
        return false;
      const key = [a.d, a.tm, a.ty].join('|');
      return !seen.has(key) && seen.add(key);
    }).forEach((a) =>
      out.push({
        c: surveys ? 'surv' : 'appt',
        t: (a.tm ? a.tm + ' ' : '') + (a.ty || 'Visit') + ': ' + l.name,
        s: [l.town, a.w ? 'with ' + a.w : ''].filter(Boolean).join(', '),
        f: ['openLead', l.id],
        k: surveys ? 'Survey' : 'Appointment',
        p: a.w,
      })
    );
  });
  return out;
}
export const evA = (x) => onClick(...x.f);
/** a fitting on the calendar: open the contract, or (for accounts without contracts) show the job in a pop-up */
export function calFit(id) {
  if (canSee('contracts')) return openContract(id);
  const c = state.contracts.find((x) => x.id == id);
  if (!c) return;
  openModal(
    html`<h2>${jobTitle(c.id, c.name)}</h2>
      <dl class="cal-job">
        <dt>Fitting</dt><dd>${fd(c.fit)}</dd>
        <dt>Job</dt><dd>${c.product || '-'}</dd>
        <dt>Where</dt><dd>${siteOf(c) || c.town || '-'}</dd>
        <dt>Fitting Team</dt><dd>${c.fitter || 'Not set'}</dd>
      </dl>
      <div class="mact"><button class="btn" data-act="closeModal">Close</button></div>`,
    'sm'
  );
}
export function calCells(days, full) {
  const td = today();
  return days
    .map(({ k, d, out }) => {
      const e = evs(k),
        bh = BH[k],
        sh = full ? e : e.slice(0, 3);
      return `<div class="dc2 ${out ? 'out' : ''} ${k == td ? 'today' : ''} ${k == uiState.cal.sd ? 'sel' : ''} ${isWk(k) ? '' : 'we'} ${bh ? 'bh' : ''}" ${onClick('setUI', 'cal.sd', k)}><span class="dn">${d}</span>${bh ? `<span class="more">${esc(bh)}</span>` : ''}<div class="evs">${sh.map((x) => `<span class="ce ${x.c}" title="${esc(x.s)}" ${onClick(...x.f)}>${esc(x.t)}</span>`).join('')}${!full && e.length > 3 ? `<span class="more">+${e.length - 3} more</span>` : ''}</div></div>`;
    })
    .join('');
}
export const dRange = (s, n) => {
  const a = [];
  for (let i = 0; i < n; i++) {
    const x = new Date(s);
    x.setDate(x.getDate() + i);
    a.push({ k: iso(x), d: x.getDate(), out: false, x });
  }
  return a;
};
export function calMine() {
  const m = me();
  if (!m)
    return '<div class="panel" style="margin-top:1rem"><p class="empty">Your name is not in the staff list yet.</p></div>';
  const td = today(),
    J = state.contracts
      .filter((c) => c.fit && c.fit >= td && c.stage != 'Complete' && forPerson(m, c.fitter))
      .sort((a, b) => a.fit.localeCompare(b.fit));
  return `<div class="two" style="margin-top:1rem"><div class="panel"><h2><span>My Holiday</span><span class="acts"><button class="btn sm" data-act="bookMine">Book Holiday</button></span></h2>${holBody(m)}</div>
  <div class="panel"><h2>My Jobs</h2>${J.map((c) => `<div class="row"><span><b>${fd(c.fit)}</b> ${esc(jobTitle(c.id, c.name))}<br><span class="muted">${esc(c.product)}, ${esc(c.town || '')}</span></span></div>`).join('') || emptyArt('done', 'No fittings booked for you.')}</div></div>`;
}
export function vCalendar() {
  const n = new Date(),
    C = uiState.cal,
    M = C.m,
    o = C.o,
    WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="dh">${d}</div>`).join('');
  let title, grid;
  if (M == 'month') {
    const b = new Date(n.getFullYear(), n.getMonth() + o, 1),
      off = (b.getDay() + 6) % 7,
      dim = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate(),
      wks = Math.ceil((off + dim) / 7),
      days = dRange(new Date(b.getFullYear(), b.getMonth(), 1 - off), wks * 7).map((x) => ({
        ...x,
        out: x.x.getMonth() != b.getMonth(),
      }));
    title = b.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    grid = `<div class="cm wn"><div class="dh wkh">Wk</div>${WD}${weeks(days, false)}</div>`;
  } else if (M == 'week') {
    const t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + o * 7),
      st = new Date(t.getFullYear(), t.getMonth(), t.getDate() - ((t.getDay() + 6) % 7));
    title =
      'Week ' +
      isoWeek(st) +
      ' · ' +
      st.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    grid = `<div class="cm wk wn"><div class="dh wkh">Wk</div>${WD}${weeks(dRange(st, 7), true)}</div>`;
  } else {
    const st = new Date(n.getFullYear(), n.getMonth(), n.getDate() + o * 28),
      days = dRange(st, 28).filter((x) => evs(x.k).length || BH[x.k]);
    /* a heading each time the week changes */
    days.forEach((x, i) => (x.wk = !i || isoWeek(x.k) != isoWeek(days[i - 1].k) ? isoWeek(x.k) : 0));
    title =
      st.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
      ' to ' +
      new Date(st.getFullYear(), st.getMonth(), st.getDate() + 27).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    grid = `<div class="panel"><div class="ag">${
      days
        .map(
          (x) =>
            `${x.wk ? `<p class="ag-wk">Week ${x.wk}</p>` : ''}<b>${new Date(x.k + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</b><div>${BH[x.k] ? `<span class="tag y">${esc(BH[x.k])}</span>` : ''}${evs(
              x.k
            )
              .map(
                (e) =>
                  `<span class="ce ${e.c}" ${evA(e)}>${esc(e.t)} <span class="muted">${esc(e.s || '')}</span></span>`
              )
              .join('')}</div>`
        )
        .join('') || '<p class="empty">Nothing scheduled in this period.</p>'
    }</div></div>`;
  }
  const fits = state.contracts.filter((c) => c.fit && c.stage != 'Complete').sort((a, b) => a.fit.localeCompare(b.fit)),
    un = state.contracts.filter((c) => !c.fit && c.stage != 'Complete'),
    sd = C.sd;
  const day = sd
    ? `<div class="panel cal-day" style="margin-top:1rem"><h2><span>${new Date(sd + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span><span class="acts"><button class="mini pri" ${onClick('holBook', '', sd)}>Book holiday</button><button class="mini" ${onClick('setUI', 'cal.sd', null)}>Close</button></span></h2>${BH[sd] ? `<span class="tag y">${esc(BH[sd])}</span>` : ''}${
        evs(sd)
          .map(
            (e) =>
              `<div class="row"><span><span class="tag">${e.k}</span> <b>${esc(e.t)}</b><br><span class="muted">${esc(e.s || '')}</span></span><button class="mini" ${evA(e)}>Open</button></div>`
          )
          .join('') || '<p class="empty">Nothing scheduled.</p>'
      }</div>`
    : '';
  return `<div class="head"><div><h1>${can('manage') ? 'Calendar' : 'My Calendar'}</h1>${can('manage') ? '' : '<span class="muted">Your holidays and your jobs</span>'}</div><div class="tools">${can('manage') ? '' : '<button class="btn" data-act="bookMine">Book holiday</button>'}<div class="seg">${[
    ['month', 'Month'],
    ['week', 'Week'],
    ['agenda', 'Agenda'],
  ]
    .map(([k, t]) => `<button class="${M == k ? 'on' : ''}" ${onClick('calMode', k)}>${t}</button>`)
    .join(
      ''
    )}</div><button class="btn ghost" aria-label="Previous" ${onClick('setUI', 'cal.o', o - 1)}>&lsaquo;</button><button class="btn ghost" ${onClick('setUI', 'cal.o', 0)}>Today</button><button class="btn ghost" aria-label="Next" ${onClick('setUI', 'cal.o', o + 1)}>&rsaquo;</button></div></div>
  <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.6rem;margin-bottom:.8rem;align-items:center"><h2 style="margin:0">${esc(title)}</h2><div class="cal-f"><div class="chips" style="margin:0">${CAL_LAYERS.filter(
    (x) => x[3]()
  )
    .map(
      ([k, t, c]) =>
        `<button class="chip ${layerOn(k) ? 'on' : ''}" ${onClick('calLayer', k)}><span class="ldot" style="background:${c}"></span>${t}</button>`
    )
    .join(
      ''
    )}</div>${can('manage') ? `<label class="cal-who"><span>Person</span><select aria-label="Show one person's diary" ${onEvent('onchange', 'setUI', 'cal.who', 'this.value')}><option value="">Everyone</option>${state.staff.map((x) => `<option value="${esc(x.id)}" ${uiState.cal.who == x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>` : ''}</div></div>${grid}${day}
  ${
    can('manage')
      ? `<div class="two" style="margin-top:1rem"><div class="panel"><h2>Upcoming Fittings</h2>${fits.map((c) => `<div class="row"><span><b>${fd(c.fit)}</b> ${esc(jobTitle(c.id, c.name))}<br><span class="muted">${esc(c.product)}, ${esc(c.town)} (${esc(c.fitter || 'no fitter')})</span></span><button class="mini pri" ${onClick('markFit', c.id)}>Mark fitted</button></div>`).join('') || '<p class="empty">No fittings booked.</p>'}</div>
  <div class="panel"><h2>Needs A Fit Date</h2>${un.map((c) => `<div class="row"><span><b>${esc(jobTitle(c.id, c.name))}</b><br><span class="muted">${esc(c.product)}</span></span><button class="mini" ${onClick('editContract', c.id)}>Set date</button></div>`).join('') || '<p class="empty">Everything has a date.</p>'}</div></div>`
      : calMine()
  }`;
}
/** turn one kind of event on or off */
export function calLayer(k) {
  uiState.cal.ly[k] = layerOn(k) ? 0 : 1;
  render();
}
/* the month and week grids: a week number at the start of each row */
function weeks(days, full) {
  let h = '';
  for (let i = 0; i < days.length; i += 7)
    h +=
      `<div class="wkn" title="Week ${isoWeek(days[i].k)}">${isoWeek(days[i].k)}</div>` +
      calCells(days.slice(i, i + 7), full);
  return h;
}
export function calMode(k) {
  uiState.cal.o = 0;
  setUI('cal.m', k);
}
