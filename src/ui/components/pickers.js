/* ui/components/pickers: small pop-ups shared by every form, in the app's own style.
   - Pick list: an input with data-combo="<source>" shows matches under it as you type (jobs, profiles),
     instead of the browser's own drop-down. A page registers a source with plugInCombo(name, () => rows),
     each row { v: value put in the box, t: title, s: small print }.
   - Calendar: with a mouse, a date box opens a month calendar instead of the browser's. Typing the date
     still works, and phones keep their own date wheel. data-weekdays on the box greys out Saturdays and Sundays.
   - Drop-down: with a mouse, every <select> opens the app's own list instead of the browser's grey one.
     The real <select> stays underneath (its value, change events and keyboard arrows are unchanged),
     and phones keep their own picker. */
import { esc } from '../../core/dom.js';
import { BH, iso, today } from '../../core/dates.js';

const SOURCES = {};
export const plugInCombo = (name, fn) => (SOURCES[name] = fn);

let pop = null,
  forEl = null,
  kind = '',
  rows = [],
  at = 0,
  month = null,
  firing = false,
  /* where the pointer last went down, so a list grows out of the exact spot that was clicked */
  lastPt = null,
  fresh = false,
  anchor = null;

function box() {
  if (!pop) {
    pop = document.createElement('div');
    pop.id = 'pkpop';
    pop.setAttribute('role', 'listbox');
    document.body.appendChild(pop);
    /* mousedown, not click: the box must not lose focus before the choice lands */
    pop.addEventListener('mousedown', (e) => {
      if (e.target.closest('.pk-s')) return;
      e.preventDefault();
      const b = e.target.closest('[data-i],[data-d],[data-dp],[data-o]');
      if (!b || b.disabled) return;
      if (b.dataset.o != null) chooseOpt(+b.dataset.o);
      else if (b.dataset.i != null) choose(+b.dataset.i);
      else if (b.dataset.d) setDate(b.dataset.d);
      else if (b.dataset.dp == 'today') setDate(today());
      else if (b.dataset.dp == 'clear') setDate('');
      else {
        month.setMonth(month.getMonth() + (b.dataset.dp == 'next' ? 1 : -1));
        drawCal();
      }
    });
  }
  return pop;
}
function place() {
  if (!pop || !forEl) return;
  const r = forEl.getBoundingClientRect(),
    w = Math.min(
      kind == 'date' ? 280 : kind == 'select' ? Math.max(Math.min(r.width, 320), 200) : Math.max(r.width, 300),
      innerWidth - 16
    );
  pop.style.width = w + 'px';
  const h = pop.offsetHeight,
    clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  /* a drop-down or calendar opened with the mouse opens right where the pointer clicked (and stays there while it is
     open, e.g. going to the next month); a list that follows typing, or one opened from the keyboard, sits under its box */
  if (fresh) anchor = kind != 'combo' && lastPt && Date.now() - lastPt.t < 800 ? { x: lastPt.x, y: lastPt.y } : null;
  let L, T;
  if (anchor) {
    const right = anchor.x - 12 + w <= innerWidth - 8,
      down = anchor.y + 6 + h <= innerHeight - 8;
    L = clamp(right ? anchor.x - 12 : anchor.x - w + 12, 8, innerWidth - w - 8);
    T = clamp(down ? anchor.y + 6 : anchor.y - h - 6, 8, Math.max(8, innerHeight - h - 8));
  } else {
    const below = r.bottom + 6 + h < innerHeight - 8 || r.top < h + 14;
    L = clamp(r.left, 8, innerWidth - w - 8);
    T = below ? r.bottom + 6 : r.top - h - 6;
  }
  pop.style.left = L + 'px';
  pop.style.top = T + 'px';
  if (!fresh) return;
  fresh = false;
  /* it grows out of the click (or out of its box when opened from the keyboard) */
  const pt = anchor || { x: r.left + Math.min(r.width, 200) / 2, y: T > r.top ? r.bottom : r.top },
    ox = clamp(pt.x - L, 0, w),
    oy = clamp(pt.y - T, 0, h);
  pop.style.transformOrigin = ox + 'px ' + oy + 'px';
  pop.classList.remove('grow');
  void pop.offsetWidth;
  pop.classList.add('grow');
}
export function pickClose() {
  anchor = null;
  if (pop) pop.classList.remove('open', 'grow');
  if (forEl && kind == 'select') forEl.removeAttribute('aria-expanded');
  forEl = null;
  kind = '';
}
const fire = (el) => {
  firing = true;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  firing = false;
};

