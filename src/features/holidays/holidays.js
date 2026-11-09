/* features/holidays/holidays: The Holiday Planner, booking and approving holidays. */
import { onClick } from '../../core/actions.js';
import { BH, fd, isWk, today } from '../../core/dates.js';
import { $, $$, esc } from '../../core/dom.js';
import { pad, sum } from '../../core/format.js';
import { shortId } from '../../core/ids.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import {
  HC,
  HCODES,
  HGRP,
  absCode,
  allowTot,
  holDays,
  holLeft,
  hu,
  shutDays,
  svcExtra,
  svcYears,
  yearCounts,
} from '../../domain/holidays.js';
import { forPerson, holOn, me, staffName } from '../../domain/people.js';
import { can } from '../../domain/permissions.js';
import { need } from '../auth/session.js';
import { holTag } from '../../ui/components/tags.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { uiState } from '../../ui/ui-state.js';
import * as repos from '../../data/repository.js';

/* typing a code into a day on the holiday chart */
export function hcSet(sid, k, raw) {
  if (!can('manage')) return false;
  const s = state.staff.find((x) => x.id == sid);
  if (!s || !SAFE.date(k)) return false;
  let v = String(raw || '')
    .trim()
    .toUpperCase();
  if (v == '?') return true;
  if (v && !HC[v]) {
    toast('"' + v + '" is not a code. Use H, H1, H2, S, M, C, A, B, N or U');
    return false;
  }
  const m = (state.abs[sid] = state.abs[sid] || {}),
    before = absCode(s, k);
  if (v == before) return true;
  if (!v) {
    delete m[k];
    if (absCode(s, k)) m[k] = '';
  } else {
    delete m[k];
    if (absCode(s, k) != v) m[k] = v;
  }
  audit('Holiday chart', s.name, k + ': ' + (v || 'cleared'));
  store();
  return true;
}
export function shutEdit() {
  if (!need('manage', 'Changing the Christmas shutdown')) return;
  const y = uiState.hol.y,
    cur = shutDays(y),
    days = Array.from({ length: 17 }, (_, i) => y + '-12-' + pad(15 + i)).filter((k) => isWk(k));
  openModal(
    `<h2>Christmas Shutdown ${y}</h2><p class="muted">These days are booked as holiday for everyone and come off their allowance.</p><div class="rck-g">${days.map((k) => `<label class="rckl"><input type="checkbox" class="shd" value="${k}" ${cur.includes(k) ? 'checked' : ''} ${BH[k] ? 'disabled' : ''}><span>${new Date(k + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}${BH[k] ? ' (bank holiday)' : ''}</span></label>`).join('')}</div>
  <div class="mact"><button class="btn ghost" ${onClick('shutReset', y)}>Use default</button><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" ${onClick('shutSave', y)}>Save</button></div>`,
    'sm'
  );
}
export function shutSave(y) {
  if (!need('manage', 'Changing the Christmas shutdown')) return;
  state.shut[y] = $$('#mbox .shd:checked')
    .map((e) => SAFE.date(e.value))
    .filter(Boolean);
  audit('Christmas shutdown', String(y), state.shut[y].length + ' days');
  store();
  closeModal();
  render();
}
export function shutReset(y) {
  if (!need('manage', 'Changing the Christmas shutdown')) return;
  delete state.shut[y];
  audit('Christmas shutdown', String(y), 'Reset to default');
  store();
  closeModal();
  render();
}
/* spreadsheet look: one sheet per month plus a Database sheet, tabs along the bottom */
export const MSHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function holSheet() {
  const H = uiState.hol,
    y = H.y,
    mo = H.cm,
    td = today(),
    Ad = can('manage'),
    mine = me();
  const grp = HGRP.map((g) => [g, state.staff.filter((s) => (s.cat || 'Office') == g)]).filter((x) => x[1].length);
  const last = (state.audit || []).find((a) => /Holiday chart|Holiday approved|Christmas shutdown/i.test(a.a || ''));
  const side = `<aside class="xl-side"><div class="xl-title">Code Control</div><table class="xl-ct"><thead><tr><th>Absence Type</th><th>Code</th><th>Deduction</th></tr></thead><tbody>${HCODES.map((c) => `<tr><td>${esc(c[1])}</td><td style="background:${c[3]}"><b>${c[0]}</b></td><td>${c[2]}</td></tr>`).join('')}</tbody></table>
    <p class="xl-tip">${Ad ? 'Click a day and type a code from the table (H, H1, H2, S, M, C, A, B, N or U). Press Enter or Tab to move on. Delete the code to clear the day.' : 'Click a free weekday on your own row to ask for holiday.'}</p>
    <div class="xl-title">Useful Info</div><div class="xl-info"><p>After 5 years service = +1 holiday day<br>After 10 years service = +1 holiday day<br>After 15 years service = +1 holiday day<br>3 extra holiday days maximum</p><p>Standard allowance is 25 days. Booked includes the ${shutDays(y).length} Christmas shutdown days.</p><p>? = waiting for approval</p></div>
    ${last ? `<p class="xl-upd">Last updated by: ${esc(last.by || '')} ${new Date(last.at).toLocaleDateString('en-GB')}</p>` : ''}</aside>`;
  let main;
  if (mo < 12) {
    const dim = new Date(y, mo + 1, 0).getDate(),
      keys = Array.from({ length: dim }, (_, i) => y + '-' + pad(mo + 1) + '-' + pad(i + 1));
    const wk = [];
    let w = 1;
    keys.forEach((k, i) => {
      if (i && new Date(k + 'T00:00').getDay() == 1) w++;
      wk.push(w);
    });
    const ws = [];
    wk.forEach((n) => {
      const l = ws[ws.length - 1];
      if (l && l[0] == n) l[1]++;
      else ws.push([n, 1]);
    });
    const cell = (s, k) => {
      const c = absCode(s, k),
        def = HC[c],
        we = !isWk(k),
        can = mine && mine.id == s.id && !c && !we,
        tt = `${esc(s.name)}, ${fd(k)}${def ? ': ' + esc(def[1]) : c == 'P' ? ': waiting for approval' : ''}`;
      if (Ad)
        return `<td class="${we ? 'we' : ''} ${k == td ? 'td' : ''} ${c == 'P' ? 'pd' : ''} ed" ${def ? `style="background:${def[3]}"` : ''} title="${tt}"><input class="hci" value="${c == 'P' ? '?' : esc(c)}" maxlength="2" autocomplete="off" spellcheck="false" aria-label="${tt}" data-s="${esc(s.id)}" data-k="${k}"></td>`;
      return `<td class="${we ? 'we' : ''} ${k == td ? 'td' : ''} ${c == 'P' ? 'pd' : ''}" ${def ? `style="background:${def[3]}"` : ''} title="${tt}" ${can ? onClick('holBook', s.id, k) : ''}>${c == 'P' ? '?' : esc(c)}</td>`;
    };
    main = grp
      .map(
        ([
          g,
          L,
        ]) => `<div class="xl-title">${esc(g)}</div><div class="xl-scroll"><table class="xl-g"><thead><tr class="wk"><th></th>${ws.map(([n, c]) => `<th colspan="${c}">Week ${n}</th>`).join('')}<th></th></tr>
      <tr class="xh"><th rowspan="3" class="nmh"></th>${keys.map((k) => `<th class="${isWk(k) ? '' : 'we'}">${MSHORT[mo]}</th>`).join('')}<th rowspan="3" class="tot">Holidays<br>This Month</th></tr>
      <tr class="xh">${keys.map((k) => `<th class="${isWk(k) ? '' : 'we'} ${k == td ? 'tdh' : ''}">${+k.slice(8)}</th>`).join('')}</tr><tr class="xh">${keys.map((k) => `<th class="${isWk(k) ? '' : 'we'}">${new Date(k + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short' })}</th>`).join('')}</tr></thead>
      <tbody>${L.map(
        (s) =>
          `<tr><td class="nm"><span class="rm" title="Days left this year">${allowTot(s) - hu(s, y)}</span>${esc(s.name)}</td>${keys.map((k) => cell(s, k)).join('')}<td class="tot">${sum(
            keys,
            (k) => {
              const c = HC[absCode(s, k)];
              return c ? c[2] : 0;
            }
          )}</td></tr>`
      ).join('')}</tbody></table></div>`
      )
      .join('');
  } else {
    const yc = Object.fromEntries(state.staff.map((s) => [s.id, yearCounts(s, y)])),
      n = (s, c) => yc[s.id][c] || 0;
    const hd = [
      ['Base Allowance', ''],
      ['Pension Extra', ''],
      ['Service Extra', ''],
      ['Total Allowance', ''],
      ['Holiday Remaining', '#e9c3ee'],
      ['Years Service', ''],
      ['Holiday Booked INC. ' + shutDays(y).length + ' XMAS', '#7cbc44'],
      ['Half Day (Morning)', '#add58a'],
      ['Half Day (Afternoon)', '#add58a'],
      ['Sickness', '#f7a19a'],
      ['Maternity Paternity', '#fcc79b'],
      ['Compassionate', '#f3a6f3'],
      ['Absent', '#f6e39b'],
      ['Bank Holiday', '#a8dcc0'],
      ['Non Working Day', '#a8cff2'],
      ['Voluntary Unpaid', '#eaf7a9'],
      ['Carry Over ' + (y - 1), ''],
    ];
    main = grp
      .map(
        ([
          g,
          L,
        ]) => `<div class="xl-title">${esc(g)}</div><div class="xl-scroll"><table class="xl-g xl-db"><thead><tr class="xh"><th class="nmh"></th>${hd.map(([h, c]) => `<th ${c ? `style="background:${c}!important;color:#13233a!important"` : ''}>${esc(h)}</th>`).join('')}${Ad ? '<th></th>' : ''}</tr></thead>
      <tbody>${L.map((s) => {
        const b = hu(s, y);
        return `<tr><td class="nm">${esc(s.name)}</td><td>${+s.allow || 0}</td><td>${+s.pension || ''}</td><td>${svcExtra(s) || ''}</td><td>${allowTot(s)}</td><td class="pk"><b>${allowTot(s) - b}</b></td><td>${s.start ? svcYears(s) : ''}</td><td>${n(s, 'H')}</td><td>${n(s, 'H1')}</td><td>${n(s, 'H2')}</td><td>${n(s, 'S')}</td><td>${n(s, 'M')}</td><td>${n(s, 'C')}</td><td>${n(s, 'A')}</td><td>${n(s, 'B')}</td><td>${n(s, 'N')}</td><td>${n(s, 'U')}</td><td>${+s.carry || ''}</td>${Ad ? `<td><button class="mini" ${onClick('editStaff', s.id)}>Edit</button></td>` : ''}</tr>`;
      }).join('')}</tbody></table></div>`
      )
      .join('');
  }
  const tabs = `<div class="xl-tabs">${MSHORT.map((m, i) => `<button class="${i == mo ? 'on' : ''}" ${onClick('setUI', 'hol.cm', i)}>${new Date(y, i, 1).toLocaleDateString('en-GB', { month: 'long' })} (${pad(i + 1)})</button>`).join('')}<button class="${mo == 12 ? 'on' : ''}" ${onClick('setUI', 'hol.cm', 12)}>Database</button></div>`;
  return `<div class="xls"><div class="xl-yr">${y}</div><div class="xl-body"><div class="xl-main">${main}</div>${side}</div>${tabs}</div>`;
}
/* ---------------- holiday planner ---------------- */
export function clashes() {
  const o = [];
  state.contracts
    .filter((c) => c.fit && c.stage != 'Complete')
    .forEach((c) =>
      state.staff.forEach((s) => {
        if (forPerson(s, c.fitter) && holOn(s.id, c.fit))
          o.push(`${s.name} is off on ${fd(c.fit)} but ${c.fitter} has fitting #${c.id} (${c.name})`);
      })
    );
  state.calls
    .filter((c) => c.visit && c.status != 'Complete')
    .forEach((c) =>
      state.staff.forEach((s) => {
        if (forPerson(s, c.fitter) && holOn(s.id, c.visit))
          o.push(`${s.name} is off on ${fd(c.visit)} but has service visit #${c.id}`);
      })
    );
  return o;
}
export function vHolidays() {
  if (uiState.hol.v == 'chart') {
    const H = uiState.hol,
      Ad = can('manage'),
      pend = state.hols.filter((h) => h.status == 'Pending');
    return `<div class="head"><h1>Holiday Planner</h1><div class="tools"><div class="seg">${[
      ['chart', 'Chart'],
      ['tl', 'Month'],
      ['yr', 'Year'],
    ]
      .map(([k, t]) => `<button class="${H.v == k ? 'on' : ''}" ${onClick('setUI', 'hol.v', k)}>${t}</button>`)
      .join(
        ''
      )}</div><button class="btn ghost" aria-label="Previous year" ${onClick('setUI', 'hol.y', H.y - 1)}>&lsaquo;</button><b style="min-width:3rem;text-align:center">${H.y}</b><button class="btn ghost" aria-label="Next year" ${onClick('setUI', 'hol.y', H.y + 1)}>&rsaquo;</button>${Ad ? '<button class="btn ghost" data-act="shutEdit">Christmas shutdown</button>' : ''}<button class="btn" data-act="holBook">Book holiday</button></div></div>
    ${holSheet()}
    ${pend.length ? `<div class="panel" style="margin-top:1rem"><h2>Waiting For Approval</h2>${pend.map((h) => `<div class="row"><span><b>${esc(staffName(h.sid))}</b> <span class="muted">${fd(h.from)} to ${fd(h.to)}, ${h.days} day${h.days == 1 ? '' : 's'}</span></span><span class="acts">${Ad ? `<button class="mini pri" ${onClick('holSet', h.id, 'Approved')}>Approve</button><button class="mini del" ${onClick('holSet', h.id, 'Rejected')}>Reject</button>` : holTag(h)}</span></div>`).join('')}</div>` : ''}`;
  }
  const n = new Date(),
    H = uiState.hol,
    b = new Date(n.getFullYear(), n.getMonth() + H.m, 1),
    y = b.getFullYear(),
    mo = b.getMonth(),
    dim = new Date(y, mo + 1, 0).getDate(),
    td = today(),
    Ad = can('manage'),
    pend = state.hols.filter((h) => h.status == 'Pending'),
    cl = clashes();
  const off = state.staff.filter((s) => holOn(s.id, td)).length,
    booked = sum(
      state.hols.filter((h) => h.status == 'Approved'),
      (h) => h.days
    );
  const keys = Array.from({ length: dim }, (_, i) => y + '-' + pad(mo + 1) + '-' + pad(i + 1));
  const tl = `<div class="tl"><div class="tlg" style="grid-template-columns:11rem repeat(${dim},2.2rem)"><div class="nm hd" style="align-items:flex-start">Team</div>${keys.map((k) => `<div class="hd ${isWk(k) ? '' : 'we'} ${BH[k] ? 'bh' : ''} ${k == td ? 'td' : ''}" title="${esc(BH[k] || '')}"><span>${'SMTWTFS'[new Date(k + 'T00:00').getDay()]}</span><b>${+k.slice(8)}</b></div>`).join('')}
  ${state.staff
    .map(
      (s) =>
        `<div class="nm">${esc(s.name)}</div>` +
        keys
          .map((k) => {
            const h = holOn(s.id, k);
            return h
              ? `<div class="hv ${h.status == 'Pending' ? 'pd' : ''} ${k == td ? 'td' : ''}" title="${esc(s.name)}: ${esc(h.status)}" ${onClick('holEdit', h.id)}>${h.status == 'Pending' ? '?' : ''}</div>`
              : `<div class="${isWk(k) ? '' : 'we'} ${BH[k] ? 'bh' : ''} ${k == td ? 'td' : ''}" ${onClick('holBook', s.id, k)}></div>`;
          })
          .join('')
    )
    .join('')}
  <div class="nm" style="font-weight:500">People off</div>${keys
    .map((k) => {
      const c = state.staff.filter((s) => holOn(s.id, k)).length;
      return `<div class="cov ${c >= 3 ? 'x' : c == 2 ? 'w' : ''}">${isWk(k) && c ? c : ''}</div>`;
    })
    .join('')}</div></div>`;
  const yr = (() => {
    const cnt = {};
    state.hols
      .filter((h) => h.status != 'Rejected')
      .forEach((h) => {
        const d = new Date(h.from + 'T00:00'),
          e = new Date(h.to + 'T00:00');
        while (d <= e) {
          const g = d.getDay();
          if (g && g < 6 && d.getFullYear() == y) {
            const k = h.sid + '|' + d.getMonth();
            cnt[k] = (cnt[k] || 0) + 1;
          }
          d.setDate(d.getDate() + 1);
        }
      });
    return `<div class="tw"><table><thead><tr><th>${y}</th>${[...Array(12)].map((_, i) => `<th class="n">${new Date(y, i, 1).toLocaleDateString('en-GB', { month: 'short' })}</th>`).join('')}</tr></thead><tbody>${state.staff
      .map(
        (s) =>
          `<tr><td><b>${esc(s.name)}</b></td>${[...Array(12)]
            .map((_, i) => {
              const c = cnt[s.id + '|' + i] || 0;
              return `<td class="heat" style="${c ? `background:rgba(18,121,76,${Math.min(0.15 + c / 20, 0.6)})` : ''}">${c || ''}</td>`;
            })
            .join('')}</tr>`
      )
      .join('')}</tbody></table></div>`;
  })();
  const step = H.v == 'yr' ? 12 : 1;
  return `<div class="head"><h1>Holiday Planner</h1><div class="tools"><div class="seg">${[
    ['chart', 'Chart'],
    ['tl', 'Month'],
    ['yr', 'Year'],
  ]
    .map(([k, t]) => `<button class="${H.v == k ? 'on' : ''}" ${onClick('setUI', 'hol.v', k)}>${t}</button>`)
    .join(
      ''
    )}</div><button class="btn ghost" aria-label="Previous" ${onClick('setUI', 'hol.m', H.m - step)}>&lsaquo;</button><button class="btn ghost" ${onClick('setUI', 'hol.m', 0)}>Today</button><button class="btn ghost" aria-label="Next" ${onClick('setUI', 'hol.m', H.m + step)}>&rsaquo;</button><button class="btn" data-act="holBook">Book holiday</button></div></div>
  <div class="kpis">${[
    ['Off today', off],
    ['Pending requests', pend.length],
    ['Days booked', booked],
    ['Clashes', cl.length],
  ]
    .map((k) => `<div class="kpi ${k[0] == 'Clashes' && k[1] ? 'bad' : ''}"><small>${k[0]}</small><b>${k[1]}</b></div>`)
    .join('')}</div>
  <h2>${H.v == 'yr' ? y : b.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} <span class="muted" style="font:500 .78rem var(--body)">${H.v == 'yr' ? 'working days off per month' : 'click a day to book, click a bar to manage. Green = approved, striped = pending, yellow = bank holiday'}</span></h2>${H.v == 'yr' ? yr : tl}
  ${cl.length ? `<div class="panel" style="margin-top:1rem"><h2>Clashes With Booked Work</h2>${cl.map((x) => `<div class="row warn">${esc(x)}</div>`).join('')}</div>` : ''}
  <div class="two" style="margin-top:1rem"><div class="panel"><h2>Allowances</h2>${state.staff
    .map((s) => {
      const t = hu(s),
        p = sum(
          state.hols.filter((h) => h.sid == s.id && h.status == 'Pending'),
          (h) => h.days
        );
      return `<div class="row"><span style="flex:1"><b>${esc(s.name)}</b><br><span class="muted">${t} booked${p ? ', ' + p + ' pending' : ''} of ${allowTot(s)}</span><div class="bar"><i style="width:${Math.min(100, Math.round((100 * t) / (allowTot(s) || 1)))}%"></i></div></span><b>${allowTot(s) - t} left</b></div>`;
    })
    .join('')}</div>
  <div class="panel"><h2>Requests And Bookings</h2>${
    [...state.hols]
      .sort((a, c) => (c.status == 'Pending') - (a.status == 'Pending') || c.from.localeCompare(a.from))
      .map(
        (h) =>
          `<div class="row"><span><b>${esc(staffName(h.sid))}</b> <span class="muted">${fd(h.from)} to ${fd(h.to)}, ${h.days} day${h.days == 1 ? '' : 's'}${h.note ? ' | ' + esc(h.note) : ''}</span></span><span class="acts">${holTag(h)}${Ad && h.status == 'Pending' ? `<button class="mini pri" ${onClick('holSet', h.id, 'Approved')}>Approve</button><button class="mini del" ${onClick('holSet', h.id, 'Rejected')}>Reject</button>` : ''}</span></div>`
      )
      .join('') || '<p class="empty">No holiday booked.</p>'
  }${Ad ? '' : '<p class="muted" style="font-size:.82rem;margin-top:.6rem">Requests are approved by an administrator.</p>'}</div></div>`;
}
export function holSetClose(id, st) {
  holSet(id, st);
  closeModal();
}
export function holSet(id, st) {
  if (!need('manage', 'Approving holiday')) return;
  const h = state.hols.find((x) => x.id == id);
  if (!h) return;
  h.status = st;
  audit('Holiday ' + st.toLowerCase(), staffName(h.sid), h.from + ' to ' + h.to);
  store();
  render();
}
export function holBook(sid, day) {
  const d = day || today();
  if (!sid && !can('manage')) {
    const m = me();
    if (m) sid = m.id;
  }
  openModal(
    `<h2>Book Holiday</h2><div class="dfm"><label>Staff member<select id="hs" data-onchange="holChk">${state.staff.map((s) => `<option value="${esc(s.id)}" ${s.id == sid ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label><label>From<input type="date" id="hf" value="${esc(d)}" data-onchange="holChk"></label><label>To<input type="date" id="ht" value="${esc(d)}" data-onchange="holChk"></label><fieldset class="paidq"><legend>Paid or unpaid<span class="req" aria-hidden="true">*</span></legend><label class="cbl"><input type="radio" name="hpaid" value="paid" data-onchange="holChk"> Paid holiday (uses allowance)</label><label class="cbl"><input type="radio" name="hpaid" value="unpaid" data-onchange="holChk"> Unpaid leave</label></fieldset><label>Note (optional)<input id="hn" maxlength="120"></label><div id="hi" style="margin-top:.7rem;font-size:.88rem"></div></div><div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" data-act="holSave">${can('manage') ? 'Book holiday' : 'Send request'}</button></div>`
  );
  holChk();
}
/** the paid / unpaid choice in the booking form: true, false, or null if not chosen */
function paidChoice() {
  const c = document.querySelector('input[name=hpaid]:checked');
  return c ? c.value == 'paid' : null;
}
export function holChk() {
  const s = state.staff.find((x) => x.id == $('#hs').value),
    f = $('#hf').value;
  let t = $('#ht').value;
  if (!s || !f) return;
  if (t < f) {
    $('#ht').value = t = f;
  }
  const n = holDays(f, t),
    left = holLeft(s, +f.slice(0, 4)),
    unpaid = paidChoice() === false,
    w = [];
  if (n > left && !unpaid) w.push('Only ' + left + ' days left');
  state.contracts
    .filter((c) => c.fit && c.stage != 'Complete' && c.fit >= f && c.fit <= t && forPerson(s, c.fitter))
    .forEach((c) => w.push('Fitting #' + c.id + ' is booked on ' + fd(c.fit)));
  const mates = state.staff.filter(
    (x) => x.id != s.id && state.hols.some((h) => h.sid == x.id && h.status != 'Rejected' && h.from <= t && h.to >= f)
  );
  if (mates.length) w.push('Also off in this period: ' + mates.map((x) => x.name.split(' ')[0]).join(', '));
  $('#hi').innerHTML =
    `<b>${n} working day${n == 1 ? '' : 's'}</b> <span class="muted">(${left} left)</span>` +
    w.map((x) => `<div class="warn">${esc(x)}</div>`).join('');
}
export function holSave() {
  const sid = $('#hs').value,
    s = state.staff.find((x) => x.id == sid),
    f = SAFE.date($('#hf').value),
    t = SAFE.date($('#ht').value);
  if (!s || !f || !t) {
    toast('Pick valid dates');
    return;
  }
  const n = holDays(f, t),
    left = holLeft(s, +f.slice(0, 4)),
    paid = paidChoice();
  if (paid == null) {
    toast('Choose paid holiday or unpaid leave');
    const q = $('.paidq');
    if (q) q.classList.add('bad');
    return;
  }
  if (!n) {
    toast('Those days are weekends, bank holidays or the Christmas shutdown');
    return;
  }
  if (paid && n > left) {
    toast('Only ' + left + ' days left');
    return;
  }
  if (!can('manage') && me() && sid != me().id) {
    toast('You can only request your own holiday');
    return;
  }
  repos.holidays.add({
    id: shortId('H'),
    sid,
    from: f,
    to: t,
    days: n,
    status: can('manage') ? 'Approved' : 'Pending',
    paid,
    note: SAFE.text($('#hn').value, 120),
  });
  audit(can('manage') ? 'Holiday booked' : 'Holiday requested', s.name, f + ' to ' + t);
  store();
  closeModal();
  render();
  toast(can('manage') ? 'Holiday booked' : 'Request sent for approval');
}
export function holEdit(id) {
  const h = state.hols.find((x) => x.id == id);
  if (!h) return;
  const Ad = can('manage'),
    mine = me() && me().id == h.sid;
  openModal(
    `<h2>${esc(staffName(h.sid))}</h2><p>${fd(h.from)} to ${fd(h.to)}, ${h.days} working day${h.days == 1 ? '' : 's'}<br>${holTag(h)} ${paidTag(h)}</p>${h.note ? `<p class="muted">${esc(h.note)}</p>` : ''}<div class="mact"><button class="btn ghost" data-act="closeModal">Close</button>${Ad && h.status != 'Approved' ? `<button class="btn green" ${onClick('holSetClose', id, 'Approved')}>Approve</button>` : ''}${Ad && h.status == 'Pending' ? `<button class="btn red" ${onClick('holSetClose', id, 'Rejected')}>Reject</button>` : ''}${Ad || (mine && h.status == 'Pending') ? `<button class="btn ghost" ${onClick('holDel', id)}>${h.status == 'Pending' && !Ad ? 'Cancel request' : 'Delete'}</button>` : ''}</div>`
  );
}
export function holDel(id) {
  const h = state.hols.find((x) => x.id == id);
  if (!h) return;
  if (!can('manage') && !(me() && me().id == h.sid && h.status == 'Pending')) {
    toast('Only an administrator can remove this');
    return;
  }
  repos.holidays.remove((x) => x.id == id);
  audit('Holiday removed', staffName(h.sid), h.from + ' to ' + h.to);
  store();
  closeModal();
  render();
}
/* start-up step (run once by main.js) */
export function listenForHolidayChart() {
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!el.classList || !el.classList.contains('hci')) return;
    const ok = hcSet(el.dataset.s, el.dataset.k, el.value);
    if (!ok) {
      const s = state.staff.find((x) => x.id == el.dataset.s);
      el.value = s ? absCode(s, el.dataset.k) : '';
      el.select();
      return;
    }
    const s = state.staff.find((x) => x.id == el.dataset.s),
      c = absCode(s, el.dataset.k),
      d = HC[c];
    el.value = c;
    el.parentElement.style.background = d ? d[3] : '';
    const row = el.closest('tr');
    if (row) {
      const tot = row.querySelector('td.tot');
      if (tot) {
        const ks = [...row.querySelectorAll('.hci')].map((x) => x.dataset.k);
        tot.textContent = sum(ks, (k) => {
          const q = HC[absCode(s, k)];
          return q ? q[2] : 0;
        });
      }
      const rm = row.querySelector('.rm');
      if (rm) rm.textContent = allowTot(s) - hu(s, uiState.hol.y);
    }
  });
  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (!el.classList || !el.classList.contains('hci')) return;
    const mv = (dx, dy) => {
      const td = el.parentElement,
        tr = td.parentElement,
        i = [...tr.children].indexOf(td);
      let n = null;
      if (dx) {
        let x = td;
        do {
          x = dx > 0 ? x.nextElementSibling : x.previousElementSibling;
        } while (x && !x.querySelector('.hci'));
        n = x;
      } else {
        let r = tr;
        do {
          r = dy > 0 ? r.nextElementSibling : r.previousElementSibling;
        } while (r && !r.children[i]?.querySelector('.hci'));
        n = r && r.children[i];
      }
      const inp = n && n.querySelector('.hci');
      if (inp) {
        e.preventDefault();
        inp.focus();
        inp.select();
      }
    };
    if (e.key == 'Enter' || (e.key == 'ArrowRight' && el.selectionStart == el.value.length)) {
      el.dispatchEvent(new Event('change', { bubbles: true }));
      mv(1, 0);
    } else if (e.key == 'ArrowLeft' && el.selectionStart == 0) mv(-1, 0);
    else if (e.key == 'ArrowDown') mv(0, 1);
    else if (e.key == 'ArrowUp') mv(0, -1);
  });
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (el.classList && el.classList.contains('hci')) el.select();
  });
}

