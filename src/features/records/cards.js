/* features/records/cards: Lead and contract cards: one plain question each, opening in turn. */
import { fd } from '../../core/dates.js';
import { $, $$, esc } from '../../core/dom.js';
import { money } from '../../core/format.js';
import { ICONS, svg } from '../../core/icons.js';
import { SAFE } from '../../core/sanitize.js';
import { ISADM } from '../auth/session.js';
import { RTAB, recStep, recordWin } from './record-window.js';
import { MARK, nxHid } from '../../ui/forms/form.js';

/* ---- row-style field (label left, value right, edited in place) ---- */
export function rfH(f, v) {
  const val = v[f.k] ?? '',
    id = 'f_' + f.k;
  let c;
  if (f.ro || (f.adm && !ISADM())) c = `<input id="${id}" value="${esc(val)}" readonly tabindex="-1">`;
  else if (f.t == 'select')
    c = `<select id="${id}">${(val !== '' && !f.o.map(String).includes(String(val)) ? [val, ...f.o] : f.o).map((o) => `<option value="${esc(o)}" ${String(o) == String(val) ? 'selected' : ''}>${esc(o || '-')}</option>`).join('')}</select>`;
  else if (f.t == 'area')
    c = `<textarea id="${id}" rows="${f.rows || 2}" maxlength="${f.max || 2000}">${esc(val)}</textarea>`;
  else
    c = `<input id="${id}" type="${f.t == 'number' ? 'number' : f.t == 'date' ? 'date' : f.t == 'time' ? 'time' : f.t == 'email' ? 'email' : f.t == 'tel' ? 'tel' : 'text'}" ${f.t == 'number' ? 'step="any" min="0" inputmode="decimal"' : `maxlength="${f.max || 120}"`} value="${esc(val)}" ${f.list ? `list="${f.list}"` : ''} autocomplete="off">`;
  const hid = (f.dep && (v[f.dep] || 'Same as home') != 'Different') || nxHid(f, v);
  if (['invSame', 'siteSame'].includes(f.k))
    c = c.replace('<select ', '<select data-onchange="recDep" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]" ');
  return `<label class="rf ${f.t == 'area' ? 'ta' : ''}" ${f.dep ? `data-dep="${f.dep}"` : ''} ${f.nx ? `data-nx="${f.nx}"` : ''} ${hid ? 'hidden' : ''}><span>${esc(f.l)}${MARK(f.req, f.adm)}</span>${c}</label>`;
}
/* each group reads as a plain question; fields marked adv fold away under "More details" */
export const GQ = {
  Customer: 'Who Is The Customer?',
  'Phone Numbers': 'How Can We Phone Them?',
  Email: 'Their Email Address',
  'Home Address': 'Where Do They Live?',
  'Invoice Address': 'Where Should The Invoice Go?',
  'Site Address': 'Where Is The Work Being Done?',
  Lead: 'About This Lead',
  'Source And Interest': 'How They Found Us And What They Want',
  Result: 'What Happens Next',
  'Next Visit': 'The Next Visit',
  Contract: 'About This Contract',
  'Sales Information': 'Who Sold It And How They Found Us',
  Money: 'The Money',
  'Finance Plan': 'Paying On Finance?',
  Invoice: 'Invoicing',
  Dates: 'Fitting Dates',
  Team: 'Fitting Team',
  'Info For FENSA': 'Details For FENSA',
};
export const DEFV = { invSame: 'Same as home', siteSame: 'Same as home' };
export const fval = (f, v) => String(v[f.k] ?? DEFV[f.k] ?? '').trim();
/* a section is finished when its required boxes are filled (and, for phones, at least one number) */
export function grpDone(fs, v) {
  const vis = fs.filter((f) => !(f.dep && (v[f.dep] || 'Same as home') != 'Different'));
  if (!vis.some((f) => f.req || f.any || DEFV[f.k])) return vis.some((f) => !f.ro && !f.adv && fval(f, v));
  return (
    vis.filter((f) => f.req).every((f) => fval(f, v)) &&
    (!vis.some((f) => f.any) || vis.some((f) => f.any && fval(f, v))) &&
    vis.some((f) => fval(f, v))
  );
}
export const grpSum = (fs, v) =>
  fs
    .filter((f) => !f.adv && !(f.dep && (v[f.dep] || 'Same as home') != 'Different'))
    .map((f) => {
      const x = fval(f, v);
      if (!x || (f.t == 'number' && +x === 0 && /£/.test(f.l))) return '';
      return f.t == 'number' && /£/.test(f.l)
        ? money(+x)
        : f.k == 'vatRate'
          ? 'VAT ' + x + '%'
          : f.t == 'date' && SAFE.date(x)
            ? fd(x)
            : x;
    })
    .filter(Boolean)
    .slice(0, 4)
    .join(' · ');
