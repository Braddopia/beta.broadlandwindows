/* features/records/record-window: The lead and contract window: steps, saving, closing and moving between records. */
import { MAX_PHOTOS } from '../../config/constants.js';
import { onClick } from '../../core/actions.js';
import { today } from '../../core/dates.js';
import { $, $$, esc } from '../../core/dom.js';
import { html, raw } from '../../core/html.js';
import { ICONS, svg } from '../../core/icons.js';
import { SAFE } from '../../data/sanitize.js';
import { store } from '../../data/persistence.js';
import { finSum, fitReveal, fitSync } from '../contracts/finance-step.js';
import { editDel } from '../deliveries/deliveries.js';
import { convertLead } from '../leads/leads.js';
import { abReveal } from './ab-list.js';
import { recDocs, recThumbs } from './photos-docs.js';
import { lineFocus, readLines } from './products.js';
import { recContactLine } from './record-tools.js';
import { stgDraw } from './stages.js';
import { readOps } from './survey.js';
import { editCall } from '../service/service.js';
import { fieldErr, plugInForms, readFields } from '../../ui/forms/form.js';
import { drawThumbs, setPhotoList, tmp } from '../../ui/forms/photos.js';
import { closeModal, openModal, plugInRecordWindow } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { busyBtn, toast } from '../../ui/toast.js';
import { celebrate } from '../../ui/success.js';

/* ==========================================================================
   15 · Lead and contract windows (v19.18: laid out like the office's old system, AdminBase, in the app's own look)
   A large centred window that can go full page. Along the top a toolbar: Save & Close, Save, Address, Reports,
   Clipboard, Advanced, record navigation (first, previous, next, last through the list it was opened from) and
   Search. Under it the title line, the stage path, then a row of tabs. The customer's names, phones and addresses
   sit in the Address window (the `customer` step), which opens over the tabs.
   ========================================================================== */
