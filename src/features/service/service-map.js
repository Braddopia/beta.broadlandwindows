/* features/service/service-map: the live map of service calls. A real map (OpenStreetMap, drawn with Leaflet) with
   every road, street, village and river, from the whole of East Anglia down to a single street, inside and outside
   our fitting area. Each call is pinned at its postcode (looked up once with postcodes.io and remembered; only the
   postcode is sent), or the middle of its postcode area or town when that is all there is.
   Pins are coloured by what the call needs; clicking one shows the call in full with Open Call and Directions.
   The list beside the map runs nearest first, with the distance and a rough drive time from the yard.
   With no internet the map pictures cannot load: the pins still show, and the drawn map is used when offline. */
import * as L from 'leaflet';
import { onClick } from '../../core/actions.js';
import { fd, today } from '../../core/dates.js';
import { html, raw } from '../../core/html.js';
import { state } from '../../data/state.js';
import { addrOf, siteOf } from '../../domain/customers.js';
import { BASE, FIT_MILES, TOWNS, townKey } from '../../domain/places.js';
import { callPostcode, driveText, milesApart } from '../../domain/postcode.js';
import { svcOpen } from '../../domain/service.js';
import { geoKnown, geoLookup } from '../../integrations/postcodes.js';
import { prTag, svcTag } from '../../ui/components/tags.js';
import { uiState } from '../../ui/ui-state.js';

const YARD = [BASE.at[1], BASE.at[0]];
/* the yard's icon: a window, our trade */
const WIN = '<rect x="4" y="3.5" width="16" height="17" rx="1.5"/><path d="M12 3.5v17M4 12h16"/>';
const AREA_M = FIT_MILES * 1609.34;
/* what each pin colour means, most pressing first (a pin with several calls takes the most pressing colour) */
const KINDS = [
  ['u', 'Urgent'],
  ['od', 'Visit overdue'],
  ['o', 'Not booked yet'],
  ['p', 'Awaiting parts'],
  ['b', 'Visit booked'],
  ['d', 'Complete'],
];
export function callKind(c) {
  if (!svcOpen(c)) return 'd';
  if (c.priority == 'Urgent') return 'u';
  if (c.visit && c.visit < today()) return 'od';
  if (/parts/i.test(c.status || '')) return 'p';
  return c.visit ? 'b' : 'o';
}
const rank = (k) => KINDS.findIndex((x) => x[0] == k);

/* the calls on show (set when the page is drawn, used when the map is mounted after it) */
let CUR = [];
const contractOf = (c) => (c.contract ? state.contracts.find((k) => String(k.id) == String(c.contract)) : null);

/** where each call goes: its postcode's spot, its postcode area, its town, or nowhere */
function place(list, geo) {
  return list.map((c) => {
    const k = contractOf(c),
      pc = callPostcode(c, k),
      g = pc && geo[pc],
      tk = townKey(c.town || (k && k.town)),
      at = g ? g.at : tk ? [TOWNS[tk][1], TOWNS[tk][0]] : null,
      q = g ? g.q : tk ? 'town' : '',
      miles = at ? milesApart(YARD, at) : null;
    return { c, k, pc, at, q, miles, out: miles != null && miles > FIT_MILES, kind: callKind(c) };
  });
}
const pcsOf = (list) => list.map((c) => callPostcode(c, contractOf(c))).filter(Boolean);

