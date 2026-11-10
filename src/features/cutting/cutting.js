/* features/cutting/cutting: Panel Optimiser. Enter the boards in stock and the pieces to cut; the plan
   (domain/cutlist.js) shows each board with its pieces drawn to scale, how many boards are needed and
   the waste. The current list is kept, and named cut lists can be saved, opened and printed. */
import { onClick, onEvent } from '../../core/actions.js';
import { fd, today } from '../../core/dates.js';
import { html, raw } from '../../core/html.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { SAFE } from '../../data/sanitize.js';
import { state } from '../../data/state.js';
import { optimise } from '../../domain/cutlist.js';
import { fitPage } from '../../print/print.js';
import { fieldControl } from '../../ui/forms/fields.js';
import { form } from '../../ui/forms/form.js';
import { askIn, closeModal, openModal } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';

const BLANK = () => ({
  name: '',
  kerf: 3,
  trim: 10,
  sheets: [{ label: '18mm White Board', L: 2440, W: 1220, qty: 0 }],
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
    ['qty', 'How Many (0 = any)', 'number'],
  ],
  parts: [
    ['label', 'Piece', 'text'],
    ['L', 'Length', 'number'],
    ['W', 'Width', 'number'],
    ['qty', 'How Many', 'number'],
    ['turn', 'Can Turn', 'select'],
  ],
};
/* one colour per piece name, so the same piece looks the same on every board */
const hue = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const mm = (n) => (Math.round(n * 10) / 10).toLocaleString('en-GB');
const m2 = (n) => (n / 1e6).toFixed(2) + ' m²';

