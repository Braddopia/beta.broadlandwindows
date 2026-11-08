/* ui/shell/theme: Light and dark mode. */
import { LOGO_SRC } from '../../core/assets.js';
import { $, $$ } from '../../core/dom.js';
import { ICONS, svg } from '../../core/icons.js';

export function setTh(t) {
  document.body.dataset.theme = t;
  try {
    localStorage.setItem('bb_theme', t);
  } catch (e) {}
  $('#thb').innerHTML = svg(t == 'dark' ? ICONS.sun : ICONS.moon);
  $$('.lg-auto').forEach((i) => (i.src = t == 'dark' ? LOGO_SRC.textWhite : LOGO_SRC.textBlue));
}
