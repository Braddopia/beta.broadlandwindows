/* features/records/record-tools: the toolbar of the lead and contract windows (v19.18), like the old system's:
   Reports, Clipboard (copy the customer's details), Advanced (less-used actions), Search (open another record
   without closing), Full Page, and the "1 Contract For This Customer" link on the title line. */
import { onClick } from '../../core/actions.js';
import { $ } from '../../core/dom.js';
import { html, raw } from '../../core/html.js';
import { svg } from '../../core/icons.js';
import { state } from '../../data/state.js';
import { PHONES, mailOf, telOf } from '../../domain/customers.js';
import { pcNorm } from '../../domain/postcode.js';
import { RECORDS, recOpen, recSave, recTab, recordWin } from './record-window.js';
import { closeFpop, openFpop } from '../../ui/components/popover.js';
import { copyText } from '../../ui/download.js';
import { toast } from '../../ui/toast.js';

/* what is in a box now (typed but not saved yet), or what was saved */
const cur = (k) => {
  const e = $('#f_' + k);
  return String(e ? e.value : (recordWin.v[k] ?? '')).trim();
};
const now = () => {
  const v = { ...recordWin.v };
  for (const k of [
    ...PHONES,
    'email1',
    'email2',
    'email3',
    'name',
    'title',
    'company',
    'homeAddr',
    'homeAddr2',
    'town',
    'county',
    'homePc',
  ])
    v[k] = cur(k);
  return v;
};
const addrOf = (v) => [v.homeAddr, v.homeAddr2, v.town, v.county, v.homePc].filter(Boolean).join(', ');

/** the other leads and contracts of the same customer: the same Contact Book entry, or the same name and postcode */
export function custRecs(v) {
  const same = (r) =>
    r.id != v.id &&
    ((v.contact && r.contact == v.contact) ||
      (!!v.name &&
        String(r.name || '').toLowerCase() == String(v.name).toLowerCase() &&
        pcNorm(r.homePc || '') == pcNorm(v.homePc || '') &&
        !!pcNorm(v.homePc || '')));
  return {
    contracts: state.contracts.filter(same).concat(recordWin && recordWin.kind == 'contract' && v.id ? [v] : []),
    leads: state.leads.filter(same).concat(recordWin && recordWin.kind == 'lead' && v.id ? [v] : []),
  };
}
const plural = (n, w) => n + ' ' + w + (n == 1 ? '' : 's');
/** the line under the title: town, phone, email and how many contracts (or leads) this customer has */
export function recContactLine(W) {
  const v = W.v,
    tel = telOf(v),
    em = mailOf(v),
    R = custRecs(v),
    n = W.kind == 'contract' ? R.contracts.length : R.leads.length,
    more = W.kind == 'lead' && R.contracts.length ? ', ' + plural(R.contracts.length, 'Contract') : '';
  return String(
    html`${v.town ? html`<span>${raw(svg('M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z'))}${v.town}</span>` : ''}${tel ? html`<a class="nocap" href="tel:${tel.replace(/[^\d+]/g, '')}">${raw(svg('M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2'))}${tel}</a>` : ''}${em ? html`<a class="nocap" href="mailto:${em}">${raw(svg('M4 6h16v12H4zM4 7l8 6 8-6'))}${em}</a>` : ''}<button type="button" class="rw-cust" id="rwCustB" aria-haspopup="true" data-act="recCustList" data-args="[{&quot;$&quot;:&quot;this&quot;}]">${plural(n, W.kind == 'contract' ? 'Contract' : 'Lead')}${more} For This Customer</button>`
  );
}
/** the customer's leads and contracts in a small list; picking one opens it (saving this one first if changed) */
export function recCustList(btn) {
  const R = custRecs(now()),
    row = (kind, r) =>
      html`<button type="button" class="pm-i ${r.id == recordWin.id && kind == recordWin.kind ? 'on' : ''}" ${raw(onClick('recJump', kind, r.id))}><b>${r.id}</b> ${kind == 'contract' ? r.stage || '' : r.stage || ''}${r.cdate || r.created ? ', ' + (r.cdate || r.created) : ''}</button>`;
  openFpop(
    btn,
    String(
      html`<div class="pm" role="menu">${R.contracts.length ? html`<p class="pm-h">Contracts</p>${R.contracts.map((r) => row('contract', r))}` : ''}${R.leads.length ? html`<p class="pm-h">Leads</p>${R.leads.map((r) => row('lead', r))}` : ''}</div>`
    )
  );
}
export function recJump(kind, id) {
  closeFpop();
  if (!recordWin || (kind == recordWin.kind && id == recordWin.id)) return;
  if (recordWin.dirty && !recSave(false)) return;
  recOpen(kind, id);
}
/** Reports: the printouts for this record */
export function recReports() {
  closeFpop();
  RECORDS[recordWin.kind].reports(recordWin);
}
/* ---- Clipboard ---- */
const CLIP = {
  details: (v) =>
    [[v.title, v.name].filter(Boolean).join(' '), v.company, addrOf(v), telOf(v), mailOf(v)].filter(Boolean).join('\n'),
  address: (v) =>
    [[v.title, v.name].filter(Boolean).join(' '), v.homeAddr, v.homeAddr2, v.town, v.county, v.homePc]
      .filter(Boolean)
      .join('\n'),
  phone: (v) => telOf(v),
  email: (v) => mailOf(v),
  number: (v) => v.id || '',
};
const CLIP_L = {
  details: 'Customer Details',
  address: 'Name And Address',
  phone: 'Phone Number',
  email: 'Email Address',
  number: 'Contract Number',
};
const clipItems = () =>
  Object.keys(CLIP).map(
    (k) =>
      html`<button type="button" class="pm-i" ${raw(onClick('recCopy', k))}>Copy ${k == 'number' && recordWin.kind == 'lead' ? 'Lead Number' : CLIP_L[k]}</button>`
  );
