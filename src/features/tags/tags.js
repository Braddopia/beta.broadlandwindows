/* features/tags/tags: Job Stock Tags. A big A4 sign to put on stock kept for a job: the job number, the job name,
   the product colours inside and outside, and a red "do not damage" warning. Typed in on the left, seen as it will
   print on the right, printed one or more copies at a time. The last tags printed are kept to print again. */
import { onClick, onEvent } from '../../core/actions.js';
import { $, esc } from '../../core/dom.js';
import { html, raw } from '../../core/html.js';
import { PRE } from '../../config/colours.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { SAFE } from '../../data/sanitize.js';
import { state } from '../../data/state.js';
import { fd } from '../../core/dates.js';
import { fieldControl } from '../../ui/forms/fields.js';
import { askYes } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { PRINT_BAR_CSS, printBar } from '../../print/print.js';

export const TAG_WARN = 'Do not damage, stock metal used for a job upcoming!';
export const TAG_NOTE = 'Please keep the clear sleeves if reusable';
const RECENT_MAX = 20,
  MAX_TAGS = 30;
const blank = () => ({ jobNo: '', jobName: '', cIn: '', cOut: '', copies: 1 });

/** the tags being made (fill in several, print them all at once), the wording every tag carries, and the
    last ones printed. Kept with the rest of the data. */
export function tagData() {
  const T = (state.jobTags = state.jobTags && typeof state.jobTags == 'object' ? state.jobTags : {});
  /* the first version held one tag (cur) with its own wording */
  if (T.cur && !T.list) {
    T.list = [T.cur];
    T.warn = T.cur.warn;
    T.note = T.cur.note;
  }
  delete T.cur;
  T.list = Array.isArray(T.list) && T.list.length ? T.list.map((t) => ({ ...blank(), ...t })) : [blank()];
  T.warn = T.warn ?? TAG_WARN;
  T.note = T.note ?? TAG_NOTE;
  T.recent = Array.isArray(T.recent) ? T.recent : [];
  return T;
}
const contractOf = (no) => {
  const n = String(no || '').trim();
  return n ? state.contracts.find((c) => String(c.id) == n) || null : null;
};
/** a tag with the shared wording, ready to draw */
const full = (T, t) => ({ ...t, warn: T.warn, note: T.note });
/** the tags that will print: those with a job number */
export const tagsToPrint = (T = tagData()) => T.list.filter((t) => String(t.jobNo || '').trim());

/** "IN – WP / OUT – WP" (only the sides that are filled in) */
export const tagColours = (t) =>
  [t.cIn ? 'In – ' + t.cIn : '', t.cOut ? 'Out – ' + t.cOut : ''].filter(Boolean).join(' / ');

/* text size (mm) that keeps a line on one line across the 257mm the tag has: the longer the text, the smaller,
   never below `min` (very long text then wraps). w is the average letter width for the style, as part of its size. */
export const fitSize = (text, max, min, w) =>
  Math.max(min, Math.min(max, Math.floor((257 / (Math.max(1, String(text || '').length) * w)) * 10) / 10));
const em = (n) => 'font-size:' + n + 'em';

/** the tag itself: the same markup on screen (scaled) and on paper. 1em is 1mm of an A4 landscape sheet. */
export function tagSheet(t) {
  const cols = tagColours(t),
    no = t.jobNo || '0000000',
    name = t.jobName || 'Job name';
  return String(html`<div class="jt-sheet"><div class="jt-in">
    <div class="jt-no" style="${em(fitSize(no, 44, 20, 0.58))}">${no}</div>
    <div class="jt-name" style="${em(fitSize(name, 21, 11, 0.7))}">${name}</div>
    <div class="jt-sp"></div>
    ${cols ? html`<div class="jt-colh">Product Colour</div><div class="jt-col" style="${em(fitSize(cols, 13, 8, 0.66))}">${cols}</div>` : ''}
    ${t.warn ? html`<div class="jt-warn" style="${em(fitSize(t.warn, 10.5, 6, 0.64))}">${t.warn}</div>` : ''}
    ${t.note ? html`<div class="jt-note">${t.note}</div>` : ''}
  </div></div>`);
}
/* the tag's look, shared by the preview and the printout (sizes in em: 1em is 1mm of the sheet, and a margin is in
   its own text's em, so 4mm above 21mm text is .19em): plain black on white (it is printed on paper), Arial,
   everything in capitals and centred, the warning in red */
