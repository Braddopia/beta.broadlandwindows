/* features/records/record-window: The lead and contract window: steps, saving, closing and moving between records. */
import { MAX_PHOTOS } from '../../config/constants.js';
import { onClick } from '../../core/actions.js';
import { fd, today } from '../../core/dates.js';
import { $, $$, esc } from '../../core/dom.js';
import { m0 } from '../../core/format.js';
import { svg } from '../../core/icons.js';
import { SAFE } from '../../data/sanitize.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { mailOf, telOf } from '../../domain/customers.js';
import { finSum, fitReveal, fitSync } from '../contracts/finance-step.js';
import { editDel } from '../deliveries/deliveries.js';
import { convertLead } from '../leads/leads.js';
import { grpInit, grpOpen, grpRefresh } from './cards.js';
import { recDocs, recThumbs } from './photos-docs.js';
import { readLines } from './products.js';
import { stgDraw } from './stages.js';
import { readOps } from './survey.js';
import { editCall } from '../service/service.js';
import { MARK, fieldErr, plugInForms, readFields } from '../../ui/forms/form.js';
import { drawThumbs, setPhotoList, tmp } from '../../ui/forms/photos.js';
import { closeModal, openModal, plugInRecordWindow } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { busyBtn, toast } from '../../ui/toast.js';

