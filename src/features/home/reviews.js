/* features/home/reviews: Review scores and quotes shown on the overview and documents. */
import { today } from '../../core/dates.js';
import { esc } from '../../core/dom.js';
import { SAFE } from '../../core/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { ISOWN, need } from '../auth/session.js';
import { stars } from '../../ui/components/tags.js';
import { form } from '../../ui/forms/form.js';
import { askYes } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';

/* review scores (Trustpilot / Google): figures set by an admin in Admin Console > Reviews */
export function ratingsH() {
  const r = (x, n) => {
    const u = SAFE.url(x.url),
      t = `${stars(x.score)} <b>${(+x.score).toFixed(1)}</b> on ${n}${x.count ? ' <span>(' + esc(x.count) + ' reviews)</span>' : ''}`;
    return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${t}</a>` : `<span>${t}</span>`;
  };
  const tt = state.brand.tt,
    rl = state.brand.rl,
    r10 = (x, n) => {
      const u = SAFE.url(x.url),
        t = `${stars((+x.score || 0) / 2)} <b>${(+x.score || 0).toFixed(1)}/10</b> on ${n}${x.count ? ' <span>(' + esc(x.count) + ' reviews)</span>' : ''}`;
      return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${t}</a>` : `<span>${t}</span>`;
    };
  return `<div class="rate">${r(state.brand.g, 'Google')}${r(state.brand.tp, 'Trustpilot')}${tt ? r(tt, 'Trusted Trader') : ''}${rl ? r10(rl, 'ReferenceLine') : ''}</div>`;
}
export function editRatings() {
  if (!need(ISOWN, 'Review scores')) return;
  const b = state.brand,
    tt = b.tt || {},
    rl = b.rl || {};
  form(
    'Review Scores',
    [
      { k: 'tps', l: 'Trustpilot score (0 to 5)', t: 'number', max: 5, dp: 1 },
      { k: 'tpc', l: 'Trustpilot review count', max: 12 },
      { k: 'tpu', l: 'Trustpilot page link', w: 'full', max: 300 },
      { k: 'gs', l: 'Google score (0 to 5)', t: 'number', max: 5, dp: 1 },
      { k: 'gc', l: 'Google review count', max: 12 },
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
  if (!need(ISOWN, 'Review quotes')) return;
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
  if (!need(ISOWN, 'Review quotes')) return;
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
