/* domain/chat-commands: the "/" commands typed in the Messages box. Plain rules: which commands exist, who may use
   them where, reading what was typed, and finding the person meant. The page carries them out
   (features/messages/commands.js). */

/** [name, what to type after it, what it does, where: 'any' | 'group' | 'manage' (group owner and admins)] */
export const COMMANDS = [
  ['nickname', 'name', 'Set your nickname (in a group, just for that group). /nickname on its own clears it', 'any'],
  ['me', 'does something', 'Send an action line: "* Ann is on her way"', 'any'],
  ['shrug', 'message', 'Send a message with ¯\\_(ツ)_/¯ on the end', 'any'],
  ['help', '', 'Show these commands', 'any'],
  ['leave', '', 'Leave this group', 'group'],
  ['add', 'name', 'Add someone to the group', 'manage'],
  ['remove', 'name', 'Remove someone from the group', 'manage'],
  ['mute', 'name', 'Mute someone (they can read but not send)', 'manage'],
  ['unmute', 'name', 'Let a muted person send again', 'manage'],
  ['timeout', 'name 15m | 1h | 1d | 1w', 'Time someone out for a while', 'manage'],
  ['setnick', 'name nickname', "Set someone's nickname in this group; just the name clears it", 'manage'],
  ['admin', 'name', 'Make someone a group admin (owner only)', 'manage'],
  ['unadmin', 'name', 'Stop someone being a group admin (owner only)', 'manage'],
  ['rename', 'new name', 'Rename the group', 'manage'],
  ['desc', 'text', "Change the group's description", 'manage'],
];

/** the commands someone can use here: inGroup (the open chat is a group), manager (they run it) */
export const commandsFor = (inGroup, manager) =>
  COMMANDS.filter(
    ([, , , where]) => where == 'any' || (inGroup && where == 'group') || (inGroup && manager && where == 'manage')
  );

/** '/timeout Fitter B 1h' -> { cmd: 'timeout', rest: 'Fitter B 1h' }; null when the text is not a command */
export function parseCommand(text) {
  const m = /^\/([a-z]+)(?:\s+([\s\S]*))?$/i.exec(String(text || '').trim());
  return m ? { cmd: m[1].toLowerCase(), rest: (m[2] || '').trim() } : null;
}

/** the one person meant by what was typed: an exact name, else the only name starting with it (any case);
    '' when nobody or more than one person matches */
export function findPerson(typed, names) {
  const t = String(typed || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
  if (!t) return '';
  const exact = names.find((n) => n.toLowerCase() == t);
  if (exact) return exact;
  const starts = names.filter((n) => n.toLowerCase().startsWith(t));
  return starts.length == 1 ? starts[0] : '';
}

/** the time out at the end of '/timeout Fitter B 1h': { who: 'Fitter B', len: '1h' }; len '' when missing */
export function splitTimeout(rest) {
  const m = /^(.*?)\s+(15m|1h|1d|1w)$/i.exec(String(rest || '').trim());
  return m ? { who: m[1].trim(), len: m[2].toLowerCase() } : { who: String(rest || '').trim(), len: '' };
}

/** '/setnick Fitter B Big Al' -> { who: 'Fitter B', rest: 'Big Al' }: the longest run of words at the start that
    names one person; who is '' when no start of it names anyone */
export function splitPerson(text, names) {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  for (let n = words.length; n > 0; n--) {
    const who = findPerson(words.slice(0, n).join(' '), names);
    if (who) return { who, rest: words.slice(n).join(' ') };
  }
  return { who: '', rest: '' };
}
