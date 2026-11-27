/* ui/shell/data-events: how the screen answers the data layer's messages (see core/events.js). */
import { $ } from '../../core/dom.js';
import { on } from '../../core/events.js';
import { setBusyCheck } from '../../data/sync.js';
import { tmpDraw } from '../forms/photos.js';
import { toast } from '../toast.js';
import { render } from './router.js';

/* start-up step (run once by main.js, before the data is loaded) */
export function connectDataToScreen() {
  on('notice', (text) => toast(text));
  on('data-replaced', () => render());
  /* the desktop app (or a tab) is on an older version than the one just published: offer to reload */
  on('update-ready', () =>
    toast('The CRM has been updated: reload to see the new version', {
      action: { label: 'Reload', run: () => location.reload() },
    })
  );
  on('photos-loaded', () => {
    try {
      if ($('#modal.open') && typeof tmpDraw == 'function' && tmpDraw) tmpDraw();
    } catch (e) {}
    try {
      render(true);
    } catch (e) {}
  });
  /* a newer copy from another tab waits while a popup is open */
  setBusyCheck(() => !!$('.ov.open'));
}
