/* features/stock/item-window: The product window: adding, removing, requesting and editing stock. */
import { MAX_PHOTOS, UNITS } from '../../config/constants.js';
import { today } from '../../core/dates.js';
import { onClick } from '../../core/actions.js';
import { $, $$, esc } from '../../core/dom.js';
import { m0, money } from '../../core/format.js';
import { ICONS, svg } from '../../core/icons.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import {
  CONDITIONS,
  QC_STATUS,
  byUid,
  colTxt,
  hasLoc,
  ikey,
  moveRow,
  nextOrd,
  normCode,
  prod,
  prodRows,
  products,
  ro,
  stkId,
  stt,
  unitOf,
} from '../../domain/stock.js';
import { can } from '../../domain/permissions.js';
import { need } from '../auth/session.js';
import { SEL, pphotos } from './stock.js';
import { SUPN } from '../suppliers/suppliers.js';
import { pickC } from '../../ui/forms/colour-picker.js';
import { fieldErr, fieldH, readFields } from '../../ui/forms/form.js';
import { gallery, setPhotoList, tmp } from '../../ui/forms/photos.js';
import { askIn, askYes, closeModal, openModal } from '../../ui/modal.js';
import { go, render, view } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';

/* ---------------- one wide item window for Edit, Add, Remove and Request ---------------- */
export let ieIdx = 0,
  ieKey = null,
  ieMode = 'edit',
  iePre = {};
