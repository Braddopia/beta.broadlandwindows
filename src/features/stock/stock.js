/* features/stock/stock: The Inventory page and stock movements. */
import { UNITS } from '../../config/constants.js';
import { onClick, onEvent, rowClick } from '../../core/actions.js';
import { nowT, today } from '../../core/dates.js';
import { $, esc } from '../../core/dom.js';
import { csvDownload } from '../../ui/download.js';
import { m0, money, sum } from '../../core/format.js';
import { ICONS, svg } from '../../core/icons.js';
import { uuid } from '../../core/ids.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import {
  byUid,
  colTxt,
  hasLoc,
  ikey,
  isLow,
  key,
  moveRow,
  nextOrd,
  prod,
  products,
  ro,
  stkId,
  stt,
  unitOf,
} from '../../domain/stock.js';
import { can } from '../../domain/permissions.js';
import { need } from '../auth/session.js';
import { stockForm } from './item-window.js';
import { isPhone, vPDA } from './phone-mode.js';
import { SUPN, suppliersPanel } from '../suppliers/suppliers.js';
import { emptyArt } from '../../ui/components/art.js';
import { closeFpop, openFpop } from '../../ui/components/popover.js';
import { cmp, pagerH, paginate, thS } from '../../ui/components/table.js';
import { ordTag, reqTag } from '../../ui/components/tags.js';
import { hex } from '../../ui/forms/colour-picker.js';
import { form } from '../../ui/forms/form.js';
import { askYes, closeModal, openModal } from '../../ui/modal.js';
import { hit, render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { uiState } from '../../ui/ui-state.js';

export const SEL = new Set();
/* a product's photos that can still be shown */
export const pphotos = (k) => (state.pphotos[k] || []).filter(SAFE.img);
/* ---------------- page ---------------- */
export function vStock() {
  const v = uiState.inv.v;
  const tog = `<div class="seg2"><button class="${v == 'products' ? 'on' : ''}" ${onClick('setUI', 'inv.v', 'products')}>Products</button><button class="${v == 'moves' ? 'on' : ''}" ${onClick('setUI', 'inv.v', 'moves')}>Movements</button></div>`;
  return v == 'moves' ? vMoves(tog) : vProducts(tog);
}
export function invFiltered() {
  const I = uiState.inv,
    P = products();
  const okF = (r) =>
    I.f == 'all' ||
    (I.f == 'low' && isLow(r) && r.stock > 0) ||
    (I.f == 'out' && r.stock <= 0) ||
    (I.f == 'noloc' && !hasLoc(r)) ||
    (I.f == 'nosup' && !r.supplier);
  const val =
    {
      pid: (r) => r.pid,
      item: (r) => r.item,
      length: (r) => r.length,
      colours: colTxt,
      unit: unitOf,
      location: (r) => (hasLoc(r) ? r.location : '~'),
      stock: (r) => +r.stock,
      reorder: ro,
      supplier: (r) => r.supplier || '~',
      cost: (r) => +r.cost,
      value: (r) => r.stock * r.cost,
      status: (r) => (r.stock <= 0 ? 0 : isLow(r) ? 1 : 2),
    }[I.sort] || ((r) => r.item);
  return P.filter(
    (r) =>
      hit(r) &&
      okF(r) &&
      (I.sup == 'all' || r.supplier == I.sup) &&
      (I.loc == 'all' || r.location == I.loc) &&
      (I.unit == 'all' || unitOf(r) == I.unit)
  ).sort((a, b) => cmp(val(a), val(b)) * I.dir || cmp(a.item, b.item));
}
export function vProducts(tog) {
  if (isPhone() && !uiState.inv.full) return vPDA();
  const Ad = can('money'),
    I = uiState.inv,
    P = products(),
    list = invFiltered(),
    pg = paginate(I, list),
    n = SEL.size,
    cnt = (f) => P.filter(f).length;
  const pend = state.items.filter((r) => r.type == 'request' && r.reqStatus == 'Pending').length,
    alerts = state.items.filter((r) => r.flag && !r.cleared).length;
  const K = [
    ['Products', P.length, '', ['inv.f', 'all']],
    ['Units On Shelf', sum(P, (r) => r.stock), '', null],
    ...(Ad ? [['Stock Value', m0(sum(P, (r) => r.stock * r.cost)), '', null]] : []),
    [
      'Low Stock',
      cnt((r) => isLow(r) && r.stock > 0),
      cnt((r) => isLow(r) && r.stock > 0) ? 'warn' : '',
      ['inv.f', 'low'],
    ],
    ['Out Of Stock', cnt((r) => r.stock <= 0), cnt((r) => r.stock <= 0) ? 'bad' : '', ['inv.f', 'out']],
    ['Pending Requests', pend, pend ? 'warn' : '', ['moves', 'request']],
    ['Alerts', alerts, alerts ? 'bad' : '', ['moves', 'alert']],
  ];
  const kpi = (k) =>
    k[3]
      ? `<button class="kpi ${k[2]} ${k[3][0] == 'inv.f' && I.f == k[3][1] && k[3][1] != 'all' ? 'on' : ''}" ${k[3][0] == 'moves' ? onClick('invMoves', k[3][1]) : onClick('setUI', k[3][0], k[3][1])}><small>${k[0]}</small><b>${k[1]}</b></button>`
      : `<div class="kpi"><small>${k[0]}</small><b>${k[1]}</b></div>`;
  const ch = (v, t) => `<button class="chip ${I.f == v ? 'on' : ''}" ${onClick('setUI', 'inv.f', v)}>${t}</button>`;
  const filtersOn = I.sup != 'all' || I.loc != 'all' || I.unit != 'all';
  const rows = pg.rows
    .map((r) => {
      const k = key(r),
        s = stt(r),
        on = SEL.has(k);
      return `<tr class="clk-r ${on ? 'sel' : ''}" ${rowClick('viewItem', k)}><td><input type="checkbox" aria-label="Select ${esc(r.item)}" ${on ? 'checked' : ''} ${onEvent('onchange', 'invSel', k, 'this.checked')}></td><td><code>${esc(r.pid)}</code></td><td><b>${esc(r.item)}</b></td><td class="c-sm">${esc(r.length)}</td><td class="c-md">${esc(colTxt(r))}</td><td>${esc(unitOf(r))}</td><td class="c-md">${hasLoc(r) ? esc(r.location) : '<span class="muted">Not Set</span>'}</td><td class="n">${r.stock}</td><td class="c-sm">${esc(r.supplier || '-')}</td><td class="n c-sm">${money(r.cost)}</td>${Ad ? `<td class="n c-md">${money(r.stock * r.cost)}</td>` : ''}<td class="ac"><div class="acts r"><span class="tag fw ${s[1]}">${s[0] == 'OK' ? 'In Stock' : s[0] == 'Low' ? 'Low' : 'Out'}</span><button class="mini" ${onClick('viewItem', k)}>View</button><button class="mini pri" ${onClick('editItem', k)}>${svg(ICONS.edit)}Edit</button><button class="mini c-sm" ${onClick('reportProd', k)}>Report</button></div></td></tr>`;
    })
    .join('');

  return `<div class="head"><div><h1>Inventory</h1><span class="muted">${P.length} products, ${sum(P, (r) => r.stock)} units${Ad ? ', ' + m0(sum(P, (r) => r.stock * r.cost)) : ''}</span></div><div class="tools">${tog}<span class="vs"></span><div class="seg2"><button class="g" ${onClick('stockForm', 'add')}>+ Add</button><button class="r" ${onClick('stockForm', 'remove')}>- Remove</button><button ${onClick('stockForm', 'request')}>Request</button></div><button class="mini" data-act="invNew">Batch Add</button><button class="mini" data-act="invRep">Reports</button><button class="mini" data-act="invCsv">Export CSV</button></div></div>
  <div class="kpis">${K.map(kpi).join('')}</div>
  <div class="sg2">${ch('all', 'All (' + P.length + ')')}${ch('low', 'Low (' + cnt((r) => isLow(r) && r.stock > 0) + ')')}${ch('out', 'Out (' + cnt((r) => r.stock <= 0) + ')')}${ch('noloc', 'No Location (' + cnt((r) => !hasLoc(r)) + ')')}${ch('nosup', 'No Supplier (' + cnt((r) => !r.supplier) + ')')}${filtersOn ? `<span class="vs"></span><button class="chip on" data-act="invReset">Filters on &times;</button>` : ''}</div>
  ${n ? `<div class="selbar"><b>${n} Selected</b><button class="mini pri" ${onClick('invBatch', 'add')}>Add Stock</button><button class="mini" ${onClick('invBatch', 'remove')}>Remove Stock</button><button class="mini" ${onClick('invSetF', 'location')}>Set Location</button><button class="mini" ${onClick('invSetF', 'supplier')}>Set Supplier</button><button class="mini" ${onClick('invSetF', 'unit')}>Set Unit</button><button class="mini" data-act="invRep">Report</button><button class="mini" data-act="invLabels">Labels</button><button class="mini" ${onClick('invCsv', 1)}>Export</button>${can('manage') ? '<button class="mini del" data-act="invDel">Delete</button>' : ''}<button class="mini" data-act="invSelClear">Clear</button></div>` : ''}
  <div class="tw"><table class="ptb"><thead><tr><th><input type="checkbox" aria-label="Select all on this page" ${pg.rows.length && pg.rows.every((r) => SEL.has(key(r))) ? 'checked' : ''} ${onEvent('onchange', 'invAll', 'this.checked')}></th>${thS('inv', 'pid', 'ID')}${thS('inv', 'item', 'Item')}${thS('inv', 'length', 'Length', 'c-sm')}${thS('inv', 'colours', 'Colours', 'c-md')}${thS('inv', 'unit', 'Unit')}${thS('inv', 'location', 'Location', 'c-md')}${thS('inv', 'stock', 'Stock', 'n')}${thS('inv', 'supplier', 'Supplier', 'c-sm')}${thS('inv', 'cost', 'Cost', 'n c-sm')}${Ad ? thS('inv', 'value', 'Value', 'n c-md') : ''}<th class="ac"><span class="srt" ${onClick('sortBy', 'inv', 'status')} style="cursor:pointer;margin-right:.5rem">Status${uiState.inv.sort == 'status' ? `<span class="ar">${uiState.inv.dir > 0 ? '▲' : '▼'}</span>` : ''}</span><button class="fbtn ${filtersOn ? 'on' : ''}" id="invF" title="Sort and filter" aria-label="Sort and filter" data-act="invFilter" data-args="[{&quot;$&quot;:&quot;this&quot;}]">${svg(ICONS.filter)}</button></th></tr></thead><tbody>${rows || `<tr><td colspan="14" class="empty">${emptyArt('stock', 'No products match.')}</td></tr>`}</tbody></table></div>
  ${pagerH('inv', pg, 'products')}
  <div style="margin-top:1.1rem">${suppliersPanel()}</div>`;
}
export function invMoves(f) {
  uiState.inv.v = 'moves';
  uiState.mov.f = f;
  uiState.mov.page = 1;
  render();
}
export function invReset() {
  Object.assign(uiState.inv, { sup: 'all', loc: 'all', unit: 'all', f: 'all', page: 1 });
  closeFpop();
  render();
}
/* sort + filter popover (funnel icon in the table header) */
export function invFilter(btn) {
  const I = uiState.inv,
    P = products(),
    Ad = can('money'),
    opts = (a, cur, all) =>
      `<option value="all">${all}</option>` +
      a.map((x) => `<option value="${esc(x)}" ${x == cur ? 'selected' : ''}>${esc(x)}</option>`).join('');
  const sorts = [
    ['item', 'Item code'],
    ['pid', 'Stock ID'],
    ['stock', 'Stock level'],
    ['status', 'Status'],
    ['location', 'Location'],
    ['supplier', 'Supplier'],
    ['unit', 'Unit'],
    ['reorder', 'Reorder level'],
    ['cost', 'Cost each'],
    ...(Ad ? [['value', 'Stock value']] : []),
  ];
  openFpop(
    btn,
    `<h3>Sort By</h3><select ${onEvent('onchange', 'invPop', 'sort', 'this.value')}>${sorts.map(([k, t]) => `<option value="${k}" ${I.sort == k ? 'selected' : ''}>${t}</option>`).join('')}</select><select ${onEvent('onchange', 'invPop', 'dir', 'this.value')}><option value="1" ${I.dir > 0 ? 'selected' : ''}>Ascending (A to Z, low to high)</option><option value="-1" ${I.dir < 0 ? 'selected' : ''}>Descending (Z to A, high to low)</option></select>
   <h3>Filter</h3><select aria-label="Status" ${onEvent('onchange', 'invPop', 'f', 'this.value')}>${[
     ['all', 'All statuses'],
     ['low', 'Low stock'],
     ['out', 'Out of stock'],
     ['noloc', 'No location'],
     ['nosup', 'No supplier'],
   ]
     .map(([k, t]) => `<option value="${k}" ${I.f == k ? 'selected' : ''}>${t}</option>`)
     .join('')}</select>
   <select aria-label="Supplier" ${onEvent('onchange', 'invPop', 'sup', 'this.value')}>${opts([...new Set(P.map((r) => r.supplier).filter(Boolean))].sort(), I.sup, 'All suppliers')}</select>
   <select aria-label="Location" ${onEvent('onchange', 'invPop', 'loc', 'this.value')}>${opts([...new Set(P.filter(hasLoc).map((r) => r.location))].sort(), I.loc, 'All locations')}</select>
   <select aria-label="Unit" ${onEvent('onchange', 'invPop', 'unit', 'this.value')}>${opts(UNITS, I.unit, 'All units')}</select>
   <div class="acts"><button class="mini" data-act="invReset">Reset</button><button class="mini pri" data-act="closeFpop">Done</button></div>`
  );
}
export function invPop(k, v) {
  uiState.inv[k] = k == 'dir' ? +v : v;
  uiState.inv.page = 1;
  render();
  const b = $('#invF');
  if (b) {
    $('#fpop').classList.remove('open');
    invFilter(b);
  }
}
/* selection + batch tools */
export function invSel(k, on) {
  on ? SEL.add(k) : SEL.delete(k);
  render();
}
export function invAll(on) {
  paginate(uiState.inv, invFiltered()).rows.forEach((r) => (on ? SEL.add(key(r)) : SEL.delete(key(r))));
  render();
}
export function invBatch(kind) {
  form(
    (kind == 'add' ? 'Add Stock To ' : 'Remove Stock From ') + SEL.size + ' Items',
    [{ k: 'qty', l: 'Quantity for each item', t: 'number', req: 1, pos: 1, w: 'full', max: 1e6 }],
    { qty: 1 },
    (o) => {
      SEL.forEach((k) => {
        const b = prod(k);
        if (!b) return;
        const st = kind == 'add' ? b.stock + o.qty : Math.max(0, b.stock - o.qty);
        state.items.unshift(moveRow(b, kind, o.qty, st));
      });
      audit('Batch ' + kind, SEL.size + ' products', 'Qty ' + o.qty + ' each');
    }
  );
}
export function invSetF(f) {
  const L = { location: 'Location (Bay, Bin, Shelf, Rack)', supplier: 'Supplier', unit: 'Unit' }[f];
  form(
    'Set ' + L.replace(/ \(.*/, '') + ' For ' + SEL.size + ' Items',
    [
      f == 'location'
        ? { k: 'v', l: L, w: 'full', req: 1, list: 'locs', max: 60 }
        : { k: 'v', l: L, t: 'select', o: f == 'unit' ? UNITS : SUPN(), w: 'full', req: 1 },
    ],
    {},
    (o) => {
      state.items.forEach((x) => {
        if (SEL.has(key(x))) x[f] = o.v;
      });
      audit('Batch set ' + f, SEL.size + ' products', o.v);
    }
  );
}
export function invDel() {
  const n = SEL.size;
  if (!n || !need('manage', 'Deleting products')) return;
  askYes(
    'Delete ' + n + ' product' + (n > 1 ? 's' : '') + '?',
    'All of their stock history goes too. This cannot be undone.',
    'Delete',
    () => {
      state.items = state.items.filter((x) => !SEL.has(key(x)));
      SEL.forEach((k) => delete state.pphotos[k]);
      audit('Products deleted', n + ' products', [...SEL].join(', '));
      SEL.clear();
      store();
      render();
      toast(n + ' deleted');
    },
    true
  );
}
export function invNew() {
  openModal(
    `<h2>Batch Add Products</h2><p class="muted">One product per line, comma or tab separated: Item Code, Qty, Cost, Supplier, Location, Length, Colour In, Colour Out, Unit. The first four are required. You can paste straight from Excel.</p><div class="ff"><textarea id="bn" rows="9" placeholder="ACET848, 20, 1.85, Example Profiles Ltd, Bay 3 Shelf B, 4MM, Black, Gold, PCS"></textarea></div><div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" data-act="invNewRun">Add Products</button></div>`,
    'lg'
  );
}
export function invNewRun() {
  const lines = $('#bn')
      .value.split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 2000),
    ok = [],
    bad = [];
  lines.forEach((l, i) => {
    const c = l.split(/\t|,/).map((x) => SAFE.text(x, 60));
    if (i == 0 && /^item/i.test(c[0])) return;
    const [item, q, cost, sup, loc, len, ci, co, un] = c,
      qty = SAFE.num(q, { max: 1e6 }),
      cs = SAFE.num(cost, { max: 1e6 });
    if (!SAFE.code(item) || !(qty > 0) || !(cs > 0) || !sup) {
      bad.push(i + 1);
      return;
    }
    const unit = UNITS.find((u) => u.toLowerCase() == String(un || '').toLowerCase()) || 'Each';
    ok.push({
      item: SAFE.code(item),
      qty,
      cost: cs,
      supplier: sup,
      location: loc || '',
      length: len || '-',
      cInName: ci || '-',
      cOutName: co || '-',
      unit,
    });
  });
  if (bad.length) {
    toast(
      'Check line' +
        (bad.length > 1 ? 's ' : ' ') +
        bad.slice(0, 8).join(', ') +
        ': item, quantity, cost and supplier are required'
    );
    return;
  }
  if (!ok.length) {
    toast('Nothing to add');
    return;
  }
  ok.forEach((o) => {
    const ex = state.items.find((x) => ikey(x) == ikey(o)),
      pid = ex ? ex.pid : stkId(),
      st = (ex ? ex.stock : 0) + o.qty;
    if (!state.suppliers.some((s) => s.name == o.supplier)) state.suppliers.push({ name: o.supplier });
    state.items.unshift({
      at: Date.now(),
      time: nowT(),
      type: 'add',
      flag: false,
      uid: uuid(),
      pid,
      user: USER,
      qty: o.qty,
      unit: o.unit,
      item: o.item,
      length: o.length,
      cInName: o.cInName,
      cIn: hex(o.cInName),
      cOutName: o.cOutName,
      cOut: hex(o.cOutName),
      stock: st,
      cost: o.cost,
      location: o.location || (ex ? ex.location : '-'),
      barcode: ex ? ex.barcode : '',
      supplier: o.supplier,
      reorder: ex ? ex.reorder : undefined,
      lead: ex && ex.lead,
    });
  });
  audit('Batch add', ok.length + ' products', '');
  store();
  closeModal();
  render();
  toast(ok.length + ' product' + (ok.length > 1 ? 's' : '') + ' added');
}
export function invCsv(onlySel) {
  const Ad = can('money'),
    P = onlySel ? products().filter((r) => SEL.has(key(r))) : invFiltered();
  csvDownload('broadland-stock-' + today() + '.csv', [
    [
      'Stock ID',
      'Item',
      'Length',
      'Colour In',
      'Colour Out',
      'Unit',
      'Location',
      'Stock',
      'Reorder Level',
      'Supplier',
      'Barcode',
      ...(Ad ? ['Cost Each', 'Stock Value'] : []),
    ],
    ...P.map((r) => [
      r.pid,
      r.item,
      r.length,
      r.cInName,
      r.cOutName,
      unitOf(r),
      r.location,
      r.stock,
      ro(r),
      r.supplier || '',
      r.barcode || r.item,
      ...(Ad ? [r.cost, (r.stock * r.cost).toFixed(2)] : []),
    ]),
  ]);
  toast('Exported ' + P.length + ' products');
}
/* ---------------- movements ---------------- */
export function vMoves(tog) {
  const M = uiState.mov,
    Ad = can('money');
  const ok = (r) =>
    M.f == 'all' ||
    (M.f == 'alert'
      ? r.flag && !r.cleared
      : M.f == 'pending'
        ? r.type == 'request' && r.reqStatus == 'Pending'
        : r.type == M.f);
  const L = state.items.filter((r) => ok(r) && hit(r)),
    pg = paginate(M, L),
    cnt = (f) => state.items.filter(f).length;
  const ch = (v, t) => `<button class="chip ${M.f == v ? 'on' : ''}" ${onClick('setUI', 'mov.f', v)}>${t}</button>`;
  return `<div class="head"><div><h1>Inventory</h1><span class="muted">Stock movements and requests</span></div><div class="tools">${tog}<span class="vs"></span><div class="seg2"><button class="g" ${onClick('stockForm', 'add')}>+ Add</button><button class="r" ${onClick('stockForm', 'remove')}>- Remove</button><button ${onClick('stockForm', 'request')}>Request</button></div></div></div>
  <div class="sg2">${ch('all', 'All')}${ch('request', 'Requests (' + cnt((r) => r.type == 'request') + ')')}${ch('pending', 'Pending (' + cnt((r) => r.type == 'request' && r.reqStatus == 'Pending') + ')')}${ch('add', 'Added')}${ch('remove', 'Removed')}${ch('alert', 'Alerts (' + cnt((r) => r.flag && !r.cleared) + ')')}</div>
  <div class="tw"><table class="ptb"><thead><tr><th>Order No.</th><th>Time</th><th>Type</th><th class="c-sm">User</th><th class="n">Qty</th><th>Item</th><th class="c-sm">Length</th><th class="c-md">Colours</th><th class="n c-md">Stock After</th><th class="ac"></th></tr></thead><tbody>
  ${
    pg.rows
      .map((r) => {
        const req = r.type == 'request',
          pend = req && r.reqStatus == 'Pending';
        return `<tr class="clk-r" ${rowClick('viewItem', r.pid)} style="${req && ['Cleared', 'Rejected'].includes(r.reqStatus) ? 'opacity:.6' : ''}"><td>${ordTag(r) || '<span class="muted">-</span>'}</td><td>${esc(r.time)}</td><td><span class="tag ${r.type == 'add' ? 'g' : r.type == 'remove' ? 'r' : 'y'}">${esc(r.type)}</span>${req ? ' ' + reqTag(r) : ''}${r.flag && !r.cleared ? ' <span class="tag r">Alert</span>' : ''}</td><td class="c-sm">${esc(r.user)}</td><td class="n">${r.qty} ${esc(unitOf(r))}</td><td><b>${esc(r.item)}</b></td><td class="c-sm">${esc(r.length)}</td><td class="c-md">${esc(colTxt(r))}</td><td class="n c-md">${req ? '<span class="muted">-</span>' : r.stock}</td><td class="ac"><div class="acts r">${pend && Ad ? `<button class="mini pri" ${onClick('reqApprove', r.uid)}>Approve</button><button class="mini del" ${onClick('reqReject', r.uid)}>Reject</button>` : ''}${req && r.reqStatus == 'Approved' ? `<button class="mini ok" ${onClick('reqReceive', r.uid)}>Receive</button>` : ''}${(req && !['Cleared', 'Rejected'].includes(r.reqStatus) && !pend) || (r.flag && !r.cleared) ? `<button class="mini" ${onClick('moveClear', r.uid)}>Clear</button>` : ''}<button class="mini" ${onClick('viewItem', r.pid)}>View</button>${can('manage') ? `<button class="mini del" ${onClick('moveDel', r.uid)} aria-label="Delete entry">&times;</button>` : ''}</div></td></tr>`;
      })
      .join('') || '<tr><td colspan="10" class="empty">No entries match.</td></tr>'
  }
  </tbody></table></div>${pagerH('mov', pg, 'entries')}`;
}
export function reqApprove(u) {
  if (!need('money', 'Approving requests')) return;
  const r = byUid(u);
  if (!r || r.reqStatus != 'Pending') return;
  r.pref = r.ord;
  r.ord = nextOrd('');
  r.reqStatus = 'Approved';
  r.flag = false;
  r.approvedBy = USER;
  r.approvedAt = Date.now();
  audit('Request approved', r.item, r.pref + ' became order ' + r.ord);
  store();
  render();
  toast('Approved: ' + r.pref + ' is now order ' + r.ord);
}
export function reqReject(u) {
  if (!need('money', 'Rejecting requests')) return;
  const r = byUid(u);
  if (!r) return;
  r.reqStatus = 'Rejected';
  r.flag = false;
  audit('Request rejected', r.item, r.ord);
  store();
  render();
}
export function reqReceive(u) {
  const r = byUid(u);
  if (!r) return;
  stockForm('add', r.pid, { qty: r.qty, fromReq: u });
}
export function moveClear(u) {
  const r = byUid(u);
  if (!r) return;
  r.cleared = true;
  r.flag = false;
  if (r.type == 'request' && r.reqStatus != 'Pending') r.reqStatus = 'Cleared';
  audit('Movement cleared', r.item, r.ord || r.type);
  store();
  render();
}
export function moveDel(u) {
  if (!need('manage', 'Deleting history')) return;
  const r = byUid(u);
  if (!r) return;
  askYes(
    'Delete this entry?',
    'Stock levels are not changed.',
    'Delete entry',
    () => {
      state.items = state.items.filter((x) => x !== r);
      audit('Movement deleted', r.item, r.type + ' ' + r.qty + (r.ord ? ' ' + r.ord : ''));
      store();
      render();
    },
    true
  );
}
export function invSelClear() {
  SEL.clear();
  render();
}
