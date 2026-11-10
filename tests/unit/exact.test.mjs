import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exactKeys, isExact } from '../../src/domain/exact.js';

test('an exact number, name, phone, email or postcode matches', () => {
  const lead = { id: 'L0001', name: 'Sample Customer A', mob1: '07700 900 014', email1: 'a@example.com', homePc: 'NR1 1AA' };
  for (const q of ['L0001', 'l0001', 'sample customer a', '07700900014', '07700 900 014', 'A@Example.com', 'nr11aa'])
    assert.equal(isExact(lead, q), true, q);
});
test('part of a value, or very short searches, do not count', () => {
  const c = { id: '2402318', name: 'Sample Customer E', town: 'Aylsham' };
  for (const q of ['2402', 'Sample', 'Aylsham', 'e', '', null]) assert.equal(isExact(c, q), false, String(q));
});
test('exactKeys skips empty and non-text values', () => {
  assert.deepEqual(exactKeys({ id: 'S-0871', name: '', photos: ['x'] }), ['s0871']);
  assert.deepEqual(exactKeys(null), []);
});
