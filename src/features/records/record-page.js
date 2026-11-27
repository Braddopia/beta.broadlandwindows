/* features/records/record-page: (v19.18.4, the owner found the floating window "weird, not like the site") the lead,
   contract and supplier records now sit in the page area like any other page: the side menu and the top bar stay where
   they are, and the record fills the space the page uses, in the site's own look (page heading, white panels, the
   usual buttons). Full Page still hides the side menu for more room. Phones use the whole screen as before.
   The record window is still the same window underneath (its saving, closing and moving between records are
   unchanged); this module only places it over the page area and keeps it there when the screen size changes. */
import { $ } from '../../core/dom.js';
import { closeModal } from '../../ui/modal.js';
import { recClose, recordWin } from './record-window.js';

/** put an open record over the page area (#main) */
export function abPlace() {
  const b = $('#mbox'),
    m = $('#main');
  if (!b || !m || !b.classList.contains('ab')) return;
  const r = m.getBoundingClientRect();
  b.style.setProperty('--mx', Math.round(r.left) + 'px');
  b.style.setProperty('--my', Math.round(r.top) + 'px');
  b.style.setProperty('--mw', Math.round(r.width) + 'px');
  b.style.setProperty('--mh', Math.round(r.height) + 'px');
}
/* start-up step (run once by main.js): keep the record placed when the window changes size, and let the side menu
   work while a record is open (it closes the record first, asking to save if anything changed) */
export function startRecordPage() {
  addEventListener('resize', abPlace);
  document.addEventListener(
    'click',
    (e) => {
      const t = e.target instanceof Element ? e.target : null,
        nav = t && t.closest('.side a, .side button, .top a, .top button');
      if (!nav || !$('#modal.open #mbox.ab')) return;
      /* anything in the top bar that opens its own window (search, new, notifications) works over the record */
      if (nav.closest('.top')) return;
      if (recordWin && recordWin.dirty && $('#mbox .rw[data-kind=lead], #mbox .rw[data-kind=contract]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        recClose();
        return;
      }
      closeModal();
    },
    true
  );
}
