/* features/search/search: Search: the top bar list, the Ctrl+K box and the rotating hints. */
import { $, $$, esc } from '../../core/dom.js';
import { tc } from '../../core/format.js';
import { ICONS, svg } from '../../core/icons.js';
import { SAFE } from '../../data/sanitize.js';
import { backupDl } from '../admin/backup.js';
import { state } from '../../data/state.js';
import { allLeads } from '../../domain/leads.js';
import { nlq } from './questions.js';
import { exactProduct, products, unitOf } from '../../domain/stock.js';
import { chPin } from '../auth/pins.js';
import { ROLE } from '../../data/session.js';
import { can, canSee } from '../../domain/permissions.js';
import { setRole, swRole } from '../auth/session.js';
import { editContact } from '../contacts/contacts.js';
import { editContract, openContract } from '../contracts/contracts.js';
import { editDel } from '../deliveries/deliveries.js';
import { DL, MF, SSM, fx, manOpen, setUploadedFiles } from '../files/files.js';
import { bookMine } from '../home/home.js';
import { editRatings } from '../home/reviews.js';
import { editLead, openLead } from '../leads/leads.js';
import { bugReport } from '../problems/problems.js';
import { editProfile } from '../profile/profile.js';
import { scan } from '../scanner/scanner.js';
import { nlqAll } from './answers.js';
import { cmdSmart, cmdkSet } from './commands.js';
import { editCall } from '../service/service.js';
import { coEditK, motionSet } from '../settings/settings.js';
import { editStaff } from '../staff/staff.js';
import { found, stockForm, viewItem } from '../stock/item-window.js';
import { editSup } from '../suppliers/suppliers.js';
import { startTour } from '../tour/tour.js';
import { lookPop } from '../../ui/shell/looks.js';
import { VIEWS, go, render, setQuery } from '../../ui/shell/router.js';
import { setTh } from '../../ui/shell/theme.js';

/* ---- top bar wiring ---- */
export function sbSync() {
  $('#sb').classList.toggle('has', !!$('#q').value);
}
/* ==========================================================================
   19 · Search: the main way to find anything and do anything
   - Top bar: type to see matching leads, contracts, service calls, contacts,
     suppliers, stock, staff and files (only what this account may see).
     The page you are on is still filtered too.
   - Ctrl+K (Cmd+K on a Mac) anywhere: a big centred search box.
   - Actions: type "new lead", "deliveries", "dark"... or start with ">" to
     see only actions (new records, go to a page, scan, look, tour).
   - The hint in the box cycles through real examples from your data.
   ========================================================================== */
