/* ui/forms/fields: the one place that draws the box for a form field (text, number, date, select,
   text area, colour). Every form in the app uses it, so a rule changed here changes everywhere.

   A field is described as { k: key, l: label, t: type, o: options, max, min, rows, ro, adm, list, ph }.
   Select options are plain values, or [value, label] pairs. */
import { html, raw } from '../../core/html.js';
import { ISADM } from '../../features/auth/session.js';
import { colourField } from './colour-picker.js';

/* boxes for links and emails keep their lower case (the site title-cases everything else) */
const keepsCase = (f) => f.t == 'email' || /url|web|portal|feed|link/i.test(f.k);
const when = (test, markup) => raw(test ? String(markup) : '');

/** options: id (default f_<key>), rows (text areas, default 3), lockedAsText (admin-only/read-only shown as plain text box) */
export function fieldControl(f, value, { id = 'f_' + f.k, rows = 3, lockedAsText = false } = {}) {
  const val = value ?? '';
  if (lockedAsText && (f.ro || (f.adm && !ISADM())))
    return String(html`<input id="${id}" value="${val}" readonly tabindex="-1">`);
  if (f.t == 'colour') return colourField(f, { [f.k]: val });
  if (f.t == 'select') {
    const has = f.o.some((o) => String(Array.isArray(o) ? o[0] : o) == String(val));
    const opts = (val !== '' && !has ? [val, ...f.o] : f.o).map((o) => {
      const [v, label] = Array.isArray(o) ? o : [o, o || '-'];
      return html`<option value="${v}"${when(String(v) == String(val), ' selected')}>${label}</option>`;
    });
    return String(html`<select id="${id}"${when(f.ro, ' disabled')}>${opts}</select>`);
  }
  if (f.t == 'area')
    return String(html`<textarea id="${id}" rows="${f.rows || rows}" maxlength="${f.max || 2000}">${val}</textarea>`);
  const size =
    f.t == 'number'
      ? html` step="any" min="${f.min ?? 0}"${when(f.max, html` max="${f.max}"`)} inputmode="decimal"`
      : html` maxlength="${f.max || 120}"`;
  return String(
    html`<input id="${id}" type="${f.t || 'text'}"${size} value="${val}"${when(f.ro, ' readonly')}${when(f.list, html` list="${f.list}"`)}${when(f.ph, html` placeholder="${f.ph}"`)}${when(keepsCase(f), ' class="nocap"')} autocomplete="off">`
  );
}
