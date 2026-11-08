/* features/records/notes: Notes and the activity log on a lead or contract. */
import { onClick } from '../../core/actions.js';
import { fd } from '../../core/dates.js';
import { esc } from '../../core/dom.js';
import { rfH } from './cards.js';

export const logTab = (
  W,
  tab
) => `<div class="rcols"><section class="rg"><h4>Notes</h4>${rfH({ k: 'notes', l: 'General notes', t: 'area', rows: 8 }, W.v)}</section>
  <section class="rg"><h4>Activity Log</h4><div class="radd"><select id="ra_t">${['Call', 'Email', 'Visit', 'Survey', 'Quote sent', 'Note'].map((x) => `<option>${x}</option>`).join('')}</select><input id="ra_n" placeholder="What happened" maxlength="300"><button class="mini pri" ${onClick('recAdd', 'log', ['t', 'n'], tab)}>Add</button></div>
  ${W.v.log.map((e, i) => `<div class="row"><span><b>${esc(e.t)}</b><br><span class="muted">${esc(e.n || '')}</span></span><span class="muted" style="text-align:right;white-space:nowrap">${fd(e.d || e.at)}<br>${esc(e.by || '')} <button class="mini del" ${onClick('recDel', 'log', i, tab)} aria-label="Remove">&times;</button></span></div>`).join('') || '<p class="empty">No activity yet.</p>'}</section></div>`;
