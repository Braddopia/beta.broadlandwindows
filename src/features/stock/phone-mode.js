/* features/stock/phone-mode: On a phone the stock page works like a handheld scanner. */
import { onClick, rowClick } from '../../core/actions.js';
import { esc } from '../../core/dom.js';
import { ICONS, svg } from '../../core/icons.js';
import { state } from '../../data/state.js';
import { hasLoc, isLow, key, products } from '../../domain/stock.js';
import { scan } from '../scanner/scanner.js';
import { found } from './item-window.js';
import { render, view } from '../../ui/shell/router.js';

/* on a phone the stock page works like a handheld scanner: big buttons for the everyday jobs */
export const isPhone = () => matchMedia('(max-width:700px)').matches;
export function vPDA() {
  const P = products(),
    low = P.filter((r) => isLow(r) && r.stock > 0),
    out = P.filter((r) => r.stock <= 0),
    mine = state.items.filter((r) => r.user == USER && r.type != 'request').slice(0, 5);
  const b = (ic, t, s, act, cls) =>
    `<button type="button" class="pda-b ${cls || ''}" ${act}><span class="pda-i">${svg(ic)}</span><b>${t}</b><small>${s}</small></button>`;
  return `<div class="head"><div><h1>Stock</h1><span class="muted">${P.length} products · ${low.length} low · ${out.length} out</span></div></div>
  <div class="pda">${b(ICONS.scan, 'Scan Barcode', 'Find an item fast', onClick('scanFound'), 'y')}${b(ICONS.plus, 'Add Stock', 'Goods in', onClick('stockForm', 'add'), 'g')}${b('M5 12h14', 'Remove Stock', 'Used on a job', onClick('stockForm', 'remove'), 'r')}${b(ICONS.stock, 'Request Stock', 'Ask for an order', onClick('stockForm', 'request'))}${b(ICONS.reports, 'Stock Report', 'Print or save', onClick('invRep'))}${b(ICONS.search, 'Find An Item', 'Search by name or code', onClick('cmdk', true))}</div>
  ${
    low.length || out.length
      ? `<div class="panel"><h2>Running Low</h2>${[...out, ...low]
          .slice(0, 8)
          .map(
            (r) =>
              `<div class="row clk-r" ${rowClick('viewItem', key(r))}><span><b>${esc(r.item)}</b><br><span class="muted">${esc(hasLoc(r) ? r.location : 'No location')}</span></span><span class="tag ${r.stock <= 0 ? 'r' : 'y'}">${r.stock} left</span></div>`
          )
          .join('')}</div>`
      : ''
  }
  ${mine.length ? `<div class="panel" style="margin-top:1rem"><h2>My Last Moves</h2>${mine.map((r) => `<div class="row"><span><b>${esc(r.item)}</b><br><span class="muted">${esc(r.time || '')}</span></span><span class="tag ${r.type == 'add' ? 'g' : 'r'}">${r.type == 'add' ? '+' : '-'}${r.qty}</span></div>`).join('')}</div>` : ''}
  <p style="text-align:center;margin-top:1.2rem"><button class="btn ghost sm" ${onClick('setUI', 'inv.full', 1)}>Show the full inventory</button></p>`;
}
export let pdaWas = null;
export function scanFound() {
  scan(found);
}

/* start-up step (run once by main.js) */
export function watchPhoneSize() {
  addEventListener('resize', () => {
    const p = isPhone();
    if (pdaWas !== null && p !== pdaWas && typeof view != 'undefined' && view == 'stock') render();
    pdaWas = p;
  });
}
