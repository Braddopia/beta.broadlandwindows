/* features/contacts/contacts: The Contact Book. */
import { fieldControl } from '../../ui/forms/fields.js';
import { CPH, CPH_ALL, CT, SUPCAT } from '../../config/constants.js';
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
import { pcNorm } from '../../domain/postcode.js';
import { supFromContact } from '../suppliers/suppliers.js';
import { emptyArt } from '../../ui/components/art.js';
import { MARK } from '../../ui/forms/form.js';
import { askYes, closeModal, doneIn, openModal } from '../../ui/modal.js';
import { hit, render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { uiState } from '../../ui/ui-state.js';
import * as repos from '../../data/repository.js';
import { custToBook } from './customer-book.js';
import { need } from '../auth/session.js';
import { celebrate } from '../../ui/success.js';

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
  ) => `<div class="cc2 clk-r" ${rowClick('editContact', c.id)}><div class="cc2-h"><span class="cav" style="--h:${[...(c.co || c.name || '?')].reduce((a, x) => a + x.charCodeAt(0), 0) % 360}">${esc(initials(c.co || c.name))}</span><div><b>${esc(c.co || c.name)}</b><small>${esc([c.name && c.name != c.co ? c.name : '', c.role, c.cat, c.trade].filter(Boolean).join(' · ') || ' ')}</small></div><span class="tag">${esc(c.type || '')}</span></div>
    <div class="cc2-b">${conLines(c)
      .map(
        (p) =>
          `<div class="cpr"><span class="cpl">${esc(p.t)}</span><span class="cpv">${p.n ? `<a class="nocap" href="${esc(telHref(p.n))}">${svg('M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2')}${esc(p.n)}</a>` : ''}${p.e ? `<a class="nocap" href="mailto:${esc(p.e)}">${svg('M4 6h16v12H4zM4 7l8 6 8-6')}${esc(p.e)}</a>` : ''}</span></div>`
      )
      .join(
        ''
      )}${c.addr || c.town || c.pc ? `<span>${svg('M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z')}${esc([c.addr, c.town, c.pc].filter(Boolean).join(', '))}</span>` : ''}${!conLines(c).length && !c.addr ? '<span class="muted">No details yet</span>' : ''}</div>
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
/** every contact line: what it is for (Office, Accounts, Sales...), its phone number and its email.
    Older contacts kept one main email and an accounts email apart from the numbers: they are paired up here. */
export function conLines(c) {
  if (!c) return [];
  if (Array.isArray(c.lines) && c.lines.length) return c.lines.filter((l) => l && (l.n || l.e));
  const L = conPhones(c).map((p) => ({ t: p.t, n: p.n, e: '' }));
  if (c.email) {
    const f = L.find((l) => l.t != 'Accounts') || L[0];
    if (f) f.e = c.email;
    else L.push({ t: 'Office', n: '', e: c.email });
  }
  if (c.email2) {
    const a = L.find((l) => l.t == 'Accounts' && !l.e);
    if (a) a.e = c.email2;
    else L.push({ t: 'Accounts', n: '', e: c.email2 });
  }
  return L;
}
export const telHref = (n) => 'tel:' + String(n).replace(/[^\d+]/g, '');
export function cphRow(p) {
  const t = (p && p.t) || '';
  return `<div class="cphr"><select aria-label="What this line is for">${(t && !CPH_ALL.includes(t) ? [t, ...CPH] : CPH).map((x) => `<option${x == t ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select><input type="tel" inputmode="tel" maxlength="30" placeholder="Phone number" aria-label="Phone number" value="${esc((p && p.n) || '')}"><input type="email" class="nocap" maxlength="120" placeholder="Email" aria-label="Email" value="${esc((p && p.e) || '')}"><button type="button" class="cphx" title="Remove this line" aria-label="Remove this line">&times;</button></div>`;
}
const filled = (r) => [...r.querySelectorAll('input')].some((i) => i.value.trim());
/* always one empty row at the end: the next box only appears once the last one is filled */
export function cphTidy() {
  const box = $('#cphs');
  if (!box) return;
  const rows = [...box.querySelectorAll('.cphr')];
  rows.forEach((r, i) => {
    if (i < rows.length - 1 && !filled(r) && rows.length > 1 && !r.contains(document.activeElement)) r.remove();
  });
  const R = [...box.querySelectorAll('.cphr')],
    last = R[R.length - 1];
  if (!last || filled(last)) {
    const used = R.map((r) => r.querySelector('select').value);
    box.insertAdjacentHTML('beforeend', cphRow({ t: CPH.find((x) => !used.includes(x)) || 'Office' }));
  }
  [...box.querySelectorAll('.cphr')].forEach((r, i, a) => {
    r.querySelector('.cphx').hidden = a.length < 2 || (i == a.length - 1 && !filled(r));
  });
}
/* which boxes show, and which must be filled in, depends on the type. Customers and suppliers need full details
   (they show on contracts, orders and reports): a customer their email and home address, a supplier its company,
   what it supplies, email and address. Sub-contractors and trades need their trade. */
export const TRADES = [
  'Fitter',
  'Builder',
  'Electrician',
  'Plasterer',
  'Roofer',
  'Groundworks',
  'Glazier',
  'Skip hire',
  'Other',
];
export const cReq = (t) => ({
  type: 1,
  co: t == 'Supplier' || t == 'Sub-contractor' || t == 'Trade',
  name: 1,
  role: t == 'Supplier',
  cat: t == 'Supplier',
  trade: t == 'Sub-contractor' || t == 'Trade',
  email: t == 'Customer' || t == 'Supplier' || t == 'Sub-contractor',
  addr: t == 'Customer' || t == 'Supplier',
  town: t == 'Customer' || t == 'Supplier' || t == 'Sub-contractor',
  pc: t == 'Customer' || t == 'Supplier',
});
/* boxes that only make sense for some types: hidden for the rest */
const ONLY = {
  co: ['Supplier', 'Sub-contractor', 'Trade', 'Other'],
  role: ['Supplier', 'Sub-contractor', 'Trade', 'Other'],
  cat: ['Supplier'],
  acc: ['Supplier'],
  trade: ['Sub-contractor', 'Trade'],
  web: ['Supplier', 'Sub-contractor', 'Trade', 'Other'],
};
export function cReqDraw() {
  const t = ($('#c_type') || {}).value || 'Supplier',
    R = cReq(t);
  $$('#mbox [data-rq]').forEach((s) => {
    s.innerHTML = R[s.dataset.rq] ? MARK(1) : '';
  });
  /* a customer's numbers are usually a mobile or home phone, not an office: empty lines follow the type */
  $$('#mbox #cphs .cphr').forEach((r) => {
    const sel = r.querySelector('select');
    if (!sel || [...r.querySelectorAll('input')].some((i) => i.value.trim())) return;
    if (t == 'Customer' && sel.value == 'Office') sel.value = 'Mobile';
    else if (t != 'Customer' && sel.value == 'Mobile') sel.value = 'Office';
  });
  /* the boxes change with the type: a customer has no company or job title, a supplier says what it supplies */
  $$('#mbox [data-only]').forEach((b) => {
    const show = b.dataset.only.split('|').includes(t);
    if (b.hidden != !show) {
      b.hidden = !show;
      if (show && b.animate)
        b.animate(
          [
            { opacity: 0, transform: 'translateY(-4px)' },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: 220,
            easing: 'ease-out',
          }
        );
    }
  });
  $$('#mbox section[data-sec]').forEach(
    (sec) => (sec.hidden = ![...sec.querySelectorAll('.ff')].some((f) => !f.hidden))
  );
  const nm = $('#mbox label[for="c_name"]');
  if (nm && nm.firstChild) nm.firstChild.textContent = t == 'Customer' ? 'Customer name' : 'Contact name';
}
export function editContact(id, draft, after) {
  const c = state.contacts.find((x) => x.id == id),
    v = draft || (c ? { ...c, lines: conLines(c) } : { type: 'Supplier', lines: [] });
  const fld = (k, l, o = {}) =>
    `<div class="ff ${o.w || ''}" ${ONLY[k] ? `data-only="${ONLY[k].join('|')}"` : ''}><label for="c_${k}">${esc(l)}<span data-rq="${k}"></span>${MARK(0, o.adm)}</label>${fieldControl({ k, t: o.sel ? 'select' : o.area ? 'area' : o.t || 'text', o: o.sel, max: o.max || (o.area ? 600 : 120), ph: o.ph }, v[k] || '', { id: 'c_' + k, rows: 2 })}</div>`;
  openModal(
    `<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>${c ? 'Edit Contact' : 'New Contact'}</h2>
   <div class="cform">
    <section><h3>Who</h3><div class="grid">${fld('type', 'Type', { sel: CT })}${fld('co', 'Company', { max: 80 })}${fld('name', 'Contact name', { max: 60 })}${fld('role', 'Job title', { max: 60 })}${fld('cat', 'What they supply', { sel: ['', ...SUPCAT] })}${fld('acc', 'Our account number', { max: 40 })}${fld('trade', 'Trade', { sel: ['', ...TRADES] })}</div></section>
    <section><h3>Phone Numbers And Emails <small>At least one number *</small></h3><div class="cphh" aria-hidden="true"><span>For</span><span>Phone</span><span>Email<span data-rq="email"></span></span></div><div id="cphs" class="cphs">${(v.lines || []).map(cphRow).join('')}</div><p class="hint">One line each for Accounts, Sales and so on.</p></section>
    <section data-sec="web"><h3>Web</h3><div class="grid">${fld('web', 'Website', { w: 'full', max: 200, ph: 'https://' })}</div></section>
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
        web: SAFE.url(g('web')) ? SAFE.text(g('web'), 200) : '',
        addr: SAFE.text(g('addr'), 200),
        town: SAFE.text(g('town'), 60),
        pc: SAFE.text(g('pc'), 10).toUpperCase(),
        notes: SAFE.text(g('notes'), 600),
      };
    /* only the boxes that belong to the type are kept */
    const only = (k) => !ONLY[k] || ONLY[k].includes(o.type);
    o.cat = only('cat') && SUPCAT.includes(g('cat')) ? g('cat') : '';
    o.acc = only('acc') ? SAFE.text(g('acc'), 40) : '';
    o.trade = only('trade') && TRADES.includes(g('trade')) ? g('trade') : '';
    ['co', 'role', 'web'].forEach((k) => {
      if (!only(k)) o[k] = '';
    });
    o.lines = [...$$('#cphs .cphr')]
      .map((r) => {
        const [n, e] = r.querySelectorAll('input');
        return {
          t: CPH_ALL.includes(r.querySelector('select').value) ? r.querySelector('select').value : 'Office',
          n: SAFE.text(n.value, 30),
          e: SAFE.text(e.value, 120).toLowerCase(),
        };
      })
      .filter((p) => p.n || p.e);
    o.phones = o.lines.filter((p) => p.n).map((p) => ({ t: p.t, n: p.n }));
    /* the first email is the main one; an Accounts line's email is the accounts email */
    o.email = (o.lines.find((p) => p.e) || {}).e || '';
    o.email2 = (o.lines.find((p) => p.e && p.t == 'Accounts' && p.e != o.email) || {}).e || '';
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
    if (R.cat && !o.cat) return bad('Pick what they supply', 'cat');
    if (R.trade && !o.trade) return bad('Pick their trade', 'trade');
    if (!o.co) o.co = o.name;
    if (!o.phones.length) return bad('Add at least one phone number');
    const wrong = o.phones.find((p) => !/^[\d +()-]{6,30}$/.test(p.n) || (p.n.match(/\d/g) || []).length < 6);
    if (wrong) return bad(wrong.n + ' does not look like a phone number');
    const badMail = o.lines.find((p) => p.e && !SAFE.email(p.e));
    if (badMail) return bad(badMail.e + ' does not look like an email address');
    if (o.web && !SAFE.url(o.web)) return bad('The website must start with https://', 'web');
    const who = 'a ' + o.type.toLowerCase();
    if (R.email && !o.email) return bad('Add an email for ' + who);
    if (R.addr && !o.addr) return bad('Address is required for ' + who, 'addr');
    if (R.town && !o.town) return bad('Town is required for ' + who, 'town');
    if (R.pc && !o.pc) return bad('Postcode is required for ' + who, 'pc');
    if (o.pc && !pcNorm(o.pc)) return bad('That postcode does not look right (for example NR6 5DR)', 'pc');
    if (o.pc) o.pc = pcNorm(o.pc);
    o.phone = o.phones[0].n;
    const go = () => {
      const oldCo = c ? c.co : o.co;
      if (c) repos.contacts.changed(Object.assign(c, o));
      else {
        repos.contacts.add({ id: shortId('K'), ...o });
        celebrate('Contact Added', o.co);
      }
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
/** bring every lead and contract's customer into the Contact Book (the same matching as when they are saved) */
export function impCust() {
  if (!need('manage', 'Importing customers')) return;
  const before = state.contacts.length;
  [...state.contracts, ...state.leads].forEach((r) => custToBook(r));
  const n = state.contacts.length - before;
  audit('Customers imported', 'Contact book', n + ' added');
  store();
  render();
  toast(n ? n + ' customer' + (n == 1 ? '' : 's') + ' added' : 'Customers updated: everyone was already in the book');
}
