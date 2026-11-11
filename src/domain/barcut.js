/* domain/barcut: cutting lengths of profile from full bars with the least waste (one-dimensional cutting).
   Each cut has a length (outside, long-point), how many, a label (room or position), a reference (frame
   number) and its end angles. Bars lose an end trim at each end, and every saw cut loses the blade width.
   Longest cuts go first, each into the bar it fits best (least left over): good results, fast enough to
   run on every key press. Plain functions (tests/unit). */

const n = (x) => (Number.isFinite(+x) ? +x : 0);

/** spread "how many" into one entry per cut, longest first */
export function cutsOf(rows) {
  const out = [];
  (rows || []).forEach((r, i) => {
    const len = n(r.len),
      q = Math.min(1000, Math.max(0, Math.round(n(r.qty))));
    if (len <= 0) return;
    for (let k = 0; k < q; k++)
      out.push({
        len,
        label: String(r.label || ''),
        ref: String(r.ref || ''),
        aL: n(r.aL) || 90,
        aR: n(r.aR) || 90,
        row: i,
      });
  });
  return out.sort((a, b) => b.len - a.len || a.row - b.row);
}

/** plan the bars for one profile: { bars:[{cuts, used, off}], unplaced, stats } */
export function optimiseBars({ bar, kerf = 4, trim = 10, cuts }) {
  const L = n(bar),
    k = Math.max(0, n(kerf)),
    t = Math.max(0, n(trim)),
    usable = Math.max(0, L - 2 * t),
    bars = [],
    unplaced = [];
  for (const c of cutsOf(cuts)) {
    if (c.len > usable) {
      unplaced.push(c);
      continue;
    }
    /* the open bar this cut fits best: the one with the least left after it */
    let best = null,
      bestLeft = Infinity;
    for (const b of bars) {
      const need = c.len + (b.cuts.length ? k : 0),
        left = usable - b.used - need;
      if (left >= 0 && left < bestLeft) {
        best = b;
        bestLeft = left;
      }
    }
    if (!best) {
      best = { cuts: [], used: 0 };
      bars.push(best);
    }
    best.used += c.len + (best.cuts.length ? k : 0);
    best.cuts.push(c);
  }
  bars.forEach((b) => (b.off = Math.max(0, usable - b.used - (b.cuts.length ? k : 0))));
  const total = bars.length * L,
    cutLen = bars.reduce((s, b) => s + b.cuts.reduce((x, c) => x + c.len, 0), 0),
    waste = Math.max(0, total - cutLen);
  return {
    bars,
    unplaced,
    stats: {
      bars: bars.length,
      cuts: bars.reduce((s, b) => s + b.cuts.length, 0),
      unplaced: unplaced.length,
      total,
      cutLen,
      waste,
      wastePct: total ? waste / total : 0,
    },
  };
}

/** what is left of each bar that is worth keeping: whole millimetres, at least `min` long, longest first */
export function offcutsOf(bars, min = 500) {
  return (bars || [])
    .map((b) => Math.floor(b.off || 0))
    .filter((o) => o > 0 && o >= (+min || 0))
    .sort((a, b) => b - a);
}
/** bars cut exactly the same way, counted together ("2x") as on the saw list */
export function groupBars(bars) {
  const out = [];
  bars.forEach((b) => {
    const sig = b.cuts.map((c) => [c.len, c.label, c.ref, c.aL, c.aR].join('|')).join('/');
    const g = out.find((x) => x.sig == sig);
    if (g) g.n++;
    else out.push({ sig, n: 1, bar: b });
  });
  return out;
}

/** a bar length read from a stock length such as "6.5M", "6500MM" or "6500" (mm), or 0 */
export function barLenOf(s) {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(m|mm)?\s*$/i.exec(String(s || ''));
  if (!m) return 0;
  const v = +m[1],
    u = (m[2] || '').toLowerCase();
  const mmv = u == 'm' ? v * 1000 : u == 'mm' ? v : v < 20 ? v * 1000 : v;
  return mmv >= 500 && mmv <= 20000 ? Math.round(mmv) : 0;
}
