/* integrations/smart-orders: Importing Smart Systems order exports as deliveries. */
import { fd, iso } from '../core/dates.js';
import { $, esc } from '../core/dom.js';
import { SAFE } from '../data/sanitize.js';
import { audit } from '../data/audit.js';
import { store } from '../data/persistence.js';
import { state } from '../data/state.js';
import { ORDDONE } from '../domain/deliveries.js';
import { askYes, closeModal, openModal } from '../ui/modal.js';
import { render } from '../ui/shell/router.js';
import { toast } from '../ui/toast.js';

/* ---------------- Smart Orders import (CSV with column mapping) ---------------- */
export const OF = [
  ['ref', 'Order number'],
  ['cust', 'Customer'],
  ['desc', 'Product'],
  ['due', 'Due date'],
  ['status', 'Status'],
  ['sup', 'Supplier (optional)'],
];
export const OPAT = {
  ref: /order|ref|number|no\.?$|id/,
  due: /due|deliver|ship|install|date/,
  status: /status|stage|state/,
  cust: /customer|client|name|site|account/,
  desc: /product|desc|item|style|type/,
  sup: /supplier|vendor|manufactur/,
};
export const csvP = (t, d) => {
  const r = [];
  let row = [],
    c = '',
    qq = 0;
  for (let i = 0; i < t.length; i++) {
    const x = t[i];
    if (qq) {
      if (x == '"' && t[i + 1] == '"') {
        c += '"';
        i++;
      } else if (x == '"') qq = 0;
      else c += x;
    } else if (x == '"') qq = 1;
    else if (x == d) {
      row.push(c);
      c = '';
    } else if (x == '\n' || x == '\r') {
      if (x == '\r' && t[i + 1] == '\n') i++;
      row.push(c);
      r.push(row);
      row = [];
      c = '';
    } else c += x;
  }
  row.push(c);
  r.push(row);
  return r.filter((r) => r.some((v) => v.trim()));
};
export const ordDate = (v) => {
  v = (v || '').trim();
  let m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m)
    return SAFE.date(
      (m[3].length == 2 ? '20' + m[3] : m[3]) + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0')
    );
  m = v.match(/^\d{4}-\d{2}-\d{2}/);
  if (m) return SAFE.date(m[0]);
  const x = new Date(v);
  return isNaN(x) ? '' : iso(x);
};
export let ordRows = null;
export function ordImport() {
  openModal(
    `<h2>Import Smart Orders</h2><p class="muted">Upload the order export (CSV) or paste the table. The next step lets you check which column is which.</p><div class="ff full"><label class="btn ghost sm" style="cursor:pointer">Choose CSV file<input type="file" accept=".csv,.tsv,.txt" hidden data-onchange="ordFile" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]"></label></div><div class="ff full"><textarea id="ordTxt" rows="8" placeholder="Or paste here, first row = column headings"></textarea></div><div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" data-act="ordNext">Next</button></div>`
  );
}
export function ordFile(inp) {
  const f = inp.files[0];
  if (!f) return;
  if (f.size > 5e6) {
    toast('That file is too large');
    return;
  }
  f.text().then((t) => {
    $('#ordTxt').value = t;
  });
}
export function ordNext() {
  const t = $('#ordTxt').value.trim();
  if (!t) {
    toast('Nothing to import');
    return;
  }
  ordRows = csvP(t, t.split('\n')[0].includes('\t') ? '\t' : ',').slice(0, 5001);
  const H = ordRows[0],
    hl = H.map((h) => h.toLowerCase()),
    sv = state.ordMap || {},
    same = sv.h == H.join('|'),
    used = new Set();
  const pick = (k) => {
    let i = same && sv[k] != null ? sv[k] : -2;
    if (i == -2) {
      i = hl.findIndex((h, j) => !used.has(j) && OPAT[k].test(h));
      if (i < 0 && k == 'ref') i = 0;
    }
    if (i >= 0) used.add(i);
    return i;
  };
  const opt = (i) =>
    `<option value="-1">- none -</option>` +
    H.map((h, j) => `<option value="${j}"${j == i ? ' selected' : ''}>${esc(h || 'Column ' + (j + 1))}</option>`).join(
      ''
    );
  openModal(
    `<h2>Check The Columns</h2><div class="grid">${OF.map(([k, l]) => `<div class="ff"><label>${l}</label><select id="om_${k}" data-onchange="ordPrev">${opt(pick(k))}</select></div>`).join('')}<div class="ff full"><label>Supplier for all orders (when no supplier column)</label><select id="om_dsup" data-onchange="ordPrev">${state.suppliers
      .map((x) => `<option${/smart/i.test(x.name) ? ' selected' : ''}>${esc(x.name)}</option>`)
      .join(
        ''
      )}</select></div></div><h3>Preview</h3><div id="om_prev"></div><div class="mact"><button class="btn ghost" data-act="ordImport">Back</button><button class="btn" data-act="ordGo">Import</button></div>`,
    'lg'
  );
  ordPrev();
}
export function ordBuild() {
  const c = {};
  OF.forEach(([k]) => (c[k] = +$('#om_' + k).value));
  const g = (r, k) => (c[k] >= 0 ? SAFE.text(r[c[k]], 120) : ''),
    d = $('#om_dsup').value;
  return ordRows
    .slice(1)
    .map((r) => ({
      ref: g(r, 'ref'),
      customer: g(r, 'cust'),
      desc: g(r, 'desc'),
      due: ordDate(g(r, 'due')),
      status: g(r, 'status'),
      supplier: g(r, 'sup') || d,
    }))
    .filter((o) => o.ref || o.customer);
}
export function ordPrev() {
  $('#om_prev').innerHTML =
    ordBuild()
      .slice(0, 3)
      .map(
        (o) =>
          `<div class="row"><span><b>${esc(o.ref)}</b> ${esc(o.customer)}<br><span class="muted">${esc(o.desc)}, ${o.due ? fd(o.due) : 'no date'}, ${esc(o.status || 'no status')}, ${esc(o.supplier)}</span></span></div>`
      )
      .join('') || '<p class="empty">Nothing found, check the columns.</p>';
}
export function ordGo() {
  const O = ordBuild();
  if (!O.length) {
    toast('Nothing found, check the columns');
    return;
  }
  state.ordMap = { h: ordRows[0].join('|') };
  OF.forEach(([k]) => (state.ordMap[k] = +$('#om_' + k).value));
  state.orders = O;
  ordSync();
  audit('Orders imported', 'Smart Orders', O.length + ' orders');
  store();
  closeModal();
  render();
  toast(O.length + ' orders imported');
}
export function ordSync() {
  const old = new Map(state.deliveries.filter((d) => d.so).map((d) => [d.id, d])),
    seen = new Set();
  state.deliveries = state.deliveries.filter((d) => !d.so);
  state.orders.forEach((o, i) => {
    if (!o.due) return;
    let id = 'SO-' + (o.ref || 'row' + (i + 1));
    if (seen.has(id)) id += '-' + (i + 1);
    seen.add(id);
    const p = old.get(id);
    state.deliveries.push({
      id,
      supplier: o.supplier || 'Smart Systems',
      items: (o.desc || 'Smart order') + (o.customer ? ', ' + o.customer : ''),
      contract: o.ref,
      due: o.due,
      status: ORDDONE.test(o.status) || (p && p.status == 'Received') ? 'Received' : (p && p.status) || 'Due',
      stage: o.status || 'Ordered',
      so: 1,
    });
  });
}
export function ordClear() {
  askYes(
    'Clear imported orders?',
    'The Smart Orders list will be emptied. Import again to bring them back.',
    'Clear orders',
    () => {
      state.orders = [];
      ordSync();
      audit('Orders cleared', 'Smart Orders', '');
      store();
      render();
    },
    true
  );
}
