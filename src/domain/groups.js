/* domain/groups: group chats in Messages. Who is in a group, who runs it, and who may send.
   A group: { id, name, desc, owner, admins: [names], members: [names, owner included], open: true|false,
   muted: [names], timeouts: { name: until (ms) } }. Its messages are notes with to = 'g:' + id.
   The owner and group admins run the group; admins can do everything except act on the owner (or on other admins)
   and delete the group. Plain rules: no screen, no storage. */

export const GROUP = 'g:';
export const isGroupKey = (k) => typeof k == 'string' && k.startsWith(GROUP);
export const groupKey = (g) => GROUP + g.id;
/** the group a chat key points at (undefined for a person, Everyone or System) */
export const groupOf = (groups, key) => (isGroupKey(key) ? (groups || []).find((g) => groupKey(g) == key) : undefined);

export const isMember = (g, who) => !!g && (g.members || []).includes(who);
/** 'owner', 'admin', 'member' or '' (not in the group) */
export const roleIn = (g, who) =>
  !g || !isMember(g, who) ? '' : g.owner == who ? 'owner' : (g.admins || []).includes(who) ? 'admin' : 'member';
export const canManage = (g, who) => ['owner', 'admin'].includes(roleIn(g, who));
/** may `who` remove, mute or time out `target`? Never themselves or the owner; only the owner acts on admins */
export const canActOn = (g, who, target) =>
  canManage(g, who) &&
  who != target &&
  isMember(g, target) &&
  target != g.owner &&
  (roleIn(g, target) != 'admin' || g.owner == who);

export const isMuted = (g, who) => !!g && (g.muted || []).includes(who);
/** when a time out ends (ms), or 0 when there is none running */
export const timedOutUntil = (g, who, now) => {
  const t = +((g && g.timeouts) || {})[who] || 0;
  return t > now ? t : 0;
};
/** why `who` cannot send in the group right now: '' when they can, else 'out', 'muted' or 'timeout' */
export const sendBlock = (g, who, now) =>
  !isMember(g, who) ? 'out' : isMuted(g, who) ? 'muted' : timedOutUntil(g, who, now) ? 'timeout' : '';

/** the time-out lengths the owner and admins can pick: [key, ms, label] */
export const TIMEOUTS = [
  ['15m', 15 * 60e3, '15 minutes'],
  ['1h', 3600e3, '1 hour'],
  ['1d', 864e5, '1 day'],
  ['1w', 6048e5, '1 week'],
];

export const myGroups = (groups, who) => (groups || []).filter((g) => isMember(g, who));
/** open groups someone is not in yet (they can join them) */
export const joinable = (groups, who) => (groups || []).filter((g) => g.open && !isMember(g, who));

/** take someone out of the group (removed or leaving), with any admin role, mute or time out they had */
export function dropMember(g, who) {
  g.members = (g.members || []).filter((x) => x != who);
  g.admins = (g.admins || []).filter((x) => x != who);
  g.muted = (g.muted || []).filter((x) => x != who);
  if (g.timeouts) delete g.timeouts[who];
  return g;
}
/** someone leaves. When the owner leaves, a group admin takes over, else the next person in the group;
    returns false when nobody is left (the group should then be deleted) */
export function leaveGroup(g, who) {
  const wasOwner = g.owner == who;
  dropMember(g, who);
  if (!g.members.length) return false;
  if (wasOwner) {
    g.owner = g.admins[0] || g.members[0];
    g.admins = g.admins.filter((x) => x != g.owner);
  }
  return true;
}