/* ---- pick list ---- */
function drawCombo() {
  const src = SOURCES[forEl.dataset.combo];
  let all = [];
  try {
    all = src ? src() || [] : [];
  } catch (e) {
    all = [];
  }
  const q = forEl.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  rows = all.filter((o) => {
    const hay = (o.v + ' ' + o.t + ' ' + (o.s || '')).toLowerCase();
    return q.every((w) => hay.includes(w));
  });
  /* one row left and it is exactly what is typed: nothing more to offer */
  if (!rows.length || (rows.length == 1 && String(rows[0].v).toLowerCase() == forEl.value.trim().toLowerCase())) {
    if (pop) pop.classList.remove('open');
    return;
  }
  const more = rows.length - 7;
  rows = rows.slice(0, 7);
  at = Math.min(at, rows.length - 1);
  box().className = 'pk-list open';
  pop.innerHTML =
    rows
      .map(
        (o, i) =>
          `<button type="button" class="pk-i ${i == at ? 'on' : ''}" data-i="${i}" role="option"><b>${esc(o.t)}</b>${o.s ? `<small>${esc(o.s)}</small>` : ''}</button>`
      )
      .join('') + (more > 0 ? `<p class="pk-m">${more} more: keep typing to narrow it down</p>` : '');
  place();
}
function choose(i) {
  const o = rows[i],
    el = forEl;
  if (!o || !el) return;
  el.value = o.v;
  pickClose();
  fire(el);
}

/* ---- drop-down list for a <select> ----
   (v19.18.5) A long list (more than SEARCH_FROM choices, such as the stock-take areas) has a search box at the top:
   it opens ready to type, and shows only the choices with the typed words anywhere in them. */
const SEARCH_FROM = 12;
let selQ = '';
const selMatch = (o) => {
  const q = selQ.trim().toLowerCase().split(/\s+/).filter(Boolean),
    t = (o.textContent || '').toLowerCase();
  return !q.length || q.every((w) => t.includes(w));
};
const showOpt = (o) => !o.hidden && selMatch(o);
function drawSelect() {
  const el = forEl,
    opts = [...el.options],
    long = opts.length > SEARCH_FROM;
  let html = '',
    grp = null,
    n = 0;
  opts.forEach((o, i) => {
    const g = o.parentElement && o.parentElement.tagName == 'OPTGROUP' ? o.parentElement : null;
    if (g !== grp) {
      grp = g;
      if (g && !selQ) html += `<p class="pk-g">${esc(g.label)}</p>`;
    }
    if (!showOpt(o)) return;
    n++;
    html += `<button type="button" class="pk-o ${i == at ? 'on' : ''} ${o.selected ? 'sel' : ''}" data-o="${i}" role="option" aria-selected="${o.selected}" ${o.disabled ? 'disabled' : ''}>${esc(o.textContent || '\u00a0')}</button>`;
  });
  if (!n) html = '<p class="pk-none">Nothing matches</p>';
  box().className = 'pk-list pk-sel open' + (long ? ' pk-long' : '');
  let s = pop.querySelector(':scope>.pk-s'),
    ol = pop.querySelector(':scope>.pk-ol');
  if (long && !s) {
    pop.innerHTML =
      '<div class="pk-s"><input type="search" placeholder="Search" aria-label="Search the list" autocomplete="off"></div><div class="pk-ol"></div>';
    s = pop.querySelector('.pk-s');
    ol = pop.querySelector('.pk-ol');
    const q = s.querySelector('input');
    q.value = selQ;
    q.addEventListener('input', () => {
      selQ = q.value;
      const first = [...forEl.options].findIndex((o) => showOpt(o) && !o.disabled);
      if (first >= 0) at = first;
      drawSelect();
    });
  }
  if (long) ol.innerHTML = html;
  else pop.innerHTML = html;
  place();
  const on = pop.querySelector('.pk-o.on');
  if (on) on.scrollIntoView({ block: 'nearest' });
}
function openSelect(el) {
  fresh = true;
  forEl = el;
  kind = 'select';
  selQ = '';
  if (pop) pop.innerHTML = '';
  at = Math.max(0, el.selectedIndex);
  el.setAttribute('aria-expanded', 'true');
  drawSelect();
  const q = pop.querySelector('.pk-s input');
  if (q) setTimeout(() => q.isConnected && q.focus({ preventScroll: true }), 0);
}
function chooseOpt(i) {
  const el = forEl,
    o = el && el.options[i];
  if (!o || o.disabled) return;
  pickClose();
  el.focus({ preventScroll: true });
  if (el.selectedIndex == i) return;
  el.selectedIndex = i;
  fire(el);
}
/* the next option that can be picked, going one way or the other */
function stepOpt(d) {
  const L = forEl.options;
  for (let i = at + d; i >= 0 && i < L.length; i += d) if (!L[i].disabled && showOpt(L[i])) return i;
  return at;
}
let typed = '',
  typedT = 0;

