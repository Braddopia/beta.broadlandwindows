/* features/records/list-parts: Pieces shared by the Leads and Contracts pages: stage counts, stage bars and year filter. */
import { onClick, onEvent } from '../../core/actions.js';
import { esc } from '../../core/dom.js';
import { m0, sum } from '../../core/format.js';
import { state } from '../../data/state.js';
import { STG, STG_LOST } from './stages.js';
import { render } from '../../ui/shell/router.js';
import { uiState } from '../../ui/ui-state.js';

/* years of records: pick a year to look back at, or all years */
export function yrSel(key, dates) {
  const Y = [
      ...new Set(
        dates
          .filter(Boolean)
          .map((d) => String(d).slice(0, 4))
          .filter((y) => /^20\d\d$/.test(y))
      ),
    ]
      .sort()
      .reverse(),
    cur = uiState[key].yr || 'all';
  if (Y.length < 2 && cur == 'all') return '';
  return `<label class="fl-own">Year <select class="fsel" ${onEvent('onchange', 'setUI', key + '.yr', 'this.value')}><option value="all">All years</option>${Y.map((y) => `<option ${y == cur ? 'selected' : ''}>${y}</option>`).join('')}</select></label>`;
}
export function pipeSet(key, s) {
  const U = uiState[key];
  U.st = U.st == s ? '' : s;
  if (U.st) U.f = 'all';
  U.page = 1;
  render();
}
export function stgPipe(kind) {
  const key = kind == 'lead' ? 'lead' : 'ctr',
    U = uiState[key],
    L = kind == 'lead' ? [...STG.lead, STG_LOST] : STG.contract,
    R2 = kind == 'lead' ? state.leads : state.contracts.filter((c) => c.cancelled != 'Yes'),
    f0 = L[0].s;
  return `<div class="pipe" role="group" aria-label="Stages">${L.map((x, i) => {
    const B = R2.filter((r) => (r.stage || f0) == x.s),
      on = U.st == x.s;
    return `<button type="button" class="pp ${on ? 'on' : ''} ${x.s == 'Lost' ? 'pl' : ''} ${x.s == 'Won' || x.s == 'Complete' ? 'pw' : ''}" aria-pressed="${on}" ${onClick('pipeSet', key, x.s)}><i>${x.s == 'Lost' ? '×' : i + 1}</i><span><b>${esc(x.n)}</b><small>${B.length} · ${m0(sum(B, (r) => +r.value || 0))}</small></span></button>`;
  }).join('')}</div>
   ${U.st ? `<p class="pipe-f">Showing only <b>${esc((L.find((x) => x.s == U.st) || {}).n || U.st)}</b> <button type="button" class="mini" ${onClick('pipeSet', key, U.st)}>Show all stages</button></p>` : ''}`;
}
/** a list row's stage: its name with a thin bar under it showing how far along it is */
export function stDots(kind, s) {
  const L = STG[kind],
    i = L.findIndex((x) => x.s == s),
    x = s == 'Lost' ? STG_LOST : L[i] || L[0],
    end = s == 'Won' || s == 'Complete',
    pct = s == 'Lost' ? 100 : Math.round(((Math.max(i, 0) + 1) / L.length) * 100);
  return `<span class="sprog2 ${s == 'Lost' ? 'lost' : end ? 'end' : ''}" title="${esc(s == 'Lost' ? 'Lost' : 'Stage ' + (Math.max(i, 0) + 1) + ' of ' + L.length)}"><b>${esc(x.n)}</b><span class="sbar2" aria-hidden="true"><i style="width:${pct}%"></i></span></span>`;
}
