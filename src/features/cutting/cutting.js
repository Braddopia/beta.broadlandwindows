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
import { PRE } from '../../config/colours.js';
import { jobTitle } from '../../domain/job-title.js';
import { canSee } from '../../domain/permissions.js';
import { uuid } from '../../core/ids.js';
import { fx } from '../files/files.js';
import { printDoc } from '../../print/print.js';
import { fieldControl } from '../../ui/forms/fields.js';
import { form } from '../../ui/forms/form.js';
import { askIn, closeModal, openModal } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';

/* the boards the company buys most, one click to add. Sizes are always width x height in mm (L is the width,
   across the plan; W is the height, up the plan; the names L and W are kept so saved lists still open) */
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
    ['L', 'Width', 'number'],
    ['W', 'Height', 'number'],
    ['cIn', 'Colour Inside', 'colour'],
    ['cOut', 'Colour Outside', 'colour'],
    ['qty', 'How Many', 'number'],
  ],
  parts: [
    ['label', 'Name', 'text'],
    ['L', 'Width', 'number'],
    ['W', 'Height', 'number'],
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
      }<title>${p.label}: ${mm(p.l)} × ${mm(p.w)}mm${p.rot ? ' (turned)' : ''}</title></g>`;
    })}
  </svg>`;
}
/* each board or piece is its own soft row: a dot in its colour on the plan, then its boxes, each with its name above */
function table(kind, rows) {
  const C = COLS[kind];
  return html`<div class="cut-t cut-rows">${rows.map(
    (r, i) =>
      html`<div class="cut-r cut-r-${kind}"><span class="cut-dot" style="--h:${kind == 'parts' ? hue(r.label) : 215}"></span>${C.map(
        ([k, l, t]) => {
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
              : t == 'colour'
                ? { k: '', t: 'text', max: 40, list: 'cutCols', ph: 'e.g. White' }
                : { k: '', t, max: t == 'number' ? 100000 : 60 };
          const v = k == 'turn' ? (r.turn === false ? 'no' : 'yes') : r[k];
          return html`<label class="bar-f cut-f-${k}" for="${'cut_' + kind + '_' + i + '_' + k}"><span>${l}${k == 'L' || k == 'W' ? raw(' <i class="nocap">(mm)</i>') : ''}</span>${raw(fieldControl(f, v, { id: 'cut_' + kind + '_' + i + '_' + k }))}</label>`;
        }
      )}<button class="cut-x" aria-label="Remove row ${i + 1}" title="Remove" ${raw(onClick('cutDel', kind, i))}>&times;</button></div>`
  )}${rows.length ? '' : html`<p class="muted bar-none">Nothing here yet.</p>`}${kind == 'sheets' ? html`<datalist id="cutCols">${PRE.map(([n]) => html`<option value="${n}"></option>`)}</datalist>` : ''}</div>`;
}
/** a board's colours, e.g. "White inside · Anthracite outside" (blank when none are given) */
export const boardCols = (s) =>
  [s && s.cIn ? s.cIn + ' inside' : '', s && s.cOut ? s.cOut + ' outside' : ''].filter(Boolean).join(' · ');
