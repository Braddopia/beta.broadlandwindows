/* features/schedule/schedule: the Digital Fitting Schedule, the weekly sheet the office used to print and fill in by
   hand. Days (Monday to Saturday) down the side, installers across the top. A job is pencilled in first; once it is
   a confirmed booking it is coloured pink, as with a highlighter on the paper sheet.
   A confirmed booking is linked to its contract: the contract's fit date becomes the first confirmed day and its
   fitters the installers booked, so the Calendar and the Overview follow the board.
   Shown on Floor Boards (board "schedule"); changed by accounts with the 'schedule' permission. */
import { onClick, onEvent } from '../../core/actions.js';
import { fd, iso, isoWeek, today } from '../../core/dates.js';
import { $, $$, esc } from '../../core/dom.js';
import { html, raw } from '../../core/html.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { SAFE } from '../../data/sanitize.js';
import { state } from '../../data/state.js';
import * as repos from '../../data/repository.js';
import { jobTitle } from '../../domain/job-title.js';
import { staffIn } from '../../domain/people.js';
import { can, canSee } from '../../domain/permissions.js';
import { need } from '../auth/session.js';
import { fieldControl } from '../../ui/forms/fields.js';
import { MARK, fieldErr } from '../../ui/forms/form.js';
import { askYes, closeModal, openModal } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { uiState } from '../../ui/ui-state.js';
import { PRINT_BAR_CSS, printBar } from '../../print/print.js';

export const OTHER = 'Other Installers';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** the schedule: installers (columns), bookings by "date|installer", and a notes line per week */
export function schedData() {
  const S = (state.fitSched = state.fitSched && typeof state.fitSched == 'object' ? state.fitSched : {});
  S.cells = S.cells && typeof S.cells == 'object' ? S.cells : {};
  S.notes = S.notes && typeof S.notes == 'object' ? S.notes : {};
  if (!Array.isArray(S.cols)) S.cols = null;
  return S;
}
/** the installers across the top: as set by an administrator, or everyone on the staff list as a fitter */
export function schedCols() {
  const S = schedData(),
    L = S.cols && S.cols.length ? S.cols : staffIn('Fitters');
  return [...L.filter((x) => x && x != OTHER), OTHER];
}
/** the Monday of the week on show (o weeks from this one) and its six days */
export function weekDays(o = uiState.sched.o) {
  const t = new Date(today() + 'T00:00');
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7) + o * 7);
  return DAYS.map((_, i) => {
    const d = new Date(t);
    d.setDate(t.getDate() + i);
    return iso(d);
  });
}
const key = (d, c) => d + '|' + c;
const cellOf = (d, c) => schedData().cells[key(d, c)] || null;
const same = (a, b) => !!a && !!b && (a.job || a.name) == (b.job || b.name) && !!a.conf == !!b.conf;
const contractOf = (no) => {
  const n = String(no || '').trim();
  return n ? state.contracts.find((c) => String(c.id) == n) || null : null;
};

/* the week as a grid; a job booked over neighbouring boxes is one block: the label shows once (in its first box)
   and the lines between its boxes are not drawn */