/* ==========================================================================
   15 · Full-screen records for Leads and Contracts (tabbed, AdminBase-style)
   One record window: toolbar (Save & Close, Save, Report, prev/next),
   tabs, and two-column label/value rows that are edited in place.
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
/* steps that are nice to have: never the reason a record opens part-way through */
export const REC_OPTIONAL = ['notes', 'docs', 'calls', 'gdpr', 'appts', 'deliveries'];
export let recordWin = null;
export const RTAB = { lead: 'customer', contract: 'customer' };
/* the record is worked through as steps, in the order the job happens */
export const RSTEPS = {
  lead: ['customer', 'details', 'appts', 'survey', 'check', 'notes', 'docs', 'gdpr'],
  contract: [
    'customer',
    'details',
    'survey',
    'products',
    'finance',
    'fitting',
    'deliveries',
    'check',
    'notes',
    'docs',
    'calls',
    'gdpr',
  ],
};
export const RNAME = { lead: { details: 'Enquiry' }, contract: { details: 'Contract' } };
export const RHINT = {
  customer: 'Who they are, how to reach them and where the work is.',
  details: {
    lead: 'Where the enquiry came from, what they want and what happens next.',
    contract: 'Contract type, stage and sales information.',
  },
  appts: 'Book the visit, then send the customer a reminder by email or text, or add it to a calendar.',
  survey: 'Every window and door opening: sizes, type and glass.',
  products: 'What is being supplied and fitted, with prices.',
  finance: 'Contract value, payments and invoicing.',
  fitting: 'Dates, fitting team and the details FENSA needs.',
  deliveries: 'Supplier deliveries booked for this job.',
  check: {
    lead: 'The steps that turn an enquiry into a sale. Tick each one as you go.',
    contract: 'Every stage from signed contract to guarantee. Ticks record who did it and when.',
  },
  notes: 'General notes and a log of calls, emails and visits.',
  docs: 'Photos from the survey and fitting, and any documents.',
  calls: 'Service calls raised on this job.',
  gdpr: 'Marketing consent and data notes.',
};
export function setRecordWin(v) {
  recordWin = v;
}
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
  });
  if (kind == 'contract') fitSync(W.v);
  W.v.log = W.v.log || [];
  W.v.photos = (W.v.photos || []).filter(SAFE.img);
  setPhotoList(W.v.photos, () => {
    recThumbs();
    recRail();
  });
  const ord = RSTEPS[kind],
    opt = (k) => (REC_OPTIONAL.includes(k) ? 1 : 0),
    tabs = D.tabs(W).sort((a, b) => opt(a.k) - opt(b.k) || ord.indexOf(a.k) - ord.indexOf(b.k)),
    tab = tabs.some((t) => t.k == RTAB[kind]) ? RTAB[kind] : tabs[0].k,
    pos = W.list.indexOf(W.id);
  W.steps = tabs.map((t) => t.k);
  const nm = (k) => (RNAME[kind] || {})[k] || tabs.find((t) => t.k == k).t,
    hint = (k) => {
      const h = RHINT[k];
      return typeof h == 'object' ? h[kind] : h || '';
    };
  openModal(
    `<div class="rw">
   <div class="rw-bar"><button class="rb1 sv" data-act="recSave" data-args="[false]">${svg('M5 12l5 5L20 7')}Save</button>${W.isNew ? '' : D.actions(W)}<span class="rw-sp"></span>
    ${W.isNew || W.list.length < 2 ? '' : `<button class="rb1" title="Save this one and open the previous ${esc(D.label.toLowerCase())}" ${onClick('recNav', -1)} ${pos <= 0 ? 'disabled' : ''}>&lsaquo; Previous</button><span class="rw-pos">${esc(D.label)} ${pos + 1} of ${W.list.length}</span><button class="rb1" title="Save this one and open the next ${esc(D.label.toLowerCase())}" ${onClick('recNav', 1)} ${pos >= W.list.length - 1 ? 'disabled' : ''}>Next &rsaquo;</button>`}
    <button class="rb1 cl" data-act="recClose">${svg('M6 6l12 12M18 6L6 18')}Close</button></div>
   <div class="rw-h"><div><small>${esc(D.label)}${W.isNew ? ' · New' : ''}</small><h2>${esc(D.heading(W))}</h2>${W.isNew ? '' : `<div class="rw-hc">${telOf(W.v) ? `<a class="nocap" href="tel:${esc(telOf(W.v).replace(/[^\d+]/g, ''))}">${svg('M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2')}${esc(telOf(W.v))}</a>` : ''}${mailOf(W.v) ? `<a class="nocap" href="mailto:${esc(mailOf(W.v))}">${svg('M4 6h16v12H4zM4 7l8 6 8-6')}${esc(mailOf(W.v))}</a>` : ''}${W.v.town ? `<span>${svg('M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z')}${esc(W.v.town)}</span>` : ''}</div>`}</div><div class="rw-hk">${D.headStats(W)}</div></div>
   <div class="rw-path" id="rwStg"></div>
   <div class="rw-x"><aside class="rw-rail"><div class="rw-prog"><span id="rwPct"></span><i><b id="rwBar"></b></i></div>
     <div class="rw-next" id="rwNextUp"></div><p class="rw-grp">Steps</p><ol class="rw-steps">${tabs.map((t, i) => `${i && opt(t.k) && !opt(tabs[i - 1].k) ? '</ol><p class="rw-grp">Extras <span>if needed</span></p><ol class="rw-steps">' : ''}<li><button type="button" data-t="${t.k}" class="${t.k == tab ? 'on' : ''}" ${onClick('recTab', t.k)}><i>${i + 1}</i><span><b>${esc(nm(t.k))}</b><small data-st="${t.k}"></small></span></button></li>`).join('')}</ol></aside>
    <div class="rw-main"><div class="rw-b">${tabs.map((t, i) => `<div class="rw-p ${t.k == tab ? 'on' : ''}" data-t="${t.k}" role="tabpanel"><div class="rw-sh"><small>Step ${i + 1} of ${tabs.length}</small><h3>${esc(nm(t.k))}</h3><p>${esc(hint(t.k))}</p>${t.k == 'customer' || t.k == 'details' ? `<p class="rw-req">Boxes marked <span class="rq">*</span> must be filled in. Boxes with ${MARK(0, 1)} can only be changed by an administrator.</p>` : ''}<div class="rw-todo" data-td="${t.k}" aria-live="polite"></div></div>${t.h(W)}</div>`).join('')}</div>
     <div class="rw-foot"><button type="button" class="btn ghost" id="rwPrev" data-act="recStep" data-args="[-1]"></button><span class="rw-sp"></span><button type="button" class="btn ghost" data-act="recSave" data-args="[false]">Save</button><button type="button" class="btn" id="rwNext" data-act="recStep" data-args="[1]"></button></div></div></div></div>`,
    'full'
  );
  W.nm = nm;
  recThumbs();
  recDocs();
  recFoot();
  recRail();
  stgDraw();
  if (!W.isNew) {
    const todo = W.steps.find((k) => {
      const b = $(`#mbox .rw-steps button[data-t="${k}"]`);
      return b && !b.classList.contains('ok') && !REC_OPTIONAL.includes(k);
    });
    recTab(todo || W.steps[0]);
  }
  grpInit($('#mbox .rw-p.on'));
  $('#mbox .rw-x').addEventListener('change', (e) => {
    const g = e.target.closest && e.target.closest('.rg.gc');
    if (g) grpRefresh(g);
  });
  $('#mbox .rw-x').addEventListener('input', () => {
    recordWin.dirty = 1;
    clearTimeout(recRail.t);
    recRail.t = setTimeout(recRail, 250);
  });
  $('#mbox .rw-x').addEventListener('change', (e) => {
    recordWin.dirty = 1;
    const c = e.target;
    if (c.classList && c.classList.contains('rck')) {
      const w = c.parentElement.querySelector('.ck-w');
      if (w) w.textContent = c.checked ? 'Done today by ' + USER : '';
    }
    recRail();
  });
  drawThumbs();
}
export function recTab(k) {
  RTAB[recordWin.kind] = k;
  $$('#mbox .rw-steps button').forEach((b) => b.classList.toggle('on', b.dataset.t == k));
  $$('#mbox .rw-p').forEach((p) => p.classList.toggle('on', p.dataset.t == k));
  grpInit($('#mbox .rw-p.on'));
  $('#mbox .rw-b').scrollTop = 0;
  recFoot();
  recRail();
  const b = $(`#mbox .rw-steps button[data-t="${k}"]`);
  if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
export function recStep(d) {
  const S2 = recordWin.steps,
    i = S2.indexOf(RTAB[recordWin.kind]);
  if (d > 0 && i == S2.length - 1) {
    recSave(true);
    return;
  }
  const n = S2[i + d];
  if (n) recTab(n);
}
export function recFoot() {
  const S2 = recordWin.steps,
    i = S2.indexOf(RTAB[recordWin.kind]),
    p = $('#rwPrev'),
    n = $('#rwNext');
  if (!p) return;
  p.hidden = i <= 0;
  p.innerHTML = i > 0 ? '&larr; Back: ' + esc(recordWin.nm(S2[i - 1])) : '';
  n.innerHTML = i < S2.length - 1 ? 'Next: ' + esc(recordWin.nm(S2[i + 1])) + ' &rarr;' : 'Save and finish';
  n.classList.toggle('green', i == S2.length - 1);
}
/* progress for each step, worked out from what is on screen now */
export function recRail() {
  if (!recordWin || !$('#rwPct')) return;
  const g = (k) => {
      const e = $('#f_' + k);
      return String(e ? e.value : (recordWin.v[k] ?? '')).trim();
    },
    n = (s) => $$(`#mbox ${s}`).length,
    v = recordWin.v;
  const ck = $$('#mbox .rck'),
    ckd = ck.filter((c) => c.checked).length,
    tel = [g('mob1'), g('home1'), g('work'), g('mob2'), g('home2')].find(Boolean) || v.phone || '',
    em = g('email1') || v.email || '',
    ad = [g('homeAddr') || v.address, g('town')].filter(Boolean).join(', ');
  const ops = n('.op[data-f="ref"]'),
    lines = n('.pl[data-f="name"]'),
    val = +g('value') || 0,
    paid = +g('paid') || 0,
    ph = (tmp || []).length,
    log = (v.log || []).length;
  const ST = {
    customer: [
      [g('name'), tel || em, ad].filter(Boolean).length + ' of 3: name, contact, address',
      !!(g('name') && (tel || em) && ad),
    ],
    details:
      recordWin.kind == 'lead'
        ? [g('source') ? 'From ' + g('source') : 'Source not set', !!(g('source') && g('product'))]
        : [g('stage') || 'Stage not set', !!(g('stage') && g('product'))],
    appts: [
      g('apptDate')
        ? 'Booked ' + fd(g('apptDate'))
        : (v.appts || []).length
          ? (v.appts || []).length + ' booked'
          : 'None booked',
      !!(g('apptDate') || (v.appts || []).length),
    ],
    survey: [ops ? ops + ' opening' + (ops == 1 ? '' : 's') : 'Nothing surveyed yet', ops > 0],
    products: [lines ? lines + ' line' + (lines == 1 ? '' : 's') : 'No products yet', lines > 0],
    finance: [
      val ? (val - paid > 0 ? m0(val - paid) + ' to collect' : 'Paid in full') : 'No value yet',
      val > 0 && paid >= val,
    ],
    fitting: [g('fit') ? 'Fit ' + fd(g('fit')) : 'No fit date', !!g('fit')],
    deliveries: [
      state.deliveries.filter((d) => d.contract == v.id).length + ' booked',
      state.deliveries.some((d) => d.contract == v.id) &&
        state.deliveries.filter((d) => d.contract == v.id).every((d) => d.status == 'Received'),
    ],
    check: [ckd + ' of ' + ck.length + ' done', ck.length > 0 && ckd == ck.length],
    notes: [
      log ? log + ' entr' + (log == 1 ? 'y' : 'ies') : g('notes') ? 'Notes added' : 'Nothing yet',
      !!(log || g('notes')),
    ],
    docs: [
      ph +
        ' photo' +
        (ph == 1 ? '' : 's') +
        ', ' +
        (recordWin.docs || []).length +
        ' doc' +
        ((recordWin.docs || []).length == 1 ? '' : 's'),
      ph > 0 || (recordWin.docs || []).length > 0,
    ],
    calls: [state.calls.filter((c) => c.contract == v.id).length + ' calls', false],
    gdpr: [g('gdprDate') ? 'Consent ' + fd(g('gdprDate')) : 'Not recorded', !!g('gdprDate')],
  };
  const NEED = {
    customer: [
      !g('name') && ['Customer name', 'name'],
      !(tel || em) && ['A phone number or email', 'mob1'],
      !ad && ['Home address', 'homeAddr'],
    ],
    details: [
      recordWin.kind == 'lead'
        ? !g('source') && ['Where they found us', 'source']
        : !g('stage') && ['Contract stage', 'stage'],
      !g('product') && ['What they want', 'product'],
    ],
    appts: [!(g('apptDate') || (v.appts || []).length) && ['A visit date', 'apptDate']],
    survey: [!ops && ['At least one window or door', '']],
    products: [!lines && ['At least one product', '']],
    finance: [!val && ['Contract value', 'value'], val > 0 && paid < val && ['Payment still to collect', 'paid']],
    fitting: [!g('fit') && ['Fitting date', 'fit'], !g('fitter1') && ['Lead fitter', 'fitter1']],
    check: [ck.length > ckd && [ck.length - ckd + ' tick' + (ck.length - ckd == 1 ? '' : 's') + ' left', '']],
    gdpr: [!g('gdprDate') && ['Consent date', 'gdprDate']],
  };
  finSum();
  fitReveal();
  stgDraw();
  const ckt = $('#mbox .ck-top');
  if (ckt) {
    ckt.querySelector(':scope>b').textContent = ckd + ' of ' + ck.length + ' done';
    ckt.querySelector('i b').style.width = Math.round((100 * ckd) / (ck.length || 1)) + '%';
  }
  let done = 0;
  recordWin.steps.forEach((k) => {
    const s = ST[k] || ['', false],
      el = $(`#mbox small[data-st="${k}"]`);
    if (el) el.textContent = s[0];
    const b = $(`#mbox .rw-steps button[data-t="${k}"]`);
    if (b) b.classList.toggle('ok', !!s[1]);
    if (s[1]) done++;
  });
  const pc = Math.round((100 * done) / recordWin.steps.length);
  $('#rwPct').textContent = done + ' of ' + recordWin.steps.length + ' steps complete';
  $('#rwBar').style.width = pc + '%';
  recTodo(NEED);
}
/* the 'still to do' box: each missing item is a button that takes you to the box to fill in */
export function recTodo(N) {
  $$('#mbox .rw-todo').forEach((el) => {
    const k = el.dataset.td,
      m = (N[k] || []).filter(Boolean),
      opt = REC_OPTIONAL.includes(k),
      ok = !m.length;
    const h = ok
      ? `<div class="td-ok">${svg('M5 12l5 5L20 7')}<span>${opt ? 'Nothing more needed here.' : 'This step is done.'} ${recordWin.steps.indexOf(k) < recordWin.steps.length - 1 ? 'Press Next when ready.' : 'Press Save and finish.'}</span></div>`
      : `<div class="td-l"><b>${opt ? 'Optional: you can add' : 'Still to fill in'}</b>${m.map((x) => (x[1] ? `<button type="button" class="td-i" ${onClick('recGo', x[1])}>${esc(x[0])} &rsaquo;</button>` : `<span class="td-i">${esc(x[0])}</span>`)).join('')}</div>`;
    if (el.dataset.h !== h) {
      const was = el.dataset.h && !el.querySelector('.td-ok');
      el.dataset.h = h;
      el.innerHTML = h;
      if (ok && was) el.firstChild.classList.add('pop');
    }
  });
}
export function recGo(id) {
  const f = $('#f_' + id);
  if (!f) return;
  const p = f.closest('.rw-p');
  if (p && !p.classList.contains('on')) recTab(p.dataset.t);
  const g = f.closest('.rg.gc');
  if (g && g.classList.contains('shut')) grpOpen(g);
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
  busyBtn($('#mbox .rw-bar .sv'));
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
        if (f) fieldErr(f, 'Fill in at least one phone number');
      } else if (/name/i.test(e)) {
        const f = $('#f_name');
        if (f) fieldErr(f, 'Type the customer name');
      }
    }
    return false;
  }
  const id = D.save(recordWin, o);
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
  toast('Saved');
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
