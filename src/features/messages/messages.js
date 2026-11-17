/* features/messages/messages: Messages between staff. */
import { onClick } from '../../core/actions.js';
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
  return `<div class="msn"><aside class="msn-l"><div class="msn-lh"><h1>Chats</h1><select aria-label="New chat" data-onchange="msgNewChat" data-args-change="[{&quot;$&quot;:&quot;value&quot;}]"><option value="">+ New chat</option>${people.map((p) => `<option>${esc(p)}</option>`).join('')}</select></div>
   <div class="msn-list">${chats.map((c) => `<button class="msn-c ${c.w == cur ? 'on' : ''} ${c.un ? 'un' : ''}" ${onClick('setUI', 'msg.to', c.w)}>${av(c.w)}<span class="msn-ct"><b>${esc(c.w == 'Everyone' ? 'Everyone (team chat)' : c.w)}</b><small>${c.last ? esc((c.last.by == me2 ? 'You: ' : c.w == 'Everyone' ? c.last.by.split(' ')[0] + ': ' : '') + c.last.t) : 'No messages yet'}</small></span><span class="msn-m">${c.last ? ago(c.last.at) : ''}${c.un ? `<i>${c.un}</i>` : ''}</span></button>`).join('')}</div><div class="msn-rp"><button type="button" class="btn ghost sm" data-act="bugHere"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>Report A Problem</button></div></aside>
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
    ${cur == SYSTEM ? '<div class="msn-in msn-sys"><span class="muted">These are automatic messages. Replies are not read.</span></div>' : `<div class="msn-in"><textarea id="m_t" rows="1" maxlength="1000" placeholder="Aa" aria-label="Message" data-onkeydown="msgKey" data-args-keydown="[{&quot;$&quot;:&quot;event&quot;}]" data-oninput="msgTyping" data-args-input="[{&quot;$&quot;:&quot;this&quot;}]"></textarea><button class="msn-send ${JUST_SENT ? 'flew' : ''}" data-act="msgSend" aria-label="Send" title="Send (Enter)">${svg('M4 12l16-8-6 16-3-7z')}</button></div>`}</section>${peopleH(cur, me2)}</div>`;
}
/* the message just sent: its bubble pops in with "Sent", and the send button's arrow flies off once */
let JUST_SENT = '';
/** the people panel on the right: who is in the chat that is open (the whole team for Everyone), each with their
    job and whether they are on holiday today; click someone to message them on their own */
function peopleH(cur, me2) {
  const td = new Date().toISOString().slice(0, 10),
    off = (s) => state.hols.some((h) => h.sid == s.id && h.status == 'Approved' && h.from <= td && h.to >= td),
    S = state.staff.filter((s) => s.name),
    who =
      cur == 'Everyone'
        ? S.slice().sort((a, b) => (a.name == me2 ? -1 : b.name == me2 ? 1 : a.name.localeCompare(b.name)))
        : cur == SYSTEM
          ? S.filter((s) => s.name == me2)
          : S.filter((s) => s.name == cur || s.name == me2).sort((a) => (a.name == me2 ? 1 : -1)),
    one = cur != 'Everyone' && cur != SYSTEM ? S.find((s) => s.name == cur) : null;
  const row = (s) => {
    const you = s.name == me2,
      away = off(s);
    return `<button type="button" class="msn-pp ${you ? 'you' : ''}" ${you || s.name == cur ? 'disabled' : onClick('setUI', 'msg.to', s.name)} title="${you ? 'You' : s.name == cur ? 'This chat' : 'Message ' + esc(s.name)}"><span class="mav sm">${esc(initials(s.name))}${away ? '<i class="away" title="On holiday today"></i>' : ''}</span><span class="msn-ct"><b>${esc(s.name)}${you ? ' <small>(You)</small>' : ''}</b><small>${away ? 'On holiday today' : esc(s.role || s.cat || '')}</small></span></button>`;
  };
  return `<aside class="msn-p" aria-label="People in this chat"><h2>${cur == 'Everyone' ? 'Everyone In This Chat' : cur == SYSTEM ? 'Automatic Messages' : 'In This Chat'} <span class="msn-pn">${who.length}</span></h2>
    <div class="msn-pl">${who.map(row).join('')}</div>
    ${one && (one.phone || one.email) ? `<div class="msn-pc"><h3>Contact ${esc(one.name.split(' ')[0])}</h3>${one.phone ? `<a href="tel:${esc(one.phone)}">${svg('M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z')}${esc(one.phone)}</a>` : ''}${one.email ? `<a href="mailto:${esc(one.email)}">${svg('M4 4h16v16H4zM4 6l8 7 8-7')}${esc(one.email)}</a>` : ''}</div>` : ''}
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
      state.notes = state.notes.filter((x) => x.id != id);
      store();
      render();
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
