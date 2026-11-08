/* features/records/survey: The survey step: every window and door opening. */
import { onClick } from '../../core/actions.js';
import { $, $$, esc } from '../../core/dom.js';
import { sum } from '../../core/format.js';
import { SAFE } from '../../data/sanitize.js';
import { OPF } from './fields.js';
import { recRedraw, recordWin } from './record-window.js';
import { toast } from '../../ui/toast.js';

export const opDoor = (x) => /door/i.test(x.type || '');
export const opSafe = (x) => (opDoor(x) || x.low == 'Yes') && !/toughened|laminated/i.test(x.glaz || '');
export const opArea = (L) => Math.round(sum(L, (x) => (+x.w || 0) * (+x.h || 0)) / 1e4) / 100;
export function opsTab(W) {
  const L = (W.v.openings = W.v.openings || []),
    d = L.filter(opDoor).length,
    bad = L.filter(opSafe).length,
    isC = W.kind == 'contract';
  return `<div class="rg wide"><h4><span>Survey Schedule</span><span class="acts">${isC ? `<button class="mini" data-act="opFensa">Copy counts to FENSA</button>` : ''}<button class="mini" ${onClick('opAdd', 'w')}>+ Window</button><button class="mini pri" ${onClick('opAdd', 'd')}>+ Door</button></span></h4>
  <p class="muted nocap" style="margin:.1rem 0 .7rem;font-size:.84rem">${L.length ? `${L.length - d} window${L.length - d == 1 ? '' : 's'}, ${d} door${d == 1 ? '' : 's'}, about ${opArea(L)} m² of frame.` : 'List each opening as you survey: size, type and glass.'}${bad ? ` <b style="color:var(--red)">${bad} need${bad == 1 ? 's' : ''} safety glass</b> (doors and glass below 800mm must be toughened or laminated).` : ''}</p>
  <div class="tw" style="box-shadow:none;overflow-x:auto"><table class="plt opt"><thead class="nocap"><tr>${OPF.map((f) => `<th>${esc(f[1])}</th>`).join('')}<th></th></tr></thead><tbody>
  ${L.map((x, i) => `<tr class="${opSafe(x) ? 'warnr' : ''}">${OPF.map((f) => `<td>${f[3] ? `<select class="op" data-i="${i}" data-f="${f[0]}" data-onchange="opChk" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]">${f[3].map((o) => `<option ${o == (x[f[0]] ?? '') ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : `<input class="op" data-i="${i}" data-f="${f[0]}" value="${esc(x[f[0]] ?? '')}" ${f[0] == 'w' || f[0] == 'h' ? 'type="number" min="0" step="1" inputmode="numeric"' : 'maxlength="120"'} style="min-width:${f[2]}ch">`}</td>`).join('')}<td><button class="mini del" ${onClick('opDel', i)} aria-label="Remove">&times;</button></td></tr>`).join('') || `<tr><td colspan="${OPF.length + 1}" class="empty">No openings yet.</td></tr>`}
  </tbody></table></div></div>`;
}
export function readOps() {
  const L = (recordWin.v.openings || []).map((x) => ({ ...x }));
  $$('#mbox .op').forEach((e) => {
    const x = L[+e.dataset.i];
    if (!x) return;
    const f = e.dataset.f;
    x[f] = f == 'w' || f == 'h' ? (SAFE.num(e.value, { max: 20000, dp: 0 }) ?? '') : SAFE.text(e.value, 120);
  });
  return L;
}
export function opAdd(k) {
  const L = (recordWin.v.openings = readOps()),
    door = k == 'd',
    n = L.filter((x) => (door ? opDoor(x) : !opDoor(x))).length + 1;
  L.push({
    ref: (door ? 'D' : 'W') + n,
    room: '',
    type: door ? 'Residential door' : 'Casement window',
    w: '',
    h: '',
    glaz: door ? 'Toughened' : 'Clear',
    low: 'No',
    esc: 'No',
    vents: door ? 'No' : 'Yes',
    col: '',
    notes: '',
  });
  recordWin.dirty = 1;
  recRedraw('survey');
}
export function opDel(i) {
  recordWin.v.openings = readOps();
  recordWin.v.openings.splice(i, 1);
  recordWin.dirty = 1;
  recRedraw('survey');
}
export function opChk(el) {
  const x = readOps()[+el.dataset.i];
  if (x) el.closest('tr').classList.toggle('warnr', opSafe(x));
}
export function opFensa() {
  const L = readOps(),
    d = L.filter(opDoor).length;
  recordWin.v.winCount = L.length - d;
  recordWin.v.doorCount = d;
  ['winCount', 'doorCount'].forEach((k) => {
    const e = $('#f_' + k);
    if (e) e.value = recordWin.v[k];
  });
  recordWin.dirty = 1;
  toast('FENSA counts set: ' + (L.length - d) + ' windows, ' + d + ' doors. Save to keep.');
}
