/* features/messages/commands: the "/" commands typed in the Messages box (rules in domain/chat-commands.js).
   Typing "/" shows the commands this person can use in this chat; picking one fills it in. Group commands go through
   the same actions as the group's buttons, so they check the same permissions. */
import { onClick } from '../../core/actions.js';
import { $, esc } from '../../core/dom.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import * as repos from '../../data/repository.js';
import { canManage, groupOf, isMember } from '../../domain/groups.js';
import { commandsFor, findPerson, parseCommand, splitPerson, splitTimeout } from '../../domain/chat-commands.js';
import { openModal } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { uiState } from '../../ui/ui-state.js';
import { toast } from '../../ui/toast.js';
import { grpAddOne, grpDo, grpLeave, grpNote, grpSetNick } from './groups.js';

const here = () => uiState.msg.to || 'Everyone';

/** someone's nickname in a chat: their group nickname there, else their team-wide one, else '' */
export function nickOf(who, to) {
  const g = groupOf(state.groups, to),
    gn = g && g.nicks && g.nicks[who];
  return gn || (state.nicks && state.nicks[who]) || '';
}

/** carry out a command. Returns { t, me } when it sends a message (/me, /shrug), else null (done, or refused) */
export function runCommand(text) {
  const c = parseCommand(text),
    to = here(),
    g = groupOf(state.groups, to),
    mgr = !!g && canManage(g, USER),
    allowed = commandsFor(!!g && isMember(g, USER), mgr).map((x) => x[0]);
  if (!c) return null;
  if (!allowed.includes(c.cmd)) {
    toast(
      commandsFor(true, true).some((x) => x[0] == c.cmd)
        ? '/' + c.cmd + ' only works in a group you run'
        : 'No command called /' + c.cmd + ': type /help'
    );
    return null;
  }
  const person = (typed) => {
    const p = findPerson(typed, c.cmd == 'add' ? state.staff.map((s) => s.name).filter(Boolean) : g.members);
    if (!p) toast(typed ? 'Nobody (or more than one person) matches "' + typed + '"' : 'Type a name after /' + c.cmd);
    return p;
  };
  switch (c.cmd) {
    case 'help':
      return (showHelp(), null);
    case 'me':
      if (!c.rest) return (toast('Type what you are doing after /me'), null);
      return { t: SAFE.text(c.rest, 1000), me: 1 };
    case 'shrug':
      return { t: SAFE.text((c.rest ? c.rest + ' ' : '') + '¯\\_(ツ)_/¯', 1000) };
    case 'nickname':
      return (setNick(g, SAFE.text(c.rest, 30)), null);
    case 'leave':
      return (grpLeave(g.id), null);
    case 'add': {
      const p = person(c.rest);
      if (p) grpAddOne(g.id, p, true);
      return null;
    }
    case 'timeout': {
      const { who, len } = splitTimeout(c.rest);
      if (!len) return (toast('Say how long: /timeout Name 15m, 1h, 1d or 1w'), null);
      const p = person(who);
      if (p) grpDo(g.id, p, 'time', len);
      return null;
    }
    case 'setnick': {
      const { who, rest } = splitPerson(c.rest, g.members);
      if (!who)
        return (
          toast(c.rest ? 'Nobody in the group matches "' + c.rest + '"' : 'Type a name, then the nickname'),
          null
        );
      return (grpSetNick(g.id, who, rest), null);
    }
    case 'rename':
    case 'desc': {
      const v = SAFE.text(c.rest, c.cmd == 'rename' ? 40 : 240);
      if (c.cmd == 'rename' && !v) return (toast('Type the new name after /rename'), null);
      g[c.cmd == 'rename' ? 'name' : 'desc'] = v;
      grpNote(g, USER + (c.cmd == 'rename' ? ' renamed the group ' + v : ' changed the description'));
      repos.groups.changed(g);
      audit(c.cmd == 'rename' ? 'Group renamed' : 'Group description changed', 'Group ' + g.name, v);
      store();
      render();
      return null;
    }
    default: {
      /* remove, mute, unmute, admin, unadmin: the same checks as the menu beside each person */
      const p = person(c.rest);
      if (p)
        grpDo(g.id, p, { mute: 'mute', unmute: 'unmute', admin: 'admin', unadmin: 'unadmin', remove: 'remove' }[c.cmd]);
      return null;
    }
  }
}

