/* core/dom: Finding elements and escaping text for HTML. */

/* ==========================================================================
   01 · Core helpers: DOM, formatting, dates, validation & escaping
   ========================================================================== */
export const $ = (s) => document.querySelector(s);
export const $$ = (s) => [...document.querySelectorAll(s)];
/* ---- escaping (every piece of data that reaches innerHTML goes through esc) ---- */
export const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
