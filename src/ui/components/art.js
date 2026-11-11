/* ui/components/art: Pictures shown when a list is empty. */
import { esc } from '../../core/dom.js';
import { ICONS, svg } from '../../core/icons.js';

/* ==========================================================================
   16 · Illustrations, empty states and the welcome tour
   Pattern tiles in the chosen Look (see 18-looks.js), with line icons.
   ========================================================================== */
/* Empty lists and the tour use a pattern tile (in the chosen Look) with a line icon, instead of drawings. */
export const ART_IC = {
  van: ICONS.deliveries,
  survey: ICONS.edit,
  stock: ICONS.stock,
  holiday: ICONS.holidays,
  team: ICONS.staff,
  chart: ICONS.reports,
  done: 'M5 13l4 4L19 7',
  files: ICONS.downloads,
};
export const emptyArt = (k, txt) =>
  `<div class="emp">${ART_IC[k] ? `<span class="pmed lkp">${svg(ART_IC[k])}</span>` : ''}${txt ? `<p>${esc(txt)}</p>` : ''}</div>`;
