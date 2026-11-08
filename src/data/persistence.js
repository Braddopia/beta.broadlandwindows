/* data/persistence: saving. store() writes the app data through the data source (data/sources).
   New photos go to the photo store first, so the main save stays small. */
import { emit } from '../core/events.js';
import { phBack, phOut, phPutMany, photosOff } from './photos.js';
import { source } from './sources/data-source.js';
import { state } from './state.js';

/** save everything now (call after every change; record the change with audit() too) */
export function store() {
  try {
    delete state._saved;
    state._saved = Date.now();
    const N = phOut();
    if (!N.length) {
      source.saveAll(JSON.stringify(state));
      return;
    }
    /* new photos go to the photo store first; if that fails they stay inside the record */
    phPutMany(N).then(
      () => source.saveAll(JSON.stringify(state)),
      () => {
        photosOff();
        phBack(N);
        source.saveAll(JSON.stringify(state));
      }
    );
  } catch (e) {
    emit('notice', 'Could not save: ' + e.message);
  }
}

/** size of the last save in characters (Admin Console shows it) */
export const savedSize = () => source.savedSize();

/* start-up step (run once by main.js) */
export function askBrowserToKeepData() {
  /* ask the browser to keep the data even when the disk is low */
  try {
    navigator.storage && navigator.storage.persist && navigator.storage.persist();
  } catch (e) {}
}
