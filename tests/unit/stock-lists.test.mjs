// The stock lists: locations, product groups and colour codes linked to RAL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replaceState } from '../../src/data/state.js';
import { DEF_COLOURS, codeFind, codeOf, codeText, listChoices, stockLists } from '../../src/domain/stock-lists.js';

test('until the office sets them, the lists come from the stock sheet', () => {
  replaceState({});
  const L = stockLists();
  assert.ok(L.locs.includes('T/V'));
  assert.ok(L.groups.includes('Door Cylinders'));
  assert.equal(L.colours.length, 47);
});
test('a colour code reads with its RAL colour and finish', () => {
  const C = DEF_COLOURS();
  assert.equal(codeText(C.find((c) => c.code == 'KL016')), 'KL016 (RAL 7032 Matt)');
  assert.equal(codeText(C.find((c) => c.code == 'RAL7016') || { code: 'RAL7016', ral: '7016' }), 'RAL7016 (RAL 7016)');
  assert.equal(codeText({ code: 'SSS' }), 'SSS');
});
test('a code is found by itself or by its RAL number, and read back from a saved colour name', () => {
  const C = DEF_COLOURS();
  assert.deepEqual(
    codeFind('7032', C).map((c) => c.code),
    ['KL016']
  );
  const kl = codeFind('kl01', C).map((c) => c.code);
  assert.ok(kl.includes('KL016') && kl.every((c) => c.startsWith('KL01')));
  assert.equal(codeOf('KL016 (RAL 7032 Matt)', C).code, 'KL016');
  assert.equal(codeOf('Anthracite Grey (RAL 7016)', C), null);
});
test('a value already saved stays a choice even when it is not on the list', () => {
  assert.deepEqual(listChoices(['A', 'B'], 'Old Shelf'), ['', 'A', 'B', 'Old Shelf']);
  assert.deepEqual(listChoices(['A', 'B'], 'A'), ['', 'A', 'B']);
});
