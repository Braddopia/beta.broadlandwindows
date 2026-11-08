/* data/sanitize: Cleaning anything typed in before it is stored (text, numbers, dates, emails, links, images). */
import { PHC, PH_BLANK, PH_OK, phIsRef, phWant } from './photos.js';

/* ---- validation / sanitising ---- */
export const SAFE = {
  hex: (v) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? v : '#c9c6bd'),
  img: (v) => {
    v = String(v || '');
    if (phIsRef(v)) {
      const id = v.slice(3),
        c = PHC.get(id);
      if (c) return c;
      phWant(id);
      return PH_BLANK;
    }
    return PH_OK(v) ? v : '';
  },
  url: (v) => {
    try {
      const u = new URL(String(v || ''), location.href);
      return /^https?:$/.test(u.protocol) ? u.href : '';
    } catch (e) {
      return '';
    }
  },
  text: (v, max = 200) =>
    String(v ?? '')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
      .trim()
      .slice(0, max),
  num: (v, o = {}) => {
    const { min = 0, max = 1e9, dp = 2 } = o;
    let n = parseFloat(v);
    if (!isFinite(n)) return null;
    n = Math.min(max, Math.max(min, n));
    const f = 10 ** dp;
    return Math.round(n * f) / f;
  },
  code: (v) =>
    String(v || '')
      .trim()
      .replace(/[^\w\-. /]/g, '')
      .slice(0, 64),
  date: (v) => {
    v = String(v || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
    const d = new Date(v + 'T00:00');
    return !isNaN(d) &&
      d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') ===
        v
      ? v
      : '';
  },
  email: (v) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(v || '')),
};
