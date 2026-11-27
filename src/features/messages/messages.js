/* features/messages/messages: Messages between staff. */
import { onClick } from '../../core/actions.js';
import { today } from '../../core/dates.js';
import { $, esc } from '../../core/dom.js';
import { initials } from '../../core/format.js';
import { svg } from '../../core/icons.js';
import { shortId } from '../../core/ids.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { emptyArt } from '../../ui/components/art.js';
import { askYes } from '../../ui/modal.js';
import { q, render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { setUI, uiState } from '../../ui/ui-state.js';

/* ---------------- messages: their own page, open to every account ---------------- */
/* automatic messages (a holiday approved or turned down...) come from "System", and cannot be answered */
export const SYSTEM = 'System';
/** send someone an automatic message from System (shown in Messages and counted on the bell) */
export function msgSystem(to, text) {
  if (!to) return;
  state.notes = state.notes || [];
  state.notes.push({
    id: shortId('N'),
    to,
    by: SYSTEM,
    t: SAFE.text(text, 1000),
    at: Date.now(),
    read: false,
    readBy: [],
  });
  if (state.notes.length > 800) state.notes.splice(0, state.notes.length - 800);
}
export const msgMine = (n) => n.to == USER || n.to == 'Everyone';
export const msgRead = (n) => (n.to == 'Everyone' ? (n.readBy || []).includes(USER) : !!n.read);
export const msgUnread = () => (state.notes || []).filter((n) => msgMine(n) && n.by != USER && !msgRead(n)).length;
export function vMessages() {
  const N = (state.notes || []).slice().sort((a, b) => a.at - b.at),
    me2 = USER;
  const people = [...new Set(state.staff.map((s) => s.name).filter((n) => n && n != me2))];
  const conv = (w) =>
    w == 'Everyone'
      ? N.filter((n) => n.to == 'Everyone')
      : N.filter((n) => (n.by == me2 && n.to == w) || (n.by == w && n.to == me2));
  const unreadIn = (w) => conv(w).filter((n) => n.by != me2 && !msgRead(n)).length;
  const sys = N.some((n) => n.by == SYSTEM && n.to == me2) ? [SYSTEM] : [];
  const chats = ['Everyone', ...sys, ...people]
    .map((w) => {
      const L = conv(w);
      return { w, last: L[L.length - 1], un: unreadIn(w) };
    })
    .filter((c) => c.w == 'Everyone' || c.last || c.w == uiState.msg.to)
    .sort((a, b) => (b.last ? b.last.at : 0) - (a.last ? a.last.at : 0))
    .filter((c) => !q || c.w.toLowerCase().includes(q) || (c.last && c.last.t.toLowerCase().includes(q)));
  const cur = uiState.msg.to || 'Everyone',
    L = conv(cur);
  const nu = L.filter((n) => n.by != me2 && !msgRead(n));
  nu.forEach((n) => {
    if (n.to == 'Everyone') {
      n.readBy = n.readBy || [];
      n.readBy.push(me2);
    } else n.read = true;
  });
  if (nu.length) store();
  const ago = (t) => {
    const m = Math.round((Date.now() - t) / 6e4);
    return m < 1
      ? 'now'
      : m < 60
        ? m + 'm'
        : m < 1440
          ? Math.round(m / 60) + 'h'
          : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  const av = (n) =>
    `<span class="mav ${n == 'Everyone' ? 'all' : n == SYSTEM ? 'sys' : ''}">${n == 'Everyone' ? '★' : n == SYSTEM ? svg('M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z') : esc(initials(n))}</span>`;
  let lastDay = '';
  return `<div class="msn"><aside class="msn-l"><div class="msn-lh"><h1>Chats</h1><select aria-label="New chat" data-onchange="msgNewChat" data-args-change="[{&quot;$&quot;:&quot;value&quot;}]"><option value="" hidden>+ New chat</option>${people.map((p) => `<option>${esc(p)}</option>`).join('')}</select></div>
   <div class="msn-list">${chats.map((c) => `<button class="msn-c ${c.w == cur ? 'on' : ''} ${c.un ? 'un' : ''}" ${onClick('setUI', 'msg.to', c.w)}>${av(c.w)}<span class="msn-ct"><b>${esc(c.w == 'Everyone' ? 'Everyone (team chat)' : c.w)}</b><small>${c.last ? esc((c.last.by == me2 ? 'You: ' : c.w == 'Everyone' ? c.last.by.split(' ')[0] + ': ' : '') + c.last.t) : 'No messages yet'}</small></span><span class="msn-m">${c.last ? ago(c.last.at) : ''}${c.un ? `<i>${c.un}</i>` : ''}</span></button>`).join('')}</div></aside>
   <section class="msn-r"><header class="msn-h">${av(cur)}<div><b>${esc(cur == 'Everyone' ? 'Everyone' : cur)}</b><small>${cur == 'Everyone' ? 'Messages here go to the whole team' : cur == SYSTEM ? 'Automatic messages from the CRM' : esc((state.staff.find((s) => s.name == cur) || {}).role || '')}</small></div></header>
    <div class="msn-t" id="msnT">${
      L.map((n) => {
        const d = new Date(n.at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
          sep = d != lastDay ? ((lastDay = d), `<div class="msn-day">${d}</div>`) : '',
          mine = n.by == me2;
        return (
          sep +
          `<div class="bw ${mine ? 'me' : ''} ${n.id == JUST_SENT ? 'new' : ''}"><div class="bub ${mine ? 'me' : ''}">${!mine && cur == 'Everyone' ? `<small class="bub-n">${esc(n.by)}</small>` : ''}<p>${esc(n.t)}</p></div><span class="bub-t">${n.id == JUST_SENT ? '<span class="bub-ok">Sent</span> ' : ''}${new Date(n.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}${mine ? `<button class="bub-x" title="Delete" aria-label="Delete message" ${onClick('msgDel', n.id)}>&times;</button>` : ''}</span></div>`
        );
      }).join('') || `<div class="msn-empty">${emptyArt('team', '')}</div>`
    }</div>
    ${cur == SYSTEM ? '<div class="msn-in msn-sys"><span class="muted">Automatic messages from the CRM. There is no one to reply to here.</span></div>' : `<div class="msn-in"><textarea id="m_t" rows="1" maxlength="1000" placeholder="Aa" aria-label="Message" data-onkeydown="msgKey" data-args-keydown="[{&quot;$&quot;:&quot;event&quot;}]" data-oninput="msgTyping" data-args-input="[{&quot;$&quot;:&quot;this&quot;}]"></textarea><button class="msn-send ${JUST_SENT ? 'flew' : ''}" data-act="msgSend" aria-label="Send" title="Send (Enter)">${svg('M4 12l16-8-6 16-3-7z')}</button></div>`}</section>${peopleH(cur, me2, av)}</div>`;
}
/* the message just sent: its bubble pops in with "Sent", and the send button's arrow flies off once */
let JUST_SENT = '';
/** the people panel on the right: who is in the chat that is open (the whole team for Everyone), each with their
    job and whether they are on holiday today; click someone to message them on their own */
function peopleH(cur, me2, av) {
  const td = today(),
    off = (s) => state.hols.some((h) => h.sid == s.id && h.status == 'Approved' && h.from <= td && h.to >= td),
    S = state.staff.filter((s) => s.name),
    one = cur != 'Everyone' && cur != SYSTEM ? S.find((s) => s.name == cur) : null,
    who =
      cur == 'Everyone'
        ? S.slice().sort((a, b) => (a.name == me2 ? -1 : b.name == me2 ? 1 : a.name.localeCompare(b.name)))
        : S.filter((s) => s.name == me2 || (one && s.id == one.id)).sort((a) => (a.name == me2 ? 1 : -1));
  /* each person: the same row as the chats on the left (avatar, name, job), You marked with a small tag */
  const row = (s) => {
    const you = s.name == me2,
      away = off(s),
      here = s.name == cur;
    return `<button type="button" class="msn-c msn-pp ${you ? 'you' : ''} ${here ? 'here' : ''}" ${you || here ? 'disabled' : onClick('setUI', 'msg.to', s.name)} title="${you ? 'You' : here ? 'This chat' : 'Message ' + esc(s.name) + ' on their own'}">${av(s.name)}<span class="msn-ct"><b>${esc(s.name)}${you ? ' <i class="msn-you">You</i>' : ''}</b><small class="${away ? 'away' : ''}">${away ? 'On holiday today' : esc(s.role || s.cat || '')}</small></span>${you || here ? '' : `<span class="msn-go" aria-hidden="true">${svg('M4 12h12M12 6l6 6-6 6')}</span>`}</button>`;
  };
  /* a chat with one person: their card first (job, team, how to reach them), then who is in the chat */
  const card = one
    ? `<div class="msn-pc">${av(one.name)}<b>${esc(one.name)}</b><small>${esc([one.role, one.team].filter(Boolean).join(' · ') || one.cat || '')}</small>${off(one) ? '<span class="tag y">On holiday today</span>' : ''}<div class="msn-pa">${one.phone ? `<a class="mini" href="tel:${esc(one.phone.replace(/[^\d+]/g, ''))}">${svg('M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2')}Call</a>` : ''}${one.email ? `<a class="mini" href="mailto:${esc(one.email)}">${svg('M4 6h16v12H4zM4 7l8 6 8-6')}Email</a>` : ''}</div>${one.phone || one.email ? `<p class="nocap">${[one.phone, one.email].filter(Boolean).map(esc).join('<br>')}</p>` : ''}</div>`
    : '';
  return `<aside class="msn-p" aria-label="People in this chat"><div class="msn-lh"><h1>${cur == SYSTEM ? 'Automatic' : 'People'}</h1><span class="msn-pn" title="People in this chat">${who.length}</span></div>
    ${cur == SYSTEM ? '<p class="msn-pnote">Messages from the CRM itself, such as a holiday being approved. Only you see these.</p>' : ''}
    ${card}<p class="msn-ph">${cur == 'Everyone' ? 'Everyone In The Team Chat' : 'In This Chat'}</p><div class="msn-pl">${who.map(row).join('')}</div>
    <div class="msn-rp"><button type="button" class="btn ghost sm" data-act="bugHere"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>Report A Problem</button></div>
  </aside>`;
}
/** while typing: the send button lights up when there is something to send, and the box grows with the text */
export function msgTyping(el) {
  const b = $('.msn-send');
  if (b) b.classList.toggle('ready', !!el.value.trim());
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 128) + 'px';
}
export function msnAfter() {
  const t = $('#msnT');
  if (t) t.scrollTop = t.scrollHeight;
  const i = $('#m_t');
  if (i && matchMedia('(pointer:fine)').matches) i.focus();
}
export function msgSend() {
  const to = uiState.msg.to || 'Everyone',
    t = SAFE.text($('#m_t').value, 1000);
  if (!t) {
    /* nothing to send: the box gives a little shake and keeps the cursor, so a press is never ignored */
    const box = $('#m_t');
    if (box) {
      box.classList.remove('shake');
      void box.offsetWidth;
      box.classList.add('shake');
      box.focus();
    }
    return;
  }
  if (to == SYSTEM) return;
  if (to != 'Everyone' && !state.staff.some((s) => s.name == to)) {
    toast('Pick who it is for');
    return;
  }
  state.notes = state.notes || [];
  const id = shortId('N');
  state.notes.push({ id, to, by: USER, t, at: Date.now(), read: false, readBy: [] });
  if (state.notes.length > 800) state.notes.splice(0, state.notes.length - 800);
  audit('Message sent', to, '');
  store();
  JUST_SENT = id;
  render();
  /* the "Sent" mark and the flying arrow show once; the next drawing of the page is back to normal */
  setTimeout(() => {
    if (JUST_SENT == id) JUST_SENT = '';
  }, 50);
}
export function msgDel(id) {
  const n = (state.notes || []).find((x) => x.id == id);
  if (!n || !(n.by == USER || n.to == USER)) return;
  askYes(
    'Delete this message?',
    'It is removed for good.',
    'Delete',
    () => {
      const at = state.notes.indexOf(n);
      state.notes = state.notes.filter((x) => x.id != id);
      store();
      render();
      toast('Message deleted', {
        action: {
          label: 'Undo',
          run: () => {
            if (state.notes.some((x) => x.id == n.id)) return;
            state.notes.splice(Math.max(0, at), 0, n);
            store();
            render();
          },
        },
      });
    },
    true
  );
}
/* Enter sends, Shift+Enter makes a new line */
export function msgKey(e) {
  if (e.key == 'Enter' && !e.shiftKey) {
    e.preventDefault();
    msgSend();
  }
}
export function msgNewChat(v) {
  if (v) setUI('msg.to', v);
}
