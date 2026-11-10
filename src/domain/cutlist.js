/* domain/cutlist: the panel cutting optimiser. Plain functions (tested in tests/unit).

   Given the boards in stock (length x width, how many, 0 = as many as needed) and the pieces to cut
   (length x width, how many, whether they may be turned), it places every piece on as few boards as it
   can. It uses the "maximal rectangles" method: each board keeps a list of the free spaces left, and
   each piece goes in the free space it fits most snugly (shortest leftover side first).

   Saw kerf (the width of the cut) is left between pieces; edge trim is taken off every side of a
   board first. Lengths run along the board's length (x), widths along its width (y). A piece that may
   not turn (grain) keeps its length along the board's length. */

const fits = (f, w, h) => w <= f.w + 1e-9 && h <= f.h + 1e-9;

/* split the free spaces around a newly used rectangle, then drop any space inside another */
function cutFree(free, u) {
  const out = [];
  for (const f of free) {
    if (u.x >= f.x + f.w || u.x + u.w <= f.x || u.y >= f.y + f.h || u.y + u.h <= f.y) {
      out.push(f);
      continue;
    }
    if (u.x > f.x) out.push({ x: f.x, y: f.y, w: u.x - f.x, h: f.h });
    if (u.x + u.w < f.x + f.w) out.push({ x: u.x + u.w, y: f.y, w: f.x + f.w - u.x - u.w, h: f.h });
    if (u.y > f.y) out.push({ x: f.x, y: f.y, w: f.w, h: u.y - f.y });
    if (u.y + u.h < f.y + f.h) out.push({ x: f.x, y: u.y + u.h, w: f.w, h: f.y + f.h - u.y - u.h });
  }
  return out.filter(
    (a, i) =>
      a.w > 0 &&
      a.h > 0 &&
      !out.some(
        (b, j) =>
          j != i &&
          a.x >= b.x &&
          a.y >= b.y &&
          a.x + a.w <= b.x + b.w &&
          a.y + a.h <= b.y + b.h &&
          (j < i || a.x != b.x || a.y != b.y || a.w != b.w || a.h != b.h)
      )
  );
}
/* the best free space on one board for a piece: [score, x, y, rotated] or null */
function bestSpot(bin, pw, ph, turn) {
  let best = null;
  const tryIt = (w, h, rot) => {
    for (const f of bin.free)
      if (fits(f, w, h)) {
        const s1 = Math.min(f.w - w, f.h - h),
          s2 = Math.max(f.w - w, f.h - h);
        if (!best || s1 < best[0] || (s1 == best[0] && s2 < best[1])) best = [s1, s2, f.x, f.y, rot];
      }
  };
  tryIt(pw, ph, false);
  if (turn && pw != ph) tryIt(ph, pw, true);
  return best;
}
const num = (v) => {
  const n = +v;
  return isFinite(n) && n > 0 ? n : 0;
};

/** work out the cutting plan. sheets: [{ label, L, W, qty }], parts: [{ label, L, W, qty, turn }]
    returns { boards: [{ sheet, L, W, pieces: [{ label, x, y, l, w, rot }], used, area }],
              unplaced: [{ label, L, W }], stats } */
export function optimise({ sheets = [], parts = [], kerf = 3, trim = 0 } = {}) {
  kerf = Math.max(0, +kerf || 0);
  trim = Math.max(0, +trim || 0);
  const S = sheets
    .map((s, i) => ({ i, label: s.label || 'Board ' + (i + 1), L: num(s.L), W: num(s.W), qty: Math.floor(num(s.qty)) }))
    .filter((s) => s.L > 2 * trim && s.W > 2 * trim);
  const left = S.map((s) => (s.qty > 0 ? s.qty : Infinity));
  /* every piece on its own, biggest first */
  const P = [];
  parts.forEach((p, i) => {
    const L = num(p.L),
      W = num(p.W),
      n = Math.min(5000, Math.floor(num(p.qty)) || 0);
    if (!L || !W) return;
    for (let k = 0; k < n; k++) P.push({ label: p.label || 'Part ' + (i + 1), L, W, turn: p.turn !== false });
  });
  P.sort((a, b) => b.L * b.W - a.L * a.W || Math.max(b.L, b.W) - Math.max(a.L, a.W));
  const boards = [],
    unplaced = [];
  const open = (s) => {
    const w = s.L - 2 * trim + kerf,
      h = s.W - 2 * trim + kerf;
    const b = { sheet: s.label, si: s.i, L: s.L, W: s.W, free: [{ x: 0, y: 0, w, h }], pieces: [] };
    boards.push(b);
    return b;
  };
  for (const p of P) {
    const pw = p.L + kerf,
      ph = p.W + kerf;
    let pick = null;
    for (const b of boards) {
      const s = bestSpot(b, pw, ph, p.turn);
      if (s && (!pick || s[0] < pick[1][0] || (s[0] == pick[1][0] && s[1] < pick[1][1]))) pick = [b, s];
    }
    if (!pick) {
      /* a new board: the first type in the list that still has boards and that the piece fits */
      const k = S.findIndex(
        (s, j) =>
          left[j] > 0 &&
          ((p.L <= s.L - 2 * trim && p.W <= s.W - 2 * trim) ||
            (p.turn && p.W <= s.L - 2 * trim && p.L <= s.W - 2 * trim))
      );
      if (k < 0) {
        unplaced.push({ label: p.label, L: p.L, W: p.W });
        continue;
      }
      left[k]--;
      const b = open(S[k]),
        s = bestSpot(b, pw, ph, p.turn);
      pick = [b, s];
    }
    const [b, [, , x, y, rot]] = pick,
      w = rot ? ph : pw,
      h = rot ? pw : ph;
    b.free = cutFree(b.free, { x, y, w, h });
    b.pieces.push({ label: p.label, x: x + trim, y: y + trim, l: rot ? p.W : p.L, w: rot ? p.L : p.W, rot });
  }
  boards.forEach((b) => {
    delete b.free;
    b.area = b.L * b.W;
    b.used = b.pieces.reduce((a, q) => a + q.l * q.w, 0);
  });
  const area = boards.reduce((a, b) => a + b.area, 0),
    used = boards.reduce((a, b) => a + b.used, 0);
  return {
    boards,
    unplaced,
    stats: {
      boards: boards.length,
      pieces: P.length - unplaced.length,
      unplaced: unplaced.length,
      area,
      used,
      waste: area - used,
      efficiency: area ? used / area : 0,
      byType: S.map((s, j) => ({
        label: s.label,
        used: boards.filter((b) => b.si == s.i).length,
        of: s.qty || null,
      })).filter((t) => t.used),
    },
  };
}