export function stockForm(kind, k, pre) {
  itemWindow(kind, k, pre);
}
export function editItem(k) {
  itemWindow('edit', k);
}
export function ieFields() {
  const Ad = can('money'),
    Own = can('manage'),
    ed = ieMode == 'edit',
    r = (ieKey && prod(ieKey)) || {};
  return [
    /* Product: Stock ID | Item code | Unit, then Qty | Barcode | Length (length sits under unit) */
    {
      k: 'pid',
      l: ed && Own && !ieView ? 'Stock ID (admin override, must be unique)' : 'Stock ID',
      ro: !(ed && Own) && ieMode != 'remove',
      req: ieMode != 'remove',
      max: 24,
      sec: 'p',
      ...(ieMode == 'remove' ? { ph: 'Type or scan', scan: 1 } : {}),
    },
    {
      k: 'item',
      l: 'Item code',
      scan: ieMode != 'edit',
      ro: ed && !Ad,
      req: 1,
      max: 64,
      list: 'itemCodes',
      sec: 'p',
      hint: ed && !Ad ? 'Only an admin can rename' : '',
    },
    {
      k: 'desc',
      l: 'Description',
      max: 160,
      w: 'full',
      sec: 'p',
      ph: 'What it is, as on the count sheet',
      ro: ieMode == 'remove',
    },
    { k: 'unit', l: 'Unit', t: 'select', o: UNITS, sec: 'p', ro: ieMode == 'remove' },
    ed
      ? { k: 'stock', l: 'Current stock', t: 'number', max: 1e7, sec: 'p', hint: 'Changing this logs an adjustment' }
      : { k: 'qty', l: 'Quantity', t: 'number', req: 1, pos: 1, max: 1e6, sec: 'p' },
    { k: 'barcode', l: 'Barcode', max: 64, sec: 'p' },
    { k: 'length', l: lenBox(unitOf(r)).l, max: 30, sec: 'p', ph: lenBox(unitOf(r)).ph },
    { k: 'cInName', l: 'Colour in (B)', t: 'colour', w: 'full', sec: 'c' },
    { k: 'cOutName', l: 'Colour out (A)', t: 'colour', w: 'full', sec: 'c' },
    ...(ieMode != 'remove'
      ? [
          {
            k: 'reorder',
            l: 'Reorder level',
            t: 'number',
            max: 1e6,
            dp: 0,
            sec: 'o',
            hint: '0 = no low-stock warning',
          },
          { k: 'reorderQty', l: 'Reorder quantity', t: 'number', max: 1e6, dp: 0, sec: 'o' },
          { k: 'lead', l: 'Lead time (days)', t: 'number', max: 365, dp: 0, sec: 'o' },
        ]
      : []),
    ...(ieMode == 'add' || (ed && Ad)
      ? [
          {
            k: 'cost',
            l: 'Cost each (£)',
            t: 'number',
            max: 1e6,
            sec: 'o',
            hint: ieMode == 'add' && r.pid ? 'Leave at 0 to keep the current cost' : '',
          },
        ]
      : []),
    { k: 'location', l: 'Location (Bay, Bin, Shelf, Rack)', list: 'locs', max: 60, sec: 'l', ro: ieMode == 'remove' },
    { k: 'area', l: 'Stock-take area', list: 'areas', max: 40, sec: 'l', hint: 'The count sheet it is on' },
    ...(ieMode == 'remove'
      ? [{ k: 'supplier', l: 'Supplier', ro: 1, sec: 'l' }]
      : [{ k: 'supplier', l: 'Supplier', t: 'select', o: SUPN(r.supplier), req: ieMode == 'add' && !r.pid, sec: 'l' }]),
    ...(ieMode == 'edit' || ieMode == 'add'
      ? [
          { k: 'qc', l: 'QC status', t: 'select', o: QC_STATUS, sec: 'q' },
          { k: 'cond', l: 'Condition', t: 'select', o: CONDITIONS, sec: 'q' },
          { k: 'damaged', l: 'Damaged / unusable qty', t: 'number', max: 1e6, dp: 0, sec: 'q' },
          { k: 'batch', l: 'Batch / lot number', max: 40, sec: 'q' },
          { k: 'expiry', l: 'Use by / expiry', t: 'date', sec: 'q' },
          { k: 'coshh', l: 'Hazardous (COSHH)', t: 'select', o: ['', 'No', 'Yes'], sec: 'q' },
          { k: 'qcNote', l: 'QC notes', w: 'full', max: 200, sec: 'q' },
        ]
      : []),
    ...(ieMode == 'request'
      ? [{ k: 'note', l: 'Needed for (job, reason)', w: 'full', max: 160, sec: 'n' }]
      : [{ k: 'notes', l: ed ? 'Notes' : 'Product notes', t: 'area', w: 'full', sec: 'n' }]),
  ];
}
export let ieView = false;
export function itemWindow(mode, k, pre) {
  const view = (ieView = mode == 'view');
  if (view) mode = 'edit';
  const r = (k && prod(k)) || null;
  if (mode == 'edit' && !r) return;
  ieMode = mode;
  ieKey = r ? r.pid : null;
  iePre = pre || {};
  ieIdx = 0;
  setPhotoList(r ? pphotos(r.pid).slice() : [], ieDraw);
  const ed = mode == 'edit',
    clean = (x) => (x && x != '-' ? x : '');
  const v = r
    ? {
        ...r,
        length: clean(r.length),
        cInName: clean(r.cInName),
        cOutName: clean(r.cOutName),
        location: hasLoc(r) ? r.location : '',
        unit: unitOf(r),
        reorder: ro(r),
        qty: iePre.qty || 1,
        cost: ed ? r.cost : 0,
        barcode: r.barcode || r.item,
        notes: r.notes || '',
      }
    : {
        pid: mode == 'remove' ? '' : stkId(),
        item: '',
        unit: 'Each',
        qty: 1,
        length: '',
        cInName: '',
        cOutName: '',
        cIn: '',
        cOut: '',
        reorder: 0,
        cost: 0,
        location: '',
        supplier: '',
        barcode: '',
      };
  const F = ieFields(),
    sec = (t, s, cls) => {
      const L = F.filter((f) => f.sec == s);
      return L.length
        ? `<fieldset><legend>${t}</legend><div class="grid ${cls || ''}">${L.map((f) => fieldH(f, v)).join('')}</div></fieldset>`
        : '';
    };
  const T = {
      edit: (view ? '' : 'Edit ') + (r ? r.item : ''),
      add: 'Add Stock',
      remove: 'Remove Stock',
      request: 'Request Stock',
    }[mode],
    B = { edit: 'Save changes', add: 'Add stock', remove: 'Remove stock', request: 'Send request' }[mode];
  const s = r ? stt(r) : null;
  openModal(
    `<div class="ie-h"><div><h2>${esc(T)}</h2><span class="muted" id="ieSub">${r ? `Stock ID ${esc(r.pid)} · ${prodRows(r.pid).filter((x) => x.type != 'import').length} movements · <span class="tag ${s[1]}">${s[0]}</span>` : mode == 'remove' ? 'Type or scan the Stock ID or item code, then pick the product' : 'New product: a Stock ID is given automatically'}</span>${!r && mode == 'remove' ? '<div class="ie-pick" id="iePick"></div>' : ''}</div><button class="mx" data-act="closeModal" aria-label="Close">&times;</button></div>
  <div class="ie"><div class="ie-ph"><div class="ie-main" id="ieMain"></div><div class="ie-strip" id="ieStrip"></div>
     <div class="prow"><label class="btn ghost sm">${svg(ICONS.photo)}Take photo<input type="file" accept="image/*" capture="environment" hidden data-onchange="addPh" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]"></label><label class="btn ghost sm">Upload photos<input type="file" accept="image/*" multiple hidden data-onchange="addPh" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]"></label><span class="muted" style="align-self:center;font-size:.75rem">Up to ${MAX_PHOTOS}, resized automatically</span></div>
     <div class="ie-stats" id="ieStats"></div></div>
   <div class="ie-f">${sec('Product', 'p', 'ie-prod')}${sec('Colours', 'c')}${sec('Stock And Ordering', 'o')}${sec('Location And Supplier', 'l')}${sec('Quality Check', 'q')}${sec(mode == 'request' ? 'Request' : 'Notes', 'n')}</div></div>
  ${view ? `<div class="mact"><button class="btn ghost" ${onClick('reportProd', r.pid)}>Report</button><button class="btn ghost" ${onClick('stockForm', 'request', r.pid)}>Request stock</button><button class="btn ghost" data-act="closeModal">Close</button><button class="btn" ${onClick('itemWindow', 'edit', r.pid)}>Edit</button>` : `<div class="mact">${ed && can('manage') ? `<button class="btn ghost l" style="color:var(--red)" ${onClick('delProduct', r.pid)}>Delete product</button>` : ''}${r ? `<button class="btn ghost" ${onClick('reportProd', r.pid)}>Report</button>` : ''}<button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn ${mode == 'remove' ? 'red' : mode == 'add' ? 'green' : ''}" data-act="ieSave">${B}</button>`}</div>`,
    'xl'
  );
  ieDraw();
  ieStats();
  bcDeco({ diff: !!(r && r.barcode && r.barcode != r.item), val: r ? r.barcode || '' : '' });
  /* the Length box follows the unit (metres, pieces per pack, or a size) */
  const un = $('#f_unit');
  if (un) {
    un.addEventListener('change', lenSync);
    lenSync();
  }
  /* Remove Stock: a Stock ID typed or scanned picks that product */
  const pidBox = $('#f_pid');
  if (mode == 'remove' && !r && pidBox)
    pidBox.addEventListener('input', () => {
      const v = normCode(pidBox.value),
        x = v && products().find((p) => normCode(p.pid) == v);
      if (x && x.pid != ieKey) iePickProd(x.pid);
      else if (!x && v) removePick(null, '', 'No product has Stock ID ' + pidBox.value.trim());
    });
  if (view) {
    const b = $('#mbox');
    b.classList.add('ie-view');
    b.querySelectorAll('.ie-f input,.ie-f select,.ie-f textarea,.ie-f button,.ie-ph .prow input').forEach(
      (e) => (e.disabled = true)
    );
    const mv = prodRows(r.pid)
      .filter((x) => x.type != 'import')
      .slice(0, 6);
    $('#mbox .ie-f').insertAdjacentHTML(
      'beforeend',
      `<fieldset><legend>Recent Movements</legend>${mv.map((x) => `<div class="row"><span><span class="tag ${x.type == 'add' ? 'g' : x.type == 'remove' ? 'r' : 'y'}">${esc(x.type == 'add' ? 'In' : x.type == 'remove' ? 'Out' : 'Request')}</span> ${x.qty} ${esc(unitOf(x))} by ${esc(x.user)}</span><span class="muted">${esc(x.time)}</span></div>`).join('') || '<p class="empty">No movements yet.</p>'}</fieldset>`
    );
  }
  if (!ed) {
    const sync = () => {
      const g = (i) => ($('#f_' + i) || {}).value || '',
        ex = state.items.find(
          (x) =>
            ikey(x) ==
            ikey({
              item: g('item'),
              length: g('length'),
              cInName: g('cInName'),
              cOutName: g('cOutName'),
              area: g('area'),
            })
        );
      $('#f_pid').value = ex ? ex.pid : ieMode == 'remove' ? '' : stkId();
      if (ieMode == 'remove') removePick(ex, g('item'));
      if (ex && ex.pid != ieKey) {
        ieKey = ex.pid;
        $('#f_unit').value = unitOf(ex);
        if (!tmp.length) {
          setPhotoList(pphotos(ex.pid).slice(), ieDraw);
          ieDraw();
        }
      } else if (!ex) ieKey = null;
      ieStats();
    };
    ['item', 'length', 'cInName', 'cOutName', 'area'].forEach((i) => {
      const e = $('#f_' + i);
      e && ['input', 'change'].forEach((t) => e.addEventListener(t, sync));
    });
    $$('#mbox .sws button').forEach((b) => b.addEventListener('click', () => setTimeout(sync)));
  }
}
export function ieStats() {
  const el = $('#ieStats');
  if (!el) return;
  const r = ieKey && prod(ieKey);
  el.innerHTML = r
    ? `<div><small>In Stock</small><b>${r.stock} ${esc(unitOf(r))}</b></div><div><small>Reorder At</small><b>${ro(r)}</b></div><div><small>${can('money') ? 'Stock Value' : 'Cost Each'}</small><b>${can('money') ? m0(r.stock * r.cost) : money(r.cost)}</b></div>`
    : ieMode == 'remove'
      ? `<div style="grid-column:1/-1"><small>Remove Stock</small><b>Pick a product first</b></div>`
      : `<div style="grid-column:1/-1"><small>New Product</small><b>Not in stock yet</b></div>`;
}
export function ieDraw() {
  const m = $('#ieMain'),
    s = $('#ieStrip');
  if (!m) return;
  ieIdx = Math.min(ieIdx, Math.max(0, tmp.length - 1));
  m.innerHTML = tmp.length
    ? `<img src="${SAFE.img(tmp[ieIdx])}" alt="Product photo ${ieIdx + 1}">`
    : `<div class="empty">${svg(ICONS.photo)}No photos yet.<br>Take or upload a photo of this product.</div>`;
  s.innerHTML = tmp
    .map(
      (p, i) =>
        `<div class="th ${i == ieIdx ? 'on' : ''}"><img src="${SAFE.img(p)}" alt="Photo ${i + 1}" ${onClick('ieSel', i)}><button type="button" aria-label="Remove photo" ${onClick('rmPh', i)}>&times;</button></div>`
    )
    .join('');
}
export function ieSel(i) {
  ieIdx = i;
  ieDraw();
}
export function iePhotos(pid) {
  if (!tmp) return;
  const a = tmp.filter(SAFE.img).slice(0, MAX_PHOTOS);
  if (a.length) state.pphotos[pid] = a;
  else delete state.pphotos[pid];
}
export function ieSave() {
  const mode = ieMode,
    o = readFields(ieFields());
  if (!o) return;
  o.item = SAFE.code(o.item);
  if (mode != 'remove' && mode != 'request') {
    const lb = lenBox(o.unit);
    const was = ieKey && prod(ieKey) ? String(prod(ieKey).length || '') : '';
    if (o.length && o.length != was && lb.re && !lb.re.test(o.length.trim())) {
      fieldErr($('#f_length'), lb.err);
      return;
    }
  }
  if (!o.item) {
    toast('Item code can use letters, numbers, spaces, dots, dashes and slashes');
    return;
  }
  const bc = $('#bcx') && $('#bcx').checked ? SAFE.code(o.barcode) : '';
  if (mode == 'edit') {
    const k = ieKey,
      r = prod(k),
      Ad = can('money'),
      Own = can('manage');
    if (!r) return;
    const np = Own ? SAFE.text(o.pid, 24) : r.pid;
    if (np != r.pid && !/^[\w.-]{1,24}$/.test(np)) {
      toast('Stock ID can use letters, numbers, dots and dashes only');
      return;
    }
    if (np != r.pid && state.items.some((x) => x.pid == np)) {
      toast('Stock ID ' + np + ' is already used');
      return;
    }
    const nm = Ad ? o.item : r.item,
      probe = {
        item: nm,
        length: o.length || '-',
        cInName: o.cInName || '-',
        cOutName: o.cOutName || '-',
        area: o.area,
      };
    if (state.items.some((x) => x.pid != k && ikey(x) == ikey(probe))) {
      toast('Another product already has this item code, length and colours');
      return;
    }
    const changed = o.stock != r.stock;
    const upd = {
      pid: np,
      item: nm,
      unit: o.unit,
      length: o.length || '-',
      cInName: o.cInName || '-',
      cIn: o.cInNameHex,
      cOutName: o.cOutName || '-',
      cOut: o.cOutNameHex,
      reorder: o.reorder,
      reorderQty: o.reorderQty || undefined,
      lead: o.lead || undefined,
      location: o.location || '-',
      supplier: o.supplier,
      barcode: bc,
      notes: o.notes,
      ...qcFields(o, r),
      ...(Ad ? { cost: o.cost } : {}),
    };
    prodRows(k).forEach((x) => Object.assign(x, upd));
    if (changed)
      state.items.unshift(
        moveRow(prod(np), o.stock > r.stock ? 'add' : 'remove', Math.abs(o.stock - r.stock), o.stock, {
          note: 'Stock adjusted in editor',
        })
      );
    iePhotos(np);
    if (np != k) delete state.pphotos[k];
    if (SEL.has(k) && np != k) {
      SEL.delete(k);
      SEL.add(np);
    }
    audit(
      'Product edited',
      nm,
      (np != k ? 'ID ' + k + ' to ' + np + '. ' : '') + (changed ? 'Stock ' + r.stock + ' to ' + o.stock : '')
    );
    store();
    closeModal();
    render();
    toast(nm + ' saved');
    return;
  }
  /* add / remove / request */
  const kind = mode,
    ex = state.items.find((x) => ikey(x) == ikey(o)),
    pid = ex ? ex.pid : stkId(),
    cur = ex ? ex.stock : 0;
  if (kind == 'remove' && !ex) {
    toast('Pick the product to take stock from: nothing matches this code, length, colours and area');
    return;
  }
  if (kind == 'add' && !ex && !o.supplier) {
    toast('Pick a supplier for a new product');
    return;
  }
  if (kind == 'remove' && o.qty > cur) {
    askIn('Only ' + cur + ' in stock', 'Remove all ' + cur + ' instead?', 'Remove ' + cur, () => {
      const q = $('#f_qty');
      if (q) {
        q.value = cur;
        ieSave();
      }
    });
    return;
  }
  const st = kind == 'add' ? cur + o.qty : kind == 'remove' ? Math.max(0, cur - o.qty) : cur;
  const base = {
    pid,
    item: o.item,
    unit: o.unit,
    length: o.length || '-',
    cInName: o.cInName || '-',
    cIn: o.cInNameHex,
    cOutName: o.cOutName || '-',
    cOut: o.cOutNameHex,
    cost: o.cost || (ex ? ex.cost : 0),
    location: o.location || (ex ? ex.location : '-'),
    barcode: bc || (ex ? ex.barcode : ''),
    supplier: o.supplier || (ex ? ex.supplier : ''),
    reorder: o.reorder != null && kind != 'remove' ? o.reorder : ex ? ex.reorder : 0,
    lead: o.lead || (ex ? ex.lead : undefined),
    reorderQty: o.reorderQty || (ex && ex.reorderQty),
    notes: o.notes || (ex && ex.notes),
    ...mergeQc(o, ex),
  };
  if (kind == 'add')
    prodRows(pid).forEach((x) => {
      if (kind == 'add') Object.assign(x, mergeQc(o, x));
      ['supplier', 'location', 'unit', 'lead', 'reorderQty', 'notes'].forEach((f) => {
        if (o[f]) x[f] = o[f];
      });
      if (kind == 'add') {
        x.reorder = base.reorder;
        if (o.cost) x.cost = o.cost;
      }
      if (bc) x.barcode = bc;
    });
  const row = moveRow(
    base,
    kind,
    o.qty,
    st,
    kind == 'request' ? { reqStatus: 'Pending', ord: nextOrd('P'), note: o.note } : {}
  );
  state.items.unshift(row);
  iePhotos(pid);
  if (iePre.fromReq) {
    const q = byUid(iePre.fromReq);
    if (q) {
      q.reqStatus = 'Cleared';
      q.cleared = true;
      q.receivedAt = Date.now();
    }
  }
  audit(
    { add: 'Stock added', remove: 'Stock removed', request: 'Stock requested' }[kind],
    o.item,
    o.qty + ' ' + o.unit + (row.ord ? ' ' + row.ord : '') + ' (stock ' + st + ')'
  );
  store();
  closeModal();
  render();
  toast(
    kind == 'request'
      ? 'Request ' + row.ord + ' sent for approval'
      : kind == 'add'
        ? 'Added ' + o.qty + ' ' + o.unit + ', now ' + st
        : 'Removed ' + o.qty + ' ' + o.unit + ', now ' + st
  );
}
/* barcode follows the item code unless "use a different barcode" is ticked */
/* description, area and quality-check details from the form; QC stamps who checked and when */
const QCK = ['desc', 'area', 'qc', 'cond', 'damaged', 'batch', 'expiry', 'coshh', 'qcNote'];
/* add / remove / request: boxes left empty keep what the product already has */
function mergeQc(o, was) {
  const n = qcFields(o, was || {}),
    out = {};
  [...QCK, 'qcBy', 'qcAt'].forEach((k) => {
    const v = n[k] !== '' && n[k] !== 0 && n[k] != null ? n[k] : was ? was[k] : undefined;
    if (v !== undefined) out[k] = v;
  });
  return out;
}
function qcFields(o, was) {
  const n = {
    desc: SAFE.text(o.desc, 160),
    area: SAFE.text(o.area, 40),
    qc: o.qc || '',
    cond: o.cond || '',
    damaged: +o.damaged || 0,
    batch: SAFE.text(o.batch, 40),
    expiry: SAFE.date(o.expiry),
    coshh: o.coshh || '',
    qcNote: SAFE.text(o.qcNote, 200),
  };
  const qcChanged = ['qc', 'cond', 'damaged', 'qcNote'].some((k) => String(n[k] || '') != String((was || {})[k] || ''));
  if (qcChanged && (n.qc || n.cond || n.damaged || n.qcNote)) Object.assign(n, { qcBy: USER, qcAt: today() });
  return n;
}
export function bcDeco(o) {
  const bc = $('#f_barcode');
  if (!bc || $('#bcx')) return;
  const it = $('#f_item'),
    ff = bc.closest('.ff'),
    lab = document.createElement('label');
  lab.className = 'cbl';
  lab.innerHTML = '<input type="checkbox" id="bcx"> Use a different barcode';
  ff.appendChild(lab);
  const cx = $('#bcx');
  const sync = () => {
    if (cx.checked) {
      bc.readOnly = false;
    } else {
      bc.readOnly = true;
      bc.value = it ? it.value.trim() : '';
    }
  };
  cx.checked = !!o.diff;
  if (o.diff) bc.value = o.val;
  cx.onchange = () => {
    if (cx.checked) {
      bc.value = o.val || '';
      bc.focus();
    }
    sync();
  };
  if (it) it.addEventListener('input', sync);
  sync();
}
export function delProduct(k) {
  if (!need('manage', 'Deleting products')) return;
  const r = prod(k);
  if (!r) return;
  askYes(
    'Delete ' + r.item + '?',
    'All of its stock history goes too. This cannot be undone.',
    'Delete product',
    () => {
      state.items = state.items.filter((x) => x.pid != k);
      delete state.pphotos[k];
      SEL.delete(k);
      audit('Product deleted', r.item, 'ID ' + k);
      store();
      render();
    },
    true
  );
}
/* ---------------- view item ---------------- */
export function viewItem(k) {
  itemWindow('view', k);
}
/* ---------------- scanner result ---------------- */
export function found(code, pv) {
  const c = code.toLowerCase(),
    vs = products().filter((x) => x.item.toLowerCase() == c || (x.barcode || '').toLowerCase() == c);
  if (vs.length > 1 && !pv) {
    openModal(
      `<h2>${esc(code)}: Pick A Variant</h2>${vs.map((x) => `<div class="row"><span><b>${esc(x.desc || x.item)}</b><br>${esc([colTxt(x), x.length, x.area].filter((v) => v && v != '-').join(' · '))}<br><span class="muted">${x.stock} ${esc(unitOf(x))} in stock &middot; ID ${esc(x.pid)}</span></span><button class="mini pri" ${onClick('found', code, x.pid)}>Open</button></div>`).join('')}<div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button></div>`
    );
    return;
  }
  const r = pv ? prod(pv) : vs[0];
  if (!r) {
    openModal(
      `<h2>No Match For ${esc(code)}</h2><p class="muted">This code isn't in inventory yet.</p><div class="mact col"><button class="btn green" ${onClick('newFromCode', code)}>Add as new item</button><button class="btn ghost" data-act="closeModal">Cancel</button></div>`
    );
    return;
  }
  const k = r.pid;
  openModal(
    `<h2>${esc(r.item)}</h2><p class="muted">${r.stock} ${esc(unitOf(r))} in stock at ${esc(hasLoc(r) ? r.location : 'no location')}.${can('money') ? ' ' + money(r.cost) + ' each.' : ''}</p>${gallery(pphotos(k).slice(0, 3))}<div class="mact col"><button class="btn green" ${onClick('stockForm', 'add', k)}>Add stock</button><button class="btn red" ${onClick('stockForm', 'remove', k)}>Remove stock</button><button class="btn" ${onClick('stockForm', 'request', k)}>Request item</button><button class="btn ghost" ${onClick('editItem', k)}>Edit item and photos</button></div>`
  );
}
export function newFromCode(c) {
  if (view != 'stock') go('stock');
  stockForm('add');
  const e = $('#f_item');
  if (e) {
    e.value = SAFE.code(c);
    e.dispatchEvent(new Event('input'));
  }
}

