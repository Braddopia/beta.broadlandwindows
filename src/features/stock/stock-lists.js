/* features/stock/stock-lists: Inventory, Stock Lists (administrators): the locations products are kept in, the
   product groups, and the colour codes with the RAL colour and finish each one means. Products pick from these
   lists, so they are always spelt the same. */
import { onClick } from '../../core/actions.js';
import { $$ } from '../../core/dom.js';
import { html, raw } from '../../core/html.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { FINISHES, codeText, stockLists } from '../../domain/stock-lists.js';
import { need } from '../auth/session.js';
import { fieldControl } from '../../ui/forms/fields.js';
import { RAL } from '../../ui/forms/colour-picker.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';

const TABS = [
  ['locs', 'Locations', 'Where stock is kept. Each product picks one.'],
  ['groups', 'Product Groups', 'What kind of product it is, for filtering and the stock value by group.'],
  ['colours', 'Colour Codes', 'Each code with the RAL colour and finish it means, e.g. KL016 is RAL 7032 Matt.'],
];
let DRAFT = null,
  TAB = 'locs';
const ralHex = (n) => (RAL.find((r) => r[0] == n) || [])[2] || '';

/** open the lists (administrators only) */
export function invLists(tab) {
  if (!need('manage', 'Changing the stock lists')) return;
  if (!tab || !DRAFT) DRAFT = JSON.parse(JSON.stringify(stockLists()));
  else listsRead();
  TAB = tab || 'locs';
  draw();
}
/* draw the open tab from the working copy */
function draw() {
  const t = TABS.find((x) => x[0] == TAB),
    box = (k, v, id, o = {}) => raw(fieldControl({ k, t: o.t, o: o.o, max: o.max || 40, ph: o.ph }, v, { id }));
  const rows =
    TAB == 'colours'
      ? DRAFT.colours.map(
          (c, i) =>
            html`<div class="sl-r sl-c" data-i="${i}"><span class="sl-sw" style="background:${ralHex(c.ral) || 'transparent'}"></span>${box('code', c.code, 'slc' + i, { max: 20, ph: 'Code' })}${box('ral', c.ral, 'slr' + i, { max: 4, ph: 'RAL' })}${box('fin', c.fin, 'slf' + i, { t: 'select', o: ['', ...FINISHES] })}<small class="sl-t nocap">${codeText(c)}</small><button type="button" class="mini del" aria-label="Remove" ${raw(onClick('listsDel', i))}>&times;</button></div>`
        )
      : DRAFT[TAB].map(
          (v, i) =>
            html`<div class="sl-r" data-i="${i}">${box('v', v, 'slv' + i, { max: 40 })}<button type="button" class="mini del" aria-label="Remove" ${raw(onClick('listsDel', i))}>&times;</button></div>`
        );
  openModal(
    String(html`<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>Stock Lists</h2>
      <div class="seg sl-tabs">${TABS.map(([k, n]) => html`<button class="${k == TAB ? 'on' : ''}" ${raw(onClick('invLists', k))}>${n} <i>${DRAFT[k].length}</i></button>`)}</div>
      <p class="muted">${t[2]}</p>
      ${TAB == 'colours' ? raw('<div class="sl-h" aria-hidden="true"><span></span><span>Code</span><span>RAL</span><span>Finish</span><span>Shows as</span></div>') : ''}
      <div class="sl-list">${rows}</div>
      <button type="button" class="btn ghost sm" ${raw(onClick('listsAdd'))}>+ Add ${TAB == 'locs' ? 'Location' : TAB == 'groups' ? 'Group' : 'Colour Code'}</button>
      <div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" data-act="listsSave">Save Lists</button></div>`),
    'md'
  );
}
/* what is typed in the open tab, back into the working copy */
function listsRead() {
  if (TAB == 'colours')
    DRAFT.colours = $$('#mbox .sl-c').map((r) => {
      const i = r.dataset.i;
      return {
        code: SAFE.text(r.querySelector('#slc' + i).value, 20)
          .toUpperCase()
          .replace(/\s+/g, ''),
        ral: SAFE.text(r.querySelector('#slr' + i).value, 4).replace(/\D/g, ''),
        fin: FINISHES.includes(r.querySelector('#slf' + i).value) ? r.querySelector('#slf' + i).value : '',
      };
    });
  else DRAFT[TAB] = $$('#mbox .sl-r').map((r) => SAFE.text(r.querySelector('input').value, 40).trim());
}
export function listsAdd() {
  listsRead();
  if (TAB == 'colours') DRAFT.colours.push({ code: '', ral: '', fin: '' });
  else DRAFT[TAB].push('');
  draw();
  const f = $$('#mbox .sl-r').pop().querySelector('input');
  if (f) f.focus();
}
export function listsDel(i) {
  listsRead();
  DRAFT[TAB].splice(i, 1);
  draw();
}
export function listsSave() {
  if (!need('manage', 'Changing the stock lists')) return;
  listsRead();
  const uniq = (a) => [...new Map(a.filter(Boolean).map((x) => [x.toLowerCase(), x])).values()];
  const bad = DRAFT.colours.find((c) => c.code && c.ral && !RAL.some((r) => r[0] == c.ral));
  if (bad) {
    toast('RAL ' + bad.ral + ' (for ' + bad.code + ') is not a RAL colour number');
    return;
  }
  const seen = new Set();
  state.stockLists = {
    locs: uniq(DRAFT.locs),
    groups: uniq(DRAFT.groups),
    colours: DRAFT.colours.filter((c) => c.code && !seen.has(c.code) && seen.add(c.code)),
  };
  DRAFT = null;
  audit(
    'Stock lists changed',
    'Inventory',
    state.stockLists.locs.length +
      ' locations, ' +
      state.stockLists.groups.length +
      ' groups, ' +
      state.stockLists.colours.length +
      ' colour codes'
  );
  store();
  closeModal();
  render();
  toast('Stock lists saved');
}
