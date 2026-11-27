/* features/stock/stock: The Inventory page and stock movements. */
import { UNITS } from '../../config/constants.js';
import { onClick, onEvent, rowClick } from '../../core/actions.js';
import { today } from '../../core/dates.js';
import { $, esc } from '../../core/dom.js';
import { csvDownload } from '../../ui/download.js';
import { m0, money, sum } from '../../core/format.js';
import { ICONS, svg } from '../../core/icons.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import {
  areaOf,
  UNDO_MIN,
  byUid,
  canUndo,
  colTxt,
  exactProduct,
  hasLoc,
  ikey,
  isLow,
  key,
  moveRow,
  nextOrd,
  prod,
  products,
  qcIssue,
  ro,
  stkId,
  sizeNote,
  stt,
  unitLabel,
  stockParts,
  stockText,
  unitOf,
  prodRows,
} from '../../domain/stock.js';
import { can } from '../../domain/permissions.js';
import { need } from '../auth/session.js';
import { stockForm, viewItem } from './item-window.js';
import { openTake, vTake } from './stock-take.js';
import { srchMatch, srchText } from '../search/search.js';
import { isPhone, vPDA } from './phone-mode.js';
import { SUPN, suppliersPanel } from '../suppliers/suppliers.js';
import { emptyArt } from '../../ui/components/art.js';
import { closeFpop, openFpop } from '../../ui/components/popover.js';
import { cmp, pagerH, paginate, thS } from '../../ui/components/table.js';
import { ordTag, reqTag } from '../../ui/components/tags.js';
import { hex } from '../../config/colours.js';
import { form } from '../../ui/forms/form.js';
import { askYes, closeModal, openModal } from '../../ui/modal.js';
import { hit, q, render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { uiState } from '../../ui/ui-state.js';
import { stockLists } from '../../domain/stock-lists.js';

export const SEL = new Set();
/* a product's photos that can still be shown */
export const pphotos = (k) => (state.pphotos[k] || []).filter(SAFE.img);
/* ---------------- page ---------------- */
export function vStock() {
  const v = uiState.inv.v;
  const T = openTake();
  const tog = `<div class="seg2"><button class="${v == 'products' ? 'on' : ''}" ${onClick('setUI', 'inv.v', 'products')}>Products</button><button class="${v == 'moves' ? 'on' : ''}" ${onClick('setUI', 'inv.v', 'moves')}>Movements</button><button class="${v == 'take' ? 'on' : ''}" ${onClick('setUI', 'inv.v', 'take')}>Stock Take${T ? ' <i class="dotn"></i>' : ''}</button></div>`;
  return v == 'moves' ? vMoves(tog) : v == 'take' ? vTake(invNav(tog)) : vProducts(tog);
}
export function invFiltered() {
  const I = uiState.inv,
    P = products();
  const okF = (r) =>
    I.f == 'all' ||
    (I.f == 'low' && isLow(r) && r.stock > 0) ||
    (I.f == 'out' && r.stock <= 0) ||
    (I.f == 'noloc' && !hasLoc(r)) ||
    (I.f == 'nosup' && !r.supplier) ||
    (I.f == 'qc' && qcIssue(r, today()));
  const val =
    {
      pid: (r) => r.pid,
      item: (r) => r.item,
      length: (r) => r.length,
      colours: colTxt,
      unit: unitLabel,
      location: (r) => (hasLoc(r) ? r.location : '~'),
      group: (r) => r.group || '~',
      area: (r) => (r.area ? r.area : '~'),
      desc: (r) => r.desc || '~',
      stock: (r) => +r.stock,
      reorder: ro,
      supplier: (r) => r.supplier || '~',
      cost: (r) => +r.cost,
      value: (r) => r.stock * r.cost,
      status: (r) => (r.stock <= 0 ? 0 : isLow(r) ? 1 : 2),
    }[I.sort] || ((r) => r.item);
  const own = (I.q || '').trim().toLowerCase(),
    L = P.filter(
      (r) =>
        hit(r) &&
        (!own || srchMatch(srchText(r), own)) &&
        okF(r) &&
        (I.sup == 'all' || r.supplier == I.sup) &&
        (I.loc == 'all' || r.location == I.loc) &&
        (I.area == 'all' || areaOf(r) == I.area) &&
        (I.unit == 'all' || unitOf(r) == I.unit) &&
        (I.grp == 'all' || (r.group || '') == I.grp)
    ).sort((a, b) => cmp(val(a), val(b)) * I.dir || cmp(a.item, b.item));
  /* typed an exact Stock ID, item code or barcode: that product goes first */
  const x = invExact();
  if (x) {
    const i = L.indexOf(x);
    if (i > 0) L.unshift(...L.splice(i, 1));
  }
  return L;
}
/* the product whose Stock ID, code or barcode is exactly what was typed (Inventory box or top search) */
export const invExact = () => exactProduct(uiState.inv.q) || exactProduct(q);
let lastExact = null;
/* Inventory's own search box */
export function invSearch(v) {
  uiState.inv.q = SAFE.text(v, 80);
  uiState.inv.page = 1;
  render(true);
}
/* Enter in the Inventory search box opens the exact match */
export function invSearchKey(e) {
  if (e.key != 'Enter') return;
  const x = invExact();
  if (x) viewItem(x.pid);
}
/* after drawing: bring an exact match into view once */
export function invShowExact() {
  const x = invExact(),
    k = x ? x.pid : null;
  if (k == lastExact) return;
  lastExact = k;
  if (!k) return;
  requestAnimationFrame(() => {
    const row = document.querySelector('#main tr.xhit');
    row && row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}
/* the three main buttons, the same on Products and Movements */
const invMain = () =>
  `<button class="btn" ${onClick('stockForm', 'add')}>${svg(ICONS.plus)}Add Stock</button><button class="btn ghost" ${onClick('stockForm', 'remove')}>Remove Stock</button><button class="btn ghost" ${onClick('stockForm', 'request')}>Request</button>`;
/** the bar under the title on every Inventory tab: Products / Movements / Stock Take, then that tab's small tools */
export const invNav = (tog, tools = '') =>
  `<div class="subbar inv-nav">${tog}<span class="inv-nav-gap"></span>${tools ? `<div class="inv-nav-tools">${tools}</div>` : ''}</div>`;
export function vProducts(tog) {
  if (isPhone() && !uiState.inv.full) return vPDA();
  const Ad = can('money'),
    I = uiState.inv,
    P = products(),
    list = invFiltered(),
    pg = paginate(I, list),
    ex = invExact(),
    td = today(),
    n = SEL.size,
    cnt = (f) => P.filter(f).length;
  const pend = state.items.filter((r) => r.type == 'request' && r.reqStatus == 'Pending').length,
    alerts = state.items.filter((r) => r.flag && !r.cleared).length;
  const K = [
    ['Products', P.length, '', ['tile', 'all']],
    ['Units On Shelf', sum(P, (r) => r.stock), '', ['tile', 'stock']],
    ...(Ad ? [['Stock Value', m0(sum(P, (r) => r.stock * r.cost)), '', ['tile', 'value']]] : []),
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
      ? `<button class="kpi ${k[2]} ${(k[3][0] == 'inv.f' && I.f == k[3][1]) || (k[3][0] == 'tile' && k[3][1] != 'all' && I.sort == k[3][1] && I.dir == -1) ? 'on' : ''}" title="${{ all: 'Show every product (clears the filters)', stock: 'Most stock first', value: 'Highest value first' }[k[3][1]] || ''}" ${k[3][0] == 'moves' ? onClick('invMoves', k[3][1]) : k[3][0] == 'tile' ? onClick('invTile', k[3][1]) : onClick('setUI', k[3][0], k[3][1])}><small>${k[0]}</small><b>${k[1]}</b></button>`
      : `<div class="kpi"><small>${k[0]}</small><b>${k[1]}</b></div>`;
  const ch = (v, t) => `<button class="chip ${I.f == v ? 'on' : ''}" ${onClick('setUI', 'inv.f', v)}>${t}</button>`;
  const filtersOn = I.sup != 'all' || I.loc != 'all' || I.area != 'all' || I.unit != 'all' || I.grp != 'all';
  invShowExact();
  const rows = pg.rows
    .map((r) => {
      const k = key(r),
        s = stt(r),
        on = SEL.has(k),
        xh = ex && ex.pid == k,
        qi = qcIssue(r, td);
      const [num, unit] = stockParts(r),
        sub = [r.desc, sizeNote(r)].filter(Boolean).join(' · '),
        loc = hasLoc(r) ? r.location : '',
        cols = colTxt(r);
      return `<tr class="clk-r ${on ? 'sel' : ''} ${xh ? 'xhit' : ''}" ${rowClick('viewItem', k)}><td class="i-sel"><input type="checkbox" aria-label="Select ${esc(r.item)}" ${on ? 'checked' : ''} ${onEvent('onchange', 'invSel', k, 'this.checked')}></td><td class="i-id"><code>${esc(r.pid)}</code>${xh ? '<span class="xtag">Exact Match</span>' : ''}</td><td class="i-item" title="${esc([r.item, sub].filter(Boolean).join(' · '))}"><b>${esc(r.item)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</td><td class="i-stock"><span class="i-qty"><b>${esc(num)}</b><span class="i-unit">${esc(unit)}</span></span></td><td class="i-loc" title="${esc([loc, r.area].filter(Boolean).join(' · '))}"><span>${loc ? esc(loc) : '<span class="muted">Not set</span>'}</span>${r.area ? `<small>${esc(r.area)}</small>` : ''}</td><td class="c-md i-col" title="${esc(cols)}"><span>${esc(cols)}</span></td><td class="i-gap"></td><td class="c-sm i-cost">${money(r.cost)}</td>${Ad ? `<td class="c-md i-val">${money(r.stock * r.cost)}</td>` : ''}<td class="i-st"><span class="st2"><span class="tag fw ${s[1]}">${s[0] == 'OK' ? 'In Stock' : s[0] == 'Low' ? 'Low' : 'Out'}</span>${qi ? '<span class="tag r fw" title="Quality check needs attention">QC Check</span>' : ''}</span></td><td class="ac"><div class="acts r"><button class="mini" ${onClick('viewItem', k)}>View</button><button class="mini pri" ${onClick('editItem', k)}>${svg(ICONS.edit)}Edit</button><button class="mini i-rep" ${onClick('reportProd', k)}>Report</button></div></td></tr>`;
    })
    .join('');

  return `<div class="head"><div><h1>Inventory</h1><span class="muted">${P.length} products, ${sum(P, (r) => r.stock)} units${Ad ? ', ' + m0(sum(P, (r) => r.stock * r.cost)) : ''}</span></div><div class="tools">${invMain()}</div></div>
  ${invNav(tog, `<button class="mini" data-act="invNew">Batch Add</button><button class="mini" data-act="invRep">Reports</button><button class="mini" data-act="invCsv">Export CSV</button>${can('manage') ? '<button class="mini" data-act="invLists">Stock Lists</button>' : ''}`)}
  <div class="kpis">${K.map(kpi).join('')}</div>
  <div class="invbar"><label class="invq">${svg(ICONS.search)}<input id="invQ" type="search" autocomplete="off" maxlength="80" placeholder="Search: Stock ID, code, description, location, supplier" aria-label="Search inventory" value="${esc(I.q || '')}" ${onEvent('oninput', 'invSearch', 'this.value')} ${onEvent('onkeydown', 'invSearchKey', 'event')}></label><button class="inv-fb ${filtersOn ? 'on' : ''}" id="invF" aria-haspopup="true" title="Sort and filter" data-act="invFilter" data-args="[{&quot;$&quot;:&quot;this&quot;}]">${svg(ICONS.filter)}<span>Sort &amp; Filter</span>${filtersOn ? '<i>On</i>' : ''}</button>${ex ? `<button class="btn sm" ${onClick('viewItem', ex.pid)}>Open ${esc(ex.item)}</button>` : ''}<div class="inv-chips">${ch('all', 'All <i>' + P.length + '</i>')}${ch('low', 'Low <i>' + cnt((r) => isLow(r) && r.stock > 0) + '</i>')}${ch('out', 'Out <i>' + cnt((r) => r.stock <= 0) + '</i>')}${ch('noloc', 'No Location <i>' + cnt((r) => !hasLoc(r)) + '</i>')}${ch('nosup', 'No Supplier <i>' + cnt((r) => !r.supplier) + '</i>')}${ch('qc', 'QC Issues <i>' + cnt((r) => qcIssue(r, td)) + '</i>')}${filtersOn ? `<button class="chip on" data-act="invReset">Clear filters &times;</button>` : ''}</div></div>
  ${n ? `<div class="selbar"><b>${n} Selected</b><button class="mini pri" ${onClick('invBatch', 'add')}>Add Stock</button><button class="mini" ${onClick('invBatch', 'remove')}>Remove Stock</button><button class="mini" ${onClick('invSetF', 'location')}>Set Location</button><button class="mini" ${onClick('invSetF', 'group')}>Set Group</button><button class="mini" ${onClick('invSetF', 'supplier')}>Set Supplier</button><button class="mini" ${onClick('invSetF', 'unit')}>Set Unit</button><button class="mini" data-act="invRep">Report</button><button class="mini" data-act="invLabels">Labels</button><button class="mini" ${onClick('invCsv', 1)}>Export</button>${can('manage') ? '<button class="mini del" data-act="invDel">Delete</button>' : ''}<button class="mini" data-act="invSelClear">Clear</button></div>` : ''}
  <div class="tw"><table class="ptb fx t-inv"><thead><tr><th class="i-sel" data-col="sel"><input type="checkbox" aria-label="Select all on this page" ${pg.rows.length && pg.rows.every((r) => SEL.has(key(r))) ? 'checked' : ''} ${onEvent('onchange', 'invAll', 'this.checked')}></th>${thS('inv', 'pid', 'ID', 'i-id')}${thS('inv', 'item', 'Item', 'i-item')}${thS('inv', 'stock', 'Stock', 'i-stock')}${thS('inv', 'location', 'Location', 'i-loc')}${thS('inv', 'colours', 'Colours', 'c-md i-col')}<th class="i-gap" aria-hidden="true"></th>${thS('inv', 'cost', 'Cost', 'c-sm i-cost')}${Ad ? thS('inv', 'value', 'Value', 'c-md i-val') : ''}${thS('inv', 'status', 'Status', 'i-st')}<th class="ac" data-col="act"><span class="sr">Actions</span></th></tr></thead><tbody>${rows || `<tr><td colspan="14" class="empty">${emptyArt('stock', 'No products match.')}</td></tr>`}</tbody></table></div>
  ${pagerH('inv', pg, 'products')}
  <div style="margin-top:1.1rem">${suppliersPanel()}</div>`;
}
export function invMoves(f) {
  uiState.inv.v = 'moves';
  uiState.mov.f = f;
  uiState.mov.page = 1;
  render();
}
/** the first tiles: Products shows everything (filters cleared), Units On Shelf and Stock Value sort the list by
    that, biggest first; the table comes into view so the change can be seen */
export function invTile(k) {
  Object.assign(uiState.inv, {
    sup: 'all',
    loc: 'all',
    area: 'all',
    unit: 'all',
    grp: 'all',
    f: 'all',
    q: '',
    page: 1,
  });
  if (k == 'all') Object.assign(uiState.inv, { sort: 'pid', dir: 1 });
  else Object.assign(uiState.inv, { sort: k, dir: -1 });
  render();
  const t = $('#main .t-inv');
  if (t && t.scrollIntoView)
    t.scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  toast(
    k == 'all'
      ? 'Showing all ' + products().length + ' products'
      : k == 'stock'
        ? 'Sorted: most stock first'
        : 'Sorted: highest value first'
  );
}
export function invReset() {
  Object.assign(uiState.inv, {
    sup: 'all',
    loc: 'all',
    area: 'all',
    unit: 'all',
    grp: 'all',
    f: 'all',
    q: '',
    page: 1,
  });
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
    ['group', 'Product group'],
    ['area', 'Stock-take area'],
    ['desc', 'Description'],
    ['supplier', 'Supplier'],
    ['unit', 'Unit'],
    ['reorder', 'Reorder level'],
    ['cost', 'Cost each'],
    ...(Ad ? [['value', 'Stock value']] : []),
  ];
  openFpop(
    btn,
    `<h3>Sort By</h3><select ${onEvent('onchange', 'invPop', 'sort', 'this.value')}>${sorts.map(([k, t]) => `<option value="${k}" ${I.sort == k ? 'selected' : ''}>${t}</option>`).join('')}</select><select ${onEvent('onchange', 'invPop', 'dir', 'this.value')}><option value="1" ${I.dir > 0 ? 'selected' : ''}>A to Z, low to high</option><option value="-1" ${I.dir < 0 ? 'selected' : ''}>Z to A, high to low</option></select>
   <h3>Filter</h3><select aria-label="Status" ${onEvent('onchange', 'invPop', 'f', 'this.value')}>${[
     ['all', 'All statuses'],
     ['low', 'Low stock'],
     ['out', 'Out of stock'],
     ['noloc', 'No location'],
     ['nosup', 'No supplier'],
     ['qc', 'QC issues'],
   ]
     .map(([k, t]) => `<option value="${k}" ${I.f == k ? 'selected' : ''}>${t}</option>`)
     .join('')}</select>
   <select aria-label="Supplier" ${onEvent('onchange', 'invPop', 'sup', 'this.value')}>${opts([...new Set(P.map((r) => r.supplier).filter(Boolean))].sort(), I.sup, 'All suppliers')}</select>
   <select aria-label="Location" ${onEvent('onchange', 'invPop', 'loc', 'this.value')}>${opts([...new Set([...stockLists().locs, ...P.filter(hasLoc).map((r) => r.location)])], I.loc, 'All locations')}</select>
   <select aria-label="Product group" ${onEvent('onchange', 'invPop', 'grp', 'this.value')}>${opts(stockLists().groups, I.grp, 'All groups')}</select>
 <select aria-label="Area" ${onEvent('onchange', 'invPop', 'area', 'this.value')}>${opts([...new Set(P.map(areaOf))].sort(), I.area, 'All areas')}</select>
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
      let n = 0,
        short = 0;
      SEL.forEach((k) => {
        const b = prod(k);
        if (!b) return;
        const have = +b.stock || 0,
          q = kind == 'add' ? o.qty : Math.min(have, o.qty);
        if (kind == 'remove' && q < o.qty) short++;
        if (!q) return;
        state.items.unshift(moveRow(b, kind, q, kind == 'add' ? have + q : have - q));
        n++;
      });
      audit('Batch ' + kind, n + ' products', 'Qty ' + o.qty + ' each');
      setTimeout(
        () =>
          toast(
            (kind == 'add' ? 'Added ' + o.qty + ' to ' : 'Removed stock from ') +
              n +
              ' product' +
              (n == 1 ? '' : 's') +
              (short ? '. ' + short + ' had less than ' + o.qty + ', so all of theirs was removed' : '')
          ),
        30
      );
    }
  );
}
export function invSetF(f) {
  const L = { location: 'Location', supplier: 'Supplier', unit: 'Unit', group: 'Product Group' }[f];
  form(
    'Set ' + L.replace(/ \(.*/, '') + ' For ' + SEL.size + ' Items',
    [
      {
        k: 'v',
        l: L,
        t: 'select',
        o: f == 'location' ? stockLists().locs : f == 'group' ? stockLists().groups : f == 'unit' ? UNITS : SUPN(),
        w: 'full',
        req: 1,
      },
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
    /* pasted from Excel the columns are split by tabs (a location like "Bay 2, Shelf A" keeps its comma); typed
       by hand they are split by commas */
    const c = l.split(l.includes('\t') ? /\t/ : /,/).map((x) => SAFE.text(x, 60).trim());
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
  const L = (state.stockLists = state.stockLists || stockLists()),
    added = [];
  ok.forEach((o) => {
    /* a location typed in any case matches the list ("DOOR LOCKS" is Door Locks); a new one joins the list */
    if (o.location) {
      const m = L.locs.find((x) => x.toLowerCase() == o.location.toLowerCase());
      if (m) o.location = m;
      else {
        L.locs.push(o.location);
        added.push(o.location);
      }
    }
    const ex = products().find((x) => ikey(x) == ikey(o)),
      pid = ex ? ex.pid : stkId(),
      st = (ex ? +ex.stock || 0 : 0) + o.qty;
    if (!state.suppliers.some((s) => s.name == o.supplier)) state.suppliers.push({ name: o.supplier });
    const base = ex
      ? { ...ex, cost: o.cost, supplier: o.supplier, unit: o.unit, location: o.location || ex.location }
      : {
          pid,
          item: o.item,
          unit: o.unit,
          length: o.length,
          cInName: o.cInName,
          cIn: hex(o.cInName),
          cOutName: o.cOutName,
          cOut: hex(o.cOutName),
          cost: o.cost,
          location: o.location || '-',
          barcode: '',
          supplier: o.supplier,
        };
    state.items.unshift(moveRow(base, 'add', o.qty, st));
  });
  audit('Batch add', ok.length + ' products', added.length ? 'New locations: ' + added.join(', ') : '');
  store();
  closeModal();
  render();
  toast(
    ok.length +
      ' product' +
      (ok.length > 1 ? 's' : '') +
      ' added' +
      (added.length
        ? '. New location' + (added.length > 1 ? 's' : '') + ' added to Stock Lists: ' + added.join(', ')
        : '')
  );
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
  const L = state.items.filter((r) => r.type != 'import' && ok(r) && hit(r)),
    pg = paginate(M, L),
    cnt = (f) => state.items.filter(f).length;
  const ch = (v, t) => `<button class="chip ${M.f == v ? 'on' : ''}" ${onClick('setUI', 'mov.f', v)}>${t}</button>`;
  return `<div class="head"><div><h1>Inventory</h1><span class="muted">Stock movements and requests</span></div><div class="tools">${invMain()}</div></div>${invNav(tog)}
  <div class="invbar"><div class="inv-chips">${ch('all', 'All')}${ch('request', 'Requests <i>' + cnt((r) => r.type == 'request') + '</i>')}${ch('pending', 'Pending <i>' + cnt((r) => r.type == 'request' && r.reqStatus == 'Pending') + '</i>')}${ch('add', 'Added')}${ch('remove', 'Removed')}${ch('alert', 'Alerts <i>' + cnt((r) => r.flag && !r.cleared) + '</i>')}</div></div>
  <div class="tw"><table class="ptb"><thead><tr><th>Order No.</th><th>Time</th><th>Type</th><th class="c-sm">User</th><th class="n">Qty</th><th>Item</th><th class="c-sm">Length</th><th class="c-md">Colours</th><th class="n c-md">Stock After</th><th class="ac"></th></tr></thead><tbody>
  ${
    pg.rows
      .map((r) => {
        const req = r.type == 'request',
          pend = req && r.reqStatus == 'Pending';
        return `<tr class="clk-r" ${rowClick('viewItem', r.pid)} style="${(req && ['Cleared', 'Rejected', 'Cancelled'].includes(r.reqStatus)) || r.undone ? 'opacity:.6' : ''}" ${r.undone ? 'data-undone="1"' : ''}><td>${ordTag(r) || '<span class="muted">-</span>'}</td><td>${esc(r.time)}</td><td><span class="tag ${r.type == 'add' ? 'g' : r.type == 'remove' ? 'r' : 'y'}">${esc(r.type)}</span>${req && !r.undone ? ' ' + reqTag(r) : ''}${r.undone ? ` <span class="tag n" title="${esc(new Date(r.undone.at).toLocaleString('en-GB'))}">Undone by ${esc(r.undone.by)}</span>` : ''}${r.undoOf ? ' <span class="tag n">Undo</span>' : ''}${r.flag && !r.cleared ? ' <span class="tag r">Alert</span>' : ''}</td><td class="c-sm">${esc(r.user)}</td><td class="n">${esc(stockText({ ...r, stock: r.qty }))}</td><td><b>${esc(r.item)}</b></td><td class="c-sm">${esc(r.length)}</td><td class="c-md">${esc(colTxt(r))}</td><td class="n c-md">${req ? '<span class="muted">-</span>' : r.stock}</td><td class="ac"><div class="acts r">${pend && Ad ? `<button class="mini pri" ${onClick('reqApprove', r.uid)}>Approve</button><button class="mini del" ${onClick('reqReject', r.uid)}>Reject</button>` : ''}${req && r.reqStatus == 'Approved' ? `<button class="mini ok" ${onClick('reqReceive', r.uid)}>Receive</button>` : ''}${(req && !['Cleared', 'Rejected'].includes(r.reqStatus) && !pend) || (r.flag && !r.cleared) ? `<button class="mini" ${onClick('moveClear', r.uid)}>Clear</button>` : ''}${canUndo(r) ? `<button class="mini" ${onClick('moveUndo', r.uid)} title="Undo for ${UNDO_MIN} minutes after">Undo</button>` : ''}<button class="mini" ${onClick('viewItem', r.pid)}>View</button>${can('manage') ? `<button class="mini del" ${onClick('moveDel', r.uid)} aria-label="Delete entry">&times;</button>` : ''}</div></td></tr>`;
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
  toast('Approved: ' + r.pref + ' is now order ' + r.ord + '. Use Receive when it arrives.');
}
export function reqReject(u) {
  if (!need('money', 'Rejecting requests')) return;
  const r = byUid(u);
  if (!r) return;
  const was = { reqStatus: r.reqStatus, flag: r.flag };
  r.reqStatus = 'Rejected';
  r.flag = false;
  audit('Request rejected', r.item, r.ord);
  store();
  render();
  toast('Request ' + (r.ord || '') + ' rejected', {
    action: {
      label: 'Undo',
      run: () => {
        Object.assign(r, was);
        audit('Request rejection undone', r.item, r.ord);
        store();
        render();
      },
    },
  });
}
export function reqReceive(u) {
  const r = byUid(u);
  if (!r) return;
  stockForm('add', r.pid, { qty: r.qty, fromReq: u });
}
export function moveClear(u) {
  const r = byUid(u);
  if (!r) return;
  const was = { cleared: r.cleared, flag: r.flag, reqStatus: r.reqStatus };
  r.cleared = true;
  r.flag = false;
  if (r.type == 'request' && r.reqStatus != 'Pending') r.reqStatus = 'Cleared';
  audit('Movement cleared', r.item, r.ord || r.type);
  store();
  render();
  toast(was.flag ? 'Alert cleared' : 'Cleared', {
    action: {
      label: 'Undo',
      run: () => {
        Object.assign(r, was);
        store();
        render();
      },
    },
  });
}
/* what belongs to the product rather than to one movement (carried over when the newest movement is deleted) */
const PRODUCT_KEYS = [
  'item',
  'desc',
  'stock',
  'unit',
  'length',
  'cInName',
  'cIn',
  'cOutName',
  'cOut',
  'cost',
  'location',
  'group',
  'area',
  'barcode',
  'supplier',
  'reorder',
  'reorderQty',
  'lead',
  'notes',
  'qc',
  'cond',
  'damaged',
  'batch',
  'expiry',
  'coshh',
  'qcNote',
  'lastCount',
  'countedAt',
  'countedBy',
];
export function moveDel(u) {
  if (!need('manage', 'Deleting history')) return;
  const r = byUid(u);
  if (!r) return;
  askYes(
    'Delete this entry?',
    'Stock levels are not changed.',
    'Delete entry',
    () => {
      /* a product is its newest history row, so deleting that row must not take the product (or its stock) with
         it: the row before it takes over the product's details, or, if it was the only row, it stays as the
         product's starting record (hidden from the history) */
      const rows = prodRows(r.pid),
        at = state.items.indexOf(r),
        keep = { ...r },
        nx = rows[0] === r && rows.length > 1 ? rows[1] : null,
        nxWas = nx ? { ...nx } : null;
      if (rows.length == 1) {
        Object.assign(r, { type: 'import', qty: 0, flag: false, cleared: true, note: 'History entry deleted' });
        ['ord', 'pref', 'reqStatus'].forEach((k) => delete r[k]);
      } else {
        if (nx) PRODUCT_KEYS.forEach((k) => (k in r ? (nx[k] = r[k]) : delete nx[k]));
        state.items = state.items.filter((x) => x !== r);
      }
      audit('Movement deleted', r.item, keep.type + ' ' + keep.qty + (keep.ord ? ' ' + keep.ord : ''));
      store();
      render();
      toast('Entry deleted', {
        action: {
          label: 'Undo',
          run: () => {
            if (rows.length == 1) {
              Object.keys(r).forEach((k) => delete r[k]);
              Object.assign(r, keep);
            } else {
              if (nx) {
                Object.keys(nx).forEach((k) => delete nx[k]);
                Object.assign(nx, nxWas);
              }
              if (!state.items.includes(r)) state.items.splice(Math.max(0, at), 0, r);
            }
            audit('Movement put back', keep.item, keep.type + ' ' + keep.qty);
            store();
            render();
          },
        },
      });
    },
    true
  );
}
/** undo a recent movement: in/out gets a matching movement the other way, a pending request is cancelled */
export function moveUndo(u) {
  const r = byUid(u);
  if (!canUndo(r)) return toast('This can only be undone for ' + UNDO_MIN + ' minutes');
  askYes(
    'Undo this ' + (r.type == 'request' ? 'request' : r.type == 'add' ? 'stock in' : 'stock out') + '?',
    r.qty +
      ' ' +
      unitOf(r) +
      ' of ' +
      r.item +
      ', by ' +
      r.user +
      ' at ' +
      r.time +
      '. Your name goes in the audit log.',
    'Undo',
    () => {
      r.undone = { by: USER, at: Date.now() };
      r.flag = false;
      if (r.type == 'request') r.reqStatus = 'Cancelled';
      else {
        const p = prod(r.pid),
          cur = p ? +p.stock || 0 : 0,
          back = r.type == 'add' ? 'remove' : 'add',
          st = back == 'add' ? cur + r.qty : Math.max(0, cur - r.qty);
        state.items.unshift(
          moveRow(p || r, back, r.qty, st, {
            note: 'Undo of ' + r.type + ' by ' + r.user + ' at ' + r.time,
            undoOf: r.uid,
          })
        );
      }
      audit(
        'Stock movement undone',
        r.item,
        r.type + ' ' + r.qty + ' by ' + r.user + ' at ' + r.time + (r.ord ? ' ' + r.ord : '')
      );
      store();
      render();
      toast('Undone');
    }
  );
}
export function invSelClear() {
  SEL.clear();
  render();
}
