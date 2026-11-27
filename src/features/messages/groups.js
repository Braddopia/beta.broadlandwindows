/* features/messages/groups: group chats. Anyone can start one and owns it; the owner and group admins add and remove
   people, mute them, time them out and make others admins (rules in domain/groups.js). Each change also shows as a
   small line in the group's chat, so everyone can see what happened. */
import { actJson, onClick } from '../../core/actions.js';
import { esc } from '../../core/dom.js';
import { shortId } from '../../core/ids.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import * as repos from '../../data/repository.js';
import {
  TIMEOUTS,
  canActOn,
  canManage,
  dropMember,
  groupKey,
  isMember,
  isMuted,
  leaveGroup,
  roleIn,
  timedOutUntil,
} from '../../domain/groups.js';
import { closeFpop, openFpop } from '../../ui/components/popover.js';
import { form } from '../../ui/forms/form.js';
import { askYes, closeModal, openModal } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { setUI } from '../../ui/ui-state.js';
import { toast } from '../../ui/toast.js';
import { celebrate } from '../../ui/success.js';

const grp = (id) => repos.groups.get(id);
const hhmm = (t) =>
  new Date(t).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', '');

/** a small line in the group's chat ("Ann added Bob"); not counted as unread */
export function grpNote(g, text) {
  state.notes = state.notes || [];
  state.notes.push({
    id: shortId('N'),
    to: groupKey(g),
    by: USER,
    ev: 1,
    t: SAFE.text(text, 300),
    at: Date.now(),
    readBy: [USER],
  });
  if (state.notes.length > 800) state.notes.splice(0, state.notes.length - 800);
}
const save = (g, what, detail) => {
  repos.groups.changed(g);
  audit(what, 'Group ' + g.name, detail || '');
  store();
  render();
};
/* a refusal says why, rather than doing nothing */
const refuse = (msg) => {
  toast(msg);
  return false;
};

const FIELDS = [
  { k: 'name', l: 'Group name', req: 1, max: 40 },
  {
    k: 'desc',
    l: 'Description',
    t: 'area',
    w: 'full',
    max: 240,
    hint: 'What the group is for, shown to everyone in it',
  },
  {
    k: 'access',
    l: 'Who can join',
    t: 'select',
    o: ['Invite only', 'Open'],
    hint: 'Invite only: just the people added. Open: anyone can find it and join.',
  },
];

