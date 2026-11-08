/* ui/forms/photos: Adding, showing and removing photos in a form. */
import { MAX_PHOTOS } from '../../config/constants.js';
import { onClick } from '../../core/actions.js';
import { $ } from '../../core/dom.js';
import { ICONS, svg } from '../../core/icons.js';
import { SAFE } from '../../core/sanitize.js';
import { toast } from '../toast.js';

/* photos being edited in the open form, and how to redraw them */
export function setPhotoList(list, draw) {
  tmp = list;
  tmpDraw = draw;
}
/* ---- generic form ----
   field: {k,l,t:text|number|date|select|area|colour|password|email|tel, o:[options], req, pos, ro, w:'full', scan, list, max, min, dp, hint} */
export let tmp = null,
  tmpDraw = null;
/* ---- photos: resized + compressed before storing, capped per record ---- */
/* photos as a grid of 8 glass boxes (2 rows of 4): filled ones show the photo, the next empty one adds more */
export function drawThumbs() {
  const t = $('#thumbs');
  if (!t) return;
  if (t.classList.contains('phg')) {
    const n = tmp.length;
    t.innerHTML = Array.from({ length: MAX_PHOTOS }, (_, i) =>
      i < n
        ? `<div class="phb on"><img src="${SAFE.img(tmp[i])}" alt="Photo ${i + 1}" ${onClick('viewPhoto', tmp[i])}><button type="button" aria-label="Remove photo ${i + 1}" ${onClick('rmPh', i)}>&times;</button></div>`
        : i == n
          ? `<label class="phb add" title="Add photos"><input type="file" accept="image/*" multiple hidden data-onchange="addPh" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]">${svg(ICONS.plus)}<span>Add</span></label>`
          : '<div class="phb" aria-hidden="true"></div>'
    ).join('');
    return;
  }
  t.innerHTML =
    tmp
      .map(
        (p, i) =>
          `<div class="th"><img src="${SAFE.img(p)}" alt="Photo ${i + 1}"><button type="button" aria-label="Remove photo" ${onClick('rmPh', i)}>&times;</button></div>`
      )
      .join('') || '<span class="muted">No photos yet.</span>';
}
export function rmPh(i) {
  tmp.splice(i, 1);
  tmpDraw && tmpDraw();
}
export function addPh(inp) {
  const files = [...inp.files].filter((f) => /^image\//.test(f.type));
  inp.value = '';
  const room = MAX_PHOTOS - tmp.length;
  if (room <= 0) {
    toast('Up to ' + MAX_PHOTOS + ' photos per record');
    return;
  }
  if (files.length > room)
    toast('Only the first ' + room + ' photo' + (room > 1 ? 's' : '') + ' were added (limit ' + MAX_PHOTOS + ')');
  files.slice(0, room).forEach((f) => {
    if (f.size > 25e6) {
      toast(f.name + ' is too large');
      return;
    }
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1280 / Math.max(img.width, img.height)),
        c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      tmp.push(c.toDataURL('image/jpeg', 0.7));
      URL.revokeObjectURL(img.src);
      tmpDraw && tmpDraw();
    };
    img.onerror = () => toast('That file could not be read as an image');
    img.src = URL.createObjectURL(f);
  });
}
export const gallery = (a) => {
  a = (a || []).filter(SAFE.img);
  return a.length
    ? `<div class="gal">${a.map((p, i) => `<img src="${SAFE.img(p)}" alt="Photo ${i + 1}" ${onClick('viewPhoto', p)}>`).join('')}</div>`
    : '';
};
export function viewPhoto(p) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(
    `<title>Photo</title><body style="margin:0;background:#111;display:grid;place-items:center;height:100vh"><img src="${SAFE.img(p)}" style="max-width:100%;max-height:100vh">`
  );
  w.document.close();
}
export const phCount = (a) =>
  a && a.length ? `<span class="tag n">${a.length} photo${a.length > 1 ? 's' : ''}</span>` : '';
