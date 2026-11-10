/* features/cutting/cutting: Panel Optimiser. Enter the boards in stock and the pieces to cut; the plan
   (domain/cutlist.js) shows each board with its pieces drawn to scale, how many boards are needed and
   the waste. Everything updates as you type. The current list is kept, named cut lists can be saved
   and opened, and the plan prints on the company's standard A4 report. */
import { onClick, onEvent } from '../../core/actions.js';
import { fd, today } from '../../core/dates.js';
import { $ } from '../../core/dom.js';
import { html, raw } from '../../core/html.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { SAFE } from '../../data/sanitize.js';
import { state } from '../../data/state.js';
import { optimise } from '../../domain/cutlist.js';
import { printDoc } from '../../print/print.js';
import { fieldControl } from '../../ui/forms/fields.js';
import { form } from '../../ui/forms/form.js';
import { askIn, closeModal, openModal } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';

/* the boards the company buys most, one click to add (length x width, mm) */
export const PRESETS = [
  { label: 'Smarts Aluminium Full', L: 2400, W: 1200 },
  { label: 'Smarts Aluminium Half', L: 1195, W: 1200 },
];
const BLANK = () => ({
  name: '',
  kerf: 3,
  trim: 10,
  sheets: [{ ...PRESETS[0], qty: 0 }],
  parts: [
    { label: 'Side', L: 720, W: 560, qty: 2, turn: true },
    { label: 'Shelf', L: 764, W: 540, qty: 3, turn: true },
  ],
});
/** the cut list being worked on (kept with the rest of the data) */
export function cutData() {
  if (!state.cut || !Array.isArray(state.cut.sheets) || !Array.isArray(state.cut.parts))
    state.cut = { ...BLANK(), jobs: (state.cut && state.cut.jobs) || [] };
  state.cut.jobs = state.cut.jobs || [];
  return state.cut;
}
const COLS = {
  sheets: [
    ['label', 'Board', 'text'],
    ['L', 'Length', 'number'],
    ['W', 'Width', 'number'],
    ['qty', 'How Many', 'number'],
  ],
  parts: [
    ['label', 'Name', 'text'],
    ['L', 'Length', 'number'],
    ['W', 'Width', 'number'],
    ['qty', 'How Many', 'number'],
    ['turn', 'Can Turn', 'select'],
  ],
};
/* one colour per piece name, so the same piece looks the same on every board */
const HUES = [212, 172, 262, 38, 328, 192, 148, 14, 234, 52];
const hue = (s) => HUES[[...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7) % HUES.length];
const mm = (n) => (Math.round(n * 10) / 10).toLocaleString('en-GB');
const m2 = (n) => (n / 1e6).toFixed(2) + ' m²';

/** one board drawn to scale. On screen: a dark cutting mat with a fine grid and glossy pieces;
    printed (print = true): light, so it uses little ink */
