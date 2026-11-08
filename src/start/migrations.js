/* start/migrations: One-off updates that bring older saved data up to date. Each runs once, in order. */
import { coLoad } from '../data/company.js';
import { LOW, MAX_PHOTOS, SCATS, UNITS, guessCat } from '../config/constants.js';
import { shortId, uuid } from '../core/ids.js';
import { SAFE } from '../data/sanitize.js';
import { store } from '../data/persistence.js';
import { seed } from '../data/seed.js';
import { state } from '../data/state.js';
import { CK3, CK_OLD } from '../domain/checklists.js';
import { ikey, stkId } from '../domain/stock.js';
import { pinHash } from '../features/auth/pins.js';
import { fitSync } from '../features/contracts/finance-step.js';
import { conOf } from '../features/suppliers/suppliers.js';

export function migrate() {
  const s0 = seed();
  ['items', 'leads', 'contracts', 'calls', 'contacts', 'deliveries', 'staff', 'hols', 'fin'].forEach((k) => {
    if (!Array.isArray(state[k])) state[k] = s0[k];
  });
  ['suppliers', 'orders', 'notes', 'audit'].forEach((k) => {
    if (!Array.isArray(state[k])) state[k] = [];
  });
  state.pay = state.pay || {};
  state.seen = state.seen || {};
  state.dis = state.dis || {};
  state.seq = state.seq || {};
  if (!state.suppliers.length)
    state.suppliers = [
      {
        name: 'Example Profiles Ltd',
        account: 'ACC-0001',
        terms: '30 days end of month',
        lead: 10,
        contact: 'Trade counter',
        phone: '01632 965 100',
        email: 'orders@profiles.example.com',
      },
      {
        name: 'Example Glazing Ltd',
        account: 'ACC-0002',
        terms: 'Pro forma',
        lead: 5,
        contact: 'Sales office',
        phone: '01632 965 200',
        email: 'sales@glazing.example.com',
      },
      { name: 'Example Doors Ltd', hm: 1, account: 'ACC-0003', terms: '30 days' },
    ];
  const C7 = (x) => (/^C-\d+$/.test(x) ? String(2400000 + +x.slice(2)) : x);
  state.leads.forEach((l) => {
    l.id = String(l.id).replace(/^L-/, '');
    l.photos = l.photos || [];
  });
  state.contracts.forEach((c) => {
    c.id = C7(String(c.id));
    c.pay = c.pay || [];
    c.photos = c.photos || [];
  });
  state.calls.forEach((c) => {
    c.contract = C7(String(c.contract || ''));
    c.photos = c.photos || [];
  });
  /* stock: unique ids, units, request order numbers */
  const pm = {},
    lm = {};
  state.items.forEach((r) => {
    r.photos = r.photos || [];
    r.uid = r.uid || uuid();
    r.unit = UNITS.includes(r.unit) ? r.unit : 'Each';
    if (r.reorder == null || r.reorder === '') r.reorder = LOW;
    const k = ikey(r);
    if (r.pid && !/^\d{4}$/.test(r.pid) && !/^[\w.-]{1,24}$/.test(r.pid)) {
      lm[r.pid] = lm[r.pid] || stkId();
      r.pid = lm[r.pid];
    } else if (!r.pid) {
      r.pid = pm[k] = pm[k] || stkId();
    }
  });
  state.seq.pend = state.seq.pend || 0;
  state.seq.order = state.seq.order || 0;
  state.items
    .slice()
    .reverse()
    .forEach((r) => {
      if (r.type != 'request') return;
      if (!r.reqStatus) r.reqStatus = r.cleared ? 'Cleared' : 'Pending';
      if (!r.ord) r.ord = 'P' + String(++state.seq.pend).padStart(4, '0');
    });
  /* public review scores shown on the overview and customer documents (admin can update) */
  coLoad();
  /* one fitter field became up to six */
  state.contracts.forEach(fitSync);
  state.brand = state.brand || {};
  state.brand.tp = state.brand.tp || {
    score: 4.5,
    count: '',
    url: 'https://uk.trustpilot.com/review/broadlandwindows.co.uk',
  };
  state.brand.g = state.brand.g || { score: 4.5, count: '', url: '' };
  /* review sites figures as published (Nov 2026); admins update them in Admin Console > Reviews */
  if (!state.brand.tp.count) state.brand.tp.count = '21';
  state.brand.tt = state.brand.tt || {
    score: 4.9,
    count: '613',
    url: 'https://trustedtrader.team/Norfolk/Broadland-Windows-0000015.html',
  };
  state.brand.rl = state.brand.rl || {
    score: 9.6,
    count: '650',
    rec: '99',
    url: 'https://www.referenceline.com/replacement_doors_windows_conservatories-in-norwich-broadlandwindowsltd-24531',
  };
  /* short quotes from public reviews; names of reviewers are deliberately not stored */
  if (!Array.isArray(state.brand.quotes))
    state.brand.quotes = [
      {
        src: 'Trusted Trader',
        d: '2026-10-24',
        t: 'Very impressed from start to finish with the service for our 2 replacement windows and 1 replacement door. Everyone we dealt with was friendly and courteous.',
      },
      {
        src: 'Trusted Trader',
        d: '2026-10-22',
        t: 'A thoroughly professional, local company that is a pleasure to deal with. Their work is of the highest quality and so is their service.',
      },
      {
        src: 'Trusted Trader',
        d: '2026-10-22',
        t: 'Excellent service from start to finish. Very pleased with our quality new windows and door. They have transformed our property.',
      },
      {
        src: 'Trusted Trader',
        d: '2026-10-16',
        t: 'Always on time, worked hard, efficient and clearly knew what they were doing. I can recommend Broadland Windows without hesitation.',
      },
      {
        src: 'Trusted Trader',
        d: '2026-09-27',
        t: 'The work was done quickly, with hardly any mess, and we have now got a lovely new bedroom window.',
      },
      {
        src: 'Trusted Trader',
        d: '2026-07-28',
        t: 'Very professional, punctual and very competitive. The quality of the products they provide is also top-notch.',
      },
      {
        src: 'ReferenceLine',
        d: '2022-12-04',
        t: 'I was very pleased with Broadland Windows work and would happily recommend them.',
      },
      {
        src: 'ReferenceLine',
        d: '2022-11-07',
        t: 'Very happy with all the work undertaken by a professional, friendly team.',
      },
      {
        src: 'ReferenceLine',
        d: '2022-10-10',
        t: 'Very efficient, helpful, tidy. All surfaces cleaned and all old material taken away. Very professional at all times.',
      },
    ];
  /* show the two new review tiles once on an office board someone already customised */
  /* the four review tiles became one card */
  if (!state.brand._rv3) {
    state.brand._rv3 = 1;
    state.brand._rv2 = 1;
    const o = (state.boards || {}).office;
    if (o && Array.isArray(o.k)) {
      const i = o.k.findIndex((k) => ['g', 'tp', 'tt', 'rl'].includes(k));
      o.k = o.k.filter((k) => !['g', 'tp', 'tt', 'rl'].includes(k));
      if (!o.k.includes('rv')) o.k.splice(i < 0 ? 0 : i, 0, 'rv');
    }
  }
  if (!state.brand._rv2) {
    state.brand._rv2 = 1;
    const o = (state.boards || {}).office;
    if (o && Array.isArray(o.k))
      ['tt', 'rl'].forEach((k) => {
        if (!o.k.includes(k)) o.k.splice(Math.min(2, o.k.length), 0, k);
      });
  }
  /* profile: who is using this browser */
  if (!state.profile) {
    const u = state.staff.find((s) => s.name == 'Demo User') || state.staff[0] || {};
    state.profile = {
      sid: u.id || '',
      name: u.name || 'Demo User',
      email: u.email || '',
      phone: u.phone || '',
      mobile: '',
      emergency: '',
      signature: '',
      notes: '',
    };
  }
  /* security: per-install salt and hashed PINs (default 1234 until changed) */
  state.sec = state.sec || {};
  state.sec.salt = state.sec.salt || uuid();
  state.sec.pins = state.sec.pins || {};
  ['admin', 'beta'].forEach((r) => {
    if (!state.sec.pins[r]) state.sec.pins[r] = { h: pinHash(r, '1234'), def: 1 };
  });
  ['finance', 'sales', 'stock', 'fitter'].forEach((r) => delete state.sec.pins[r]);
}
export function supCon() {
  if (state.supCon) return;
  state.suppliers.forEach((s) => {
    if (!conOf(s.name))
      state.contacts.push({
        id: shortId('K'),
        co: s.name,
        name: s.contact || '',
        role: s.role || '',
        type: 'Supplier',
        phone: s.phone || '',
        email: s.email || '',
        addr: s.address || '',
      });
  });
  state.supCon = 1;
  store();
}
/* ---------------- leads ----------------
   Lead refs are L0001, L0002... A converted lead moves into its new contract
   (7-digit contract number) and leaves the lead list, so its L number is free
   to be given to the next new lead. */
