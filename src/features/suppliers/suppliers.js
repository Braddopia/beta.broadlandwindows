/* features/suppliers/suppliers: The Suppliers page and supplier details. */
import { SUPCAT } from '../../config/constants.js';
import { onClick } from '../../core/actions.js';
import { fd, today } from '../../core/dates.js';
import { esc } from '../../core/dom.js';
import { initials, lines, m0, money, sum } from '../../core/format.js';
import { svg } from '../../core/icons.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { colTxt, isLow, moveRow, nextOrd, products, reorderQty, stt, unitOf } from '../../domain/stock.js';
import { can } from '../../domain/permissions.js';
import { conPhones, editContact } from '../contacts/contacts.js';
import { emptyArt } from '../../ui/components/art.js';
import { dTag, ordTag, reqTag } from '../../ui/components/tags.js';
import { wizard } from '../../ui/forms/wizard.js';
import { askIn, askYes, openModal } from '../../ui/modal.js';
import { go, hit, render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { uiState } from '../../ui/ui-state.js';
import * as repos from '../../data/repository.js';
import { plugInForms } from '../../ui/forms/form.js';

export const sups = () => state.suppliers;
export const SUPN = (cur) => ['', ...new Set([...sups().map((x) => x.name), cur || ''].filter(Boolean))];
export const supOrders = (x) => state.orders.filter((o) => (o.supplier || 'Smart Systems') == x.name);
export const supCol = (n) =>
  ['#034ea2', '#e0a800', '#12794c', '#8a4fd1', '#c2410c', '#0e7490'][
    [...String(n)].reduce((a, c) => a + c.charCodeAt(0), 0) % 6
  ];
export const telA = (n) => `<a href="tel:${esc(n.replace(/[^\d+]/g, ''))}">${esc(n)}</a>`,
  mailA = (e) => (SAFE.email(e) ? `<a href="mailto:${esc(e)}">${esc(e)}</a>` : esc(e));
export function supStats(x) {
  const P = products(),
    L = P.filter((r) => r.supplier == x.name),
    td = today(),
    D = state.deliveries.filter((d) => d.supplier == x.name && d.status != 'Received');
  return {
    L,
    units: sum(L, (r) => r.stock),
    value: sum(L, (r) => r.stock * r.cost),
    low: L.filter((r) => r.stock > 0 && isLow(r)),
    out: L.filter((r) => r.stock <= 0),
    req: state.items.filter(
      (r) =>
        r.type == 'request' &&
        ['Pending', 'Approved'].includes(r.reqStatus) &&
        !r.cleared &&
        L.some((p) => p.pid == r.pid)
    ),
    D,
    od: D.filter((d) => d.due < td && d.status != 'In transit'),
  };
}
export function suppliersPanel() {
  const rows = sups()
    .map((x, i) => {
      const s = supStats(x);
      return `<div class="row"><span><b>${esc(x.name)}</b><br><span class="muted">${s.L.length} lines, ${s.units} units${s.low.length + s.out.length ? `, <b style="color:var(--red)">${s.low.length + s.out.length} to reorder</b>` : ''}, ${s.D.length} deliveries due</span></span><span class="acts"><button class="mini" ${onClick('supDetail', i)}>Details</button></span></div>`;
    })
    .join('');
  const none = products().filter((r) => !r.supplier).length;
  return `<div class="panel"><h2><span>Suppliers</span><span class="acts"><button class="mini" ${onClick('go', 'suppliers')}>Manage</button><button class="mini pri" data-act="editSup">Add Supplier</button></span></h2>${rows}${none ? `<p class="muted" style="margin:.6rem 0 0">${none} lines have no supplier yet.</p>` : ''}</div>`;
}
export function vSuppliers() {
  const Ad = can('money'),
    all = sups(),
    P = products();
  const tot = {
    lines: P.filter((r) => r.supplier).length,
    none: P.filter((r) => !r.supplier).length,
    re: P.filter((r) => r.supplier && isLow(r)).length,
    del: state.deliveries.filter((d) => d.status != 'Received').length,
  };

  const cards = all
    .filter(hit)
    .map((x) => {
      const s = supStats(x);
      const next = s.D.slice().sort((p, q) => p.due.localeCompare(q.due))[0],
        ok = s.L.length - s.low.length - s.out.length;
      const em = x.email || lines(x.emails)[0] || '';
      return `<button class="panel supw" style="--sc:${supCol(x.name)}" ${onClick('supOpen', x.name)}>
      <span class="supw-av">${esc(initials(x.name))}</span>
      <span class="supw-id"><b>${esc(x.name)}</b>${x.hm ? ' <span class="tag">Live Feed</span>' : ''}<small>${x.account ? 'Account ' + esc(x.account) : 'No account number'}${x.terms ? ' · ' + esc(x.terms) : ''}${x.lead ? ' · ' + esc(x.lead) + ' day lead time' : ''}</small></span>
      <span class="supw-ct"><small>Contact</small><b>${esc(x.contact || 'Not set')}</b><span>${x.phone || em ? `${esc(x.phone || '')}${x.phone && em ? ' · ' : ''}<span class="nocap">${esc(em)}</span>` : 'No phone or email yet'}</span></span>
      ${
        Ad
          ? (() => {
              const B = state.fin.filter((b) => b.status != 'Paid' && b.payee == x.name),
                td = today(),
                od = B.filter((b) => b.due < td),
                due = B.filter((b) => b.due >= td),
                ow = sum(B, (b) => +b.amount || 0),
                oo = sum(od, (b) => +b.amount || 0);
              return `<span class="supw-hl"><small>Owed To Supplier</small><span class="hbar" aria-hidden="true">${ow ? `<i class="out" style="flex:${oo}"></i><i class="lo" style="flex:${ow - oo}"></i>` : '<i class="ok" style="flex:1"></i>'}</span><span>${ow ? `${m0(ow)} owed · ${m0(oo)} overdue${due[0] ? ' · next ' + fd(due.sort((a, b) => a.due.localeCompare(b.due))[0].due) : ''}` : 'Nothing owed'}</span></span>`;
            })()
          : `<span class="supw-hl"><small>Stock Health</small><span class="hbar" aria-hidden="true"><i class="ok" style="flex:${ok}"></i><i class="lo" style="flex:${s.low.length}"></i><i class="out" style="flex:${s.out.length}"></i>${s.L.length ? '' : '<i class="none" style="flex:1"></i>'}</span><span>${s.L.length ? `${ok} OK · ${s.low.length} low · ${s.out.length} out` : 'No stock linked yet'}</span></span>`
      }
      <span class="supw-st"><span><small>Lines</small><b>${s.L.length}</b></span><span><small>Units</small><b>${s.units}</b></span>${Ad ? `<span><small>Value</small><b>${m0(s.value)}</b></span>` : ''}<span class="${s.od.length ? 'x' : s.D.length ? 'w' : ''}"><small>Next Due</small><b>${next ? fd(next.due) : 'None'}</b></span><span class="${s.req.length ? 'w' : ''}"><small>Requests</small><b>${s.req.length}</b></span></span>
      <span class="supw-go">Open ${svg('M9 6l6 6-6 6')}</span></button>`;
    })
    .join('');
  return `<div class="head"><div><h1>Suppliers</h1><span class="muted">${all.length} suppliers linked to ${tot.lines} stock lines</span></div><div class="tools"><button class="btn sm" data-act="editSup">Add Supplier</button></div></div>
  <div class="kpis"><div class="kpi"><small>Suppliers</small><b>${all.length}</b></div><div class="kpi"><small>Lines Linked</small><b>${tot.lines}</b></div><button class="kpi ${tot.none ? 'warn' : ''}" data-act="stockNoSupplier"><small>Lines Without Supplier</small><b>${tot.none}</b></button><div class="kpi ${tot.re ? 'bad' : ''}"><small>Lines To Reorder</small><b>${tot.re}</b></div><button class="kpi" ${onClick('go', 'deliveries')}><small>Deliveries Due</small><b>${tot.del}</b></button></div>
  <div class="sups">${cards || emptyArt('van', 'No suppliers match.')}</div>`;
}
/* full supplier details, shown in a popup */
/* supplier popup: who they are and how to reach them first; stock kept small */
export function supOpen(n) {
  const x = state.suppliers.find((s) => s.name == n);
  if (!x) return;
  const i = state.suppliers.indexOf(x),
    s = supStats(x),
    url = SAFE.url(x.url),
    Ad = can('money'),
    need = [...s.out, ...s.low];
  const row = (l, v) => (v ? `<div class="si"><span>${l}</span><b>${v}</b></div>` : '');
  /* phone numbers come from the contact book, each with its label (Office, Accounts, Sales rep...) */
  const cc = conOf(x.name),
    phones = cc
      ? conPhones(cc)
      : [x.phone, ...lines(x.phones)].filter(Boolean).map((n, j) => ({ t: j ? 'Phone ' + (j + 1) : 'Phone', n })),
    emails = [x.email, ...lines(x.emails)].filter(Boolean);
  const box = (t, h, empty) => `<section class="rg"><h4>${t}</h4>${h || `<p class="empty">${empty}</p>`}</section>`;
  openModal(
    `<div class="rw sp2"><div class="rw-bar"><button class="rb1" ${onClick('editSup', i)}>Edit supplier</button><button class="rb1" ${onClick('editDel', null, x.name)}>New delivery</button>${need.length ? `<button class="rb1 go" ${onClick('supReorder', i)}>Request low items (${need.length})</button>` : ''}${url ? `<a class="rb1" href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Website</a>` : ''}${x.hm ? '<button class="rb1" data-act="syncHM">Sync feed</button>' : ''}<span class="rw-sp"></span><button class="rb1 cl" data-act="closeModal">${svg('M6 6l12 12M18 6L6 18')}Close</button></div>
   <div class="rw-h"><div><small>Supplier${x.hm ? ' · Live Feed' : ''}</small><h2>${esc(x.name)}</h2></div><div class="rw-hk">${x.account ? `<span><small>Account</small><b>${esc(x.account)}</b></span>` : ''}${x.lead ? `<span><small>Lead Time</small><b>${esc(x.lead)} days</b></span>` : ''}</div></div>
   <div class="rw-b"><div class="sinfo">
    ${box('Contacts', row('Main contact', esc([x.contact, x.role].filter(Boolean).join(', '))) + phones.map((p) => row(esc(p.t), telA(p.n))).join('') + emails.map((e, j) => row(j ? 'Email ' + (j + 1) : 'Email', mailA(e))).join('') + row('Orders email', x.orderEmail ? mailA(x.orderEmail) : '') + row('Area sales rep', esc([x.rep, x.repTel].filter(Boolean).join(', '))) + row('Alternative contact', esc(x.altContact || '')), 'No contact details yet. Click Edit supplier to add them.')}
    ${box('Account', row('Account number', esc(x.account || '')) + row('Payment terms', esc(x.terms || '')) + row('Minimum order', x.minOrder ? money(x.minOrder) : '') + row('Lead time', x.lead ? esc(x.lead) + ' days' : '') + row('Delivery days', esc(x.days || '')) + row('How we pay', esc(x.payBy || '')) + row('Credit limit', x.credit ? money(x.credit) : '') + row('Our discount', x.disc ? esc(x.disc) + '%' : '') + row('Free delivery over', x.carFree ? money(x.carFree) : '') + row('Delivery charge', x.carCost ? money(x.carCost) : '') + row('How we order', esc(x.orderBy || '')) + row('Order cut-off', esc(x.cutoff || '')) + row('Ordering portal', SAFE.url(x.portal) ? `<a href="${esc(SAFE.url(x.portal))}" target="_blank" rel="noopener noreferrer">Open</a>` : ''), 'No account details yet.')}
    ${box('Company And Quality', row('Supplies', esc(x.cat || '')) + row('Brands', esc(x.brands || '')) + row('VAT number', esc(x.vat || '')) + row('Company number', esc(x.coNo || '')) + row('Certificates', esc(x.certs || '')) + row('Insurance expires', x.insExp ? `<span class="${x.insExp < today() ? 'warn' : ''}">${fd(x.insExp)}${x.insExp < today() ? ' (expired)' : ''}</span>` : '') + row('Our rating', esc(x.rating || '')), 'Nothing added yet.')}
    ${box('Address And Web', (x.address ? `<p class="snote">${esc(x.address)}</p>` : '') + row('Website', url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url.replace(/^https?:\/\//, ''))}</a>` : ''), 'No address yet.')}
    ${box('Notes', x.notes ? `<p class="snote">${esc(x.notes)}</p>` : '', 'No notes yet.')}
   </div>
   <div class="smini"><b>Stock</b><span>${s.L.length} lines</span><span class="sep"></span><span>${s.units} units</span>${Ad ? `<span class="sep"></span><span>${m0(s.value)}</span>` : ''}<span class="sep"></span><span class="${need.length ? 'warn' : ''}" style="font-size:inherit">${s.low.length} low, ${s.out.length} out</span><span class="sep"></span><span>${s.req.length} requests</span><span class="sep"></span><span>${s.D.length} deliveries due${s.od.length ? ` (${s.od.length} late)` : ''}</span>
    ${
      s.L.length
        ? `<details><summary>Show stock lines</summary><div class="tw" style="box-shadow:none;margin-top:.4rem"><table><thead><tr><th>ID</th><th>Item</th><th class="c-sm">Length / Colours</th><th class="n">Stock</th><th class="n c-md">Cost</th><th class="ac">Status</th></tr></thead><tbody>${s.L.slice()
            .sort((a, b) => a.stock - b.stock)
            .map((r) => {
              const t = stt(r);
              return `<tr><td><code>${esc(r.pid)}</code></td><td><b>${esc(r.item)}</b></td><td class="c-sm">${esc([r.length != '-' ? r.length : '', colTxt(r) != '-' ? colTxt(r) : ''].filter(Boolean).join(', ') || '-')}</td><td class="n">${r.stock} ${esc(unitOf(r))}</td><td class="n c-md">${money(r.cost)}</td><td class="ac"><div class="acts r"><span class="tag fw ${t[1]}">${t[0] == 'OK' ? 'In Stock' : t[0]}</span>${t[0] != 'OK' ? `<button class="mini pri" ${onClick('stockForm', 'request', r.pid)}>Request</button>` : ''}</div></td></tr>`;
            })
            .join('')}</tbody></table></div></details>`
        : ''
    }</div>
   </div></div>`,
    'full'
  );
}
export function supReorder(i) {
  const x = state.suppliers[i];
  if (!x) return;
  const s = supStats(x),
    need = [...s.out, ...s.low].filter((r) => !s.req.some((q) => q.pid == r.pid));
  if (!need.length) {
    toast('Everything low already has a request');
    return;
  }
  askIn(
    'Create ' + need.length + ' stock request' + (need.length > 1 ? 's' : '') + '?',
    'For ' + x.name + '. They go to an administrator for approval.',
    'Create',
    () => supReorderGo(x, need)
  );
}
export function supReorderGo(x, need) {
  need.forEach((r) => {
    const q = reorderQty(r);
    state.items.unshift(
      moveRow(r, 'request', q, r.stock, { reqStatus: 'Pending', ord: nextOrd('P'), note: 'Reorder from ' + x.name })
    );
  });
  audit('Reorder requested', x.name, need.length + ' lines');
  store();
  render();
  toast(need.length + ' requests sent for approval');
}
export function supDetail(i) {
  const x = state.suppliers[i];
  if (!x) return;
  const s = supStats(x),
    so = supOrders(x);
  openModal(
    `<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>${esc(x.name)}</h2><p class="muted" style="margin-top:-.4rem">${x.account ? 'Account ' + esc(x.account) : ''}${x.terms ? ' · ' + esc(x.terms) : ''}</p><h3>Items Supplied (${s.L.length})</h3>${s.L.map((r) => `<div class="row"><span><b>${esc(r.item)}</b> <span class="muted">${esc(r.length)}, ${esc(colTxt(r))}</span></span><span class="acts"><span class="tag ${r.stock <= 0 ? 'r' : isLow(r) ? 'y' : 'g'}">${r.stock} ${esc(unitOf(r))}</span><button class="mini" ${onClick('stockForm', 'request', r.pid)}>Request</button></span></div>`).join('') || '<p class="empty">No items linked yet. Set the supplier on an item.</p>'}<h3>Open Requests</h3>${s.req.map((r) => `<div class="row"><span>${ordTag(r)} ${r.qty} ${esc(unitOf(r))} x ${esc(r.item)}</span>${reqTag(r)}</div>`).join('') || '<p class="empty">None.</p>'}<h3>Open Deliveries</h3>${s.D.map((d) => `<div class="row"><span><b>${esc(d.items)}</b><br><span class="muted">${esc(d.contract || '-')}</span></span>${dTag(d)}</div>`).join('') || '<p class="empty">Nothing outstanding.</p>'}${so.length ? '<h3>Imported Orders</h3>' + so.map((o) => `<div class="row"><span><b>${esc(o.ref)}</b> ${esc(o.customer)}<br><span class="muted">${esc(o.desc)}${o.due ? ', due ' + fd(o.due) : ''}</span></span><span class="tag">${esc(o.status || '-')}</span></div>`).join('') : ''}<div class="mact"><button class="btn ghost" ${onClick('editSup', i)}>Edit</button><button class="btn ghost" ${onClick('editDel', null, x.name)}>New Delivery</button><button class="btn" data-act="closeModal">Close</button></div>`,
    'lg'
  );
}
/* a supplier is a Supplier contact in the contact book; details are kept in step both ways */
export const conOf = (name) =>
  state.contacts.find(
    (c) =>
      (c.co || '').trim().toLowerCase() ==
      String(name || '')
        .trim()
        .toLowerCase()
  );
export function supFromContact(oldCo, c) {
  const s = state.suppliers.find((x) => x.name.toLowerCase() == String(oldCo || c.co).toLowerCase());
  if (!s) return;
  if (c.co && c.co != s.name) {
    const old = s.name;
    state.items.forEach((y) => {
      if (y.supplier == old) y.supplier = c.co;
    });
    state.deliveries.forEach((y) => {
      if (y.supplier == old) y.supplier = c.co;
    });
    (state.fin || []).forEach((b) => {
      if (b.payee == old) b.payee = c.co;
    });
    s.name = c.co;
  }
  if (c.name) s.contact = c.name;
  if (c.role) s.role = c.role;
  s.phone = c.phone || '';
  s.email = c.email || '';
  if (c.email2) s.orderEmail = c.email2;
  if (c.web) s.url = c.web;
  if (c.addr) s.address = [c.addr, c.town, c.pc].filter(Boolean).join(', ');
  {
    const ex = conPhones(c).slice(1);
    if (ex.length) s.phones = ex.map((p) => p.t + ': ' + p.n).join('\n');
  }
  audit('Supplier updated from contact book', s.name, '');
}
export function contactFromSup(oldName, s) {
  const c = conOf(oldName) || conOf(s.name);
  if (!c) return;
  c.co = s.name;
  if (s.contact) c.name = s.contact;
  if (s.role) c.role = s.role;
  c.email = s.email || '';
  if (s.orderEmail) c.email2 = s.orderEmail;
  if (s.url) c.web = s.url;
  if (s.address && s.address != [c.addr, c.town, c.pc].filter(Boolean).join(', ')) {
    c.addr = s.address;
    c.town = '';
    c.pc = '';
  }
  c.type = 'Supplier';
  /* main phone from the supplier goes first in the contact's numbers; the other labelled numbers are kept */
  const ph = conPhones(c);
  if (s.phone) {
    if (ph.length) ph[0] = { ...ph[0], n: s.phone };
    else ph.push({ t: 'Office', n: s.phone });
  }
  c.phones = ph;
  c.phone = ph[0] ? ph[0].n : '';
}
/* a new supplier is a contact book company too: with none to pick, the contact form opens first and then carries on here */
export const NEWCO = '+ Add a new company';
/* start-up step (run once by main.js): "+ Add a new company" in any supplier list */
export function plugSuppliersIn() {
  plugInForms({ newCompany: { value: NEWCO, open: supNewCo } });
}
export function supNewCo() {
  editContact(null, { type: 'Supplier', lines: [] }, (co) => editSup(null, co));
}
export function editSup(i, pre) {
  if (i == null && !pre) {
    const av = state.contacts.filter(
      (c) => c.type == 'Supplier' && c.co && !state.suppliers.some((s) => s.name.toLowerCase() == c.co.toLowerCase())
    );
    if (!av.length) {
      supNewCo();
      toast('Add the company first. Then the supplier details follow.');
      return;
    }
  }
  const x = i == null ? (pre ? { name: pre } : {}) : state.suppliers[i] || {},
    AV = state.contacts
      .filter(
        (c) =>
          c.type == 'Supplier' &&
          c.co &&
          (i != null || !state.suppliers.some((s) => s.name.toLowerCase() == c.co.toLowerCase()))
      )
      .map((c) => c.co);
  wizard({
    saveLabel: 'Save supplier',
    title: i == null ? 'Add Supplier' : 'Edit ' + x.name,
    v: { ...x },
    edit: i != null,
    steps: [
      {
        t: 'Company',
        d:
          i == null
            ? 'Pick the supplier from the contact book.'
            : 'Who is the supplier? Change the name in the contact book.',
        f: [
          i == null
            ? {
                k: 'name',
                l: 'Supplier (from the contact book)',
                t: 'select',
                o: ['', ...AV, NEWCO],
                req: 1,
                w: 'full',
                hint: 'Not listed? Pick ' + NEWCO + ' to add them to the contact book and here in one go',
              }
            : { k: 'name', l: 'Supplier name', ro: 1, max: 60, w: 'full', hint: 'Rename in the Contact Book' },
          { k: 'cat', l: 'What they supply', t: 'select', o: ['', ...SUPCAT], req: 1 },
          { k: 'brands', l: 'Brands or ranges', max: 120, hint: 'e.g. Rehau, Residence 9' },
          { k: 'vat', l: 'VAT number', max: 20 },
          { k: 'coNo', l: 'Company number', max: 20 },
          { k: 'url', l: 'Website or status page', max: 300, w: 'full', hint: 'Optional. Must start with https://' },
          {
            k: 'address',
            l: 'Address (from the contact book)',
            ro: 1,
            w: 'full',
            hint: 'Change it in the Contact Book',
          },
        ],
      },
      {
        t: 'Account',
        d: 'Your account with them',
        f: [
          { k: 'account', l: 'Our account number', max: 40 },
          {
            k: 'terms',
            l: 'Payment terms',
            t: 'select',
            o: [
              '',
              'Pro forma (pay before)',
              'Cash on delivery',
              '7 days',
              '14 days',
              '30 days',
              '30 days end of month',
              '60 days',
              'Monthly account',
            ],
          },
          { k: 'payBy', l: 'How we pay', t: 'select', o: ['', 'BACS', 'Card', 'Direct debit', 'Pro forma', 'Cheque'] },
          { k: 'credit', l: 'Credit limit (£)', t: 'number', max: 1e7 },
          { k: 'disc', l: 'Our discount (%)', t: 'number', max: 100, dp: 1 },
          { k: 'minOrder', l: 'Minimum order (£)', t: 'number', max: 1e6 },
          { k: 'carFree', l: 'Free delivery over (£)', t: 'number', max: 1e6 },
          { k: 'carCost', l: 'Delivery charge (£)', t: 'number', max: 1e5 },
        ],
      },
      {
        t: 'Ordering',
        d: 'How to place an order and when it comes',
        f: [
          {
            k: 'orderBy',
            l: 'How we order',
            t: 'select',
            o: ['', 'Email', 'Online portal', 'Phone', 'Rep visit', 'EDI'],
          },
          { k: 'portal', l: 'Ordering portal link', max: 300, hint: 'Optional. Must start with https://' },
          { k: 'cutoff', l: 'Order cut-off time', t: 'time' },
          { k: 'lead', l: 'Lead time (days)', t: 'number', max: 365, dp: 0 },
          {
            k: 'days',
            l: 'Delivery days',
            t: 'select',
            o: [
              '',
              'Any weekday',
              'Mon, Wed and Fri',
              'Tue and Thu',
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
              'On request',
            ],
          },
          { k: 'orderEmail', l: 'Orders / accounts email', t: 'email' },
        ],
      },
      {
        t: 'People',
        d: 'Who you speak to. Phone numbers live in the Contact Book.',
        f: [
          { k: 'contact', l: 'Main contact name', max: 60 },
          { k: 'role', l: 'Their role', max: 60 },
          { k: 'email', l: 'Main email', t: 'email' },
          { k: 'rep', l: 'Area sales rep', max: 60 },
          { k: 'repTel', l: 'Rep mobile', t: 'tel', max: 30 },
          { k: 'altContact', l: 'Alternative contact (name and number)', max: 120 },
          { k: 'emails', l: 'Other emails (one per line)', t: 'area', max: 600, w: 'full' },
        ],
      },
      {
        t: 'Quality',
        d: 'Standards and how they are doing',
        f: [
          {
            k: 'certs',
            l: 'Certificates',
            max: 160,
            w: 'full',
            hint: 'e.g. BSI Kitemark, PAS 24, Secured by Design, FSC',
          },
          { k: 'insExp', l: 'Insurance expires', t: 'date' },
          { k: 'rating', l: 'Our rating', t: 'select', o: ['', 'Excellent', 'Good', 'OK', 'Poor'] },
          { k: 'notes', l: 'Notes', t: 'area', max: 1000, w: 'full' },
          { k: 'feed', l: 'Feed relay URL (optional, for live order feeds)', max: 300, w: 'full' },
        ],
      },
      { t: 'Review', d: 'Check and save', review: 1 },
    ],
    check: (st, v) => {
      if (st == 0) {
        if (v.name == NEWCO) {
          setTimeout(supNewCo, 0);
          return 'Opening the contact form';
        }
        if (!v.name) return 'Pick a supplier from the contact book';
        const cc = conOf(v.name);
        if (!cc) return 'That company is not in the contact book';
        if (!v.cat) return 'Pick what they supply';
        v.address = [cc.addr, cc.town, cc.pc].filter(Boolean).join(', ');
        if (i == null) {
          if (!v.contact) v.contact = cc.name || '';
          if (!v.phone) v.phone = cc.phone || '';
          if (!v.email) v.email = cc.email || '';
          if (!v.role) v.role = cc.role || '';
        }
        if (v.url && !SAFE.url(v.url)) return 'The website must be an https:// link';
        if (state.suppliers.some((s, j) => j !== i && s.name.toLowerCase() == v.name.toLowerCase()))
          return 'A supplier with that name already exists';
      }
      if (st == 2 && v.portal && !SAFE.url(v.portal)) return 'The ordering portal must be an https:// link';
      if (st == 3) {
        const bad = lines(v.emails).find((e) => !SAFE.email(e));
        if (bad) return bad + ' does not look like an email address';
      }
    },
    save: (v) => {
      const keys = [
          'name',
          'cat',
          'brands',
          'vat',
          'coNo',
          'url',
          'address',
          'account',
          'terms',
          'payBy',
          'credit',
          'disc',
          'minOrder',
          'carFree',
          'carCost',
          'orderBy',
          'portal',
          'cutoff',
          'lead',
          'days',
          'contact',
          'role',
          'email',
          'orderEmail',
          'rep',
          'repTel',
          'altContact',
          'emails',
          'certs',
          'insExp',
          'rating',
          'notes',
          'feed',
        ],
        o = {};
      keys.forEach((k) => {
        if (v[k] !== undefined) o[k] = v[k];
      });
      if (i == null) {
        repos.suppliers.add(o);
        contactFromSup(o.name, o);
        audit('Supplier added', o.name, '');
        toast(o.name + ' added');
      } else {
        const old = x.name;
        repos.suppliers.changed(Object.assign(x, o));
        contactFromSup(old, x);
        if (old != o.name) {
          state.items.forEach((y) => {
            if (y.supplier == old) y.supplier = o.name;
          });
          state.deliveries.forEach((y) => {
            if (y.supplier == old) y.supplier = o.name;
          });
        }
        audit('Supplier edited', o.name, old != o.name ? 'Renamed from ' + old : '');
        toast('Saved');
      }
    },
    del: i != null ? () => delSup(i) : null,
  });
}
export function delSup(i) {
  const x = state.suppliers[i];
  if (!x) return;
  askYes(
    'Delete ' + x.name + '?',
    'Stock items keep the supplier name. This cannot be undone.',
    'Delete supplier',
    () => {
      repos.suppliers.remove((s) => s === x);
      audit('Supplier deleted', x.name, '');
      store();
      render();
    },
    true
  );
}
export function stockNoSupplier() {
  uiState.inv.f = 'nosup';
  uiState.inv.v = 'products';
  go('stock');
}
