/* ui/shell/router: The pages, the side menu and drawing the current page. */
import { ROLES } from '../../config/roles.js';
import { markExact } from '../../features/search/exact-rows.js';
import { previewNotice } from '../../features/records/preview-notice.js';
import { onClick } from '../../core/actions.js';
import { $, $$, esc } from '../../core/dom.js';
import { initials } from '../../core/format.js';
import { ICONS, svg } from '../../core/icons.js';
import { state } from '../../data/state.js';
import { me } from '../../domain/people.js';
import { products } from '../../domain/stock.js';
import { vAdmin } from '../../features/admin/admin.js';
import { ROLE } from '../../data/session.js';
import { can, canSee } from '../../domain/permissions.js';
import { HOME, setPendView, swRole } from '../../features/auth/session.js';
import { vCalendar } from '../../features/calendar/calendar.js';
import { vContacts } from '../../features/contacts/contacts.js';
import { vContracts } from '../../features/contracts/contracts.js';
import { vDeliveries } from '../../features/deliveries/deliveries.js';
import { loadMan, vFiles } from '../../features/files/files.js';
import { vFinance } from '../../features/finance/finance.js';
import { vHolidays } from '../../features/holidays/holidays.js';
import { vHome } from '../../features/home/home.js';
import { vLeads } from '../../features/leads/leads.js';
import { liveAfter, vLive } from '../../features/live-boards/live-boards.js';
import { msgUnread, msnAfter, vMessages } from '../../features/messages/messages.js';
import { ncCount, ncDraw } from '../../features/notifications/notifications.js';
import { vReports } from '../../features/reports/reports.js';
import { sbSync, srchMatch, srchText } from '../../features/search/search.js';
import { vService } from '../../features/service/service.js';
import { vCutting } from '../../features/cutting/cutting.js';
import { vSettings } from '../../features/settings/settings.js';
import { vStaff } from '../../features/staff/staff.js';
import { vStock } from '../../features/stock/stock.js';
import { vSuppliers } from '../../features/suppliers/suppliers.js';
import { countUp } from '../components/kpi.js';
import { closeFpop } from '../components/popover.js';
import { morph } from '../morph.js';

/* the search text typed in the top bar */
export function setQuery(v) {
  q = v;
}
export function setView(v) {
  view = v;
}
/* ---- views: key -> title, page function, optional after-render hook ---- */
export const VIEWS = {
  home: { t: 'Overview', fn: vHome },
  messages: { t: 'Messages', fn: vMessages, after: msnAfter },
  live: { t: 'Floor Boards', fn: vLive, after: liveAfter },
  deliveries: { t: 'Deliveries', fn: vDeliveries },
  suppliers: { t: 'Suppliers', fn: vSuppliers },
  leads: { t: 'Leads', fn: vLeads },
  contracts: { t: 'Contracts', fn: vContracts },
  fitting: { t: 'Calendar', fn: vCalendar },
  service: { t: 'Service Calls', fn: vService },
  cutting: { t: 'Panel Optimiser', fn: vCutting },
  stock: { t: 'Inventory', fn: vStock },
  contacts: { t: 'Contact Book', fn: vContacts },
  staff: { t: 'Staff', fn: vStaff },
  holidays: { t: 'Holiday Planner', fn: vHolidays },
  reports: { t: 'Reports', fn: vReports },
  downloads: { t: 'Files', fn: vFiles, after: loadMan },
  finance: { t: 'Finance', fn: vFinance },
  admin: { t: 'Admin Console', fn: vAdmin },
  settings: { t: 'Settings', fn: vSettings },
};
export const NG = [
  ['Workspace', ['home', 'messages', 'fitting', 'contacts']],
  ['Sales', ['leads', 'contracts']],
  ['Operations', ['live', 'deliveries', 'service']],
  ['Stock', ['stock', 'suppliers', 'cutting']],
  ['People', ['staff', 'holidays']],
  ['Insights', ['reports', 'downloads']],
  ['Admin', ['finance', 'admin', 'settings']],
];
/* the logo in the side menu goes back to the first page */
export function goHome() {
  go(HOME());
}
export let view = '',
  q = '',
  lastView = '';
/* render() opens the right first page for the account */

