/* data/state: the app data held in memory. Everything else reads it from here; only replaceState swaps it.
   Kept free of other imports so business rules (src/domain) can be tested without a browser. */

export let state;
/* swap in a newer copy of the data (start-up load, another tab saved, or a backup was restored) */
export function replaceState(n) {
  state = n;
}
