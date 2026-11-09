/* features/live-boards/live-boards: Floor boards for the office, factory and TV screens. */
import { CSTAGES, STAGES } from '../../config/constants.js';
import { onClick, onEvent, rowClick } from '../../core/actions.js';
import { addDays, fd, inWeek, today } from '../../core/dates.js';
import { $, $$, esc } from '../../core/dom.js';
import { m0, sum } from '../../core/format.js';
import { state } from '../../data/state.js';
import { ORDDONE, dAuto, dDueToday, dLate } from '../../domain/deliveries.js';
import { HC, absCode } from '../../domain/holidays.js';
import { allLeads } from '../../domain/leads.js';
import { hasLoc, isLow, isMove, products, unitOf } from '../../domain/stock.js';
import { can } from '../../domain/permissions.js';
import { need } from '../auth/session.js';
import { LAY, flGet, layEdit } from '../home/home.js';
import { printDoc } from '../../print/print.js';
import { emptyArt } from '../../ui/components/art.js';
import { dTag, ordTag, prTag } from '../../ui/components/tags.js';
import { render, view } from '../../ui/shell/router.js';
import { uiState } from '../../ui/ui-state.js';

export const msDots = (x) =>
  Array.isArray(x.ms) && x.ms.length
    ? `<span class="ms">${x.ms.map((m) => `<i class="${m[1] ? 'on' : ''}" title="${esc(m[0])}${m[1] ? ': ' + fd(m[1]) : ': pending'}"></i>`).join('')}</span>`
    : '';
