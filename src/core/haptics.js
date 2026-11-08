/* core/haptics: A short buzz on tap for touch phones. */

/* light tap feedback on touch phones: every button, chip, tab and row gives a short buzz (Android; iOS browsers ignore it) */
export const HAPTIC = { light: 8, medium: 14, heavy: 24 };
export function haptic(k) {
  try {
    if (matchMedia('(pointer:coarse)').matches && navigator.vibrate) navigator.vibrate(HAPTIC[k] || HAPTIC.light);
  } catch (e) {}
}
/* start-up step (run once by main.js) */
export function listenForTaps() {
  document.addEventListener(
    'click',
    (e) => {
      const t = e.target.closest('button,a,.chip,.clk-r,.nav,[data-act],[data-row],label,summary');
      if (!t) return;
      haptic(t.matches('.btn.green,.rb1.go,.btn.red,.del') ? 'medium' : 'light');
    },
    true
  );
}
