/* features/records/record-parts: the parts of the lead and contract windows laid out like the old system (v19.18):
   the Address window (who the customer is, how to reach them, their addresses and marketing consent) and the Details
   tab in two halves (the label / value list on the left; Products and Other Info on the right). */
import { onClick } from '../../core/actions.js';
import { html, raw } from '../../core/html.js';
import { state } from '../../data/state.js';
import { abList } from './ab-list.js';
import { CUSTF, GDPRF } from './fields.js';

const LEFT = new Set(['Customer', 'Phone Numbers', 'Email']);
/** the Address window: customer and phones on the left; home, invoice and site addresses and consent on the right */
export function addrTab(W) {
  const C = CUSTF.map((f) => (f.g == 'Customer' ? { ...f, g: '' } : f)),
    G = GDPRF.map((f) => ({ ...f, g: 'Marketing Consent' }));
  return String(
    html`<div class="abh2"><div>${raw(
      abList(
        C.filter((f) => !f.g || LEFT.has(f.g)),
        W.v,
        'Customer'
      )
    )}</div><div>${raw(abList([...C.filter((f) => f.g && !LEFT.has(f.g)), ...G], W.v))}</div></div>`
  );
}
/** a short fact on Other Info */
const fact = (l, v) => html`<div class="rf calc"><span>${l}</span><output>${v}</output></div>`;
const count = (a) => (a || []).length;
/** the Details tab: fields without `half: 'r'` on the left; on the right Products (when given) and Other Info */
export function detailsTab(W, fs, products) {
  const L = fs.filter((f) => f.half != 'r'),
    R = fs.filter((f) => f.half == 'r'),
    v = W.v;
  const facts =
    W.kind == 'contract'
      ? [
          fact('Openings surveyed', count(v.openings)),
          fact('Deliveries booked', count(state.deliveries.filter((d) => d.contract == v.id))),
          fact('Service calls', count(state.calls.filter((c) => c.contract == v.id))),
          fact('Photos', count(v.photos)),
        ]
      : [fact('Openings surveyed', count(v.openings)), fact('Visits booked', count(v.appts))];
  const other = html`${raw(abList(R, v))}<div class="abl abfacts"><section class="abg open abg-plain"><div class="abg-h"><span class="abg-t"><b>At A Glance</b></span></div><div class="abg-b">${facts}</div></section></div>`;
  return String(
    html`<div class="abd"><div class="abd-l">${raw(abList(L, v, W.kind == 'contract' ? 'Contract' : W.kind == 'lead' ? 'Lead' : 'Details'))}</div><div class="abd-r">${
      products
        ? html`<div class="ab-sub" role="tablist" aria-label="Products or other information"><button type="button" role="tab" class="on" aria-selected="true" data-s="prod" ${raw(onClick('recSub', 'prod'))}>Products</button><button type="button" role="tab" aria-selected="false" data-s="other" ${raw(onClick('recSub', 'other'))}>Other Info</button></div><div class="ab-sp on" data-s="prod">${raw(products)}</div><div class="ab-sp" data-s="other">${other}</div>`
        : other
    }</div></div>`
  );
}
/** Products / Other Info on the right half of Details */
export function recSub(k) {
  document.querySelectorAll('#mbox .ab-sub button').forEach((b) => {
    b.classList.toggle('on', b.dataset.s == k);
    b.setAttribute('aria-selected', b.dataset.s == k);
  });
  document.querySelectorAll('#mbox .ab-sp').forEach((p) => p.classList.toggle('on', p.dataset.s == k));
}
