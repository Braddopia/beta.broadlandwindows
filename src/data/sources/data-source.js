/* data/sources/data-source: where the app's data physically lives, behind one small interface.

   Today: the browser's own database (indexeddb-source.js), holding the whole app data as one saved copy.
   Later: a Microsoft 365 backend (api-source.js) can take its place without the pages changing,
   because the rest of the app only talks to `source` through these methods.

   @typedef {object} DataSource
   @property {string} name                                     shown in Admin Console
   @property {() => Promise<string|null>} readAll              the whole saved copy (JSON text), or null
   @property {(json: string) => void} saveAll                  save the whole copy (errors are reported as 'notice' events)
   @property {(onChange: (json: string|null) => void) => () => void} subscribe
             called when another tab or user saved; json is the new copy when it came with the message,
             null when it must be read again with readAll. Returns a function that stops listening.
   @property {(pairs: Array<[string, string]>) => Promise<void>} putPhotos   store photos by id
   @property {(ids: string[]) => Promise<Record<string, string>>} getPhotos  read photos by id
   @property {(used: Set<string>) => Promise<number>} removePhotosExcept  delete photos no record uses; resolves to how many
   @property {(json: string) => Promise<void>} replaceAll      write a restored backup over the saved copy
   @property {() => number} savedSize                          size of the last save, in characters
*/
import { indexedDbSource } from './indexeddb-source.js';

/** the data source in use (only setSource changes it) */
export let source = indexedDbSource;

/** switch to another data source, e.g. the backend once it exists */
export function setSource(s) {
  source = s;
}
