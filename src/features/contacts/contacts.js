/* features/contacts/contacts: The Contact Book. */
import { fieldControl } from '../../ui/forms/fields.js';
import { CPH, CPH_ALL, CT } from '../../config/constants.js';
import { onClick, rowClick } from '../../core/actions.js';
import { $, $$, esc } from '../../core/dom.js';
import { initials } from '../../core/format.js';
import { svg } from '../../core/icons.js';
import { shortId } from '../../core/ids.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { can } from '../../domain/permissions.js';
import { supFromContact } from '../suppliers/suppliers.js';
import { emptyArt } from '../../ui/components/art.js';
import { MARK } from '../../ui/forms/form.js';
import { askYes, closeModal, doneIn, openModal } from '../../ui/modal.js';
import { hit, render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { uiState } from '../../ui/ui-state.js';
import * as repos from '../../data/repository.js';

/* ---------------- contact book ---------------- */
export function vContacts() {
  const F = uiState.con.f,
    L = state.contacts
      .filter((c) => (F == 'all' || c.type == F) && hit(c))
      .sort((a, b) => (a.co || a.name || '').localeCompare(b.co || b.name || '')),
    letter = (c) => {
      const x = ((c.co || c.name || '#').trim()[0] || '#').toUpperCase();
      return /[A-Z]/.test(x) ? x : '#';
    };
  const have = new Set(L.map(letter)),
    AZ = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];
  let last = '';
  const card = (
    c
  ) => `<div class="cc2 clk-r" ${rowClick('editContact', c.id)}><div class="cc2-h"><span class="cav" style="--h:${[...(c.co || c.name || '?')].reduce((a, x) => a + x.charCodeAt(0), 0) % 360}">${esc(initials(c.co || c.name))}</span><div><b>${esc(c.co || c.name)}</b><small>${esc([c.name && c.name != c.co ? c.name : '', c.role].filter(Boolean).join(' · ') || ' ')}</small></div><span class="tag">${esc(c.type || '')}</span></div>
    <div class="cc2-b">${conPhones(c)
      .map(
        (p) =>
          `<a class="nocap" href="${esc(telHref(p.n))}">${svg('M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2')}<span class="cpl">${esc(p.t)}</span>${esc(p.n)}</a>`
      )
      .join(
        ''
      )}${c.email ? `<a class="nocap" href="mailto:${esc(c.email)}">${svg('M4 6h16v12H4zM4 7l8 6 8-6')}${esc(c.email)}</a>` : ''}${c.email2 ? `<a class="nocap" href="mailto:${esc(c.email2)}">${svg('M4 6h16v12H4zM4 7l8 6 8-6')}<span class="cpl">Accounts</span>${esc(c.email2)}</a>` : ''}${c.addr || c.town || c.pc ? `<span>${svg('M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z')}${esc([c.addr, c.town, c.pc].filter(Boolean).join(', '))}</span>` : ''}${!c.phone && !c.email && !c.addr ? '<span class="muted">No details yet</span>' : ''}</div>
    <div class="cc2-f"><button class="mini" ${onClick('editContact', c.id)}>Edit</button>${can('manage') ? `<button class="mini del" ${onClick('del', 'contacts', c.id)}>Delete</button>` : ''}</div></div>`;
  return `<div class="head"><div><h1>Contact Book</h1><span class="muted">${L.length} of ${state.contacts.length} contacts</span></div><div class="tools">${can('manage') ? '<button class="btn ghost" data-act="impCust">Import customers</button>' : ''}<button class="btn" data-act="editContact">New contact</button></div></div>
  <div class="subbar"><span class="sb-l">Show</span><div class="views">${['all', ...CT].map((k) => `<button class="chip ${F == k ? 'on' : ''}" ${onClick('setUI', 'con.f', k)}>${k == 'all' ? 'All' : esc(k)} <i>${k == 'all' ? state.contacts.length : state.contacts.filter((c) => c.type == k).length}</i></button>`).join('')}</div></div>
  <div class="azbar">${AZ.map((x) => (have.has(x) ? `<button ${onClick('azGo', x)}>${x}</button>` : `<span>${x}</span>`)).join('')}</div>
  <div class="cbook">${
    L.map((c) => {
      const x = letter(c),
        hd = x != last ? ((last = x), `<div class="az2" id="az-${x == '#' ? '0' : x}">${x}</div>`) : '';
      return hd + card(c);
    }).join('') || emptyArt('team', 'No contacts match.')
  }</div>`;
}
export function azGo(x) {
  const e = document.getElementById('az-' + (x == '#' ? '0' : x));
  if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
export const conPhones = (c) =>
  Array.isArray(c && c.phones) && c.phones.length
    ? c.phones.filter((p) => p && p.n)
    : c && c.phone
      ? [{ t: 'Office', n: c.phone }]
      : [];
export const telHref = (n) => 'tel:' + String(n).replace(/[^\d+]/g, '');
export function cphRow(p) {
  const t = (p && p.t) || '';
  return `<div class="cphr"><select aria-label="Number type">${(t && !CPH.includes(t) ? [t, ...CPH] : CPH).map((x) => `<option${x == t ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select><input type="tel" inputmode="tel" maxlength="30" placeholder="Phone number" aria-label="Phone number" value="${esc((p && p.n) || '')}"><button type="button" class="cphx" title="Remove this number" aria-label="Remove this number">&times;</button></div>`;
}
/* always one empty row at the end: the next box only appears once the last one is filled */
export function cphTidy() {
  const box = $('#cphs');
  if (!box) return;
  const rows = [...box.querySelectorAll('.cphr')];
  rows.forEach((r, i) => {
    if (
      i < rows.length - 1 &&
      !r.querySelector('input').value.trim() &&
      rows.length > 1 &&
      document.activeElement != r.querySelector('input')
    )
      r.remove();
  });
  const R = [...box.querySelectorAll('.cphr')],
    last = R[R.length - 1];
  if (!last || last.querySelector('input').value.trim()) {
    const used = R.map((r) => r.querySelector('select').value);
    box.insertAdjacentHTML('beforeend', cphRow({ t: CPH.find((x) => !used.includes(x)) || 'Office' }));
  }
  [...box.querySelectorAll('.cphr')].forEach((r, i, a) => {
    r.querySelector('.cphx').hidden = a.length < 2 || (i == a.length - 1 && !r.querySelector('input').value.trim());
  });
}
/* which boxes must be filled in depends on the type: a customer needs email and address, a company needs its name and a job title */
export const cReq = (t) => ({
  type: 1,
  co: t != 'Customer',
  name: 1,
  role: t != 'Customer',
  email: t == 'Customer',
  addr: t == 'Customer',
  town: t == 'Customer',
  pc: t == 'Customer',
});
export function cReqDraw() {
  const t = ($('#c_type') || {}).value || 'Supplier',
    R = cReq(t);
  $$('#mbox [data-rq]').forEach((s) => {
    s.innerHTML = R[s.dataset.rq] ? MARK(1) : '';
  });
}
export function editContact(id, draft, after) {
  const c = state.contacts.find((x) => x.id == id),
    v = draft || (c ? { ...c, phones: conPhones(c) } : { type: 'Supplier', phones: [] });
  const fld = (k, l, o = {}) =>
    `<div class="ff ${o.w || ''}"><label for="c_${k}">${esc(l)}<span data-rq="${k}"></span>${MARK(0, o.adm)}</label>${fieldControl({ k, t: o.sel ? 'select' : o.area ? 'area' : o.t || 'text', o: o.sel, max: o.max || (o.area ? 600 : 120), ph: o.ph }, v[k] || '', { id: 'c_' + k, rows: 2 })}</div>`;
  openModal(
    `<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>${c ? 'Edit Contact' : 'New Contact'}</h2>
   <div class="cform">
    <section><h3>Who</h3><div class="grid">${fld('type', 'Type', { sel: CT })}${fld('co', 'Company', { max: 80 })}${fld('name', 'Contact name', { max: 60 })}${fld('role', 'Job title', { max: 60 })}</div></section>
    <section><h3>Phone Numbers <small>At least one *</small></h3><div id="cphs" class="cphs">${v.phones.map(cphRow).join('')}</div><p class="hint">Pick what each number is for. Another box appears when you fill one in.</p></section>
    <section><h3>Email And Web</h3><div class="grid">${fld('email', 'Main email', { t: 'email' })}${fld('email2', 'Accounts email', { t: 'email' })}${fld('web', 'Website', { w: 'full', max: 200, ph: 'https://' })}</div></section>
    <section><h3>Address</h3><div class="grid">${fld('addr', 'Address', { w: 'full', max: 200 })}${fld('town', 'Town', { max: 60 })}${fld('pc', 'Postcode', { max: 10 })}</div></section>
    <section><h3>Notes</h3>${fld('notes', 'Notes', { area: 1, w: 'full' })}</section>
   </div>
   <div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" id="saveBtn">${c ? 'Save changes' : 'Add contact'}</button></div>`,
    'md'
  );
  const tsel = $('#c_type');
  tsel.previousElementSibling.querySelector('[data-rq]').innerHTML = MARK(1);
  tsel.addEventListener('change', cReqDraw);
  cReqDraw();
  const box = $('#cphs');
  cphTidy();
  box.addEventListener('input', cphTidy);
  box.addEventListener('focusout', () => setTimeout(cphTidy, 0));
  box.addEventListener('click', (e) => {
    const x = e.target.closest('.cphx');
    if (!x) return;
    x.closest('.cphr').remove();
    cphTidy();
  });
  $('#saveBtn').onclick = () => {
    const g = (k) => ($('#c_' + k).value || '').trim(),
      o = {
        co: SAFE.text(g('co'), 80),
        type: CT.includes(g('type')) ? g('type') : 'Other',
        name: SAFE.text(g('name'), 60),
        role: SAFE.text(g('role'), 60),
        email: g('email').toLowerCase(),
        email2: g('email2').toLowerCase(),
        web: SAFE.url(g('web')) ? SAFE.text(g('web'), 200) : '',
        addr: SAFE.text(g('addr'), 200),
        town: SAFE.text(g('town'), 60),
        pc: SAFE.text(g('pc'), 10).toUpperCase(),
        notes: SAFE.text(g('notes'), 600),
      };
    o.phones = [...$$('#cphs .cphr')]
      .map((r) => ({
        t: CPH_ALL.includes(r.querySelector('select').value) ? r.querySelector('select').value : 'Office',
        n: SAFE.text(r.querySelector('input').value, 30),
      }))
      .filter((p) => p.n);
    const bad = (m, k) => {
      toast(m);
      const e = k ? $('#c_' + k) : $('#cphs input');
      e && e.focus();
      return false;
    };
    const R = cReq(o.type);
    if (R.co && !o.co) return bad('Company name is required', 'co');
    if (!o.name) return bad('Contact name is required', 'name');
    if (R.role && !o.role) return bad('Job title is required', 'role');
    if (!o.co) o.co = o.name;
    if (!o.phones.length) return bad('Add at least one phone number');
    const wrong = o.phones.find((p) => !/^[\d +()-]{6,30}$/.test(p.n) || (p.n.match(/\d/g) || []).length < 6);
    if (wrong) return bad(wrong.n + ' does not look like a phone number');
    if (o.email && !SAFE.email(o.email)) return bad('Main email does not look like an email address', 'email');
    if (o.email2 && !SAFE.email(o.email2)) return bad('Accounts email does not look like an email address', 'email2');
    if (o.web && !SAFE.url(o.web)) return bad('The website must start with https://', 'web');
    if (R.email && !o.email) return bad('Main email is required for a customer', 'email');
    if (R.addr && !o.addr) return bad('Address is required for a customer', 'addr');
    if (R.town && !o.town) return bad('Town is required for a customer', 'town');
    if (R.pc && !o.pc) return bad('Postcode is required for a customer', 'pc');
    o.phone = o.phones[0].n;
    const go = () => {
      const oldCo = c ? c.co : o.co;
      if (c) repos.contacts.changed(Object.assign(c, o));
      else repos.contacts.add({ id: shortId('K'), ...o });
      if (
        (c || o).type == 'Supplier' ||
        state.suppliers.some((s) => s.name.toLowerCase() == String(oldCo).toLowerCase())
      )
        supFromContact(oldCo, c || o);
      audit(c ? 'Contact edited' : 'Contact added', o.co, '');
    };
    const done = () => {
      store();
      render();
      if (after) after(o.co);
      else doneIn('Contact saved');
    };
    if (!can('manage')) {
      closeModal();
      askYes(
        c ? 'Save changes to ' + (c.co || 'this contact') + '?' : 'Add ' + o.co + ' to the contact book?',
        c
          ? 'The contact details will be updated for everyone' +
              (state.suppliers.some((s) => s.name.toLowerCase() == String(c.co).toLowerCase())
                ? ', and on the supplier page too.'
                : '.')
          : 'Everyone will be able to see this contact.',
        'Yes, save',
        () => {
          go();
          done();
        },
        false,
        () => editContact(id, o, after)
      );
      return;
    }
    go();
    done();
  };
}
export function impCust() {
  let n = 0;
  state.contracts.forEach((c) => {
    if (!state.contacts.some((k) => k.co == c.name)) {
      n++;
      repos.contacts.add({
        id: shortId('K'),
        co: c.name,
        name: c.name,
        role: 'Contract ' + c.id,
        type: 'Customer',
        phone: c.phone || '',
        email: c.email || '',
        addr: c.address || c.town,
      });
    }
  });
  audit('Customers imported', 'Contact book', n + ' added');
  store();
  render();
  toast(n + ' customer' + (n == 1 ? '' : 's') + ' added');
}
