/* ui/components/kpi: Number cards that count up. */
import { $$ } from '../../core/dom.js';

/* numbers in the tiles count up when a page opens */
export function countUp() {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  $$('#main .kpi>b').forEach((el) => {
    const t = el.textContent,
      m = t.match(/[\d,]+(\.\d+)?/);
    if (!m || t.length > 14) return;
    const n = parseFloat(m[0].replace(/,/g, '')),
      dp = (m[1] || '').length - 1,
      a = t.slice(0, m.index),
      b = t.slice(m.index + m[0].length),
      cm = m[0].includes(','),
      t0 = performance.now();
    if (!(n > 0)) return;
    const f = (x) => {
      const p = Math.min(1, (x - t0) / 800),
        v = n * (1 - Math.pow(1 - p, 3)),
        s = dp > 0 ? v.toFixed(dp) : Math.round(v);
      el.textContent =
        a +
        (cm
          ? Number(s).toLocaleString('en-GB', {
              minimumFractionDigits: Math.max(0, dp),
              maximumFractionDigits: Math.max(0, dp),
            })
          : s) +
        b;
      if (p < 1) requestAnimationFrame(f);
      else el.textContent = t;
    };
    requestAnimationFrame(f);
  });
}
