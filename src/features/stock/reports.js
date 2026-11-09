/* features/stock/reports: Stock reports and labels. */
import { onClick } from '../../core/actions.js';
import { today } from '../../core/dates.js';
import { $, esc } from '../../core/dom.js';
import { grp, money, sum } from '../../core/format.js';
import { state } from '../../data/state.js';
import { pphotos } from './stock.js';
import { colTxt, hasLoc, isLow, isMove, key, prodRows, products, ro, stt, unitOf } from '../../domain/stock.js';
import { can } from '../../domain/permissions.js';
import { SEL } from './stock.js';
import { c39, printDoc } from '../../print/print.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

/* ---------------- stock reports ---------------- */
export function reportProd(k) {
  const rows = prodRows(k);
  if (!rows.length) return;
  const r = rows[0],
    Ad = can('money'),
    sp = state.suppliers.find((s) => s.name == r.supplier) || {},
    bc = r.barcode || r.item,
    [sl] = stt(r),
    u = unitOf(r);
  const ins = sum(
      rows.filter((x) => x.type == 'add'),
      (x) => x.qty
    ),
    outs = sum(
      rows.filter((x) => x.type == 'remove'),
      (x) => x.qty
    ),
    reqs = rows.filter((x) => x.type == 'request');
  printDoc(
    r.item,
    [r.length, colTxt(r)].filter((x) => x && x != '-').join(', '),
    [
      ['Item Code', r.item],
      ['Stock ID', r.pid],
      ['Unit', u],
      ['Length', r.length],
      ['Colour In (B)', r.cInName],
      ['Colour Out (A)', r.cOutName],
      ['Location', hasLoc(r) ? r.location : 'Not set'],
      ['Supplier', r.supplier || 'Not set'],
      ['Supplier Contact', [sp.contact, sp.phone, sp.email].filter(Boolean).join(', ') || '-'],
      ['Reorder Level', ro(r)],
      ['Reorder Quantity', r.reorderQty || '-'],
      ['Lead Time', r.lead ? r.lead + ' days' : '-'],
      ['Total Added', ins + ' ' + u],
      ['Total Removed', outs + ' ' + u],
      ...(Ad ? [['Cost Each', money(r.cost)]] : []),
      ['Notes', r.notes || '-'],
    ],
    pphotos(k),
    {
      kind: 'Stock Report',
      ref: 'STK-' + r.pid,
      sign: true,
      barcode: bc,
      kpis: [
        ['In Stock', r.stock + ' ' + u],
        ['Status', sl == 'OK' ? 'In Stock' : sl == 'Low' ? 'Reorder Now' : 'Out Of Stock'],
        ...(Ad ? [['Stock Value', money(r.stock * r.cost)]] : []),
        ['Movements', rows.length],
      ],
      tables: [
        {
          t: 'Movement History',
          h: ['Time', 'Type', 'Order No.', 'User', 'Qty', 'Stock After'],
          r: rows
            .filter((x) => x.type != 'request')
            .slice(0, 25)
            .map((x) => [x.time, x.type, '-', x.user, x.qty, x.stock])
            .concat([]),
        },
        ...(reqs.length
          ? [
              {
                t: 'Requests',
                h: ['Time', 'Order No.', 'Status', 'User', 'Qty', 'Note'],
                r: reqs
                  .slice(0, 15)
                  .map((x) => [
                    x.time,
                    x.ord || '-',
                    x.reqStatus || '-',
                    x.user,
                    x.qty + ' ' + unitOf(x),
                    x.note || '',
                  ]),
              },
            ]
          : []),
      ],
    }
  );
}
export function invRep(k) {
  if (k) {
    reportProd(k);
    return;
  }
  const n = SEL.size;
  openModal(
    `<h2>Inventory Reports</h2><div class="rl">${[
      ['sel', 'Selected Items (' + n + ')', n],
      ['all', 'Full Stock List', 1],
      ['low', 'Low Stock And Reorder', 1],
      ['out', 'Out Of Stock', 1],
      ['sup', 'By Supplier', 1],
      ['loc', 'By Location', 1],
      ['req', 'Stock Requests', 1],
    ]
      .map(([c, t, e]) => `<button class="rb" ${e ? '' : 'disabled'} ${onClick('invRun', c)}><b>${t}</b></button>`)
      .join(
        ''
      )}</div><div class="ff" style="margin-top:.8rem"><label class="cbl"><input type="checkbox" id="rhist" checked> Include movement history</label><label class="cbl"><input type="checkbox" id="rphoto"> Include photos</label></div><div class="mact"><button class="btn ghost" data-act="closeModal">Close</button></div>`
  );
}
export function invRun(sc) {
  const Ad = can('money'),
    P = products().sort((a, b) => a.item.localeCompare(b.item)),
    hist = $('#rhist').checked,
    ph = $('#rphoto').checked,
    ref = 'INV-' + today().replace(/-/g, '') + '-' + sc.toUpperCase();
  let L = P,
    title = 'Stock Report',
    sub = 'Full stock list';
  if (sc == 'sel') {
    L = P.filter((r) => SEL.has(key(r)));
    title = 'Selected Items';
    sub = L.length + ' selected items';
  } else if (sc == 'low') {
    L = P.filter(isLow);
    title = 'Low Stock And Reorder';
    sub = 'Items below their reorder level';
  } else if (sc == 'out') {
    L = P.filter((r) => r.stock <= 0);
    title = 'Out Of Stock';
    sub = 'Items with no stock';
  } else if (sc == 'sup') {
    title = 'Stock By Supplier';
    sub = 'Grouped by supplier';
  } else if (sc == 'loc') {
    title = 'Stock By Location';
    sub = 'Grouped by location';
  }
  closeModal();
  if (sc == 'req') {
    const R = state.items.filter((r) => r.type == 'request');
    printDoc('Stock Requests', 'Pending and approved requests', [], [], {
      kind: 'Stock Report',
      ref,
      sign: true,
      barcode: ref,
      kpis: [
        ['Pending', R.filter((r) => r.reqStatus == 'Pending').length],
        ['Approved', R.filter((r) => r.reqStatus == 'Approved').length],
        ['Rejected', R.filter((r) => r.reqStatus == 'Rejected').length],
      ],
      tables: [
        {
          t: 'Requests',
          h: ['Order No.', 'Status', 'Item', 'Qty', 'Requested by', 'Time', 'Note'],
          r: R.map((r) => [
            r.ord || '-',
            r.reqStatus || '-',
            r.item,
            r.qty + ' ' + unitOf(r),
            r.user,
            r.time,
            r.note || '',
          ]),
        },
      ],
    });
    return;
  }
  const hd = [
      'ID',
      'Item',
      'Length',
      'Colours',
      'Location',
      'Stock',
      'Unit',
      'Reorder',
      'Supplier',
      ...(Ad ? ['Cost', 'Value'] : []),
    ],
    row = (r) => [
      r.pid,
      r.item,
      r.length,
      colTxt(r),
      hasLoc(r) ? r.location : '-',
      r.stock,
      unitOf(r),
      ro(r),
      r.supplier || '-',
      ...(Ad ? [money(r.cost), money(r.stock * r.cost)] : []),
    ];
  const grpT = (f) =>
    grp(L, (r) => f(r) || 'None')
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({
        t:
          k +
          ' (' +
          v.length +
          ' lines, ' +
          sum(v, (r) => r.stock) +
          ' units' +
          (Ad ? ', ' + money(sum(v, (r) => r.stock * r.cost)) : '') +
          ')',
        h: hd,
        r: v.map(row),
      }));
  const tables =
      sc == 'sup'
        ? grpT((r) => r.supplier)
        : sc == 'loc'
          ? grpT((r) => (hasLoc(r) ? r.location : ''))
          : [{ t: 'Items', h: hd, r: L.map(row) }],
    keys = new Set(L.map(key));
  if (hist)
    tables.push({
      t: 'Recent Movements',
      h: ['Time', 'Type', 'Item', 'Qty', 'User', 'Stock After'],
      r: state.items
        .filter((x) => keys.has(key(x)) && isMove(x))
        .slice(0, 30)
        .map((x) => [x.time, x.type, x.item, x.qty + ' ' + unitOf(x), x.user, x.stock]),
    });
  const imgs = ph
    ? L.map((r) => pphotos(r.pid)[0])
        .filter(Boolean)
        .slice(0, 12)
    : [];
  printDoc(title, sub, [], imgs, {
    kind: 'Stock Report',
    ref,
    sign: true,
    barcode: ref,
    kpis: [
      ['Products', L.length],
      ['Units', sum(L, (r) => r.stock)],
      ['To Reorder', L.filter(isLow).length],
      ...(Ad ? [['Stock Value', money(sum(L, (r) => r.stock * r.cost))]] : []),
    ],
    tables,
  });
}
export function invLabels() {
  const L = products().filter((r) => SEL.has(key(r)));
  if (!L.length) return;
  const w = window.open('', '_blank');
  if (!w) {
    toast('Allow pop-ups to print labels');
    return;
  }
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>@page{size:A4;margin:8mm}body{margin:0;font-family:Arial,sans-serif}.tb{padding:8px;background:#012b59;text-align:center}.tb button{padding:8px 14px;border:0;border-radius:8px;background:#ffd002;color:#012b59;font-weight:700;cursor:pointer}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;padding:3mm}.l{border:.3mm dashed #9aa6b8;padding:3mm;height:38mm;display:flex;flex-direction:column;justify-content:space-between;break-inside:avoid}.l b{font-size:11pt}.l small{font-size:7.5pt;color:#444}.l svg{max-width:100%;height:auto}@media print{.tb{display:none}.g{padding:0}}</style></head><body><div class="tb"><button data-pa="print">Print labels</button></div><div class="g">${L.map((r) => `<div class="l"><div><b>${esc(r.item)}</b><br><small>${esc([r.length, colTxt(r), unitOf(r)].filter((x) => x && x != '-').join(', '))}</small></div><div style="text-align:center">${c39(r.barcode || r.item, 40)}<div style="font:7pt monospace">${esc(r.barcode || r.item)}</div></div><small>ID ${esc(r.pid)} | ${esc(hasLoc(r) ? r.location : 'No location')}</small></div>`).join('')}</div></body></html>`
  );
  w.document.close();
}