function groups(D, C) {
  const at = (r, c) => (r >= 0 && r < D.length && c >= 0 && c < C.length ? cellOf(D[r], C[c]) : null),
    seen = new Set(),
    anchor = new Set();
  D.forEach((_, r) =>
    C.forEach((__, c) => {
      const x = at(r, c);
      if (!x || seen.has(r + ',' + c)) return;
      anchor.add(r + ',' + c);
      const todo = [[r, c]];
      while (todo.length) {
        const [a, b] = todo.pop();
        if (seen.has(a + ',' + b) || !same(at(a, b), x)) continue;
        seen.add(a + ',' + b);
        todo.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
      }
    })
  );
  return { at, anchor };
}
/** the grid itself (on screen and printed) */
export function schedGrid(D, C, print) {
  const { at, anchor } = groups(D, C),
    edit = !print && can('schedule'),
    td = today();
  const head = `<div class="fs-c fs-hd fs-wk">${print ? '' : ''}</div>${C.map((c) => `<div class="fs-c fs-hd ${c == OTHER ? 'oth' : ''}">${esc(c)}</div>`).join('')}`;
  const rows = D.map((d, r) => {
    const dt = new Date(d + 'T00:00');
    return (
      `<div class="fs-c fs-day ${d == td ? 'td' : ''}"><b>${dt.getDate()}</b><span>${DAYS[r]}</span></div>` +
      C.map((c, ci) => {
        const x = at(r, ci),
          jr = x && same(at(r, ci + 1), x),
          jb = x && same(at(r + 1, ci), x),
          lead = x && anchor.has(r + ',' + ci);
        const cls = ['fs-c', 'fs-b', x ? (x.conf ? 'conf' : 'pen') : '', jr ? 'jr' : '', jb ? 'jb' : ''].join(' ');
        const label = lead
          ? `<span class="fs-n">${esc(x.name || '')}</span>${x.job ? `<span class="fs-j">${esc(x.job)}</span>` : ''}${x.note ? `<span class="fs-x">${esc(x.note)}</span>` : ''}`
          : '';
        return `<div class="${cls}" ${edit || (!print && x) ? onClick('schedCell', d, c) : ''} ${x ? `title="${esc([x.name, x.job, x.note, x.conf ? 'Confirmed' : 'Pencilled in'].filter(Boolean).join(' · '))}"` : ''}>${label}</div>`;
      }).join('')
    );
  }).join('');
  return `<div class="fs-g" style="grid-template-columns:${print ? '16mm' : '4.2rem'} repeat(${C.length},minmax(0,1fr))">${head}${rows}</div>`;
}
/* contracts with a fit date this week that are not on the board yet */
function missing(D) {
  if (!canSee('contracts') && !can('schedule')) return [];
  const on = new Set(Object.values(schedData().cells).map((x) => String(x.job || '')));
  return state.contracts.filter((c) => c.fit && D.includes(c.fit) && c.stage != 'Complete' && !on.has(String(c.id)));
}

/* ---------------- the board ---------------- */
export function vSchedule(head) {
  const D = weekDays(),
    C = schedCols(),
    S = schedData(),
    wk = isoWeek(D[0]),
    months = [...new Set(D.map((d) => new Date(d + 'T00:00').toLocaleDateString('en-GB', { month: 'long' })))].join(
      ' / '
    ),
    M = missing(D),
    ed = can('schedule');
  return `<style>${SCHED_CSS}</style><div class="fl fs">${head(
    'Fitting Schedule',
    `Week ${wk} · ${months} ${D[0].slice(0, 4)}`,
    `<span class="fs-nav"><button class="btn ghost" aria-label="Previous week" ${onClick('setUI', 'sched.o', uiState.sched.o - 1)}>&lsaquo;</button><button class="btn ghost" ${onClick('setUI', 'sched.o', 0)}>This Week</button><button class="btn ghost" aria-label="Next week" ${onClick('setUI', 'sched.o', uiState.sched.o + 1)}>&rsaquo;</button></span>${ed ? `<button class="btn ghost" data-act="schedInstallers">Installers</button>` : ''}<button class="btn ghost" data-act="schedPrint">Print</button>`
  )}
  <div class="fs-key"><span><i class="pen"></i>Pencilled in</span><span><i class="conf"></i>Confirmed booking</span>${ed ? '<span class="muted">Click a box to book a job</span>' : ''}</div>
  <div class="panel fs-wrap">${schedGrid(D, C)}
    <div class="fs-notes"><label for="fsNote">Notes</label>${ed ? `<input id="fsNote" maxlength="300" value="${esc(S.notes[D[0]] || '')}" placeholder="Anything for the week: loading, materials, who is where" ${onEvent('onchange', 'schedNote', D[0], 'this.value')}>` : `<span>${esc(S.notes[D[0]] || '')}</span>`}</div>
  </div>
  ${
    M.length && ed
      ? `<div class="panel fs-miss"><h2><span>Fittings This Week Not On The Board</span></h2>${M.map((c) => `<div class="row"><span><b>${esc(jobTitle(c.id, c.name))}</b><br><span class="muted">${fd(c.fit)} · ${esc(c.fitter || 'no fitters yet')}</span></span><button class="mini pri" ${onClick('schedAddJob', c.id)}>Add To Board</button></div>`).join('')}</div>`
      : ''
  }</div>`;
}

