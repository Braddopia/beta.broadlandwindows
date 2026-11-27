/*
 * scripts/fetch-brochures.mjs: the brochure list for the CRM's Files page.
 *
 * Run each morning by .github/workflows/reviews.yml. Reads the brochure page on broadlandwindows.co.uk, finds every
 * brochure file it links to (PDFs and cover images under /wp-content/uploads/), and writes brochures.json beside
 * index.html: [{ cat, title, url, firstSeen }]. The CRM shows that list, so a brochure added on the website appears
 * (marked New for 30 days) and one taken off the website disappears. A page that cannot be read, or that lists fewer
 * than 5 brochures, leaves yesterday's list alone. `node scripts/fetch-brochures.mjs --file page.html` reads a saved
 * copy instead (for testing).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'brochures.json');
const PAGES = ['https://www.broadlandwindows.co.uk/brochures/', 'https://www.broadlandwindows.co.uk/brochure/'];

const text = (h) =>
  String(h || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;|&ndash;/g, '-')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
const GENERIC =
  /^(download|view|open|click here|read more|brochure|pdf|here|see more|view brochure|download brochure)$/i;
/** a readable name from a file name: "HALLMARK-Colour-Lab-2025.pdf" -> "Hallmark Colour Lab 2025" */
const fromFile = (u) =>
  decodeURIComponent(u.split('/').pop())
    .replace(/\.(pdf|jpe?g|png|webp)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\bscaled\b|\bCOVER\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b([A-Z])([A-Z]{3,})\b/g, (m, a, b) => a + b.toLowerCase());
/** the range a brochure belongs to, from a heading near it or its own name */
export function guessCat(s) {
  const t = s.toLowerCase();
  if (/hardwood|timber|teknos|\boak\b|sash/.test(t)) return 'Hardwood';
  if (/secondary/.test(t)) return 'Secondary glazing';
  if (/lantern|roof/.test(t)) return 'Roof lanterns';
  if (/alu|smarts|alitherm|visofold|visoglide|signature/.test(t)) return 'Aluminium';
  if (/hallmark|composite|door/.test(t)) return 'Composite doors';
  if (/pvc|upvc|rose|\bjf\b|\blr\b|heritage|window/.test(t)) return 'PVCu';
  return 'Other';
}

/** every brochure file linked from the page HTML: [{ cat, title, url }] */
export function parseBrochures(html) {
  const out = new Map();
  const heads = [...html.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)].map((m) => ({ at: m.index, t: text(m[1]) }));
  for (const m of html.matchAll(
    /<a\b[^>]*href=["']([^"']+\/wp-content\/uploads\/[^"']+\.(?:pdf|jpe?g|png))["'][^>]*>([\s\S]*?)<\/a>/gi
  )) {
    const url = m[1].replace(/^\/\//, 'https://').replace(/^http:/, 'https:');
    if (out.has(url)) continue;
    let title = text(m[2]);
    if (!title || GENERIC.test(title) || title.length < 3) {
      const near = heads.filter((h) => h.at < m.index && m.index - h.at < 1500).pop();
      title = near && near.t && !GENERIC.test(near.t) ? near.t : fromFile(url);
    }
    const sect = heads
      .filter((h) => h.at < m.index)
      .map((h) => guessCat(h.t))
      .filter((c) => c != 'Other')
      .pop();
    out.set(url, { cat: sect || guessCat(title + ' ' + url), title: title.slice(0, 120), url });
  }
  return [...out.values()];
}

/** WordPress's own list of uploaded PDFs (the website runs on WordPress): used when the page lists none */
async function fromMedia() {
  const out = [];
  for (let page = 1; page <= 5; page++) {
    const r = await fetch(
      'https://www.broadlandwindows.co.uk/wp-json/wp/v2/media?mime_type=application/pdf&per_page=100&page=' + page,
      { headers: { 'user-agent': 'BroadlandCRM brochure check' }, signal: AbortSignal.timeout(20000) }
    );
    if (!r.ok) break;
    const L = await r.json();
    for (const m of L) {
      const url = String(m.source_url || '').replace(/^http:/, 'https:'),
        title = text((m.title && m.title.rendered) || '') || fromFile(url);
      if (
        /^https:\/\/(www\.)?broadlandwindows\.co\.uk\/wp-content\/uploads\//.test(url) &&
        /brochure|collection|colour|door|window|lantern|panel|glazing|smarts|hallmark|alitherm|teknos|heritage/i.test(
          title + url
        )
      )
        out.push({ cat: guessCat(title + ' ' + url), title: title.slice(0, 120), url });
    }
    if (L.length < 100) break;
  }
  return out;
}

async function main() {
  const fileArg = process.argv.indexOf('--file');
  let html = '';
  if (fileArg > 0) html = readFileSync(process.argv[fileArg + 1], 'utf8');
  else
    for (const u of PAGES) {
      try {
        const r = await fetch(u, {
          headers: { 'user-agent': 'BroadlandCRM brochure check' },
          signal: AbortSignal.timeout(20000),
        });
        if (r.ok) {
          html = await r.text();
          console.log('Read ' + u);
          break;
        }
        console.log(u + ' answered ' + r.status);
      } catch (e) {
        console.log(u + ': ' + e.message);
      }
    }
  let items = parseBrochures(html);
  console.log('Found ' + items.length + ' brochures on the page');
  if (items.length < 5) {
    /* what the page holds, so the log shows why nothing was found */
    console.log(
      'Page size ' +
        html.length +
        ', links to PDFs: ' +
        (html.match(/\.pdf/gi) || []).length +
        ', uploads: ' +
        (html.match(/wp-content\/uploads/gi) || []).length
    );
    console.log(
      'PDF mentions: ' +
        [...html.matchAll(/[^"'\s(]{0,120}\.pdf/gi)]
          .slice(0, 8)
          .map((m) => m[0])
          .join(' | ')
    );
    try {
      items = await fromMedia();
      console.log('Found ' + items.length + " brochures in the website's file list");
    } catch (e) {
      console.log('File list: ' + e.message);
    }
  }
  if (items.length < 5) {
    console.log('Too few to trust; brochures.json left as it was.');
    return;
  }
  let before = { items: [] };
  try {
    before = JSON.parse(readFileSync(OUT, 'utf8'));
  } catch {
    /* first run */
  }
  const seen = Object.fromEntries((before.items || []).map((x) => [x.url, x.firstSeen]));
  const first = !(before.items || []).length,
    day = new Date().toISOString().slice(0, 10);
  /* on the very first run nothing is "new": everything is dated a year back */
  const old = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const next = items.map((x) => ({ ...x, firstSeen: seen[x.url] || (first ? old : day) }));
  const same = JSON.stringify(next) == JSON.stringify(before.items);
  const added = next.filter((x) => !seen[x.url]).length,
    gone = (before.items || []).filter((x) => !items.some((y) => y.url == x.url)).length;
  console.log(added + ' new, ' + gone + ' removed');
  if (same) return console.log('No change.');
  writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), items: next }, null, 2) + '\n');
  console.log('brochures.json updated.');
}
if (process.argv[1] && fileURLToPath(import.meta.url) == process.argv[1]) main();