/** start a new group; whoever starts it owns it */
export function grpNew() {
  form('New Group', FIELDS, { access: 'Invite only' }, (o) => {
    const g = repos.groups.add({
      id: shortId('G'),
      name: SAFE.text(o.name, 40),
      desc: SAFE.text(o.desc, 240),
      open: o.access == 'Open',
      owner: USER,
      admins: [],
      members: [USER],
      muted: [],
      timeouts: {},
    });
    grpNote(g, USER + ' started the group');
    audit('Group started', 'Group ' + g.name, g.open ? 'Open' : 'Invite only');
    setUI('msg.to', groupKey(g));
    setTimeout(() => {
      closeModal();
      celebrate('Group started', g.name + ': add people from the panel on the right');
    });
  });
}
/** rename the group, change its description or who can join (owner and group admins) */
export function grpEdit(id) {
  const g = grp(id);
  if (!g || !canManage(g, USER)) return refuse('Only the owner or a group admin can change the group');
  form('Edit Group', FIELDS, { name: g.name, desc: g.desc, access: g.open ? 'Open' : 'Invite only' }, (o) => {
    Object.assign(g, { name: SAFE.text(o.name, 40), desc: SAFE.text(o.desc, 240), open: o.access == 'Open' });
    grpNote(g, USER + ' changed the group details');
    repos.groups.changed(g);
    audit('Group changed', 'Group ' + g.name, '');
  });
}
/** the people who can be added: everyone on the staff list not in the group yet, each with an Add button */
export function grpAdd(id) {
  const g = grp(id);
  if (!g || !canManage(g, USER)) return refuse('Only the owner or a group admin can add people');
  const out = state.staff.map((s) => s.name).filter((n) => n && !isMember(g, n));
  openModal(
    `<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>Add People</h2><p class="muted">${esc(g.name)}</p><div class="grp-add">${
      out
        .map(
          (n) =>
            `<div class="grp-ar"><b>${esc(n)}</b><small>${esc((state.staff.find((s) => s.name == n) || {}).role || '')}</small><button class="mini pri" ${onClick('grpAddOne', id, n)}>Add</button></div>`
        )
        .join('') || '<p class="muted">Everyone is already in this group.</p>'
    }</div><div class="mact"><button class="btn" data-act="closeModal">Done</button></div>`,
    'sm'
  );
}
export function grpAddOne(id, name, quiet) {
  const g = grp(id);
  if (!g || !canManage(g, USER)) return refuse('Only the owner or a group admin can add people');
  if (!state.staff.some((s) => s.name == name)) return;
  if (isMember(g, name)) return refuse(name + ' is already in the group');
  g.members.push(name);
  grpNote(g, USER + ' added ' + name);
  save(g, 'Added to group', name);
  toast(name + ' added');
  if (!quiet) grpAdd(id);
}
/** join an open group */
export function grpJoin(id) {
  const g = grp(id);
  if (!g || !g.open || isMember(g, USER)) return;
  g.members.push(USER);
  grpNote(g, USER + ' joined');
  setUI('msg.to', groupKey(g));
  save(g, 'Joined group', USER);
}
/** leave a group (an owner leaving hands it to a group admin, else the next person) */
export function grpLeave(id) {
  const g = grp(id);
  if (!g || !isMember(g, USER)) return;
  askYes(
    'Leave ' + g.name + '?',
    g.owner == USER
      ? 'You own this group: it passes to a group admin, or the next person in it.'
      : 'You will stop seeing its messages.',
    'Leave',
    () => {
      if (!leaveGroup(g, USER)) {
        grpGone(g);
        return;
      }
      grpNote(
        g,
        USER + ' left' + (g.owner != USER && roleIn(g, g.owner) ? ', ' + g.owner + ' now owns the group' : '')
      );
      setUI('msg.to', 'Everyone');
      save(g, 'Left group', USER);
    }
  );
}
/** delete the group and its messages (owner only) */
export function grpDelete(id) {
  const g = grp(id);
  if (!g || g.owner != USER) return refuse('Only the owner can delete the group');
  askYes(
    'Delete ' + g.name + '?',
    'The group and all its messages are removed for everyone.',
    'Delete group',
    () => grpGone(g),
    true
  );
}
function grpGone(g) {
  repos.groups.remove((x) => x.id == g.id);
  state.notes = (state.notes || []).filter((n) => n.to != groupKey(g));
  audit('Group deleted', 'Group ' + g.name, '');
  setUI('msg.to', 'Everyone');
  store();
  render();
  toast(g.name + ' deleted');
}

/** the menu beside someone in the group: admin, mute, time out, remove (what the person using it may do) */
export function grpMenu(id, name, btn) {
  const g = grp(id);
  if (!g || !btn || !canActOn(g, USER, name)) return;
  const it = (act, t, cls = '', arg = '') =>
      `<button type="button" class="pm-i ${cls}" ${onClick('grpDo', id, name, act, arg)}>${t}</button>`,
    adm = roleIn(g, name) == 'admin',
    to = timedOutUntil(g, name, Date.now());
  openFpop(
    btn,
    `<div class="pm" role="menu"><p class="pm-h">${esc(name)}</p>${g.owner == USER ? it(adm ? 'unadmin' : 'admin', adm ? 'Remove group admin' : 'Make group admin') : ''}${it(isMuted(g, name) ? 'unmute' : 'mute', isMuted(g, name) ? 'Unmute' : 'Mute')}${to ? it('untime', 'End time out') : TIMEOUTS.map(([k, , l]) => it('time', 'Time out for ' + l, '', k)).join('')}<hr>${it('remove', 'Remove from group', 'del')}</div>`
  );
}
export function grpDo(id, name, act, arg) {
  closeFpop();
  const g = grp(id);
  if (!g || !canActOn(g, USER, name)) return refuse('You cannot change this for ' + name);
  const done = (line) => {
    grpNote(g, line);
    save(g, 'Group: ' + act, name);
  };
  if (act == 'admin' || act == 'unadmin') {
    if (g.owner != USER) return refuse('Only the owner can make group admins');
    g.admins = (g.admins || []).filter((x) => x != name);
    if (act == 'admin') g.admins.push(name);
    return done(act == 'admin' ? name + ' is now a group admin' : name + ' is no longer a group admin');
  }
  if (act == 'mute') {
    g.muted = [...new Set([...(g.muted || []), name])];
    return done(USER + ' muted ' + name);
  }
  if (act == 'unmute') {
    g.muted = (g.muted || []).filter((x) => x != name);
    return done(USER + ' unmuted ' + name);
  }
  if (act == 'time') {
    const t = TIMEOUTS.find(([k]) => k == arg);
    if (!t) return;
    g.timeouts = { ...(g.timeouts || {}), [name]: Date.now() + t[1] };
    return done(USER + ' timed out ' + name + ' for ' + t[2]);
  }
  if (act == 'untime') {
    if (g.timeouts) delete g.timeouts[name];
    return done(USER + ' ended ' + name + "'s time out");
  }
  if (act == 'remove')
    askYes('Remove ' + name + '?', 'They will no longer see ' + g.name + '.', 'Remove', () => {
      dropMember(g, name);
      done(USER + ' removed ' + name);
    });
}

