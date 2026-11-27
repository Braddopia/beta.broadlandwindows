// The daily review figures (reviews.json) update the Google and Trustpilot scores and counts (v19.14).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyReviewFeed } from '../../src/domain/review-feed.js';

const brand = () => ({
  g: { score: 4.5, count: '120', url: 'https://g.example' },
  tp: { score: 4.5, count: '21', url: 'https://tp.example' },
  tt: { score: 4.9, count: 613 },
});

test('new figures replace the old ones; links and the other sites are kept', () => {
  const b = brand();
  const changed = applyReviewFeed(b, { google: { score: 4.6, count: 131 }, trustpilot: { score: 4.7, count: 34 } });
  assert.deepEqual(changed, ['Google', 'Trustpilot']);
  assert.deepEqual(b.g, { score: 4.6, count: 131, url: 'https://g.example' });
  assert.deepEqual(b.tp, { score: 4.7, count: 34, url: 'https://tp.example' });
  assert.equal(b.tt.count, 613);
});

test('the same figures change nothing (so nothing is saved)', () => {
  const b = brand();
  assert.deepEqual(applyReviewFeed(b, { google: { score: 4.5, count: 120 }, trustpilot: { score: '4.5', count: '21' } }), []);
});

test('a site missing from the feed, or with figures that are not numbers, is left alone', () => {
  const b = brand();
  assert.deepEqual(applyReviewFeed(b, { trustpilot: { score: 'abc', count: null } }), []);
  assert.deepEqual(applyReviewFeed(b, { google: { score: 9, count: -3 } }), []);
  assert.deepEqual(b, brand());
  assert.deepEqual(applyReviewFeed(b, null), []);
});

test('only the count can change (a site that gives no score keeps its score)', () => {
  const b = brand();
  assert.deepEqual(applyReviewFeed(b, { trustpilot: { count: 25 } }), ['Trustpilot']);
  assert.deepEqual(b.tp, { score: 4.5, count: 25, url: 'https://tp.example' });
});