function setNick(g, nick) {
  if (g) {
    g.nicks = { ...(g.nicks || {}) };
    if (nick) g.nicks[USER] = nick;
    else delete g.nicks[USER];
    grpNote(g, nick ? USER + ' is now known as ' + nick : USER + ' cleared their nickname');
    repos.groups.changed(g);
  } else {
    state.nicks = { ...(state.nicks || {}) };
    if (nick) state.nicks[USER] = nick;
    else delete state.nicks[USER];
  }
  audit('Nickname set', USER, nick || '(cleared)');
  store();
  render();
  toast(nick ? 'Nickname saved: ' + nick : 'Nickname cleared');
}

function showHelp() {
  const g = groupOf(state.groups, here()),
    L = commandsFor(!!g && isMember(g, USER), !!g && canManage(g, USER));
  openModal(
    `<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>Chat Commands</h2><p class="muted">Type these in the message box${g ? ' in ' + esc(g.name) : ''}.</p><div class="msn-help">${L.map(([n, a, d]) => `<div><code>/${esc(n)}${a ? ' <i>' + esc(a) + '</i>' : ''}</code><span>${esc(d)}</span></div>`).join('')}</div><div class="mact"><button class="btn" data-act="closeModal">Done</button></div>`,
    'sm'
  );
}

/** while typing "/...": the commands that fit what has been typed, above the box. The first is highlighted; the
    arrow keys move the highlight (cmdKey) */
let hi = 0;
export function cmdHints(value) {
  const box = $('#msnCmds');
  if (!box) return;
  const m = /^\/([a-z]*)$/i.exec(value || ''),
    g = groupOf(state.groups, here());
  const L = m
    ? commandsFor(!!g && isMember(g, USER), !!g && canManage(g, USER)).filter(([n]) => n.startsWith(m[1].toLowerCase()))
    : [];
  hi = 0;
  box.hidden = !L.length;
  box.innerHTML = L.map(
    ([n, a, d], i) =>
      `<button type="button" class="msn-cmd ${i == hi ? 'on' : ''}" role="option" aria-selected="${i == hi}" data-cmd="${esc(n)}" ${onClick('msgCmdPick', n)}><b>/${esc(n)}</b>${a ? ` <i>${esc(a)}</i>` : ''}<small>${esc(d)}</small></button>`
  ).join('');
}
/** keys while the list is open: Up and Down move the highlight, Enter or Tab picks it, Esc closes the list.
    Returns true when the key was used here (so Enter does not send) */
export function cmdKey(e) {
  const box = $('#msnCmds');
  if (!box || box.hidden) return false;
  const items = [...box.querySelectorAll('.msn-cmd')];
  if (!items.length) return false;
  if (e.key == 'ArrowDown' || e.key == 'ArrowUp') {
    e.preventDefault();
    hi = (hi + (e.key == 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items.forEach((b, i) => {
      b.classList.toggle('on', i == hi);
      b.setAttribute('aria-selected', i == hi);
    });
    items[hi].scrollIntoView({ block: 'nearest' });
    return true;
  }
  if (e.key == 'Enter' || e.key == 'Tab') {
    /* Enter on a command already typed out in full (/help) runs it; otherwise Enter or Tab fills in the highlighted one */
    const i = $('#m_t');
    if (e.key == 'Enter' && i && i.value.trim().toLowerCase() == '/' + items[hi].dataset.cmd) {
      box.hidden = true;
      return false;
    }
    e.preventDefault();
    msgCmdPick(items[hi].dataset.cmd);
    return true;
  }
  if (e.key == 'Escape') {
    e.preventDefault();
    box.hidden = true;
    return true;
  }
  return false;
}
/** pick a command from the list: it is filled in, ready for the rest */
export function msgCmdPick(n) {
  const i = $('#m_t');
  if (!i) return;
  i.value = '/' + n + ' ';
  i.focus();
  cmdHints(i.value);
}
