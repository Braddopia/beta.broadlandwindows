/* integrations/hallmark: Hallmark job feed: importing and syncing hardwood deliveries. */
import { today } from '../core/dates.js';
import { $, esc } from '../core/dom.js';
import { SAFE } from '../data/sanitize.js';
import { store } from '../data/persistence.js';
import { state } from '../data/state.js';
import { closeModal, openModal } from '../ui/modal.js';
import { render } from '../ui/shell/router.js';
import { toast } from '../ui/toast.js';

/* ==========================================================================
   06 · Operations: factory floor, deliveries, suppliers,
        Hallmark feed, Smart Orders import
   ========================================================================== */
export const HM_URL = '';
export const hmS = () => state.suppliers.find((x) => x.hm) || { name: 'Hallmark', url: HM_URL };
/* ---------------- Hallmark feed ---------------- */
export const HMSNAP = [];
/* no sample orders in the public build */
export function seedHM() {
  if (state.hmSeeded || state.deliveries.some((d) => d.hm)) return;
  state.hmSeeded = 1;
  const td = today(),
    nm = hmS().name;
  HMSNAP.forEach(([j, ref, desc, due, qc, pod]) =>
    state.deliveries.push({
      id: 'H-' + j,
      supplier: nm,
      items: desc + ', ' + j,
      contract: ref,
      due,
      status: pod ? 'Received' : qc && due < td ? 'In transit' : 'Due',
      stage: pod ? 'Delivered' : qc ? 'QC Done' : 'In Production',
      hm: 1,
    })
  );
  store();
}
export const toIso = (d) => (d ? d.split('/').reverse().join('-') : '');
export function parseHM(txt) {
  const t = String(txt).replace(/\s+/g, ' ').slice(0, 2e6),
    out = [];
  out.pageTotal = +((t.match(/\bJobs\s+(\d+)/) || [])[1] || 0) || null;
  t.split(/Job:\s*/)
    .slice(1)
    .forEach((b) => {
      const g = (re) => {
          const m = b.match(re);
          return m && m[1] ? m[1].trim() : '';
        },
        job = SAFE.code(b.split(' ')[0]),
        ref = SAFE.text(g(/Ref:\s*(.*?)\s+Desc:/), 80),
        desc = SAFE.text(g(/Desc:\s*(.*?)\s+Orig\. Load Date:/), 120),
        load = g(/(?<!Orig\. )Load Date:\s*(\d{2}\/\d{2}\/\d{4})/),
        pod = /POD Link:\s*Click Here/i.test(b),
        ms = [];
      for (const m of b.matchAll(/\b([A-Z][A-Za-z]+) Date:\s*(\d{2}\/\d{2}\/\d{4})?/g))
        if (m[1] != 'Load') ms.push([m[1], m[2] ? toIso(m[2]) : '']);
      const qc = ms.find((x) => x[0] == 'QC'),
        qd = !!(qc && qc[1]),
        started = ms.some((x) => x[0] != 'QC' && x[1]),
        due = SAFE.date(toIso(load));
      if (job && due)
        out.push({
          id: 'H-' + job,
          items: (desc || 'Hallmark job') + ', ' + job,
          contract: ref,
          due,
          qc: qd,
          pod,
          ms: ms.slice(0, 12),
          stage: pod ? 'Delivered' : qd ? 'QC Done' : started ? 'In Factory' : 'Not Started',
        });
    });
  return out;
}
export function importHM(txt, quiet, src) {
  const J = parseHM(txt);
  if (!J.length) {
    if (!quiet) toast('No Hallmark jobs found in that text');
    return false;
  }
  const td = today(),
    nm = hmS().name;
  J.forEach((j) => {
    const ex = state.deliveries.find((d) => d.id == j.id),
      st = (ex && ex.status == 'Received') || j.pod ? 'Received' : j.qc && j.due < td ? 'In transit' : 'Due',
      o = {
        id: j.id,
        supplier: nm,
        items: j.items,
        contract: j.contract,
        due: j.due,
        status: st,
        stage: j.stage,
        ms: j.ms,
        hm: 1,
      };
    if (ex) Object.assign(ex, o);
    else state.deliveries.push(o);
  });
  state.hmSync = Date.now();
  state.hmInfo = { t: Date.now(), src: src || 'paste', n: J.length, total: J.pageTotal };
  store();
  if (!(quiet && $('.ov.open'))) render();
  if (!quiet)
    toast(
      'Hallmark: ' +
        J.length +
        ' jobs read' +
        (J.pageTotal && J.pageTotal != J.length ? ' (page says ' + J.pageTotal + ')' : '')
    );
  return true;
}
export async function syncHM(quiet) {
  const h = hmS(),
    tries = [
      [SAFE.url(h.feed) || 'hallmark.php', 'relay'],
      [SAFE.url(h.url) || HM_URL, 'direct'],
    ];
  if (location.protocol == 'file:') tries.shift();
  if (!tries.some(([u]) => u)) {
    if (!quiet) toast('Add the supplier status page under Suppliers > Edit first');
    return false;
  }
  for (const [u, src] of tries.filter(([u]) => u)) {
    try {
      const r = await fetch(u, { cache: 'no-store', credentials: 'omit' });
      if (!r.ok) continue;
      const d = new DOMParser().parseFromString(await r.text(), 'text/html');
      if (importHM(d.body.textContent, quiet, src)) return true;
    } catch (e) {}
  }
  state.hmInfo = Object.assign(state.hmInfo || {}, { fail: Date.now() });
  if (!quiet) hmPaste();
  return false;
}
export function hmPaste() {
  openModal(
    `<h2>Import Hallmark Jobs</h2><p class="muted">Your browser blocks reading the Hallmark page directly. Open it, press Ctrl+A then Ctrl+C, and paste it here. For automatic sync, upload the hallmark.php relay file next to this dashboard.</p>${SAFE.url(hmS().url) ? `<p><a class="btn ghost sm" href="${esc(SAFE.url(hmS().url))}" target="_blank" rel="noopener noreferrer">Open Supplier Page</a></p>` : ''}<div class="ff"><textarea id="hmt" rows="8" placeholder="Paste Hallmark page text here"></textarea></div><div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" data-act="importHMGo">Import</button></div>`
  );
}
export function importHMGo() {
  importHM($('#hmt').value);
  closeModal();
}
