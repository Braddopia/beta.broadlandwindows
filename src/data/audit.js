/* data/audit: The audit trail: who changed what, and when. */
import { MAX_LOG } from '../config/constants.js';
import { SAFE } from './sanitize.js';
import { state } from './state.js';
import { ROLE } from './session.js';

/* ---- audit trail: who changed what, when ---- */
export function audit(action, target, detail) {
  state.audit.unshift({
    at: Date.now(),
    by: USER,
    role: ROLE,
    a: SAFE.text(action, 60),
    t: SAFE.text(target, 80),
    d: SAFE.text(detail, 240),
  });
  if (state.audit.length > MAX_LOG) state.audit.length = MAX_LOG;
}
