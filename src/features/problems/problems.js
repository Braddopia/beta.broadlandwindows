/* features/problems/problems: Reporting a problem, and the list administrators see. */
import { BUG_SEV } from '../../config/constants.js';
import { onClick } from '../../core/actions.js';
import { $ } from '../../core/dom.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { ROLE } from '../../data/session.js';
import { need } from '../auth/session.js';
import { form } from '../../ui/forms/form.js';
import { askIn, closeModal, parkModal } from '../../ui/modal.js';
import { VIEWS, render, view } from '../../ui/shell/router.js';
import * as repos from '../../data/repository.js';

/** the Report A Problem button (bottom right of every screen): notes where the person was and,
    where the browser allows, takes a picture of the screen they are looking at to attach */
export async function bugHere() {
  const t = $('#modal').classList.contains('open') ? ($('#mbox h2') || {}).textContent || '' : '',
    page = (VIEWS[view] || {}).t || '';
  if (/report a problem/i.test(t)) return;
  const shot = await grabScreen();
  parkModal();
  bugReport(t ? page + ': ' + t.trim().slice(0, 60) + ' window' : page, shot);
}
/* a picture of this tab. The browser asks first ("share this tab"); saying no just skips the picture.
   Nothing leaves the computer: the picture is saved with the report like any other photo. */
async function grabScreen() {
  const md = navigator.mediaDevices;
  if (!md || !md.getDisplayMedia || !matchMedia('(pointer:fine)').matches) return null;
  let stream;
  try {
    stream = await md.getDisplayMedia({
      video: { displaySurface: 'browser' },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
    });
    const v = document.createElement('video');
    v.muted = true;
    v.srcObject = stream;
    await v.play();
    await new Promise((r) => setTimeout(r, 350));
    const k = Math.min(1, 1600 / (v.videoWidth || 1600)),
      c = document.createElement('canvas');
    c.width = Math.round((v.videoWidth || 1) * k);
    c.height = Math.round((v.videoHeight || 1) * k);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    return c.width > 1 ? c.toDataURL('image/jpeg', 0.82) : null;
  } catch (e) {
    return null;
  } finally {
    if (stream) stream.getTracks().forEach((x) => x.stop());
  }
}
export function bugReport(where, shot) {
  const views = Object.values(VIEWS).map((v) => v.t);
  form(
    'Report A Problem',
    [
      {
        k: 'where',
        l: 'Where was it?',
        t: 'select',
        o: ['', ...views, 'Lead or contract window', 'Printing or reports', 'Something else'],
        req: 1,
      },
      { k: 'sev', l: 'How bad is it?', t: 'select', o: BUG_SEV, req: 1 },
      {
        k: 'what',
        l: 'What went wrong?',
        t: 'area',
        w: 'full',
        max: 1000,
        req: 1,
        hint: 'Say what you expected and what happened instead',
      },
      { k: 'steps', l: 'What were you doing just before?', t: 'area', w: 'full', max: 600 },
    ],
    {
      where: typeof where == 'string' && where ? where : (VIEWS[view] || {}).t || '',
      sev: BUG_SEV[1],
      photos: typeof shot == 'string' ? [shot] : [],
    },
    (o) => {
      const n = state.bugs.reduce((m, b) => Math.max(m, parseInt(String(b.id).slice(2)) || 0), 0) + 1,
        b = { id: 'P-' + String(n).padStart(3, '0'), at: Date.now(), by: USER, role: ROLE, status: 'Open', ...o };
      repos.problems.add(b, { first: true });
      audit('Problem reported', b.id, o.what.slice(0, 60));
    },
    typeof shot == 'string'
      ? 'A picture of your screen is attached. Remove it if it shows anything private.'
      : 'A screenshot or photo of the screen helps us fix it faster.'
  );
}
export function bugView(id) {
  if (!need('manage', 'Reported problems')) return;
  const b = state.bugs.find((x) => x.id == id);
  if (!b) return;
  form(
    'Problem ' + b.id,
    [
      { k: 'status', l: 'Status', t: 'select', o: ['Open', 'Being looked at', 'Fixed', 'Not a problem'] },
      { k: 'sev', l: 'How bad', t: 'select', o: BUG_SEV },
      { k: 'where', l: 'Where', ro: 1 },
      { k: 'by', l: 'Reported by', ro: 1 },
      { k: 'what', l: 'What went wrong', t: 'area', w: 'full', max: 1000 },
      { k: 'steps', l: 'What they were doing', t: 'area', w: 'full', max: 600 },
      { k: 'reply', l: 'Notes / what was done', t: 'area', w: 'full', max: 600 },
    ],
    b,
    (o) => {
      const was = b.status;
      Object.assign(b, o);
      audit('Problem updated', b.id, was != o.status ? was + ' to ' + o.status : '');
    },
    true
  );
  $('#mbox .mact').insertAdjacentHTML(
    'afterbegin',
    `<button class="btn ghost l" style="color:var(--red)" ${onClick('bugDel', id)}>Delete</button>`
  );
}
export function bugDel(id) {
  askIn(
    'Delete this report?',
    'It is removed for everyone.',
    'Delete',
    () => {
      repos.problems.remove((x) => x.id == id);
      audit('Problem deleted', id, '');
      store();
      closeModal();
      render();
    },
    true
  );
}
