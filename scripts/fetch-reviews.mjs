/*
 * scripts/fetch-reviews.mjs: the daily review figures for the CRM.
 *
 * Run each morning by .github/workflows/reviews.yml. Asks Google (Places API) and Trustpilot (Business Units API)
 * for the company's current score and number of reviews and writes reviews.json beside index.html, which the site
 * reads (src/features/home/reviews.js). Keys come from the repository's Actions secrets, never from the code:
 *   GOOGLE_PLACES_KEY, GOOGLE_PLACE_ID      Google Cloud API key with the Places API (New) on, and the business's Place ID
 *   TRUSTPILOT_API_KEY                      from the Trustpilot Business developer page
 *   TRUSTPILOT_DOMAIN (variable, optional)  the website Trustpilot lists the business under (default below)
 * Trustpilot without a key (v19.17.5): its public review page carries the score and the number of reviews, so that
 * is read instead. Google has no such page: it needs its key.
 * A site that does not answer keeps yesterday's figures. When nothing at all is read nothing is written.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'reviews.json');
const env = process.env;

const get = async (url, headers = {}) => {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(url.split('?')[0] + ' answered ' + r.status);
  return r.json();
};

async function google() {
  if (!env.GOOGLE_PLACES_KEY || !env.GOOGLE_PLACE_ID) return null;
  const p = await get('https://places.googleapis.com/v1/places/' + encodeURIComponent(env.GOOGLE_PLACE_ID), {
    'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY,
    'X-Goog-FieldMask': 'rating,userRatingCount',
  });
  return { score: p.rating, count: p.userRatingCount };
}

/** the score and number of reviews on a Trustpilot review page: its structured data (AggregateRating), or the
    page's own data (trustScore, numberOfReviews) */
export function parseTrustpilot(html) {
  const num = (re) => {
    const m = re.exec(html);
    return m ? +String(m[1]).replace(/,/g, '') : NaN;
  };
  let score = num(/"trustScore"\s*:\s*"?([\d.]+)/),
    count = num(/"numberOfReviews"\s*:\s*\{[^}]*?"total"\s*:\s*(\d+)/);
  if (!(count >= 0)) count = num(/"numberOfReviews"\s*:\s*"?(\d[\d,]*)/);
  const agg = /"@type"\s*:\s*"AggregateRating"[^}]*\}/.exec(html);
  if (agg) {
    if (!(score > 0)) score = +((/"ratingValue"\s*:\s*"?([\d.]+)/.exec(agg[0]) || [])[1] || NaN);
    if (!(count >= 0)) count = +((/"reviewCount"\s*:\s*"?(\d[\d,]*)/.exec(agg[0]) || [])[1] || '').replace(/,/g, '');
  }
  return score > 0 && score <= 5 && count > 0 ? { score, count } : null;
}
async function trustpilotPage() {
  const domain = env.TRUSTPILOT_DOMAIN || 'broadlandwindows.co.uk';
  for (const host of ['uk.trustpilot.com', 'www.trustpilot.com']) {
    try {
      const r = await fetch('https://' + host + '/review/' + encodeURIComponent(domain), {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; BroadlandCRM review check)', 'accept-language': 'en-GB' },
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) {
        console.log(host + ' answered ' + r.status);
        continue;
      }
      const f = parseTrustpilot(await r.text());
      if (f) return f;
      console.log(host + ': no score found on the page');
    } catch (e) {
      console.log(host + ': ' + e.message);
    }
  }
  return null;
}

async function trustpilot() {
  if (!env.TRUSTPILOT_API_KEY) return trustpilotPage();
  const h = { apikey: env.TRUSTPILOT_API_KEY },
    domain = env.TRUSTPILOT_DOMAIN || 'broadlandwindows.co.uk';
  const unit = await get('https://api.trustpilot.com/v1/business-units/find?name=' + encodeURIComponent(domain), h);
  const b = await get('https://api.trustpilot.com/v1/business-units/' + encodeURIComponent(unit.id), h);
  return {
    score: (b.score && (b.score.trustScore ?? b.score.stars)) ?? null,
    count: b.numberOfReviews && b.numberOfReviews.total,
  };
}

async function main() {
  let before = {};
  try {
    before = JSON.parse(readFileSync(OUT, 'utf8'));
  } catch {
    /* first run */
  }
  const out = { ...before };
  let any = false;
  for (const [name, fn] of [
    ['google', google],
    ['trustpilot', trustpilot],
  ]) {
    try {
      const r = await fn();
      if (r) {
        out[name] = r;
        any = true;
        console.log(name + ': ' + r.score + ' from ' + r.count + ' reviews');
      } else console.log(name + (name == 'google' ? ': no keys set, skipped' : ': nothing found'));
    } catch (e) {
      console.log(name + ': ' + e.message + ' (keeping the last figures)');
    }
  }
  if (!any) {
    console.log('Nothing fetched; reviews.json left as it was.');
  } else {
    const same = JSON.stringify({ ...before, updated: 0 }) == JSON.stringify({ ...out, updated: 0 });
    if (same) console.log('Figures unchanged.');
    else {
      out.updated = new Date().toISOString();
      writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
      console.log('reviews.json updated.');
    }
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) == process.argv[1]) main();
