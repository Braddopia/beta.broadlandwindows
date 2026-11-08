/* features/calendar/calendar: The Calendar: fittings, service visits, deliveries and holidays. */
import { onClick } from '../../core/actions.js';
import { BH, fd, isWk, iso, today } from '../../core/dates.js';
import { esc } from '../../core/dom.js';
import { state } from '../../data/state.js';
import { allowTot, hu } from '../../domain/holidays.js';
import { forPerson, me, staffName } from '../../domain/people.js';
import { can, canSee } from '../../domain/permissions.js';
import { svcBox } from '../home/home.js';
import { emptyArt } from '../../ui/components/art.js';
import { holTag } from '../../ui/components/tags.js';
import { setUI, uiState } from '../../ui/ui-state.js';

/* ---------------- calendar ---------------- */
export function evs(k) {
  const e = [],
    L = uiState.cal.ly,
    Ad = can('manage'),
    m = me(),
    mine = (x) => Ad || (m && forPerson(m, x));
  if (L.fit)
    state.contracts
      .filter((c) => c.fit == k && c.stage != 'Complete' && (Ad || mine(c.fitter) || c.soldBy == USER))
      .forEach((c) =>
        e.push({
          c: 'fit',
          t: c.name,
          s: c.product + ' (' + (c.fitter || 'no fitter') + ')',
          f: ['openContract', c.id],
          k: 'Fitting',
        })
      );
  if (L.svc)
    state.calls
      .filter((c) => c.visit == k && c.status != 'Complete' && (Ad || canSee('service') || mine(c.fitter)))
      .forEach((c) =>
        e.push({
          c: 'svc',
          t: (c.visitTime ? c.visitTime + ' ' : '') + 'Service: ' + c.name,
          s: c.issue,
          f: ['editCall', c.id],
          k: 'Service visit',
        })
      );
  if (L.del && Ad)
    state.deliveries
      .filter((d) => d.due == k && d.status != 'Received')
      .forEach((d) =>
        e.push({ c: 'del', t: 'Delivery: ' + d.supplier, s: d.items, f: ['go', 'deliveries'], k: 'Delivery' })
      );
  if (L.hol && isWk(k))
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
        });
      });
  return e;
}
export const evA = (x) => onClick(...x.f);
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
    H = state.hols.filter((h) => h.sid == m.id && h.to >= td).sort((a, b) => a.from.localeCompare(b.from)),
    J = state.contracts
      .filter((c) => c.fit && c.fit >= td && c.stage != 'Complete' && forPerson(m, c.fitter))
      .sort((a, b) => a.fit.localeCompare(b.fit));
  return `<div class="two" style="margin-top:1rem"><div class="panel"><h2><span>My Holidays</span><button class="btn sm" data-act="bookMine">Book holiday</button></h2>${H.map((h) => `<div class="row"><span><b>${fd(h.from)} to ${fd(h.to)}</b><br><span class="muted">${h.days} working day${h.days == 1 ? '' : 's'}${h.note ? ', ' + esc(h.note) : ''}</span></span>${holTag(h)}</div>`).join('') || emptyArt('holiday', 'No holiday booked yet.')}<p class="muted" style="margin:.6rem 0 0">${allowTot(m) - hu(m)} of ${allowTot(m)} days left this year.</p>${svcBox(m, false)}</div>
  <div class="panel"><h2>My Jobs</h2>${J.map((c) => `<div class="row"><span><b>${fd(c.fit)}</b> ${esc(c.name)}<br><span class="muted">${esc(c.product)}, ${esc(c.town || '')}</span></span></div>`).join('') || emptyArt('done', 'No fittings booked for you.')}</div></div>`;
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
    grid = `<div class="cm">${WD}${calCells(days, false)}</div>`;
  } else if (M == 'week') {
    const t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + o * 7),
      st = new Date(t.getFullYear(), t.getMonth(), t.getDate() - ((t.getDay() + 6) % 7));
    title = 'Week of ' + st.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    grid = `<div class="cm wk">${WD}${calCells(dRange(st, 7), true)}</div>`;
  } else {
    const st = new Date(n.getFullYear(), n.getMonth(), n.getDate() + o * 28),
      days = dRange(st, 28).filter((x) => evs(x.k).length || BH[x.k]);
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
            `<b>${new Date(x.k + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</b><div>${BH[x.k] ? `<span class="tag y">${esc(BH[x.k])}</span>` : ''}${evs(
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
    sd = C.sd,
    L = C.ly;
  const day = sd
    ? `<div class="panel" style="margin-top:1rem"><h2><span>${new Date(sd + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span><span class="acts"><button class="mini pri" ${onClick('holBook', '', sd)}>Book holiday</button><button class="mini" ${onClick('setUI', 'cal.sd', null)}>Close</button></span></h2>${BH[sd] ? `<span class="tag y">${esc(BH[sd])}</span>` : ''}${
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
  <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.6rem;margin-bottom:.8rem;align-items:center"><h2 style="margin:0">${esc(title)}</h2><div class="chips" style="margin:0">${[['fit', 'Fittings', '#034ea2'], ['svc', 'Service visits', '#e08a00'], ...(can('manage') ? [['del', 'Deliveries', '#7a4fd0']] : []), ['hol', 'Holidays', '#12794c']].map(([k, t, c]) => `<button class="chip ${L[k] ? 'on' : ''}" ${onClick('togUI', 'cal.ly.' + k)}><span class="ldot" style="background:${c}"></span>${t}</button>`).join('')}</div></div>${grid}${day}
  ${
    can('manage')
      ? `<div class="two" style="margin-top:1rem"><div class="panel"><h2>Upcoming Fittings</h2>${fits.map((c) => `<div class="row"><span><b>${fd(c.fit)}</b> ${esc(c.name)}<br><span class="muted">${esc(c.product)}, ${esc(c.town)} (${esc(c.fitter || 'no fitter')})</span></span><button class="mini pri" ${onClick('markFit', c.id)}>Mark fitted</button></div>`).join('') || '<p class="empty">No fittings booked.</p>'}</div>
  <div class="panel"><h2>Needs A Fit Date</h2>${un.map((c) => `<div class="row"><span><b>${esc(c.name)}</b> <span class="muted">#${esc(c.id)}</span><br><span class="muted">${esc(c.product)}</span></span><button class="mini" ${onClick('editContract', c.id)}>Set date</button></div>`).join('') || '<p class="empty">Everything has a date.</p>'}</div></div>`
      : calMine()
  }`;
}
export function calMode(k) {
  uiState.cal.o = 0;
  setUI('cal.m', k);
}
