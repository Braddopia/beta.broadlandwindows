// Trustpilot's score and review count read from its public review page, for when no API key is set (v19.17.5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTrustpilot } from '../../scripts/fetch-reviews.mjs';

test("the page's own data gives the TrustScore and the number of reviews", () => {
  const html = '<script id="__NEXT_DATA__">{"businessUnit":{"trustScore":4.6,"numberOfReviews":{"total":27,"oneStar":1}}}</script>';
  assert.deepEqual(parseTrustpilot(html), { score: 4.6, count: 27 });
});

test('structured data (AggregateRating) is used when that is all there is', () => {
  const html =
    '<script type="application/ld+json">{"aggregateRating":{"@type":"AggregateRating","ratingValue":"4.5","reviewCount":"1,026"}}</script>';
  assert.deepEqual(parseTrustpilot(html), { score: 4.5, count: 1026 });
});

test('a page with no figures (a block page) gives nothing, so yesterday’s figures stay', () => {
  assert.equal(parseTrustpilot('<html><title>Just a moment</title></html>'), null);
});