export const RECORDS = {};
export function rwAskSave() {
  $('#rwAsk').remove();
  recSave(true);
}
export function rwAskKeep() {
  $('#rwAsk').remove();
}
/* ---- record window ---- */
export let recordWin = null;
export const RTAB = { lead: 'details', contract: 'details' };
/** the tabs in the old system's order; the `customer` step is the Address window */
export const RSTEPS = {
  lead: ['customer', 'details', 'appts', 'survey', 'check', 'notes', 'docs'],
  contract: ['customer', 'details', 'survey', 'check', 'finance', 'deliveries', 'fitting', 'notes', 'docs', 'calls'],
};
export function setRecordWin(v) {
  recordWin = v;
}
const FP_KEY = 'bb_rw_full';
const fullPage = () => {
  try {
    return localStorage.getItem(FP_KEY) == '1';
  } catch (e) {
    return false;
  }
};
/** the name a tab shows: a count goes first where the old system put one ("3 Documents", "2 Service Calls") */
export const tabName = (t, n) => (t.cnt && n ? n + ' ' + (n == 1 ? t.one || t.t : t.t) : t.t);
export function recOpen(kind, id) {
  const D = RECORDS[kind],
    r = id ? D.get(id) : null;
  if (id && !r) return;
  const W = (recordWin = {
    kind,
    id: r ? r.id : null,
    isNew: !r,
    v: r ? JSON.parse(JSON.stringify(r)) : D.blank(),
    list: D.order(),
    sel: 0,
  });
  if (kind == 'contract') fitSync(W.v);
  W.v.log = W.v.log || [];
  W.v.photos = (W.v.photos || []).filter(SAFE.img);
  setPhotoList(W.v.photos, () => {
    recThumbs();
    recRail();
  });
  const ord = RSTEPS[kind],
    tabs = D.tabs(W).sort((a, b) => ord.indexOf(a.k) - ord.indexOf(b.k)),
    pos = W.list.indexOf(W.id),
    last = W.list.length - 1,
    nav = !W.isNew && W.list.length > 1,
    lab = D.label.toLowerCase(),
    start = W.isNew ? 'customer' : tabs.some((t) => t.k == RTAB[kind] && t.k != 'customer') ? RTAB[kind] : 'details';
  W.steps = tabs.map((t) => t.k);
  W.tabs = tabs;
  const navB = (d, t, label, dis) =>
    html`<button class="rb1 ic" title="${label}" aria-label="${label}" ${raw(onClick('recNav', d))}${dis ? raw(' disabled') : ''}>${raw(t)}</button>`;
  const panel = (t) =>
    html`<div class="rw-p ${t.k == start ? 'on' : ''}" data-t="${t.k}" role="tabpanel" aria-label="${t.t}">${raw(t.h(W))}</div>`;
  const addr = tabs.find((t) => t.k == 'customer');
  openModal(
    String(html`<div class="rw ab" data-kind="${kind}">
   <div class="rw-bar" role="toolbar" aria-label="${D.label}"><button class="rb1 sv" data-act="recSave" data-args="[true]">${raw(svg('M5 12l5 5L20 7'))}Save &amp; Close</button><button class="rb1 sv2" data-act="recSave" data-args="[false]">Save</button><i class="rw-div"></i>
    <span class="rw-wide"><button class="rb1 ${start == 'customer' ? 'on' : ''}" id="rwAddrB" ${raw(onClick('recTab', 'customer'))}>${raw(svg(ICONS.home))}Address</button>${W.isNew ? '' : html`<button class="rb1" data-act="recReports">${raw(svg(ICONS.reports))}Reports</button><button class="rb1" id="rwClipB" aria-haspopup="true" data-act="recClip" data-args="[{&quot;$&quot;:&quot;this&quot;}]">Clipboard<span class="rw-ch" aria-hidden="true">▾</span></button><button class="rb1" id="rwAdvB" aria-haspopup="true" data-act="recAdv" data-args="[{&quot;$&quot;:&quot;this&quot;}]">Advanced<span class="rw-ch" aria-hidden="true">▾</span></button>`}</span>${W.isNew ? '' : html`<button class="rb1 rw-more" id="rwMoreB" aria-haspopup="true" data-act="recMore" data-args="[{&quot;$&quot;:&quot;this&quot;}]">More<span class="rw-ch" aria-hidden="true">▾</span></button>`}<span class="rw-sp"></span>
    ${nav ? html`<span class="rw-nav">${navB('first', '&laquo;', 'First ' + lab, pos <= 0)}${navB(-1, '&lsaquo;', 'Previous ' + lab, pos <= 0)}<span class="rw-pos">${pos + 1} of ${W.list.length}</span>${navB(1, '&rsaquo;', 'Next ' + lab, pos >= last)}${navB('last', '&raquo;', 'Last ' + lab, pos >= last)}</span>` : ''}
    ${W.isNew ? '' : html`<div class="rw-find" role="search"><input id="rwFind" data-onkeydown="recSearchKey" data-args-keydown="[{&quot;$&quot;:&quot;event&quot;}]" placeholder="Search ${D.label}s" aria-label="Search ${D.label.toLowerCase()}s by number, name, town or postcode" maxlength="60" autocomplete="off"><button type="button" class="rb1 ic" aria-label="Search" data-act="recSearch">${raw(svg(ICONS.search))}</button></div>`}
    <button class="rb1 ic rw-fp" data-act="recFull" title="Full page" aria-label="Full page" aria-pressed="${String(fullPage())}">${raw(svg('M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'))}</button><button class="rb1 cl" data-act="recClose">${raw(svg('M6 6l12 12M18 6L6 18'))}Close</button></div>
   <div class="rw-h"><div><small>${D.label}${W.isNew ? ' · New' : nav ? ' · ' + (pos + 1) + ' of ' + W.list.length : ''}</small><h2>${D.heading(W)}</h2>${W.isNew ? '' : html`<div class="rw-hc">${raw(recContactLine(W))}</div>`}</div><div class="rw-hk">${raw(D.headStats(W))}</div></div>
   <div class="rw-path"><div id="rwStg"></div><div class="rw-next" id="rwNextUp"></div></div>
   <div class="ab-tabs" role="tablist" aria-label="${D.label} tabs">${tabs
     .filter((t) => t.k != 'customer')
     .map(
       (t) =>
         html`<button type="button" role="tab" data-t="${t.k}" class="${t.k == start ? 'on' : ''}" aria-selected="${String(t.k == start)}" ${raw(onClick('recTab', t.k))}>${tabName(t, t.n)}</button>`
     )}</div>
   <div class="rw-b">${tabs.filter((t) => t.k != 'customer').map(panel)}</div>
   ${addr ? html`<div class="ab-addr" id="rwAddr" ${start == 'customer' ? '' : raw('hidden')}><div class="ab-addr-w" role="dialog" aria-label="Customer And Addresses"><div class="ab-addr-h"><h3>Customer And Addresses</h3><button type="button" class="btn sm" data-act="recAddrDone">Done</button></div><div class="ab-addr-b">${panel(addr)}</div></div></div>` : ''}
   </div>`),
    'full ab' + (fullPage() ? ' fp' : '')
  );
  recThumbs();
  recDocs();
  recRail();
  stgDraw();
  const box = $('#mbox .rw');
  box.addEventListener('input', () => {
    recordWin.dirty = 1;
  });
  box.addEventListener('change', (e) => {
    recordWin.dirty = 1;
    const c = e.target;
    if (c.classList && c.classList.contains('rck')) {
      const w = c.parentElement.querySelector('.ck-w');
      if (w) w.textContent = c.checked ? 'Done today by ' + USER : '';
    }
    recRail();
  });
  box.addEventListener('focusin', lineFocus);
  box.addEventListener('keydown', recKeys);
  drawThumbs();
}
/* Ctrl+S saves; Page Up / Page Down open the previous / next record (not while typing in a list or a text box) */
export function recKeys(e) {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() == 's') {
    e.preventDefault();
    recSave(false);
    return;
  }
  const t = e.target;
  if ((e.key == 'PageUp' || e.key == 'PageDown') && !(t.matches && t.matches('textarea,select'))) {
    if (!recordWin || recordWin.isNew || recordWin.list.length < 2) return;
    e.preventDefault();
    recNav(e.key == 'PageUp' ? -1 : 1);
  }
}
export function recTab(k) {
  if (!recordWin) return;
  const A = $('#rwAddr');
  if (k == 'customer') {
    if (!A) return;
    const cur = $('#mbox .rw-b .rw-p.on');
    if (cur) {
      recordWin.back = cur.dataset.t;
      cur.classList.replace('on', 'bg');
    }
    A.hidden = false;
    A.querySelector('.rw-p').classList.add('on');
    $('#rwAddrB').classList.add('on');
    setTimeout(() => {
      const f = A.querySelector('input:not([readonly]):not([type=checkbox]),select');
      const a = document.activeElement;
      if (f && matchMedia('(pointer:fine)').matches && !(a && A.contains(a))) f.focus({ preventScroll: true });
    }, 40);
    return;
  }
  if (A && !A.hidden) {
    A.hidden = true;
    A.querySelector('.rw-p').classList.remove('on');
    $('#rwAddrB').classList.remove('on');
  }
  RTAB[recordWin.kind] = k;
  $$('#mbox .ab-tabs button').forEach((b) => {
    b.classList.toggle('on', b.dataset.t == k);
    b.setAttribute('aria-selected', b.dataset.t == k);
  });
  $$('#mbox .rw-b .rw-p').forEach((p) => {
    p.classList.remove('bg');
    p.classList.toggle('on', p.dataset.t == k);
  });
  $('#mbox .rw-b').scrollTop = 0;
  recRail();
  const b = $(`#mbox .ab-tabs button[data-t="${k}"]`);
  if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
/** Done in the Address window: back to the tab underneath */
export function recAddrDone() {
  recTab(recordWin.back || 'details');
}
/* keeps the parts that follow what is typed up to date: totals, the stage path, ticks done, the Documents count */
export function recRail() {
  if (!recordWin || !$('#mbox .rw.ab')) return;
  finSum();
  fitReveal();
  stgDraw();
  const ck = $$('#mbox .rck'),
    ckd = ck.filter((c) => c.checked).length,
    ckt = $('#mbox .ck-top');
  if (ckt) {
    ckt.querySelector(':scope>b').textContent = ckd + ' of ' + ck.length + ' done';
    ckt.querySelector('i b').style.width = Math.round((100 * ckd) / (ck.length || 1)) + '%';
  }
  const d = $('#mbox .ab-tabs button[data-t="docs"]'),
    t = (recordWin.tabs || []).find((x) => x.k == 'docs');
  if (d && t) d.textContent = tabName(t, (tmp || []).length + (recordWin.docs || []).length);
}
export function recGo(id) {
  const f = $('#f_' + id);
  if (!f) return;
  const p = f.closest('.rw-p');
  if (p && !p.classList.contains('on')) recTab(p.dataset.t);
  abReveal(f);
  setTimeout(() => {
    f.scrollIntoView({ block: 'center', behavior: 'smooth' });
    f.focus({ preventScroll: true });
    const w = f.closest('.rf,.ff') || f;
    w.classList.remove('flash');
    void w.offsetWidth;
    w.classList.add('flash');
  }, 60);
}
export function recRedraw(t) {
  const D = RECORDS[recordWin.kind],
    x = D.tabs(recordWin).find((z) => z.k == t),
    p = $(`#mbox .rw-p[data-t="${t}"]`);
  if (x && p) p.innerHTML = x.h(recordWin);
  recRail();
}
export function recRead() {
  const D = RECORDS[recordWin.kind],
    o = readFields(D.fields(recordWin));
  if (!o) return null;
  const at = { ...(recordWin.v.chkAt || {}) };
  $$('#mbox .rck').forEach((c) => {
    const k = c.dataset.k;
    (o.chk = o.chk || {})[k] = c.checked;
    if (c.checked && !at[k]) at[k] = { d: today(), by: USER };
    if (!c.checked) delete at[k];
  });
  o.chkAt = at;
  o.phTags = (recordWin.v.phTags || []).slice(0, MAX_PHOTOS);
  if ($('#mbox .pl')) o.lines = readLines();
  if ($('#mbox .op') || recordWin.v.openings) o.openings = $('#mbox .op') ? readOps() : recordWin.v.openings;
  o.photos = tmp.slice(0, MAX_PHOTOS);
  return o;
}
export function recSave(close) {
  busyBtn($(close ? '#mbox .rw-bar .sv' : '#mbox .rw-bar .sv2') || $('#mbox .rw-bar .sv'));
  recordWin.closeAfter = close;
  const D = RECORDS[recordWin.kind],
    o = recRead();
  if (!o) {
    const a = document.activeElement,
      p = a && a.closest && a.closest('.rw-p');
    if (p && !p.classList.contains('on')) {
      recTab(p.dataset.t);
      setTimeout(() => a.focus(), 30);
    }
    abReveal(a);
    return false;
  }
  const e = D.check && D.check(recordWin, o);
  if (e == 'ASK') return false;
  if (e) {
    toast(e.replace(/ \(.*step\)$/, ''));
    if (/Customer step/.test(e)) {
      recTab('customer');
      if (/phone/i.test(e)) {
        const f = $('#f_mob1') || $('#f_home1');
        abReveal(f);
        if (f) fieldErr(f, 'Fill in at least one phone number');
      } else if (/name/i.test(e)) {
        const f = $('#f_name');
        if (f) fieldErr(f, 'Type the customer name');
      }
    }
    return false;
  }
  const wasNew = recordWin.isNew,
    id = D.save(recordWin, o);
  if (id == null) {
    toast('This record no longer exists. It may have been deleted on another screen.');
    return false;
  }
  store();
  if (close) {
    closeModal();
    render();
  } else {
    render();
    recOpen(recordWin.kind, id);
  }
  if (wasNew) {
    const r = D.get(id);
    celebrate(D.label + ' Created', r ? [id, r.name].filter(Boolean).join(' - ') : id);
  } else toast('Saved');
  return true;
}
export function recNav(d) {
  const L = recordWin.list,
    i = L.indexOf(recordWin.id),
    n = d == 'first' ? 0 : d == 'last' ? L.length - 1 : i + d;
  if (n < 0 || n >= L.length) return;
  const kind = recordWin.kind;
  if (recordWin.dirty && !recSave(false)) return;
  recOpen(kind, L[n]);
}
/* small inline lists inside a record */
export function recAdd(list, fs, tab) {
  const o = {};
  for (const k of fs) {
    const e = $('#ra_' + k);
    o[k] = e ? SAFE.text(e.value, 300) : '';
  }
  if (!Object.values(o).some(Boolean)) {
    toast('Fill in the details first');
    return;
  }
  recordWin.v[list] = recordWin.v[list] || [];
  recordWin.v[list].unshift({ ...o, by: USER, at: today() });
  recordWin.dirty = 1;
  recRedraw(tab);
}
export function recDel(list, i, tab) {
  recordWin.v[list].splice(i, 1);
  recordWin.dirty = 1;
  recRedraw(tab);
}
/* closing with changes: ask inside the window (a separate popup would replace the record) */
export function recClose() {
  if (!recordWin || !recordWin.dirty) {
    closeModal();
    return;
  }
  const w = $('#mbox .rw');
  if (!w) {
    closeModal();
    return;
  }
  let a = $('#rwAsk');
  if (!a) {
    w.insertAdjacentHTML(
      'beforeend',
      `<div class="rw-ask" id="rwAsk" role="alertdialog" aria-modal="true" aria-labelledby="rwAskT"><div class="rw-ask-b"><h3 id="rwAskT">Save your changes?</h3><p>You have changed this ${esc(RECORDS[recordWin.kind].label.toLowerCase())}. If you close without saving, the changes are lost.</p>
    <div class="rw-ask-a"><button class="btn green" data-act="rwAskSave">Save and close</button><button class="btn ghost" data-act="closeModal">Close without saving</button><button class="btn ghost" data-act="rwAskKeep">Keep editing</button></div></div></div>`
    );
    a = $('#rwAsk');
  }
  a.querySelector('.btn').focus();
}
export function recConvert() {
  if (!recSave(false)) return;
  const id = recordWin.id;
  closeModal();
  convertLead(id);
}
/* service call / delivery from inside a contract: the form opens over the contract and comes back to it */
export function recCall() {
  if (recordWin.isNew && !recSave(false)) return;
  editCall(null, recordWin.id);
}
export function recDelivery() {
  if (recordWin.isNew && !recSave(false)) return;
  editDel(null, null, recordWin.id);
}
/* start-up step (run once by main.js): popups and forms hand back to this window */
export function plugRecordWindowIn() {
  plugInRecordWindow({ get: () => recordWin, set: setRecordWin, back: recReturn });
  plugInForms({ showStep: recTab });
}
export function recReturn() {
  if (!recordWin) return;
  ['calls', 'deliveries'].forEach((t) => {
    if ($(`#mbox .rw-p[data-t="${t}"]`))
      try {
        recRedraw(t);
      } catch (e) {}
  });
}
