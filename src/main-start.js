/* main-start: The last start-up step: first draw of the page and background syncs. */
import { ssoBoot } from './features/sign-in/sign-in.js';
import { tourBoot } from './features/tour/tour.js';
import { seedHM, syncHM } from './integrations/hallmark.js';
import { render } from './ui/shell/router.js';

/* ==========================================================================
   99 · Start-up
   ========================================================================== */
export function boot() {
  seedHM();
  ssoBoot();
  render();
  if (!document.body.classList.contains('gated')) tourBoot();
  document.body.classList.add('ready');
  setTimeout(() => document.body.classList.remove('ready'), 2000);
  setTimeout(() => syncHM(true), 1500);
  setInterval(() => syncHM(true), 600000);
}