/** the right-hand panel for a group: what it is for, who is in it and their role, and the owner's tools */
export function groupPanelH(g, av) {
  const now = Date.now(),
    me = USER,
    mgr = canManage(g, me),
    tag = (n) => {
      const r = roleIn(g, n),
        to = timedOutUntil(g, n, now);
      return [
        r == 'owner' ? '<i class="grp-t own">Owner</i>' : r == 'admin' ? '<i class="grp-t adm">Admin</i>' : '',
        isMuted(g, n) ? '<i class="grp-t mut">Muted</i>' : '',
        to ? `<i class="grp-t tmo" title="Can send again ${esc(hhmm(to))}">Timed out</i>` : '',
      ].join('');
    },
    order = (a, b) =>
      ['owner', 'admin', 'member'].indexOf(roleIn(g, a)) - ['owner', 'admin', 'member'].indexOf(roleIn(g, b)) ||
      a.localeCompare(b),
    row = (n) =>
      `<div class="msn-c msn-pp grp-m ${n == me ? 'you' : ''}">${av(n)}<span class="msn-ct"><b>${esc(n)}${n == me ? ' <i class="msn-you">You</i>' : ''}</b><small>${tag(n) || esc((state.staff.find((s) => s.name == n) || {}).role || '')}</small></span>${canActOn(g, me, n) ? `<button type="button" class="grp-mb" id="gm_${esc(g.id)}_${esc(n.replace(/\W/g, ''))}" aria-haspopup="true" aria-label="Options for ${esc(n)}" data-act="grpMenu" data-args="${actJson([g.id, n, 'this'], 2)}">⋯</button>` : ''}</div>`;
  return `<aside class="msn-p" aria-label="This group"><div class="msn-lh"><h1>Group</h1><span class="msn-pn" title="People in this group">${g.members.length}</span></div>
    <div class="grp-card"><b>${esc(g.name)}</b><span class="tag ${g.open ? 'g' : ''}">${g.open ? 'Open group' : 'Invite only'}</span>${g.desc ? `<p>${esc(g.desc)}</p>` : '<p class="muted">No description yet.</p>'}<div class="grp-tools">${mgr ? `<button class="mini pri" ${onClick('grpAdd', g.id)}>Add people</button><button class="mini" ${onClick('grpEdit', g.id)}>Edit Group</button>` : ''}${isMember(g, me) ? `<button class="mini" ${onClick('grpLeave', g.id)}>Leave</button>` : ''}${g.owner == me ? `<button class="mini del" ${onClick('grpDelete', g.id)}>Delete</button>` : ''}</div></div>
    <p class="msn-ph">In This Group</p><div class="msn-pl">${g.members.slice().sort(order).map(row).join('')}</div>
    <div class="msn-rp"><button type="button" class="btn ghost sm" data-act="bugHere"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>Report A Problem</button></div>
  </aside>`;
}
