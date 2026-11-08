/* features/records/photos-docs: Photos and documents on a lead or contract. */
import { DOCTYPES, MAX_PHOTOS, PHTAGS } from '../../config/constants.js';
import { onClick, onEvent } from '../../core/actions.js';
import { $, esc } from '../../core/dom.js';
import { download } from '../../ui/download.js';
import { kb } from '../../core/format.js';
import { uuid } from '../../core/ids.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { MAX_UPLOAD, fx } from '../files/files.js';
import { recRail, recordWin } from './record-window.js';
import { emptyArt } from '../../ui/components/art.js';
import { tmp } from '../../ui/forms/photos.js';
import { askIn } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

export function docGuess(name, type) {
  const n = String(name).toLowerCase(),
    x = n.split('.').pop() || '';
  if (/quote|quotation|estimate/.test(n)) return 'Quote';
  if (/invoice|receipt/.test(n)) return 'Invoice';
  if (/fensa|certificate|cert\b|guarantee|warranty/.test(n)) return 'Certificate';
  if (/survey|measure/.test(n)) return 'Survey';
  if (/contract|agreement|terms/.test(n)) return 'Contract';
  if (/drawing|plan|elevation/.test(n) || ['dwg', 'dxf'].includes(x)) return 'Drawing';
  if (['xls', 'xlsx', 'csv', 'numbers'].includes(x) || /sheet|excel|csv/.test(type)) return 'Spreadsheet';
  if (/^image\//.test(type) || ['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'].includes(x)) return 'Photo';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(x) || /pdf|word|text/.test(type)) return 'Document';
  return 'Other';
}
export const docIcon = (t) =>
  ({
    Quote: '£',
    Invoice: '£',
    Certificate: '✓',
    Drawing: '⌗',
    Spreadsheet: '▦',
    Photo: '▣',
    Survey: '⌖',
    Contract: '✎',
  })[t] || '▤';
export const photoTab = (
  W
) => `<div class="rcols"><section class="rg wide"><h4><span>Photos</span><span class="acts"><label class="mini pri" style="cursor:pointer">Take photo<input type="file" accept="image/*" capture="environment" hidden data-onchange="addPh" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]"></label><label class="mini" style="cursor:pointer">Upload photos<input type="file" accept="image/*" multiple hidden data-onchange="addPh" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]"></label></span></h4><p class="muted" style="margin:.1rem 0 .6rem;font-size:.82rem">Up to ${MAX_PHOTOS} photos. Tag each one so survey, before and after shots are easy to find.</p><div class="thumbs rph" id="thumbs"></div></section>
  <section class="rg wide"><h4><span>Documents</span><label class="mini pri" style="cursor:pointer">Upload documents<input type="file" multiple hidden data-onchange="recDocUp" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]"></label></h4><p class="muted" style="margin:.1rem 0 .6rem;font-size:.82rem">Quotes, drawings, certificates, invoices. The type is picked from the file name and format, and you can change it. Files are kept on this device.</p><div id="recDocs" class="rdocs">Loading</div></section></div>`;
export function recThumbs() {
  const t = $('#thumbs');
  if (!t) return;
  const T = (recordWin.v.phTags = recordWin.v.phTags || []);
  while (T.length < tmp.length) T.push('Survey');
  T.length = tmp.length;
  t.innerHTML =
    tmp
      .map(
        (p, i) =>
          `<div class="th"><img src="${SAFE.img(p)}" alt="Photo ${i + 1}"><button type="button" aria-label="Remove photo" ${onClick('recRmPh', i)}>&times;</button><select class="phtag" ${onEvent('onchange', 'recPhTag', i, 'this.value')}>${PHTAGS.map((x) => `<option ${x == T[i] ? 'selected' : ''}>${x}</option>`).join('')}</select></div>`
      )
      .join('') || emptyArt('survey', 'No photos yet.');
}
export function recRmPh(i) {
  tmp.splice(i, 1);
  (recordWin.v.phTags || []).splice(i, 1);
  recordWin.dirty = 1;
  recThumbs();
  recRail();
}
export function recPhTag(i, v) {
  recordWin.v.phTags = recordWin.v.phTags || [];
  recordWin.v.phTags[i] = PHTAGS.includes(v) ? v : 'Other';
  recordWin.dirty = 1;
}
export const recRef = () => recordWin.kind + ':' + (recordWin.id || recordWin.v.id);
export async function recDocs() {
  const el = $('#recDocs');
  if (!el) return;
  try {
    const ref = recRef(),
      L = ((await fx('readonly', (s) => s.getAll())) || []).filter((f) => f.ref == ref).sort((a, b) => b.time - a.time);
    recordWin.docs = L;
    el.innerHTML =
      L.map(
        (f) =>
          `<div class="rdoc"><span class="rdi">${esc(docIcon(f.cat))}</span><span class="rdn"><b>${esc(f.name)}</b><small>${kb(f.size)} · ${new Date(f.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${esc(f.by || '')}</small></span><select ${onEvent('onchange', 'recDocType', f.id, 'this.value')}>${DOCTYPES.map((x) => `<option ${x == f.cat ? 'selected' : ''}>${x}</option>`).join('')}</select><span class="acts"><button class="mini" ${onClick('recDocOpen', f.id)}>Open</button><button class="mini" ${onClick('recDocDl', f.id)}>Download</button><button class="mini del" ${onClick('recDocDel', f.id)}>Remove</button></span></div>`
      ).join('') || emptyArt('files', 'No documents yet.');
    const sm = $('#mbox small[data-st="docs"]');
    if (sm)
      sm.textContent =
        tmp.length + ' photo' + (tmp.length == 1 ? '' : 's') + ', ' + L.length + ' doc' + (L.length == 1 ? '' : 's');
  } catch (e) {
    el.innerHTML = '<p class="empty">Document storage is not available in this browser.</p>';
  }
}
export async function recDocUp(inp) {
  if (recordWin.isNew) {
    toast('Save the record first, then add documents');
    inp.value = '';
    return;
  }
  let n = 0,
    skip = 0;
  const ref = recRef();
  try {
    for (const f of inp.files) {
      if (f.size > MAX_UPLOAD) {
        skip++;
        continue;
      }
      await fx('readwrite', (s) =>
        s.put({
          id: uuid(),
          ref,
          name: SAFE.text(f.name, 120),
          cat: docGuess(f.name, f.type),
          size: f.size,
          type: f.type,
          time: Date.now(),
          by: USER,
          blob: f,
        })
      );
      n++;
    }
    inp.value = '';
    if (n) audit('Document added', ref, n + ' file(s)');
    store();
    toast(n + ' added' + (skip ? ', ' + skip + ' too large' : ''));
    recDocs();
  } catch (e) {
    toast('Document storage is not available here');
  }
}
export async function recDocType(id, v) {
  const f = (recordWin.docs || []).find((x) => x.id == id);
  if (!f) return;
  f.cat = DOCTYPES.includes(v) ? v : 'Other';
  await fx('readwrite', (s) => s.put(f));
  recDocs();
}
export function recDocOpen(id) {
  const f = (recordWin.docs || []).find((x) => x.id == id);
  if (!f) return;
  if (/^(application\/pdf|image\/(png|jpe?g|gif|webp)|text\/plain)/.test(f.blob.type))
    window.open(URL.createObjectURL(f.blob), '_blank', 'noopener');
  else download(f.name, f.blob);
}
export function recDocDl(id) {
  const f = (recordWin.docs || []).find((x) => x.id == id);
  if (f) download(f.name, f.blob);
}
export function recDocDel(id) {
  const f = (recordWin.docs || []).find((x) => x.id == id);
  if (!f) return;
  askIn('Remove ' + f.name + '?', 'It is deleted from this device.', 'Remove', () => recDocGo(f), true);
}
export function recDocGo(f) {
  fx('readwrite', (s) => s.delete(f.id)).then(() => {
    audit('Document removed', recRef(), f.name);
    store();
    recDocs();
  });
}
/* when a lead becomes a contract, its documents move with it */
export async function docsMove(from, to) {
  try {
    const L = ((await fx('readonly', (s) => s.getAll())) || []).filter((f) => f.ref == from);
    for (const f of L) {
      f.ref = to;
      await fx('readwrite', (s) => s.put(f));
    }
  } catch (e) {}
}