export function boardSvg(b, i, print) {
  const fs = Math.max(14, Math.min(b.L, b.W) / 22),
    id = 'cb' + i + (print ? 'p' : ''),
    hues = [...new Set(b.pieces.map((p) => hue(p.label)))],
    grid = Math.max(50, Math.round(Math.max(b.L, b.W) / 24 / 50) * 50);
  return html`<svg class="cut-b ${print ? 'pr' : ''}" viewBox="-4 -4 ${b.L + 8} ${b.W + 8}" role="img" aria-label="Board ${i + 1}: ${b.sheet}, ${b.pieces.length} pieces">
    <defs>
      <pattern id="${id}g" width="${grid}" height="${grid}" patternUnits="userSpaceOnUse"><path d="M ${grid} 0 L 0 0 0 ${grid}" class="gl"/></pattern>
      ${hues.map(
        (h) =>
          html`<linearGradient id="${id}h${h}" x1="0" y1="0" x2="0" y2="1">${
            print
              ? html`<stop offset="0" stop-color="hsl(${h} 70% 90%)"/><stop offset="1" stop-color="hsl(${h} 60% 80%)"/>`
              : html`<stop offset="0" stop-color="hsl(${h} 72% 62%)"/><stop offset="1" stop-color="hsl(${h} 62% 42%)"/>`
          }</linearGradient>`
      )}
    </defs>
    <rect class="bd" x="0" y="0" width="${b.L}" height="${b.W}" rx="${print ? 0 : 6}"/>
    <rect x="0" y="0" width="${b.L}" height="${b.W}" fill="url(#${id}g)"/>
    ${b.pieces.map((p) => {
      const small = p.l < fs * 4 || p.w < fs * 1.6,
        r = Math.min(8, Math.min(p.l, p.w) * 0.04);
      return html`<g class="pc"><rect x="${p.x}" y="${p.y}" width="${p.l}" height="${p.w}" rx="${print ? 0 : r}" fill="url(#${id}h${hue(p.label)})" style="stroke:hsl(${hue(p.label)} ${print ? '45% 40%' : '90% 85%'})"/>${
        small
          ? ''
          : html`<text x="${p.x + p.l / 2}" y="${p.y + p.w / 2 - fs * 0.15}" style="font-size:${fs}px">${p.label}</text><text class="sz" x="${p.x + p.l / 2}" y="${p.y + p.w / 2 + fs * 1}" style="font-size:${fs * 0.78}px">${mm(p.l)} × ${mm(p.w)}${p.rot ? ' ↻' : ''}</text>`
      }<title>${p.label}: ${mm(p.l)} × ${mm(p.w)} mm${p.rot ? ' (turned)' : ''}</title></g>`;
    })}
  </svg>`;
}
function table(kind, rows) {
  const C = COLS[kind];
  return html`<div class="cut-t"><table><colgroup>${C.map(([k]) => html`<col class="c-${k}">`)}<col class="c-x"></colgroup><thead><tr>${C.map(
    ([k, l]) => html`<th class="${k == 'label' || k == 'turn' ? '' : 'n'}">${l}</th>`
  )}<th></th></tr></thead><tbody>${rows.map(
    (r, i) =>
      html`<tr>${C.map(([k, , t]) => {
        const f =
          t == 'select'
            ? {
                k: '',
                t: 'select',
                o: [
                  ['yes', 'Yes'],
                  ['no', 'No (grain)'],
                ],
              }
            : { k: '', t, max: t == 'number' ? 100000 : 60 };
        const v = k == 'turn' ? (r.turn === false ? 'no' : 'yes') : r[k];
        return html`<td class="${t == 'number' ? 'n' : ''}">${raw(fieldControl(f, v, { id: 'cut_' + kind + '_' + i + '_' + k }))}</td>`;
      })}<td><button class="cut-x" aria-label="Remove row ${i + 1}" title="Remove" ${raw(onClick('cutDel', kind, i))}>&times;</button></td></tr>`
  )}</tbody></table></div>`;
}
/** the plan side: totals, warnings and every board. Redrawn on its own as you type */
export function cutResults() {
  const D = cutData(),
    R = optimise(D),
    S = R.stats,
    pct = Math.round(S.efficiency * 100);
  return (
    String(html`
    ${R.unplaced.length ? html`<div class="note bad"><b>${R.unplaced.length} piece${R.unplaced.length == 1 ? '' : 's'} would not fit:</b> ${[...new Set(R.unplaced.map((u) => u.label + ' (' + mm(u.L) + ' × ' + mm(u.W) + ')'))].join(', ')}. Add a bigger board, more boards, or let them turn.</div>` : ''}
    ${R.boards.map(
      (b, i) =>
        html`<div class="panel cut-bp"><h2><span>Board ${i + 1} <span class="muted">of ${R.boards.length}</span> · ${b.sheet}</span><small class="muted nocap">${mm(b.L)} × ${mm(b.W)} mm · ${b.pieces.length} pieces · ${Math.round((b.used / b.area) * 100)}% used</small></h2><div class="cut-frame">${boardSvg(b, i)}</div></div>`
    )}
    ${R.boards.length ? '' : html`<div class="panel"><p class="empty">Add a board and some pieces to see the plan.</p></div>`}
  `) + `<template id="cutK">${kpis(S, pct)}</template>`
  );
}
const kpis = (S, pct) =>
  String(
    html`<div class="kpi"><small>Boards Needed</small><b>${S.boards}</b>${S.byType.length ? html`<span class="ksub">${S.byType.map((t) => t.used + ' × ' + t.label).join(' · ')}</span>` : ''}</div><div class="kpi"><small>Pieces Placed</small><b>${S.pieces}</b>${S.unplaced ? html`<span class="ksub">${S.unplaced} not placed</span>` : ''}</div><div class="kpi ${pct < 60 && S.boards ? 'warn' : ''}"><small>Board Used</small><b>${pct}%</b><span class="cut-meter"><i style="width:${pct}%"></i></span></div><div class="kpi"><small>Waste</small><b>${m2(S.waste)}</b></div>`
  );