/* ---------------- factory floor ---------------- */
export function liveData() {
  const td = today(),
    D = state.deliveries.filter((x) => x.status != 'Received').sort((a, b) => a.due.localeCompare(b.due)),
    J = state.contracts
      .filter((c) => c.stage != 'Complete' && c.stage != 'Deposit due')
      .sort((a, b) => (a.fit || '9').localeCompare(b.fit || '9'));
  return {
    td,
    D,
    J,
    od: D.filter(dLate),
    dt: D.filter(dDueToday),
    dw: state.deliveries.filter((x) => inWeek(x.due)),
    jw: J.filter((c) => c.fit && inWeek(c.fit)),
  };
}
export function vLive() {
  if (uiState.board != 'factory') return vBoard(uiState.board);
  const { td, D, J, od, dt, dw, jw } = liveData(),
    wDone = dw.filter((x) => x.status == 'Received').length,
    tv = document.body.classList.contains('tv');
  const lowN = products().filter(isLow).length,
    callN = state.calls.filter((c) => c.status != 'Complete').length,
    reqN = state.items.filter((r) => r.type == 'request' && r.reqStatus == 'Pending').length,
    offN = state.staff.filter((s) => ['H', 'H1', 'H2', 'S', 'M', 'C', 'A', 'U'].includes(absCode(s, td))).length;
  const T = [
    ['Deliveries Due Today', dt.length, dt.length ? 'warn' : ''],
    ['Overdue Deliveries', od.length, od.length ? 'bad' : ''],
    ['Deliveries This Week', dw.length, '', `${wDone} delivered, ${dw.length - wDone} to go`],
    ['Jobs In Progress', J.length, ''],
    ['Jobs Due This Week', jw.length, ''],
    ['Low Stock Lines', lowN, lowN ? 'warn' : ''],
    ['Open Service Calls', callN, ''],
    ['Stock Requests', reqN, reqN ? 'warn' : ''],
    ['Staff Off Today', offN, ''],
  ];
  const days = [...Array(7)].map((_, i) => {
    const k = addDays(i);
    return [
      new Date(k + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short' }),
      D.filter((x) => (i ? x.due == k : x.due <= k)).length,
      i ? '' : 'hot',
    ];
  });
  const mx = Math.max(1, ...days.map((d) => d[1]));
  const dRow = (x) =>
    `<div class="nrow clk-r" ${rowClick('editDel', x.id)}><span><b>${esc(x.supplier)}</b><small>${esc(x.items)}, job ${esc(x.contract || '-')}${x.stage ? ', ' + esc(x.stage) : ''}</small></span><span class="acts">${dTag(x)}<button class="mini" ${onClick('recvD', x.id)}>Received</button><button class="mini" ${onClick('editDel', x.id)}>Edit</button></span></div>`;

  const st = CSTAGES.slice(1, 5).map((s) => [s, J.filter((c) => c.stage == s).length]),
    smx = Math.max(1, ...st.map((x) => x[1]));
  const rq = state.items
      .filter((r) => r.type == 'request' && ['Pending', 'Approved'].includes(r.reqStatus))
      .slice(0, 4),
    mv = state.items.filter(isMove).slice(0, 4);
  const O = state.orders
      .filter((o) => !ORDDONE.test(o.status))
      .sort((a, b) => (a.due || '9').localeCompare(b.due || '9')),
    late = O.filter((o) => o.due && o.due < td).length;
  const TK = ['dt', 'od', 'dw', 'jip', 'jw', 'low', 'calls', 'req', 'off'],
    FL = flGet();
  const FP = {
    board: `<div class="panel"><h2>Deliveries Board</h2>${D.map(dRow).join('') || emptyArt('van', 'No deliveries outstanding.')}</div>`,
    next7: `<div class="panel"><h2>Deliveries, Next 7 Days</h2><div class="cols">${days.map((r) => `<div><span class="cv2">${r[1] || ''}</span><i class="${r[2]}" style="height:${Math.max(3, Math.round((100 * r[1]) / mx))}%"></i><small>${r[0]}</small></div>`).join('')}</div><p class="muted" style="margin:.4rem 0 0">Today includes anything overdue.</p></div>`,
    prio: `<div class="panel"><h2><span>Priority</span><span class="muted" style="font:500 .78rem var(--body)">Most urgent first</span></h2>${
      priorities()
        .map(
          (x, i) =>
            `<div class="prio p${x.p}"><span class="pn">${i + 1}</span><span><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span><span class="tag ${x.p == 1 ? 'r' : 'y'}">${esc(x.k)}</span></div>`
        )
        .join('') || emptyArt('done', 'Nothing urgent. All clear.')
    }</div>`,
    stage: `<div class="panel"><h2>Jobs By Stage</h2>${st.map(([s, n]) => `<div class="hb"><span>${esc(s)}</span><div class="bar2"><i style="width:${(100 * n) / smx}%"></i></div><b>${n}</b></div>`).join('')}<p class="muted" style="margin:.5rem 0 0">Open service calls: ${state.calls.filter((c) => c.status != 'Complete').length}</p></div>`,
    stock: `<div class="panel"><h2>Stock Activity</h2>${rq.map((r) => `<div class="nrow"><span><span class="tag y">Request</span> <b>${ordTag(r)} ${r.qty} ${esc(unitOf(r))} x ${esc(r.item)}</b><small>${esc(r.user)}, ${esc(r.time)}, ${esc(r.reqStatus)}</small></span></div>`).join('')}${mv.map((r) => `<div class="nrow"><span><span class="tag ${r.type == 'add' ? 'g' : 'r'}">${r.type == 'add' ? 'In' : 'Out'}</span> <b>${r.qty} ${esc(unitOf(r))} x ${esc(r.item)}</b><small>${esc(r.user)}, ${esc(r.time)}, now ${r.stock}</small></span></div>`).join('') || (rq.length ? '' : '<p class="empty">No stock activity yet.</p>')}</div>`,
    orders: `<div class="panel so"><h2><span>Smart Orders</span><span class="acts"><button class="mini pri" data-act="ordImport">Import</button>${state.orders.length ? '<button class="mini" data-act="ordClear">Clear</button>' : ''}</span></h2>${state.orders.length ? `<div class="so-k"><span><b>${O.length}</b> open</span><span class="${late ? 'x' : ''}"><b>${late}</b> overdue</span><span><b>${state.orders.length - O.length}</b> done</span></div>` : ''}${
      O.slice(0, 12)
        .map(
          (o) =>
            `<div class="nrow so-r ${o.due && o.due < td ? 'late' : ''}"><span class="so-ref">${esc(o.ref)}</span><span><b>${esc(o.customer)}</b><small>${esc(o.desc)}</small></span><span class="so-due">${o.due ? fd(o.due) : ''}${o.status ? `<small>${esc(o.status)}</small>` : ''}</span></div>`
        )
        .join('') || emptyArt('chart', 'No orders yet. Press Import to load the Smart Systems order list.')
    }</div>`,
    fits: `<div class="panel"><h2>Fittings This Week</h2>${jw.map((c) => `<div class="nrow"><span><b>${esc(c.name)}</b><small>${esc(c.product)}</small></span><span class="so-due">${fd(c.fit)}<small>${esc(c.fitter || '')}</small></span></div>`).join('') || emptyArt('done', 'No fittings this week.')}</div>`,
    calls: `<div class="panel"><h2>Service Visits</h2>${
      state.calls
        .filter((c) => c.status != 'Complete')
        .sort((a, b) => (a.visit || '9').localeCompare(b.visit || '9'))
        .slice(0, 8)
        .map(
          (c) =>
            `<div class="nrow"><span><b>${esc(c.name)}</b><small>${esc(c.issue)}</small></span><span class="so-due">${c.visit ? fd(c.visit) : 'Not booked'}<small>${esc(c.priority || '')}</small></span></div>`
        )
        .join('') || emptyArt('done', 'No open service calls.')
    }</div>`,
    low: `<div class="panel"><h2>Low Stock</h2>${
      products()
        .filter(isLow)
        .slice(0, 10)
        .map(
          (r) =>
            `<div class="nrow"><span><b>${esc(r.item)}</b><small>${esc(hasLoc(r) ? r.location : 'No location')}</small></span><span class="tag ${r.stock <= 0 ? 'r' : 'y'}">${r.stock} ${esc(unitOf(r))}</span></div>`
        )
        .join('') || emptyArt('stock', 'Nothing low on stock.')
    }</div>`,
    off: `<div class="panel"><h2>Who's Off Today</h2>${
      state.staff
        .filter((s) => ['H', 'H1', 'H2', 'S', 'M', 'C', 'A', 'U'].includes(absCode(s, td)))
        .map(
          (s) =>
            `<div class="nrow"><span><b>${esc(s.name)}</b><small>${esc(s.cat || '')}</small></span><span class="tag">${esc(HC[absCode(s, td)][1])}</span></div>`
        )
        .join('') || emptyArt('team', 'Everyone is in today.')
    }</div>`,
  };
  return `<div class="fl"><div class="fl-head"><div>${boardTabs()}<h1>Factory Floor</h1><span class="muted"><i class="live"></i>Live &middot; Updated <span id="upd">${new Date().toLocaleTimeString('en-GB')}</span></span></div><div class="clk" id="clk">${new Date().toLocaleTimeString('en-GB')}</div><div class="acts">${boardPick()}${can('manage') ? '<button class="btn ghost" data-act="flEdit">Customise</button>' : ''}<button class="btn ghost" data-act="liveReport">Factory Report</button><button class="btn" data-act="toggleTV">${tv ? 'Exit Full Screen' : 'Full Screen'}</button></div></div>
  <div class="kpis">${T.filter((k, n) => FL.k.includes(TK[n]))
    .sort((a, b) => FL.k.indexOf(TK[T.indexOf(a)]) - FL.k.indexOf(TK[T.indexOf(b)]))
    .map(
      (k) =>
        `<div class="kpi ${k[2]}"><small>${k[0]}</small><b>${k[1]}</b>${k[3] ? `<span class="ksub">${k[3]}</span>` : ''}</div>`
    )
    .join('')}</div>
  <div class="lvg">${
    FL.p
      .filter((k) => FP[k])
      .map((k) => FP[k])
      .join('') || '<div class="panel"><p class="empty">No panels chosen. Press Customise to add some.</p></div>'
  }
  </div></div>`;
}
/* ---------------- other floor boards: hardwood workshop and office ---------------- */
export const BOARDS = [
  ['factory', 'Factory'],
  ['hardwood', 'Hardwood'],
  ['office', 'Office'],
];
export const boardTabs = () => '';
export const boardPick = () =>
  `<label class="bpick"><span>Board</span><select aria-label="Choose board" ${onEvent('onchange', 'setUI', 'board', 'this.value')}>${BOARDS.map(([k, t]) => `<option value="${k}" ${uiState.board == k ? 'selected' : ''}>${t} floor</option>`).join('')}</select></label>`;
export const isHW = (c) =>
  c.contractType == 'Domestic Timber' ||
  /hardwood|timber|\boak\b|accoya|sapele|sash/i.test((c.product || '') + ' ' + (c.notes || ''));
export const hwItem = (r) =>
  /hardwood|timber|\boak\b|accoya|sapele|meranti|sash/i.test(
    [r.item, r.notes, r.supplier, r.cInName, r.cOutName].join(' ')
  );
export const stageBar = (c) =>
  `<div class="bar"><i style="width:${Math.round((100 * (CSTAGES.indexOf(c.stage) + 1)) / CSTAGES.length)}%"></i></div>`;
export function boardData(b) {
  const td = today(),
    row = (a, s, r) => `<div class="nrow"><span><b>${a}</b><small>${s}</small></span>${r || ''}` + '</div>';
  if (b == 'hardwood') {
    const J = state.contracts
        .filter((c) => isHW(c) && c.stage != 'Complete' && c.cancelled != 'Yes')
        .sort((a, b) => (a.fit || '9').localeCompare(b.fit || '9')),
      jw = J.filter((c) => c.fit && inWeek(c.fit)),
      ids = new Set(J.map((c) => c.id)),
      D = state.deliveries
        .filter(
          (d) =>
            d.status != 'Received' &&
            (ids.has(d.contract) || /hardwood|timber|oak|accoya|sapele/i.test(d.supplier + ' ' + d.items))
        )
        .sort((a, b) => a.due.localeCompare(b.due)),
      P = products().filter(hwItem),
      low = P.filter(isLow);
    const st = CSTAGES.slice(1, 5).map((s) => [s, J.filter((c) => c.stage == s).length]),
      mx = Math.max(1, ...st.map((x) => x[1]));
    return {
      t: 'Hardwood Floor',
      s: 'Timber windows and doors in the workshop',
      K: {
        jip: ['Hardwood Jobs', J.length, ''],
        jw: ['Fitting This Week', jw.length, ''],
        del: ['Timber Deliveries Due', D.length, D.some((d) => d.due < td) ? 'bad' : ''],
        low: ['Timber Stock Low', low.length, low.length ? 'warn' : ''],
        val: ['Work In Hand', m0(sum(J, (c) => c.value)), ''],
      },
      P: {
        jobs: [
          'Hardwood Jobs',
          `<div class="panel"><h2>Hardwood Jobs</h2>${J.map((c) => `<div class="nrow jr"><div style="display:flex;justify-content:space-between;gap:.5rem"><span><b>${esc(c.name)}</b> <span class="muted">#${esc(c.id)}</span></span><span class="tag">${esc(c.stage)}</span></div><div class="muted">${esc(c.product)}${c.fit ? ', fit ' + fd(c.fit) : ''}</div>${stageBar(c)}</div>`).join('') || emptyArt('done', 'No hardwood jobs in progress.')}</div>`,
        ],
        stage: [
          'Jobs By Stage',
          `<div class="panel"><h2>Jobs By Stage</h2>${st.map(([s, n]) => `<div class="hb"><span>${esc(s)}</span><div class="bar2"><i style="width:${(100 * n) / mx}%"></i></div><b>${n}</b></div>`).join('')}</div>`,
        ],
        del: [
          'Timber Deliveries',
          `<div class="panel"><h2>Timber Deliveries</h2>${D.map((d) => row(esc(d.supplier), esc(d.items) + (d.contract ? ', job ' + esc(d.contract) : ''), dTag(d))).join('') || emptyArt('van', 'No timber deliveries due.')}</div>`,
        ],
        fits: [
          'Fitting This Week',
          `<div class="panel"><h2>Fitting This Week</h2>${jw.map((c) => row(esc(c.name), esc(c.product), `<span class="so-due">${fd(c.fit)}<small>${esc(c.fitter || '')}</small></span>`)).join('') || emptyArt('done', 'No hardwood fittings this week.')}</div>`,
        ],
        stock: [
          'Timber Stock',
          `<div class="panel"><h2>Timber Stock</h2>${
            P.slice(0, 12)
              .map((r) =>
                row(
                  esc(r.item),
                  esc(hasLoc(r) ? r.location : 'No location'),
                  `<span class="tag ${r.stock <= 0 ? 'r' : isLow(r) ? 'y' : 'g'}">${r.stock} ${esc(unitOf(r))}</span>`
                )
              )
              .join('') ||
            emptyArt('stock', 'No timber stock lines yet. Items with hardwood, timber or oak in the name show here.')
          }</div>`,
        ],
      },
      DEF: { k: ['jip', 'jw', 'del', 'low'], p: ['jobs', 'stage', 'del', 'fits', 'stock'] },
    };
  }
  /* office */
  const L = state.leads.filter((l) => !['Won', 'Lost'].includes(l.stage)),
    C = state.contracts.filter((c) => c.stage != 'Complete' && c.cancelled != 'Yes'),
    oc = state.calls
      .filter((c) => c.status != 'Complete')
      .sort(
        (a, b) => ['Urgent', 'Normal', 'Low'].indexOf(a.priority) - ['Urgent', 'Normal', 'Low'].indexOf(b.priority)
      ),
    bal = sum(C, (c) => c.value - c.paid),
    fort = addDays(14),
    due = C.filter((c) => c.value - c.paid > 0 && c.fit && c.fit <= fort).sort((a, b) => a.fit.localeCompare(b.fit)),
    jw = C.filter((c) => c.fit && inWeek(c.fit)),
    wk = addDays(-7),
    nl = allLeads().filter((l) => l.created && l.created >= wk);
  const tp = state.brand.tp,
    g = state.brand.g,
    tt = state.brand.tt || {},
    rl = state.brand.rl || {};
  const ls = STAGES.filter((s) => !['Won', 'Lost'].includes(s)).map((s) => [s, L.filter((l) => l.stage == s).length]),
    cs = CSTAGES.map((s) => [s, C.filter((c) => c.stage == s).length]),
    mx = Math.max(1, ...ls.map((x) => x[1]), ...cs.map((x) => x[1]));
  const team = (state.notes || [])
    .filter((n) => n.to == 'Everyone')
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);
  return {
    t: 'Office Floor',
    s: 'Reviews, jobs going through and service',
    K: {
      rv: ['Customer Reviews', '', 'rvall', '', rvAll()],
      g: ['Google Rating', (+g.score || 0).toFixed(1) + ' ★', '', g.count ? g.count + ' reviews' : ''],
      tp: ['Trustpilot Rating', (+tp.score || 0).toFixed(1) + ' ★', '', tp.count ? tp.count + ' reviews' : ''],
      tt: ['Trusted Trader', (+tt.score || 0).toFixed(1) + ' / 5', '', tt.count ? tt.count + ' reviews' : ''],
      rl: [
        'ReferenceLine',
        (+rl.score || 0).toFixed(1) + ' / 10',
        '',
        [rl.count ? rl.count + ' reviews' : '', rl.rec ? rl.rec + '% recommend' : ''].filter(Boolean).join(' · '),
      ],
      leads: ['Open Leads', L.length, ''],
      live: ['Jobs Going Through', C.length, ''],
      calls: ['Open Service Calls', oc.length, oc.some((c) => c.priority == 'Urgent') ? 'bad' : ''],
      bal: ['To Collect', bal >= 10000 ? '£' + (bal / 1000).toFixed(1) + 'k' : m0(bal), 'warn', m0(bal)],
      newl: ['New Leads, 7 Days', nl.length, ''],
    },
    P: {
      pipe: [
        'Jobs Going Through',
        `<div class="panel"><h2>Jobs Going Through</h2><small class="bdl">Leads</small>${ls.map(([s, n]) => `<div class="hb"><span>${esc(s)}</span><div class="bar2"><i style="width:${(100 * n) / mx}%;background:#ffd002"></i></div><b>${n}</b></div>`).join('')}<small class="bdl">Contracts</small>${cs.map(([s, n]) => `<div class="hb"><span>${esc(s)}</span><div class="bar2"><i style="width:${(100 * n) / mx}%"></i></div><b>${n}</b></div>`).join('')}</div>`,
      ],
      calls: [
        'Service Calls',
        `<div class="panel"><h2>Service Calls</h2>${
          oc
            .slice(0, 8)
            .map((c) =>
              row(
                esc(c.name),
                esc(c.issue),
                `<span class="so-due">${c.visit ? fd(c.visit) : 'Not booked'}<small>${prTag(c.priority)}</small></span>`
              )
            )
            .join('') || emptyArt('done', 'No open service calls.')
        }</div>`,
      ],
      fits: [
        'Fittings This Week',
        `<div class="panel"><h2>Fittings This Week</h2>${jw.map((c) => row(esc(c.name), esc(c.product), `<span class="so-due">${fd(c.fit)}<small>${esc(c.fitter || '')}</small></span>`)).join('') || emptyArt('done', 'No fittings this week.')}</div>`,
      ],
      newl: [
        'New Leads',
        `<div class="panel"><h2>New Leads</h2>${
          allLeads()
            .slice()
            .sort((a, b) => (b.created || '').localeCompare(a.created || ''))
            .slice(0, 6)
            .map((l) =>
              row(
                esc(l.name),
                esc((l.productType || l.product || '') + (l.source ? ' · ' + l.source : '')),
                `<span class="tag">${esc(l.stage)}</span>`
              )
            )
            .join('') || emptyArt('survey', 'No leads yet.')
        }</div>`,
      ],
      pay: [
        'Payments Due Before Fit',
        `<div class="panel"><h2>Payments Due Before Fit</h2>${due.map((c) => row(esc(c.name), 'Fit ' + fd(c.fit) + ', #' + esc(c.id), `<span class="tag r">${m0(c.value - c.paid)}</span>`)).join('') || emptyArt('done', 'Nothing due before a fitting.')}</div>`,
      ],
      quotes: [
        'What Customers Say',
        `<div class="panel"><h2>What Customers Say</h2>${
          (state.brand.quotes || [])
            .slice()
            .sort((a, b) => (b.d || '').localeCompare(a.d || ''))
            .slice(0, 4)
            .map(
              (x) =>
                `<div class="rvq"><p>“${esc(x.t)}”</p><small>${esc(x.src)}${x.d ? ' · ' + esc(new Date(x.d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })) : ''}</small></div>`
            )
            .join('') || emptyArt('done', 'No review quotes yet.')
        }</div>`,
      ],
      team: [
        'Team Messages',
        `<div class="panel"><h2>Team Messages</h2>${team.map((n) => row(esc(n.by), esc(n.t), `<span class="so-due">${new Date(n.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>`)).join('') || emptyArt('team', 'No team messages.')}</div>`,
      ],
    },
    DEF: { k: ['rv', 'leads', 'live', 'calls', 'newl'], p: ['pipe', 'calls', 'fits', 'newl', 'team', 'pay'] },
  };
}
/* one card with every review site: score, out of what, and how many reviews */
export function rvAll() {
  const B = state.brand,
    R = [
      ['Google', B.g, 5],
      ['Trustpilot', B.tp, 5],
      ['Trusted Trader', B.tt || {}, 5],
      ['ReferenceLine', B.rl || {}, 10],
    ];
  return `<small>Customer Reviews</small><div class="rvall-g">${R.map(([n, x, out]) => `<div class="rva"><span>${esc(n)}</span><b>${(+x.score || 0).toFixed(1)}<i>/ ${out}</i></b><em>${x.count ? esc(x.count) + ' reviews' : '&nbsp;'}</em></div>`).join('')}</div>`;
}
export const boardLay = (b) => {
  const d = boardData(b),
    L = (state.boards || {})[b];
  return L && Array.isArray(L.k) ? L : d.DEF;
};
export function vBoard(b) {
  const d = boardData(b),
    L = boardLay(b),
    tv = document.body.classList.contains('tv');
  return `<div class="fl"><div class="fl-head"><div>${boardTabs()}<h1>${esc(d.t)}</h1><span class="muted"><i class="live"></i>${esc(d.s)} &middot; Updated <span id="upd">${new Date().toLocaleTimeString('en-GB')}</span></span></div><div class="clk" id="clk">${new Date().toLocaleTimeString('en-GB')}</div><div class="acts">${boardPick()}${can('manage') ? `<button class="btn ghost" ${onClick('boardEdit', b)}>Customise</button>` : ''}<button class="btn" data-act="toggleTV">${tv ? 'Exit Full Screen' : 'Full Screen'}</button></div></div>
  <div class="kpis">${L.k
    .filter((k) => d.K[k])
    .map((k) => {
      const x = d.K[k];
      if (x[4]) return `<div class="kpi ${x[2]}">${x[4]}</div>`;
      return `<div class="kpi ${x[2]}"><small>${x[0]}</small><b>${x[1]}</b>${x[3] ? `<span class="ksub">${esc(x[3])}</span>` : ''}</div>`;
    })
    .join('')}</div>
  <div class="lvg">${
    L.p
      .filter((k) => d.P[k])
      .map((k) => d.P[k][1])
      .join('') || '<div class="panel"><p class="empty">No panels chosen. Press Customise to add some.</p></div>'
  }</div></div>`;
}
export function boardEdit(b) {
  if (!need('manage', 'Changing the floor boards')) return;
  const d = boardData(b);
  LAY['b_' + b] = {
    t: 'Customise ' + d.t,
    d: 'Pick what shows on this screen and the order. Shared by everyone who opens it.',
    av: () => ({
      k: Object.entries(d.K).map(([k, x]) => [k, x[0]]),
      p: Object.entries(d.P).map(([k, x]) => [k, x[0]]),
    }),
    get: () => boardLay(b),
    set: (v) => {
      state.boards = state.boards || {};
      state.boards[b] = v;
    },
    reset: () => {
      if (state.boards) delete state.boards[b];
    },
  };
  layEdit('b_' + b);
}
/* ranked to-do list for the floor: 1 = act now, 2 = today / soon */
export function priorities() {
  const td = today(),
    d3 = addDays(3),
    o = [];
  state.calls
    .filter((c) => c.status != 'Complete' && c.priority == 'Urgent')
    .forEach((c) =>
      o.push({
        p: 1,
        k: 'Urgent Call',
        t: c.name + ': ' + c.issue,
        s: c.visit ? 'Visit ' + fd(c.visit) : 'No visit booked',
        o: c.visit || '0',
      })
    );
  state.deliveries
    .filter(dLate)
    .forEach((x) =>
      o.push({ p: 1, k: 'Overdue', t: x.supplier + ': ' + x.items, s: 'Was due ' + fd(x.due), o: x.due })
    );
  products()
    .filter((r) => r.stock <= 0)
    .forEach((r) =>
      o.push({
        p: 1,
        k: 'Out Of Stock',
        t: r.item + ' ' + (r.length != '-' ? r.length : ''),
        s: (r.supplier || 'No supplier') + ', ' + (hasLoc(r) ? r.location : 'no location'),
        o: '1',
      })
    );
  state.contracts
    .filter((c) => c.fit && c.fit >= td && c.fit <= d3 && !['Fitted', 'Complete'].includes(c.stage))
    .forEach((c) =>
      o.push({
        p: c.fit == td ? 1 : 2,
        k: c.fit == td ? 'Fitting Today' : 'Fitting Soon',
        t: c.name + ' #' + c.id,
        s: c.product + ', ' + fd(c.fit) + ', ' + c.stage,
        o: c.fit,
      })
    );
  state.deliveries
    .filter((x) => x.status != 'Received' && x.due == td)
    .forEach((x) => o.push({ p: 2, k: 'Due Today', t: x.supplier + ': ' + x.items, s: dAuto(x), o: td }));
  state.items
    .filter((r) => r.type == 'request' && r.reqStatus == 'Pending')
    .forEach((r) =>
      o.push({
        p: 2,
        k: 'Request',
        t: r.ord + ' ' + r.qty + ' ' + unitOf(r) + ' x ' + r.item,
        s: 'Waiting for approval, ' + r.user,
        o: '5',
      })
    );
  products()
    .filter((r) => r.stock > 0 && isLow(r))
    .forEach((r) => o.push({ p: 2, k: 'Low Stock', t: r.item, s: r.stock + ' ' + unitOf(r) + ' left', o: '6' }));
  return o.sort((a, b) => a.p - b.p || String(a.o).localeCompare(String(b.o)));
}
/* hide rows that don't fit in each panel (big-screen mode) and say how many more */
export function fitLive() {
  if (view != 'live' || innerWidth <= 1400) return;
  $$('#main .lvg>.panel').forEach((p) => {
    p.querySelectorAll('p.fm').forEach((e) => e.remove());
    const R = [...p.querySelectorAll('.nrow,.hb,.prio')];
    R.forEach((r) => (r.style.display = ''));
    const bad = () => p.scrollHeight > p.clientHeight + 1;
    let k = R.length;
    if (!bad()) return;
    const m = document.createElement('p');
    m.className = 'muted fm';
    m.style.margin = '.3rem 0 0';
    while (k > 1 && bad()) {
      R[--k].style.display = 'none';
      m.textContent = '+' + (R.length - k) + ' more';
      (R[k - 1] || p.querySelector('h2')).after(m);
    }
  });
}
export let liveSig = '';
export const sigOf = () =>
  JSON.stringify([
    state.deliveries.map((d) => [d.id, d.status, d.due]),
    state.contracts.map((c) => [c.id, c.stage, c.fit]),
    state.items.slice(0, 3).map((r) => r.uid + r.reqStatus),
  ]);
export function liveAfter() {
  liveSig = sigOf();
  fitLive();
  clearTimeout(liveAfter.t);
  liveAfter.t = setTimeout(fitLive, 700);
  $('#main').ondblclick = () => {
    if (document.body.classList.contains('tv')) toggleTV();
  };
}
export function toggleTV() {
  const on = document.body.classList.toggle('tv');
  if (on) {
    document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
  } else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  render();
}
export function liveReport() {
  const { td, D, J, od, dt, dw, jw } = liveData();
  printDoc('Factory Report', 'Deliveries and jobs in progress', [], [], {
    kind: 'Factory Report',
    ref: 'FAC-' + td.replace(/-/g, ''),
    sign: true,
    barcode: 'FAC-' + td.replace(/-/g, ''),
    kpis: [
      ['Due Today', dt.length],
      ['Overdue', od.length],
      ['Deliveries This Week', dw.length],
      ['Jobs In Progress', J.length],
      ['Jobs Due This Week', jw.length],
    ],
    tables: [
      {
        t: 'Outstanding Deliveries',
        h: ['Due', 'Supplier', 'Items', 'Job', 'Status'],
        r: D.map((x) => [
          fd(x.due) + (x.due < td ? ' (Overdue)' : ''),
          x.supplier,
          x.items,
          x.contract || '-',
          x.status,
        ]),
      },
      {
        t: 'Current Jobs',
        h: ['Job', 'Customer', 'Product', 'Stage', 'Fit Date'],
        r: J.map((c) => [c.id, c.name, c.product, c.stage, fd(c.fit)]),
      },
    ],
  });
}
/* start-up step (run once by main.js) */
export function listenForTvKeys() {
  document.addEventListener('keydown', (e) => {
    if (
      view != 'live' ||
      !document.body.classList.contains('tv') ||
      /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)
    )
      return;
    const b = BOARDS[+e.key - 1];
    if (b) {
      uiState.board = b[0];
      render();
    }
  });
}
/* start-up step (run once by main.js) */
export function startBoardTimers() {
  setInterval(() => {
    const c = $('#clk');
    if (c) c.textContent = new Date().toLocaleTimeString('en-GB');
  }, 1000);
  setInterval(() => {
    if (view != 'live' || $('.ov.open') || document.activeElement.matches('input,select,textarea')) return;
    if (sigOf() != liveSig) {
      render();
      return;
    }
    const u = $('#upd');
    if (u) u.textContent = new Date().toLocaleTimeString('en-GB');
  }, 10000);
  addEventListener('resize', () => {
    clearTimeout(window._rz);
    window._rz = setTimeout(() => {
      if (view == 'live' && !$('.ov.open')) render();
    }, 250);
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && document.body.classList.contains('tv')) {
      document.body.classList.remove('tv');
      render();
    }
  });
}