/** Paid / Unpaid tag (older bookings have no choice saved and count as paid) */
export const paidTag = (h) =>
  h.paid === false ? '<span class="tag n">Unpaid</span>' : '<span class="tag">Paid</span>';
/** every holiday of one person, newest first, by year */
export function myHolidays(sid) {
  const s = state.staff.find((x) => x.id == sid);
  if (!s) return;
  const L = state.hols.filter((h) => h.sid == sid).sort((a, b) => b.from.localeCompare(a.from)),
    years = [...new Set(L.map((h) => h.from.slice(0, 4)))];
  openModal(
    `<h2>${esc(s.name)}: All Holidays</h2>${
      years
        .map(
          (y) =>
            `<h3 class="fsec">${y}<span class="muted"> · ${sum(
              L.filter((h) => h.from.startsWith(y) && h.status == 'Approved' && h.paid !== false),
              (h) => h.days
            )} paid days taken</span></h3>${L.filter((h) => h.from.startsWith(y))
              .map(
                (h) =>
                  `<div class="row"><span>${fd(h.from)} to ${fd(h.to)} · ${h.days} day${h.days == 1 ? '' : 's'}${h.note ? `<br><span class="muted">${esc(h.note)}</span>` : ''}</span><span class="acts">${paidTag(h)}${holTag(h)}</span></div>`
              )
              .join('')}`
        )
        .join('') || '<p class="empty">No holidays booked yet.</p>'
    }<div class="mact"><button class="btn ghost" data-act="closeModal">Close</button></div>`
  );
}
