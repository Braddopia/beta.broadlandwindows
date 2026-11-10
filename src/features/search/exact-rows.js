/* features/search/exact-rows: on a list page, the row that exactly matches the search (its number,
   name, phone, email or postcode) moves to the top, is highlighted and scrolled into view.
   Inventory does this itself (Stock ID, code or barcode); this covers every other list. */
import { $$ } from '../../core/dom.js';
import { state } from '../../data/state.js';
import { isExact } from '../../domain/exact.js';
import { allLeads } from '../../domain/leads.js';

/* page: [the action each row opens with, the records on that page] */
const PAGES = {
  leads: ['openLead', () => allLeads()],
  contracts: ['openContract', () => state.contracts],
  service: ['editCall', () => state.calls],
  deliveries: ['editDel', () => state.deliveries],
  contacts: ['editContact', () => state.contacts],
  staff: ['editStaff', () => state.staff],
};
let shown = '';
const rowArgs = (e) => {
  try {
    return JSON.parse(e.dataset.argsRow || e.dataset.args || '[]');
  } catch (x) {
    return [];
  }
};
/** called after every page draw with the top search text */
export function markExact(view, q) {
  const P = PAGES[view];
  if (!P || !q) {
    shown = '';
    return;
  }
  const ids = new Set(
    P[1]()
      .filter((r) => isExact(r, q))
      .map((r) => String(r.id))
  );
  if (!ids.size) return;
  let first = null;
  $$('#main .clk-r').forEach((e) => {
    const act = e.dataset.row || e.dataset.act;
    if (act != P[0] || !ids.has(String(rowArgs(e)[0]))) return;
    e.classList.add('xhit');
    const cell = e.tagName == 'TR' ? e.querySelector('td') : e;
    if (cell && !cell.querySelector('.xtag'))
      cell.insertAdjacentHTML('beforeend', '<span class="xtag">Exact Match</span>');
    /* first in its list (but not moved across the delivery date groups) */
    const box = e.parentElement;
    if (box && !box.querySelector('.dgrp')) box.insertBefore(e, box.firstElementChild);
    first = first || e;
  });
  const k = view + '|' + q;
  if (first && k != shown) {
    shown = k;
    requestAnimationFrame(() => first.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }
}
