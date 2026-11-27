/* features/home/reviews: Review scores and quotes shown on the overview and documents. */
import { fdl, today } from '../../core/dates.js';
import { esc } from '../../core/dom.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { need } from '../auth/session.js';
import { stars } from '../../ui/components/tags.js';
import { form } from '../../ui/forms/form.js';
import { askYes } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { applyReviewFeed } from '../../domain/review-feed.js';

/* ---- the daily review figures ----
   A GitHub job (.github/workflows/reviews.yml) asks Google and Trustpilot for the latest score and review count each
   morning and writes reviews.json beside the site. The site reads it on opening and every 3 hours; Trusted Trader and
   ReferenceLine have no feed and stay as typed in Admin Console. A file opened from the computer has no feed. */
const FEED_EVERY = 3 * 3600 * 1000;
/** read reviews.json (or use the figures given, for tests) and update the scores if they changed */
/* how the automatic update is doing, for Admin Console: 'local' (file opened from the computer), 'none' (no
   reviews.json yet: the keys have not been added), 'ok' (figures received) or '' (not checked yet) */
let feedState = '';
export const reviewFeedState = () => feedState;
/* Admin Console shows the state, so it is drawn again once the answer is known */
const setFeed = (st) => {
  const was = feedState;
  feedState = st;
  if (was != st && document.body.dataset.view == 'admin') render(true);
};
export async function reviewFeed(feed) {
  if (!feed) {
    if (!/^https?:$/.test(location.protocol)) {
      setFeed('local');
      return;
    }
    try {
      const r = await fetch('reviews.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) {
        setFeed('none');
        return;
      }
      feed = await r.json();
    } catch (e) {
      setFeed('none');
      return;
    }
  }
  setFeed('ok');
  const changed = applyReviewFeed(state.brand, feed);
  if (feed && feed.updated) state.brand.feedAt = SAFE.text(String(feed.updated), 40);
  if (!changed.length) return;
  audit('Review scores updated automatically', 'Brand', changed.join(', '));
  store();
  render(true);
}
/* start-up step (run once by main.js) */
export function startReviewFeed() {
  reviewFeed();
  setInterval(reviewFeed, FEED_EVERY);
}
/* review scores (Trustpilot / Google): updated each morning from reviews.json; Trusted Trader and ReferenceLine set by
   an admin in Admin Console > Reviews.
   On a phone only the stars and the platform show (the score and the number of reviews are hidden in CSS). */