export const TAG_CSS = `.jt-sheet{position:relative;width:297em;height:210em;background:#fff;color:#111;font-family:Arial,"Helvetica Neue",Helvetica,sans-serif;text-transform:uppercase;text-align:center;overflow:hidden}
.jt-in{position:absolute;inset:16em 20em;display:flex;flex-direction:column;align-items:center}
.jt-no{font-size:44em;font-weight:700;line-height:1;letter-spacing:-.01em}
.jt-name{margin-top:.19em;font-size:21em;font-weight:700;line-height:1.1;max-width:100%;overflow-wrap:anywhere}
.jt-sp{flex:1}
.jt-colh{font-size:13em;font-weight:700;line-height:1.2}
.jt-col{font-size:13em;line-height:1.3}
.jt-warn{margin-top:.67em;font-size:10.5em;color:#d32f2f;line-height:1.25}
.jt-note{margin-top:.21em;font-size:7em;color:#d32f2f;font-style:italic;text-decoration:underline}`;

/* ---------------- the page ---------------- */
export function vTags() {
  const T = tagData(),
    pages = tagsToPrint(T).reduce((n, t) => n + (+t.copies || 1), 0),
    box = (id, f, val) => raw(fieldControl({ k: '', ...f }, val, { id }));
  return String(html`<style>${raw(TAG_CSS)}</style><div class="head"><div><h1>Job Stock Tags</h1><span class="muted">Signs for stock kept for a job: fill in as many as you need, each prints on its own A4 page</span></div>
    <div class="tools"><button class="mini" ${raw(onClick('tagClear'))}>Start Again</button><button class="btn" id="tagGo" ${raw(onClick('tagPrint'))}>${pages > 1 ? 'Print All (' + pages + ' Pages)' : 'Print Tag'}</button></div></div>
  <div class="jt" ${raw(onEvent('oninput', 'tagEdit', 'event'))} ${raw(onEvent('onchange', 'tagEdit', 'event'))}>
    <div class="jt-forms">
      <div class="panel"><h2><span>Wording On Every Tag</span></h2><div class="grid">
        <div class="ff full"><label for="tag_warn">Warning (in red)</label>${box('tag_warn', { max: 90 }, T.warn)}</div>
        <div class="ff full"><label for="tag_note">Small print (in red)</label>${box('tag_note', { max: 90 }, T.note)}</div>
      </div></div>
      ${T.list.map(
        (
          t,
          i
        ) => html`<div class="panel jt-card"><h2><span class="jt-n">Tag ${i + 1}</span><small class="muted nocap" id="tagHint_${i}">${contractOf(t.jobNo) ? 'Contract ' + t.jobNo + ' found' : ''}</small>${T.list.length > 1 ? html`<button class="cut-x" aria-label="Remove tag ${i + 1}" title="Remove" ${raw(onClick('tagDel', i))}>&times;</button>` : ''}</h2>
        <div class="jt-g">
          <div class="ff jt-f-no"><label for="tag_${i}_jobNo">Job Number</label>${box('tag_' + i + '_jobNo', { max: 30, combo: 'jobs' }, t.jobNo)}</div>
          <div class="ff jt-f-name"><label for="tag_${i}_jobName">Job Name</label>${box('tag_' + i + '_jobName', { max: 80 }, t.jobName)}</div>
          <div class="ff"><label for="tag_${i}_cIn">Colour Inside (B)</label>${box('tag_' + i + '_cIn', { max: 40, list: 'tagCols', ph: 'e.g. WP' }, t.cIn)}</div>
          <div class="ff"><label for="tag_${i}_cOut">Colour Outside (A)</label>${box('tag_' + i + '_cOut', { max: 40, list: 'tagCols', ph: 'e.g. WP' }, t.cOut)}</div>
          <div class="ff jt-f-cp"><label for="tag_${i}_copies">Copies</label>${box('tag_' + i + '_copies', { t: 'number', min: 1, max: 10 }, t.copies)}</div>
        </div></div>`
      )}
      <div class="cut-add"><button class="btn ghost" ${raw(onClick('tagAdd'))} ${T.list.length >= MAX_TAGS ? raw('disabled') : ''}>+ Add Another Tag</button><span class="muted">Each tag prints on its own A4 landscape page</span></div>
      <datalist id="tagCols">${PRE.map(([n]) => html`<option value="${n}"></option>`)}</datalist>
    </div>
    <div class="panel jt-prev"><h2><span>As They Print</span><small class="muted nocap">A4 landscape, one page each</small></h2>${T.list.map(
      (t, i) =>
        html`<p class="jt-pl">Tag ${i + 1}</p><div class="jt-pv" id="tagPv_${i}">${raw(tagSheet(full(T, t)))}</div>`
    )}</div>
  </div>
  <div class="panel jt-recent"><h2><span>Printed Recently</span></h2>${
    T.recent.length
      ? T.recent.map(
          (r, i) =>
            html`<div class="row"><span><b>${r.jobNo}</b> ${r.jobName}<br><span class="muted">${tagColours(r) || 'No colours'} · printed ${fd(r.at)}${r.by ? ' by ' + r.by : ''}</span></span><span class="acts"><button class="mini" ${raw(onClick('tagUse', i))}>Add To List</button><button class="mini pri" ${raw(onClick('tagReprint', i))}>Print</button><button class="mini del" ${raw(onClick('tagForget', i))}>Remove</button></span></div>`
        )
      : html`<p class="empty">Tags you print are listed here to print again.</p>`
  }</div>`);
}

