/* domain/permissions: the one place that decides what the signed-in account may do.
   Call can() inside every action, not only to hide buttons. A backend will check the same permission names. */
import { PERMISSIONS, ROLES } from '../config/roles.js';
import { ROLE } from '../data/session.js';

/** may this account do it? e.g. can('money') */
export const can = (what, role = ROLE) => (PERMISSIONS[what] || []).includes(role);

/** may this account open the page? */
export const canSee = (view, role = ROLE) => {
  const v = (ROLES[role] || ROLES.staff).v;
  return v == '*' || v.includes(view);
};
