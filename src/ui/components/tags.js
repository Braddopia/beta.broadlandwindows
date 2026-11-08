/* ui/components/tags: coloured status tags and star ratings.
   Each tag is a <span class="tag ..."> whose colour letter comes from a small lookup: g green, y amber, r red, n neutral.
   All return plain HTML strings; every value is escaped by html``. */
import { html } from '../../core/html.js';
import { dAuto } from '../../domain/deliveries.js';

const tag = (cls, text) => String(html`<span class="${cls}">${text}</span>`);

/* ---- star rating: full, half and empty stars (works in reports too: inline SVG with its own colours) ---- */
export function stars(score, col = '#ffd002', off = 'rgba(255,255,255,.28)') {
  const s = Math.max(0, Math.min(5, Math.round((+score || 0) * 2) / 2));
  const one = (i) => {
    const f = s >= i ? 1 : s >= i - 0.5 ? 0.5 : 0,
      id = 'h' + Math.random().toString(36).slice(2, 7);
    return html`<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="${id}"><stop offset="${f * 100}%" stop-color="${col}"/><stop offset="${f * 100}%" stop-color="${off}"/></linearGradient></defs><path fill="url(#${id})" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>`;
  };
  return String(
    html`<span class="stars" role="img" aria-label="${s} out of 5 stars">${[1, 2, 3, 4, 5].map(one)}</span>`
  );
}

export const prTag = (p) => tag('tag ' + (p == 'Urgent' ? 'r' : p == 'Normal' ? 'y' : 'n'), p);

const DELIVERY_COLOUR = { Received: 'g', Overdue: 'r', 'Due today': 'y', 'In transit': 'y', Ordered: 'n' };
export const dTag = (x) => {
  const s = dAuto(x);
  return tag('tag fw ' + (DELIVERY_COLOUR[s] || ''), s + (x.damaged == 'Yes' ? ' · Damaged' : ''));
};

export const stTag = (s) => tag('tag ' + (s == 'Complete' || s == 'Fitted' ? 'g' : s == 'Deposit due' ? 'y' : ''), s);

export const svcTag = (s) =>
  tag('tag ' + (s == 'Complete' ? 'g' : s == 'Booked' ? '' : s == 'Awaiting parts' ? 'n' : 'y'), s || 'Open');

export const holTag = (h) =>
  tag('tag ' + (h.status == 'Approved' ? 'g' : h.status == 'Rejected' ? 'r' : 'y'), h.status);

/** order number chip on a stock request (dashed while the number is still pending) */
export const ordTag = (r) => {
  if (r.type != 'request' || !r.ord) return '';
  const pending = r.reqStatus == 'Pending';
  const title = pending ? 'Pending order number' : 'Order number' + (r.pref ? ', was ' + r.pref : '');
  return String(html`<span class="ord ${pending ? 'p' : ''}" title="${title}">${r.ord}</span>`);
};

export const reqTag = (r) => {
  const s = r.reqStatus || 'Pending';
  return tag('tag ' + (s == 'Approved' ? 'g' : s == 'Rejected' ? 'r' : s == 'Cleared' ? 'n' : 'y'), s);
};
