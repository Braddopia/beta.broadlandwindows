/* features/records/stages: The stage path at the top of a lead or contract. */
import { onClick } from '../../core/actions.js';
import { $, esc } from '../../core/dom.js';
import { svg } from '../../core/icons.js';
import { canSee } from '../auth/session.js';
import { RECORDS, recSave, recordWin } from './record-window.js';
import { askIn } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

/* ======== stages (like a sales "path"): where the job is, and one line on what to do next ======== */
export const STG = {
  lead: [
    { s: 'New', n: 'Enquiry', todo: 'Ring them back and book a home visit.', go: 'Visit Done' },
    { s: 'Surveyed', n: 'Home Visit', todo: 'Write up what they want and send the quote.', go: 'Quote Sent' },
    { s: 'Quoted', n: 'Quote', todo: 'Follow up and win the job.', go: 'Won' },
    { s: 'Won', n: 'Won', todo: 'Turn it into a contract so the job can be ordered.', go: '' },
  ],
  contract: [
    {
      s: 'Deposit due',
      n: 'Deposit',
      todo: 'Get it signed, take the deposit and book the check survey.',
      go: 'Survey Done',
    },
    { s: 'Survey done', n: 'Check Survey', todo: 'Sizes confirmed. Order the frames and glass.', go: 'Ordered' },
    { s: 'Ordered', n: 'Ordered', todo: 'Check the delivery in and agree a fitting date.', go: 'Fitting Booked' },
    { s: 'Fitting booked', n: 'Fitting Booked', todo: 'Fit the job.', go: 'Fitted' },
    { s: 'Fitted', n: 'Fitted', todo: 'Put any snags right, collect the balance and sign off.', go: 'Complete' },
    { s: 'Complete', n: 'Complete', todo: 'Job finished. Nothing more to do.', go: '' },
  ],
};
export const STG_LOST = {
  s: 'Lost',
  n: 'Lost',
  todo: 'This lead was lost. Note why, or reopen it if they come back.',
  go: '',
};
export const stgCur = () => {
  const e = $('#f_stage');
  return (e && e.value) || recordWin.v.stage || STG[recordWin.kind][0].s;
};
export const stgOf = (s) =>
  s == 'Lost' ? STG_LOST : STG[recordWin.kind].find((x) => x.s == s) || STG[recordWin.kind][0];
export function stgDraw() {
  if (!recordWin) return;
  const L = STG[recordWin.kind],
    cur = stgCur(),
    i = L.findIndex((x) => x.s == cur),
    x = stgOf(cur),
    nx = L[i + 1],
    el = $('#rwStg'),
    nu = $('#rwNextUp'),
    lost = cur == 'Lost';
  const h = `<ol class="path ${lost ? 'lost' : ''}">${L.map((y, j) => `<li class="${j < i ? 'done' : j == i ? 'on' : ''}"><button type="button" ${j == i ? 'aria-current="step"' : ''} ${onClick('stgSet', y.s)} title="${j == i ? 'Where the job is now' : 'Move to ' + esc(y.n)}">${j < i ? svg('M5 12l5 5L20 7') : ''}${esc(y.n)}</button></li>`).join('')}</ol>${lost ? '<span class="tag r">Lost</span>' : ''}${recordWin.kind == 'contract' && recordWin.v.onHold == 'Yes' ? '<span class="tag y">On Hold</span>' : ''}${recordWin.kind == 'lead' && !recordWin.isNew && cur != 'Won' ? `<button type="button" class="path-x" ${onClick('stgSet', lost ? 'New' : 'Lost')}>${lost ? 'Reopen' : 'Mark Lost'}</button>` : ''}`;
  if (el && el.dataset.h !== h) {
    el.dataset.h = h;
    el.innerHTML = h;
  }
  const g = `<small>Next Step</small><p>${esc(x.todo)}</p>${recordWin.kind == 'lead' && cur == 'Won' && canSee('contracts') && !recordWin.isNew ? '<button type="button" class="btn sm" data-act="recConvert">Convert To Contract</button>' : x.go && nx && !recordWin.isNew ? `<button type="button" class="btn sm" ${onClick('stgSet', nx.s)}>Mark As ${esc(x.go)} &rsaquo;</button>` : ''}`;
  if (nu && nu.dataset.h !== g) {
    nu.dataset.h = g;
    nu.innerHTML = g;
  }
}
export function stgSet(st) {
  if (!recordWin) return;
  const e = $('#f_stage'),
    cur = stgCur();
  if (!e || st == cur) return;
  if (![...e.options].some((o) => o.value == st)) {
    toast('That stage is not available');
    return;
  }
  const nm = stgOf(st).n,
    lab = RECORDS[recordWin.kind].label.toLowerCase(),
    bad = st == 'Lost';
  askIn(
    st == 'Won' ? 'Mark this lead as won?' : bad ? 'Mark this lead as lost?' : 'Move this ' + lab + ' to ' + nm + '?',
    st == 'Won'
      ? 'Next you can turn it into a contract. It is saved straight away.'
      : bad
        ? 'You can reopen it later if they come back. It is saved straight away.'
        : 'It is saved straight away.',
    st == 'Won' ? 'Yes, Won' : bad ? 'Yes, Lost' : 'Move To ' + nm,
    () => stgGo(st, cur, nm),
    bad
  );
}
export function stgGo(st, cur, nm) {
  const e = $('#f_stage');
  if (!recordWin || !e) return;
  e.value = st;
  e.dispatchEvent(new Event('change', { bubbles: true }));
  if (st == 'Won' || st == 'Lost') {
    const p = $('#f_prob');
    if (p) p.value = st == 'Won' ? 100 : 0;
  }
  if (recSave(false))
    setTimeout(() => {
      const s = $('#rwStg .path li.on');
      if (s) s.classList.add('pop');
      toast('Moved to ' + nm);
    }, 60);
  else stgDraw();
}
