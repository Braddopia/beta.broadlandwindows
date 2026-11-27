/* features/records/ab-list: the label / value list used in the lead and contract windows (v19.18), laid out like the
   office's old system (AdminBase): one row per box with a thin line between rows, and groups that fold away under a
   heading with a chevron. A folded group shows a short summary on its heading row (Sales Information shows the
   salesperson). A group can carry a tick box on its heading (Supply Only, On Hold, Cancelled).
   Which groups are open is remembered for each person on this computer. */
import { $ } from '../../core/dom.js';
import { html, raw } from '../../core/html.js';
import { svg } from '../../core/icons.js';
import { rfH } from './cards.js';
import { fieldControl } from '../../ui/forms/fields.js';
import { MARK } from '../../ui/forms/form.js';

/* groups that start open the first time (the rest start folded) */
const OPEN_FIRST = new Set([
  'Sales Information',
  'Phone Numbers',
  'Email',
  'Home Address',
  'Source And Interest',
  'Result',
  'Money',
  'Dates',
  'Team',
  'Next Visit',
]);
const memKey = () => 'bb_abg_' + (typeof USER == 'string' ? USER : '');
function mem() {
  try {
    return JSON.parse(localStorage.getItem(memKey()) || '{}') || {};
  } catch (e) {
    return {};
  }
}
function remember(g, open) {
  try {
    const m = mem();
    m[g] = open ? 1 : 0;
    localStorage.setItem(memKey(), JSON.stringify(m));
  } catch (e) {
    /* private window: the groups simply start as they always do */
  }
}
export const abgOpen = (g) => {
  const m = mem();
  return g in m ? !!m[g] : OPEN_FIRST.has(g);
};
/** what a folded group shows on its heading: the fields marked `sum`, else the first two filled in */
export function abgSum(fs, v) {
  const val = (f) => {
    const x = f.t == 'calc' ? f.calc(v) : v[f.k];
    if (f.t == 'tick' || x == null || x === '' || x === 0) return '';
    if (f.t == 'select' && Array.isArray(f.o[0])) return ((f.o.find((o) => o[0] == x) || [])[1] || x) + '';
    return String(x);
  };
  const s = fs
    .filter((f) => f.sum)
    .map(val)
    .filter(Boolean);
  return (s.length ? s : fs.map(val).filter(Boolean).slice(0, 2)).join(' · ');
}
/** one row: label on the left, the value on the right (typed into in place) */
export function abRow(f, v) {
  if (f.t == 'calc')
    return String(html`<div class="rf calc"><span>${f.l}</span><output>${f.calc(v) || ''}</output></div>`);
  if (f.t == 'tick')
    return String(
      html`<label class="rf tk"><span>${f.l}${raw(MARK(f.req, f.adm))}</span>${raw(fieldControl(f, v[f.k] ?? ''))}</label>`
    );
  if (f.k == 'ccol') {
    const sw = String(
      html`<i class="ccsw" id="ccsw" style="background:${/^#[0-9a-f]{6}$/i.test(v.ccol || '') ? v.ccol : 'transparent'}"></i>`
    );
    return rfH(f, v).replace(
      '<select ',
      () => sw + '<select data-onchange="ccolSet" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]" '
    );
  }
  return rfH(f, v);
}
/** the whole list: rows with no group stand alone; rows sharing a group fold together under its heading */
export function abList(fs, v) {
  const out = [];
  for (let i = 0; i < fs.length; ) {
    const g = fs[i].g;
    if (!g) {
      out.push(abRow(fs[i], v));
      i++;
      continue;
    }
    let j = i;
    while (j < fs.length && fs[j].g == g) j++;
    out.push(abGroup(g, fs.slice(i, j), v));
    i = j;
  }
  return `<div class="abl">${out.join('')}</div>`;
}
/* the fields of each group drawn, so a group folded later can show its summary */
const ABF = {};
export function abGroup(g, fs, v) {
  const head = fs.find((f) => f.head),
    body = fs.filter((f) => f !== head),
    open = abgOpen(g),
    id = 'abg_' + g.replace(/\W+/g, '');
  ABF[g] = body;
  return String(
    html`<section class="abg ${open ? 'open' : ''}" data-g="${g}"><div class="abg-h"><button type="button" class="abg-t" data-act="abgToggle" data-args="[{&quot;$&quot;:&quot;this&quot;}]" aria-expanded="${String(open)}" aria-controls="${id}">${raw(svg('M8 10l4 4 4-4'))}<b>${head ? head.l : g}</b></button>${head ? html`<label class="abg-tk" title="${head.l}">${raw(fieldControl(head, v[head.k] ?? ''))}<span class="sr">${head.l}</span></label>` : ''}<small class="abg-sum nocap">${abgSum(body, v)}</small></div><div class="abg-b" id="${id}">${raw(body.map((f) => abRow(f, v)).join(''))}</div></section>`
  );
}
export function abgToggle(b, force) {
  const s = b.closest('.abg');
  if (!s) return;
  const open = force ?? !s.classList.contains('open');
  s.classList.toggle('open', open);
  b.setAttribute('aria-expanded', open);
  remember(s.dataset.g, open);
  if (!open) {
    const sum = s.querySelector('.abg-sum'),
      fs = ABF[s.dataset.g] || [],
      v = {};
    fs.forEach((f) => {
      const e = document.getElementById('f_' + f.k);
      if (e) v[f.k] = e.type == 'checkbox' ? (e.checked ? 'Yes' : '') : e.value;
    });
    if (sum) sum.textContent = abgSum(fs, v);
  }
}
/** open whatever hides a box (its folded group), so a message about it can be seen */
export function abReveal(el) {
  const s = el && el.closest && el.closest('.abg');
  if (s && !s.classList.contains('open')) abgToggle(s.querySelector('.abg-t'), true);
}
/** the colour swatch beside Contract Colour follows the choice */
export function ccolSet(sel) {
  const sw = $('#ccsw');
  if (sw) sw.style.background = sel.value || 'transparent';
}
