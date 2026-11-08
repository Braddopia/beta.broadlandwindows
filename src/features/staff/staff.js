/* features/staff/staff: The Staff page. */
import { SCATS } from '../../config/constants.js';
import { onClick, rowClick } from '../../core/actions.js';
import { fd, today } from '../../core/dates.js';
import { esc } from '../../core/dom.js';
import { m0, sum } from '../../core/format.js';
import { shortId } from '../../core/ids.js';
import { audit } from '../../data/audit.js';
import { state } from '../../data/state.js';
import { allowTot, hu } from '../../domain/holidays.js';
import { callsOf, jobsOf, renamePerson } from '../../domain/people.js';
import { ISOWN, need } from '../auth/session.js';
import { form } from '../../ui/forms/form.js';
import { hit } from '../../ui/shell/router.js';
import { uiState } from '../../ui/ui-state.js';

/* ---------------- staff ---------------- */
export function vStaff() {
  const td = today(),
    Ad = ISOWN(),
    U = uiState.staff,
    L = state.staff.filter((s) => hit(s) && (U.c == 'all' || s.cat == U.c)),
    off = state.hols.filter((h) => h.status == 'Approved' && h.from <= td && h.to >= td).length,
    pend = state.hols.filter((h) => h.status == 'Pending');
  return `<div class="head"><h1>Staff</h1><div class="tools">${Ad ? '<button class="btn" data-act="editStaff">Add staff member</button>' : ''}</div></div>
  <div class="kpis">${[
    ['Headcount', state.staff.length],
    ['On holiday today', off],
    ['Holiday requests', pend.length],
    ['Jobs on hand', sum(state.staff, (s) => jobsOf(s).length)],
  ]
    .map((k) => `<div class="kpi"><small>${k[0]}</small><b>${k[1]}</b></div>`)
    .join('')}</div>
  <div class="views">${[['all', 'All Staff'], ...SCATS.map((c) => [c, c])].map(([k, n]) => `<button class="chip ${U.c == k ? 'on' : ''}" ${onClick('setUI', 'staff.c', k)}>${esc(n)} <i>${k == 'all' ? state.staff.length : state.staff.filter((s) => s.cat == k).length}</i></button>`).join('')}</div>
  <div class="tw"><table><thead><tr><th>Name</th><th>Category</th><th class="c-sm">Contact</th><th class="c-md">Started</th><th>Holiday left</th><th class="n c-sm">Jobs</th><th class="n c-md">Open calls</th>${Ad ? '<th class="n c-md">Salary</th>' : ''}<th class="ac"></th></tr></thead><tbody>${
    L.map((s) => {
      const left = allowTot(s) - hu(s),
        p = Math.max(0, Math.round((100 * left) / (allowTot(s) || 1)));
      return `<tr class="clk-r" ${rowClick('editStaff', s.id)}><td><b>${esc(s.name)}</b><br><span class="muted">${esc(s.role)}${s.team ? ' &middot; ' + esc(s.team) : ''}</span></td><td><span class="tag ${{ Salespeople: '', Fitters: 'g', Office: '', Factory: 'y' }[s.cat] || ''}">${esc(s.cat || '-')}</span></td><td class="c-sm nocap"><a href="tel:${esc(s.phone)}">${esc(s.phone)}</a><br><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></td><td class="c-md">${fd(s.start)}</td><td><b>${left}</b> of ${allowTot(s)} days<div class="bar"><i style="width:${p}%"></i></div></td><td class="n c-sm">${jobsOf(s).length}</td><td class="n c-md">${callsOf(s).length}</td>${Ad ? `<td class="n c-md">${m0(s.salary)}</td>` : ''}<td class="ac"><div class="acts r"><button class="mini pri" ${onClick('holBook', s.id)}>Book holiday</button>${Ad ? `<button class="mini" ${onClick('editStaff', s.id)}>Edit</button><button class="mini del" ${onClick('del', 'staff', s.id)}>Delete</button>` : ''}</div></td></tr>`;
    }).join('') || '<tr><td colspan="9" class="empty">No staff match.</td></tr>'
  }</tbody></table></div>`;
}
export function editStaff(id) {
  if (!need(ISOWN, 'Editing staff')) return;
  const x = state.staff.find((u) => u.id == id);
  form(
    x ? 'Edit ' + x.name : 'Add Staff Member',
    [
      { k: 'name', l: 'Name', req: 1 },
      { k: 'cat', l: 'Category', t: 'select', o: SCATS, req: 1 },
      { k: 'role', l: 'Job title' },
      { k: 'team', l: 'Team', t: 'select', o: [['', 'None'], 'Team A', 'Team B'] },
      { k: 'start', l: 'Start date', t: 'date' },
      { k: 'phone', l: 'Phone', t: 'tel', max: 30 },
      { k: 'email', l: 'Email', t: 'email' },
      {
        k: 'allow',
        l: 'Base holiday allowance (days)',
        t: 'number',
        max: 60,
        dp: 0,
        hint: '25 is standard. Service days are added automatically.',
      },
      { k: 'pension', l: 'Pension extra (days)', t: 'number', max: 10, dp: 0 },
      { k: 'carry', l: 'Carried over from last year (days)', t: 'number', max: 20, dp: 1 },
      { k: 'salary', l: 'Annual salary (£)', t: 'number', max: 1e6 },
    ],
    x || { allow: 25, pension: 0, carry: 0, team: '', cat: uiState.staff.c != 'all' ? uiState.staff.c : 'Office' },
    (o) => {
      const old = x && x.name;
      if (x) Object.assign(x, o);
      else state.staff.push({ id: shortId('U'), ...o });
      if (old && old != o.name) renamePerson(old, o.name);
      audit(x ? 'Staff edited' : 'Staff added', o.name, old && old != o.name ? 'Renamed from ' + old : '');
    }
  );
}
