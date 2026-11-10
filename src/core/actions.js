/* core/actions: Buttons and boxes name the action they run in data attributes; one listener per event type runs it. */
import { esc } from './dom.js';

/* Safe inline handler: A('openContract',id) -> data-act="openContract" data-args="[&quot;1023421&quot;]".
   Arguments are JSON-encoded then HTML-escaped, so names/ids containing quotes can't break out. */
/* click anywhere on a row or card to open it (buttons, links and boxes inside keep their own job) */
/* ---- actions: markup names the function to run in data attributes, and one listener per event type
   runs it. No inline code in the page, so a strict Content-Security-Policy works.
     A('fn',a,b)            click            -> data-act="fn" data-args="[a,b]"
     AC('onchange','fn',x)  change/input/... -> data-onchange="fn" data-args-change="[x]"
                            'this', 'this.value', 'this.checked' and 'event' are passed as the element, its value, ...
     RC('fn',a)             whole row/card is clickable (clicks on buttons/links inside it are left alone)
   Handlers are looked up in ACTIONS (filled by main.js and registerAction()). ---- */
export const ACTIONS = Object.create(null),
  ACT_TOK = {
    this: { $: 'this' },
    'this.value': { $: 'value' },
    'this.checked': { $: 'checked' },
    event: { $: 'event' },
  };
export const actJson = (a, tok) =>
  esc(
    JSON.stringify(a.map((x) => (x === undefined ? null : tok && typeof x == 'string' && ACT_TOK[x] ? ACT_TOK[x] : x)))
  );
export const onClick = (fn, ...a) => `data-act="${esc(fn)}"${a.length ? ` data-args="${actJson(a)}"` : ''}`;
export const onEvent = (ev, fn, ...a) => {
  const t = String(ev).replace(/^on/, '');
  return `data-on${t}="${esc(fn)}"${a.length ? ` data-args-${t}="${actJson(a, 1)}"` : ''}`;
};
export const rowClick = (fn, ...a) =>
  `tabindex="0" data-rc="1" data-row="${esc(fn)}"${a.length ? ` data-args-row="${actJson(a)}"` : ''}`;
export function registerAction(name, fn) {
  ACTIONS[name] = fn;
}
/* only functions registered as actions can run (main.js registers every exported function) */
export function actFind(name) {
  return Object.prototype.hasOwnProperty.call(ACTIONS, name) ? ACTIONS[name] : null;
}
export function actRun(name, args) {
  const f = actFind(name);
  if (!f) {
    console.warn('No action called ' + name);
    return;
  }
  return f(...(args || []));
}
export function actArgs(el, attr, ev) {
  let a = [];
  try {
    a = JSON.parse(el.getAttribute(attr) || '[]');
  } catch (e) {}
  return a.map((x) =>
    x && typeof x == 'object' && !Array.isArray(x) && typeof x.$ == 'string' && Object.keys(x).length == 1
      ? x.$ == 'this'
        ? el
        : x.$ == 'value'
          ? el.value
          : x.$ == 'checked'
            ? el.checked
            : x.$ == 'event'
              ? ev
              : null
      : x
  );
}
/* start-up step (run once by main.js) */
export function listenForActions() {
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const el = t.closest('[data-act]');
    if (el) {
      if (el.dataset.stop) e.stopImmediatePropagation();
      actRun(el.dataset.act, actArgs(el, 'data-args', e));
      return;
    }
    const row = t.closest('[data-row]');
    if (!row) return;
    const hit = t.closest('button,a,input,select,textarea,label,summary,[data-norow]');
    if (hit && hit !== row && row.contains(hit)) return;
    actRun(row.dataset.row, actArgs(row, 'data-args-row', e));
  });
  ['change', 'input', 'keydown'].forEach((type) =>
    document.addEventListener(type, (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const el = t.closest('[data-on' + type + ']');
      if (el) actRun(el.getAttribute('data-on' + type), actArgs(el, 'data-args-' + type, e));
    })
  );
  document.addEventListener(
    'error',
    (e) => {
      const el = e.target;
      if (el instanceof Element && el.hasAttribute('data-onerror'))
        actRun(el.getAttribute('data-onerror'), actArgs(el, 'data-args-error', e));
    },
    true
  );
}
