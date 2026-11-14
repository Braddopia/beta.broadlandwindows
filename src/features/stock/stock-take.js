/* features/stock/stock-take: the Stock Take tab in Inventory.

   1. Import the stock sheet (the office Excel file: one sheet per area) or a CSV.
   2. Print count sheets by area, in the same layout, or export them back to Excel.
   3. Type the counts in (by area). Standard users count blind; managers can show system quantities.
   4. Check the differences, then a manager applies the counts to stock.
   Every stock take is kept, so next year's can be compared and its sheets printed straight away. */
import { onClick, onEvent } from '../../core/actions.js';
import { fd, nowT, today } from '../../core/dates.js';
import { $, $$, esc } from '../../core/dom.js';
import { money, sum } from '../../core/format.js';
import { ICONS, svg } from '../../core/icons.js';
import { uuid } from '../../core/ids.js';
import { readXlsx, sheetName, xlsxBlob } from '../../core/xlsx.js';
import { hex } from '../../config/colours.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { SAFE } from '../../data/sanitize.js';
import { state } from '../../data/state.js';
import { can } from '../../domain/permissions.js';
import { areaOf, colTxt, moveRow, prodRows, products, stkId, unitOf } from '../../domain/stock.js';
import {
  SHEET_COLS,
  SHEET_WIDTHS,
  areaLines,
  areaList,
  planImport,
  sheetLines,
  variance,
  varianceTotals,
} from '../../domain/stock-take.js';
import { srchMatch, srchText } from '../search/search.js';
import { need } from '../auth/session.js';
import { pagerH, paginate } from '../../ui/components/table.js';
import { download } from '../../ui/download.js';
import { form } from '../../ui/forms/form.js';
import { askYes, closeModal, openModal } from '../../ui/modal.js';
import { fitPage, printDoc, PRINT_BAR_CSS, printBar } from '../../print/print.js';
import { LOGO_SRC } from '../../core/assets.js';
import { html, raw } from '../../core/html.js';
import { company } from '../../data/company.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { uiState } from '../../ui/ui-state.js';

const UPLOAD = 'M12 16V4M6 10l6-6 6 6M4 20h16',
  PRINT = 'M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z';
/* ---- data ---- */
const takes = () => (state.stakes = Array.isArray(state.stakes) ? state.stakes : []);
/** the stock take being counted now, if any */
export const openTake = () => takes().find((t) => t.status == 'open') || null;
const areasNow = () => areaList(products(), state.stockAreas);

