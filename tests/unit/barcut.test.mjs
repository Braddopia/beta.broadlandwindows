// Cutting lengths of profile from full bars.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_KERF,
  MIN_OFFCUT,
  barLenOf,
  cutsOf,
  groupBars,
  offcutsOf,
  optimiseBars,
} from '../../src/domain/barcut.js';

const SHEET = [
  { label: 'Ensuite', ref: '2', len: 1603, qty: 2 },
  { label: 'Dressing room', ref: '1', len: 1603, qty: 2 },
  { label: 'Ensuite', ref: '5', len: 1210, qty: 2 },
  { label: 'Dressing room', ref: '3', len: 1210, qty: 2 },
];
test('the outer frame from the saw sheet: 2 bars of 6500, 1748 mm wasted (13.4%)', () => {
  const R = optimiseBars({ bar: 6500, kerf: 4, trim: 10, cuts: SHEET });
  assert.equal(R.stats.bars, 2);
  assert.equal(R.stats.cuts, 8);
  assert.equal(R.stats.waste, 1748);
  assert.equal(Math.round(R.stats.wastePct * 1000) / 10, 13.4);
});
test('a cut longer than the bar (after end trims) is reported, not lost', () => {
  const R = optimiseBars({
    bar: 6500,
    kerf: 4,
    trim: 10,
    cuts: [
      { len: 6490, qty: 1 },
      { len: 1000, qty: 1 },
    ],
  });
  assert.equal(R.unplaced.length, 1);
  assert.equal(R.stats.bars, 1);
});
test('every saw cut costs the blade width, and a bar never goes over', () => {
  const R = optimiseBars({ bar: 3000, kerf: 5, trim: 0, cuts: [{ len: 1000, qty: 3 }] });
  // 1000 + 5 + 1000 = 2005, a third cut needs 1005 more: 3010 > 3000, so two bars
  assert.equal(R.stats.bars, 2);
  R.bars.forEach((b) => assert.ok(b.used <= 3000));
});
test('how many is spread out, longest first; bars cut alike are counted together', () => {
  assert.deepEqual(
    cutsOf([
      { len: 500, qty: 2 },
      { len: 900, qty: 1 },
    ]).map((c) => c.len),
    [900, 500, 500]
  );
  const R = optimiseBars({ bar: 1000, kerf: 0, trim: 0, cuts: [{ len: 1000, qty: 3 }] });
  assert.deepEqual(
    groupBars(R.bars).map((g) => g.n),
    [3]
  );
});
test('bar lengths read from stock lengths', () => {
  assert.equal(barLenOf('6.5M'), 6500);
  assert.equal(barLenOf('6500'), 6500);
  assert.equal(barLenOf('6500mm'), 6500);
  assert.equal(barLenOf('3M'), 3000);
  assert.equal(barLenOf('4-5MM'), 0);
});
test('offcuts worth keeping: at least the minimum length, longest first', () => {
  const R = optimiseBars({ bar: 6500, kerf: 4, trim: 10, cuts: SHEET });
  assert.deepEqual(offcutsOf(R.bars, 500), [1624]);
  assert.deepEqual(offcutsOf(R.bars, 50), [1624, 52]);
  assert.deepEqual(offcutsOf(R.bars, 2000), []);
});

test('the usual saw blade is 10mm and offcuts are only kept from 1M', () => {
  assert.equal(DEFAULT_KERF, 10);
  assert.equal(MIN_OFFCUT, 1000);
  /* most bars are 6.5M; some are 7M or 5M */
  assert.deepEqual(['6.5M', '7M', '5M', '6500'].map(barLenOf), [6500, 7000, 5000, 6500]);
});
