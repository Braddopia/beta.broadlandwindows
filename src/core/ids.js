/* core/ids: Unique ids. */

export const uuid = () =>
  window.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c == 'x' ? r : (r & 3) | 8).toString(16);
      });
export const shortId = (p) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