/* ---------------- booking a job ---------------- */
let EDIT = null;
export function schedCell(d, col) {
  const x = cellOf(d, col);
  if (!can('schedule')) {
    if (!x) return;
    const k = contractOf(x.job);
    openModal(
      String(html`<h2>${x.name || x.job}</h2><p>${fd(d)} · ${col}</p><p>${x.job ? jobTitle(x.job, x.name) : ''}${x.note ? ' · ' + x.note : ''}</p><p><span class="tag ${x.conf ? 'r' : 'n'}">${x.conf ? 'Confirmed booking' : 'Pencilled in'}</span></p>
      <div class="mact">${k && canSee('contracts') ? html`<button class="btn ghost" ${raw(onClick('openContract', k.id))}>Open Contract</button>` : ''}<button class="btn" data-act="closeModal">Close</button></div>`),
      'sm'
    );
    return;
  }
  schedForm(d, col, x || { job: '', name: '', note: '', conf: false });
}
export function schedAddJob(id) {
  if (!need('schedule', 'Booking the fitting schedule')) return;
  const c = state.contracts.find((x) => x.id == id);
  if (!c) return;
  const C = schedCols(),
    first = String(c.fitter || '')
      .split(/,\s*/)
      .find((n) => C.includes(n));
  schedForm(
    c.fit,
    first || C[0],
    { job: c.id, name: String(c.name || '').toLocaleUpperCase('en-GB'), note: '', conf: true },
    true
  );
}
function schedForm(d, col, x, fresh) {
  const D = weekDays(),
    C = schedCols(),
    has = !fresh && !!cellOf(d, col),
    /* the boxes this booking already covers in the week (so a block is changed together) */
    on = new Set(
      has
        ? D.flatMap((dd) => C.filter((cc) => same(cellOf(dd, cc), x)).map((cc) => key(dd, cc)))
        : [key(D.includes(d) ? d : D[0], col)]
    );
  EDIT = { d, col, was: has ? { ...x } : null, cells: [...on] };
  const days = D.map(
      (dd, i) =>
        html`<label class="chk"><input type="checkbox" class="fs-dk" value="${dd}" ${raw([...on].some((k) => k.startsWith(dd + '|')) ? 'checked' : '')}><span>${DAYS[i]} ${+dd.slice(8)}</span></label>`
    ),
    who = C.map(
      (cc) =>
        html`<label class="chk"><input type="checkbox" class="fs-ck" value="${cc}" ${raw([...on].some((k) => k.endsWith('|' + cc)) ? 'checked' : '')}><span>${cc}</span></label>`
    );
  openModal(
    String(html`<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>${has ? 'Change Booking' : 'Book A Job'}</h2>
    <div class="grid">
      <div class="ff"><label for="fs_job">Job number</label>${raw(fieldControl({ k: '', max: 30, combo: 'jobs' }, x.job, { id: 'fs_job' }))}<span class="hint" id="fsHint">${contractOf(x.job) ? 'Contract found: a confirmed booking sets its fit date and fitters' : 'Type the contract number and pick the job'}</span></div>
      <div class="ff"><label for="fs_name">Customer or job${raw(MARK(1))}</label>${raw(fieldControl({ k: '', max: 40 }, x.name, { id: 'fs_name' }))}</div>
      <div class="ff full"><label for="fs_note">Note</label>${raw(fieldControl({ k: '', max: 40, ph: 'e.g. 6W, porch, load up' }, x.note, { id: 'fs_note' }))}</div>
      <fieldset class="ff full paidq"><legend>Booking</legend><div class="chq">
        <label class="chc"><input type="radio" name="fs_conf" value="0" ${raw(x.conf ? '' : 'checked')}><span><b>Pencilled in</b><small>Not confirmed yet</small></span></label>
        <label class="chc fs-pink"><input type="radio" name="fs_conf" value="1" ${raw(x.conf ? 'checked' : '')}><span><b>Confirmed</b><small>Shown in pink; sets the contract's fit date</small></span></label>
      </div></fieldset>
      <fieldset class="ff full fs-set"><legend>Days</legend><div class="fs-chks">${days}</div></fieldset>
      <fieldset class="ff full fs-set"><legend>Installers</legend><div class="fs-chks">${who}</div></fieldset>
    </div>
    <div class="mact">${has ? html`<button class="btn ghost l red-t" data-act="schedDel">Remove booking</button>` : ''}<button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" data-act="schedSave">${has ? 'Save changes' : 'Book job'}</button></div>`),
    'md'
  );
  const j = $('#fs_job');
  if (j)
    j.addEventListener('change', () => {
      const k = contractOf(j.value),
        nm = $('#fs_name'),
        h = $('#fsHint');
      if (k && nm && !nm.value.trim()) nm.value = String(k.name || '').toLocaleUpperCase('en-GB');
      if (h) h.textContent = k ? 'Contract found: a confirmed booking sets its fit date and fitters' : '';
    });
}
export function schedSave() {
  if (!need('schedule', 'Booking the fitting schedule') || !EDIT) return;
  const job = SAFE.text($('#fs_job').value, 30),
    name = SAFE.text($('#fs_name').value, 40).toLocaleUpperCase('en-GB'),
    note = SAFE.text($('#fs_note').value, 40),
    conf = ($('input[name=fs_conf]:checked') || {}).value == '1',
    days = [...$$('#mbox .fs-dk:checked')].map((b) => b.value),
    who = [...$$('#mbox .fs-ck:checked')].map((b) => b.value);
  if (!name && !job) return fieldErr($('#fs_name'), 'Type the customer or the job number');
  if (!days.length) return toast('Tick at least one day');
  if (!who.length) return toast('Tick at least one installer');
  const S = schedData(),
    jobs = new Set([job, EDIT.was && EDIT.was.job].filter(Boolean));
  EDIT.cells.forEach((k) => delete S.cells[k]);
  const x = { job, name: name || (contractOf(job) || {}).name || job, note, conf };
  days.forEach((d) => who.forEach((c) => (S.cells[key(d, c)] = { ...x })));
  jobs.forEach(syncContract);
  audit(
    EDIT.was ? 'Fitting schedule changed' : 'Job booked on fitting schedule',
    job || name,
    days.map(fd).join(', ') + ' · ' + who.join(', ') + (conf ? ' · confirmed' : ' · pencilled in')
  );
  EDIT = null;
  store();
  closeModal();
  render();
  toast(conf ? 'Booking confirmed' : 'Job pencilled in');
}
export function schedDel() {
  if (!need('schedule', 'Booking the fitting schedule') || !EDIT) return;
  const E = EDIT;
  askYes('Remove this booking?', 'Every box of this job in the week is cleared.', 'Remove', () => {
    const S = schedData();
    E.cells.forEach((k) => delete S.cells[k]);
    if (E.was && E.was.job) syncContract(E.was.job);
    audit('Fitting schedule booking removed', (E.was && (E.was.job || E.was.name)) || '', '');
    EDIT = null;
    store();
    closeModal();
    render();
    toast('Booking removed');
  });
}
/** a contract follows its confirmed bookings: fit date = the first confirmed day, fitters = the installers on it.
    When the last confirmed booking goes, the date and fitters the board set are taken off again. */
