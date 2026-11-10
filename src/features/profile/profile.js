/* features/profile/profile: My Details: name, contact numbers and emergency contacts. */
import { company } from '../../data/company.js';
import { ROLES } from '../../config/roles.js';
import { $, esc } from '../../core/dom.js';
import { initials } from '../../core/format.js';
import { ICONS, svg } from '../../core/icons.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { me, renamePerson } from '../../domain/people.js';
import { ROLE } from '../../data/session.js';
import { can } from '../../domain/permissions.js';
import { MARK, fieldErr } from '../../ui/forms/form.js';
import { doneIn, openModal } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';

/* ---- my details: name, contact info. Job role, team, start date are admin-only ---- */
export function editProfile() {
  const p = state.profile,
    m = me() || {},
    adm = can('manage'),
    lk = (t) => MARK(0, 1);
  openModal(
    `<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><div class="pf"><span class="av2">${esc(initials(p.name))}</span><div><h2 style="margin:0">My Details</h2><span class="muted">${esc(ROLES[ROLE].n)} account</span></div></div>
  <div class="grid">
   <div class="ff"><label for="p_name">Display name *</label><input id="p_name" maxlength="60" value="${esc(p.name)}"></div>
   <div class="ff"><label for="p_email">Email${MARK(1)}</label><input id="p_email" class="nocap" type="email" maxlength="120" value="${esc((window.SSO && SSO.email) || p.email || m.email || '')}" ${window.SSO && SSO.email ? 'readonly' : ''}>${window.SSO && SSO.email ? '<span class="hint">From your Microsoft 365 sign-in</span>' : '<span class="hint">Fills in by itself once you sign in with Microsoft 365</span>'}</div>
   <div class="ff"><label for="p_phone">Work phone${MARK(1)}</label><input id="p_phone" type="tel" maxlength="30" value="${esc(p.phone || m.phone || company.tel || '01603 483002')}"></div>
   <div class="ff"><label for="p_mobile">Mobile</label><input id="p_mobile" type="tel" maxlength="30" value="${esc(p.mobile || '')}"></div>
   <div class="ff full"><label for="p_en">Emergency contacts</label><select id="p_en" data-onchange="emerDraw">${[0, 1, 2, 3].map((n) => `<option value="${n}" ${n == emerList(p).length ? 'selected' : ''}>${n ? n + ' ' + (n == 1 ? 'person' : 'people') : 'None yet'}</option>`).join('')}</select></div>
   <div class="ff full" id="p_emer">${emerRows(emerList(p))}</div>
   <div class="ff full"><label for="p_sig">Email signature / sign-off</label><textarea id="p_sig" rows="2" maxlength="400">${esc(p.signature || '')}</textarea></div>
   <div class="ff"><label for="p_role">Job role ${adm ? '' : lk('Admin only')}</label><input id="p_role" maxlength="60" value="${esc(m.role || '')}" ${adm ? '' : 'readonly'}></div>
   <div class="ff"><label for="p_team">Team ${adm ? '' : lk('Admin only')}</label>${adm ? `<select id="p_team">${['', 'Team A', 'Team B'].map((t) => `<option ${t == (m.team || '') ? 'selected' : ''} value="${esc(t)}">${esc(t || 'None')}</option>`).join('')}</select>` : `<input id="p_team" readonly value="${esc(m.team || 'None')}">`}</div>
   <div class="ff"><label for="p_start">Start date ${adm ? '' : lk('Admin only')}</label><input id="p_start" type="date" value="${esc(m.start || '')}" ${adm ? '' : 'readonly'}></div>
   <div class="ff"><label for="p_allow">Holiday allowance ${adm ? '' : lk('Admin only')}</label><input id="p_allow" type="number" min="0" max="60" value="${esc(m.allow ?? '')}" ${adm ? '' : 'readonly'}></div>
  </div>
  ${m.id ? '' : '<p class="warn">Your name is not linked to a staff record yet. An administrator can add you under Staff.</p>'}
  <div class="mact"><button class="btn ghost l" data-act="swRole">${svg(ICONS.switch)}Switch account</button><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" data-act="saveProfile">Save details</button></div>`,
    'md'
  );
}
/* emergency contacts: up to three people, each with a name, how they know you and a number */
export const emerList = (p) =>
  Array.isArray(p.emer) ? p.emer.slice(0, 3) : p.emergency ? [{ n: p.emergency, r: '', t: '' }] : [];
