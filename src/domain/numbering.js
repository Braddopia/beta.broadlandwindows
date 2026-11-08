/* domain/numbering: The next lead, contract and service call numbers. */
import { state } from '../data/state.js';

/* ==========================================================================
   07 · Sales & service: leads, contracts, service calls, contact book
   ========================================================================== */
/* new numbers: one more than the highest used, or the start an administrator set in Settings > Numbering */
export const nid = (p, a) => {
  const N = (typeof state != 'undefined' && state.num) || {};
  return p == 'S'
    ? 'S-' +
        String(
          Math.max(0, (+N.call || 1) - 1, ...a.map((x) => parseInt(String(x.id).split('-')[1]) || 0)) + 1
        ).padStart(4, '0')
    : String(
        Math.max(p == 'C' ? Math.max(2400000, (+N.contract || 1) - 1) : 1000, ...a.map((x) => parseInt(x.id) || 0)) + 1
      );
};
export function nextLeadId() {
  const used = new Set(state.leads.map((l) => l.id));
  let n = Math.max(1, +(state.num && state.num.lead) || 1);
  while (used.has('L' + String(n).padStart(4, '0'))) n++;
  return 'L' + String(n).padStart(4, '0');
}
export function numNext(k) {
  return k == 'lead' ? nextLeadId() : k == 'contract' ? nid('C', state.contracts) : nid('S', state.calls);
}
