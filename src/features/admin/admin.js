/* features/admin/admin: The Admin Console. */
import { IDLE_MIN, ROLES } from '../../config/roles.js';
import { onClick, onEvent } from '../../core/actions.js';
import { fd, today } from '../../core/dates.js';
import { esc } from '../../core/dom.js';
import { csvDownload } from '../../ui/download.js';
import { kb, m0, money, pc, sum } from '../../core/format.js';
import { storeSize } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { allLeads } from '../../domain/leads.js';
import { staffName } from '../../domain/people.js';
import { unitOf } from '../../domain/stock.js';
import { can } from '../../domain/permissions.js';
import { need } from '../auth/session.js';
import { authPanel } from '../sign-in/sign-in.js';
import { tourTest } from '../tour/tour.js';
import { pagerH, paginate } from '../../ui/components/table.js';
import { ordTag, stars } from '../../ui/components/tags.js';
import { hit } from '../../ui/shell/router.js';
import { uiState } from '../../ui/ui-state.js';

/* ---------------- admin console ---------------- */
export function vAdmin() {
  if (!can('manage')) return '';
  const td = today(),
    owed = sum(state.contracts, (c) => Math.max(0, c.value - c.paid)),
    bills = state.fin.filter((b) => b.status == 'Unpaid'),
    pr = sum(state.staff, (x) => x.salary / 12),
    pend = state.hols.filter((h) => h.status == 'Pending'),
    od = bills.filter((b) => b.due < td),
    won = allLeads().filter((l) => l.stage == 'Won').length,
    lost = allLeads().filter((l) => l.stage == 'Lost').length,
    tot = won + lost || 1,
    rev = sum(state.contracts, (c) => c.value),
    paid = sum(state.contracts, (c) => c.paid),
    reqs = state.items.filter((r) => r.type == 'request' && r.reqStatus == 'Pending');
  let size = storeSize || JSON.stringify(state).length;
  const ph = Object.values(state.pphotos).reduce((a, x) => a + x.length, 0),
    defPins = Object.entries(state.sec.pins)
      .filter(([, p]) => p.def)
      .map(([k]) => ROLES[k].n);
  const AU = uiState.audit,
    pg = paginate(AU, state.audit.filter(hit));
  return `<div class="head"><h1>Admin Console</h1><div class="tools"><button class="btn ghost" data-act="chPin">Account PINs</button><button class="btn" ${onClick('go', 'finance')}>Open finance</button></div></div>
  <div class="kpis">${[
    ['Contract value', m0(rev)],
    ['Collected', m0(paid)],
    ['Owed to us', m0(owed)],
    ['Bills unpaid', m0(sum(bills, (b) => b.amount))],
  ]
    .map((k) => `<div class="kpi"><small>${k[0]}</small><b>${k[1]}</b></div>`)
    .join('')}</div>
  <div class="two">
   <div class="panel"><h2>Stock Requests To Approve</h2>${reqs.map((r) => `<div class="row"><span><b>${ordTag(r)} ${r.qty} ${esc(unitOf(r))} x ${esc(r.item)}</b><br><small class="muted">${esc(r.user)}, ${esc(r.time)}${r.note ? ', ' + esc(r.note) : ''}</small></span><span class="acts"><button class="mini pri" ${onClick('reqApprove', r.uid)}>Approve</button><button class="mini del" ${onClick('reqReject', r.uid)}>Reject</button></span></div>`).join('') || '<p class="empty">No requests waiting.</p>'}</div>
   <div class="panel"><h2>Holiday Requests</h2>${pend.map((h) => `<div class="row"><span><b>${esc(staffName(h.sid))}</b><br><small class="muted">${fd(h.from)} to ${fd(h.to)} (${h.days} days)</small></span><span class="acts"><button class="mini pri" ${onClick('holSet', h.id, 'Approved')}>Approve</button><button class="mini" ${onClick('holSet', h.id, 'Rejected')}>Decline</button></span></div>`).join('') || '<p class="empty">Nothing waiting for approval.</p>'}</div>
   <div class="panel"><h2>Overdue Bills</h2>${od.map((b) => `<div class="row"><span><b>${esc(b.payee)}</b><br><small class="muted">Due ${fd(b.due)}</small></span><b>${money(b.amount)}</b></div>`).join('') || '<p class="empty">No overdue bills.</p>'}</div>
   <div class="panel"><h2>Sales Health</h2><div class="row"><span>Lead win rate</span><b>${Math.round((won / tot) * 100)}%</b></div><div class="bar"><i style="width:${(won / tot) * 100}%"></i></div><div class="row" style="margin-top:.6rem"><span>Collected vs contract value</span><b>${pc(paid, rev)}</b></div><div class="bar"><i style="width:${rev ? (paid / rev) * 100 : 0}%"></i></div><div class="row" style="margin-top:.6rem"><span>Monthly payroll</span><b>${m0(pr)}</b></div></div>
   <div class="panel"><h2>Security And Data</h2>
    <div class="row"><span>Account PINs<br><small class="muted">${defPins.length ? esc(defPins.join(', ')) + ' still on the default PIN' : 'All accounts have their own PIN'}</small></span>${defPins.length ? '<span class="tag r">Action needed</span>' : '<span class="tag g">OK</span>'}</div>
    <div class="row"><span>Idle sign-out<br><small class="muted">Privileged accounts return to Standard user after ${IDLE_MIN} minutes</small></span><span class="tag g">On</span></div>
    <div class="row"><span>Connection<br><small class="muted">${window.isSecureContext ? 'Secure (https or local file)' : 'Not secure: use https'}</small></span><span class="tag ${window.isSecureContext ? 'g' : 'r'}">${window.isSecureContext ? 'OK' : 'Check'}</span></div>
    <div class="row"><span>Browser storage used<br><small class="muted">${ph} product photos stored</small></span><b>${kb(size)} used</b></div>
    <p class="muted" style="font-size:.78rem;margin:.2rem 0 0">Saved in the browser database on this device, room for hundreds of MB. Export a backup regularly.</p>
    <div class="acts" style="margin-top:.8rem"><button class="mini pri" data-act="chPin">Change PINs</button><button class="mini" data-act="backupDl">Download backup</button><label class="mini" style="cursor:pointer">Restore backup<input type="file" accept=".json,application/json" hidden data-onchange="backupLoad" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]"></label></div></div>
   <div class="panel"><h2><span>Reviews</span><button class="mini pri" data-act="editRatings">Update scores</button></h2><div class="row"><span>Trustpilot</span><span>${stars(state.brand.tp.score, '#e0a800', '#d9e1ee')} <b>${(+state.brand.tp.score).toFixed(1)}</b></span></div><div class="row"><span>Google</span><span>${stars(state.brand.g.score, '#e0a800', '#d9e1ee')} <b>${(+state.brand.g.score).toFixed(1)}</b></span></div><div class="row"><span>Trusted Trader</span><span><b>${(+(state.brand.tt || {}).score || 0).toFixed(1)}</b> / 5</span></div><div class="row"><span>ReferenceLine</span><span><b>${(+(state.brand.rl || {}).score || 0).toFixed(1)}</b> / 10</span></div><p class="muted" style="font-size:.8rem;margin:.5rem 0 0">Shown on the overview, the office board and customer documents.</p>
   <h3 class="nch" style="display:flex;justify-content:space-between;align-items:center">Review Quotes <button class="mini" data-act="addQuote">Add Quote</button></h3>${(state.brand.quotes || []).map((x, i) => `<div class="row"><span style="font-size:.84rem">“${esc(x.t.length > 90 ? x.t.slice(0, 90) + '…' : x.t)}” <small class="muted">${esc(x.src)}</small></span><button class="mini red" ${onClick('delQuote', i)} aria-label="Remove quote">Remove</button></div>`).join('') || '<p class="muted">No quotes yet.</p>'}</div>
   ${authPanel()}
   <div class="panel"><h2>Testing Tools</h2><label class="tsw"><input type="checkbox" ${tourTest() ? 'checked' : ''} ${onEvent('onchange', 'tourToggle', 'this.checked')}><span>Show the welcome tour every time the site opens</span></label><p class="muted" style="font-size:.82rem;margin:.4rem 0 .7rem">For testing. Turn it off before the team starts using the site, so the tour only shows once per browser.</p><button class="btn ghost sm" data-act="startTour">Start the tour now</button></div>
   <div class="panel"><h2>Quick Actions</h2><div class="acts" style="gap:.5rem"><button class="btn ghost" ${onClick('go', 'finance')}>Finance</button><button class="btn ghost" ${onClick('go', 'staff')}>Staff</button><button class="btn ghost" ${onClick('go', 'holidays')}>Holidays</button><button class="btn ghost" ${onClick('go', 'reports')}>Reports</button><button class="btn ghost" ${onClick('setRole', 'staff')}>Leave admin mode</button></div></div>
  </div>
  <div class="panel" style="margin-top:1rem;padding:0"><h2 style="padding:1rem 1.1rem 0"><span>Audit Trail <span class="muted" style="font:500 .78rem var(--body)">who changed what, and when</span></span><span class="acts"><button class="mini" data-act="auditCsv">Export CSV</button></span></h2>
   <div class="tw" style="border:0;box-shadow:none;border-radius:0"><table class="audit"><thead><tr><th>When</th><th>Who</th><th class="c-sm">Account</th><th>Action</th><th>Detail</th></tr></thead><tbody>${pg.rows.map((e) => `<tr><td>${new Date(e.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td>${esc(e.by)}</td><td class="c-sm">${esc((ROLES[e.role] || {}).n || e.role)}</td><td><b>${esc(e.a)}</b></td><td>${esc(e.t)}${e.d ? ' <span class="muted">' + esc(e.d) + '</span>' : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Nothing logged yet. Changes made from now on are recorded here.</td></tr>'}</tbody></table></div><div style="padding:0 1rem 1rem">${pagerH('audit', pg, 'entries')}</div></div>`;
}
export function auditCsv() {
  if (!need('manage', 'The audit log')) return;
  csvDownload('broadland-audit-' + today() + '.csv', [
    ['When', 'Who', 'Account', 'Action', 'Target', 'Detail'],
    ...state.audit.map((e) => [new Date(e.at).toISOString(), e.by, e.role, e.a, e.t, e.d]),
  ]);
}
