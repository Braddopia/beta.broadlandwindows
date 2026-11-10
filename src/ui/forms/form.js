/* ui/forms/form: Plain forms: fields, required star and admin lock, reading and checking what was typed. */
import { fieldControl } from './fields.js';
import { MAX_PHOTOS } from '../../config/constants.js';
import { onClick } from '../../core/actions.js';
import { $, $$, esc } from '../../core/dom.js';
import { ICONS, svg } from '../../core/icons.js';
import { SAFE } from '../../data/sanitize.js';
import { store } from '../../data/persistence.js';
import { OWNERS, RANDOM_SP } from '../../domain/people.js';
import { can } from '../../domain/permissions.js';
import { drawThumbs, setPhotoList, tmp } from './photos.js';
import { doneIn, openModal } from '../modal.js';
import { render } from '../shell/router.js';
import { toast } from '../toast.js';

/* labels: required boxes get a red star, admin-only boxes a lock (same everywhere) */
export const MARK = (req, adm) =>
  (req ? '<span class="rq" aria-hidden="true">*</span><span class="sr"> (required)</span>' : '') +
  (adm
    ? `<span class="lockd" title="Only administrators can change this" aria-label="Only administrators can change this">${svg(ICONS.lock)}</span>`
    : '');
/* "next" fields: Mobile 2 shows once Mobile 1 has something in it, and so on */
export const nxHid = (f, v) => !!f.nx && !String(v[f.nx] ?? '').trim() && !String(v[f.k] ?? '').trim();
export function form(title, fields, v, cb, photos, size) {
  v = v || {};
  setPhotoList(photos ? (v.photos || []).filter(SAFE.img).slice() : null, drawThumbs);
  const inp = (f) => fieldControl(f, v[f.k]);
  openModal(
    `<h2>${esc(title)}</h2><div class="grid">${fields.map((f) => (f.t == 'h' ? `<h3 class="fsec full">${esc(f.l)}</h3>` : `<div class="ff ${f.w || ''}"><label for="f_${f.k}">${esc(f.l)}${MARK(f.req, f.adm)}</label>${f.scan ? `<div class="inl">${inp(f)}<button type="button" class="btn scan sm" ${onClick('scanInto', 'f_' + f.k)}>Scan</button></div>` : inp(f)}${f.hint ? `<span class="hint ${/https?:|@/.test(f.hint) ? 'nocap' : ''}">${esc(f.hint)}</span>` : ''}</div>`)).join('')}
   ${photos ? `<div class="ff full"><label>Photos <span class="muted">(up to ${MAX_PHOTOS})</span></label>${typeof photos == 'string' ? `<span class="hint">${esc(photos)}</span>` : ''}<div class="thumbs phg" id="thumbs"></div><div class="prow"><label class="btn ghost sm">Take photo<input type="file" accept="image/*" capture="environment" hidden data-onchange="addPh" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]"></label><label class="btn ghost sm">Choose from gallery<input type="file" accept="image/*" multiple hidden data-onchange="addPh" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]"></label></div></div>` : ''}</div>
   <div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" id="saveBtn">Save changes</button></div>`,
    size || 'md'
  ); /* every plain form is the same width */
  if (photos) drawThumbs();
  $('#saveBtn').onclick = () => {
    const o = readFields(fields);
    if (!o) return;
    if (photos) o.photos = tmp;
    const bx = $('#mbox'),
      mk = bx.firstElementChild;
    if (cb(o) === false) return;
    store();
    render();
    if ($('#modal').classList.contains('open') && bx.firstElementChild === mk) doneIn('Saved');
  };
}
/* read + validate form fields; returns null (and focuses the field) when invalid */
/* show a problem next to the box itself (and still as a message at the bottom) */
export function fieldErr(e, msg) {
  toast(msg);
  const w = e.closest('.rf,.ff');
  if (w) {
    w.classList.add('err');
    let m = w.querySelector('.ferr');
    if (!m) {
      m = document.createElement('em');
      m.className = 'ferr';
      w.appendChild(m);
    }
    m.textContent = msg;
    const d = w.closest('details');
    if (d) d.open = true;
    const sg = w.closest('.rg.shut');
    if (sg) sg.classList.remove('shut');
    const clr = () => {
      w.classList.remove('err');
      m.remove();
      e.removeEventListener('input', clr);
      e.removeEventListener('change', clr);
    };
    e.addEventListener('input', clr);
    e.addEventListener('change', clr);
  }
  const p = e.closest('.rw-p');
  if (p && !p.classList.contains('on') && HOOKS.showStep) HOOKS.showStep(p.dataset.t);
  e.focus();
  if (e.scrollIntoView) e.scrollIntoView({ block: 'center' });
}
export function readFields(fields) {
  const o = {};
  for (const f of fields) {
    if (f.t == 'h') continue;
    const e = $('#f_' + f.k);
    if (!e) continue;
    if (f.adm && !can('money')) continue;
    const raw = (e.value || '').trim(),
      lab = f.l.replace(/ \(.*\)/, '');
    if (f.req && !raw) {
      fieldErr(e, lab + ' must be filled in');
      return null;
    }
    if (f.t == 'number') {
      if (raw === '') {
        o[f.k] = 0;
        continue;
      }
      const n = SAFE.num(raw, { min: f.min ?? 0, max: f.max ?? 1e9, dp: f.dp ?? 2 });
      if (n == null || (f.pos && !(n > 0))) {
        fieldErr(e, lab + ' must be a ' + (f.pos ? 'positive ' : '') + 'number');
        return null;
      }
      if (parseFloat(raw) != n && (parseFloat(raw) < (f.min ?? 0) || parseFloat(raw) > (f.max ?? 1e9))) {
        fieldErr(e, lab + ' must be between ' + (f.min ?? 0) + ' and ' + (f.max ?? 1e9));
        return null;
      }
      o[f.k] = n;
    } else if (f.t == 'date') {
      if (raw && !SAFE.date(raw)) {
        fieldErr(e, lab + ' is not a valid date');
        return null;
      }
      o[f.k] = raw;
    } else if (f.t == 'email') {
      if (raw && !SAFE.email(raw)) {
        fieldErr(e, lab + ' does not look like an email address');
        return null;
      }
      o[f.k] = raw;
    } else o[f.k] = SAFE.text(raw, f.t == 'area' ? f.max || 2000 : f.max || 120);
    if (f.t == 'colour') o[f.k + 'Hex'] = raw ? SAFE.hex($('#f_' + f.k + '_hex').value) : '';
  }
  return o;
}
export function scanInto(id) {
  if (!HOOKS.scan) return;
  HOOKS.scan((c) => {
    const e = $('#' + id);
    if (e) {
      e.value = c;
      e.dispatchEvent(new Event('input'));
    }
  });
}
/* Pages plug in here at start-up, so ui/ never imports a page: the record window (open the step a
   box is on), the barcode scanner, and the supplier list's "add a new company" choice. */