/* staff categories (added after load so old saves get one too) */
export function staffCats() {
  let ch = 0;
  (state.staff || []).forEach((s) => {
    if (!SCATS.includes(s.cat)) {
      s.cat = guessCat(s.role || '');
      ch = 1;
    }
  });
  if (ch) store();
}
export function salesABC() {
  if (state.salesABC) return;
  ['Sales B', 'Sales C'].forEach((n, i) => {
    if (!state.staff.some((s) => s.name == n))
      state.staff.push({
        id: 'U-S' + (i + 2),
        name: n,
        role: 'Sales consultant',
        team: '',
        phone: '07700 900 ' + (610 + i * 7),
        email: n.toLowerCase().replace(' ', '.') + '@example.com',
        start: '2025-03-0' + (i + 3),
        allow: 25,
        salary: 30000,
        cat: 'Salespeople',
      });
  });
  state.salesABC = 1;
  store();
}
export function migrateLeads() {
  if (state.leadsV2) return;
  state.leadArchive = state.leadArchive || [];
  const conv = state.leads.filter((l) => l.contract);
  state.leadArchive.push(
    ...conv.map((l) => ({ ...l, convertedTo: (state.contracts.find((c) => c.lead == l.id) || {}).id || '' }))
  );
  let n = 0;
  state.leads = state.leads
    .filter((l) => !l.contract)
    .map((l) => {
      const old = l.id;
      l.id = 'L' + String(++n).padStart(4, '0');
      l.oldRef = old;
      state.contracts.forEach((c) => {
        if (c.lead == old) c.lead = l.id;
      });
      return l;
    });
  state.leadsV2 = 1;
  store();
}
export function ckReword() {
  if (state.ckV2) return;
  [...state.leads, ...state.contracts, ...(state.leadArchive || [])].forEach((r) => {
    if (!r.chk) return;
    const n = {};
    Object.entries(r.chk).forEach(([k, v]) => {
      const lead = state.leads.includes(r) || (state.leadArchive || []).includes(r);
      n[k == 'Survey done' && lead ? 'Home survey carried out' : CK_OLD[k] || k] = v;
    });
    r.chk = n;
  });
  state.ckV2 = 1;
  store();
}
export function ckReword3() {
  if (state.ckV3) return;
  [...state.leads, ...state.contracts, ...(state.leadArchive || [])].forEach((r) => {
    if (!r.chk) return;
    const n = {};
    Object.entries(r.chk).forEach(([k, v]) => {
      n[CK3[k] || k] = v;
    });
    r.chk = n;
  });
  state.ckV3 = 1;
  store();
}
export function holV2() {
  let ch = 0;
  if (!state.abs) {
    state.abs = {
      'U-5': { '2026-11-02': 'S', '2026-11-03': 'S' },
      'U-4': { '2026-11-13': 'H1' },
      'U-7': { '2026-11-20': 'N' },
    };
    ch = 1;
  }
  if (!state.shut) {
    state.shut = {};
    ch = 1;
  }
  if (!state.hol25) {
    state.staff.forEach((s) => {
      if (s.allow == 28 || s.allow == 33 || s.allow == null) s.allow = 25;
    });
    state.hol25 = 1;
    ch = 1;
  }
  if (ch) store();
}
/* ==========================================================================
   09 · Inventory
   - Products view: KPIs, filters, sort/filter popover, batch tools, 50 rows/page
   - Movements view: stock in/out log and requests (pending order numbers)
   - Near full-screen item editor with photos
   Model: S.items is a movement log; the newest row per Stock ID (pid) holds
   the product's current details. Product photos live in S.pphotos[pid].
   ========================================================================== */
export function migratePhotos() {
  state.pphotos = state.pphotos || {};
  state.items.forEach((r) => {
    if (r.photos && r.photos.length) {
      const a = (state.pphotos[r.pid] = state.pphotos[r.pid] || []);
      r.photos.forEach((p) => {
        if (SAFE.img(p) && !a.includes(p) && a.length < MAX_PHOTOS) a.push(p);
      });
    }
    delete r.photos;
  });
}
/* move old single phone/email/address fields into the new structure */
export function migrateCustomers() {
  if (state.custV1) return;
  [...state.leads, ...state.contracts].forEach((r) => {
    if (r.phone && !r.mob1 && !r.home1) {
      if (/^\s*07/.test(r.phone)) r.mob1 = r.phone;
      else r.home1 = r.phone;
    }
    if (r.email && !r.email1) r.email1 = r.email;
    if (r.address && !r.homeAddr) r.homeAddr = r.address;
    r.invSame = r.invSame || 'Same as home';
    r.siteSame = r.siteSame || 'Same as home';
  });
  state.custV1 = 1;
  store();
}
