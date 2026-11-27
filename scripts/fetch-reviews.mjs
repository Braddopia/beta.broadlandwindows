/*
 * scripts/fetch-reviews.mjs: the daily review figures for the CRM.
 *
 * Run each morning by .github/workflows/reviews.yml. Asks Google (Places API) and Trustpilot (Business Units API)
 * for the company's current score and number of reviews and writes reviews.json beside index.html, which the site
 * reads (src/features/home/reviews.js). Keys come from the repository's Actions secrets, never from the code:
 *   GOOGLE_PLACES_KEY, GOOGLE_PLACE_ID      Google Cloud API key with the Places API (New) on, and the business's Place ID
 *   TRUSTPILOT_API_KEY                      from the Trustpilot Business developer page
 *   TRUSTPILOT_DOMAIN (variable, optional)  the website Trustpilot lists the business under (default below)
 * A site without its keys, or that does not answer, keeps yesterday's figures. With no keys at all nothing is written.
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

async function trustpilot() {
  if (!env.TRUSTPILOT_API_KEY) return null;
  const h = { apikey: env.TRUSTPILOT_API_KEY },
    domain = env.TRUSTPILOT_DOMAIN || 'broadlandwindows.co.uk';
  const unit = await get('https://api.trustpilot.com/v1/business-units/find?name=' + encodeURIComponent(domain), h);
  const b = await get('https://api.trustpilot.com/v1/business-units/' + encodeURIComponent(unit.id), h);
  return {
    score: (b.score && (b.score.trustScore ?? b.score.stars)) ?? null,
    count: b.numberOfReviews && b.numberOfReviews.total,
  };
}

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
    } else console.log(name + ': no keys set, skipped');
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
