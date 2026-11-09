// domain/stock-take: reading count sheets, matching them to products, and counting.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { replaceState } from '../../src/data/state.js';
import {
  findColumns,
  sheetLines,
  planImport,
  areaLines,
  areaList,
  variance,
  varianceTotals,
} from '../../src/domain/stock-take.js';

const H = ['Stock Code', 'Description', 'Quantity In Stock', 'Location', 'Notes'];

test('finds the heading row and columns, whatever the order', () => {
  assert.deepEqual(findColumns([[], ['Notes', 'Description', 'Stock Code']]), {
    head: 1,
    map: { notes: 0, desc: 1, code: 2 },
  });
  assert.equal(findColumns([['a', 'b']]), null);
});

test('sheet lines: area from the sheet name, blanks skipped, duplicates merged', () => {
  const { lines, dups } = sheetLines([
    {
      name: 'Stores',
      rows: [
        H,
        ['AB1', 'Packers', null, 'CNC', ''],
        [null, null, null, null, null],
        [null, 'Cling film', 4, 'SAW', '& stores'],
        ['ab1', 'Packers', 2, 'BAY-2'],
      ],
    },
    { name: 'Fitters Vans', rows: [H, ['AB1', 'Packers', 3]] },
    { name: 'Blanks', rows: [H] },
  ]);
  assert.equal(dups, 1);
  assert.deepEqual(
    lines.map((l) => [l.code, l.desc, l.area, l.qty, l.loc, l.seq]),
    [
      ['AB1', 'Packers', 'Stores', 2, 'CNC / BAY-2', 0],
      ['', 'Cling film', 'Stores', 4, 'SAW', 1],
      ['AB1', 'Packers', 'Fitters Vans', 3, '', 2],
    ]
  );
});

test('import plan: match by code in the same area, fill in a missing area, otherwise new', () => {
  const P = [
    { pid: '0001', item: 'AB1', area: 'Stores' },
    { pid: '0002', item: 'ZZ9' },
    { pid: '0003', item: 'Cling film', desc: 'Cling film', code: '', area: 'Stores' },
  ];
  const lines = [
    { code: 'ab1', desc: 'Packers', area: 'Stores', qty: 2 },
    { code: 'AB1', desc: 'Packers', area: 'Fitters Vans', qty: null },
    { code: 'ZZ9', desc: '', area: 'MISC', qty: null },
    { code: '', desc: 'cling FILM', area: 'Stores', qty: 1 },
  ];
  const plan = planImport(lines, P);
  assert.deepEqual(
    plan.update.map((u) => u.r.pid),
    ['0001', '0002', '0003']
  );
  assert.deepEqual(
    plan.create.map((c) => c.line.area),
    ['Fitters Vans']
  );
  assert.equal(plan.withQty, 2);
});

test('areas keep sheet order; lines keep sheet order', () => {
  const P = [
    { pid: '1', item: 'B', area: 'Stores', seq: 5 },
    { pid: '2', item: 'A', area: 'MISC', seq: 1 },
    { pid: '3', item: 'C', area: 'Stores', seq: 2 },
    { pid: '4', item: 'D' },
  ];
  assert.deepEqual(areaList(P, ['MISC', 'Stores']), ['MISC', 'Stores', 'No Area']);
  assert.deepEqual(
    areaLines(P, 'Stores').map((r) => r.pid),
    ['3', '1']
  );
});

test('variance uses the quantity and cost when counting started', () => {
  replaceState({ items: [] });
  const P = [
    { pid: '1', stock: 10, cost: 2 },
    { pid: '2', stock: 5, cost: 1 },
    { pid: '3', stock: 1, cost: 4 },
  ];
  const st = {
    counts: { 1: { q: 8 }, 2: { q: 6 } },
    snap: { 1: { q: 10, c: 2 }, 2: { q: 5, c: 1 }, 3: { q: 1, c: 4 } },
  };
  const V = variance(st, P);
  assert.deepEqual(
    V.map((v) => [v.diff, v.value]),
    [
      [-2, -4],
      [1, 1],
      [null, 0],
    ]
  );
  assert.deepEqual(varianceTotals(V), {
    lines: 3,
    counted: 2,
    left: 1,
    over: 1,
    under: 1,
    exact: 0,
    sysValue: 29,
    countValue: 22,
    diffValue: -3,
  });
});

test('colour rows under a code are variants of that code (Metal sheet style)', () => {
  const { lines } = sheetLines([
    {
      name: 'Metal',
      rows: [
        ['Stock Code', 'Description', 'Quantity In Stock', 'Location', 'Value', 'Cost'],
        ['ETC451 (85MM)', 'WP / WP', 12, null, null, 18.18],
        [null, '7016 / 7016', 5, null, null, 19.18],
        ['IMP016', 'CLIP IN PLATE (ALL COLOURS)', 109.5, null, null, 13.59],
        [null, 'SPARE PLATE', 1],
      ],
    },
  ]);
  assert.deepEqual(
    lines.map((l) => [l.code, l.cOut, l.cIn, l.qty, l.cost]),
    [
      ['ETC451 (85MM)', 'WP', 'WP', 12, 18.18],
      ['ETC451 (85MM)', '7016', '7016', 5, 19.18],
      ['IMP016', '', '', 109.5, 13.59],
      ['', '', '', 1, null],
    ]
  );
});

test('one code can name several products: kept apart by description', () => {
  const { lines, dups } = sheetLines([
    {
      name: 'Cylinders',
      rows: [
        ['Stock Code', 'Description', 'Quantity In Stock'],
        ['50/50', 'SET 1 KEY ALIKE', 7],
        ['50/50', 'SINGLE S', 44],
        ['50/50', 'SET 1 KEY ALIKE', 1],
      ],
    },
  ]);
  assert.equal(dups, 1);
  assert.deepEqual(
    lines.map((l) => [l.desc, l.qty]),
    [
      ['SET 1 KEY ALIKE', 8],
      ['SINGLE S', 44],
    ]
  );
  const P = [
    { pid: '1', item: '50/50', desc: 'SINGLE S', area: 'Cylinders' },
    { pid: '2', item: '50/50', desc: 'SET 1 KEY ALIKE', area: 'Cylinders' },
  ];
  assert.deepEqual(
    planImport(lines, P).update.map((u) => u.r.pid),
    ['2', '1']
  );
});
