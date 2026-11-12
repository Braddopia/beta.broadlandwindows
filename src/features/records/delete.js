/* features/records/delete: Deleting records, with a permission check for each kind. */
import { $ } from '../../core/dom.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { need } from '../auth/session.js';
import { recordWin } from './record-window.js';
import { askYes, closeModal } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import * as repos from '../../data/repository.js';

/* deleting is admin-only, and only for these lists (service calls: anyone; a null permission means every account) */
export const DEL_RULE = {
  contracts: ['manage', 'Deleting contracts'],
  staff: ['manage', 'Removing staff'],
  calls: [null, 'Deleting service calls'],
  contacts: ['manage', 'Deleting contacts'],
  fin: ['money', 'Deleting bills'],
};
export function del(k, id) {
  const r = DEL_RULE[k];
  if (!r || !Array.isArray(state[k]) || (r[0] && !need(r[0], r[1]))) return;
  askYes(
    'Delete ' + id + '?',
    'This cannot be undone.',
    'Delete',
    () => {
      state[k] = state[k].filter((x) => x.id != id);
      if (k == 'staff') {
        repos.holidays.remove((h) => h.sid == id);
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
