/* features/search/site-index: every heading, number card, column, setting and field name on the pages
   this account can open, so a search finds things that are not in the page's title: "balance to collect",
   "vat", "deposit", "trickle vents". Built the first time it is needed, then kept for a minute.
   Clicking a match opens the page and highlights the spot. */
import { $$ } from '../../core/dom.js';
import { askWords, labelHit } from '../../domain/ask.js';
import { can, canSee } from '../../domain/permissions.js';
import { ROLE } from '../../data/session.js';
import { VIEWS, go, q as pageQuery, setQuery } from '../../ui/shell/router.js';
import { APPTF, CDETF, CFINF, CFITF, CUSTF, GDPRF, LEADF, OPF } from '../records/fields.js';
import { SVCF } from '../service/service.js';

/* pages that change something just by being drawn (messages mark chats read; the floor boards start timers) */
const SKIP = new Set(['messages', 'live']);
const PICK = 'h1,h2,h3,h4,th,label,dt,legend,.kpi > small,.set-r b,.chip';
let IDX = null,
  AT = 0,
  FOR = '';

const clean = (t) =>
  String(t || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*[*:]\s*$/, '')
    .trim();

/** what is on each page: [{ t: label, s: value shown with it, v: page }] */
export function siteIndex() {
  if (IDX && FOR == ROLE && Date.now() - AT < 60000) return IDX;
  const out = [],
    seen = new Set(),
    tpl = document.createElement('template'),
    /* draw each page as it looks with no search typed, so its numbers are the real totals */
    was = pageQuery;
  setQuery('');
  Object.entries(VIEWS).forEach(([v, V]) => {
    if (SKIP.has(v) || !canSee(v) || (v == 'admin' && !can('manage'))) return;
    let h = '';
    try {
      h = String(V.fn());
    } catch (e) {
      return;
    }
    tpl.innerHTML = h;
    tpl.content.querySelectorAll(PICK).forEach((e) => {
      const t = clean(
        e.firstChild && e.firstChild.nodeType == 3 && e.tagName == 'LABEL' ? e.firstChild.textContent : e.textContent
      );
      if (t.length < 3 || t.length > 48 || /^\d/.test(t)) return;
      const key = v + '|' + t.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      /* the value that goes with the label, where there is one: a number card's figure, a setting's value */
      const sib =
        e.tagName == 'DT' ? e.nextElementSibling : e.tagName == 'SMALL' ? e.parentElement.querySelector('b') : null;
      out.push({ t, s: sib ? clean(sib.textContent).slice(0, 60) : '', v });
    });
  });
  /* the boxes inside lead, contract and service call windows: "trickle vents", "postcode", "guarantee" */
  const box = (L, where, v) => {
    if (!canSee(v)) return;
    (L || []).forEach((f) => {
      const t = clean(Array.isArray(f) ? f[1] : f.l).replace(/\s*\(.*\)$/, '');
      if (!t || (f && f.t == 'h') || t.length > 48) return;
      const key = v + '|f|' + t.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ t, s: where + (f && f.g ? ', ' + f.g : ''), v, box: 1 });
    });
  };
  const W = { v: {} };
  try {
    box(CUSTF, 'Box in lead and contract windows', 'leads');
    box(LEADF(W), 'Box in lead windows', 'leads');
    box(OPF, 'Column in the Survey step', 'contracts');
    box(APPTF(), 'Box in Appointments', 'leads');
    box(GDPRF, 'Box in the GDPR step', 'leads');
    box(CDETF(W), 'Box in contract windows', 'contracts');
    box(CFINF(), 'Box in the Finance step', 'contracts');
    box(CFITF(), 'Box in the Fitting step', 'contracts');
    box(SVCF(), 'Box on the service call form', 'service');
  } catch (e) {
    /* a list that cannot be read here is simply left out */
  }
  setQuery(was);
  tpl.innerHTML = '';
  IDX = out;
  AT = Date.now();
  FOR = ROLE;
  return out;
}
/** does a label on some page match? Only looks if the index is already built: safe to call while a page draws */
export const siteKnows = (q) => {
  const W = askWords(q);
  return !!IDX && FOR == ROLE && W.length > 0 && IDX.some((x) => labelHit(W, x.t));
};
/** labels on any page that match every word of the question */
export function siteFind(q, max = 6) {
  const W = askWords(q);
  if (!W.length) return [];
  return siteIndex()
    .filter((x) => labelHit(W, x.t))
    .slice(0, max);
}
/** open the page and light up the label that was found */
export function siteGo(v, t) {
  go(v);
  if (siteIndex().some((x) => x.v == v && x.t == t && x.box)) return;
  setTimeout(() => {
    const want = String(t).toLowerCase();
    const el = [...$$('#main ' + PICK)].find((e) => clean(e.textContent).toLowerCase().startsWith(want));
    if (!el) return;
    const box = el.closest('.kpi,.set-r,.panel,.ff,dl > div,th,.chip') || el;
    box.scrollIntoView({ block: 'center', behavior: 'smooth' });
    box.classList.remove('sx-hit');
    void box.offsetWidth;
    box.classList.add('sx-hit');
    setTimeout(() => box.classList.remove('sx-hit'), 2600);
  }, 80);
}
/** forget the index (after data changes that add or remove labels) */
export const siteForget = () => (IDX = null);
