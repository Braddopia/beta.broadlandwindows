/* features/search/answers: Showing the full list for a plain-English search. */
import { onClick } from '../../core/actions.js';
import { esc } from '../../core/dom.js';
import { tc } from '../../core/format.js';
import { NLQ } from './search.js';
import { closeModal, openModal } from '../../ui/modal.js';

export function nlqAll() {
  if (!NLQ) return;
  const { E, L, title } = NLQ;
  openModal(
    `<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>${esc(tc(title))}</h2><p class="muted">${L.length} found</p><div class="nlq-l">${L.map(
      (r, i) => {
        const [t, s] = E.sh(r);
        return `<button type="button" class="sri" ${onClick('nlqOpen', i)}><span class="sri-t"><b>${esc(tc(String(t || '')))}</b><small>${esc(s)}</small></span></button>`;
      }
    ).join('')}</div>`,
    'md'
  );
}
export function nlqOpen(i) {
  const r = NLQ && NLQ.L[i];
  if (!r) return;
  closeModal();
  NLQ.E.o(r);
}