export function vCutting() {
  const D = cutData(),
    S = optimise(D).stats;
  return String(html`<div class="head"><div><h1>Panel Optimiser</h1><span class="muted" id="cutSub">${D.name ? D.name + ' · ' : ''}Plan how to cut pieces from whole boards with the least waste</span></div>
    <div class="tools"><button class="mini" ${raw(onClick('cutJobs'))}>Saved Lists (${D.jobs.length})</button><button class="mini" ${raw(onClick('cutNew'))}>New List</button><button class="mini" ${raw(onClick('cutSave'))}>Save</button><button class="btn" ${raw(onClick('cutPrint'))}>Print Plan</button></div></div>
  <div class="kpis cut-k" id="cutKpis">${raw(kpis(S, Math.round(S.efficiency * 100)))}</div>
  <div class="cut">
    <div class="cut-in" ${raw(onEvent('oninput', 'cutEdit', 'event'))} ${raw(onEvent('onchange', 'cutEdit', 'event'))}>
      <div class="panel"><h2><span>Boards In Stock</span><small class="muted nocap">mm · how many 0 = as many as needed</small></h2>${table('sheets', D.sheets)}
        <div class="cut-add"><button class="mini" ${raw(onClick('cutAdd', 'sheets'))}>+ Add Board</button>${PRESETS.map(
          (p, i) =>
            html`<button class="mini cut-pre" ${raw(onClick('cutPreset', i))}><b>${p.label}</b> <span class="nocap">${p.W} × ${p.L} mm</span></button>`
        )}</div></div>
      <div class="panel"><h2><span>Pieces To Cut</span><small class="muted nocap">mm</small></h2>${table('parts', D.parts)}
        <div class="cut-add"><button class="mini" ${raw(onClick('cutAdd', 'parts'))}>+ Add Piece</button></div></div>
      <div class="panel cut-o"><h2><span>Options</span><small class="muted nocap">mm</small></h2><div class="cut-og">
        <div class="ff"><label for="cut_opt_kerf">Saw Blade Width</label>${raw(fieldControl({ k: '', t: 'number', max: 20 }, D.kerf, { id: 'cut_opt_kerf' }))}</div>
        <div class="ff"><label for="cut_opt_trim">Edge Trim Each Side</label>${raw(fieldControl({ k: '', t: 'number', max: 100 }, D.trim, { id: 'cut_opt_trim' }))}</div>
      </div></div>
    </div>
    <div class="cut-out" id="cutOut">${raw(cutResults())}</div>
  </div>`);
}
/* redraw only the plan and the totals, so the box being typed in keeps its place */
let saveT = 0;
function refresh() {
  const o = $('#cutOut'),
    k = $('#cutKpis');
  if (!o) return render(true);
  o.innerHTML = cutResults();
  const t = $('#cutK');
  if (t && k) {
    k.innerHTML = t.innerHTML;
    t.remove();
  }
  clearTimeout(saveT);
  saveT = setTimeout(store, 400);
}
/* a box changed: read it back into the list (ids are cut_<kind>_<row>_<field>) */
export function cutEdit(e) {
  const t = e && e.target,
    m = t && /^cut_(sheets|parts|opt)_(\w+?)(?:_(\w+))?$/.exec(t.id);
  if (!m) return;
  const D = cutData();
  if (m[1] == 'opt') D[m[2]] = SAFE.num(t.value, { min: 0, max: m[2] == 'kerf' ? 20 : 100, dp: 1 }) ?? 0;
  else {
    const r = D[m[1]][+m[2]],
      k = m[3];
    if (!r) return;
    if (k == 'label') r.label = SAFE.text(t.value, 60);
    else if (k == 'turn') r.turn = t.value != 'no';
    else r[k] = SAFE.num(t.value, { min: 0, max: k == 'qty' ? 5000 : 100000, dp: k == 'qty' ? 0 : 1 }) ?? 0;
  }
  refresh();
}
export function cutAdd(kind) {
  const D = cutData();
  if (!D[kind] || D[kind].length >= 200) return;
  D[kind].push(
    kind == 'sheets'
      ? { label: 'Board', L: 2400, W: 1200, qty: 0 }
      : { label: 'Piece ' + (D.parts.length + 1), L: 500, W: 300, qty: 1, turn: true }
  );
  store();
  render(true);
}
/* one of the usual boards (if it is already listed, nothing changes) */
export function cutPreset(i) {
  const D = cutData(),
    p = PRESETS[i];
  if (!p) return;
  if (D.sheets.some((s) => s.L == p.L && s.W == p.W && s.label == p.label))
    return toast(p.label + ' is already listed');
  if (D.sheets.length >= 200) return;
  D.sheets.push({ ...p, qty: 0 });
  store();
  render(true);
}
export function cutDel(kind, i) {
  const D = cutData();
  if (!D[kind]) return;
  D[kind].splice(i, 1);
  store();
  render(true);
}
export function cutNew() {
  askIn(
    'Start a new cut list?',
    'The list on screen is cleared. Save it first if you want to keep it.',
    'Start New',
    () => {
      const jobs = cutData().jobs;
      state.cut = { ...BLANK(), parts: [], jobs };
      store();
      render();
    }
  );
}
/* save under a name (saving again with the same name replaces it) */
export function cutSave() {
  const D = cutData();
  form(
    'Save Cut List',
    [{ k: 'name', l: 'Name', req: 1, max: 60, ph: 'e.g. Job 2402318 kitchen units' }],
    { name: D.name },
    (o) => {
      const name = SAFE.text(o.name, 60),
        copy = JSON.parse(JSON.stringify({ name, kerf: D.kerf, trim: D.trim, sheets: D.sheets, parts: D.parts }));
      D.name = name;
      D.jobs = D.jobs.filter((j) => j.name != name);
      D.jobs.unshift({ ...copy, at: today(), by: USER });
      D.jobs = D.jobs.slice(0, 100);
      audit('Cut list saved', name, D.parts.length + ' piece types');
      toast('Saved ' + name);
    }
  );
}
export function cutJobs() {
  const D = cutData();
  openModal(
    String(
      html`<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>Saved Cut Lists</h2><div class="cut-jobs">${
        D.jobs.length
          ? D.jobs.map(
              (j, i) =>
                html`<div class="row"><span><b>${j.name}</b><br><span class="muted">${j.parts.length} piece types · saved ${fd(j.at)} by ${j.by || '-'}</span></span><span class="acts"><button class="mini pri" ${raw(onClick('cutOpen', i))}>Open</button><button class="mini del" ${raw(onClick('cutForget', i))}>Delete</button></span></div>`
            )
          : html`<p class="empty">Nothing saved yet. Use Save on the Panel Optimiser to keep a list.</p>`
      }</div><div class="mact"><button class="btn ghost" data-act="closeModal">Close</button></div>`
    )
  );
}
export function cutOpen(i) {
  const D = cutData(),
    j = D.jobs[i];
  if (!j) return;
  Object.assign(
    D,
    JSON.parse(JSON.stringify({ name: j.name, kerf: j.kerf, trim: j.trim, sheets: j.sheets, parts: j.parts }))
  );
  store();
  closeModal();
  render();
  toast('Opened ' + j.name);
}
export function cutForget(i) {
  const D = cutData(),
    j = D.jobs[i];
  if (!j) return;
  askIn(
    'Delete ' + j.name + '?',
    'The saved cut list is removed for everyone.',
    'Delete',
    () => {
      D.jobs.splice(i, 1);
      audit('Cut list deleted', j.name, '');
      store();
      cutJobs();
    },
    true
  );
}
/* the plan on the company's standard A4 report: totals, the cut list, then each board to scale */
export function cutPrint() {
  const D = cutData(),
    R = optimise(D),
    S = R.stats;
  if (!R.boards.length) return toast('Add a board and some pieces first');
  const boards = R.boards
    .map(
      (b, i) =>
        `<section class="cbp"><h3>Board ${i + 1} of ${R.boards.length}: ${html`${b.sheet}`} <span>${mm(b.L)} × ${mm(b.W)} mm · ${b.pieces.length} pieces · ${Math.round((b.used / b.area) * 100)}% used</span></h3>${boardSvg(b, i, true)}</section>`
    )
    .join('');
  printDoc(
    'Cutting Plan',
    (D.name ? D.name + ' · ' : '') + 'Saw blade ' + D.kerf + ' mm · edge trim ' + D.trim + ' mm',
    [],
    [],
    {
      kind: 'Panel Optimiser',
      kpis: [
        ['Boards needed', String(S.boards), S.byType.map((t) => t.used + ' × ' + t.label).join(', ')],
        ['Pieces', String(S.pieces), S.unplaced ? S.unplaced + ' not placed' : ''],
        ['Board used', Math.round(S.efficiency * 100) + '%'],
        ['Waste', m2(S.waste)],
      ],
      tables: [
        {
          t: 'Cut List',
          h: ['Name', 'Length (mm)', 'Width (mm)', 'How many', 'Can turn'],
          r: D.parts.map((p) => [p.label, mm(p.L), mm(p.W), String(p.qty), p.turn === false ? 'No (grain)' : 'Yes']),
        },
        {
          t: 'Boards',
          h: ['Board', 'Length (mm)', 'Width (mm)', 'Used'],
          r: S.byType.map((t) => {
            const s = D.sheets.find((x) => x.label == t.label) || {};
            return [t.label, mm(s.L || 0), mm(s.W || 0), String(t.used)];
          }),
        },
        ...(R.unplaced.length
          ? [
              {
                t: 'Not Placed',
                h: ['Name', 'Length (mm)', 'Width (mm)'],
                r: R.unplaced.map((u) => [u.label, mm(u.L), mm(u.W)]),
              },
            ]
          : []),
      ],
      post: `<style>.cbp{break-inside:avoid;margin:5mm 0 0}.cbp h3{display:flex;justify-content:flex-start;align-items:baseline;gap:4mm}.cbp h3 span{margin-left:auto;font-weight:400;color:#5b6b80;font-size:8pt}.cut-b{display:block;width:100%;height:auto;max-height:110mm;border:.3mm solid #13233a;border-radius:1.5mm}.cut-b .bd{fill:#f7f9fc}.cut-b .gl{fill:none;stroke:#e3e8ef;stroke-width:1}.cut-b rect{stroke-width:2}.cut-b text{text-anchor:middle;dominant-baseline:middle;fill:#13233a;font-weight:700;font-family:Arial,sans-serif}.cut-b text.sz{font-weight:400}</style>${boards}`,
    }
  );
}
