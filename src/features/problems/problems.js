/* features/problems/problems: Reporting a problem, and the list administrators see. */
import { BUG_SEV } from '../../config/constants.js';
import { onClick } from '../../core/actions.js';
import { $ } from '../../core/dom.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { ISOWN, ROLE, need } from '../auth/session.js';
import { form } from '../../ui/forms/form.js';
import { askIn, closeModal } from '../../ui/modal.js';
import { VIEWS, render, view } from '../../ui/shell/router.js';

export function bugReport() {
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
    { where: (VIEWS[view] || {}).t || '', sev: BUG_SEV[1] },
    (o) => {
      const n = state.bugs.reduce((m, b) => Math.max(m, parseInt(String(b.id).slice(2)) || 0), 0) + 1,
        b = { id: 'P-' + String(n).padStart(3, '0'), at: Date.now(), by: USER, role: ROLE, status: 'Open', ...o };
      state.bugs.unshift(b);
      audit('Problem reported', b.id, o.what.slice(0, 60));
    },
    'A screenshot or photo of the screen helps us fix it faster.'
  );
}
export function bugView(id) {
  if (!need(ISOWN, 'Reported problems')) return;
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
      state.bugs = state.bugs.filter((x) => x.id != id);
      audit('Problem deleted', id, '');
      store();
      closeModal();
      render();
    },
    true
  );
}
