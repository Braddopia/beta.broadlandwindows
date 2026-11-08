// data/repository: adding, changing, finding and removing records, with who/when stamps.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

import { replaceState, state } from '../../src/data/state.js';
import { repo } from '../../src/data/repository.js';

globalThis.USER = 'Sample User';

test('add stamps a new record; changed bumps the version', () => {
  mock.timers.enable({ apis: ['Date'], now: 1000 });
  replaceState({ calls: [{ id: 'S-0001' }] });
  const calls = repo('calls');
  const n = calls.add({ id: 'S-0002' }, { first: true });
  assert.equal(state.calls[0], n);
  assert.deepEqual(n._meta, {
    createdAt: 1000,
    createdBy: 'Sample User',
    updatedAt: 1000,
    updatedBy: 'Sample User',
    version: 1,
  });
  mock.timers.tick(500);
  calls.changed(Object.assign(n, { status: 'Booked' }));
  assert.equal(n._meta.version, 2);
  assert.equal(n._meta.updatedAt, 1500);
  assert.equal(n._meta.createdAt, 1000);
  mock.timers.reset();
});

test('older records without stamps get one when first changed', () => {
  replaceState({ leads: [{ id: 'L0001' }] });
  const r = repo('leads').changed(state.leads[0]);
  assert.equal(r._meta.version, 1);
  assert.ok(r._meta.createdAt);
});

test('a copied record gets its own stamp, unless it keeps the original', () => {
  replaceState({ leads: [], leadArchive: [] });
  const l = repo('leads').add({ id: 'L0001' });
  const copy = repo('contracts').add({ ...l, id: '2400001' });
  assert.notEqual(copy._meta, l._meta);
  copy._meta.version = 9;
  assert.equal(l._meta.version, 1);
  const kept = repo('leadArchive').add({ ...l }, { keepMeta: true });
  assert.equal(kept._meta.createdAt, l._meta.createdAt);
  assert.notEqual(kept._meta, l._meta);
});

test('find, page and remove', () => {
  replaceState({ deliveries: [1, 2, 3, 4, 5].map((i) => ({ id: 'D' + i, n: i })) });
  const d = repo('deliveries');
  assert.equal(d.get('D3').n, 3);
  assert.deepEqual(
    d.find((x) => x.n > 3).map((x) => x.id),
    ['D4', 'D5']
  );
  const p = d.page({ filter: (x) => x.n != 1, sort: (a, b) => b.n - a.n, page: 2, size: 2 });
  assert.deepEqual(p, { rows: [state.deliveries[2], state.deliveries[1]], total: 4 });
  assert.equal(
    d.remove((x) => x.n % 2),
    3
  );
  assert.deepEqual(
    state.deliveries.map((x) => x.id),
    ['D2', 'D4']
  );
});