/* ---------------- the tab ---------------- */
export function vTake(tog) {
  const T = openTake(),
    Ad = can('money'),
    Own = can('manage');
  const tools = `<button class="btn ghost sm" data-act="takeImport">${svg(UPLOAD)}Import Stock Sheet</button><button class="btn ghost sm" data-act="takePrint">${svg(PRINT)}Count Sheets</button><button class="btn ghost sm" data-act="takeExport">Export To Excel</button>`;
  const head = `<div class="head"><div><h1>Inventory</h1><span class="muted">${T ? esc(T.name) + ' · started ' + fd(T.date) + ' by ' + esc(T.by) : 'Stock take'}</span></div><div class="tools">${tog}<span class="vs"></span>${tools}</div></div>`;
  const past = takes().filter((t) => t.status == 'done');
  const pastH = past.length
    ? `<div class="panel" style="margin-top:1rem"><h2>Previous Stock Takes</h2><div class="tw"><table><thead><tr><th>Stock Take</th><th>Date</th><th class="n">Lines Counted</th>${Ad ? '<th class="n">Difference</th>' : ''}<th>Applied By</th><th class="ac"></th></tr></thead><tbody>${past
        .slice()
        .reverse()
        .map(
          (t) =>
            `<tr><td><b>${esc(t.name)}</b></td><td>${fd(t.date)}</td><td class="n">${t.result ? t.result.counted : Object.keys(t.counts).length}</td>${Ad ? `<td class="n">${t.result ? money(t.result.diffValue) : '-'}</td>` : ''}<td>${esc(t.appliedBy || '-')}${t.appliedAt ? ' · ' + fd(new Date(t.appliedAt).toISOString().slice(0, 10)) : ''}</td><td class="ac"><div class="acts r"><button class="mini" ${onClick('takeReport', t.id)}>Report</button><button class="mini" ${onClick('takeExportRun', 'counts', t.id)}>Excel</button></div></td></tr>`
        )
        .join('')}</tbody></table></div></div>`
    : '';
  if (!T) {
    const P = products(),
      A = areasNow(),
      last = past[past.length - 1],
      per = Object.fromEntries(A.map((a) => [a, areaLines(P, a).length])),
      step = (n, t, d, btn) =>
        `<div class="tk-step"><span class="tk-n">${n}</span><b>${t}</b><p>${d}</p>${btn || ''}</div>`;
    return `${head}<div class="take-home">
    <div class="panel tk-hero"><div><h2>Stock Take</h2><p class="muted">Count everything area by area, check the differences, then put the counts into stock in one go.</p></div>
      <dl class="tk-facts"><div><dt>Products</dt><dd>${P.length}</dd></div><div><dt>Areas</dt><dd>${A.length}</dd></div>${Ad ? `<div><dt>Stock value</dt><dd>${money(P.reduce((s2, r) => s2 + (+r.stock || 0) * (+r.cost || 0), 0))}</dd></div>` : ''}<div><dt>Last stock take</dt><dd>${last ? esc(fd(last.date)) : 'None yet'}</dd></div></dl></div>
    <div class="tk-steps">
      ${step(1, 'Import The Stock Sheet', 'The office Excel file, one sheet per area. Or add products as usual.', '<button class="btn ghost sm" data-act="takeImport">Import Stock Sheet</button>')}
      ${step(2, 'Print Count Sheets', 'One sheet per area for the team to fill in by hand, or count on a tablet.', '<button class="btn ghost sm" data-act="takePrint">Print Count Sheets</button>')}
      ${step(3, 'Count', 'Type in the counts area by area. Standard users count blind, without the system figure.', Own ? '<button class="btn sm" data-act="takeStart">Start Stock Take</button>' : '<span class="muted">A manager starts the stock take</span>')}
      ${step(4, 'Check And Apply', 'Look over the differences, then a manager applies the counts to stock.', '')}
    </div>
    <div class="panel tk-areas-home"><h2><span>Areas To Count</span><small class="muted nocap">${P.length} lines</small></h2>${
      A.length
        ? `<div class="tk-ag">${A.map((a) => `<div class="tk-ac"><b>${esc(a)}</b><span>${per[a]} line${per[a] == 1 ? '' : 's'}</span></div>`).join('')}</div>`
        : '<p class="empty">No products yet. Import the stock sheet to begin.</p>'
    }</div>
    ${pastH}</div>`;
  }
  const U = uiState.take,
    P = products(),
    A = areaList(P, state.stockAreas),
    V = variance(T, P),
    tot = varianceTotals(V),
    byArea = Object.fromEntries(A.map((a) => [a, { n: 0, c: 0 }]));
  V.forEach((v) => {
    const b = byArea[areaOf(v.r)];
    if (b) {
      b.n++;
      if (v.counted != null) b.c++;
    }
  });
  if (U.area && !byArea[U.area]) U.area = '';
  const show = U.show && Own;
  const qq = (U.q || '').trim().toLowerCase();
  const order = areaLines(P, U.area),
    vm = new Map(V.map((v) => [v.r.pid, v])),
    L = order
      .map((r) => vm.get(r.pid))
      .filter(
        (v) =>
          (!qq || srchMatch(srchText(v.r), qq)) &&
          (U.f == 'all' || (U.f == 'todo' ? v.counted == null : U.f == 'diff' ? v.diff : v.counted != null))
      ),
    pg = paginate(U, L);
  const K = [
    ['Lines', tot.lines],
    ['Counted', tot.counted, tot.left ? '' : 'good'],
    ['Still To Count', tot.left, tot.left ? 'warn' : ''],
    ['Over', tot.over],
    ['Under', tot.under, tot.under ? 'bad' : ''],
    ...(Ad ? [['Difference', money(tot.diffValue), tot.diffValue < 0 ? 'bad' : '']] : []),
  ];
  const pct = tot.lines ? Math.round((tot.counted / tot.lines) * 100) : 0;
  const chip = (a, t, b) =>
    `<button class="tk-card ${U.area == a ? 'on' : ''} ${b && b.n && b.c == b.n ? 'done' : ''}" ${onClick('takeArea', a)}><b>${esc(t)}</b><small>${b ? b.c + ' of ' + b.n + (b.n && b.c == b.n ? ' · done' : '') : ''}</small><i style="width:${b && b.n ? Math.round((b.c / b.n) * 100) : 0}%"></i></button>`;
  const fch = (v, t) => `<button class="chip ${U.f == v ? 'on' : ''}" ${onClick('setUI', 'take.f', v)}>${t}</button>`;
  const rows = pg.rows
    .map((v) => {
      const r = v.r;
      return `<tr class="${v.counted != null ? 'tk-done' : ''}"><td><code>${esc(r.nocode ? '' : r.item)}</code></td><td><b>${esc(r.desc || r.item)}</b>${colTxt(r) != '-' || (r.length && r.length != '-') ? `<small class="idesc">${esc([r.length, colTxt(r)].filter((x) => x && x != '-').join(' · '))}</small>` : ''}</td><td class="c-sm">${esc(r.location && r.location != '-' ? r.location : '')}${U.area ? '' : `<small class="idesc">${esc(areaOf(r))}</small>`}</td>${show ? `<td class="n">${v.sys}</td>` : ''}<td class="n tk-in"><input class="cnt" type="number" inputmode="decimal" min="0" step="any" aria-label="Count for ${esc(r.item)}" value="${v.counted ?? ''}" data-pid="${esc(r.pid)}" ${onEvent('onchange', 'takeSet', r.pid, 'this.value')} ${onEvent('onkeydown', 'takeKey', 'event')}></td>${show ? `<td class="n ${v.diff > 0 ? 'up' : v.diff < 0 ? 'dn' : ''}">${v.diff == null ? '' : (v.diff > 0 ? '+' : '') + v.diff}</td>` : ''}<td class="c-sm muted">${esc(v.by || '')}</td></tr>`;
    })
    .join('');
  return `${head}
  <div class="kpis">${K.map((k) => `<div class="kpi ${k[2] || ''}"><small>${k[0]}</small><b>${k[1]}</b></div>`).join('')}</div>
  <div class="tk-prog"><i style="width:${pct}%"></i><span>${pct}% counted</span></div>
  <div class="tk-areas tk-cards">${chip('', 'All Areas', { n: tot.lines, c: tot.counted })}${A.map((a) => chip(a, a, byArea[a])).join('')}</div>
  <div class="invbar"><label class="invq">${svg(ICONS.search)}<input type="search" autocomplete="off" maxlength="80" placeholder="Find a line: code, description, location" aria-label="Find a line" value="${esc(U.q || '')}" ${onEvent('oninput', 'takeSearch', 'this.value')}></label>${fch('all', 'All')}${fch('todo', 'To Count')}${fch('done', 'Counted')}${Own ? fch('diff', 'Differences') : ''}</div>
  <div class="tw"><table class="ptb tk-t"><thead><tr><th>Stock Code</th><th>Description</th><th class="c-sm">Location</th>${show ? '<th class="n">System</th>' : ''}<th class="n">Counted</th>${show ? '<th class="n">Diff</th>' : ''}<th class="c-sm">Counted By</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="empty">No lines here.</td></tr>'}</tbody></table></div>
  ${pagerH('take', pg, 'lines')}
  <div class="acts tk-foot">${Own ? `<button class="btn ghost" data-act="takeShow">${show ? 'Hide' : 'Show'} System Quantities</button>` : ''}<button class="btn ghost" ${onClick('takeReport', T.id)}>Difference Report</button>${Own ? `<button class="btn ghost" style="color:var(--red)" data-act="takeCancel">Cancel Stock Take</button><button class="btn green" data-act="takeApply">Finish And Apply Counts</button>` : ''}</div>
  ${pastH}`;
}
export function takeArea(a) {
  uiState.take.area = a;
  uiState.take.page = 1;
  render();
}
export function takeSearch(v) {
  uiState.take.q = SAFE.text(v, 80);
  uiState.take.page = 1;
  render(true);
}
export function takeShow() {
  if (!need('manage', 'Showing system quantities')) return;
  uiState.take.show = !uiState.take.show;
  render();
}

