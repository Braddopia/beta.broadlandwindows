/* features/notifications/notifications: The notification centre (bell). */
import { onClick } from '../../core/actions.js';
import { addDays, fd, today } from '../../core/dates.js';
import { $, esc } from '../../core/dom.js';
import { shortId } from '../../core/ids.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { byUid, colTxt, hasLoc, isLow, products, unitOf } from '../../domain/stock.js';
import { can } from '../../domain/permissions.js';
import { fensaDue } from '../contracts/contracts.js';
import { moveClear, reqApprove, reqReceive, reqReject } from '../stock/stock.js';
import { emptyArt } from '../../ui/components/art.js';
import { ordTag } from '../../ui/components/tags.js';
import { form } from '../../ui/forms/form.js';
import { go, render } from '../../ui/shell/router.js';
import { uiState } from '../../ui/ui-state.js';

/* ==========================================================================
   14 · Notification centre: stock requests, alerts, stock in/out, mentions
   ========================================================================== */
export const NCTABS_ALL = ['All', 'Requests', 'Stock In/Out', 'Alerts'],
  NCTABS_STD = ['All', 'My Requests', 'Alerts'];
export const NCTABS = NCTABS_ALL;
export const ncTabs = () => (can('money') ? NCTABS_ALL : NCTABS_STD);
export let ncAlerts = [];
export function ncData() {
  const td = today(),
    req = [],
    mov = [],
    alr = [];
  const Ad = can('money');
  state.items.forEach((r) => {
    if (r.type == 'request') {
      if (['Pending', 'Approved'].includes(r.reqStatus) && !r.cleared && (Ad || r.user == USER)) req.push(r);
    } else if (Ad) {
      mov.push({ r, n: !state.seen[r.uid] });
      if (r.flag && !r.cleared)
        alr.push({ k: 'Alert', t: r.item + ': ' + r.type + ' ' + r.qty, s: r.user + ', ' + r.time, uid: r.uid });
    }
  });
  products().forEach((r) => {
    const k = 'low:' + r.pid;
    if (isLow(r) && state.dis[k] !== r.stock)
      alr.push({
        k: 'Low Stock',
        t: r.item,
        s: r.stock + ' ' + unitOf(r) + ' left at ' + (hasLoc(r) ? r.location : 'no location'),
        key: k,
        stock: r.stock,
      });
  });
  state.contracts
    .filter((c) => fensaDue(c) && c.fit && c.fit <= addDays(-14))
    .forEach((c) => {
      const g = Math.round((new Date(td) - new Date(c.fit)) / 864e5);
      alr.push({
        k: 'FENSA',
        t: c.name + ' #' + c.id,
        s: 'Fitted ' + g + ' days ago. Notify FENSA within 30 days of fitting.',
        go: 'contracts',
        key: 'fensa:' + c.id,
        stock: 1,
      });
    });
  state.deliveries
    .filter((d) => d.status != 'Received' && d.due <= td)
    .forEach((d) =>
      alr.push({
        k: 'Delivery',
        t: d.supplier + ': ' + d.items,
        s: d.due < td ? 'Overdue since ' + fd(d.due) : 'Due today',
        go: 'deliveries',
        key: 'del:' + d.id + ':' + d.due,
        stock: 1,
      })
    );
  return {
    req,
    mov: Ad ? mov.slice(0, 20) : [],
    alr: alr.filter((x) => (Ad || !['FENSA', 'Alert'].includes(x.k)) && !(x.stock === 1 && state.dis[x.key] === 1)),
    men: [],
  };
}
export function ncCount() {
  const d = ncData();
  return (
    d.req.filter((r) => (can('money') ? r.reqStatus == 'Pending' : r.reqStatus == 'Approved')).length +
    d.mov.filter((x) => x.n).length +
    d.alr.length +
    d.men.filter((n) => !n.read).length
  );
}
export function ncDraw() {
  const nc = $('#nc'),
    d = ncData(),
    T = uiState.nc.t,
    show = (k) => T == 'All' || T == k || (k == 'Requests' && T == 'My Requests'),
    Ad = can('money');
  ncAlerts = d.alr;
  const sec = (t, h) => `<h3 class="nch">${t}</h3>${h || emptyArt('done', 'Nothing here.')}`;
  const rq = d.req
    .map(
      (r) =>
        `<div class="nrow ${r.flag ? 'hot' : ''}"><span><span class="tag ${r.reqStatus == 'Pending' ? 'y' : 'g'}">${esc(r.reqStatus)}</span> <b>${ordTag(r)} ${r.qty} ${esc(unitOf(r))} x ${esc(r.item)}</b><small>${esc(colTxt(r))}, ${esc(r.user)}, ${esc(r.time)}${r.note ? ', ' + esc(r.note) : ''}</small></span><span class="acts">${r.reqStatus == 'Pending' && Ad ? `<button class="mini pri" ${onClick('ncAct', 'approve', r.uid)}>Approve</button><button class="mini del" ${onClick('ncAct', 'reject', r.uid)}>Reject</button>` : ''}${r.reqStatus == 'Approved' ? `<button class="mini" ${onClick('ncAct', 'receive', r.uid)}>Receive</button><button class="mini" ${onClick('ncAct', 'clr', r.uid)}>Clear</button>` : ''}</span></div>`
    )
    .join('');
  const al = d.alr
    .map(
      (x, j) =>
        `<div class="nrow"><span><span class="tag ${x.k == 'Alert' ? 'r' : 'y'}">${esc(x.k)}</span> <b>${esc(x.t)}</b><small>${esc(x.s)}</small></span><span class="acts">${x.go ? `<button class="mini" ${onClick('ncAct', 'go', x.go)}>Open</button>` : ''}<button class="mini pri" ${onClick('ncAct', 'alr', j)}>Clear</button></span></div>`
    )
    .join('');
  const mv = d.mov
    .map(
      (x) =>
        `<div class="nrow ${x.n ? '' : 'seen'}"><span><span class="tag ${x.r.type == 'add' ? 'g' : 'r'}">${x.r.type == 'add' ? 'In' : 'Out'}</span> <b>${x.r.qty} ${esc(unitOf(x.r))} x ${esc(x.r.item)}</b><small>${esc(x.r.user)}, ${esc(x.r.time)}, stock now ${x.r.stock}</small></span>${x.n ? '<span class="dotn"></span>' : ''}</div>`
    )
    .join('');

  nc.innerHTML = `<div class="nc-h"><h2>Notification Centre</h2><button class="mini" data-act="ncToggle" data-args="[false]">Close</button></div><div class="chips" style="padding:.6rem 1.1rem 0">${ncTabs()
    .map((t) => `<button class="chip ${T == t ? 'on' : ''}" ${onClick('ncTab', t)}>${t}</button>`)
    .join(
      ''
    )}</div><div class="nc-t"><button class="mini" ${onClick('ncAct', 'readall')}>Mark all read</button><button class="mini" ${onClick('ncAct', 'clrall')}>Clear all</button><button class="mini pri" data-act="ncGoMessages">Messages</button></div><div class="nc-b">${show('Requests') ? sec((can('money') ? 'Stock Requests' : 'My Stock Requests') + ' (' + d.req.length + ')', rq) : ''}${show('Alerts') ? sec('Alerts (' + d.alr.length + ')', al) : ''}${can('money') && show('Stock In/Out') ? sec('Stock In And Out', mv) : ''}</div>`;
}
export function ncTab(t) {
  uiState.nc.t = t;
  ncDraw();
}
export function ncToggle(o) {
  $('#nc').classList.toggle('open', o);
  $('#ncbg').classList.toggle('open', o);
  if (o) ncDraw();
}
export function ncAct(a, x) {
  if (a == 'approve') {
    reqApprove(x);
    return;
  }
  if (a == 'reject') {
    reqReject(x);
    return;
  }
  if (a == 'receive') {
    ncToggle(false);
    reqReceive(x);
    return;
  }
  if (a == 'go') {
    ncToggle(false);
    go(x);
    return;
  }
  if (a == 'clr') moveClear(x);
  else if (a == 'alr') {
    const q = ncAlerts[x];
    if (!q) return;
    if (q.uid) {
      const r = byUid(q.uid);
      if (r) {
        r.cleared = true;
        r.flag = false;
      }
    } else if (q.key) state.dis[q.key] = q.stock;
  } else if (a == 'read') {
    const n = state.notes.find((n) => n.id == x);
    if (n) n.read = true;
  } else if (a == 'del') state.notes = state.notes.filter((n) => n.id != x);
  else if (a == 'readall') {
    ncData().mov.forEach((m) => (state.seen[m.r.uid] = 1));
    state.notes.forEach((n) => {
      if (n.to == USER) n.read = true;
    });
  } else if (a == 'clrall') {
    const d = ncData(),
      T = uiState.nc.t,
      all = T == 'All';
    if (all || T == 'Requests' || T == 'My Requests')
      d.req
        .filter((r) => r.reqStatus != 'Pending')
        .forEach((r) => {
          r.cleared = true;
          r.reqStatus = 'Cleared';
        });
    if (all || T == 'Alerts')
      d.alr.forEach((q) => {
        if (q.uid) {
          const r = byUid(q.uid);
          if (r) {
            r.cleared = true;
            r.flag = false;
          }
        } else if (q.key) state.dis[q.key] = q.stock;
      });
    if (all || T == 'Mentions') state.notes = state.notes.filter((n) => n.to != USER);
    if (all || T == 'Stock In/Out') d.mov.forEach((m) => (state.seen[m.r.uid] = 1));
  }
  /* keep the seen-list from growing forever */
  const keep = new Set(state.items.map((r) => r.uid));
  Object.keys(state.seen).forEach((k) => {
    if (!keep.has(k)) delete state.seen[k];
  });
  store();
  render();
}
export function ncNote() {
  const nm = [...new Set([USER, ...state.staff.map((x) => x.name).filter(Boolean)])];
  form(
    'New Message',
    [
      { k: 'to', l: 'Mention (To)', t: 'select', o: nm, w: 'full' },
      { k: 't', l: 'Message', t: 'area', w: 'full', req: 1, max: 500 },
    ],
    { to: nm[1] },
    (o) => {
      state.notes.push({ id: shortId('N'), to: o.to, by: USER, t: o.t, at: Date.now(), read: false });
      if (state.notes.length > 500) state.notes.splice(0, state.notes.length - 500);
    }
  );
}
export function ncGoMessages() {
  ncToggle(false);
  go('messages');
}
