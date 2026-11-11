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
  const chats = ['Everyone', ...people]
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
    `<span class="mav ${n == 'Everyone' ? 'all' : ''}">${n == 'Everyone' ? '★' : esc(initials(n))}</span>`;
  let lastDay = '';
  return `<div class="msn"><aside class="msn-l"><div class="msn-lh"><h1>Chats</h1><select aria-label="New chat" data-onchange="msgNewChat" data-args-change="[{&quot;$&quot;:&quot;value&quot;}]"><option value="">+ New chat</option>${people.map((p) => `<option>${esc(p)}</option>`).join('')}</select></div>
   <div class="msn-list">${chats.map((c) => `<button class="msn-c ${c.w == cur ? 'on' : ''} ${c.un ? 'un' : ''}" ${onClick('setUI', 'msg.to', c.w)}>${av(c.w)}<span class="msn-ct"><b>${esc(c.w == 'Everyone' ? 'Everyone (team chat)' : c.w)}</b><small>${c.last ? esc((c.last.by == me2 ? 'You: ' : c.w == 'Everyone' ? c.last.by.split(' ')[0] + ': ' : '') + c.last.t) : 'No messages yet'}</small></span><span class="msn-m">${c.last ? ago(c.last.at) : ''}${c.un ? `<i>${c.un}</i>` : ''}</span></button>`).join('')}</div><div class="msn-rp"><button type="button" class="btn ghost sm" data-act="bugHere"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>Report A Problem</button></div></aside>
   <section class="msn-r"><header class="msn-h">${av(cur)}<div><b>${esc(cur == 'Everyone' ? 'Everyone' : cur)}</b><small>${cur == 'Everyone' ? 'Messages here go to the whole team' : esc((state.staff.find((s) => s.name == cur) || {}).role || '')}</small></div></header>
    <div class="msn-t" id="msnT">${
      L.map((n) => {
        const d = new Date(n.at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
          sep = d != lastDay ? ((lastDay = d), `<div class="msn-day">${d}</div>`) : '',
          mine = n.by == me2;
        return (
          sep +
          `<div class="bub ${mine ? 'me' : ''}">${!mine && cur == 'Everyone' ? `<small class="bub-n">${esc(n.by)}</small>` : ''}<p>${esc(n.t)}</p><span class="bub-t">${new Date(n.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}${mine ? `<button class="bub-x" title="Delete" aria-label="Delete message" ${onClick('msgDel', n.id)}>&times;</button>` : ''}</span></div>`
        );
      }).join('') ||
      `<div class="msn-empty">${emptyArt('team', '')}</div>`
    }</div>
    <div class="msn-in"><textarea id="m_t" rows="1" maxlength="1000" placeholder="Aa" aria-label="Message" data-onkeydown="msgKey" data-args-keydown="[{&quot;$&quot;:&quot;event&quot;}]"></textarea><button class="msn-send" data-act="msgSend" aria-label="Send">${svg('M4 12l16-8-6 16-3-7z')}</button></div></section></div>`;
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
  if (to != 'Everyone' && !state.staff.some((s) => s.name == to)) {
    toast('Pick who it is for');
    return;
  }
  state.notes = state.notes || [];
  state.notes.push({ id: shortId('N'), to, by: USER, t, at: Date.now(), read: false, readBy: [] });
  if (state.notes.length > 800) state.notes.splice(0, state.notes.length - 800);
  audit('Message sent', to, '');
  store();
  render();
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