const HOOKS = { showStep: null, scan: null, newCompany: null };
export function plugInForms(h) {
  Object.assign(HOOKS, h);
}
export function fieldH(f, v) {
  const val = v[f.k] ?? '';
  let inp = fieldControl(f, val);
  /* a Scan button beside the box when the scanner is plugged in */
  if (f.scan && HOOKS.scan && !f.ro)
    inp = `<div class="inl">${inp}<button type="button" class="btn scan sm" ${onClick('scanInto', 'f_' + f.k)}>${svg(ICONS.scan)}Scan</button></div>`;
  return `<div class="ff ${f.w || ''}" ${f.nx ? `data-nx="${f.nx}"` : ''} ${nxHid(f, v) ? 'hidden' : ''}><label for="f_${f.k}">${esc(f.l)}${MARK(f.req, f.adm)}</label>${inp}${f.hint ? `<span class="hint ${/https?:|@/.test(f.hint) ? 'nocap' : ''}">${esc(f.hint)}</span>` : ''}</div>`;
}
/* start-up step (run once by main.js) */
export function listenForFormChanges() {
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.tagName == 'SELECT' && HOOKS.newCompany && el.value === HOOKS.newCompany.value) {
      HOOKS.newCompany.open();
      return;
    }
    if (el.tagName == 'SELECT' && el.value === RANDOM_SP) {
      const L = OWNERS().filter((x) => x != 'Unassigned');
      const pick = L[Math.floor(Math.random() * L.length)] || 'Unassigned';
      el.value = pick;
      toast('Picked at random: ' + pick);
    }
  });
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.id || !el.id.startsWith('f_')) return;
    const k = el.id.slice(2);
    $$(`#mbox [data-nx="${k}"]`).forEach((r) => {
      const own = r.querySelector('input,select,textarea');
      r.hidden = !el.value.trim() && !(own && own.value.trim());
    });
  });
}