export function syncContract(job) {
  const c = contractOf(job);
  if (!c) return;
  const B = Object.entries(schedData().cells)
    .filter(([, x]) => x.conf && String(x.job) == String(c.id))
    .map(([k]) => k.split('|'));
  if (B.length) {
    const fit = B.map(([d]) => d).sort()[0],
      who = [...new Set(B.map(([, w]) => w).filter((w) => w != OTHER))].slice(0, 6);
    c.fit = fit;
    for (let i = 1; i <= 6; i++) c['fitter' + i] = who[i - 1] || '';
    c.fitter = who.join(', ');
    c.fitFromBoard = 1;
  } else if (c.fitFromBoard) {
    c.fit = '';
    for (let i = 1; i <= 6; i++) c['fitter' + i] = '';
    c.fitter = '';
    delete c.fitFromBoard;
  } else return;
  repos.contracts.changed(c);
  audit('Fit date from the fitting schedule', c.id, c.fit ? fd(c.fit) + ' · ' + c.fitter : 'cleared');
}
export function schedNote(d, v) {
  if (!need('schedule', 'Changing the fitting schedule')) return;
  schedData().notes[d] = SAFE.text(v, 300);
  store();
}
/** which installers are across the top (one per line; Other Installers is always last) */
export function schedInstallers() {
  if (!need('schedule', 'Changing the fitting schedule')) return;
  const C = schedCols().filter((c) => c != OTHER);
  openModal(
    String(html`<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>Installers</h2>
    <p class="muted">One name per line, in the order they go across the sheet. Other Installers is always added at the end.</p>
    <div class="ff"><label for="fs_cols">Installers</label><textarea id="fs_cols" rows="10" maxlength="800">${C.join('\n')}</textarea></div>
    <div class="mact"><button class="btn ghost l" data-act="schedColsReset">Use the staff list</button><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" data-act="schedColsSave">Save</button></div>`),
    'sm'
  );
}
export function schedColsSave() {
  if (!need('schedule', 'Changing the fitting schedule')) return;
  const L = [
    ...new Set(
      String($('#fs_cols').value)
        .split('\n')
        .map((x) => SAFE.text(x, 40))
        .filter((x) => x && x != OTHER)
    ),
  ].slice(0, 14);
  if (!L.length) return toast('Add at least one installer');
  schedData().cols = L;
  audit('Fitting schedule installers changed', L.join(', '), '');
  store();
  closeModal();
  render();
  toast('Installers saved');
}
export function schedColsReset() {
  if (!need('schedule', 'Changing the fitting schedule')) return;
  schedData().cols = null;
  store();
  closeModal();
  render();
  toast('Back to the staff list');
}