export const emerRows = (L) =>
  L.map(
    (e, i) =>
      `<div class="emr"><b>Person ${i + 1}</b><input id="pe_n${i}" maxlength="60" placeholder="Name" aria-label="Name" value="${esc(e.n || '')}"><input id="pe_r${i}" maxlength="40" placeholder="Relationship" aria-label="Relationship" value="${esc(e.r || '')}"><input id="pe_t${i}" type="tel" maxlength="30" placeholder="Phone number" aria-label="Phone number" value="${esc(e.t || '')}"></div>`
  ).join('');
export function emerRead() {
  const n = +(($('#p_en') || {}).value || 0),
    o = [];
  for (let i = 0; i < n; i++) {
    const g = (k) => SAFE.text(($('#pe_' + k + i) || {}).value, 60);
    o.push({ n: g('n'), r: g('r'), t: g('t') });
  }
  return o;
}
export function emerDraw() {
  const n = +$('#p_en').value,
    cur = emerRead().concat([{}, {}, {}]).slice(0, n);
  $('#p_emer').innerHTML = emerRows(cur);
  const f = $('#pe_n' + (n - 1));
  if (f && !f.value) f.focus();
}
export function saveProfile() {
  const v = (i) => SAFE.text(($('#' + i) || {}).value, i == 'p_sig' ? 400 : 120),
    p = state.profile,
    m = me();
  const name = v('p_name');
  if (name.length < 2) {
    toast('Please enter your name');
    return;
  }
  const em = (window.SSO && SSO.email) || v('p_email'),
    bad = (id, m) => {
      const e = $('#' + id);
      if (e) fieldErr(e, m);
      else toast(m);
    };
  if (!em) {
    bad('p_email', 'Enter your work email');
    return;
  }
  if (!SAFE.email(em)) {
    bad('p_email', 'That email address does not look right');
    return;
  }
  const ph = v('p_phone');
  if (!ph) {
    bad('p_phone', 'Enter your work phone');
    return;
  }
  const E = emerRead();
  for (let i = 0; i < E.length; i++) {
    if (!E[i].n) {
      bad('pe_n' + i, 'Enter the name of person ' + (i + 1));
      return;
    }
    if (!E[i].t) {
      bad('pe_t' + i, 'Enter a phone number for ' + E[i].n);
      return;
    }
  }
  const old = p.name;
  Object.assign(p, {
    name,
    email: em,
    phone: ph,
    mobile: v('p_mobile'),
    emer: E,
    emergency: E.map((x) => [x.n, x.r ? '(' + x.r + ')' : '', x.t].filter(Boolean).join(' ')).join('; '),
    signature: v('p_sig'),
  });
  if (m) {
    p.sid = m.id;
    Object.assign(m, { name, email: em || m.email, phone: p.phone || m.phone });
    if (can('manage')) {
      m.role = v('p_role') || m.role;
      m.team = v('p_team') == 'None' ? '' : v('p_team');
      m.start = SAFE.date(v('p_start')) || m.start;
      const al = SAFE.num(v('p_allow'), { max: 60, dp: 0 });
      if (al != null) m.allow = al;
    }
  }
  if (old != name) renamePerson(old, name);
  audit('Profile updated', name, old != name ? 'Renamed from ' + old : '');
  store();
  render();
  doneIn('Your details are saved');
}
