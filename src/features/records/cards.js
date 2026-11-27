/* features/records/cards: one label / value row in a lead or contract window (label left, value right, typed into
   in place). v19.18: the step-by-step cards are gone; rows are grouped by features/records/ab-list.js. */
import { fieldControl } from '../../ui/forms/fields.js';
import { $$, esc } from '../../core/dom.js';
import { MARK, nxHid } from '../../ui/forms/form.js';

/* ---- row-style field (label left, value right, edited in place) ---- */
export function rfH(f, v) {
  const val = v[f.k] ?? '',
    id = 'f_' + f.k;
  let c = fieldControl(f, val, { id, rows: 2, lockedAsText: true });
  const hid = (f.dep && (v[f.dep] || 'Same as home') != 'Different') || nxHid(f, v);
  if (['invSame', 'siteSame'].includes(f.k))
    c = c.replace('<select ', '<select data-onchange="recDep" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]" ');
  if (f.k == 'contact')
    c = c.replace(
      '<select ',
      '<select data-onchange="custFill" data-args-change="[{&quot;$&quot;:&quot;value&quot;}]" '
    );
  return `<label class="rf ${f.t == 'area' ? 'ta' : ''}" ${f.dep ? `data-dep="${f.dep}"` : ''} ${f.nx ? `data-nx="${f.nx}"` : ''} ${hid ? 'hidden' : ''}><span>${esc(f.l)}${MARK(f.req, f.adm)}</span>${c}</label>`;
}
export function recDep(sel) {
  const k = sel.id.slice(2);
  $$(`#mbox [data-dep="${k}"]`).forEach((r) => (r.hidden = sel.value != 'Different'));
}
