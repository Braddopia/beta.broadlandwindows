/* integrations/postcodes: where a UK postcode is, from postcodes.io (free, no key). Only postcodes are sent, never
   names or other details. Answers are remembered on this device so each postcode is looked up once. When a full
   postcode is not known (a made-up sample, a typo) its first half is tried, so the pin still lands in the right area.
   Nothing here touches the screen: callers get back { "NR6 5DR": { at: [lat, lon], q: 'pc' | 'out' } }. */
import { outcodeOf, pcNorm } from '../domain/postcode.js';

const KEY = 'bb_geo';
const API = 'https://api.postcodes.io';

function cacheRead() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || '{}');
    return c && typeof c == 'object' ? c : {};
  } catch (e) {
    return {};
  }
}
function cacheWrite(c) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch (e) {}
}
const valid = (x) =>
  x && Array.isArray(x.at) && x.at.length == 2 && x.at.every((n) => typeof n == 'number' && isFinite(n));

/** what is already known for these postcodes, without going online */
export function geoKnown(pcs) {
  const c = cacheRead(),
    out = {};
  pcs.forEach((p) => {
    const k = pcNorm(p);
    if (k && valid(c[k])) out[k] = c[k];
  });
  return out;
}

async function post(path, body) {
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit',
  });
  if (!r.ok) throw new Error('postcodes ' + r.status);
  return r.json();
}

/** look up every postcode not already known (100 at a time); resolves with all that are known afterwards.
    Never rejects: with no connection it simply returns what was known before. */
export async function geoLookup(pcs) {
  const want = [...new Set(pcs.map(pcNorm).filter(Boolean))],
    c = cacheRead(),
    todo = want.filter((p) => !valid(c[p]));
  try {
    const missed = [];
    for (let i = 0; i < todo.length; i += 100) {
      const j = await post('/postcodes', { postcodes: todo.slice(i, i + 100) });
      (j.result || []).forEach((x) => {
        const p = pcNorm(x.query),
          r = x.result;
        if (r && typeof r.latitude == 'number') c[p] = { at: [r.latitude, r.longitude], q: 'pc' };
        else missed.push(p);
      });
    }
    /* not found: place it at the middle of its outcode instead */
    const outs = [...new Set(missed.map(outcodeOf).filter(Boolean))].slice(0, 30),
      found = {};
    await Promise.all(
      outs.map((o) =>
        fetch(API + '/outcodes/' + encodeURIComponent(o), { credentials: 'omit' })
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => {
            const r = j && j.result;
            if (r && typeof r.latitude == 'number') found[o] = [r.latitude, r.longitude];
          })
          .catch(() => {})
      )
    );
    missed.forEach((p) => {
      const at = found[outcodeOf(p)];
      if (at) c[p] = { at, q: 'out' };
    });
    if (todo.length) cacheWrite(c);
  } catch (e) {
    /* offline or the service is down: carry on with what is known */
  }
  const out = {};
  want.forEach((p) => valid(c[p]) && (out[p] = c[p]));
  return out;
}