/* ---- calendar ---- */
const MONTHS = 'January February March April May June July August September October November December'.split(' ');
function drawCal() {
  const y = month.getFullYear(),
    m = month.getMonth(),
    first = new Date(y, m, 1),
    off = (first.getDay() + 6) % 7,
    td = today(),
    sel = forEl.value,
    min = forEl.min || '',
    max = forEl.max || '';
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m, 1 - off + i),
      k = iso(d),
      out = d.getMonth() != m,
      we = d.getDay() == 0 || d.getDay() == 6,
      no = (min && k < min) || (max && k > max) || (forEl.dataset.weekdays && we);
    cells += `<button type="button" data-d="${k}" class="${out ? 'out ' : ''}${we ? 'we ' : ''}${k == td ? 'td ' : ''}${k == sel ? 'on ' : ''}${BH[k] ? 'bh' : ''}" ${no ? 'disabled' : ''} ${BH[k] ? `title="${esc(BH[k])}"` : ''}>${d.getDate()}</button>`;
  }
  box().className = 'pk-cal open';
  pop.innerHTML = `<div class="dp-h"><button type="button" data-dp="prev" aria-label="Previous month">&lsaquo;</button><b>${MONTHS[m]} ${y}</b><button type="button" data-dp="next" aria-label="Next month">&rsaquo;</button></div>
    <div class="dp-g">${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => `<span>${d}</span>`).join('')}${cells}</div>
    <div class="dp-f"><button type="button" data-dp="today">Today</button><button type="button" data-dp="clear">Clear</button></div>`;
  place();
}
function setDate(k) {
  const el = forEl;
  if (!el) return;
  el.value = k;
  pickClose();
  fire(el);
  el.focus({ preventScroll: true });
}
function openCal(el) {
  fresh = true;
  forEl = el;
  kind = 'date';
  const v = /^\d{4}-\d{2}-\d{2}$/.test(el.value) ? el.value : today();
  month = new Date(+v.slice(0, 4), +v.slice(5, 7) - 1, 1);
  drawCal();
}