/* ---- cards that open in turn ----
   Each group is a card: icon, plain question, and "Not filled in yet" or a one-line summary with a tick.
   One card is open at a time; its Next button closes it and opens the next (or moves to the next step). */
export const GRPF = {};
export let GID = 0;
export const GIC = {
  Customer: ICONS.user,
  'Phone Numbers': 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2',
  Email: 'M4 6h16v12H4zM4 7l8 6 8-6',
  'Home Address': ICONS.home,
  'Invoice Address': ICONS.finance,
  'Site Address': 'M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z',
  Lead: ICONS.leads,
  'Source And Interest': ICONS.search,
  Result: ICONS.fitting,
  'Next Visit': ICONS.fitting,
  Contract: ICONS.contracts,
  'Sales Information': ICONS.leads,
  Money: ICONS.finance,
  'Finance Plan': ICONS.finance,
  Invoice: ICONS.reports,
  Dates: ICONS.fitting,
  Team: ICONS.staff,
  'Info For FENSA': ICONS.admin,
};
export const TICK = 'M5 13l4 4L19 7';
export const grpH = (t, fs, v, id, nextT) => {
  GRPF[id] = fs;
  const main = fs.filter((f) => !f.adv),
    adv = fs.filter((f) => f.adv),
    open = adv.some((f) => String(v[f.k] ?? '').trim()),
    done = grpDone(fs, v);
  return `<section class="rg fg gc shut ${done ? 'done' : ''}" data-g="${id}" data-ic="${esc(GIC[t] || ICONS.edit)}"><h4><button type="button" class="rg-t" data-act="grpOpenBtn" data-args="[{&quot;$&quot;:&quot;this&quot;}]" aria-expanded="false"><span class="rg-ic">${svg(done ? TICK : GIC[t] || ICONS.edit)}</span><span class="rg-tt"><span class="rg-n">${esc(GQ[t] || t)}</span><small class="rg-sum nocap">${done ? esc(grpSum(fs, v)) : 'Not filled in yet'}</small></span><em class="rg-ch">${done ? 'Change' : 'Fill in'}</em></button></h4>${fs.some((f) => f.any) ? '<p class="anyh">Fill in at least one number *</p>' : ''}${main.map((f) => rfH(f, v)).join('')}${adv.length ? `<details class="rmore"${open ? ' open' : ''}><summary>More details <span>(${adv.length})</span></summary><div class="rmore-b">${adv.map((f) => rfH(f, v)).join('')}</div></details>` : ''}<div class="rg-nx"><button type="button" class="btn" data-act="grpNextBtn" data-args="[{&quot;$&quot;:&quot;this&quot;}]">${nextT ? 'Next: ' + esc(GQ[nextT] || nextT) + ' &rarr;' : 'Done'}</button></div></section>`;
};
export const byGroup = (fs, v) => {
  const g = {};
  fs.forEach((f) => (g[f.g] = g[f.g] || []).push(f));
  const E = Object.entries(g);
  return E.map(([t, x], i) => grpH(t, x, v, 'g' + GID++, E[i + 1] && E[i + 1][0])).join('');
};
export function grpVals(fs) {
  const v = {};
  fs.forEach((f) => {
    const e = $('#f_' + f.k);
    v[f.k] = e ? e.value : '';
  });
  return v;
}
export function grpRefresh(g) {
  const fs = GRPF[g.dataset.g];
  if (!fs) return;
  const v = grpVals(fs),
    d = grpDone(fs, v);
  g.classList.toggle('done', d);
  g.querySelector('.rg-ic').innerHTML = svg(d ? TICK : g.dataset.ic);
  g.querySelector('.rg-sum').textContent = d ? grpSum(fs, v) : 'Not filled in yet';
  g.querySelector('.rg-ch').textContent = d ? 'Change' : 'Fill in';
  grpRing(g.closest('.rw-p'));
}
export function grpShut(g, s) {
  g.classList.toggle('shut', s);
  g.querySelector('.rg-t').setAttribute('aria-expanded', !s);
  if (s) grpRefresh(g);
}
export function grpOpenBtn(b) {
  grpOpen(b.closest('.rg'));
}
export function grpNextBtn(b) {
  grpNext(b.closest('.rg'));
}
export function grpOpen(g) {
  if (!g.classList.contains('shut')) {
    grpShut(g, true);
    return;
  }
  [...(g.closest('.rw-p') || document).querySelectorAll('.rg.gc')].forEach((x) => {
    if (x !== g && !x.classList.contains('shut')) grpShut(x, true);
  });
  grpShut(g, false);
  const f = g.querySelector(
    '.rf:not([hidden]) input:not([readonly]),.rf:not([hidden]) select,.rf:not([hidden]) textarea'
  );
  if (f && matchMedia('(pointer:fine)').matches) setTimeout(() => f.focus(), 30);
  setTimeout(() => g.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 40);
}
/* Next skips cards that are already finished; when none are left in this step, go to the next step */
export function grpNext(g) {
  grpShut(g, true);
  const G = [...(g.closest('.rw-p') || document).querySelectorAll('.rg.gc')],
    i = G.indexOf(g);
  const n =
    G.slice(i + 1).find((x) => !x.classList.contains('done')) ||
    G.slice(0, i).find((x) => !x.classList.contains('done'));
  if (n) grpOpen(n);
  else {
    const S2 = recordWin.steps,
      i = S2.indexOf(RTAB[recordWin.kind]);
    if (i < S2.length - 1) recStep(1);
  }
}
export function grpRing(P) {
  if (!P) return;
  const G = [...P.querySelectorAll('.rg.gc')];
  if (!G.length) return;
  const d = G.filter((x) => x.classList.contains('done')).length;
  let r = P.querySelector('.gring');
  if (!r) {
    const H = P.querySelector('.rw-sh');
    if (!H) return;
    H.insertAdjacentHTML(
      'beforeend',
      '<div class="gring"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" fill="none" stroke="var(--line)" stroke-width="4"/><circle class="gr-v" cx="18" cy="18" r="15" fill="none" stroke="#12794c" stroke-width="4" stroke-linecap="round" transform="rotate(-90 18 18)"/></svg><b></b></div>'
    );
    r = P.querySelector('.gring');
  }
  r.querySelector('.gr-v').setAttribute('stroke-dasharray', (94 * d) / G.length + ' 95');
  r.querySelector('b').textContent = d + ' of ' + G.length + ' done';
}
/* first time a step is shown: open the first card that still needs filling in */
export function grpInit(P) {
  if (!P || P.dataset.ginit) return;
  const G = [...P.querySelectorAll('.rg.gc')];
  if (!G.length) return;
  P.dataset.ginit = 1;
  const first = G.find((x) => !x.classList.contains('done'));
  if (first) grpShut(first, false);
  grpRing(P);
}
export function recDep(sel) {
  const k = sel.id.slice(2);
  $$(`#mbox [data-dep="${k}"]`).forEach((r) => (r.hidden = sel.value != 'Different'));
}