/* ---------------- the page (drawn as HTML; the map itself is mounted afterwards) ---------------- */
export function svcLiveMap(list) {
  CUR = list;
  const P = place(list, geoKnown(pcsOf(list)));
  return String(html`<div class="smap lmap">
    <div class="panel smap-m lmap-m"><div class="lmap-stage">
      <div id="svcLeaf" class="lmap-c" data-keep role="region" aria-label="Map of service calls. Pins are placed by postcode; the dashed ring is the ${FIT_MILES}-mile area we fit in, from ${BASE.postcode}."></div>
      <div class="lmap-g lmap-sum nocap" id="lmapSum">${raw(summary(P))}</div>
      <div class="lmap-g lmap-tools"><button class="lmb" ${raw(onClick('svcMapFit'))} title="Zoom to show every call"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>All Calls</button><button class="lmb" ${raw(onClick('svcMapYard'))} title="Centre on the yard"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3.5" width="16" height="17" rx="1.5"/><path d="M12 3.5v17M4 12h16"/></svg>The Yard</button><button class="lmb ${uiState.svc.noRing ? '' : 'on'}" ${raw(onClick('svcMapRing'))} aria-pressed="${uiState.svc.noRing ? 'false' : 'true'}" title="Show or hide the area we fit in"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="1.5"/></svg>${FIT_MILES}-Mile Area</button></div>
      ${raw(keyH(P))}
      <p class="lmap-g lmap-note" id="lmapNote" hidden>The map pictures need an internet connection. Pins are still placed by postcode or town.</p>
    </div></div>
    <div class="panel smap-l lmap-l"><h2><span>Nearest First</span><small class="muted nocap">from the yard, ${BASE.postcode}</small></h2><div id="lmapList">${raw(listH(P))}</div></div>
  </div>`);
}
/* the key: a small button on the map (the colours in use and "Key") that opens a card above it with what each pin
   colour means and how many calls are that colour. Closed to start with so it does not cover the map. */
function keyH(P) {
  const on = P.filter((x) => x.at),
    n = (k) => on.filter((x) => x.kind == k).length,
    used = KINDS.filter(([k]) => n(k)),
    dots = (used.length ? used : KINDS).slice(0, 4),
    open = !!uiState.svc.key;
  return String(html`<div class="lmap-key${open ? ' open' : ''}" id="lmapKey">
    <div class="lmap-g lmap-kc nocap" id="lmapKc" ${raw(open ? '' : 'hidden')}>${KINDS.map(([k, t]) => html`<span class="lmap-kr${n(k) ? '' : ' none'}"><i class="lk ${k}"></i>${t}<em>${n(k)}</em></span>`)}<hr><span class="lmap-kr"><i class="lk o apx"></i>Rough spot</span><span class="lmap-kr"><i class="yk"><svg viewBox="0 0 24 24" aria-hidden="true">${raw(WIN)}</svg></i>The yard</span></div>
    <button type="button" class="lmap-g lmap-kb" aria-expanded="${open ? 'true' : 'false'}" aria-controls="lmapKc" ${raw(onClick('svcMapKey'))}><span class="lmap-kd">${dots.map(([k]) => html`<i class="${k}"></i>`)}</span>Key<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button>
  </div>`);
}
/** open or close the key (remembered while the app is open) */
export function svcMapKey() {
  const open = (uiState.svc.key = !uiState.svc.key),
    w = document.getElementById('lmapKey'),
    c = document.getElementById('lmapKc');
  if (!w || !c) return;
  c.hidden = !open;
  w.classList.toggle('open', open);
  const b = w.querySelector('.lmap-kb');
  if (b) b.setAttribute('aria-expanded', String(open));
}
function summary(P) {
  const on = P.filter((x) => x.at),
    out = on.filter((x) => x.out).length,
    far = on.reduce((m, x) => Math.max(m, x.miles), 0);
  if (!P.length) return 'No calls to show';
  return String(
    html`<b class="lmap-n">${P.length}</b><span><b>call${P.length == 1 ? '' : 's'} on the map</b><small>${on.length ? html`furthest ${far.toFixed(1)} miles` : ''}${out ? html` · <b class="lmap-out">${out} outside our ${FIT_MILES}-mile area</b>` : ''}${P.length - on.length ? html` · ${P.length - on.length} not on the map` : ''}</small></span>`
  );
}
function listH(P) {
  const on = P.filter((x) => x.at).sort((a, b) => a.miles - b.miles),
    off = P.filter((x) => !x.at);
  const row = (x) =>
    html`<button type="button" class="row lmap-r nocap k-${x.kind}" data-id="${x.c.id}" ${raw(onClick('svcMapFocus', x.c.id))}><span class="lmap-rn"><i class="dot ${x.kind}"></i><span><b>${x.c.id}</b> ${x.c.name}<small>${[x.c.town || (x.k && x.k.town), x.pc || 'no postcode'].filter(Boolean).join(' · ')}${x.q && x.q != 'pc' ? ' · rough spot' : ''}</small></span></span><span class="lmap-d"><b>${x.miles.toFixed(1)} mi</b><small>${driveText(x.miles)}</small>${x.out ? html`<span class="tag r">Outside area</span>` : ''}</span></button>`;
  return String(
    html`${on.length ? on.map(row) : html`<p class="empty">No calls to show.</p>`}${off.length ? html`<details class="smap-off" open><summary class="nocap">${off.length} not on the map (add a postcode or town)</summary>${off.map((x) => html`<button type="button" class="row lmap-r" ${raw(onClick('editCall', x.c.id))}><span><b>${x.c.id}</b> ${x.c.name}</span></button>`)}</details>` : ''}`
  );
}