export function recClip(btn) {
  openFpop(btn, String(html`<div class="pm" role="menu">${clipItems()}</div>`));
}
export function recCopy(k) {
  closeFpop();
  const t = (CLIP[k] || CLIP.details)(now());
  if (!t) return toast('Nothing to copy yet');
  copyText(t);
}
/* ---- Advanced: less-used actions, given by each kind of record ---- */
const advItems = () =>
  RECORDS[recordWin.kind]
    .advanced(recordWin)
    .map(
      ([label, fn, args, cls]) =>
        html`${cls == 'del' ? raw('<hr>') : ''}<button type="button" class="pm-i ${cls || ''}" ${raw(onClick('recAdvRun', fn, args || []))}>${label}</button>`
    );
export function recAdv(btn) {
  openFpop(btn, String(html`<div class="pm" role="menu">${advItems()}</div>`));
}
export function recAdvRun(fn, args) {
  closeFpop();
  const D = RECORDS[recordWin.kind];
  (D.run || {})[fn](...(args || []));
}
/** phones: Address, Reports, Clipboard and Advanced in one menu */
export function recMore(btn) {
  openFpop(
    btn,
    String(
      html`<div class="pm" role="menu"><button type="button" class="pm-i" ${raw(onClick('recMoreTab'))}>Address</button><button type="button" class="pm-i" data-act="recReports">Reports</button><p class="pm-h">Clipboard</p>${clipItems()}<p class="pm-h">Advanced</p>${advItems()}</div>`
    )
  );
}
export function recMoreTab() {
  closeFpop();
  recTab('customer');
}
/** Full Page: the window fills the screen; remembered on this computer */
export function recFull() {
  const b = $('#mbox'),
    on = !b.classList.contains('fp');
  b.classList.toggle('fp', on);
  const k = $('#mbox .rw-fp');
  if (k) k.setAttribute('aria-pressed', on);
  try {
    localStorage.setItem('bb_rw_full', on ? '1' : '0');
  } catch (e) {
    /* private window: just this time */
  }
}
/* ---- Search: open another record of the same kind without closing ---- */
const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[\s().-]/g, '');
/** the records that match: exact number first, then number, name, company, town or postcode containing the words */
export function recMatches(kind, q) {
  const D = RECORDS[kind],
    L = D.order()
      .map((id) => D.get(id))
      .filter(Boolean),
    n = norm(q);
  if (!n) return [];
  const exact = L.filter((r) => norm(r.id) == n);
  const part = L.filter(
    (r) =>
      !exact.includes(r) &&
      [r.id, r.name, r.company, r.town, r.homePc, r.siteTown, r.sitePc].some((x) => norm(x).includes(n))
  );
  return [...exact, ...part];
}
export function recSearch() {
  const i = $('#rwFind');
  if (!i || !recordWin) return;
  const M = recMatches(recordWin.kind, i.value);
  if (!M.length) return toast('Nothing matches "' + i.value.trim() + '"');
  if (M.length == 1 || norm(M[0].id) == norm(i.value)) return recJump(recordWin.kind, M[0].id);
  openFpop(
    i,
    String(
      html`<div class="pm" role="menu">${M.slice(0, 12).map((r) => html`<button type="button" class="pm-i" ${raw(onClick('recJump', recordWin.kind, r.id))}><b>${r.id}</b> ${r.name || ''}${r.town ? ', ' + r.town : ''}</button>`)}</div>`
    )
  );
}
export function recSearchKey(e) {
  if (e.key == 'Enter') {
    e.preventDefault();
    recSearch();
  }
}