/* every text value in a record, including phone/email lists; skips photos and files */
export function srchText(o, d = 0) {
  if (o == null || d > 3) return '';
  if (typeof o != 'object') return typeof o == 'string' && (o.length > 300 || o.startsWith('data:')) ? '' : String(o);
  return Object.entries(o)
    .filter(([k]) => !/^(photos|files|docs|sig|signature|pay|audit|appts|lines|ck|_meta)$/.test(k))
    .map(([, v]) => srchText(v, d + 1))
    .join(' ');
}
/* all words must appear; a number like "01632960014" also matches "01632 960 014" */
export function srchMatch(txt, query) {
  const t = txt.toLowerCase(),
    td = t.replace(/[\s()-]/g, '');
  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => t.includes(w) || (/^[\d+]{4,}$/.test(w) && td.includes(w)));
}
export const SRCH = [
  [
    'leads',
    'Leads',
    () => allLeads(),
    (l) => [l.name || 'Lead ' + l.id, ['Lead ' + l.id, l.stage, l.town, l.homePc].filter(Boolean).join(' · ')],
    (l) => {
      const a = (state.leadArchive || []).find((x) => x.id == l.id && x.convertedTo);
      if (a && !state.leads.some((x) => x.id == l.id)) openContract(a.convertedTo);
      else openLead(l.id);
    },
  ],
  [
    'contracts',
    'Contracts',
    () => state.contracts,
    (c) => [c.name || 'Contract ' + c.id, ['Contract ' + c.id, c.stage, c.town].filter(Boolean).join(' · ')],
    (c) => openContract(c.id),
  ],
  [
    'service',
    'Service Calls',
    () => state.calls,
    (c) => [c.name || c.id, [c.id, c.issue, c.status].filter(Boolean).join(' · ')],
    (c) => editCall(c.id),
  ],
  [
    'contacts',
    'Contact Book',
    () => state.contacts,
    (c) => [c.co || c.name, [c.co ? c.name : '', c.type, c.phone].filter(Boolean).join(' · ')],
    (c) => editContact(c.id),
  ],
  [
    'suppliers',
    'Suppliers',
    () => state.suppliers.map((x, i) => ({ ...x, _i: i })),
    (x) => [x.name, [x.account, x.contact, x.phone].filter(Boolean).join(' · ')],
    (x) => editSup(x._i),
  ],
  [
    'stock',
    'Inventory',
    () => products(),
    (r) => [
      r.item || r.pid,
      [r.desc, 'Stock ID ' + r.pid, r.supplier, r.location].filter((v) => v && v != '-').join(' · '),
    ],
    (r) => viewItem(r.pid),
  ],
  [
    'staff',
    'Staff',
    () => state.staff,
    (s) => [s.name, [s.role, s.team].filter(Boolean).join(' · ')],
    (s) => editStaff(s.id),
  ],
  [
    'downloads',
    'Files And Manuals',
    () => {
      const H = state.fileHide || {};
      return [
        ...DL.filter((d) => !H[d.url]).map((d) => ({ t: d.title, s: 'Brochure · ' + d.cat, u: d.url })),
        ...SSM.filter((m) => !H[m.u]).map((m) => ({ t: m.t, s: 'Manual · ' + m.f, u: m.u })),
        ...MF.filter((f) => !/^brand asset$/i.test(f.cat)).map((f) => ({
          t: f.name,
          s: 'File · ' + tc(f.cat),
          id: f.id,
        })),
      ];
    },
    (f) => [f.t, f.s],
    (f) => {
      if (f.id) {
        manOpen(f.id);
        return;
      }
      const u = SAFE.url(f.u);
      if (u) window.open(u, '_blank', 'noopener,noreferrer');
    },
  ],
];
/* actions: [label, extra words to match, run, allowed?] */
export const CMDS = () =>
  [
    [
      'New Lead',
      'add enquiry customer',
      () => {
        go('leads');
        editLead();
      },
      () => canSee('leads'),
    ],
    [
      'New Contract',
      'add job order',
      () => {
        go('contracts');
        editContract();
      },
      () => canSee('contracts'),
    ],
    [
      'Take A Payment',
      'pay money deposit balance receipt',
      () => cmdkSet('pay '),
      () => can('money') && canSee('contracts'),
    ],
    ['Call Someone', 'ring phone dial', () => cmdkSet('call '), () => true],
    ['Email Someone', 'mail send', () => cmdkSet('email '), () => true],
    ['Mark A Lead Won Or Lost', 'won lost lead stage', () => cmdkSet('won '), () => canSee('leads')],
    [
      'Add A Note To A Job',
      'note log lead contract',
      () => cmdkSet('note '),
      () => canSee('leads') || canSee('contracts'),
    ],
    [
      'New Contact',
      'add contact book supplier',
      () => {
        go('contacts');
        editContact();
      },
      () => canSee('contacts'),
    ],
    [
      'New Service Call',
      'add repair callout',
      () => {
        go('service');
        editCall();
      },
      () => canSee('service'),
    ],
    [
      'New Delivery',
      'add delivery',
      () => {
        go('deliveries');
        editDel();
      },
      () => canSee('deliveries'),
    ],
    [
      'Add Stock',
      'stock in goods in',
      () => {
        go('stock');
        stockForm('add');
      },
      () => canSee('stock'),
    ],
    [
      'Request Stock',
      'order stock',
      () => {
        go('stock');
        stockForm('request');
      },
      () => canSee('stock'),
    ],
    ['Book Holiday', 'holiday leave time off', () => bookMine(), () => true],
    ['Scan Barcode', 'scan camera code', () => scan(found), () => true],
    ...Object.entries(VIEWS)
      .filter(([k]) => canSee(k) && (k != 'admin' || can('manage')))
      .map(([k, v]) => ['Go To ' + v.t, 'open page show ' + k, () => go(k), () => true]),
    ['Settings', 'preferences options company my', () => go('settings'), () => true],
    ['Company Details', 'settings address phone vat number', () => coEditK('co'), () => can('manage')],
    [
      'VAT And Invoice Settings',
      'settings vat deposit bank invoice terms',
      () => coEditK('money'),
      () => can('manage'),
    ],
    [
      'Update Review Scores',
      'reviews google trustpilot trusted trader referenceline',
      () => editRatings(),
      () => can('manage'),
    ],
    ['Change PINs', 'security pin password', () => chPin(), () => can('manage')],
    ['Download Backup', 'export save data', () => backupDl(), () => can('manage')],
    [
      'Fewer Animations On Or Off',
      'motion reduce glow',
      () => {
        motionSet(!document.body.classList.contains('rm'));
        render(true);
      },
      () => true,
    ],
    ['Print This Page', 'print pdf', () => print(), () => true],
    ['Leave Admin Mode', 'lock sign out standard', () => setRole('staff'), () => ROLE != 'staff'],
    [
      'Light Or Dark Mode',
      'theme dark light night',
      () => setTh(document.body.dataset.theme == 'dark' ? 'light' : 'dark'),
      () => true,
    ],
    ['Change The Look', 'background pattern colour', () => lookPop(true), () => true],
    ['My Details', 'profile phone email', () => editProfile(), () => true],
    ['Switch Account', 'sign in admin pin role', () => swRole(), () => true],
    ['Show The Tour', 'help guide', () => startTour(), () => true],
    ['Report A Problem', 'bug broken not working issue fault', () => bugReport(), () => true],
  ].filter((c) => c[3]());
