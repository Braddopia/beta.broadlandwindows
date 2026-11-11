/* features/settings/doc-builder: Settings, Printed Documents. Pick a document on the left, switch its parts
   on or off on the right: logo, key figures, details, each table, photos, signatures, barcode and so on.
   Changes apply to the next print straight away, are saved, and are recorded in the audit log. */
import { onClick, onEvent } from '../../core/actions.js';
import { html, raw } from '../../core/html.js';
import { ICONS, svg } from '../../core/icons.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { DOCS, docInfo, docOff, docOn, docReset, docSet, docTables } from '../../print/doc-options.js';
import { openModal } from '../../ui/modal.js';
import { need } from '../auth/session.js';
import { can } from '../../domain/permissions.js';

let SEL = DOCS[0].k;

/** the Printed Documents card in Settings */
export function docCard() {
  const groups = [...new Set(DOCS.map((d) => d.g))];
  return html`<section class="panel set-c">
    <h2><span class="set-ic">${raw(svg(ICONS.reports))}</span><span>Printed Documents</span><button class="btn sm" ${raw(onClick('docBuilder'))}>Customise</button></h2>
    ${groups.map((g) => {
      const L = DOCS.filter((d) => d.g == g),
        off = L.reduce((t, d) => t + docOff(d.k), 0);
      return raw(
        `<div class="set-r"><span><b>${g}</b><small>${off ? off + ' part' + (off == 1 ? '' : 's') + ' hidden' : 'Showing everything'}</small></span><span class="set-a"><button class="btn ghost sm" ${onClick('docBuilder', L[0].k)}>Open</button></span></div>`
      );
    })}
  </section>`;
}
/** the builder pop-up, opened at one document */
export function docBuilder(k) {
  if (!need('manage', 'Changing printed documents')) return;
  if (typeof k == 'string' && docInfo(k)) SEL = k;
  const d = docInfo(SEL),
    groups = [...new Set(DOCS.map((x) => x.g))],
    tables = docTables(SEL),
    sw = (part, label) =>
      raw(
        `<label class="db-sw"><input type="checkbox" ${docOn(SEL, part) ? 'checked' : ''} ${onEvent('onchange', 'docToggle', SEL, part, 'this.checked')}><span>${html`${label}`}</span></label>`
      );
  openModal(
    String(html`<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>Document Builder</h2>
      <p class="muted db-intro">Choose what each printed document shows. Everything is on until you switch it off, and the next print uses your choice.</p>
      <div class="db">
        <nav class="db-l" aria-label="Documents">${groups.map(
          (g) =>
            html`<div class="db-g">${g}</div>${DOCS.filter((x) => x.g == g).map(
              (x) =>
                html`<button class="db-d ${x.k == SEL ? 'on' : ''}" ${raw(onClick('docBuilder', x.k))}><span>${x.n}</span>${docOff(x.k) ? html`<i>${docOff(x.k)} off</i>` : ''}</button>`
            )}`
        )}</nav>
        <section class="db-r">
          <h3>${d.n}<small>${d.cus ? 'Customer copy' : 'For the team'}</small></h3>
          <div class="db-sws">${d.parts.map(([p, l]) => sw(p, l))}</div>
          ${
            d.k == 'Stock labels'
              ? ''
              : html`<h4>Tables And Sections</h4>${
                  tables.length
                    ? html`<div class="db-sws">${tables.map((t) => sw('t:' + t, t))}</div>`
                    : html`<p class="muted db-none">Print this document once and its tables will be listed here to switch on or off.</p>`
                }`
          }
          <div class="db-f"><button class="btn ghost sm" ${raw(onClick('docResetOne', SEL))}>Show Everything Again</button></div>
        </section>
      </div>
      <div class="mact"><button class="btn" data-act="closeModal">Done</button></div>`),
    'lg'
  );
}
/** a switch was flipped */
export function docToggle(k, part, on) {
  if (!can('manage') || !need('manage', 'Changing printed documents')) return;
  docSet(k, part, !!on);
  store();
  audit('Document changed', (docInfo(k) || { n: k }).n, part.replace(/^t:/, '') + (on ? ' shown' : ' hidden'));
  docBuilder(k);
}
export function docResetOne(k) {
  if (!need('manage', 'Changing printed documents')) return;
  docReset(k);
  store();
  audit('Document reset', (docInfo(k) || { n: k }).n, 'Showing everything');
  docBuilder(k);
}
