/* core/events: a tiny message board so lower layers can say "something happened" without importing the UI.
   on('notice', fn) listens; emit('notice', 'Saved') tells every listener. */

const listeners = {};

/** listen for an event; returns a function that stops listening */
export function on(name, fn) {
  (listeners[name] = listeners[name] || []).push(fn);
  return () => {
    listeners[name] = listeners[name].filter((f) => f !== fn);
  };
}

/** tell every listener; one failing listener never stops the others */
export function emit(name, ...args) {
  for (const fn of (listeners[name] || []).slice()) {
    try {
      fn(...args);
    } catch (e) {
      console.error(e);
    }
  }
}