/* uploaded files live in the browser database: read them once so they can be found from any page */
export function srchFiles() {
  if (srchFiles.done || MF.length) return;
  srchFiles.done = 1;
  try {
    fx('readonly', (s) => s.getAll())
      .then((r) => {
        setUploadedFiles((r || []).filter((f) => !f.ref).sort((x, y) => y.time - x.time));
      })
      .catch(() => {});
  } catch (e) {}
}
export let NLQ = null;
/* one search engine for the top bar list and the big Ctrl+K box */
export function srchBuild(raw, big) {
  const RUN = [],
    grp = [],
    q0 = String(raw || '')
      .trim()
      .toLowerCase(),
    cmdOnly = q0.startsWith('>'),
    query = cmdOnly ? q0.slice(1).trim() : q0;
  const row = (t, s, fn, ic) => {
    const i = RUN.length;
    RUN.push(fn);
    return `<button type="button" class="sri" data-i="${i}" role="option">${ic ? `<span class="sri-ic">${svg(ic)}</span>` : ''}<span class="sri-t"><b>${esc(tc(String(t || '')))}</b>${s ? `<small>${esc(s)}</small>` : ''}</span></button>`;
  };
  /* an exact Stock ID, item code or barcode wins: first result, highlighted, Enter opens it */
  const X = !cmdOnly && canSee('stock') ? exactProduct(query) : null;
  if (X)
    grp.push(
      `<div class="srg xm">Exact Stock Match</div>` +
        row(
          X.item + (X.desc ? ' · ' + X.desc : ''),
          ['Stock ID ' + X.pid, X.stock + ' ' + unitOf(X) + ' in stock', X.location, X.area].filter((v) => v && v != '-').join(' · '),
          () => viewItem(X.pid),
          'M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10'
        ).replace('class="sri"', 'class="sri sri-x"')
    );
  const NQ = cmdOnly ? null : nlq(raw);
  if (NQ) {
    NLQ = NQ;
    const n = NQ.L.length,
      mx = big ? 7 : 5;
    grp.push(
      `<div class="srg nlg">${esc(tc(NQ.title))}<span>${n}</span></div>` +
        (n
          ? NQ.L.slice(0, mx)
              .map((r) => {
                const [t, s] = NQ.E.sh(r);
                return row(t, s, () => NQ.E.o(r));
              })
              .join('') +
            (n > mx ? row('Show all ' + n, 'Open the full list', () => nlqAll(), 'M4 6h16M4 12h16M4 18h10') : '')
          : '<p class="srn">None right now.</p>')
    );
  }
  const SM = cmdOnly ? [] : cmdSmart(String(raw || '').trim());
  if (SM.length)
    grp.push(
      `<div class="srg">Do It Now<span>${SM.length}</span></div>` + SM.map((s) => row(s[0], s[1], s[2], s[3])).join('')
    );
  const C = CMDS().filter((c) => !query || srchMatch(c[0] + ' ' + c[1], query));
  if (cmdOnly || (big && !query) || (query.length >= 2 && C.length)) {
    const L = cmdOnly || !query ? C : C.slice(0, 4);
    if (L.length)
      grp.push(
        `<div class="srg">Actions<span>${L.length}</span></div>` +
          L.map((c) =>
            row(
              c[0],
              '',
              c[2],
              /^New|^Add|^Request|^Book/.test(c[0])
                ? ICONS.plus
                : /^Go To/.test(c[0])
                  ? 'M5 12h14M13 6l6 6-6 6'
                  : /^Scan/.test(c[0])
                    ? ICONS.scan
                    : 'M12 3v3M12 18v3M3 12h3M18 12h3'
            )
          ).join('')
      );
  }
  if (!cmdOnly && query.length >= 2)
    SRCH.forEach(([v, label, list, show, open]) => {
      if (!canSee(v)) return;
      let L;
      try {
        L = list().filter((o) => srchMatch(srchText(o), query));
      } catch (e) {
        return;
      }
      if (!L.length) return;
      grp.push(
        `<div class="srg">${esc(label)}<span>${L.length}</span></div>` +
          L.slice(0, big ? 6 : 5)
            .map((o) => {
              const [t, s] = show(o);
              return row(t, s, () => open(o));
            })
            .join('')
      );
    });
  const empty = !grp.length
    ? query.length < 2 && !cmdOnly
      ? ''
      : `<p class="srn">Nothing found for “${esc(String(raw).trim())}”.</p>`
    : '';
  return { html: grp.join('') + empty, run: RUN };
}
/* ---- top bar list ---- */
export let SR = [],
  SRi = 0;