/* page filter: same matching as the top-bar search (19-search.js), so phone lists and spacing differences match too */
export const hit = (o) => !q || srchMatch(srchText(o), q);
export function badges() {
  return {
    messages: msgUnread(),
    leads: state.leads.filter((l) => !['Won', 'Lost'].includes(l.stage)).length,
    service: state.calls.filter((c) => c.status != 'Complete').length,
    fitting: can('manage') ? state.contracts.filter((c) => c.fit && c.stage != 'Complete').length : 0,
    stock: state.items.filter((r) => r.type == 'request' && r.reqStatus == 'Pending').length,
    staff: can('manage') ? state.hols.filter((h) => h.status == 'Pending').length : 0,
    holidays: can('manage') ? state.hols.filter((h) => h.status == 'Pending').length : 0,
  };
}
export function navHtml(b) {
  let n = 0;
  return NG.map(([g, keys]) => {
    const ks = keys.filter((k) => canSee(k) && (k != 'admin' || can('manage')));
    const gl = g == 'Admin' && ks.every((k) => k == 'settings') ? 'You' : g;
    return ks.length
      ? `<div class="nl">${esc(gl)}</div>` +
          ks
            .map(
              (k) =>
                `<button class="nav ${k == view ? 'on' : ''}" style="--n:${n++}" title="${esc(VIEWS[k].t)}" ${onClick('go', k)} ${k == view ? 'aria-current="page"' : ''}>${svg(ICONS[k])}<span>${esc(VIEWS[k].t)}</span>${b[k] ? `<i>${b[k]}</i>` : ''}</button>`
            )
            .join('')
      : '';
  }).join('');
}
export function go(v) {
  document.body.classList.remove('sopen');
  closeFpop();
  if (!VIEWS[v]) return;
  if (!canSee(v) || (v == 'admin' && !can('manage'))) {
    setPendView(v);
    swRole();
    return;
  }
  view = v;
  q = '';
  $('#q').value = '';
  sbSync();
  render();
  /* the Work In Progress notice, as soon as the Leads or Contracts tab opens */
  if (v == 'leads' || v == 'contracts') previewNotice(v == 'leads' ? 'lead' : 'contract');
}
export function render(soft) {
  if (!canSee(view) || (view == 'admin' && !can('manage'))) view = HOME();
  const V = VIEWS[view];
  $('#nav').innerHTML = navHtml(badges());
  let h;
  try {
    h = V.fn();
  } catch (e) {
    console.error(e);
    h = `<div class="panel"><h2>Something Went Wrong</h2><p class="muted">${esc(e.message)}</p></div>`;
  }
  const m = $('#main');
  if (soft && view == lastView) morph(m, h);
  else m.innerHTML = h;
  document.body.dataset.view = view;
  document.body.classList.toggle('lv', view == 'live');
  document.body.classList.toggle('vmsg', view == 'messages');
  requestAnimationFrame(() =>
    $$('#main .kpi>b').forEach((b) => b.style.setProperty('--n', Math.max(2, b.textContent.trim().length)))
  );
  document.body.classList.toggle('isadm', can('money'));
  shellSync();
  $$('#main .kpi,#main .panel,#main .col,#main .bc,#main .cc,#main .dlane,#main .supc').forEach((e, i) =>
    e.style.setProperty('--i', Math.min(i, 14))
  );
  if (view != lastView) {
    countUp();
    lastView = view;
    m.classList.remove('enter');
    void m.offsetWidth;
    if (view != 'live') m.classList.add('enter');
    clearTimeout(render.t);
    render.t = setTimeout(() => m.classList.remove('enter'), 1200);
    m.scrollTop = 0;
  }
  try {
    V.after && V.after();
  } catch (e) {
    console.error(e);
  }
  markExact(view, q);
}
/* ---- sidebar footer, top bar, bell ---- */
export function shellSync() {
  const m = me();
  $('#av').textContent = initials(USER);
  $('#whoN').textContent = USER;
  $('#whoR').textContent = (m && m.role ? m.role + ' · ' : '') + ROLES[ROLE].n;
  $('#acct').innerHTML = svg(ICONS.switch) + '<span>' + esc(ROLES[ROLE].n) + '</span>';
  $('#adminbar').textContent = ROLES[ROLE].n + ' account: ' + ROLES[ROLE].d;
  const sec = $('#secbar'),
    dp = can('manage') && Object.values(state.sec.pins).some((p) => p.def);
  sec.classList.toggle('on', !!(dp || !window.isSecureContext));
  sec.textContent = !window.isSecureContext
    ? 'This page is not on a secure (https) connection: the camera scanner and some protections will not work.'
    : dp
      ? 'Some accounts still use the default PIN 1234. Change them in Admin console.'
      : '';
  $$('#nwm button').forEach((b) => (b.style.display = canSee(b.dataset.v) ? '' : 'none'));
  const c = ncCount(),
    bn = $('#bellN');
  bn.textContent = c > 99 ? '99+' : c;
  bn.style.display = c ? '' : 'none';
  if ($('#nc').classList.contains('open')) ncDraw();
  fillLists();
}
/* suggestion lists for item codes, locations and stock-take areas: rebuilt only when they change */
const listSig = {};
function fillList(id, values) {
  const el = $('#' + id);
  if (!el) return;
  const v = [...new Set(values.filter((x) => x && x != '-'))].sort(),
    sig = v.join('|');
  if (listSig[id] === sig) return;
  listSig[id] = sig;
  el.innerHTML = v.map((x) => `<option value="${esc(x)}">`).join('');
}
function fillLists() {
  const P = products();
  fillList(
    'itemCodes',
    P.map((x) => x.item)
  );
  fillList(
    'locs',
    P.map((x) => x.location)
  );
  fillList(
    'areas',
    P.map((x) => x.area)
  );
}
