/* features/records/preview-notice: a "still being designed" popup over the lead and contract windows.
   Shown once each time the app is opened (per kind), until the person ticks "Don't show this again".
   Remembered only in this browser; if storage is blocked it simply shows each time. */
import { $ } from '../../core/dom.js';
import { html } from '../../core/html.js';

const KEY = 'bb_preview_seen';
const shown = new Set();
const NAME = { lead: 'Leads', contract: 'Contracts' };
const dontShow = () => {
  try {
    return localStorage.getItem(KEY) == '1';
  } catch (e) {
    return false;
  }
};

/** called when a lead or contract window opens */
export function previewNotice(kind) {
  if (!NAME[kind] || shown.has(kind) || dontShow() || $('#pvn')) return;
  shown.add(kind);
  const box = document.createElement('div');
  box.id = 'pvn';
  box.setAttribute('role', 'alertdialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'pvnT');
  box.innerHTML = String(html`<div class="pvn-b">
    <div class="pvn-i" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.5"/></svg></div>
    <h2 id="pvnT">Work In Progress</h2>
    <p>The ${NAME[kind]} windows are not in their final state yet. Boxes, steps and the layout may change as the design is finished.</p>
    <ul><li>Anything you save is kept</li><li>If something looks wrong or gets in your way, use Report A Problem (bottom right)</li></ul>
    <label class="cbl"><input type="checkbox" id="pvnX"> Don't show this again</label>
    <div class="pvn-a"><button type="button" class="btn" id="pvnOk" data-act="pvnClose">Got It</button></div>
  </div>`);
  document.body.appendChild(box);
  box.addEventListener('keydown', (e) => {
    if (e.key == 'Escape' || e.key == 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      pvnClose();
    }
  });
  requestAnimationFrame(() => {
    box.classList.add('on');
    const b = $('#pvnOk');
    if (b) b.focus({ preventScroll: true });
  });
}
export function pvnClose() {
  const box = $('#pvn');
  if (!box) return;
  if ($('#pvnX') && $('#pvnX').checked)
    try {
      localStorage.setItem(KEY, '1');
    } catch (e) {
      /* storage blocked: it will show again next time */
    }
  box.remove();
}
