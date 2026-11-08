/* domain/people: Staff, salespeople and fitters: who is who, and renaming someone everywhere. */
import { FIT } from '../config/constants.js';
import { isWk } from '../core/dates.js';
import { state } from '../data/state.js';

export const me = () =>
  (window.SSO && SSO.sid && state.staff.find((s) => s.id == SSO.sid)) ||
  (!window.SSO && state.staff.find((s) => s.id == state.profile.sid)) ||
  state.staff.find((s) => s.name == USER);
export const staffIn = (c) => state.staff.filter((s) => s.cat == c).map((s) => s.name);
export const RANDOM_SP = 'Pick at random';
/* 'Pick at random' stays chosen until the record is saved, then a real salesperson is appointed */
export const spResolve = (v) => {
  if (v !== RANDOM_SP) return v;
  const L = OWNERS().filter((x) => x != 'Unassigned');
  return L[Math.floor(Math.random() * L.length)] || 'Unassigned';
};
export const OWNERS = () => {
  const s = staffIn('Salespeople');
  return ['Unassigned', ...new Set(s.length ? s : state.staff.map((x) => x.name))];
};
export const FITL = () => [...new Set([...staffIn('Fitters'), ...FIT])];
export const forPerson = (s, f) =>
  String(f || '')
    .split(/,\s*/)
    .some((x) => x && (x == s.name || (s.team && x == s.team)));
export const jobsOf = (s) => state.contracts.filter((c) => c.stage != 'Complete' && forPerson(s, c.fitter));
export const callsOf = (s) => state.calls.filter((c) => c.status != 'Complete' && forPerson(s, c.fitter));
export const holOn = (sid, k) =>
  state.hols.find((h) => h.sid == sid && h.status != 'Rejected' && h.from <= k && h.to >= k && isWk(k));
export const staffName = (id) => (state.staff.find((s) => s.id == id) || { name: 'Unknown' }).name;
/* a person's name is stored on jobs, leads, stock movements and messages: keep them all pointing at the new name */
export function renamePerson(o, n) {
  if (!o || !n || o == n) return;
  if (state.dash && state.dash[o]) {
    state.dash[n] = state.dash[o];
    delete state.dash[o];
  }
  state.items.forEach((r) => {
    if (r.user == o) r.user = n;
  });
  (state.notes || []).forEach((x) => {
    if (x.to == o) x.to = n;
    if (x.by == o) x.by = n;
  });
  state.leads.forEach((l) => {
    if (l.owner == o) l.owner = n;
    if (l.takenBy == o) l.takenBy = n;
  });
  state.contracts.forEach((c) => {
    if (c.soldBy == o) c.soldBy = n;
    if (c.fitter)
      c.fitter = String(c.fitter)
        .split(/,\s*/)
        .map((x) => (x == o ? n : x))
        .join(', ');
    for (let i = 1; i <= 6; i++) if (c['fitter' + i] == o) c['fitter' + i] = n;
    if (c.surveyor == o) c.surveyor = n;
    if (c.installMgr == o) c.installMgr = n;
  });
  state.calls.forEach((c) => {
    if (c.fitter == o) c.fitter = n;
    if (c.takenBy == o) c.takenBy = n;
  });
}
export const staffNames = () => ['', ...new Set(state.staff.map((s) => s.name))];
