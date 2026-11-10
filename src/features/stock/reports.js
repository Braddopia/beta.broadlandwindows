/* features/stock/reports: Stock reports and labels. */
import { onClick } from '../../core/actions.js';
import { today } from '../../core/dates.js';
import { $, esc } from '../../core/dom.js';
import { grp, money, sum } from '../../core/format.js';
import { state } from '../../data/state.js';
import { pphotos } from './stock.js';
import {
  areaOf,
  colTxt,
  hasLoc,
  isLow,
  isMove,
  key,
  prodRows,
  products,
  qcIssue,
  ro,
  stt,
  unitOf,
} from '../../domain/stock.js';
import { areaList } from '../../domain/stock-take.js';
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
  const n = SEL.size,
    Ad = can('money'),
    last = (state.stakes || []).filter((t) => t.status == 'done').slice(-1)[0],
    G = [
      [
        'Stock Lists',
        [
          ['sel', 'Selected Items (' + n + ')', n],
          ['all', 'Full Stock List', 1],
          ['area', 'By Stock-Take Area', 1],
          ['sup', 'By Supplier', 1],
          ['loc', 'By Location', 1],
        ],
      ],
      [
        'Money',
        [
          ['val', 'Valuation By Area', Ad, 'Value of every area and the company total'],
          ['supcost', 'Cost By Supplier', Ad, 'What is held from each supplier, biggest first'],
          ['dead', 'Not Moved In 6 Months', Ad, 'Money tied up in stock nobody is using'],
        ],
      ],
      [
        'Checks',
        [
          ['low', 'Low Stock And Reorder', 1],
          ['out', 'Out Of Stock', 1],
          ['qc', 'Quality Check Issues', 1, 'Failed, quarantined, damaged or out of date'],
          ['expiry', 'Expiring In 90 Days', 1],
          ['uncounted', 'Not Counted In A Year', 1],
        ],
      ],
      [
        'Activity',
        [
          ['moves', 'Movements: Last 30 Days', 1, 'In and out per product'],
          ['req', 'Stock Requests', 1],
          ...(last ? [['take', 'Last Stock Take Differences', 1, last.name]] : []),
        ],
      ],
    ];
  openModal(
    `<h2>Inventory Reports</h2>${G.map(
      ([g, L]) =>
        `<h3 class="fsec">${g}</h3><div class="rl rl2">${L.map(
          ([c, t, e, d]) =>
            `<button class="rb" ${d ? `title="${esc(d)}"` : ''} ${e ? '' : 'disabled'} ${c == 'take' ? onClick('takeReport', last.id) : onClick('invRun', c)}><b>${t}</b></button>`
        ).join('')}</div>`
    ).join(
      ''
    )}<div class="rep-opt"><label class="cbl"><input type="checkbox" id="rhist" checked> Include movement history</label><label class="cbl"><input type="checkbox" id="rphoto"> Include photos</label></div><div class="mact"><button class="btn ghost" data-act="closeModal">Close</button></div>`
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
  if (EXTRA[sc]) return EXTRA[sc](P, ref);
  if (sc == 'area') {
    title = 'Stock By Area';
    sub = 'Grouped by stock-take area';
  }
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
          : sc == 'area'
            ? areaList(L, state.stockAreas).map((a) => grpT(areaOf).find((t) => t.t.startsWith(a + ' (')))
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
/* ---- the newer reports ---- */
const r2 = (n) => Math.round(n * 100) / 100;
const val = (r) => (+r.stock || 0) * (+r.cost || 0);
const name = (r) => [r.nocode ? '' : r.item, r.desc].filter(Boolean).join(' · ') || r.item;
/** when each product last went in or out */
function lastMoves() {
  const m = {};
  state.items.forEach((x) => {
    if (isMove(x) && !(x.pid in m)) m[x.pid] = x.at || 0;
  });
  return m;
}
const EXTRA = {
  val(P, ref) {
    if (!can('money')) return;
    const A = areaList(P, state.stockAreas),
      total = sum(P, val),
      rows = A.map((a) => {
        const L = P.filter((r) => areaOf(r) == a);
        return [
          a,
          L.length,
          sum(L, (r) => +r.stock || 0),
          money(sum(L, val)),
          total ? Math.round((sum(L, val) / total) * 100) + '%' : '-',
        ];
      });
    printDoc('Stock Valuation By Area', 'Quantity in stock × cost each', [], [], {
      kind: 'Stock Report',
      ref,
      sign: true,
      kpis: [
        ['Company Value', money(total)],
        ['Areas', A.length],
        ['Lines', P.length],
        ['No Cost Set', P.filter((r) => r.stock > 0 && !(+r.cost > 0)).length],
      ],
      tables: [
        {
          t: 'Value By Area',
          h: ['Area', 'Lines', 'Units', 'Value', 'Share'],
          r: [...rows, ['Total', P.length, sum(P, (r) => +r.stock || 0), money(total), '100%']],
        },
        {
          t: 'Most Valuable Lines',
          h: ['Item', 'Area', 'Qty', 'Cost', 'Value'],
          r: P.slice()
            .sort((a, b) => val(b) - val(a))
            .slice(0, 25)
            .map((r) => [name(r), areaOf(r), r.stock + ' ' + unitOf(r), money(r.cost), money(val(r))]),
        },
        {
          t: 'In Stock With No Cost (value counted as £0)',
          h: ['Item', 'Area', 'Qty'],
          r: P.filter((r) => r.stock > 0 && !(+r.cost > 0)).map((r) => [name(r), areaOf(r), r.stock + ' ' + unitOf(r)]),
        },
      ],
    });
  },
  supcost(P, ref) {
    if (!can('money')) return;
    const total = sum(P, val),
      G = grp(P, (r) => r.supplier || 'No Supplier').sort((a, b) => sum(b[1], val) - sum(a[1], val));
    printDoc('Cost By Supplier', 'Stock held from each supplier, at cost', [], [], {
      kind: 'Stock Report',
      ref,
      sign: true,
      kpis: [
        ['Company Value', money(total)],
        ['Suppliers', G.length],
        ['Biggest', G[0] ? G[0][0] : '-'],
      ],
      tables: [
        {
          t: 'Summary',
          h: ['Supplier', 'Lines', 'Units', 'Value', 'Share'],
          r: G.map(([k, L]) => [
            k,
            L.length,
            r2(sum(L, (r) => +r.stock || 0)),
            money(sum(L, val)),
            total ? Math.round((sum(L, val) / total) * 100) + '%' : '-',
          ]),
        },
        ...G.map(([k, L]) => ({
          t: k + ' · ' + money(sum(L, val)),
          h: ['Item', 'Area', 'Location', 'Qty', 'Cost', 'Value'],
          r: L.slice()
            .sort((a, b) => val(b) - val(a))
            .map((r) => [
              name(r),
              areaOf(r),
              hasLoc(r) ? r.location : '-',
              r.stock + ' ' + unitOf(r),
              money(r.cost),
              money(val(r)),
            ]),
        })),
      ],
    });
  },
  dead(P, ref) {
    if (!can('money')) return;
    const lm = lastMoves(),
      cut = Date.now() - 182 * 864e5,
      L = P.filter((r) => r.stock > 0 && (lm[r.pid] || 0) < cut).sort((a, b) => val(b) - val(a));
    printDoc('Not Moved In 6 Months', 'In stock, with nothing in or out for 6 months', [], [], {
      kind: 'Stock Report',
      ref,
      sign: true,
      kpis: [
        ['Lines', L.length],
        ['Value Tied Up', money(sum(L, val))],
        ['Share Of Stock', sum(P, val) ? Math.round((sum(L, val) / sum(P, val)) * 100) + '%' : '-'],
      ],
      tables: [
        {
          t: 'Lines',
          h: ['Item', 'Area', 'Qty', 'Value', 'Last Moved', 'Supplier'],
          r: L.map((r) => [
            name(r),
            areaOf(r),
            r.stock + ' ' + unitOf(r),
            money(val(r)),
            lm[r.pid] ? new Date(lm[r.pid]).toLocaleDateString('en-GB') : 'Never',
            r.supplier || '-',
          ]),
        },
      ],
    });
  },
  qc(P, ref) {
    const td = today(),
      L = P.filter((r) => qcIssue(r, td));
    printDoc('Quality Check Issues', 'Failed, quarantined, damaged, faulty or past its date', [], [], {
      kind: 'Stock Report',
      ref,
      sign: true,
      kpis: [
        ['Lines', L.length],
        ['Damaged Units', sum(L, (r) => +r.damaged || 0)],
        ['Out Of Date', L.filter((r) => r.expiry && r.expiry < td).length],
        ['COSHH Items', P.filter((r) => r.coshh == 'Yes').length],
      ],
      tables: [
        {
          t: 'Lines',
          h: ['Item', 'Area', 'QC', 'Condition', 'Damaged', 'Batch', 'Expiry', 'Checked', 'Notes'],
          r: L.map((r) => [
            name(r),
            areaOf(r),
            r.qc || '-',
            r.cond || '-',
            r.damaged || 0,
            r.batch || '-',
            r.expiry || '-',
            [r.qcBy, r.qcAt].filter(Boolean).join(', ') || '-',
            r.qcNote || '',
          ]),
        },
        {
          t: 'Hazardous (COSHH) Items',
          h: ['Item', 'Area', 'Location', 'Qty'],
          r: P.filter((r) => r.coshh == 'Yes').map((r) => [
            name(r),
            areaOf(r),
            hasLoc(r) ? r.location : '-',
            r.stock + ' ' + unitOf(r),
          ]),
        },
      ],
    });
  },
  expiry(P, ref) {
    const td = today(),
      lim = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10),
      L = P.filter((r) => r.expiry && r.expiry <= lim).sort((a, b) => a.expiry.localeCompare(b.expiry));
    printDoc('Expiring In 90 Days', 'Sealants, foams, paints and anything with a use-by date', [], [], {
      kind: 'Stock Report',
      ref,
      sign: true,
      kpis: [
        ['Lines', L.length],
        ['Already Out Of Date', L.filter((r) => r.expiry < td).length],
      ],
      tables: [
        {
          t: 'Lines',
          h: ['Item', 'Area', 'Qty', 'Batch', 'Expiry'],
          r: L.map((r) => [name(r), areaOf(r), r.stock + ' ' + unitOf(r), r.batch || '-', r.expiry]),
        },
      ],
    });
  },
  uncounted(P, ref) {
    const cut = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10),
      L = P.filter((r) => !r.countedAt || r.countedAt < cut);
    printDoc('Not Counted In A Year', 'Lines with no stock-take count in the last 12 months', [], [], {
      kind: 'Stock Report',
      ref,
      sign: true,
      kpis: [
        ['Lines', L.length],
        ['Never Counted', L.filter((r) => !r.countedAt).length],
      ],
      tables: areaList(L, state.stockAreas).map((a) => ({
        t: a,
        h: ['Item', 'Location', 'Qty', 'Last Counted'],
        r: L.filter((r) => areaOf(r) == a).map((r) => [
          name(r),
          hasLoc(r) ? r.location : '-',
          r.stock + ' ' + unitOf(r),
          r.countedAt || 'Never',
        ]),
      })),
    });
  },
  moves(P, ref) {
    const Ad = can('money'),
      cut = Date.now() - 30 * 864e5,
      M = state.items.filter((x) => isMove(x) && (x.at || 0) >= cut),
      G = grp(M, (x) => x.pid)
        .map(([k, L]) => {
          const inQ = sum(
              L.filter((x) => x.type == 'add'),
              (x) => +x.qty || 0
            ),
            outQ = sum(
              L.filter((x) => x.type == 'remove'),
              (x) => +x.qty || 0
            );
          return { r: L[0], inQ, outQ, n: L.length };
        })
        .sort((a, b) => b.outQ - a.outQ);
    printDoc('Movements: Last 30 Days', 'Stock in and out per product', [], [], {
      kind: 'Stock Report',
      ref,
      sign: true,
      kpis: [
        ['Movements', M.length],
        ['Products', G.length],
        ['Units In', r2(sum(G, (g) => g.inQ))],
        ['Units Out', r2(sum(G, (g) => g.outQ))],
        ...(Ad ? [['Value Out', money(sum(G, (g) => g.outQ * (+g.r.cost || 0)))]] : []),
      ],
      tables: [
        {
          t: 'Per Product (most used first)',
          h: ['Item', 'Area', 'In', 'Out', 'Moves', ...(Ad ? ['Value Out'] : [])],
          r: G.map((g) => [
            name(g.r),
            areaOf(g.r),
            r2(g.inQ),
            r2(g.outQ),
            g.n,
            ...(Ad ? [money(g.outQ * (+g.r.cost || 0))] : []),
          ]),
        },
        {
          t: 'By Person',
          h: ['Person', 'Moves', 'Units In', 'Units Out'],
          r: grp(M, (x) => x.user || '-').map(([k, L]) => [
            k,
            L.length,
            r2(
              sum(
                L.filter((x) => x.type == 'add'),
                (x) => +x.qty || 0
              )
            ),
            r2(
              sum(
                L.filter((x) => x.type == 'remove'),
                (x) => +x.qty || 0
              )
            ),
          ]),
        },
      ],
    });
  },
};
export function invLabels() {
  const L = products().filter((r) => SEL.has(key(r)));
  if (!L.length) return;
  const w = window.open('', '_blank');
  if (!w) {
    toast('Allow pop-ups to print labels');
    return;
  }
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>@page{size:A4;margin:8mm}body{margin:0;font-family:Arial,sans-serif}.tb{padding:8px;background:#012b59;text-align:center}.tb button{padding:8px 14px;border:0;border-radius:8px;background:#ffd002;color:#012b59;font-weight:700;cursor:pointer}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;padding:3mm}.l{border:.3mm dashed #9aa6b8;padding:3mm;height:38mm;display:flex;flex-direction:column;justify-content:space-between;break-inside:avoid}.l b{font-size:11pt}.l small{font-size:7.5pt;color:#444}.l svg{max-width:100%;height:auto}@media print{.tb{display:none}.g{padding:0}}</style></head><body><div class="tb"><button data-pa="print">Print labels</button></div><div class="g">${L.map((r) => `<div class="l"><div><b>${esc(r.item)}</b><br><small>${esc([r.length, colTxt(r), unitOf(r)].filter((x) => x && x != '-').join(', '))}</small></div><div style="text-align:center">${c39(r.item, 40)}<div style="font:7pt monospace">${esc(r.item)}</div></div><small>ID ${esc(r.pid)} | ${esc(hasLoc(r) ? r.location : 'No location')}</small></div>`).join('')}</div></body></html>`
  );
  w.document.close();
}
