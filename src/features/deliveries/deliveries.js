/* features/deliveries/deliveries: The Deliveries page, delivery form and delivery reports. */
import { onClick, rowClick } from '../../core/actions.js';
import { addDays, fd, today } from '../../core/dates.js';
import { $, esc } from '../../core/dom.js';
import { csvDownload } from '../../ui/download.js';
import { shortId } from '../../core/ids.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { DWIN, dAuto, delWin } from '../../domain/deliveries.js';
import { staffNames } from '../../domain/people.js';
import { msDots } from '../live-boards/live-boards.js';
import { SUPN, supCol } from '../suppliers/suppliers.js';
import { printDoc } from '../../print/print.js';
import { emptyArt } from '../../ui/components/art.js';
import { dTag } from '../../ui/components/tags.js';
import { fieldErr, form } from '../../ui/forms/form.js';
import { askYes, openModal } from '../../ui/modal.js';
import { hit, render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { uiState } from '../../ui/ui-state.js';
import * as repos from '../../data/repository.js';

export function vDeliveries() {
  const F = uiState.del,
    all = state.deliveries.slice().sort((a, b) => a.due.localeCompare(b.due)),
    sn = [...new Set(all.map((x) => x.supplier))];
  const lane = delWin;
  const list = all.filter(
      (x) =>
        hit(x) &&
        (F.s == 'all' || x.supplier == F.s) &&
        (F.f == 'all' || (F.f == 'out' ? x.status != 'Received' : x.status == 'Received'))
    ),
    n = (k) => all.filter((x) => lane(x) == k).length;
  const H = state.deliveries.filter((d) => d.hm),
    c = (k) => H.filter((d) => d.stage == k).length,
    i = state.hmInfo || {},
    live = i.src == 'relay' || i.src == 'direct';
  const msg = i.t
    ? (live ? 'Live ' : 'Pasted ') +
      new Date(i.t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) +
      ' via ' +
      i.src +
      (i.total && i.total != i.n ? '. Page says ' + i.total + ' jobs but ' + i.n + ' were read' : '')
    : 'Snapshot. Live sync is blocked by the browser, use the relay file or paste.';
  const ch = (k, v, t) =>
    `<button class="chip ${F[k] == v ? 'on' : ''}" ${onClick('setUI', 'del.' + k, v)}>${esc(t)}</button>`;
  const card = (x) =>
    `<div class="dcard clk-r" ${rowClick('editDel', x.id)}><div class="dtop"><span class="dsup"><i style="background:${supCol(x.supplier)}"></i>${esc(x.supplier)}</span>${dTag(x)}</div><b>${esc(x.items)}</b><div class="muted">${esc(x.contract || 'No Job Ref')}</div>${x.stage ? `<div class="dst">${esc(x.stage)}${msDots(x)}</div>` : ''}<div class="dact">${x.status != 'Received' ? `<button class="mini pri" ${onClick('recvD', x.id)}>Received</button>` : ''}<button class="mini" ${onClick('editDel', x.id)}>Edit</button></div></div>`;
  const LN = DWIN;
  const board =
    LN.map(([k, t, cl]) => {
      const L = list.filter((x) => lane(x) == k);
      return L.length || ((k == 'od' || k == 'td') && F.f != 'rec')
        ? `<div class="dlane"><h2><span>${t}</span><span class="tag ${cl}">${L.length}</span></h2>${
            L.slice(0, k == 'rec' ? 8 : 99)
              .map(card)
              .join('') || '<p class="empty">Nothing here.</p>'
          }</div>`
        : '';
    }).join('') || emptyArt('van', 'No deliveries match.');
  const table = `<div class="tw"><table class="dtb"><thead><tr><th>Due</th><th>Supplier</th><th>Description</th><th class="c-sm">Job Or Ref</th><th class="c-md">Stage</th><th>Status</th><th class="ac"></th></tr></thead><tbody>${
    DWIN.map(([k, t2, cl]) => {
      const G = list.filter((x) => lane(x) == k);
      return G.length
        ? `<tr class="dgrp"><td colspan="7"><b>${t2}</b> <span class="tag ${cl}">${G.length}</span></td></tr>` +
            G.map(
              (x) =>
                `<tr class="clk-r" ${rowClick('editDel', x.id)}><td>${fd(x.due)}</td><td><b>${esc(x.supplier)}</b></td><td>${esc(x.items)}</td><td class="c-sm">${esc(x.contract || '-')}</td><td class="c-md">${esc(x.stage || '-')}${msDots(x)}</td><td>${dTag(x)}</td><td class="ac"><div class="acts r">${x.status != 'Received' ? `<button class="mini pri" ${onClick('recvD', x.id)}>Received</button>` : ''}<button class="mini" ${onClick('editDel', x.id)}>Edit</button><button class="mini del" ${onClick('delDel', x.id)}>Delete</button></div></td></tr>`
            ).join('')
        : '';
    }).join('') || '<tr><td colspan="7" class="empty">No deliveries match.</td></tr>'
  }</tbody></table></div>`;
  return `<div class="head"><div><h1>Deliveries</h1><span class="muted">${n('od') + n('td') + n('wk') + n('mo') + n('lt')} outstanding from ${sn.length} suppliers</span></div><div class="tools"><div class="seg2"><button class="${F.v == 'list' ? 'on' : ''}" ${onClick('setUI', 'del.v', 'list')}>List</button><button class="${F.v == 'board' ? 'on' : ''}" ${onClick('setUI', 'del.v', 'board')}>Board</button></div><span class="vs"></span><button class="btn sm" data-act="editDel">New Delivery</button><button class="mini" data-act="syncHM">Sync Hallmark</button><button class="mini" data-act="expDel">Export CSV</button><button class="mini" data-act="delReports">Reports</button></div></div>
  <div class="kpis">${[
    ['Overdue', n('od'), n('od') ? 'bad' : ''],
    ['Due Today', n('td'), n('td') ? 'warn' : ''],
    ['This Week', n('wk'), ''],
    ['This Month', n('mo'), ''],
    ['Later', n('lt'), ''],
    ['In Transit', all.filter((x) => dAuto(x) == 'In transit').length, ''],
  ]
    .map((k) => `<div class="kpi ${k[2]}"><small>${k[0]}</small><b>${k[1]}</b></div>`)
    .join('')}</div>
  <div class="panel" style="margin-bottom:.9rem;display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center"><span><b>Hallmark Feed</b> <span class="muted">${H.length} jobs. ${esc(msg)}</span></span><span class="acts"><span class="tag">Not Started ${c('Not Started')}</span><span class="tag">In Factory ${c('In Factory')}</span><span class="tag">QC Done ${c('QC Done')}</span><span class="tag g">Delivered ${c('Delivered')}</span><button class="mini" data-act="syncHM">Sync Now</button></span></div>
  <div class="sg2">${ch('f', 'out', 'Outstanding')}${ch('f', 'rec', 'Received')}${ch('f', 'all', 'All')}<span class="vs"></span>${ch('s', 'all', 'All Suppliers')}${sn.map((x) => ch('s', x, x)).join('')}</div>
  ${F.v == 'list' ? table : `<div class="dlanes">${board}</div>`}`;
}
/* 'Received' opens the delivery on its arrival checks: who checked it, QC, anything damaged */
export function recvD(id) {
  const x = state.deliveries.find((d) => d.id == id);
  if (!x) return;
  editDel(id);
  setTimeout(() => {
    const s = $('#f_status'),
      r = $('#f_recvDate');
    if (s) s.value = 'Received';
    if (r && !r.value) r.value = today();
    const c = $('#f_checkedBy');
    if (c) {
      c.scrollIntoView({ block: 'center' });
      c.focus();
    }
  }, 40);
}
export function editDel(id, supName, con) {
  const x = state.deliveries.find((d) => d.id == id);
  const ST = staffNames().filter(Boolean);
  form(
    x ? 'Delivery: ' + x.supplier : 'New Delivery',
    [
      { t: 'h', l: 'The Order' },
      { k: 'supplier', l: 'Supplier', t: 'select', o: SUPN(x && x.supplier), w: 'full', req: 1 },
      { k: 'items', l: 'What is coming', w: 'full', req: 1 },
      {
        k: 'due',
        l: 'Due date',
        t: 'date',
        req: 1,
        hint: 'The status follows this date: Due a week before, In transit 4 days before, Overdue after',
      },
      { k: 'contract', l: 'Job / contract no.', max: 30 },
      { k: 'ref', l: 'Order or delivery note number', max: 40 },
      { t: 'h', l: 'When It Arrives' },
      { k: 'status', l: 'Received?', t: 'select', o: ['Not yet', 'Received'] },
      { k: 'recvDate', l: 'Date received', t: 'date' },
      { k: 'checkedBy', l: 'Checked by', t: 'select', o: ['', ...ST] },
      { k: 'qc', l: 'Quality check', t: 'select', o: ['', 'Passed', 'Failed', 'Not checked yet'] },
      { k: 'complete', l: 'Everything there?', t: 'select', o: ['', 'Yes, all there', 'Some missing'] },
      { k: 'damaged', l: 'Anything damaged?', t: 'select', o: ['', 'No', 'Yes'] },
      { k: 'damage', l: 'What is damaged or missing', t: 'area', w: 'full', max: 600 },
      { k: 'notes', l: 'Notes', t: 'area', w: 'full', max: 600 },
    ],
    x
      ? { ...x, status: x.status == 'Received' ? 'Received' : 'Not yet' }
      : { due: addDays(7), status: 'Not yet', supplier: supName || '', contract: con || '' },
    (o) => {
      if (o.status == 'Received') {
        if (!o.recvDate) o.recvDate = today();
        if (!o.checkedBy) {
          const e = $('#f_checkedBy');
          if (e) {
            fieldErr(e, 'Who checked it in?');
            return false;
          }
        }
      } else o.status = 'Due';
      if (o.damaged == 'Yes' && !o.damage && !(o.photos || []).length) {
        const e = $('#f_damage');
        if (e) {
          fieldErr(e, 'Say what is damaged, or add a photo');
          return false;
        }
      }
      if (x) repos.deliveries.changed(Object.assign(x, o));
      else repos.deliveries.add({ id: shortId('D'), ...o });
      audit(
        x ? 'Delivery edited' : 'Delivery added',
        o.supplier,
        o.items + (o.status == 'Received' ? ' · received' + (o.damaged == 'Yes' ? ' damaged' : '') : '')
      );
    },
    'Photograph any damage when it arrives. Photos print with the delivery report.'
  );
  if (x)
    $('#mbox .mact').insertAdjacentHTML(
      'afterbegin',
      `<button class="btn ghost l" style="color:var(--red)" ${onClick('delDel', x.id)}>Delete</button>`
    );
}
export function delDel(id) {
  const x = state.deliveries.find((d) => d.id == id);
  if (!x) return;
  askYes(
    'Delete this delivery?',
    x.supplier + ': ' + x.items + '. This cannot be undone.',
    'Delete delivery',
    () => {
      repos.deliveries.remove((d) => d.id == id);
      audit('Delivery deleted', x.supplier, x.items);
      store();
      render();
    },
    true
  );
}
export function expDel() {
  csvDownload('broadland-deliveries-' + today() + '.csv', [
    ['Due', 'Supplier', 'Description', 'Job Or Ref', 'Stage', 'Status'],
    ...state.deliveries.map((x) => [x.due, x.supplier, x.items, x.contract, x.stage || '', x.status]),
  ]);
  toast('Deliveries exported');
}
export function delRows(L) {
  return L.slice()
    .sort((a, b) => a.due.localeCompare(b.due))
    .map((x) => [fd(x.due), x.supplier, x.items, x.contract || '-', x.stage || '-', x.status]);
}
export const DH = ['Due', 'Supplier', 'Description', 'Job Or Ref', 'Stage', 'Status'];
export function delReport(k) {
  const td = today(),
    A2 = state.deliveries,
    w = DWIN.find((x) => x[0] == k),
    out = A2.filter((x) => x.status != 'Received');
  let L, t2;
  if (k == 'rec') {
    const from = addDays(-30);
    L = A2.filter((x) => x.status == 'Received' && x.due >= from);
    t2 = 'Received, Last 30 Days';
  } else if (k == 'sup') {
    t2 = 'Outstanding By Supplier';
    L = out;
  } else if (w) {
    L = A2.filter((x) => delWin(x) == k);
    t2 = w[1];
  } else {
    L = out;
    t2 = 'All Outstanding';
  }
  const tables =
    k == 'sup'
      ? [...new Set(L.map((x) => x.supplier))]
          .sort()
          .map((s) => ({ t: s, h: DH, r: delRows(L.filter((x) => x.supplier == s)) }))
      : [{ t: t2, h: DH, r: delRows(L) }];
  printDoc('Deliveries: ' + t2, L.length + ' deliver' + (L.length == 1 ? 'y' : 'ies'), [], [], {
    kind: 'Deliveries',
    ref: 'DEL-' + td.replace(/-/g, ''),
    sign: true,
    kpis: DWIN.filter((x) => x[0] != 'rec').map(([kk, n]) => [n, out.filter((x) => delWin(x) == kk).length]),
    tables,
  });
}
export function delReports() {
  const n = (k) => state.deliveries.filter((x) => delWin(x) == k).length;
  openModal(
    `<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>Delivery Reports</h2><p class="muted">Pick a report to print or save as PDF.</p><div class="docs">${[...DWIN.map(([k, t2]) => [k, t2, (k == 'rec' ? state.deliveries.filter((x) => x.status == 'Received' && x.due >= addDays(-30)).length : n(k)) + ' deliveries']), ['all', 'All Outstanding', state.deliveries.filter((x) => x.status != 'Received').length + ' deliveries'], ['sup', 'By Supplier', 'Outstanding, grouped by supplier']].map(([k, t2, d]) => `<button class="dc" ${onClick('delReport', k)}><b>${esc(t2)}</b><span class="muted">${esc(d)}</span></button>`).join('')}</div><div class="mact"><button class="btn ghost" data-act="closeModal">Close</button></div>`,
    'md'
  );
}