/** one board drawn to scale, pieces labelled with their name and size */
export function boardSvg(b, i) {
  const fs = Math.max(14, Math.min(b.L, b.W) / 22);
  return html`<svg class="cut-b" viewBox="-2 -2 ${b.L + 4} ${b.W + 4}" role="img" aria-label="Board ${i + 1}: ${b.sheet}, ${b.pieces.length} pieces">
    <rect class="bd" x="0" y="0" width="${b.L}" height="${b.W}"/>
    ${b.pieces.map((p) => {
      const small = p.l < fs * 4 || p.w < fs * 1.6;
      return html`<g><rect x="${p.x}" y="${p.y}" width="${p.l}" height="${p.w}" style="fill:hsl(${hue(p.label)} 70% 82%);stroke:hsl(${hue(p.label)} 45% 38%)"/>${
        small
          ? ''
          : html`<text x="${p.x + p.l / 2}" y="${p.y + p.w / 2}" style="font-size:${fs}px">${p.label}</text><text class="sz" x="${p.x + p.l / 2}" y="${p.y + p.w / 2 + fs * 1.15}" style="font-size:${fs * 0.8}px">${mm(p.l)} × ${mm(p.w)}${p.rot ? ' ↻' : ''}</text>`
      }<title>${p.label}: ${mm(p.l)} × ${mm(p.w)} mm${p.rot ? ' (turned)' : ''}</title></g>`;
    })}
  </svg>`;
}
function table(kind, rows) {
  const C = COLS[kind];
  return html`<div class="tw cut-t"><table class="ptb"><thead><tr>${C.map(([, l]) => html`<th>${l}</th>`)}<th class="ac"></th></tr></thead><tbody>${rows.map(
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
        return html`<td>${raw(fieldControl(f, v, { id: 'cut_' + kind + '_' + i + '_' + k }))}</td>`;
      })}<td class="ac"><button class="mini del" aria-label="Remove row ${i + 1}" ${raw(onClick('cutDel', kind, i))}>&times;</button></td></tr>`
  )}</tbody></table></div><button class="mini" ${raw(onClick('cutAdd', kind))}>+ Add ${kind == 'sheets' ? 'Board' : 'Piece'}</button>`;
}
export function vCutting() {
  const D = cutData(),
    R = optimise(D),
    S = R.stats;
  return String(html`<div class="head"><div><h1>Panel Optimiser</h1><span class="muted">${D.name ? D.name + ' · ' : ''}Plan how to cut pieces from whole boards with the least waste</span></div>
    <div class="tools"><button class="mini" ${raw(onClick('cutJobs'))}>Saved Lists (${D.jobs.length})</button><button class="mini" ${raw(onClick('cutNew'))}>New List</button><button class="mini" ${raw(onClick('cutSave'))}>Save</button><button class="btn" ${raw(onClick('cutPrint'))}>Print Plan</button></div></div>
  <div class="cut">
    <div class="cut-in" ${raw(onEvent('onchange', 'cutEdit', 'event'))}>
      <div class="panel"><h2><span>Boards In Stock</span><small class="muted nocap">all sizes in mm</small></h2>${table('sheets', D.sheets)}</div>
      <div class="panel"><h2><span>Pieces To Cut</span><small class="muted nocap">all sizes in mm</small></h2>${table('parts', D.parts)}</div>
      <div class="panel cut-o"><h2><span>Options</span><small class="muted nocap">in mm</small></h2><div class="grid">
        <div class="ff"><label for="cut_opt_kerf">Saw Blade Width</label>${raw(fieldControl({ k: '', t: 'number', max: 20 }, D.kerf, { id: 'cut_opt_kerf' }))}</div>
        <div class="ff"><label for="cut_opt_trim">Edge Trim Each Side</label>${raw(fieldControl({ k: '', t: 'number', max: 100 }, D.trim, { id: 'cut_opt_trim' }))}</div>
      </div></div>
    </div>
    <div class="cut-out">
      <div class="kpis"><div class="kpi"><small>Boards Needed</small><b>${S.boards}</b></div><div class="kpi"><small>Pieces Placed</small><b>${S.pieces}</b></div><div class="kpi ${S.efficiency < 0.6 && S.boards ? 'warn' : ''}"><small>Board Used</small><b>${Math.round(S.efficiency * 100)}%</b></div><div class="kpi"><small>Waste</small><b>${m2(S.waste)}</b></div></div>
      ${R.unplaced.length ? html`<div class="note bad"><b>${R.unplaced.length} piece${R.unplaced.length == 1 ? '' : 's'} would not fit:</b> ${[...new Set(R.unplaced.map((u) => u.label + ' (' + mm(u.L) + ' × ' + mm(u.W) + ')'))].join(', ')}. Add a bigger board, more boards, or let them turn.</div>` : ''}
      ${S.byType.length ? html`<p class="muted cut-by">${S.byType.map((t) => t.used + ' × ' + t.label + (t.of ? ' (of ' + t.of + ')' : '')).join(' · ')}</p>` : ''}
      ${R.boards.map(
        (b, i) =>
          html`<div class="panel cut-bp"><h2><span>Board ${i + 1} of ${R.boards.length} · ${b.sheet}</span><small class="muted nocap">${mm(b.L)} × ${mm(b.W)} mm · ${b.pieces.length} pieces · ${Math.round((b.used / b.area) * 100)}% used</small></h2>${boardSvg(b, i)}</div>`
      )}
      ${R.boards.length ? '' : html`<div class="panel"><p class="empty">Add a board and some pieces to see the plan.</p></div>`}
    </div>
  </div>`);
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
  store();
  render(true);
}
export function cutAdd(kind) {
  const D = cutData();
  if (!D[kind] || D[kind].length >= 200) return;
  D[kind].push(
    kind == 'sheets'
      ? { label: 'Board', L: 2440, W: 1220, qty: 0 }
      : { label: 'Piece', L: 500, W: 300, qty: 1, turn: true }
  );
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
      state.cut = { ...BLANK(), sheets: [{ label: 'Board', L: 2440, W: 1220, qty: 0 }], parts: [], jobs };
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
/* the plan on paper: totals, the pieces list, then each board to scale */
export function cutPrint() {
  const D = cutData(),
    R = optimise(D);
  if (!R.boards.length) return toast('Add a board and some pieces first');
  const w = window.open('', '_blank');
  if (!w) return toast('Allow pop-ups to print the plan');
  const S = R.stats;
  w.document.write(
    String(html`<!doctype html><html><head><meta charset="utf-8"><title>Cutting Plan</title><style>@page{size:A4 landscape;margin:10mm}body{margin:0;font:10pt Arial,sans-serif;color:#13233a}.tb{padding:8px;background:#012b59;text-align:center}.tb button{padding:8px 14px;border:0;border-radius:8px;background:#ffd002;color:#012b59;font-weight:700;cursor:pointer}.pg{padding:6mm}h1{margin:0 0 2mm;font-size:16pt}table{border-collapse:collapse;margin:3mm 0}td,th{border:1px solid #c9d2de;padding:1.5mm 3mm;text-align:left}.bp{break-inside:avoid;margin:5mm 0}.bp h2{font-size:11pt;margin:0 0 2mm}svg{width:100%;max-height:150mm}.bd{fill:#f4f6f9;stroke:#13233a;stroke-width:3}text{text-anchor:middle;dominant-baseline:middle;fill:#13233a;font-family:Arial}rect{stroke-width:2}@media print{.tb{display:none}}</style></head><body><div class="tb"><button data-pa="print">Print</button></div><div class="pg">
      <h1>Cutting Plan${D.name ? ': ' + D.name : ''}</h1>
      <p>${fd(today())} · ${S.boards} board${S.boards == 1 ? '' : 's'} · ${S.pieces} pieces · ${Math.round(S.efficiency * 100)}% of board used · waste ${m2(S.waste)} · kerf ${D.kerf} mm · trim ${D.trim} mm</p>
      <table><thead><tr><th>Piece</th><th>Length</th><th>Width</th><th>How Many</th><th>Can Turn</th></tr></thead><tbody>${D.parts.map(
        (p) =>
          html`<tr><td>${p.label}</td><td>${mm(p.L)}</td><td>${mm(p.W)}</td><td>${p.qty}</td><td>${p.turn === false ? 'No' : 'Yes'}</td></tr>`
      )}</tbody></table>
      ${R.unplaced.length ? html`<p><b>Not placed:</b> ${R.unplaced.map((u) => u.label).join(', ')}</p>` : ''}
      ${R.boards.map((b, i) => html`<div class="bp"><h2>Board ${i + 1} of ${R.boards.length}: ${b.sheet} (${mm(b.L)} × ${mm(b.W)} mm), ${b.pieces.length} pieces</h2>${boardSvg(b, i)}</div>`)}
    </div></body></html>`)
  );
  w.document.close();
  fitPage(w);
}
