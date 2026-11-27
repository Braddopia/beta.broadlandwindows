// Inventory: stock is shown with the unit it is counted in, always as count × unit (v19.13, v19.15.5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replaceState, state } from '../../src/data/state.js';
import { stockText, barMm, sizeNote, lengthUnit } from '../../src/domain/stock.js';

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

test('everything else shows count × its unit: pieces, pairs, metres, kits', () => {
  fresh();
  assert.equal(stockText({ pid: '1', stock: 62, unit: 'Each' }), '62 × PCS');
  assert.equal(stockText({ pid: '2', stock: 62, unit: 'PCS' }), '62 × PCS');
  assert.equal(stockText({ pid: '3', stock: 4, unit: 'Pair' }), '4 × Pairs');
  assert.equal(stockText({ pid: '4', stock: 12, unit: 'Meters (M)' }), '12 × M');
  assert.equal(stockText({ pid: '5', stock: 3, unit: 'Kit' }), '3 × Kits');
});

test('a unit typed in the Length box is the unit, not a size under the item (9 × EA)', () => {
  fresh();
  for (const [typed, unit] of [
    ['EA', 'EA'],
    ['each', 'EA'],
    ['Pcs', 'PCS'],
    ['PR', 'Pairs'],
    ['mtr', 'M'],
    ['Set', 'Sets'],
  ]) {
    const r = { pid: 'x', stock: 9, length: typed, unit: 'Each' };
    assert.equal(lengthUnit(r), unit);
    assert.equal(sizeNote(r), '');
    assert.equal(stockText(r), '9 × ' + unit);
  }
});

test('a small size such as 4MM packers is not a bar length or a unit: it stays under the item', () => {
  fresh();
  const r = { pid: '6', stock: 10, length: '4MM', unit: 'Each' };
  assert.equal(barMm(r), 0);
  assert.equal(lengthUnit(r), '');
  assert.equal(sizeNote(r), '4MM');
  assert.equal(stockText(r), '10 × PCS');
});
