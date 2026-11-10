/* ui/shell/shell: Wiring up the top bar, side menu and global keys at start-up. */
import { LOGO_SRC } from '../../core/assets.js';
import { pvnClose } from '../../features/records/preview-notice.js';
import { $, $$ } from '../../core/dom.js';
import { ICONS, svg } from '../../core/icons.js';
import { SAFE } from '../../data/sanitize.js';
import { swRole } from '../../features/auth/session.js';
import { editContact } from '../../features/contacts/contacts.js';
import { docOpen } from '../../features/documents/documents.js';
import { holBook } from '../../features/holidays/holidays.js';
import { editLead } from '../../features/leads/leads.js';
import { toggleTV } from '../../features/live-boards/live-boards.js';
import { ncToggle } from '../../features/notifications/notifications.js';
import { editProfile } from '../../features/profile/profile.js';
import { recClose, recordWin } from '../../features/records/record-window.js';
import { got, scan, stopScan } from '../../features/scanner/scanner.js';
import { sbSync } from '../../features/search/search.js';
import { editCall } from '../../features/service/service.js';
import { found, stockForm } from '../../features/stock/item-window.js';
import { closeFpop } from '../components/popover.js';
import { ASKI, closeModal } from '../modal.js';
import { go, render, setQuery } from './router.js';
import { setTh } from './theme.js';
import { uiState } from '../ui-state.js';

/* The page area keeps room for its scrollbar so nothing jumps when one appears. That room comes off the
   right-hand padding, so every page lines up exactly with the right edge of the top bar. */
export function fitGutter() {
  const m = $('#main');
  if (!m) return;
  const w = m.offsetWidth - m.clientWidth - (parseFloat(getComputedStyle(m).borderRightWidth) || 0);
  document.documentElement.style.setProperty('--sbw', Math.max(0, w) + 'px');
}
export function shell() {
  fitGutter();
  addEventListener('resize', fitGutter);
  $('#mnb').innerHTML = svg(ICONS.menu);
  $('#sbIc').outerHTML = svg(ICONS.search);
  $('#bell').insertAdjacentHTML('afterbegin', svg(ICONS.bell));
  $('#nwb').innerHTML = svg(ICONS.plus) + '<span>New</span>';
  $('#scanBtn').innerHTML = svg(ICONS.scan);
  $$('.lg-w').forEach((i) => (i.src = LOGO_SRC.white));
  $$('.lg-e').forEach((i) => (i.src = LOGO_SRC.emblem));
  $('#fav').href = LOGO_SRC.icon;
  document.documentElement.style.setProperty('--hero-emblem', 'url("' + LOGO_SRC.emblem + '")');
  let th = 'light';
  try {
    th = localStorage.getItem('bb_theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  } catch (e) {}
  setTh(th);
  $('#thb').onclick = () => setTh(document.body.dataset.theme == 'dark' ? 'light' : 'dark');
  $('#mnb').onclick = () => document.body.classList.add('sopen');
  $('#scrim').onclick = () => document.body.classList.remove('sopen');
  $('#meBtn').onclick = editProfile;
  $('#acct').onclick = swRole;
  $('#bell').onclick = () => ncToggle(true);
  $('#ncbg').onclick = () => ncToggle(false);
  $('#scanBtn').onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    scan(found);
  };
  $('#q').addEventListener('input', (e) => {
    setQuery(SAFE.text(e.target.value, 80).toLowerCase());
    Object.values(uiState).forEach((s) => {
      if (s && typeof s == 'object' && 'page' in s) s.page = 1;
    });
    sbSync();
    clearTimeout(render.q);
    render.q = setTimeout(() => render(true), 120);
  });
  $('#qClr').onclick = () => {
    $('#q').value = '';
    setQuery('');
    sbSync();
    render();
    $('#q').focus();
  };
  $('#nwb').onclick = (e) => {
    e.stopPropagation();
    $('#nwm').classList.toggle('open');
  };
  document.addEventListener('click', () => $('#nwm').classList.remove('open'));
  $('#nwm').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    ({
      lead: () => editLead(),
      call: () => editCall(),
      contact: () => editContact(),
      stock: () => {
        go('stock');
        stockForm('add');
      },
      request: () => {
        go('stock');
        stockForm('request');
      },
      hol: () => holBook(),
      doc: () => docOpen('guarantee'),
      files: () => go('downloads'),
    })[b.dataset.a]();
  };
  $('#manualGo').onclick = () => got($('#manual').value);
  $('#manual').onkeydown = (e) => {
    if (e.key == 'Enter') got(e.target.value);
  };
  $('#scanClose').onclick = stopScan;
  document.addEventListener('keydown', (e) => {
    if (e.key == 'Escape') {
      if (typeof ASKI != 'undefined' && ASKI) return;
      /* Esc closes the top-most thing only: a colour picker or the search list before the popup under it */
      const cp = $('#cpop.open'),
        sr = $('#sres.open');
      if ($('#pvn')) return pvnClose();
      if (cp || sr) {
        if (cp) cp.classList.remove('open');
        if (sr) sr.classList.remove('open');
        return;
      }
      if ($('#modal.open .rw') && recordWin && recordWin.dirty) {
        if (!$('#rwAsk')) recClose();
        return;
      }
      closeModal();
      stopScan();
      ncToggle(false);
      closeFpop();
      document.body.classList.remove('sopen');
      if (document.body.classList.contains('tv')) toggleTV();
    }
    if ((e.key == 'Enter' || e.key == ' ') && e.target.dataset && e.target.dataset.rc) {
      e.preventDefault();
      e.target.click();
    }
    if (e.key == '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !$('.ov.open')) {
      e.preventDefault();
      $('#q').focus();
    }
  });
}