/* typing: read the box back and redraw only that tag's preview, so the box keeps its place */
let saveT = 0;
const redrawAll = (T) =>
  T.list.forEach((t, i) => {
    const pv = $('#tagPv_' + i);
    if (pv) pv.innerHTML = tagSheet(full(T, t));
  });
export function tagEdit(e) {
  const el = e && e.target,
    m = el && /^tag_(?:(\d+)_)?(\w+)$/.exec(el.id);
  if (!m) return;
  const T = tagData(),
    k = m[2];
  if (m[1] == null) {
    /* the wording every tag carries */
    if (k == 'warn' || k == 'note') T[k] = SAFE.text(el.value, 90);
    redrawAll(T);
  } else {
    const i = +m[1],
      t = T.list[i];
    if (!t) return;
    if (k == 'copies') t.copies = Math.min(10, Math.max(1, Math.round(+el.value || 1)));
    else if (k in t) t[k] = SAFE.text(el.value, k == 'jobName' ? 80 : k == 'jobNo' ? 30 : 40);
    if (k == 'jobNo') {
      /* a known contract fills the job name in (unless one was typed) */
      const c = contractOf(t.jobNo),
        nm = $('#tag_' + i + '_jobName'),
        h = $('#tagHint_' + i);
      if (c && (!t.jobName || t.jobName == t.autoName)) {
        t.jobName = t.autoName = String(c.name || '').toLocaleUpperCase('en-GB');
        if (nm) nm.value = t.jobName;
      }
      if (h) h.textContent = c ? 'Contract ' + c.id + ' found' : '';
    }
    const pv = $('#tagPv_' + i);
    if (pv) pv.innerHTML = tagSheet(full(T, t));
  }
  const n = tagsToPrint(T).reduce((s2, t) => s2 + (+t.copies || 1), 0),
    go = $('#tagGo');
  if (go) go.textContent = n > 1 ? 'Print All (' + n + ' Pages)' : 'Print Tag';
  clearTimeout(saveT);
  saveT = setTimeout(store, 400);
}
export function tagAdd() {
  const T = tagData();
  if (T.list.length >= MAX_TAGS) return toast('Up to ' + MAX_TAGS + ' tags at a time');
  T.list.push(blank());
  store();
  render(true);
  const b = $('#tag_' + (T.list.length - 1) + '_jobNo');
  if (b) b.focus();
}
export function tagDel(i) {
  const T = tagData();
  if (!T.list[i]) return;
  T.list.splice(i, 1);
  if (!T.list.length) T.list.push(blank());
  store();
  render(true);
}
export function tagClear() {
  const T = tagData();
  askYes(
    'Start again?',
    'The tags on screen are cleared. Printed ones stay in Printed Recently.',
    'Start Again',
    () => {
      T.list = [blank()];
      store();
      render(true);
    }
  );
}
/* a recent tag back into the list (into an empty first row, or as a new row) */
export function tagUse(i) {
  const T = tagData(),
    r = T.recent[i];
  if (!r) return;
  const t = { ...blank(), jobNo: r.jobNo, jobName: r.jobName, cIn: r.cIn, cOut: r.cOut };
  const empty = T.list.findIndex((x) => !x.jobNo && !x.jobName);
  if (empty >= 0) T.list[empty] = t;
  else if (T.list.length < MAX_TAGS) T.list.push(t);
  else return toast('Up to ' + MAX_TAGS + ' tags at a time');
  store();
  render(true);
}
export function tagForget(i) {
  const T = tagData(),
    r = T.recent[i];
  if (!r) return;
  askYes('Remove this tag from the list?', r.jobNo + ' ' + r.jobName, 'Remove', () => {
    T.recent.splice(i, 1);
    store();
    render(true);
  });
}
export function tagReprint(i) {
  const T = tagData(),
    r = T.recent[i];
  if (r) printTags([full(T, { ...r, copies: 1 })]);
}
export function tagPrint() {
  const T = tagData(),
    L = tagsToPrint(T);
  if (!L.length) {
    toast('Type a job number first');
    const b = $('#tag_0_jobNo');
    if (b) b.focus();
    return;
  }
  const missing = T.list.length - L.length;
  if (!printTags(L.map((t) => full(T, t)))) return;
  /* each printed tag goes to the top of the recent list (one line per job and colours) */
  const same = (a, b2) => a.jobNo == b2.jobNo && a.jobName == b2.jobName && a.cIn == b2.cIn && a.cOut == b2.cOut,
    at = new Date().toISOString(),
    done = L.map((t) => ({ jobNo: t.jobNo, jobName: t.jobName, cIn: t.cIn, cOut: t.cOut, at, by: USER }));
  T.recent = [...done, ...T.recent.filter((r) => !done.some((d) => same(d, r)))].slice(0, RECENT_MAX);
  audit('Job stock tags printed', L.map((t) => t.jobNo).join(', '), L.length + ' tag' + (L.length == 1 ? '' : 's'));
  store();
  render(true);
  if (missing) toast(missing + ' tag' + (missing == 1 ? ' has' : 's have') + ' no job number, so not printed');
}
/** open the print window: one A4 landscape page per tag and copy. Returns false when pop-ups are blocked. */
function printTags(L) {
  const w = window.open('', '_blank');
  if (!w) {
    toast('Allow pop-ups to print tags');
    return false;
  }
  const pages = L.map((t) => tagSheet(t).repeat(Math.min(10, Math.max(1, +t.copies || 1)))).join(''),
    title = L.length == 1 ? 'Job Stock Tag ' + L[0].jobNo : L.length + ' Job Stock Tags';
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#dde4ee}
.pgs{display:flex;flex-direction:column;align-items:center;gap:6mm;padding:6mm 0}
.pgs .jt-sheet{font-size:1mm;box-shadow:0 2mm 8mm rgba(1,30,70,.18);-webkit-print-color-adjust:exact;print-color-adjust:exact}
@media print{html,body{background:#fff}.tb{display:none}.pgs{display:block;padding:0}.pgs .jt-sheet{box-shadow:none;break-after:page}.pgs .jt-sheet:last-child{break-after:auto}}
${TAG_CSS}
${PRINT_BAR_CSS}</style></head><body>${printBar(title)}<div class="pgs">${pages}</div></body></html>`);
  w.document.close();
  return true;
}