/* ---------------- the map ---------------- */
let M = null,
  PINS = null,
  RING = null,
  BYID = {};
const yardIcon = () =>
  L.divIcon({
    className: 'lyd-w',
    html: '<div class="lyd" title="The yard"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3.5" width="16" height="17" rx="1.5"/><path d="M12 3.5v17M4 12h16"/></svg></div>',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
/* a pin drops in (staggered a little, i) and settles with a squash; several calls at one spot show their number */
const pinIcon = (kind, n, apx, i) =>
  L.divIcon({
    className: 'lpin-w',
    html: `<div class="lpin ${kind} ${apx ? 'apx' : ''}" style="--d:${Math.min(i, 12) * 45}ms"><span>${n > 1 ? n : ''}</span></div><i class="lpin-s"></i>`,
    iconSize: [32, 42],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36],
    tooltipAnchor: [14, -26],
  });
function popupH(x) {
  const c = x.c,
    addr = c.address ? [c.address, c.town].filter(Boolean).join(', ') : x.k ? siteOf(x.k) || addrOf(x.k) : c.town || '',
    dest = x.pc || [c.address, c.town].filter(Boolean).join(', '),
    dir =
      'https://www.google.com/maps/dir/?api=1&origin=' +
      encodeURIComponent(BASE.postcode) +
      '&destination=' +
      encodeURIComponent(dest);
  return html`<div class="lmp-c k-${x.kind}">
    <div class="lmp-h"><b>${c.id}</b><span>${c.name}</span><em>${(KINDS.find((k) => k[0] == x.kind) || [])[1]}</em></div>
    <div class="lmp-t">${raw(prTag(c.priority || 'Normal'))}${raw(svcTag(c.status || 'Open'))}${x.out ? html`<span class="tag r">Outside our ${FIT_MILES}-mile area</span>` : ''}</div>
    ${addr ? html`<div class="lmp-a">${addr}${x.pc && !addr.includes(x.pc) ? ', ' + x.pc : ''}</div>` : ''}
    ${c.issue ? html`<p class="lmp-i">${c.issue}</p>` : ''}
    <div class="lmp-m">${c.visit ? html`<b>Visit:</b> ${fd(c.visit)}${c.visitTime ? ' at ' + c.visitTime : ''}${c.fitter ? ' · ' + c.fitter : ''}` : html`<b>Not booked yet</b>`}</div>
    ${x.miles != null ? html`<div class="lmp-m">${x.miles.toFixed(1)} miles from the yard · ${driveText(x.miles)}${x.q && x.q != 'pc' ? html` · <i>rough spot (${x.q == 'out' ? 'postcode area' : 'town'})</i>` : ''}</div>` : ''}
    <div class="lmp-b"><button class="mini pri" ${raw(onClick('editCall', c.id))}>Open Call</button><a class="mini" href="${dir}" target="_blank" rel="noopener noreferrer">Directions</a></div>
  </div>`;
}
/* pins: calls at the same spot share one pin with the number on it */
function drawPins(P) {
  if (!M) return;
  PINS.clearLayers();
  BYID = {};
  const spots = {};
  P.filter((x) => x.at).forEach((x) => {
    const key = x.at[0].toFixed(4) + ',' + x.at[1].toFixed(4);
    (spots[key] = spots[key] || []).push(x);
  });
  Object.values(spots).forEach((S, i) => {
    S.sort((a, b) => rank(a.kind) - rank(b.kind));
    const top = S[0],
      m = L.marker(top.at, {
        icon: pinIcon(
          top.kind,
          S.length,
          S.every((x) => x.q != 'pc'),
          i
        ),
        keyboard: true,
        riseOnHover: true,
        title: S.map((x) => x.c.id + ' ' + x.c.name).join(', '),
        zIndexOffset: (KINDS.length - rank(top.kind)) * 100,
      });
    m.bindTooltip(
      String(html`<b>${S.length > 1 ? S.length + ' calls' : top.c.name}</b><br>${top.c.town || top.pc || ''}`),
      { direction: 'top', opacity: 0.95 }
    );
    m.bindPopup(String(html`${S.map(popupH)}`), {
      maxWidth: 340,
      minWidth: 270,
      autoPanPaddingTopLeft: [20, 90],
      autoPanPaddingBottomRight: [20, 20],
      className: 'lmp',
    });
    m.addTo(PINS);
    S.forEach((x) => (BYID[x.c.id] = m));
  });
}
/* the space the floating cards take, so pins are not hidden under them */
const PAD = { paddingTopLeft: [24, 84], paddingBottomRight: [24, 24] };
/** every call, wherever it is (the All Calls button) */
function fitAll(P, animate) {
  if (!M) return;
  const pts = P.filter((x) => x.at).map((x) => x.at);
  if (!pts.length) return M.setView(YARD, 10, { animate });
  M.fitBounds(L.latLngBounds([...pts, YARD]), { ...PAD, maxZoom: 13, animate });
}
/** opening view: the yard and the calls inside our area, close enough to read (about the county at most);
    calls further away are one click away with All Calls */
function fitHome(P, animate) {
  if (!M) return;
  const pts = P.filter((x) => x.at && !x.out).map((x) => x.at);
  if (!pts.length) return M.setView(YARD, 10, { animate });
  M.fitBounds(L.latLngBounds([...pts, YARD]), { ...PAD, maxZoom: 12, animate });
  if (M.getZoom() < 9) M.setView(M.getCenter(), 9, { animate });
}
function refresh(P) {
  drawPins(P);
  const sum = document.getElementById('lmapSum'),
    lst = document.getElementById('lmapList');
  if (sum) sum.innerHTML = summary(P);
  if (lst) lst.innerHTML = listH(P);
}

/** after the page is drawn: build the map in its box (or keep the one already there), then place every pin */
export function svcMapMount() {
  const el = document.getElementById('svcLeaf');
  if (!el) {
    if (M) M.remove();
    M = null;
    return;
  }
  const fresh = !M || M.getContainer() !== el;
  if (fresh) {
    if (M) M.remove();
    M = L.map(el, { zoomControl: false, scrollWheelZoom: true, worldCopyJump: false, minZoom: 6 });
    L.control.zoom({ position: 'bottomright' }).addTo(M);
    let loaded = 0,
      failed = 0;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      /* OpenStreetMap's servers need to know which website is asking (their usage policy). The page as a whole
         sends no referrer, so the map pictures alone send the site's address (never the page or anything else). */
      referrerPolicy: 'strict-origin',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    })
      .on('tileload', () => {
        loaded++;
        const n = document.getElementById('lmapNote');
        if (n) n.hidden = true;
      })
      .on('tileerror', () => {
        failed++;
        const n = document.getElementById('lmapNote');
        if (n && !loaded && failed > 2) n.hidden = false;
      })
      .addTo(M);
    /* the credit line, without the flag picture Leaflet adds (the app's own styles would stretch it) */
    M.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    L.control.scale({ imperial: true, metric: false, position: 'bottomleft' }).addTo(M);
    RING = L.featureGroup([
      L.circle(YARD, { radius: AREA_M, className: 'lring', interactive: false }),
      /* its name, on the ring's south-west edge */
      L.tooltip({ permanent: true, direction: 'center', className: 'lring-t', interactive: false })
        .setLatLng([
          YARD[0] - (AREA_M / 111320) * 0.7071,
          YARD[1] - (AREA_M / (111320 * Math.cos((YARD[0] * Math.PI) / 180))) * 0.7071,
        ])
        .setContent(`${FIT_MILES}-mile area`),
    ]);
    if (!uiState.svc.noRing) RING.addTo(M);
    L.marker(YARD, { icon: yardIcon(), keyboard: false, zIndexOffset: -100 })
      .bindTooltip(`${BASE.name} yard, ${BASE.postcode}`, { direction: 'top' })
      .addTo(M);
    PINS = L.layerGroup().addTo(M);
    /* pointing at a call in the list lifts its pin on the map */
    const lst = document.getElementById('lmapList');
    if (lst)
      lst.addEventListener('pointerover', (e) => {
        const r = e.target.closest && e.target.closest('.lmap-r[data-id]');
        document.querySelectorAll('.lpin-w.hl').forEach((p) => p.classList.remove('hl'));
        const m = r && BYID[r.dataset.id],
          ic = m && m.getElement && m.getElement();
        if (ic) ic.classList.add('hl');
      });
    M.on('moveend', () => {
      const c = M.getCenter();
      uiState.svc.mv = [c.lat, c.lng, M.getZoom()];
    });
  }
  const list = CUR,
    first = place(list, geoKnown(pcsOf(list))),
    /* a map opened fresh (not one the user has already moved) zooms again once every postcode is placed */
    refit = fresh && !uiState.svc.mv;
  drawPins(first);
  if (fresh) {
    const v = uiState.svc.mv;
    if (v) M.setView([v[0], v[1]], v[2], { animate: false });
    else fitHome(first, false);
    setTimeout(() => M && M.invalidateSize(), 60);
  }
  /* then look up any postcodes not known yet, and move the pins to their proper places */
  geoLookup(pcsOf(list)).then((geo) => {
    if (!M || M.getContainer() !== el || !el.isConnected || CUR !== list) return;
    const P = place(list, geo);
    refresh(P);
    if (refit) fitHome(P, true);
  });
}
/** the list: fly to a call and open its details */
export function svcMapFocus(id) {
  const m = BYID[id];
  if (!M || !m) return;
  const z = Math.max(M.getZoom(), 14);
  /* open the details once the map arrives (or straight away when motion is turned down) */
  let shown = false;
  const show = () => {
    if (shown) return;
    shown = true;
    m.openPopup();
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    M.setView(m.getLatLng(), z, { animate: false });
    return show();
  }
  M.once('moveend', show);
  setTimeout(show, 900);
  M.flyTo(m.getLatLng(), z, { duration: 0.6 });
}
export function svcMapFit() {
  fitAll(place(CUR, geoKnown(pcsOf(CUR))), true);
}
export function svcMapYard() {
  if (M) M.flyTo(YARD, 12, { duration: 0.6 });
}
/** show or hide the ring of the area we fit in */
export function svcMapRing() {
  uiState.svc.noRing = !uiState.svc.noRing;
  if (M && RING) uiState.svc.noRing ? RING.remove() : RING.addTo(M);
  const b = document.querySelector('.lmap-tools [aria-pressed]');
  if (b) {
    b.classList.toggle('on', !uiState.svc.noRing);
    b.setAttribute('aria-pressed', String(!uiState.svc.noRing));
  }
}
