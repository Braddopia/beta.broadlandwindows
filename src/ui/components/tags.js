/* ui/components/tags: Coloured status tags and star ratings. */
import { esc } from '../../core/dom.js';
import { dAuto } from '../../domain/deliveries.js';

/* ---- star rating: full, half and empty stars (works in reports too: inline SVG with its own colours) ---- */
export function stars(score, col = '#ffd002', off = 'rgba(255,255,255,.28)') {
  const s = Math.max(0, Math.min(5, Math.round((+score || 0) * 2) / 2));
  let h = '';
  for (let i = 1; i <= 5; i++) {
    const f = s >= i ? 1 : s >= i - 0.5 ? 0.5 : 0,
      id = 'h' + Math.random().toString(36).slice(2, 7);
    h += `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="${id}"><stop offset="${f * 100}%" stop-color="${col}"/><stop offset="${f * 100}%" stop-color="${off}"/></linearGradient></defs><path fill="url(#${id})" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>`;
  }
  return `<span class="stars" role="img" aria-label="${s} out of 5 stars">${h}</span>`;
}
export const prTag = (p) => `<span class="tag ${p == 'Urgent' ? 'r' : p == 'Normal' ? 'y' : 'n'}">${esc(p)}</span>`;
export const dTag = (x) => {
  const s = dAuto(x);
  return `<span class="tag fw ${s == 'Received' ? 'g' : s == 'Overdue' ? 'r' : s == 'Due today' || s == 'In transit' ? 'y' : s == 'Ordered' ? 'n' : ''}">${esc(s)}${x.damaged == 'Yes' ? ' · Damaged' : ''}</span>`;
};
export const leadTag = (s) =>
  `<span class="tag fw ${s == 'Won' ? 'g' : s == 'Lost' ? 'r' : s == 'Quoted' ? 'y' : s == 'New' ? 'n' : ''}">${esc(s)}</span>`;
export const stTag = (s) =>
  `<span class="tag ${s == 'Complete' || s == 'Fitted' ? 'g' : s == 'Deposit due' ? 'y' : ''}">${esc(s)}</span>`;
export const svcTag = (s) =>
  `<span class="tag ${s == 'Complete' ? 'g' : s == 'Booked' ? '' : s == 'Awaiting parts' ? 'n' : 'y'}">${esc(s || 'Open')}</span>`;
export const holTag = (h) =>
  `<span class="tag ${h.status == 'Approved' ? 'g' : h.status == 'Rejected' ? 'r' : 'y'}">${esc(h.status)}</span>`;
export const ordTag = (r) =>
  r.type == 'request' && r.ord
    ? `<span class="ord ${r.reqStatus == 'Pending' ? 'p' : ''}" title="${r.reqStatus == 'Pending' ? 'Pending order number' : 'Order number' + (r.pref ? ', was ' + esc(r.pref) : '')}">${esc(r.ord)}</span>`
    : '';
export const reqTag = (r) => {
  const s = r.reqStatus || 'Pending';
  return `<span class="tag ${s == 'Approved' ? 'g' : s == 'Rejected' ? 'r' : s == 'Cleared' ? 'n' : 'y'}">${esc(s)}</span>`;
};