/* ---------------- start, count, apply ---------------- */
export function takeStart() {
  if (!need('manage', 'Starting a stock take')) return;
  if (openTake()) return toast('A stock take is already running');
  const d = new Date();
  form(
    'Start Stock Take',
    [
      { k: 'name', l: 'Name', req: 1, max: 60, w: 'full' },
      { k: 'date', l: 'Count date', t: 'date', req: 1 },
    ],
    { name: 'Stock Take ' + d.toLocaleString('en-GB', { month: 'long', year: 'numeric' }), date: today() },
    (o) => {
      const snap = {};
      products().forEach((r) => (snap[r.pid] = { q: +r.stock || 0, c: +r.cost || 0 }));
      takes().push({
        id: 'ST-' + uuid().slice(0, 8),
        name: SAFE.text(o.name, 60),
        date: o.date,
        by: USER,
        status: 'open',
        counts: {},
        snap,
      });
      uiState.take = { ...uiState.take, area: '', f: 'all', page: 1, q: '' };
      audit('Stock take started', o.name, products().length + ' lines');
    }
  );
}
/** a count typed in (blank removes it) */
export function takeSet(pid, v) {
  const T = openTake();
  if (!T) return;
  const s = String(v ?? '').trim();
  if (s === '') delete T.counts[pid];
  else {
    const q = SAFE.num(s, { min: 0, max: 1e7, dp: 3 });
    if (q == null) return toast('Type a number');
    T.counts[pid] = { q, by: USER, at: Date.now() };
  }
  store();
  render(true);
}
/** Enter moves to the next count box */
export function takeKey(e) {
  if (e.key != 'Enter') return;
  e.preventDefault();
  const all = $$('#main input.cnt'),
    i = all.indexOf(e.target);
  e.target.blur();
  setTimeout(() => {
    const n = $$('#main input.cnt')[i + 1];
    if (n) {
      n.focus();
      n.select();
    }
  }, 30);
}
export function takeCancel() {
  if (!need('manage', 'Cancelling a stock take')) return;
  const T = openTake();
  if (!T) return;
  askYes(
    'Cancel ' + T.name + '?',
    Object.keys(T.counts).length + ' counts typed so far are thrown away. Stock is not changed.',
    'Cancel stock take',
    () => {
      state.stakes = takes().filter((t) => t !== T);
      audit('Stock take cancelled', T.name, Object.keys(T.counts).length + ' counts');
      store();
      render();
    },
    true
  );
}
export function takeApply() {
  if (!need('manage', 'Applying a stock take')) return;
  const T = openTake();
  if (!T) return;
  const P = products(),
    tot = varianceTotals(variance(T, P)),
    change = P.filter((r) => T.counts[r.pid] && T.counts[r.pid].q != r.stock).length;
  askYes(
    'Apply ' + tot.counted + ' counts?',
    `${change} product${change == 1 ? '' : 's'} change stock level. ${tot.left ? tot.left + ' lines were not counted and stay as they are. ' : ''}This finishes ${T.name}.`,
    'Apply counts',
    () => {
      const now = Date.now(),
        td = today();
      P.forEach((r) => {
        const c = T.counts[r.pid];
        if (!c) return;
        const was = +r.stock || 0;
        prodRows(r.pid).forEach((x) => Object.assign(x, { lastCount: c.q, countedAt: td, countedBy: c.by }));
        if (c.q != was)
          state.items.unshift(
            moveRow(prodRows(r.pid)[0], c.q > was ? 'add' : 'remove', Math.abs(c.q - was), c.q, {
              note: T.name + ' (counted ' + c.q + ', was ' + was + ')',
              stake: T.id,
            })
          );
      });
      Object.assign(T, { status: 'done', appliedBy: USER, appliedAt: now, result: tot });
      audit(
        'Stock take applied',
        T.name,
        tot.counted + ' counted, ' + change + ' changed, difference ' + money(tot.diffValue)
      );
      store();
      render();
      toast(T.name + ' applied');
    }
  );
}