/* start-up step (run once by main.js) */
export function listenForPickers() {
  document.addEventListener('pointerdown', (e) => (lastPt = { x: e.clientX, y: e.clientY, t: Date.now() }), true);
  const isCombo = (t) => t && t.matches && t.matches('input[data-combo]:not([readonly]):not([disabled])');
  const isDate = (t) => t && t.matches && t.matches('input[type=date]:not([readonly]):not([disabled])');
  document.addEventListener('focusin', (e) => {
    if (!isCombo(e.target)) return;
    forEl = e.target;
    kind = 'combo';
    at = 0;
    drawCombo();
  });
  document.addEventListener('input', (e) => {
    if (isCombo(e.target) && !firing) {
      forEl = e.target;
      kind = 'combo';
      at = 0;
      drawCombo();
    }
  });
  document.addEventListener('focusout', (e) => {
    if (e.target == forEl && kind == 'combo') setTimeout(() => document.activeElement != forEl && pickClose(), 120);
  });
  /* a drop-down: our list instead of the browser's (mouse only) */
  const isSel = (t) =>
    t && t.tagName == 'SELECT' && !t.multiple && !(t.size > 1) && !t.disabled && !t.closest('[data-native]');
  document.addEventListener(
    'mousedown',
    (e) => {
      if (e.button || !isSel(e.target) || !matchMedia('(pointer:fine)').matches) return;
      e.preventDefault();
      if (forEl == e.target && kind == 'select') return pickClose();
      e.target.focus({ preventScroll: true });
      openSelect(e.target);
    },
    true
  );
  document.addEventListener('mousedown', (e) => {
    if (kind == 'select' && pop && !pop.contains(e.target) && e.target != forEl) pickClose();
  });
  document.addEventListener('focusout', (e) => {
    if ((e.target == forEl || (pop && pop.contains(e.target))) && kind == 'select')
      setTimeout(() => {
        const a = document.activeElement;
        if (a != forEl && !(pop && pop.contains(a))) pickClose();
      }, 120);
  });
  /* a date box: our calendar instead of the browser's (mouse only) */
  document.addEventListener('click', (e) => {
    if (isDate(e.target) && matchMedia('(pointer:fine)').matches) {
      e.preventDefault();
      if (forEl == e.target && kind == 'date') return pickClose();
      openCal(e.target);
    } else if (kind == 'date' && pop && !pop.contains(e.target)) pickClose();
  });
  document.addEventListener(
    'keydown',
    (e) => {
      /* Space, Enter or Alt+Down on a drop-down opens our list too (with a mouse about) */
      if (
        isSel(e.target) &&
        kind != 'select' &&
        matchMedia('(pointer:fine)').matches &&
        (e.key == ' ' || e.key == 'Enter' || e.key == 'F4' || (e.altKey && e.key == 'ArrowDown'))
      ) {
        e.preventDefault();
        openSelect(e.target);
        return;
      }
      if (!forEl || !pop || !pop.classList.contains('open')) return;
      if (kind == 'select') {
        const k = e.key;
        if (k == 'Escape' || k == 'Tab') {
          const was = forEl,
            inSearch = pop.contains(e.target);
          if (k == 'Escape' || inSearch) {
            e.preventDefault();
            e.stopPropagation();
          }
          pickClose();
          /* back to the drop-down itself (from the search box too) */
          if (was && (k == 'Escape' || inSearch)) was.focus({ preventScroll: true });
        } else if (k == 'ArrowDown' || k == 'ArrowUp') {
          e.preventDefault();
          at = stepOpt(k == 'ArrowDown' ? 1 : -1);
          drawSelect();
        } else if (k == 'Home' || k == 'End') {
          e.preventDefault();
          at = k == 'Home' ? -1 : forEl.options.length;
          at = stepOpt(k == 'Home' ? 1 : -1);
          drawSelect();
        } else if (k == 'Enter' || (k == ' ' && !(pop && pop.contains(e.target)))) {
          e.preventDefault();
          e.stopPropagation();
          chooseOpt(at);
        } else if (k.length == 1 && !e.ctrlKey && !e.metaKey && !(pop && pop.contains(e.target))) {
          /* type the first letters to jump to an option */
          e.preventDefault();
          clearTimeout(typedT);
          typed += k.toLowerCase();
          typedT = setTimeout(() => (typed = ''), 700);
          const L = [...forEl.options],
            i = L.findIndex((o) => !o.disabled && o.textContent.trim().toLowerCase().startsWith(typed));
          if (i >= 0) {
            at = i;
            drawSelect();
          }
        }
        return;
      }
      if (e.key == 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        pickClose();
      } else if (kind == 'combo' && e.target == forEl) {
        if (e.key == 'ArrowDown' || e.key == 'ArrowUp') {
          e.preventDefault();
          at = (at + (e.key == 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
          drawCombo();
        } else if (e.key == 'Enter' && rows[at]) {
          e.preventDefault();
          e.stopPropagation();
          choose(at);
        }
      } else if (kind == 'date' && e.key == 'Tab') pickClose();
    },
    true
  );
  addEventListener('resize', pickClose);
  document.addEventListener(
    'scroll',
    (e) => {
      if (forEl && pop && !pop.contains(e.target)) place();
    },
    true
  );
}
