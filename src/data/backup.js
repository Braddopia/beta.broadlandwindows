/* data/backup: Downloading and restoring a full backup. */
import { KEY } from '../config/constants.js';
import { today } from '../core/dates.js';
import { download } from '../core/download.js';
import { audit } from './audit.js';
import { sdb, store } from './persistence.js';
import { PHC, phIsRef, phLoad, phRefs } from './photos.js';
import { state } from './state.js';
import { ISOWN, need } from '../features/auth/session.js';
import { askIn } from '../ui/modal.js';
import { toast } from '../ui/toast.js';

export function backupDl() {
  if (!need(ISOWN, 'Backups')) return;
  audit('Backup downloaded', 'All data', '');
  store();
  toast('Getting the backup ready');
  phLoad(phRefs()).then(() => {
    download(
      'broadland-crm-backup-' + today() + '.json',
      new Blob([JSON.stringify(state, (k, v) => (typeof v == 'string' && phIsRef(v) ? PHC.get(v.slice(3)) || v : v))], {
        type: 'application/json',
      })
    );
    toast('Backup downloaded. Keep it somewhere safe: it contains customer and staff details.');
  });
}
export function backupLoad(inp) {
  if (!need(ISOWN, 'Restoring backups')) return;
  const f = inp.files[0];
  inp.value = '';
  if (!f) return;
  if (f.size > 20e6) {
    toast('That file is too large');
    return;
  }
  f.text().then((t) => {
    let n;
    try {
      n = JSON.parse(t);
    } catch (e) {
      toast('That is not a valid backup file');
      return;
    }
    const ok =
      n && typeof n == 'object' && ['items', 'leads', 'contracts', 'calls', 'staff'].every((k) => Array.isArray(n[k]));
    if (!ok) {
      toast('That file is not a Broadland CRM backup');
      return;
    }
    askIn(
      'Replace all data with this backup?',
      'Your current data is kept as a safety copy in this browser.',
      'Replace',
      () => backupApply(n),
      true
    );
  });
}
export function backupApply(n) {
  if (!need(ISOWN, 'Restoring backups')) return;
  {
    try {
      localStorage.setItem(KEY + '_before_restore', JSON.stringify(state));
    } catch (e) {}
    n.sec = state.sec;
    delete n.__proto__;
    delete n.constructor; /* a backup never brings its own PINs */
    try {
      const j = JSON.stringify(n);
      sdb()
        .then((d) => {
          const t = d.transaction('s', 'readwrite');
          t.objectStore('s').put(j, KEY);
          t.oncomplete = () => {
            try {
              localStorage.removeItem(KEY);
            } catch (e) {}
            location.reload();
          };
        })
        .catch(() => toast('Could not restore here'));
    } catch (e) {
      toast('Could not restore here');
    }
  }
}