/* Remove Stock started without a product: the products with this code are offered to pick from,
   and picking one fills in its length, colours and area. Removing never makes a new product. */
function removePick(ex, code, msg) {
  const el = $('#iePick');
  if (!el) return;
  const c = normCode(code),
    L = c ? products().filter((p) => normCode(p.item) == c || normCode(p.pid) == c) : [];
  if (!ex && L.length == 1 && !el.dataset.auto) {
    el.dataset.auto = '1';
    return iePickProd(L[0].pid);
  }
  if (ex) {
    ['desc', 'location', 'barcode'].forEach((k) => {
      const e = $('#f_' + k);
      if (e) e.value = k == 'location' ? (hasLoc(ex) ? ex.location : '') : ex[k] || '';
    });
    const sp = $('#f_supplier');
    if (sp) sp.value = ex.supplier || '';
  }
  const h = ex
    ? `<span class="tag g">${esc(ex.item)} picked: ${esc(String(ex.stock))} ${esc(unitOf(ex))} in stock</span>`
    : L.length
      ? `<b>Pick the product</b>${L.slice(0, 12)
          .map(
            (p) =>
              `<button type="button" class="mini" ${onClick('iePickProd', p.pid)}>${esc(p.item)}${p.desc ? ' · ' + esc(p.desc) : ''}${p.length && p.length != '-' ? ' · ' + esc(p.length) : ''}${colTxt(p) != '-' ? ' · ' + esc(colTxt(p)) : ''}${p.area ? ' · ' + esc(p.area) : ''} (${esc(String(p.stock))})</button>`
          )
          .join('')}`
      : msg || c
        ? `<span class="muted">${esc(msg || 'No product has this code')}</span>`
        : '';
  /* leaving the code box redraws this; keep the same buttons so a click on one is not lost */
  if (el.dataset.h != h) {
    el.dataset.h = h;
    el.innerHTML = h;
  }
}
export function iePickProd(pid) {
  const r = prod(pid);
  if (!r || ieMode != 'remove') return;
  const clean = (x) => (x && x != '-' ? x : '');
  [
    ['item', r.item],
    ['length', clean(r.length)],
    ['area', r.area || ''],
  ].forEach(([k, v]) => {
    const e = $('#f_' + k);
    if (e) e.value = v;
  });
  pickC('cInName', clean(r.cInName), r.cIn || '#8a8a8a');
  pickC('cOutName', clean(r.cOutName), r.cOut || '#8a8a8a');
  $('#f_item').dispatchEvent(new Event('input'));
}

/* the Length box for each unit: Meters is a number of metres, PCS the pieces in a pack, and Each,
   Units, Pair or Single how many come in one. The value is stored as typed, so products match;
   an older value (e.g. a size like 4-5MM) is only checked once someone changes it. */
export function lenBox(unit) {
  if (unit == 'Meters (M)')
    return {
      l: 'Length (m)',
      mode: 'decimal',
      re: /^\d+(\.\d+)?\s*m?$/i,
      err: 'Length in metres, as a number (e.g. 6.5)',
    };
  if (unit == 'PCS')
    return { l: 'Pieces per pack', ph: '', mode: 'numeric', re: /^\d+$/, err: 'Pieces per pack, as a whole number' };
  /* Each, Units, Pair, Single: how many come in one */
  return {
    l: 'Qty (how many in one)',
    ph: '',
    mode: 'numeric',
    re: /^\d+$/,
    err: 'How many in one, as a whole number',
  };
}
export function lenSync() {
  const u = $('#f_unit'),
    e = $('#f_length'),
    lab = $('label[for=f_length]');
  if (!u || !e) return;
  const b = lenBox(u.value);
  if (lab) lab.textContent = b.l;
  e.placeholder = b.ph;
  e.inputMode = b.mode;
}
