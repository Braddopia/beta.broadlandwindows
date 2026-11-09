/* domain/stock-take: the rules for a stock take. Plain functions, no screen code (tested in tests/unit).

   Count sheets follow the office spreadsheet: one sheet per area, with the columns
   Stock Code | Description | Quantity In Stock | Location | Notes.
   A stock line is code + area: the same code kept in two areas has a line (and a count) in each. */
import { areaOf, normCode } from './stock.js';

export const SHEET_COLS = ['Stock Code', 'Description', 'Quantity In Stock', 'Location', 'Notes'];
export const SHEET_WIDTHS = [17, 60, 17, 12, 17];

const HEAD = {
  code: /^(stock\s*code|code|item\s*code|part\s*(no|number)|sku)$/i,
  desc: /^(description|desc|item|product|name)$/i,
  qty: /^(quantity( in stock)?|qty|count(ed)?|stock|on hand)$/i,
  loc: /^(location|loc|bin|bay)$/i,
  notes: /^(notes?|comments?)$/i,
  area: /^(area|sheet|section)$/i,
  supplier: /^supplier$/i,
  cost: /^(cost|cost each|unit cost|price)$/i,
  unit: /^(unit|uom)$/i,
};
const cellText = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());
const num = (v) => {
  if (v == null || v === '') return null;
  const n = typeof v == 'number' ? v : parseFloat(String(v).replace(/[£,\s]/g, ''));
  return isFinite(n) ? n : null;
};

/** find the heading row (in the first 10 rows) and which column holds what */
export function findColumns(rows) {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const r = rows[i] || [],
      map = {};
    r.forEach((v, ci) => {
      const t = cellText(v);
      for (const [k, re] of Object.entries(HEAD)) if (map[k] == null && re.test(t)) map[k] = ci;
    });
    if (map.code != null || map.desc != null) return { head: i, map };
  }
  return null;
}

/* "WP / 7016", "KL15ST / KL15ST": a colour pair (outside / inside), as on the Metal sheet */
const PAIR = /^([A-Z0-9][A-Z0-9 .-]{0,14}) \/ ([A-Z0-9][A-Z0-9 .-]{0,14})$/i;
/** lines from sheets [{ name, rows }]: sheet name is the area unless there is an Area column.
    The same code and description twice in one area is merged into one line.
    A row with no code whose description is a colour pair belongs to the code above it (a colour variant). */
export function sheetLines(sheets) {
  const out = [],
    seen = new Map();
  let dups = 0,
    seq = 0;
  sheets.forEach((s) => {
    const c = findColumns(s.rows);
    if (!c) return;
    const m = c.map,
      get = (r, k) => (m[k] == null ? null : r[m[k]]);
    let lastCode = '';
    s.rows.slice(c.head + 1).forEach((r) => {
      if (!r) return;
      let code = cellText(get(r, 'code'));
      const desc = cellText(get(r, 'desc'));
      if (!code && !desc) return;
      const pair = PAIR.exec(desc);
      if (code) lastCode = code;
      else if (pair && lastCode) code = lastCode;
      else lastCode = '';
      const area = cellText(get(r, 'area')) || cellText(s.name),
        /* repeated only when code, description and area all match: one code can name several
           products (e.g. a cylinder size sold as singles and as keyed-alike sets) */
        k = 'c:' + normCode(code) + '#' + normCode(desc) + '@' + normCode(area),
        loc = cellText(get(r, 'loc')),
        qty = num(get(r, 'qty'));
      const was = seen.get(k);
      if (was) {
        dups++;
        if (loc && !was.loc.split(' / ').includes(loc)) was.loc = was.loc ? was.loc + ' / ' + loc : loc;
        if (qty != null) was.qty = (was.qty || 0) + qty;
        return;
      }
      const line = {
        code,
        desc,
        area,
        loc,
        qty,
        notes: cellText(get(r, 'notes')),
        supplier: cellText(get(r, 'supplier')),
        cost: num(get(r, 'cost')),
        unit: cellText(get(r, 'unit')),
        cOut: pair ? pair[1] : '',
        cIn: pair ? pair[2] : '',
        seq: seq++,
      };
      seen.set(k, line);
      out.push(line);
    });
  });
  return { lines: out, dups };
}

/** the product a sheet line belongs to: same code (or description when there is no code) in the same area.
    A product with no area yet also matches, so a first import fills its area in. */
export function matchLine(line, P) {
  const a = normCode(line.area),
    col = (v) => normCode(v && v != '-' ? v : ''),
    same = (r) =>
      (line.code
        ? normCode(r.item) == normCode(line.code)
        : (r.nocode || r.code === '') && normCode(r.desc || r.item) == normCode(line.desc)) &&
      col(r.cOutName) == col(line.cOut) &&
      col(r.cInName) == col(line.cIn);
  /* one code can name several products: prefer the one with the same description */
  const pick = (L) => L.find((r) => normCode(r.desc) == normCode(line.desc)) || L[0] || null;
  return pick(P.filter((r) => same(r) && normCode(r.area) == a)) || pick(P.filter((r) => same(r) && !r.area));
}

/** what an import would do: new lines, updated lines, and lines that carry a quantity */
export function planImport(lines, P) {
  const used = new Set(),
    create = [],
    update = [];
  lines.forEach((l) => {
    let r = matchLine(
      l,
      P.filter((x) => !used.has(x.pid))
    );
    if (r) {
      used.add(r.pid);
      update.push({ line: l, r });
    } else create.push({ line: l });
  });
  return { create, update, withQty: lines.filter((l) => l.qty != null).length };
}

/* ---- counting ---- */
/** lines in an area, in count-sheet order (sheet order, then location, then code) */
export function areaLines(P, area) {
  return P.filter((r) => !area || areaOf(r) == area).sort(
    (a, b) =>
      (a.seq ?? 1e9) - (b.seq ?? 1e9) ||
      String(a.location || '').localeCompare(String(b.location || '')) ||
      String(a.item).localeCompare(String(b.item))
  );
}
/** areas in sheet order (the order they were imported), then any others A to Z */
export function areaList(P, order) {
  const have = [...new Set(P.map(areaOf))],
    known = (order || []).filter((a) => have.includes(a));
  return [...known, ...have.filter((a) => !known.includes(a)).sort()];
}
/** per line: system quantity when the count started, counted quantity, difference and its value */
export function variance(st, P) {
  return P.map((r) => {
    const c = st.counts[r.pid],
      snap = st.snap && st.snap[r.pid],
      sys = snap ? snap.q : +r.stock || 0,
      cost = snap ? snap.c : +r.cost || 0,
      counted = c ? c.q : null,
      diff = counted == null ? null : counted - sys;
    return { r, sys, cost, counted, diff, value: diff == null ? 0 : diff * cost, by: c && c.by, note: c && c.note };
  });
}
/** totals for a set of variance lines */
export function varianceTotals(V) {
  const counted = V.filter((v) => v.counted != null);
  return {
    lines: V.length,
    counted: counted.length,
    left: V.length - counted.length,
    over: counted.filter((v) => v.diff > 0).length,
    under: counted.filter((v) => v.diff < 0).length,
    exact: counted.filter((v) => v.diff == 0).length,
    sysValue: V.reduce((a, v) => a + v.sys * v.cost, 0),
    countValue: counted.reduce((a, v) => a + v.counted * v.cost, 0),
    diffValue: counted.reduce((a, v) => a + v.value, 0),
  };
}
