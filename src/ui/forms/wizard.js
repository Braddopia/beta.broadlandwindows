/* ui/forms/wizard: Step-by-step forms (new lead, new contract, supplier). */
import { onClick } from '../../core/actions.js';
import { $, esc } from '../../core/dom.js';
import { SAFE } from '../../core/sanitize.js';
import { store } from '../../data/persistence.js';
import { fieldH, readFields } from './form.js';
import { doneIn, openModal } from '../modal.js';
import { render } from '../shell/router.js';
import { toast } from '../toast.js';

/* ---- step-by-step wizard: steps [{t,d,f:[fields]} | {t,d,review:1}], v = values, check(step,v) -> error, save(v) ---- */
export let WZ = null;
export function wzDel() {
  WZ.del();
}
export function wizard(o) {
  WZ = { ...o, st: 0, seen: 0 };
  wzDraw();
}
export function wzDraw() {
  const W = WZ,
    st = W.steps[W.st],
    last = W.st == W.steps.length - 1;
  const lab = (f) => {
    const val = W.v[f.k];
    return f.t == 'number' ? (val ? val : '') : val;
  };
  const rev = () =>
    W.steps
      .filter((x) => x.f)
      .map(
        (x) =>
          `<div class="wz-r"><h3>${esc(x.t)} <button class="mini" ${onClick('wzGo', W.steps.indexOf(x))}>Change</button></h3>${x.f
            .filter((f) => !(f.nx && !W.v[f.k]))
            .map(
              (f) =>
                `<div class="si"><span>${esc(f.l.replace(/ \(.*\)/, ''))}</span><b class="${f.t == 'email' || /email|web|url/i.test(f.k) ? 'nocap' : ''}">${esc(lab(f)) || '<span class="muted">-</span>'}</b></div>`
            )
            .join('')}</div>`
      )
      .join('');
  openModal(
    `<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>${esc(W.title)}</h2>
   <div class="stp wz">${W.steps.map((x, i) => `<span class="${i <= W.st ? 'on' : ''} ${i <= W.seen || W.edit ? 'go' : ''}" ${i <= W.seen || W.edit ? onClick('wzGo', i) : ''}><i>${i < W.st ? '&#10003;' : i + 1}</i>${esc(x.t)}</span>`).join('')}</div>
   <p class="muted wz-d">Step ${W.st + 1} of ${W.steps.length}: ${esc(st.d || '')}</p>
   <div class="wz-b">${st.review ? rev() : `<div class="grid">${st.f.map((f) => fieldH(f, W.v)).join('')}</div>`}</div>
   <div class="mact">${W.del ? `<button class="btn ghost l" style="color:var(--red)" data-act="wzDel">Delete</button>` : ''}${W.st ? '<button class="btn ghost" data-act="wzStep" data-args="[-1]">Back</button>' : '<button class="btn ghost" data-act="closeModal">Cancel</button>'}${W.edit && !last ? '<button class="btn ghost" data-act="wzSave">Save now</button>' : ''}${last ? `<button class="btn green" data-act="wzSave">${esc(W.saveLabel || 'Save')}</button>` : '<button class="btn" data-act="wzStep" data-args="[1]">Next</button>'}</div>`,
    'md'
  );
  const f = $('#mbox .wz-b input:not([readonly]),#mbox .wz-b textarea');
  if (f && matchMedia('(pointer:fine)').matches) setTimeout(() => f.focus(), 80);
}
export function wzRead() {
  const st = WZ.steps[WZ.st];
  if (st.review) return true;
  const o = readFields(st.f);
  if (!o) return false;
  Object.assign(WZ.v, o);
  const e = WZ.check && WZ.check(WZ.st, WZ.v);
  if (e) {
    toast(e);
    return false;
  }
  return true;
}
export function wzStep(d) {
  if (d > 0 && !wzRead()) return;
  if (d < 0) {
    const st = WZ.steps[WZ.st];
    if (!st.review) {
      const o = {};
      st.f.forEach((f) => {
        const e = $('#f_' + f.k);
        if (!e) return;
        const r = (e.value || '').trim();
        o[f.k] =
          f.t == 'number'
            ? (SAFE.num(r, { min: f.min ?? 0, max: f.max ?? 1e9, dp: f.dp ?? 2 }) ?? 0)
            : f.t == 'date'
              ? SAFE.date(r)
              : SAFE.text(r, f.t == 'area' ? f.max || 2000 : f.max || 120);
      });
      Object.assign(WZ.v, o);
    }
  }
  WZ.st = Math.max(0, Math.min(WZ.steps.length - 1, WZ.st + d));
  WZ.seen = Math.max(WZ.seen, WZ.st);
  wzDraw();
}
export function wzGo(i) {
  if (i > WZ.seen && !WZ.edit) return;
  if (i != WZ.st && !wzRead()) return;
  WZ.st = i;
  WZ.seen = Math.max(WZ.seen, i);
  wzDraw();
}
export function wzSave() {
  if (!wzRead()) return;
  for (let i = 0; i < WZ.steps.length; i++) {
    const e = WZ.check && WZ.check(i, WZ.v);
    if (e) {
      WZ.st = i;
      wzDraw();
      toast(e);
      return;
    }
  }
  const bx = $('#mbox'),
    mk = bx.firstElementChild;
  WZ.save(WZ.v);
  store();
  render();
  if ($('#modal').classList.contains('open') && bx.firstElementChild === mk) doneIn(WZ.done || 'Saved');
}
