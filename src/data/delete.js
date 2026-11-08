/* data/delete: Deleting records, with a permission check for each kind. */
import { $ } from '../core/dom.js';
import { audit } from './audit.js';
import { store } from './persistence.js';
import { state } from './state.js';
import { ISADM, ISOWN, need } from '../features/auth/session.js';
import { recordWin } from '../features/records/record-window.js';
import { askYes, closeModal } from '../ui/modal.js';
import { render } from '../ui/shell/router.js';

/* deleting is admin-only, and only for these lists */
export const DEL_RULE = {
  contracts: [ISOWN, 'Deleting contracts'],
  staff: [ISOWN, 'Removing staff'],
  calls: [ISOWN, 'Deleting service calls'],
  contacts: [ISOWN, 'Deleting contacts'],
  fin: [ISADM, 'Deleting bills'],
};
export function del(k, id) {
  const r = DEL_RULE[k];
  if (!r || !Array.isArray(state[k]) || !need(r[0], r[1])) return;
  askYes(
    'Delete ' + id + '?',
    'This cannot be undone.',
    'Delete',
    () => {
      state[k] = state[k].filter((x) => x.id != id);
      if (k == 'staff') {
        state.hols = state.hols.filter((h) => h.sid != id);
        if (state.abs) delete state.abs[id];
      }
      audit('Deleted', k + ' ' + id, '');
      store();
      render();
      if (typeof recordWin != 'undefined' && recordWin && String(recordWin.id) == String(id) && $('#mbox .rw')) {
        recordWin.dirty = 0;
        closeModal();
      }
    },
    true
  );
}
