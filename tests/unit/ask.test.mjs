// Understanding typed questions: plain forms of words, filler dropped, words that mean the same folded together.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { askScore, askWords, labelHit, stem } from '../../src/domain/ask.js';

test('words come back in their plain form, with words that mean the same folded together', () => {
  assert.equal(stem('Fittings'), 'fit');
  assert.equal(stem('outstanding'), 'owed');
  assert.equal(stem('owing'), 'owed');
  assert.equal(stem('deliveries'), 'delivery');
  assert.equal(stem('tickets'), 'call');
  assert.equal(stem('glass'), 'glass');
});
test('filler words are dropped from a question', () => {
  assert.deepEqual(askWords('What is the amount outstanding?'), ['owed']);
  assert.deepEqual(askWords('how many open service calls'), ['open', 'call', 'call']);
});
test('an answer scores by the longest phrase fully asked for', () => {
  const W = askWords('stock value please');
  assert.equal(askScore(W, ['stock', 'stock value']), 2);
  assert.equal(askScore(W, ['payroll']), 0);
});
test('a page label matches when every word asked for is in it', () => {
  assert.ok(labelHit(askWords('amount outstanding'), 'Balance To Collect'));
  assert.ok(labelHit(askWords('trickle vents'), 'Trickle Vents'));
  assert.ok(!labelHit(askWords('trickle vents'), 'Fire Escape'));
  assert.ok(!labelHit([], 'Anything'));
});
