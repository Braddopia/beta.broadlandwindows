/* domain/review-feed: the daily review figures (reviews.json, written each morning by a GitHub job from Google's
   and Trustpilot's official feeds) folded into the company's review scores. Plain rules, no screen, no storage. */

/** a score 0-5 with one decimal, or null when it is not a usable number */
const score5 = (v) => {
  const n = +v;
  return v !== null && v !== '' && isFinite(n) && n >= 0 && n <= 5 ? Math.round(n * 10) / 10 : null;
};
/** a whole review count, or null */
const count = (v) => {
  const n = +v;
  return v !== null && v !== '' && isFinite(n) && n >= 0 && n < 1e7 ? Math.round(n) : null;
};

/**
 * Copy the feed's Google and Trustpilot figures into brand ({ g, tp }), keeping each site's link.
 * A site missing from the feed, or with figures that are not numbers, is left as it was.
 * Returns the names of the sites that changed ([] when nothing did).
 */
export function applyReviewFeed(brand, feed) {
  if (!brand || !feed || typeof feed != 'object') return [];
  const changed = [];
  for (const [key, from, name] of [
    ['g', 'google', 'Google'],
    ['tp', 'trustpilot', 'Trustpilot'],
  ]) {
    const f = feed[from];
    if (!f) continue;
    const s = score5(f.score),
      c = count(f.count);
    if (s === null && c === null) continue;
    const was = brand[key] || {},
      now = { ...was };
    if (s !== null) now.score = s;
    if (c !== null) now.count = c;
    if (+was.score !== +now.score || +was.count !== +now.count) {
      brand[key] = now;
      changed.push(name);
    }
  }
  return changed;
}
