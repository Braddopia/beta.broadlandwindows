// Inventory: stock is shown with the unit it is counted in (v19.13).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replaceState, state } from '../../src/data/state.js';
import { stockText, barMm, sizeNote } from '../../src/domain/stock.js';

const fresh = () => replaceState({ items: [], cutProf: {} });

test('full bars show how many bars and their length', () => {
  fresh();
  state.cutProf = { '0003': { bar: 6500 } };
  assert.equal(stockText({ pid: '0003', stock: 2, length: '-', unit: 'Each' }), '2 × 6.5M');
  state.cutProf['0004'] = { bar: 7000 };
  assert.equal(stockText({ pid: '0004', stock: 5, unit: 'Each' }), '5 × 7M');
  // a product whose Length is a bar length counts as bars too
  assert.equal(stockText({ pid: '0009', stock: 118, length: '6M', unit: 'Each' }), '118 × 6M');
});

test('everything else shows its unit: pieces, pairs, metres', () => {
  fresh();
  assert.equal(stockText({ pid: '1', stock: 62, unit: 'Each' }), '62 PCS');
  assert.equal(stockText({ pid: '2', stock: 62, unit: 'PCS' }), '62 PCS');
  assert.equal(stockText({ pid: '3', stock: 4, unit: 'Pair' }), '4 Pairs');
  assert.equal(stockText({ pid: '4', stock: 12, unit: 'Meters (M)' }), '12 M');
  assert.equal(stockText({ pid: '5', stock: 3, unit: 'Kit' }), '3 Kits');
});

test('a small size such as 4MM packers is not a bar length: it stays under the item', () => {
  fresh();
  const r = { pid: '6', stock: 10, length: '4MM', unit: 'Each' };
  assert.equal(barMm(r), 0);
  assert.equal(sizeNote(r), '4MM');
  assert.equal(stockText(r), '10 PCS');
});
