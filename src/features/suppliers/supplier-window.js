/* features/suppliers/supplier-window: the supplier window in the same family as the lead and contract windows
   (v19.18): a large centred window that can go full page, a toolbar (Edit Supplier, New Delivery, Request Low Items,
   Website, Clipboard, first / previous / next / last supplier, Search, Full Page, Close), the title line, and tabs:
   Details (two halves of label / value rows with folding groups), Stock, Deliveries, Requests and Notes.
   Details are changed with Edit Supplier (the supplier form), so the rows here are read-only. */
import { onClick, rowClick } from '../../core/actions.js';
import { fd, today } from '../../core/dates.js';
import { $, $$ } from '../../core/dom.js';
import { html, raw } from '../../core/html.js';
import { lines, m0, money } from '../../core/format.js';
import { ICONS, svg } from '../../core/icons.js';
import { SAFE } from '../../data/sanitize.js';
import { state } from '../../data/state.js';
import { can } from '../../domain/permissions.js';
import { colTxt, stt, unitOf } from '../../domain/stock.js';
import { conPhones } from '../contacts/contacts.js';
import { abList } from '../records/ab-list.js';
import { abPlace } from '../records/record-page.js';
import { conOf, supOrders, supStats } from './suppliers.js';
import { closeFpop, openFpop } from '../../ui/components/popover.js';
import { copyText } from '../../ui/download.js';
import { dTag, ordTag, reqTag } from '../../ui/components/tags.js';
import { openModal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

const S = { name: '', tab: 'details' };
const sup = () => state.suppliers.find((s) => s.name == S.name);
const order = () =>
  state.suppliers
    .map((s) => s.name)
    .slice()
    .sort((a, b) => a.localeCompare(b));
const fullPage = () => {
  try {
    return localStorage.getItem('bb_rw_full') == '1';
  } catch (e) {
    return false;
  }
};
/* a read-only row: text, or a link (phone, email, web) */
const row = (l, v, g, href) => ({
  k: 'x' + l.replace(/\W+/g, ''),
  l,
  t: 'calc',
  g,
  calc: () => v || '',
  ...(href && v ? { href: href } : {}),
});
const phonesOf = (x) => {
  const cc = conOf(x.name);
  return cc
    ? conPhones(cc)
    : [x.phone, ...lines(x.phones)].filter(Boolean).map((n, j) => ({ t: j ? 'Phone ' + (j + 1) : 'Phone', n }));
};
const emailsOf = (x) => [x.email, ...lines(x.emails)].filter(Boolean);

/** open a supplier by name */
export function supWin(n, tab) {
  const x = state.suppliers.find((s) => s.name == n);
  if (!x) return;
  S.name = x.name;
  S.tab = tab || 'details';
  const i = state.suppliers.indexOf(x),
    s = supStats(x),
    url = SAFE.url(x.url),
    L = order(),
    pos = L.indexOf(x.name),
    last = L.length - 1,
    need = [...s.out, ...s.low],
    ph = phonesOf(x),
    em = emailsOf(x),
    next = s.D.slice().sort((a, b) => String(a.due).localeCompare(String(b.due)))[0];
  const navB = (d, t, label, dis) =>
    html`<button class="rb1 ic" title="${label}" aria-label="${label}" ${raw(onClick('supNav', d))}${dis ? raw(' disabled') : ''}>${raw(t)}</button>`;
  const tabs = [
    ['details', 'Details'],
    ['stock', s.L.length ? s.L.length + ' Stock Lines' : 'Stock'],
    ['deliveries', s.D.length ? s.D.length + (s.D.length == 1 ? ' Delivery Due' : ' Deliveries Due') : 'Deliveries'],
    ['requests', s.req.length ? s.req.length + (s.req.length == 1 ? ' Request' : ' Requests') : 'Requests'],
    ['notes', 'Notes'],
  ];
  openModal(
    String(html`<div class="rw ab" data-kind="supplier">
   <div class="rw-bar" role="toolbar" aria-label="Supplier"><button class="rb1 sv" ${raw(onClick('editSup', i))}>${raw(svg(ICONS.edit))}Edit Supplier</button><i class="rw-div"></i>
    <span class="rw-wide"><button class="rb1" ${raw(onClick('editDel', null, x.name))}>New Delivery</button>${need.length ? html`<button class="rb1 go" ${raw(onClick('supReorder', i))}>Request Low Items (${need.length})</button>` : ''}${url ? html`<a class="rb1" href="${url}" target="_blank" rel="noopener noreferrer">Website</a>` : ''}${x.hm ? raw('<button class="rb1" data-act="syncHM">Sync Feed</button>') : ''}<button class="rb1" id="swClipB" aria-haspopup="true" data-act="supClip" data-args="[{&quot;$&quot;:&quot;this&quot;}]">Clipboard<span class="rw-ch" aria-hidden="true">▾</span></button></span><span class="rw-sp"></span>
    ${L.length > 1 ? html`<span class="rw-nav">${navB('first', '&laquo;', 'First supplier', pos <= 0)}${navB(-1, '&lsaquo;', 'Previous supplier', pos <= 0)}<span class="rw-pos">${pos + 1} of ${L.length}</span>${navB(1, '&rsaquo;', 'Next supplier', pos >= last)}${navB('last', '&raquo;', 'Last supplier', pos >= last)}</span>` : ''}
    <div class="rw-find" role="search"><input id="swFind" placeholder="Search Suppliers" aria-label="Search suppliers by name or what they supply" maxlength="60" autocomplete="off" data-onkeydown="supFindKey" data-args-keydown="[{&quot;$&quot;:&quot;event&quot;}]"><button type="button" class="rb1 ic" aria-label="Search" data-act="supFind">${raw(svg(ICONS.search))}</button></div>
    <button class="rb1 ic rw-fp" data-act="recFull" title="Full page" aria-label="Full page" aria-pressed="${String(fullPage())}">${raw(svg('M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'))}</button><button class="rb1 cl" data-act="closeModal">${raw(svg('M6 6l12 12M18 6L6 18'))}Close</button></div>
   <div class="rw-h"><div><small>Supplier${x.hm ? ' · Live Feed' : ''}${L.length > 1 ? ' · ' + (pos + 1) + ' of ' + L.length : ''}</small><h2>${x.name}</h2><div class="rw-hc">${x.cat ? html`<span>${x.cat}</span>` : ''}${ph[0] ? html`<a class="nocap" href="tel:${ph[0].n.replace(/[^\d+]/g, '')}">${raw(svg('M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2'))}${ph[0].n}</a>` : ''}${em[0] ? html`<a class="nocap" href="mailto:${em[0]}">${raw(svg('M4 6h16v12H4zM4 7l8 6 8-6'))}${em[0]}</a>` : ''}${s.od.length ? html`<button type="button" class="rw-cust" ${raw(onClick('supTab', 'deliveries'))}>${s.od.length} Late ${s.od.length == 1 ? 'Delivery' : 'Deliveries'}</button>` : ''}</div></div>
    <div class="rw-hk">${x.account ? html`<span><small>Account</small><b>${x.account}</b></span>` : ''}${x.lead ? html`<span><small>Lead Time</small><b>${x.lead} days</b></span>` : ''}<span><small>Stock Lines</small><b>${s.L.length}</b></span><span class="${s.od.length ? 'hk-due' : ''}"><small>Next Due</small><b>${next ? fd(next.due) : 'None'}</b></span></div></div>
   <div class="ab-tabs" role="tablist" aria-label="Supplier tabs">${tabs.map(([k, t]) => html`<button type="button" role="tab" data-t="${k}" class="${k == S.tab ? 'on' : ''}" aria-selected="${String(k == S.tab)}" ${raw(onClick('supTab', k))}>${t}</button>`)}</div>
   <div class="rw-b">${tabs.map(([k]) => html`<div class="rw-p ${k == S.tab ? 'on' : ''}" data-t="${k}" role="tabpanel">${raw(supPanel(k, x, s))}</div>`)}</div>
   </div>`),
    'full ab' + (fullPage() ? ' fp' : '')
  );
  abPlace();
  $('#mbox .rw').addEventListener('keydown', (e) => {
    if (
      (e.key == 'PageUp' || e.key == 'PageDown') &&
      !(e.target.matches && e.target.matches('input,textarea,select'))
    ) {
      e.preventDefault();
      supNav(e.key == 'PageUp' ? -1 : 1);
    }
  });
}
function supPanel(k, x, s) {
  const Ad = can('money'),
    url = SAFE.url(x.url),
    portal = SAFE.url(x.portal);
  if (k == 'details') {
    const ph = phonesOf(x),
      em = emailsOf(x);
    const left = [
      row('Supplier', x.name),
      row('What they supply', x.cat),
      row('Brands or ranges', x.brands),
      row('Main contact', [x.contact, x.role].filter(Boolean).join(', ')),
      ...ph.map((p) => row(p.t, p.n, 'Phone Numbers', 'tel:' + p.n.replace(/[^\d+]/g, ''))),
      ...em.map((e, j) => row(j ? 'Email ' + (j + 1) : 'Email', e, 'Email', SAFE.email(e) ? 'mailto:' + e : '')),
      row('Orders email', x.orderEmail, 'Email', SAFE.email(x.orderEmail || '') ? 'mailto:' + x.orderEmail : ''),
      row('Area sales rep', [x.rep, x.repTel].filter(Boolean).join(', '), 'Other Contacts'),
      row('Alternative contact', x.altContact, 'Other Contacts'),
    ];
    const right = [
      row('Account number', x.account, 'Account'),
      row('Payment terms', x.terms, 'Account'),
      row('Minimum order', x.minOrder ? money(x.minOrder) : '', 'Account'),
      row('Lead time', x.lead ? x.lead + ' days' : '', 'Account'),
      row('Delivery days', x.days, 'Account'),
      row('How we pay', x.payBy, 'Account'),
      row('Credit limit', x.credit ? money(x.credit) : '', 'Account'),
      row('Our discount', x.disc ? x.disc + '%' : '', 'Account'),
      row('Free delivery over', x.carFree ? money(x.carFree) : '', 'Account'),
      row('Delivery charge', x.carCost ? money(x.carCost) : '', 'Account'),
      row('How we order', x.orderBy, 'Account'),
      row('Order cut-off', x.cutoff, 'Account'),
      row('Ordering portal', portal ? portal.replace(/^https?:\/\//, '') : '', 'Account', portal),
      row('VAT number', x.vat, 'Company And Quality'),
      row('Company number', x.coNo, 'Company And Quality'),
      row('Certificates', x.certs, 'Company And Quality'),
      row(
        'Insurance expires',
        x.insExp ? fd(x.insExp) + (x.insExp < today() ? ' (expired)' : '') : '',
        'Company And Quality'
      ),
      row('Our rating', x.rating, 'Company And Quality'),
      row('Address', x.address, 'Address And Web'),
      row('Website', url ? url.replace(/^https?:\/\//, '') : '', 'Address And Web', url),
    ];
    return String(
      html`<div class="abd"><div class="abd-l abd-st">${raw(abList(left, x))}${raw(
        abList(
          [
            row('Units in stock', String(s.units), 'Stock And Deliveries'),
            ...(Ad ? [row('Stock value', m0(s.value), 'Stock And Deliveries')] : []),
            row('Low or out of stock', s.low.length + ' low, ' + s.out.length + ' out', 'Stock And Deliveries'),
            row('Open requests', String(s.req.length), 'Stock And Deliveries'),
            row(
              'Deliveries due',
              s.D.length + (s.od.length ? ' (' + s.od.length + ' late)' : ''),
              'Stock And Deliveries'
            ),
          ],
          x
        )
      )}</div><div class="abd-r">${raw(abList(right, x))}</div></div>`
    );
  }
  if (k == 'stock')
    return String(
      html`<div class="abgrid sw-t"><table class="plt"><thead><tr><th>ID</th><th>Item</th><th>Length / Colours</th><th class="n">Stock</th>${Ad ? raw('<th class="n">Cost</th>') : ''}<th>Status</th><th></th></tr></thead><tbody>${
        s.L.length
          ? s.L.slice()
              .sort((a, b) => a.stock - b.stock)
              .map((r) => {
                const t = stt(r);
                return html`<tr><td><code>${r.pid}</code></td><td><b>${r.item}</b></td><td>${[r.length != '-' ? r.length : '', colTxt(r) != '-' ? colTxt(r) : ''].filter(Boolean).join(', ') || '-'}</td><td class="n">${r.stock} ${unitOf(r)}</td>${Ad ? html`<td class="n">${money(r.cost)}</td>` : ''}<td><span class="tag fw ${t[1]}">${t[0] == 'OK' ? 'In Stock' : t[0]}</span></td><td>${t[0] != 'OK' ? html`<button class="mini pri" ${raw(onClick('stockForm', 'request', r.pid))}>Request</button>` : ''}</td></tr>`;
              })
          : raw(
              `<tr><td colspan="${Ad ? 7 : 6}" class="empty">No stock linked yet. Set the supplier on a product in Inventory.</td></tr>`
            )
      }</tbody></table></div>`
    );
  if (k == 'deliveries') {
    const so = supOrders(x);
    return String(
      html`<div class="abt" role="toolbar" aria-label="Deliveries"><button type="button" class="abt-w" ${raw(onClick('editDel', null, x.name))}>+ New Delivery</button><span class="abt-n">${s.D.length} due${s.od.length ? ', ' + s.od.length + ' late' : ''}</span></div><div class="abgrid"><table class="plt"><thead><tr><th>Ref</th><th>Items</th><th>Contract</th><th>Due</th><th>Status</th></tr></thead><tbody>${
        s.D.length
          ? s.D.slice()
              .sort((a, b) => String(a.due).localeCompare(String(b.due)))
              .map(
                (d) =>
                  html`<tr class="clk-r" ${raw(rowClick('editDel', d.id))}><td><b>${d.id}</b></td><td>${d.items || ''}</td><td>${d.contract || '-'}</td><td>${fd(d.due)}</td><td>${raw(dTag(d))}</td></tr>`
              )
          : raw('<tr><td colspan="5" class="empty">Nothing outstanding.</td></tr>')
      }</tbody></table></div>${
        so.length
          ? html`<h4 class="jc-h">Imported Orders</h4><div class="abgrid jc"><table class="plt"><thead><tr><th>Ref</th><th>Customer</th><th>Description</th><th>Due</th><th>Status</th></tr></thead><tbody>${so.map((o) => html`<tr><td><b>${o.ref}</b></td><td>${o.customer || ''}</td><td>${o.desc || ''}</td><td>${o.due ? fd(o.due) : ''}</td><td><span class="tag">${o.status || '-'}</span></td></tr>`)}</tbody></table></div>`
          : ''
      }`
    );
  }
  if (k == 'requests')
    return String(
      html`<div class="abgrid"><table class="plt"><thead><tr><th>Order</th><th>Item</th><th class="n">Qty</th><th>Status</th></tr></thead><tbody>${
        s.req.length
          ? s.req.map(
              (r) =>
                html`<tr><td>${raw(ordTag(r))}</td><td>${r.item}</td><td class="n">${r.qty} ${unitOf(r)}</td><td>${raw(reqTag(r))}</td></tr>`
            )
          : raw('<tr><td colspan="4" class="empty">No open requests.</td></tr>')
      }</tbody></table></div>`
    );
  return String(
    html`<div class="abl sw-notes">${x.notes ? html`<p class="snote">${x.notes}</p>` : raw('<p class="empty">No notes yet. Add them with Edit Supplier.</p>')}</div>`
  );
}
export function supTab(k) {
  S.tab = k;
  $$('#mbox .ab-tabs button').forEach((b) => {
    b.classList.toggle('on', b.dataset.t == k);
    b.setAttribute('aria-selected', b.dataset.t == k);
  });
  $$('#mbox .rw-b .rw-p').forEach((p) => p.classList.toggle('on', p.dataset.t == k));
  const b = $('#mbox .rw-b');
  if (b) b.scrollTop = 0;
}
export function supNav(d) {
  const L = order(),
    i = L.indexOf(S.name),
    n = d == 'first' ? 0 : d == 'last' ? L.length - 1 : i + d;
  if (n < 0 || n >= L.length || n == i) return;
  supWin(L[n], S.tab);
}
export function supFind() {
  const q = String(($('#swFind') || {}).value || '')
    .trim()
    .toLowerCase();
  if (!q) return;
  const M = state.suppliers.filter((s) =>
    [s.name, s.cat, s.brands, s.account].some((v) =>
      String(v || '')
        .toLowerCase()
        .includes(q)
    )
  );
  if (!M.length) return toast('No supplier matches "' + q + '"');
  if (M.length == 1) return supWin(M[0].name, S.tab);
  openFpop(
    $('#swFind'),
    String(
      html`<div class="pm" role="menu">${M.slice(0, 12).map((s) => html`<button type="button" class="pm-i" ${raw(onClick('supJump', s.name))}><b>${s.name}</b> ${s.cat || ''}</button>`)}</div>`
    )
  );
}
export function supJump(n) {
  closeFpop();
  supWin(n, S.tab);
}
export function supFindKey(e) {
  if (e.key == 'Enter') {
    e.preventDefault();
    supFind();
  }
}
/* ---- Clipboard ---- */
const CLIP = {
  name: ['Supplier Name', (x) => x.name],
  phone: ['Phone Number', (x) => (phonesOf(x)[0] || {}).n || ''],
  email: ['Email Address', (x) => emailsOf(x)[0] || ''],
  orders: ['Orders Email', (x) => x.orderEmail || ''],
  account: ['Our Account Number', (x) => x.account || ''],
  address: ['Address', (x) => [x.name, x.address].filter(Boolean).join('\n')],
};
export function supClip(btn) {
  openFpop(
    btn,
    String(
      html`<div class="pm" role="menu">${Object.entries(CLIP).map(([k, [l]]) => html`<button type="button" class="pm-i" ${raw(onClick('supCopy', k))}>Copy ${l}</button>`)}</div>`
    )
  );
}
export function supCopy(k) {
  closeFpop();
  const x = sup(),
    t = x && CLIP[k] ? CLIP[k][1](x) : '';
  if (!t) return toast('Nothing to copy yet');
  copyText(t);
}
