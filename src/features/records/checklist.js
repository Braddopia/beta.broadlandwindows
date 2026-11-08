/* features/records/checklist: The checklist step (sales steps and job progress). */
import { fd } from '../../core/dates.js';
import { esc } from '../../core/dom.js';
import { CK, CKG, LCKG } from '../../domain/checklists.js';

/* checklist shown as stages, with who ticked each item and when */
export const ckTab = (W, items) => {
  const G = items === CK ? CKG : LCKG,
    C = W.v.chk || {},
    T = W.v.chkAt || {},
    n = items.filter((k) => C[k]).length;
  return `<div class="ckw"><div class="ck-top"><b>${n} of ${items.length} done</b><i><b style="width:${Math.round((100 * n) / (items.length || 1))}%"></b></i></div><div class="ckg">${G.map(
    ([t, d, L], gi) => {
      const dn = L.filter((k) => C[k]).length;
      return `<section class="rg ck-s ${dn == L.length ? 'all' : ''}"><h4><span><i class="ck-n">${gi + 1}</i>${esc(t)}</span><small>${dn} of ${L.length}</small></h4><p class="muted">${esc(d)}</p>${L.map((k) => `<label class="ck-i"><input type="checkbox" class="rck" data-k="${esc(k)}" ${C[k] ? 'checked' : ''}><span><b>${esc(k)}</b><small class="ck-w">${C[k] && T[k] ? 'Done ' + fd(T[k].d) + ' by ' + esc(T[k].by) : C[k] ? 'Done' : ''}</small></span></label>`).join('')}</section>`;
    }
  ).join('')}</div></div>`;
};