export function srchRun(raw) {
  const box = $('#sres');
  if (!box) return;
  const r0 = String(raw || '').trim();
  SRi = 0;
  if (r0.length < 2 && !r0.startsWith('>')) {
    SR = [];
    box.classList.remove('open');
    box.innerHTML = '';
    return;
  }
  const b = srchBuild(raw, false);
  SR = b.run.map((fn) => () => {
    srchClose(true);
    fn();
  });
  const r = $('#sb').getBoundingClientRect(),
    w = Math.min(innerWidth - 16, Math.max(r.width, 340));
  box.style.top = r.bottom + 6 + 'px';
  box.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  box.style.width = w + 'px';
  box.innerHTML = b.html;
  box.classList.toggle('open', !!b.html);
  srchMark('#sres', SRi);
}
export function srchMark(sel, i) {
  $$(sel + ' .sri').forEach((b, j) => b.classList.toggle('on', j == i));
}
export function srchClose(clear) {
  const box = $('#sres');
  if (box) box.classList.remove('open');
  if (clear) {
    $('#q').value = '';
    setQuery('');
    sbSync();
    render();
    srchHint();
  }
}
export function srchKeys(e, list, getI, setI, sel, close) {
  if (e.key == 'ArrowDown' || e.key == 'ArrowUp') {
    e.preventDefault();
    const n = Math.max(list().length, 1);
    setI((getI() + (e.key == 'ArrowDown' ? 1 : -1) + n) % n);
    srchMark(sel, getI());
    const on = $(sel + ' .sri.on');
    on && on.scrollIntoView({ block: 'nearest' });
  } else if (e.key == 'Enter' && list()[getI()]) {
    e.preventDefault();
    list()[getI()]();
  } else if (e.key == 'Escape') close();
}
/* ---- big centred box (Ctrl+K) ---- */
export let CX = [],
  CXi = 0;