/* ---------------- import ---------------- */
let pending = null;
export function takeImport() {
  openModal(
    `<h2>Import Stock Sheet</h2><p class="muted">Use the stock-take Excel file: one sheet per area, with the columns <b>Stock Code, Description, Quantity In Stock, Location, Notes</b>. A CSV with the same headings works too (add an <b>Area</b> column). Supplier, Cost and Unit columns are read if they are there.</p><div class="ff"><label class="btn ghost">${svg(UPLOAD)}Choose File<input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden ${onEvent('onchange', 'takeFile', 'this')}></label></div><p class="muted" id="tkMsg"></p><div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button></div>`,
    'md'
  );
}
/* CSV: quoted fields, commas or tabs */
function parseCsv(text) {
  const rows = [];
  let row = [],
    cell = '',
    q = false;
  const sep =
    (text.split('\n')[0].match(/\t/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? '\t' : ',';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch == '"' && text[i + 1] == '"') {
        cell += '"';
        i++;
      } else if (ch == '"') q = false;
      else cell += ch;
    } else if (ch == '"') q = true;
    else if (ch == sep) {
      row.push(cell);
      cell = '';
    } else if (ch == '\n' || ch == '\r') {
      if (ch == '\r' && text[i + 1] == '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
export async function takeFile(inp) {
  const f = inp.files && inp.files[0],
    msg = $('#tkMsg');
  if (!f) return;
  if (f.size > 15e6) return toast('That file is too big (15 MB at most)');
  if (msg) msg.textContent = 'Reading ' + f.name + '…';
  try {
    const sheets = /\.csv$/i.test(f.name)
      ? [{ name: f.name.replace(/\.[^.]+$/, ''), rows: parseCsv((await f.text()).replace(/^\uFEFF/, '')) }]
      : await readXlsx(f);
    const { lines, dups } = sheetLines(sheets);
    if (!lines.length) {
      if (msg) msg.textContent = 'No stock lines found. Check the sheets have a Stock Code or Description heading.';
      return;
    }
    if (lines.length > 20000) return toast('That is more than 20,000 lines: split the file');
    const plan = planImport(lines, products()),
      T = openTake(),
      areas = [...new Set(lines.map((l) => l.area))];
    pending = { lines, plan, areas, file: f.name };
    const qtyOpt = plan.withQty
      ? T
        ? `<label class="cbl"><input type="checkbox" id="tkQ" checked> Record the ${plan.withQty} quantities as counts in <b>${esc(T.name)}</b></label>`
        : can('manage')
          ? `<label class="cbl"><input type="checkbox" id="tkQ"> Set stock levels to the ${plan.withQty} quantities in the file now</label>`
          : `<p class="muted">${plan.withQty} quantities in the file are ignored: start a stock take to record them as counts.</p>`
      : '';
    openModal(
      `<h2>Import ${esc(f.name)}</h2><div class="kpis"><div class="kpi"><small>Lines</small><b>${lines.length}</b></div><div class="kpi"><small>New Products</small><b>${plan.create.length}</b></div><div class="kpi"><small>Updated</small><b>${plan.update.length}</b></div><div class="kpi"><small>Areas</small><b>${areas.length}</b></div></div><p class="muted">Areas: ${areas.map(esc).join(', ')}.${dups ? ' ' + dups + ' repeated lines in the same area were merged.' : ''}</p><div class="ff"><label class="cbl"><input type="checkbox" id="tkU" checked> Update descriptions and locations of existing products from the file</label>${qtyOpt}</div><div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" data-act="takeImportRun">Import ${lines.length} Lines</button></div>`,
      'md'
    );
  } catch (e) {
    if (msg) msg.textContent = 'Could not read that file: ' + e.message;
    else toast('Could not read that file: ' + e.message);
  }
}
export function takeImportRun() {
  if (!pending) return;
  const { plan, areas, file } = pending,
    upd = $('#tkU') && $('#tkU').checked,
    useQty = $('#tkQ') && $('#tkQ').checked,
    T = openTake(),
    setNow = useQty && !T && can('manage');
  pending = null;
  const order = (state.stockAreas = Array.isArray(state.stockAreas) ? state.stockAreas : []);
  areas.forEach((a) => !order.includes(a) && order.push(a));
  const t = nowT(),
    now = Date.now();
  let counts = 0,
    changed = 0;
  const count = (r, q) => {
    if (q == null) return;
    if (T && useQty) {
      T.counts[r.pid] = { q, by: USER, at: now, from: file };
      if (!T.snap[r.pid]) T.snap[r.pid] = { q: +r.stock || 0, c: +r.cost || 0 };
      counts++;
    } else if (setNow && q != r.stock) {
      state.items.unshift(
        moveRow(r, q > r.stock ? 'add' : 'remove', Math.abs(q - r.stock), q, { note: 'Set from ' + file })
      );
      changed++;
    }
  };
  plan.update.forEach(({ line: l, r }) => {
    const patch = { area: l.area, seq: l.seq };
    if (upd) {
      if (l.desc) patch.desc = SAFE.text(l.desc, 160);
      if (l.loc) patch.location = SAFE.text(l.loc, 60);
      if (l.supplier) patch.supplier = SAFE.text(l.supplier, 80);
      if (l.unit) patch.unit = SAFE.text(l.unit, 20);
      if (l.notes && !r.notes) patch.notes = SAFE.text(l.notes, 500);
      if (l.cost != null && can('money')) patch.cost = SAFE.num(l.cost, { max: 1e6 }) || 0;
    }
    prodRows(r.pid).forEach((x) => Object.assign(x, patch));
    count(prodRows(r.pid)[0], l.qty);
  });
  const fresh = [];
  plan.create.forEach(({ line: l }) => {
    const code = SAFE.code(l.code),
      row = {
        at: now,
        time: t,
        type: 'import',
        flag: false,
        uid: uuid(),
        pid: stkId(),
        user: USER,
        qty: 0,
        unit: SAFE.text(l.unit, 20) || 'Each',
        item: code || SAFE.text(l.desc, 64),
        nocode: !code || undefined,
        desc: SAFE.text(l.desc, 160),
        area: SAFE.text(l.area, 40),
        seq: l.seq,
        length: '-',
        cInName: SAFE.text(l.cIn, 30) || '-',
        cIn: l.cIn ? hex(l.cIn) : '',
        cOutName: SAFE.text(l.cOut, 30) || '-',
        cOut: l.cOut ? hex(l.cOut) : '',
        stock: 0,
        cost: can('money') && l.cost != null ? SAFE.num(l.cost, { max: 1e6 }) || 0 : 0,
        location: SAFE.text(l.loc, 60) || '-',
        barcode: code,
        supplier: SAFE.text(l.supplier, 80),
        reorder: 0,
        notes: SAFE.text(l.notes, 500),
      };
    state.items.unshift(row);
    fresh.push([row, l.qty]);
  });
  fresh.forEach(([r, q]) => count(r, q));
  audit(
    'Stock sheet imported',
    file,
    `${plan.create.length} new, ${plan.update.length} updated${counts ? ', ' + counts + ' counts' : ''}${changed ? ', ' + changed + ' stock levels set' : ''}`
  );
  store();
  closeModal();
  render();
  toast(
    `${plan.create.length} new and ${plan.update.length} updated${counts ? ', ' + counts + ' counts recorded' : ''}`
  );
}

/* ---------------- count sheets: print ---------------- */
export function takePrint() {
  const A = areasNow(),
    Own = can('manage'),
    T = openTake();
  if (!products().length) return toast('No products to print yet');
  const opt = (id, t, sub, on = true) =>
    html`<label class="chc"><input type="checkbox" id="${id}"${raw(on ? '' : ' disabled')}><span><b>${t}</b><small>${sub}</small></span></label>`;
  openModal(
    String(html`<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>Print Count Sheets</h2>
    <p class="muted">One sheet per area in the stock-take layout, ready for the team to fill in.</p>
    <div class="grid">
      <div class="ff full"><label for="tkA">Area</label><select id="tkA"><option value="">All areas (${A.length})</option>${A.map((a) => html`<option value="${a}"${raw(uiState.take.area == a ? ' selected' : '')}>${a}</option>`)}</select></div>
      <div class="ff"><label for="tkB">Blank lines after each area</label><input id="tkB" type="number" min="0" max="40" value="5"></div>
      <div class="ff"><label for="tkN">Extra blank sheets</label><input id="tkN" type="number" min="0" max="10" value="0"></div>
      <fieldset class="ff full paidq"><legend>On The Sheet</legend><div class="chq">${Own ? opt('tkS', 'System quantity', 'For checking, not for a blind count') : ''}${opt('tkC', 'Counts already typed', T ? 'From ' + T.name : 'No stock take running', !!T)}</div></fieldset>
    </div>
    <div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" data-act="takePrintRun">Print</button></div>`),
    'md'
  );
}
/* the count sheet, in the company style but kept plain: a slim navy band with the logo, the area as the title,
   boxes for who counted and checked, then the lines with a highlighted box to write the count in */
const SHEET_CSS = `@page{size:A4 portrait;margin:9mm 9mm 12mm}*{box-sizing:border-box}
body{margin:0;font:9.5pt/1.35 "Segoe UI",Inter,Arial,sans-serif;color:#13233a;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-variant-numeric:tabular-nums}
section{break-after:page;padding:6mm 0}section:last-child{break-after:auto}
.band{display:flex;align-items:center;justify-content:space-between;gap:6mm;padding:3.2mm 5mm;border-radius:2.5mm;background:linear-gradient(120deg,#011a36,#012b59 60%,#023f86);border-bottom:1mm solid #ffd002;color:#fff}
.band img{height:7.5mm;display:block}.band .tg{font-size:7pt;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#ffd002}
.sh{display:flex;justify-content:space-between;align-items:flex-end;gap:6mm;margin:5mm 0 4mm}
.sh h1{margin:0;font:600 18pt/1.1 "Segoe UI",Inter,Arial,sans-serif;color:#012b59;letter-spacing:-.01em}.sh .sub{margin-top:1mm;font-size:9pt;color:#5a6a82}
.who{display:grid;grid-template-columns:repeat(3,34mm);gap:3mm}.who div{border:.3mm solid #c9d3e0;border-radius:1.5mm;padding:1.2mm 2mm 5.5mm}.who span{font-size:6.8pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6b7a90}
table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}
th{background:#012b59;color:#fff;font-size:8pt;font-weight:600;text-align:left;padding:2mm 2mm;letter-spacing:.02em}
th:first-child{border-radius:1.5mm 0 0 0}th:last-child{border-radius:0 1.5mm 0 0}
td{border-bottom:.25mm solid #d5dde8;padding:1.4mm 2mm;height:8mm;vertical-align:middle;overflow:hidden}
tbody tr:nth-child(even) td{background:#f5f8fc}
td.c{font-family:Consolas,"Courier New",monospace;font-size:8.8pt;font-weight:600;color:#012b59}td.n{text-align:right;color:#5a6a82}
td.q{text-align:center;font-weight:700;font-size:11pt;background:#fffbe6!important;border-left:.4mm solid #ffd002;border-right:.4mm solid #ffd002}
td small{display:block;color:#6b7a90;font-size:7.6pt}
.ft{display:flex;justify-content:space-between;margin:2.5mm 0 0;font-size:7.6pt;color:#6b7a90}
@media print{.tb{display:none}section{padding:0}}`;
export function takePrintRun() {
  const area = $('#tkA').value,
    blanks = Math.min(40, Math.max(0, +$('#tkB').value || 0)),
    extra = Math.min(10, Math.max(0, +$('#tkN').value || 0)),
    sys = !!($('#tkS') && $('#tkS').checked && can('manage')),
    withCounts = !!($('#tkC') && $('#tkC').checked),
    T = openTake(),
    title = T ? T.name : 'Stock Take ' + new Date().getFullYear(),
    P = products(),
    A = area ? [area] : areaList(P, state.stockAreas),
    printed = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  closeModal();
  const w = window.open('', '_blank');
  if (!w) return toast('Allow pop-ups to print count sheets');
  const head = `<tr><th>Stock Code</th><th>Description</th>${sys ? '<th>System</th>' : ''}<th>Quantity In Stock</th><th>Location</th><th>Notes</th></tr>`,
    blankRow = `<tr class="b"><td></td><td></td>${sys ? '<td></td>' : ''}<td class="q"></td><td></td><td></td></tr>`;
  const sheet = (a, L) =>
    `<section><div class="band"><img src="${LOGO_SRC.white}" alt="Broadland"><span class="tg">Stock Take · Count Sheet</span></div>
    <div class="sh"><div><h1>${esc(a)}</h1><div class="sub">${esc(title)} · printed ${esc(printed)}</div></div><div class="who"><div><span>Counted by</span></div><div><span>Checked by</span></div><div><span>Date</span></div></div></div>
    <table><colgroup><col style="width:17%"><col>${sys ? '<col style="width:9%">' : ''}<col style="width:15%"><col style="width:13%"><col style="width:15%"></colgroup><thead>${head}</thead><tbody>${L.map(
      (r) =>
        `<tr><td class="c">${esc(r.nocode ? '' : r.item)}</td><td>${esc(r.desc || r.item)}${(r.length && r.length != '-') || colTxt(r) != '-' ? `<small>${esc([r.length, colTxt(r)].filter((x) => x && x != '-').join(' · '))}</small>` : ''}</td>${sys ? `<td class="n">${r.stock}</td>` : ''}<td class="q">${withCounts && T && T.counts[r.pid] ? T.counts[r.pid].q : ''}</td><td>${esc(r.location && r.location != '-' ? r.location : '')}</td><td>${esc(r.notes && r.notes.length < 40 ? r.notes : '')}</td></tr>`
    ).join(
      ''
    )}${blankRow.repeat(blanks)}</tbody></table><p class="ft"><span>${L.length} lines · ${esc(unitNote(L))}</span><span>Broadland Windows · ${esc(company.tel)}</span></p></section>`;
  const body =
    A.map((a) => sheet(a, areaLines(P, a))).join('') +
    Array.from({ length: extra }, () =>
      sheet('Blank Sheet', []).replace('<tbody>', '<tbody>' + blankRow.repeat(26))
    ).join('');
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} Count Sheets</title><style>${SHEET_CSS}
${PRINT_BAR_CSS}</style></head><body>${printBar('Count Sheets')}${body}</body></html>`
  );
  w.document.close();
  fitPage(w);
}
const unitNote = (L) => {
  const u = [...new Set(L.map(unitOf))];
  return u.length == 1 ? 'counted in ' + u[0] : 'count in each line’s own unit';
};

/* ---------------- Excel export ---------------- */
export function takeExport() {
  const T = openTake(),
    Ad = can('money');
  openModal(
    `<h2>Export To Excel</h2><p class="muted">One sheet per area, in the stock-take layout.</p><div class="rl"><button class="rb" ${onClick('takeExportRun', 'blank')}><b>Blank Count Sheets</b><span>Ready to print or send out</span></button>${T ? `<button class="rb" ${onClick('takeExportRun', 'counts', T.id)}><b>With Counts So Far</b><span>${esc(T.name)}</span></button>` : ''}<button class="rb" ${onClick('takeExportRun', 'stock')}><b>Current Stock Levels</b><span>Quantity column filled from the system</span></button>${Ad ? `<button class="rb" ${onClick('takeExportRun', 'value')}><b>Stock Valuation</b><span>Value = cost × quantity on every line, a total per area and a Company Value sheet</span></button>` : ''}</div><div class="mact"><button class="btn ghost" data-act="closeModal">Close</button></div>`,
    'md'
  );
}
export function takeExportRun(kind, id) {
  const P = products(),
    T = id ? takes().find((t) => t.id == id) : openTake(),
    val = kind == 'value' && can('money'),
    A = areaList(P, state.stockAreas),
    used = new Set();
  const qty = (r) =>
    kind == 'counts'
      ? T && T.counts[r.pid]
        ? T.counts[r.pid].q
        : null
      : kind == 'stock' || val
        ? +r.stock || 0
        : null;
  const code = (r) => (r.nocode ? '' : r.item),
    desc = (r) =>
      r.desc ||
      (r.nocode ? r.item : [r.cOutName, r.cInName].every((c) => c && c != '-') ? r.cOutName + ' / ' + r.cInName : ''),
    loc = (r) => (r.location && r.location != '-' ? r.location : '');
  const sheets = A.map((a) => {
    const name = sheetName(a, used),
      L = areaLines(P, a);
    if (!val)
      return {
        name,
        title: a + ' · ' + (T ? T.name : 'Stock Take'),
        header: true,
        widths: SHEET_WIDTHS,
        rows: [SHEET_COLS, ...L.map((r) => [code(r), desc(r), qty(r), loc(r), r.notes || ''])],
      };
    /* the office valuation layout: Value = Cost x Quantity on every line, sheet total in I1 */
    const total = Math.round(sum(L, (r) => (+r.stock || 0) * (+r.cost || 0)) * 100) / 100;
    return {
      name,
      title: a + ' · Stock Valuation',
      header: true,
      widths: [17, 50, 17, 12, 12, 10, 22, 12, 14],
      rows: [
        [...VALUE_COLS, { f: 'SUM(E:E)', v: total }],
        ...L.map((r, i) => {
          const n = i + 2,
            q = +r.stock || 0,
            c = +r.cost || 0;
          return [
            code(r),
            desc(r),
            q,
            loc(r),
            { f: `F${n}*C${n}`, v: Math.round(q * c * 100) / 100 },
            c,
            r.supplier || '',
          ];
        }),
      ],
      total,
    };
  });
  if (val) {
    const ref = (s) => `'${s.name.replace(/'/g, "''")}'!I1`,
      grand = Math.round(sum(sheets, (s) => s.total) * 100) / 100;
    sheets.push({
      name: sheetName('Company Value', used),
      header: true,
      widths: [26, 16],
      rows: [
        ['Area', 'Value'],
        ...sheets.map((s) => [s.name, { f: ref(s), v: s.total }]),
        ['Total Value', { f: `SUM(B2:B${sheets.length + 1})`, v: grand }],
      ],
    });
  }
  if (kind == 'blank')
    sheets.push({
      name: sheetName('Blanks', used),
      header: true,
      widths: SHEET_WIDTHS,
      rows: [SHEET_COLS, ...Array.from({ length: 40 }, () => [])],
    });
  const name =
    (T && kind == 'counts'
      ? T.name
      : kind == 'value'
        ? 'Stock Valuation'
        : kind == 'stock'
          ? 'Stock Levels'
          : 'Stock Take Sheets') +
    ' ' +
    today();
  download(name.replace(/[^\w -]+/g, '') + '.xlsx', xlsxBlob(sheets));
  closeModal();
  audit('Stock sheets exported', name, sheets.length + ' sheets');
  toast('Exported ' + sheets.length + ' sheets');
}
const VALUE_COLS = [
  'Stock Code',
  'Description',
  'Quantity In Stock',
  'Location',
  'Value',
  'Cost',
  'Supplier',
  'Total Value',
];