const sheetOf = (D, name) => D.sheets.find((x) => x.label == name);
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
        html`<div class="panel cut-bp"><h2><span>Board ${i + 1} <span class="muted">of ${R.boards.length}</span> · ${b.sheet}${boardCols(sheetOf(D, b.sheet)) ? html` <span class="cut-col">${boardCols(sheetOf(D, b.sheet))}</span>` : ''}</span><small class="muted nocap">${mm(b.L)} wide × ${mm(b.W)} high (mm) · ${b.pieces.length} pieces · ${Math.round((b.used / b.area) * 100)}% used</small></h2><div class="cut-frame">${boardSvg(b, i)}</div></div>`
    )}
    ${R.boards.length ? '' : html`<div class="panel"><p class="empty">Add a board and some pieces to see the plan.</p></div>`}
  `) + `<template id="cutK">${kpis(S, pct)}</template>`
  );
}
const kpis = (S, pct) =>
  String(
    html`<div class="kpi"><small>Boards Needed</small><b>${S.boards}</b>${S.byType.length ? html`<span class="ksub">${S.byType.map((t) => t.used + ' × ' + t.label).join(' · ')}</span>` : ''}</div><div class="kpi"><small>Pieces Placed</small><b>${S.pieces}</b>${S.unplaced ? html`<span class="ksub">${S.unplaced} not placed</span>` : ''}</div><div class="kpi ${pct < 60 && S.boards ? 'warn' : ''}"><small>Board Used</small><b>${pct}%</b><span class="cut-meter"><i style="width:${pct}%"></i></span></div><div class="kpi"><small>Waste</small><b>${m2(S.waste)}</b></div>`
  );
/** the contract the job number belongs to, if any */
export const cutContract = (D = cutData()) => {
  const n = String(D.jobNo || '').trim();
  return n ? state.contracts.find((c) => String(c.id) == n) || null : null;
};
/** "1023456 - JOB NAME", or the page name when no job is given */
const cutTitle = (D) => jobTitle(D.jobNo, D.jobName) || 'Panel Optimiser';
export function vCutting() {
  const D = cutData(),
    S = optimise(D).stats,
    k = cutContract(D);
  return String(html`<div class="head"><div><h1 id="cutTitle">${cutTitle(D)}</h1><span class="muted">${D.jobNo || D.jobName ? 'Panel Optimiser · p' : 'P'}lan how to cut pieces from whole boards with the least waste</span></div>
    <div class="tools"><button class="mini" ${raw(onClick('cutJobs'))}>Saved Lists (${D.jobs.length})</button><button class="mini" ${raw(onClick('cutNew'))}>New List</button><button class="mini" ${raw(onClick('cutSave'))}>Save</button><button class="mini" ${raw(onClick('cutSettings'))}>Cutting Settings</button><button class="mini pri" id="cutToC" ${raw(onClick('cutToContract'))} ${k && canSee('contracts') ? '' : raw('hidden')}>Save To Contract</button><button class="btn" ${raw(onClick('cutPrint'))}>Print Plan</button></div></div>
  <div class="cut-in" ${raw(onEvent('oninput', 'cutEdit', 'event'))} ${raw(onEvent('onchange', 'cutEdit', 'event'))}>
    <div class="panel cut-job"><h2><span>Job</span><small class="muted nocap" id="cutJobHint">${k ? 'Contract ' + k.id + ' found: Save To Contract keeps the plan with its documents' : 'Type the contract number to link the plan to it'}</small></h2><div class="cut-og cut-eq">
      <div class="ff"><label for="cut_job_no">Job Number</label>${raw(fieldControl({ k: '', max: 30, combo: 'jobs' }, D.jobNo || '', { id: 'cut_job_no' }))}</div>
      <div class="ff"><label for="cut_job_name">Job Name</label>${raw(fieldControl({ k: '', max: 80 }, D.jobName || '', { id: 'cut_job_name' }))}</div>
    </div></div>
    <div class="panel cut-card"><h2><span>Boards In Stock</span><small class="muted nocap">Sizes are width × height · How Many 0 means as many as needed</small></h2>${table('sheets', D.sheets)}
      <div class="cut-add"><button class="mini" ${raw(onClick('cutAdd', 'sheets'))}>+ Add Board</button>${PRESETS.map(
        (p, i) =>
          html`<button class="mini cut-pre" ${raw(onClick('cutPreset', i))}><b>${p.label}</b> <span class="nocap">${p.L} × ${p.W}mm</span></button>`
      )}</div></div>
    <div class="panel cut-card"><h2><span>Pieces To Cut</span></h2>${table('parts', D.parts)}
      <div class="cut-add"><button class="mini" ${raw(onClick('cutAdd', 'parts'))}>+ Add Piece</button></div></div>
  </div>
  <div class="kpis cut-k" id="cutKpis">${raw(kpis(S, Math.round(S.efficiency * 100)))}</div>
  <div class="cut-out" id="cutOut">${raw(cutResults())}</div>`);
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
/* the title, the contract hint and the Save To Contract button follow the job boxes */
function jobBits() {
  const D = cutData(),
    k = cutContract(D),
    t = $('#cutTitle'),
    h = $('#cutJobHint'),
    b = $('#cutToC');
  if (t) t.textContent = cutTitle(D);
  if (h)
    h.textContent = k
      ? 'Contract ' + k.id + ' found: Save To Contract keeps the plan with its documents'
      : 'Type the contract number to link the plan to it';
  if (b) b.hidden = !(k && canSee('contracts'));
}
/* a box changed: read it back into the list (ids are cut_<kind>_<row>_<field>) */
export function cutEdit(e) {
  const t = e && e.target,
    m = t && /^cut_(sheets|parts|opt|job)_(\w+?)(?:_(\w+))?$/.exec(t.id);
  if (!m) return;
  const D = cutData();
  if (m[1] == 'job') {
    if (m[2] == 'no') {
      D.jobNo = SAFE.text(t.value, 30);
      /* a known contract fills the job name in (unless one was typed) */
      const k = cutContract(D),
        nm = $('#cut_job_name');
      if (k && nm && (!D.jobName || D.jobName == D.autoName)) {
        D.jobName = D.autoName = k.name || '';
        nm.value = D.jobName;
      }
    } else D.jobName = SAFE.text(t.value, 80);
    jobBits();
  } else if (m[1] == 'opt') D[m[2]] = SAFE.num(t.value, { min: 0, max: m[2] == 'kerf' ? 20 : 100, dp: 1 }) ?? 0;
  else {
    const r = D[m[1]][+m[2]],
      k = m[3];
    if (!r) return;
    if (k == 'label') r.label = SAFE.text(t.value, 60);
    else if (k == 'cIn' || k == 'cOut') r[k] = SAFE.text(t.value, 40);
    else if (k == 'turn') r.turn = t.value != 'no';
    else r[k] = SAFE.num(t.value, { min: 0, max: k == 'qty' ? 5000 : 100000, dp: k == 'qty' ? 0 : 1 }) ?? 0;
  }
  refresh();
}
/** saw blade width and edge trim, in a small window (they rarely change) */
export function cutSettings() {
  const D = cutData();
  form(
    'Cutting Settings',
    [
      { k: 'kerf', l: 'Saw blade width', t: 'number', max: 20, hint: 'In millimetres: lost on every cut' },
      {
        k: 'trim',
        l: 'Edge trim each side',
        t: 'number',
        max: 100,
        hint: 'In millimetres: taken off every edge of a board',
      },
    ],
    { kerf: D.kerf, trim: D.trim },
    (o) => {
      D.kerf = SAFE.num(o.kerf, { min: 0, max: 20, dp: 1 }) ?? 0;
      D.trim = SAFE.num(o.trim, { min: 0, max: 100, dp: 1 }) ?? 0;
    }
  );
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
    [{ k: 'name', l: 'Name', req: 1, max: 60 }],
    { name: D.name || jobTitle(D.jobNo, D.jobName) },
    (o) => {
      const name = SAFE.text(o.name, 60),
        copy = JSON.parse(
          JSON.stringify({
            name,
            jobNo: D.jobNo,
            jobName: D.jobName,
            kerf: D.kerf,
            trim: D.trim,
            sheets: D.sheets,
            parts: D.parts,
          })
        );
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
    JSON.parse(
      JSON.stringify({
        name: j.name,
        jobNo: j.jobNo || '',
        jobName: j.jobName || '',
        kerf: j.kerf,
        trim: j.trim,
        sheets: j.sheets,
        parts: j.parts,
      })
    )
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
/* the plan on the company's standard A4 report: job first, totals, the cut list, then each board.
   asHtml: hand the page back (to keep on the contract) instead of opening it */
function planDoc(asHtml) {
  const D = cutData(),
    R = optimise(D),
    S = R.stats;
  if (!R.boards.length) {
    toast('Add a board and some pieces first');
    return null;
  }
  const boards = R.boards
    .map(
      (b, i) =>
        `<section class="cbp"><h3>Board ${i + 1} of ${R.boards.length}: ${html`${b.sheet}`}${boardCols(sheetOf(D, b.sheet)) ? html`<i class="ccol">${boardCols(sheetOf(D, b.sheet))}</i>` : ''} <span>${mm(b.L)} wide × ${mm(b.W)} high (mm) · ${b.pieces.length} pieces · ${Math.round((b.used / b.area) * 100)}% used</span></h3>${boardSvg(b, i, true)}</section>`
    )
    .join('');
  const title = jobTitle(D.jobNo, D.jobName);
  return printDoc(
    title || 'Cutting Plan',
    (title ? 'Cutting Plan · ' : '') +
      'Saw Blade ' +
      mm(D.kerf) +
      'mm · Edge Trim ' +
      mm(D.trim) +
      'mm · Sizes Width × Height',
    [],
    [],
    {
      kind: 'Cutting Plan',
      asHtml,
      groups: [
        {
          t: 'Job',
          r: [
            ['Job number', D.jobNo || '-'],
            ['Job name', D.jobName ? String(D.jobName).toLocaleUpperCase('en-GB') : '-'],
          ],
        },
      ],
      kpis: [
        ['Boards needed', String(S.boards), S.byType.map((t) => t.used + ' × ' + t.label).join(', ')],
        ['Pieces', String(S.pieces), S.unplaced ? S.unplaced + ' not placed' : ''],
        ['Board used', Math.round(S.efficiency * 100) + '%'],
        ['Waste', m2(S.waste)],
      ],
      tables: [
        {
          t: 'Cut List',
          h: ['Name', 'Width (mm)', 'Height (mm)', 'How many', 'Can turn'],
          r: D.parts.map((p) => [p.label, mm(p.L), mm(p.W), String(p.qty), p.turn === false ? 'No (grain)' : 'Yes']),
        },
        {
          t: 'Boards',
          h: ['Board', 'Width (mm)', 'Height (mm)', 'Colour inside', 'Colour outside', 'Used'],
          r: S.byType.map((t) => {
            const s = sheetOf(D, t.label) || {};
            return [t.label, mm(s.L || 0), mm(s.W || 0), s.cIn || '-', s.cOut || '-', String(t.used)];
          }),
        },
        ...(R.unplaced.length
          ? [
              {
                t: 'Not Placed',
                h: ['Name', 'Width (mm)', 'Height (mm)'],
                r: R.unplaced.map((u) => [u.label, mm(u.L), mm(u.W)]),
              },
            ]
          : []),
      ],
      post: `<style>.cbp{break-inside:avoid;margin:5mm 0 0}.cbp h3{display:flex;justify-content:flex-start;align-items:baseline;gap:4mm}.cbp h3 .ccol{font-style:normal;font-weight:600;color:#5b6b80;font-size:9pt}.cbp h3 span{margin-left:auto;font-weight:400;color:#5b6b80;font-size:8pt}.cut-b{display:block;width:100%;height:auto;max-height:110mm;border:.3mm solid #13233a;border-radius:1.5mm}.cut-b .bd{fill:#f7f9fc}.cut-b .gl{fill:none;stroke:#e3e8ef;stroke-width:1}.cut-b rect{stroke-width:2}.cut-b text{text-anchor:middle;dominant-baseline:middle;fill:#13233a;font-weight:700;font-family:Arial,sans-serif}.cut-b text.sz{font-weight:400}</style>${boards}`,
    }
  );
}
export function cutPrint() {
  planDoc(false);
}
/* keep the plan with the contract's documents (Photos And Docs in the contract window) */
export async function cutToContract() {
  const D = cutData(),
    k = cutContract(D);
  if (!k) return toast('Type the contract number in Job Number first');
  if (!canSee('contracts')) return toast('Your account cannot open contracts');
  const page = planDoc(true);
  if (!page) return;
  const name = jobTitle(k.id, D.jobName || k.name) + ' Cutting Plan ' + today() + '.html',
    blob = new Blob([page], { type: 'text/html' });
  try {
    await fx('readwrite', (st) =>
      st.put({
        id: uuid(),
        ref: 'contract:' + k.id,
        name: SAFE.text(name, 120),
        cat: 'Drawing',
        size: blob.size,
        type: 'text/html',
        gen: 'cutplan',
        time: Date.now(),
        by: USER,
        blob,
      })
    );
    audit('Cutting plan saved to contract', k.id, name);
    store();
    toast('Saved to contract ' + k.id + ' documents');
  } catch (e) {
    toast('Document storage is not available here');
  }
}