/* ---------------- print: the week on A4 landscape, like the paper sheet ---------------- */
export function schedPrint() {
  const D = weekDays(),
    C = schedCols(),
    S = schedData(),
    w = window.open('', '_blank');
  if (!w) return toast('Allow pop-ups to print the schedule');
  const months = [...new Set(D.map((d) => new Date(d + 'T00:00').toLocaleDateString('en-GB', { month: 'long' })))].join(
    ' / '
  );
  w.document
    .write(`<!doctype html><html><head><meta charset="utf-8"><title>Fitting Schedule Week ${isoWeek(D[0])}</title><style>
@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{margin:0;font:9pt Arial,Helvetica,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sh{display:flex;gap:6mm;align-items:stretch;margin:4mm 0 3mm}.sh div{border:.4mm solid #222;padding:2mm 4mm;font-size:16pt;font-weight:700}.sh div span{font-weight:400;margin-left:4mm}
${SCHED_CSS}
.fs-g{height:150mm;font-size:9pt;border-color:#333}.fs-c{border-right-color:#333;border-bottom-color:#333}.fs-hd{font-size:8pt}.fs-notes{margin-top:2mm;border:.4mm solid #222;padding:2mm 3mm;min-height:12mm}
@media print{.tb{display:none}}
${PRINT_BAR_CSS}</style></head><body>${printBar('Fitting Schedule Week ' + isoWeek(D[0]))}
<div class="sh"><div>WEEK<span>${isoWeek(D[0])}</span></div><div>MONTH<span>${esc(months)} ${D[0].slice(0, 4)}</span></div></div>
${schedGrid(D, C, true)}<div class="fs-notes"><b>Notes:</b> ${esc(S.notes[D[0]] || '')}</div></body></html>`);
  w.document.close();
}
/* the grid's look, used on screen (app styles) and in the printout */
export const SCHED_CSS = `.fs-g{display:grid;border-top:1px solid #9aa7b8;border-left:1px solid #9aa7b8}
.fs-c{border-right:1px solid #9aa7b8;border-bottom:1px solid #9aa7b8;padding:4px 6px;min-width:0;overflow:hidden}
.fs-hd{display:flex;align-items:center;justify-content:center;text-align:center;font-weight:700;text-transform:uppercase;letter-spacing:.02em;line-height:1.15}
.fs-hd.oth{font-weight:600;opacity:.75}
.fs-day{display:flex;flex-direction:column;justify-content:center;font-weight:700}
.fs-day b{font-size:1.3em;line-height:1}.fs-day span{text-transform:uppercase}
.fs-b{position:relative;display:flex;flex-direction:column;justify-content:center;gap:1px;text-transform:uppercase}
.fs-b.pen{background:#fff;color:#56657d;font-style:italic}
.fs-b.conf{background:#ffc2dc;color:#3d0a24}
.fs-b.jr{border-right-color:transparent}.fs-b.jb{border-bottom-color:transparent}
.fs-b.pen.jr{border-right:1px dashed #c9d1dd}.fs-b.pen.jb{border-bottom:1px dashed #c9d1dd}
.fs-n{font-weight:700;line-height:1.1;overflow-wrap:anywhere}.fs-j{font-size:.92em;letter-spacing:.02em}
.fs-x{position:absolute;top:3px;right:5px;font-size:.78em;font-weight:700}`;