/* ---------------- difference report ---------------- */
export function takeReport(id) {
  const T = takes().find((t) => t.id == id);
  if (!T) return;
  const Ad = can('money'),
    P = products(),
    V = variance(T, P).filter((v) => T.status == 'open' || v.counted != null || T.snap[v.r.pid]),
    tot = T.status == 'done' && T.result ? T.result : varianceTotals(V),
    A = areaList(P, state.stockAreas);
  const hd = ['Code', 'Description', 'Location', 'System', 'Counted', 'Diff', ...(Ad ? ['Cost', 'Value'] : [])],
    row = (v) => [
      v.r.nocode ? '' : v.r.item,
      v.r.desc || v.r.item,
      v.r.location && v.r.location != '-' ? v.r.location : '',
      v.sys,
      v.counted ?? '-',
      v.diff == null ? '-' : (v.diff > 0 ? '+' : '') + v.diff,
      ...(Ad ? [money(v.cost), v.diff == null ? '-' : money(v.value)] : []),
    ];
  const tables = A.map((a) => {
    const L = V.filter((v) => areaOf(v.r) == a && v.diff),
      left = V.filter((v) => areaOf(v.r) == a && v.counted == null).length;
    return L.length || left
      ? {
          t: `${a}: ${L.length} difference${L.length == 1 ? '' : 's'}${left ? ', ' + left + ' not counted' : ''}${Ad ? ', ' + money(sum(L, (v) => v.value)) : ''}`,
          h: hd,
          r: L.map(row),
        }
      : null;
  }).filter(Boolean);
  const notCounted = V.filter((v) => v.counted == null);
  if (notCounted.length && T.status == 'open')
    tables.push({
      t: 'Not Counted Yet (' + notCounted.length + ')',
      h: ['Code', 'Description', 'Area', 'Location'],
      r: notCounted
        .slice(0, 400)
        .map((v) => [v.r.nocode ? '' : v.r.item, v.r.desc || v.r.item, areaOf(v.r), v.r.location || '']),
    });
  printDoc(
    T.name + ': Differences',
    (T.status == 'done' ? 'Applied' : 'In progress') + ' · counted ' + fd(T.date),
    [],
    [],
    {
      kind: 'Stock Take',
      ref: T.id,
      sign: true,
      kpis: [
        ['Lines', tot.lines],
        ['Counted', tot.counted],
        ['Over', tot.over],
        ['Under', tot.under],
        ...(Ad
          ? [
              ['Difference', money(tot.diffValue)],
              ['Counted Value', money(tot.countValue)],
            ]
          : []),
      ],
      tables: tables.length
        ? tables
        : [{ t: 'No Differences', h: ['Result'], r: [['Every counted line matches the system.']] }],
    }
  );
}