export function ratingsH() {
  const r = (x, n) => {
    const u = SAFE.url(x.url),
      t = `${stars(x.score)} <b class="rt-n">${(+x.score).toFixed(1)}/5</b> <span class="rt-on">on</span> ${n}${x.count ? ' <span class="rt-c">(' + esc(x.count) + ' reviews)</span>' : ''}`;
    return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${t}</a>` : `<span>${t}</span>`;
  };
  const tt = state.brand.tt,
    rl = state.brand.rl,
    r10 = (x, n) => {
      const u = SAFE.url(x.url),
        t = `${stars((+x.score || 0) / 2)} <b class="rt-n">${(+x.score || 0).toFixed(1)}/10</b> <span class="rt-on">on</span> ${n}${x.count ? ' <span class="rt-c">(' + esc(x.count) + ' reviews)</span>' : ''}`;
      return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${t}</a>` : `<span>${t}</span>`;
    };
  return `<div class="rate">${r(state.brand.g, 'Google')}${r(state.brand.tp, 'Trustpilot')}${tt ? r(tt, 'Trusted Trader') : ''}${rl ? r10(rl, 'ReferenceLine') : ''}</div>`;
}
export function editRatings() {
  if (!need('manage', 'Review scores')) return;
  const b = state.brand,
    tt = b.tt || {},
    rl = b.rl || {},
    auto =
      'Updated automatically each morning' + (b.feedAt ? ' (last ' + fdl(String(b.feedAt).slice(0, 10)) + ')' : '');
  form(
    'Review Scores',
    [
      { k: 'tps', l: 'Trustpilot score (0 to 5)', t: 'number', max: 5, dp: 1 },
      { k: 'tpc', l: 'Trustpilot review count', max: 12, hint: auto },
      { k: 'tpu', l: 'Trustpilot page link', w: 'full', max: 300 },
      { k: 'gs', l: 'Google score (0 to 5)', t: 'number', max: 5, dp: 1 },
      { k: 'gc', l: 'Google review count', max: 12, hint: auto },
      { k: 'gu', l: 'Google reviews link', w: 'full', max: 300 },
      { k: 'tts', l: 'Trusted Trader score (0 to 5)', t: 'number', max: 5, dp: 1 },
      { k: 'ttc', l: 'Trusted Trader review count', max: 12 },
      { k: 'ttu', l: 'Trusted Trader page link', w: 'full', max: 300 },
      { k: 'rls', l: 'ReferenceLine score (0 to 10)', t: 'number', max: 10, dp: 1 },
      { k: 'rlc', l: 'ReferenceLine review count', max: 12 },
      { k: 'rlr', l: 'ReferenceLine % recommend', t: 'number', max: 100, dp: 0 },
      { k: 'rlu', l: 'ReferenceLine page link', w: 'full', max: 300 },
    ],
    {
      tps: b.tp.score,
      tpc: b.tp.count,
      tpu: b.tp.url,
      gs: b.g.score,
      gc: b.g.count,
      gu: b.g.url,
      tts: tt.score,
      ttc: tt.count,
      ttu: tt.url,
      rls: rl.score,
      rlc: rl.count,
      rlr: rl.rec,
      rlu: rl.url,
    },
    (o) => {
      if ([o.tpu, o.gu, o.ttu, o.rlu].some((u) => u && !SAFE.url(u))) {
        toast('Links must start with https://');
        return false;
      }
      b.tp = { score: o.tps, count: o.tpc, url: o.tpu };
      b.g = { score: o.gs, count: o.gc, url: o.gu };
      b.tt = { score: o.tts, count: o.ttc, url: o.ttu };
      b.rl = { score: o.rls, count: o.rlc, rec: o.rlr, url: o.rlu };
      audit('Review scores updated', 'Brand', [o.tps, o.gs, o.tts, o.rls].join(' / '));
    },
    false,
    'md'
  );
}
/* review quotes for the office board (no reviewer names) */
export function addQuote() {
  if (!need('manage', 'Review quotes')) return;
  form(
    'Add Review Quote',
    [
      {
        k: 'src',
        l: 'Where it was posted',
        t: 'select',
        o: ['Trusted Trader', 'ReferenceLine', 'Google', 'Trustpilot', 'Facebook', 'Other'],
        req: 1,
      },
      { k: 'd', l: 'Date', t: 'date' },
      { k: 't', l: 'What they said (leave out their name)', t: 'area', w: 'full', max: 400, req: 1 },
    ],
    { src: 'Trusted Trader', d: today() },
    (o) => {
      state.brand.quotes = state.brand.quotes || [];
      state.brand.quotes.unshift({ src: o.src, d: o.d, t: o.t });
      audit('Review quote added', 'Brand', o.src);
    },
    false,
    'md'
  );
}
export function delQuote(i) {
  if (!need('manage', 'Review quotes')) return;
  askYes(
    'Remove This Quote?',
    'It will no longer show on the office board.',
    'Remove',
    () => {
      state.brand.quotes.splice(i, 1);
      audit('Review quote removed', 'Brand', '');
      store();
      render();
    },
    true
  );
}

/** one line for Admin Console: whether Google and Trustpilot update by themselves */
export function reviewFeedLine() {
  const st = reviewFeedState(),
    at = state.brand.feedAt;
  return st == 'ok'
    ? `<p class="rv-feed ok">Google and Trustpilot update automatically each morning${at ? ' (last ' + esc(fdl(String(at).slice(0, 10))) + ')' : ''}.</p>`
    : st == 'none'
      ? '<p class="rv-feed off">Automatic updates are not set up yet: the Google and Trustpilot keys still need adding in GitHub (see the handover notes). Until then, type the latest figures with Update scores.</p>'
      : st == 'local'
        ? '<p class="rv-feed off">Opened from a file on this computer, so the automatic review figures are not read here. The website reads them.</p>'
        : '';
}
