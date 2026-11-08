/* core/html: safe HTML building.

   html`<b>${name}</b>`   every ${value} is escaped automatically (text, numbers, arrays of either).
   raw(markup)            marks markup you built yourself as already safe, so html`` won't escape it.
   Both return a plain string-like value; String(x) or `${x}` gives the HTML text.

   Use html`` for new markup: forgetting to escape becomes impossible rather than easy. */
import { esc } from './dom.js';

class SafeHtml {
  constructor(text) {
    this.text = text;
  }
  toString() {
    return this.text;
  }
}

/** trust this markup as-is (only for HTML the app built itself, never for typed-in text) */
export const raw = (markup) => new SafeHtml(String(markup ?? ''));

const part = (v) =>
  v == null || v === false ? '' : v instanceof SafeHtml ? v.text : Array.isArray(v) ? v.map(part).join('') : esc(v);

/** tagged template: escapes every interpolated value unless it is raw() or another html`` result */
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => {
    out += part(v) + strings[i + 1];
  });
  return new SafeHtml(out);
}