export function cmdk(open) {
  let o = $('#cmdk');
  if (!o) {
    o = document.createElement('div');
    o.id = 'cmdk';
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-modal', 'true');
    o.setAttribute('aria-label', 'Search and actions');
    o.innerHTML = `<div class="ck-b"><label class="ck-in">${svg(ICONS.search)}<input id="cq" type="search" autocomplete="off" maxlength="80" aria-label="Search or type a command" aria-controls="cres"><kbd>Esc</kbd></label><div id="cres" class="ck-r" role="listbox"></div><div class="ck-f"><span><kbd>↑</kbd><kbd>↓</kbd> Move</span><span><kbd>Enter</kbd> Open</span><span><kbd>&gt;</kbd> Actions Only</span><span><kbd>Ctrl</kbd><kbd>K</kbd> Open Anywhere</span></div></div>`;
    document.body.appendChild(o);
    const ci = $('#cq');
    ci.addEventListener('input', () => cmdkRun(ci.value));
    ci.addEventListener('keydown', (e) =>
      srchKeys(
        e,
        () => CX,
        () => CXi,
        (v) => (CXi = v),
        '#cres',
        () => cmdk(false)
      )
    );
    o.addEventListener('mousedown', (e) => {
      if (e.target == o) cmdk(false);
    });
    $('#cres').addEventListener('mousedown', (e) => e.preventDefault());
    $('#cres').addEventListener('click', (e) => {
      const b = e.target.closest('.sri');
      if (b && CX[+b.dataset.i]) CX[+b.dataset.i]();
    });
  }
  o.classList.toggle('open', open);
  if (open) {
    srchFiles();
    srchClose();
    const ci = $('#cq');
    ci.value = '';
    ci.placeholder = $('#q').placeholder;
    cmdkRun('');
    setTimeout(() => ci.focus(), 20);
  }
}
export function cmdkRun(raw) {
  const b = srchBuild(raw, true);
  CX = b.run.map((fn) => () => {
    cmdk(false);
    fn();
  });
  CXi = 0;
  $('#cres').innerHTML =
    b.html ||
    '<p class="srn">Type a name, postcode, contract number or item code.<br>Or tell it what to do: <b class="nocap">pay 500 2402318</b>, <b class="nocap">call sample</b>, <b class="nocap">won L0002</b>, <b class="nocap">note 2402318 rang customer</b>.</p>';
  srchMark('#cres', 0);
}
/* ---- the hint in the box cycles through real examples ---- */
export function srchHint() {
  const inp = $('#q');
  if (!inp) return;
  const P = [];
  const pick = (a) => (a.length ? a[Math.floor(Math.random() * a.length)] : null);
  if (canSee('contracts')) P.push(pick(state.contracts.map((c) => c.id)));
  if (canSee('stock')) P.push(pick(products().map((r) => r.item)));
  if (canSee('leads')) P.push(pick(allLeads().map((l) => l.name)));
  P.push(pick([...state.leads, ...state.contracts].map((r) => r.homePc || r.town).filter(Boolean)));
  if (canSee('suppliers')) P.push(pick(state.suppliers.map((s) => s.name)));
  const T = [
    canSee('contracts') && 'fittings this week',
    canSee('contracts') && 'contracts with money owed',
    canSee('leads') && 'leads from Facebook',
    canSee('service') && 'urgent service calls',
    canSee('deliveries') && 'deliveries overdue',
    canSee('stock') && 'stock running low',
    canSee('leads') && 'leads this month',
  ].filter(Boolean);
  const L = [];
  P.filter(Boolean).forEach((x, i) => {
    L.push('Search… ' + x);
    if (T[i]) L.push('Search… ' + T[i]);
  });
  T.slice(P.length).forEach((x) => L.push('Search… ' + x));
  srchHint.i = ((srchHint.i || 0) + 1) % Math.max(L.length, 1);
  inp.placeholder = L[srchHint.i] || 'Search';
  const ci = $('#cq');
  if (ci && !ci.value) ci.placeholder = inp.placeholder;
}
export function search() {
  const sb = $('#sb'),
    inp = $('#q');
  if (!sb || !inp) return;
  const box = document.createElement('div');
  box.id = 'sres';
  box.setAttribute('role', 'listbox');
  box.setAttribute('aria-label', 'Search results');
  document.body.appendChild(box); /* not inside the glass top bar: its blur would offset a fixed box */
  inp.setAttribute('aria-controls', 'sres');
  inp.addEventListener('input', () => srchRun(inp.value));
  inp.addEventListener('focus', () => {
    srchFiles();
    if (inp.value.trim().length > 1 || inp.value.trim().startsWith('>')) srchRun(inp.value);
  });
  inp.addEventListener('keydown', (e) => {
    if (!box.classList.contains('open')) return;
    srchKeys(
      e,
      () => SR,
      () => SRi,
      (v) => (SRi = v),
      '#sres',
      () => srchClose()
    );
  });
  box.addEventListener('mousedown', (e) => e.preventDefault()); /* keep focus in the box while clicking a result */
  box.addEventListener('click', (e) => {
    const b = e.target.closest('.sri');
    if (b && SR[+b.dataset.i]) SR[+b.dataset.i]();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#sres,#sb')) srchClose();
  });
  $('#qClr').addEventListener('click', () => srchClose());
  /* Ctrl+K / Cmd+K anywhere opens the big box; Escape closes it */
  window.addEventListener(
    'keydown',
    (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.code == 'KeyK' || String(e.key).toLowerCase() == 'k')) {
        e.preventDefault();
        e.stopPropagation();
        cmdk(!$('#cmdk.open'));
      } else if (e.key == 'Escape' && $('#cmdk.open')) cmdk(false);
    },
    true
  );
  const kb = sb.querySelector('kbd');
  if (kb) {
    kb.textContent = /mac|iphone|ipad/i.test(
      (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent
    )
      ? '⌘K'
      : 'Ctrl K';
    kb.title = 'Open the big search box';
    kb.style.cursor = 'pointer';
    kb.addEventListener('click', (e) => {
      e.preventDefault();
      cmdk(true);
    });
  }
  srchHint();
  setInterval(() => {
    if (document.activeElement !== inp && !inp.value) srchHint();
  }, 3500);
}
