import { test } from 'node:test';
import assert from 'node:assert/strict';
import { optimise } from '../../src/domain/cutlist.js';
import {
  BASE,
  FIT_MILES,
  MAP_H,
  MAP_W,
  MILE,
  groupByTown,
  inFitArea,
  milesBetween,
  project,
  townKey,
  TOWNS,
} from '../../src/domain/places.js';

const overlap = (a, b) => a.x < b.x + b.l && b.x < a.x + a.l && a.y < b.y + b.w && b.y < a.y + a.w;

test('four quarter boards fill one board exactly when there is no kerf', () => {
  const r = optimise({ sheets: [{ L: 2440, W: 1220, qty: 0 }], parts: [{ L: 1220, W: 610, qty: 4 }], kerf: 0 });
  assert.equal(r.stats.boards, 1);
  assert.equal(r.stats.unplaced, 0);
  assert.equal(Math.round(r.stats.efficiency * 100), 100);
});

test('pieces never overlap, stay on the board, and leave the kerf between them', () => {
  const kerf = 4,
    trim = 10;
  const r = optimise({
    sheets: [{ L: 2440, W: 1220, qty: 0 }],
    parts: [
      { label: 'Side', L: 720, W: 560, qty: 6 },
      { label: 'Shelf', L: 764, W: 540, qty: 8 },
      { label: 'Back', L: 1200, W: 760, qty: 2, turn: false },
    ],
    kerf,
    trim,
  });
  assert.equal(r.stats.unplaced, 0);
  assert.equal(r.stats.pieces, 16);
  for (const b of r.boards) {
    for (const p of b.pieces) {
      assert.ok(p.x >= trim && p.y >= trim, 'inside the trim');
      assert.ok(p.x + p.l <= b.L - trim + 1e-9 && p.y + p.w <= b.W - trim + 1e-9, 'on the board');
    }
    b.pieces.forEach((p, i) =>
      b.pieces.slice(i + 1).forEach((q) => {
        const grow = (z) => ({ x: z.x, y: z.y, l: z.l + kerf, w: z.w + kerf });
        assert.ok(!overlap(grow(p), grow(q)), 'no overlap, kerf kept');
      })
    );
  }
  /* grain-locked backs keep their length along the board */
  r.boards.flatMap((b) => b.pieces.filter((p) => p.label == 'Back')).forEach((p) => assert.equal(p.rot, false));
});

test('limited boards run out, then pieces are listed as not placed; too-big pieces too', () => {
  const r = optimise({
    sheets: [{ L: 1000, W: 500, qty: 1 }],
    parts: [
      { L: 500, W: 500, qty: 3 },
      { L: 3000, W: 100, qty: 1 },
    ],
    kerf: 0,
  });
  assert.equal(r.stats.boards, 1);
  assert.equal(r.stats.pieces, 2);
  assert.equal(r.unplaced.length, 2);
});

test('bad numbers are ignored rather than breaking the plan', () => {
  const r = optimise({ sheets: [{ L: 'x', W: 1220 }], parts: [{ L: 100, W: -5, qty: 2 }] });
  assert.equal(r.stats.boards, 0);
  assert.equal(r.unplaced.length, 0);
});

test('towns are recognised however they are written, and land inside the map', () => {
  for (const t of ['Norwich', 'NORWICH', 'Gt Yarmouth', 'Kings Lynn', "King's Lynn, Norfolk", 'Wells', 'Caister'])
    assert.ok(townKey(t), t);
  assert.equal(townKey('Somewhere Else'), '');
  for (const k of Object.keys(TOWNS)) {
    const [x, y] = project(TOWNS[k]);
    assert.ok(x >= 0 && x <= MAP_W && y >= 0 && y <= MAP_H, k);
  }
  /* Norwich is east of King's Lynn and south of Cromer */
  const [nx, ny] = project(TOWNS.norwich),
    [kx] = project(TOWNS["king's lynn"]),
    [, cy] = project(TOWNS.cromer);
  assert.ok(nx > kx && ny > cy);
});

test('calls are grouped by town, busiest first, with the unknown towns set aside', () => {
  const g = groupByTown(
    [{ town: 'Norwich' }, { town: 'norwich' }, { town: 'Diss' }, { town: 'Atlantis' }],
    (c) => c.town
  );
  assert.deepEqual(
    g.towns.map((t) => [t.name, t.items.length]),
    [
      ['Norwich', 2],
      ['Diss', 1],
    ]
  );
  assert.equal(g.off.length, 1);
});

test('the 45-mile fitting area round NR6 5DR: on the map with room to spare, and the right towns inside it', () => {
  assert.equal(BASE.postcode, 'NR6 5DR');
  assert.equal(FIT_MILES, 45);
  /* the whole circle's land fits: its bottom (Ipswich way) and its west edge (the Fens) are on the map */
  const [bx, by] = project(BASE.at),
    r = FIT_MILES * MILE;
  assert.ok(by + r < MAP_H && bx - r > 0);
  /* Norwich to Great Yarmouth is about 18 miles */
  assert.ok(Math.abs(milesBetween(TOWNS.norwich, TOWNS['great yarmouth']) - 18) < 2);
  for (const k of ["king's lynn", 'cromer', 'great yarmouth', 'diss', 'thetford', 'lowestoft', 'southwold', 'ipswich'])
    assert.ok(inFitArea(k), k);
  for (const k of ['wisbech', 'ely', 'march']) assert.ok(!inFitArea(k), k);
  assert.equal(townKey('Bury St. Edmunds'), 'bury st edmunds');
});
