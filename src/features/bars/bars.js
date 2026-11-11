/* features/bars/bars: Cutting Optimiser. Lengths of profile cut from full bars: for each profile, the bar
   length and the cuts (room or position, frame reference, length, how many, end angles). The plan
   (domain/barcut.js) shows every bar with its cuts drawn as they come off the saw, the offcut and the
   waste, updating as you type. It prints as a saw cutting list on the company's A4 report, can be kept
   on the contract, and lists can be saved and opened again. Profiles can come from Inventory once they
   are linked there (Inventory, Cutting Data). */
import { plugInCombo } from '../../ui/components/pickers.js';
import { onClick, onEvent } from '../../core/actions.js';
import { fd, today } from '../../core/dates.js';
import { $ } from '../../core/dom.js';
import { html, raw } from '../../core/html.js';
import { uuid } from '../../core/ids.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { SAFE } from '../../data/sanitize.js';
import { state } from '../../data/state.js';
import { barLenOf, groupBars, optimiseBars } from '../../domain/barcut.js';
import { jobTitle } from '../../domain/job-title.js';
import { canSee } from '../../domain/permissions.js';
import { products, unitOf } from '../../domain/stock.js';
import { printDoc } from '../../print/print.js';
import { form } from '../../ui/forms/form.js';
import { askIn, closeModal, openModal } from '../../ui/modal.js';
import { render } from '../../ui/shell/router.js';
import { toast } from '../../ui/toast.js';
import { fx } from '../files/files.js';

const ANG = [90, 45];
const cut0 = (label = '', len = 1000, qty = 1) => ({ label, ref: '', len, qty, aL: 45, aR: 45 });
const prof0 = () => ({ code: '', desc: '', bar: 6500, cuts: [cut0('', 1000, 1)] });
const BLANK = () => ({ name: '', jobNo: '', jobName: '', kerf: 4, trim: 10, profiles: [prof0()] });

/** the cutting list being worked on (kept with the rest of the data) */
export function barData() {
  if (!state.bars || !Array.isArray(state.bars.profiles))
    state.bars = { ...BLANK(), jobs: (state.bars && state.bars.jobs) || [] };
  state.bars.jobs = state.bars.jobs || [];
  return state.bars;
}
/* whole millimetres, or to the half millimetre when a length has one (965.5) */
const mm = (x) => (Math.round((+x || 0) * 10) / 10).toLocaleString('en-GB');
const pct = (x) => (Math.round(x * 1000) / 10).toFixed(1) + '%';
const HUES = [212, 172, 262, 38, 328, 192, 148, 14, 234, 52];
const hue = (s) => HUES[[...String(s || '-')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7) % HUES.length];

/* ---- profiles linked in Inventory (Cutting Data): Stock ID -> bar length ---- */
const linked = () => (state.cutProf && typeof state.cutProf == 'object' ? state.cutProf : (state.cutProf = {}));
/** the inventory products marked as profiles, with their bar length */
export const barProducts = () =>
  products()
    .filter((r) => linked()[r.pid])
    .map((r) => ({ r, bar: +linked()[r.pid].bar || barLenOf(r.length) || 6500 }));
const findProd = (code) => {
  const c = String(code || '')
    .trim()
    .toUpperCase();
  return c ? barProducts().find((x) => String(x.r.item).toUpperCase() == c) || null : null;
};

/** one bar drawn as it comes off the saw: each cut a shape with its end angles, labels above, the offcut at the end.
    print = true draws it light for paper */
export function barSvg(b, bar, trim, print) {
  const W = print ? 640 : 1000,
    s = W / bar,
    H = 30,
    y = 22,
    out = [];
  let x = trim * s;
  const kerfPx = (b.kerf || 0) * s;
  b.cuts.forEach((c, i) => {
    if (i) x += kerfPx;
    const w = c.len * s,
      dl = c.aL == 45 ? Math.min(H * 0.55, w / 3) : 0,
      dr = c.aR == 45 ? Math.min(H * 0.55, w / 3) : 0,
      h = hue(c.label);
    out.push(
      html`<g class="bc"><polygon points="${x},${y} ${x + w},${y} ${x + w - dr},${y + H} ${x + dl},${y + H}" style="fill:hsl(${h} ${print ? '70% 92%' : '65% 55%'});stroke:hsl(${h} ${print ? '40% 35%' : '85% 80%'})"/>${
        w > 34
          ? html`<text class="bl" x="${x + w / 2}" y="${y - 6}">${c.label ? c.label.toUpperCase().slice(0, Math.floor(w / 7)) : ''}</text><text class="bn${w < 80 ? ' sm' : ''}" x="${x + w / 2}" y="${y + H / 2 + 1}">${mm(c.len)}${c.ref ? ` (${c.ref})` : ''}</text>`
          : ''
      }${w > 50 ? html`<text class="ba" x="${x + 4}" y="${y + H + 12}">${c.aL}°</text><text class="ba e" x="${x + w - 4}" y="${y + H + 12}">${c.aR}°</text>` : ''}<title>${c.label || 'Cut'}${c.ref ? ' (' + c.ref + ')' : ''}: ${mm(c.len)}mm, ${c.aL}° / ${c.aR}°</title></g>`
    );
    x += w;
  });
  const offX = x + (b.cuts.length ? kerfPx : 0);
  return html`<svg class="bar-s ${print ? 'pr' : ''}" viewBox="-2 0 ${W + 70} ${y + H + 18}" role="img" aria-label="Bar with ${b.cuts.length} cuts, ${mm(b.off)}mm left">
    <rect class="bb" x="0" y="${y}" width="${W}" height="${H}" rx="${print ? 0 : 3}"/>
    ${out}
    ${b.off > 0 ? html`<rect class="bo" x="${offX}" y="${y}" width="${Math.max(0, W - offX - trim * s)}" height="${H}"/>` : ''}
    <text class="bw" x="${W + 8}" y="${y + H / 2 + 1}">${mm(b.off)}</text>
  </svg>`;
}

/* ---- the page ---- */
const cutRow = (pi, c, ci) =>
  html`<div class="bar-r"><span class="cut-dot" style="--h:${hue(c.label)}"></span>
    <label class="bar-f bar-room"><span>Room / Position</span><input id="bar_c_${pi}_${ci}_label" maxlength="40" value="${c.label}" autocomplete="off"></label>
    <label class="bar-f bar-ref"><span>Ref</span><input id="bar_c_${pi}_${ci}_ref" maxlength="12" value="${c.ref}" autocomplete="off"></label>
    <label class="bar-f bar-n"><span>Length <i class="nocap">(mm)</i></span><input id="bar_c_${pi}_${ci}_len" type="number" min="0" max="20000" step="0.5" inputmode="decimal" value="${c.len}"></label>
    <label class="bar-f bar-q"><span>How Many</span><input id="bar_c_${pi}_${ci}_qty" type="number" min="0" max="1000" step="1" inputmode="numeric" value="${c.qty}"></label>
    <label class="bar-f bar-a"><span>Left End</span><select id="bar_c_${pi}_${ci}_aL">${ANG.map((a) => html`<option value="${a}" ${raw(+c.aL == a ? 'selected' : '')}>${a}°</option>`)}</select></label>
    <label class="bar-f bar-a"><span>Right End</span><select id="bar_c_${pi}_${ci}_aR">${ANG.map((a) => html`<option value="${a}" ${raw(+c.aR == a ? 'selected' : '')}>${a}°</option>`)}</select></label>
    <button class="cut-x" aria-label="Remove cut ${ci + 1}" title="Remove" ${raw(onClick('barCutDel', pi, ci))}>&times;</button></div>`;

/** the plan for one profile: totals line, then each bar (bars cut the same way are counted together) */
export function barPlan(D, p, pi) {
  const R = optimiseBars({ bar: p.bar, kerf: D.kerf, trim: D.trim, cuts: p.cuts }),
    S = R.stats,
    G = groupBars(R.bars.map((b) => ({ ...b, kerf: D.kerf })));
  const lp = findProd(p.code);
  return String(html`<div class="bar-sum"><b>${S.bars} bar${S.bars == 1 ? '' : 's'}</b><span>Wastage, including what is left of each bar: ${mm(S.waste)}mm = ${pct(S.wastePct)}</span>${
    lp ? html`<span class="${lp.r.stock < S.bars ? 'bad' : 'ok'}">${lp.r.stock} ${unitOf(lp.r)} in stock</span>` : ''
  }</div>
    ${R.unplaced.length ? html`<div class="note bad"><b>${R.unplaced.length} cut${R.unplaced.length == 1 ? '' : 's'} longer than the bar:</b> ${[...new Set(R.unplaced.map((u) => mm(u.len) + 'mm'))].join(', ')}.</div>` : ''}
    ${G.map((g, i) => html`<div class="bar-row"><span class="bar-no">${i + 1})</span><span class="bar-x">${g.n}×</span><div class="bar-svg">${barSvg(g.bar, p.bar, D.trim)}</div></div>`)}
    ${R.bars.length ? '' : html`<p class="muted bar-none">Add a cut to see the bars.</p>`}`);
}
const kpis = (D) => {
  const A = D.profiles.map((p) => optimiseBars({ bar: p.bar, kerf: D.kerf, trim: D.trim, cuts: p.cuts }).stats),
    bars = A.reduce((s, x) => s + x.bars, 0),
    cuts = A.reduce((s, x) => s + x.cuts, 0),
    total = A.reduce((s, x) => s + x.total, 0),
    waste = A.reduce((s, x) => s + x.waste, 0);
  return String(
    html`<div class="kpi"><small>Bars Needed</small><b>${bars}</b><span class="ksub">${D.profiles.length} profile${D.profiles.length == 1 ? '' : 's'}</span></div><div class="kpi"><small>Cuts</small><b>${cuts}</b></div><div class="kpi ${total && waste / total > 0.2 ? 'warn' : ''}"><small>Wastage</small><b>${total ? pct(waste / total) : '0%'}</b></div><div class="kpi"><small>Wastage Length</small><b>${mm(waste)}mm</b></div>`
  );
};
export const barContract = (D = barData()) => {
  const k = String(D.jobNo || '').trim();
  return k ? state.contracts.find((c) => String(c.id) == k) || null : null;
};
const barTitle = (D) => jobTitle(D.jobNo, D.jobName) || 'Cutting Optimiser';

export function vBars() {
  const D = barData(),
    k = barContract(D),
    L = barProducts();
  return String(html`<div class="head"><div><h1 id="barTitle">${barTitle(D)}</h1><span class="muted">Cut lengths of profile from full bars with the least waste</span></div>
    <div class="tools"><button class="mini" ${raw(onClick('barJobs'))}>Saved Lists (${D.jobs.length})</button><button class="mini" ${raw(onClick('barNew'))}>New List</button><button class="mini" ${raw(onClick('barSave'))}>Save</button><button class="mini pri" id="barToC" ${raw(onClick('barToContract'))} ${k && canSee('contracts') ? '' : raw('hidden')}>Save To Contract</button><button class="btn" ${raw(onClick('barPrint'))}>Print Cutting List</button></div></div>
  <div class="cut-in bar-in" ${raw(onEvent('oninput', 'barEdit', 'event'))} ${raw(onEvent('onchange', 'barEdit', 'event'))}>
    <div class="cut-top">
      <div class="panel cut-job"><h2><span>Job</span><small class="muted nocap" id="barJobHint">${k ? 'Contract ' + k.id + ' found: Save To Contract keeps the list with its documents' : 'Type the contract number to link the list to it'}</small></h2><div class="cut-og cut-og2">
        <div class="ff"><label for="bar_job_no">Job Number</label><input id="bar_job_no" maxlength="30" data-combo="jobs" value="${D.jobNo || ''}" autocomplete="off"></div>
        <div class="ff"><label for="bar_job_name">Job Name</label><input id="bar_job_name" maxlength="80" value="${D.jobName || ''}" autocomplete="off"></div>
      </div></div>
      <div class="panel cut-set"><h2><span>Saw Settings</span></h2><div class="cut-og cut-og2">
        <div class="ff"><label for="bar_opt_kerf">Saw Blade Width <span class="nocap">(mm)</span></label><input id="bar_opt_kerf" type="number" min="0" max="20" step="0.1" value="${D.kerf}"></div>
        <div class="ff"><label for="bar_opt_trim">End Trim Each End <span class="nocap">(mm)</span></label><input id="bar_opt_trim" type="number" min="0" max="200" step="1" value="${D.trim}"></div>
      </div></div>
    </div>
    ${D.profiles.map(
      (p, pi) => html`<div class="panel bar-p">
        <div class="bar-ph"><span class="bar-pn">Profile ${pi + 1}</span>
          <label class="bar-f bar-code"><span>Profile Code</span><input id="bar_p_${pi}_code" maxlength="40" data-combo="profiles" value="${p.code}" autocomplete="off"></label>
          <label class="bar-f bar-desc"><span>Description</span><input id="bar_p_${pi}_desc" maxlength="80" value="${p.desc}" autocomplete="off"></label>
          <label class="bar-f bar-n"><span>Bar Length <i class="nocap">(mm)</i></span><input id="bar_p_${pi}_bar" type="number" min="500" max="20000" step="1" value="${p.bar}"></label>
          ${D.profiles.length > 1 ? html`<button class="mini del" ${raw(onClick('barProfDel', pi))}>Remove Profile</button>` : ''}</div>
        <div class="bar-cuts">${p.cuts.map((c, ci) => cutRow(pi, c, ci))}</div>
        <div class="cut-add"><button class="mini" ${raw(onClick('barCutAdd', pi))}>+ Add Cut</button></div>
        <div class="bar-out" id="barOut_${pi}">${raw(barPlan(D, p, pi))}</div>
      </div>`
    )}
    <div class="cut-add bar-addp"><button class="btn ghost" ${raw(onClick('barProfAdd'))}>+ Add Profile</button>${L.length ? '' : html`<span class="muted">Profiles can come from Inventory once they are linked under Inventory, Cutting Data.</span>`}</div>
  </div>
  <div class="kpis cut-k" id="barKpis">${raw(kpis(D))}</div>`);
}

/* ---- typing: read the box back, redraw only the plan, so the box keeps its place ---- */
let saveT = 0;
function refresh(pi) {
  const D = barData();
  (pi == null ? D.profiles.map((_, i) => i) : [pi]).forEach((i) => {
    const o = $('#barOut_' + i);
    if (o && D.profiles[i]) o.innerHTML = barPlan(D, D.profiles[i], i);
  });
  const k = $('#barKpis');
  if (k) k.innerHTML = kpis(D);
  clearTimeout(saveT);
  saveT = setTimeout(store, 400);
}
function jobBits() {
  const D = barData(),
    k = barContract(D),
    t = $('#barTitle'),
    h = $('#barJobHint'),
    b = $('#barToC');
  if (t) t.textContent = barTitle(D);
  if (h)
    h.textContent = k
      ? 'Contract ' + k.id + ' found: Save To Contract keeps the list with its documents'
      : 'Type the contract number to link the list to it';
  if (b) b.hidden = !(k && canSee('contracts'));
}
export function barEdit(e) {
  const t = e && e.target,
    m = t && /^bar_(job|opt|p|c)_(\w+?)(?:_(\w+?))?(?:_(\w+))?$/.exec(t.id);
  if (!m) return;
  const D = barData();
  if (m[1] == 'job') {
    if (m[2] == 'no') {
      D.jobNo = SAFE.text(t.value, 30);
      const k = barContract(D),
        nm = $('#bar_job_name');
      if (k && nm && (!D.jobName || D.jobName == D.autoName)) {
        D.jobName = D.autoName = k.name || '';
        nm.value = D.jobName;
      }
    } else D.jobName = SAFE.text(t.value, 80);
    jobBits();
    clearTimeout(saveT);
    saveT = setTimeout(store, 400);
    return;
  }
  if (m[1] == 'opt') {
    D[m[2]] = SAFE.num(t.value, { min: 0, max: m[2] == 'kerf' ? 20 : 200, dp: 1 }) ?? 0;
    return refresh();
  }
  if (m[1] == 'p') {
    const pi = +m[2],
      p = D.profiles[pi],
      f = m[3];
    if (!p) return;
    if (f == 'bar') p.bar = SAFE.num(t.value, { min: 0, max: 20000, dp: 0 }) ?? 0;
    else if (f == 'desc') p.desc = SAFE.text(t.value, 80);
    else if (f == 'code') {
      p.code = SAFE.text(t.value, 40).toUpperCase();
      /* a profile linked in Inventory fills in its description and bar length */
      const lp = findProd(p.code);
      if (lp) {
        p.desc = p.desc || lp.r.desc || '';
        p.bar = lp.bar;
        const dEl = $('#bar_p_' + pi + '_desc'),
          bEl = $('#bar_p_' + pi + '_bar');
        if (dEl) dEl.value = p.desc;
        if (bEl) bEl.value = p.bar;
      }
    }
    return refresh(pi);
  }
  const pi = +m[2],
    ci = +m[3],
    f = m[4],
    c = D.profiles[pi] && D.profiles[pi].cuts[ci];
  if (!c) return;
  if (f == 'label') c.label = SAFE.text(t.value, 40);
  else if (f == 'ref') c.ref = SAFE.text(t.value, 12);
  else if (f == 'aL' || f == 'aR') c[f] = ANG.includes(+t.value) ? +t.value : 90;
  else c[f] = SAFE.num(t.value, { min: 0, max: f == 'qty' ? 1000 : 20000, dp: f == 'qty' ? 0 : 1 }) ?? 0;
  refresh(pi);
}
export function barCutAdd(pi) {
  const p = barData().profiles[pi];
  if (!p || p.cuts.length >= 300) return;
  const last = p.cuts[p.cuts.length - 1];
  p.cuts.push(cut0(last ? last.label : '', last ? last.len : 1000, 1));
  store();
  render(true);
  const el = $('#bar_c_' + pi + '_' + (p.cuts.length - 1) + '_len');
  if (el) el.focus();
}
export function barCutDel(pi, ci) {
  const p = barData().profiles[pi];
  if (!p) return;
  p.cuts.splice(ci, 1);
  store();
  render(true);
}
export function barProfAdd() {
  const D = barData();
  if (D.profiles.length >= 40) return;
  D.profiles.push(prof0());
  store();
  render(true);
}
export function barProfDel(pi) {
  const D = barData(),
    p = D.profiles[pi];
  if (!p) return;
  askIn('Remove Profile ' + (pi + 1) + '?', 'Its cuts are removed from this list.', 'Remove', () => {
    D.profiles.splice(pi, 1);
    if (!D.profiles.length) D.profiles.push(prof0());
    store();
    render(true);
  });
}
export function barNew() {
  askIn(
    'Start a new cutting list?',
    'The list on screen is cleared. Save it first if you want to keep it.',
    'Start New',
    () => {
      const jobs = barData().jobs;
      state.bars = { ...BLANK(), jobs };
      store();
      render();
    }
  );
}
const copyOf = (D) =>
  JSON.parse(
    JSON.stringify({
      name: D.name,
      jobNo: D.jobNo,
      jobName: D.jobName,
      kerf: D.kerf,
      trim: D.trim,
      profiles: D.profiles,
    })
  );
export function barSave() {
  const D = barData();
  form(
    'Save Cutting List',
    [{ k: 'name', l: 'Name', req: 1, max: 60 }],
    { name: D.name || jobTitle(D.jobNo, D.jobName) },
    (o) => {
      const name = SAFE.text(o.name, 60);
      D.name = name;
      D.jobs = D.jobs.filter((j) => j.name != name);
      D.jobs.unshift({ ...copyOf(D), name, at: today(), by: USER });
      D.jobs = D.jobs.slice(0, 100);
      audit('Cutting list saved', name, D.profiles.length + ' profiles');
      toast('Saved ' + name);
    }
  );
}
export function barJobs() {
  const D = barData();
  openModal(
    String(
      html`<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>Saved Cutting Lists</h2><div class="cut-jobs">${
        D.jobs.length
          ? D.jobs.map(
              (j, i) =>
                html`<div class="row"><span><b>${j.name}</b><br><span class="muted">${j.profiles.length} profile${j.profiles.length == 1 ? '' : 's'} · saved ${fd(j.at)} by ${j.by || '-'}</span></span><span class="acts"><button class="mini pri" ${raw(onClick('barOpen', i))}>Open</button><button class="mini del" ${raw(onClick('barForget', i))}>Delete</button></span></div>`
            )
          : html`<p class="empty">Nothing saved yet. Use Save on the Cutting Optimiser to keep a list.</p>`
      }</div><div class="mact"><button class="btn ghost" data-act="closeModal">Close</button></div>`
    )
  );
}
export function barOpen(i) {
  const D = barData(),
    j = D.jobs[i];
  if (!j) return;
  Object.assign(D, copyOf(j));
  store();
  closeModal();
  render();
}
export function barForget(i) {
  const D = barData(),
    j = D.jobs[i];
  if (!j) return;
  askIn(
    'Delete ' + j.name + '?',
    'The saved cutting list is removed for everyone.',
    'Delete',
    () => {
      D.jobs.splice(i, 1);
      audit('Cutting list deleted', j.name, '');
      store();
      barJobs();
    },
    true
  );
}

/* ---- the saw list on the company's A4 report: job, totals, a cut list, then each profile's bars ---- */
function listDoc(asHtml) {
  const D = barData(),
    P = D.profiles
      .map((p) => ({ p, R: optimiseBars({ bar: p.bar, kerf: D.kerf, trim: D.trim, cuts: p.cuts }) }))
      .filter((x) => x.R.bars.length || x.R.unplaced.length);
  if (!P.length) {
    toast('Add a profile and some cuts first');
    return null;
  }
  const bars = P.reduce((s, x) => s + x.R.stats.bars, 0),
    total = P.reduce((s, x) => s + x.R.stats.total, 0),
    waste = P.reduce((s, x) => s + x.R.stats.waste, 0),
    title = jobTitle(D.jobNo, D.jobName);
  const secs = P.map(({ p, R }) => {
    const G = groupBars(R.bars.map((b) => ({ ...b, kerf: D.kerf })));
    return `<section class="bsec"><h3>${html`${[p.code, p.desc].filter(Boolean).join(', ') || 'Profile'}`}<span>Bar length <b>${mm(p.bar)}mm</b></span></h3>${G.map(
      (g, i) =>
        `<div class="brow"><span class="bno">${i + 1})</span><span class="bx">${g.n}×</span>${barSvg(g.bar, p.bar, D.trim, true)}</div>`
    ).join(
      ''
    )}<p class="bft"><b>${R.stats.bars} bar${R.stats.bars == 1 ? '' : 's'}</b> Wastage, including what is left of each bar: ${mm(R.stats.waste)}mm = ${pct(R.stats.wastePct)}${R.unplaced.length ? ` · <b class="bad">${R.unplaced.length} cut${R.unplaced.length == 1 ? '' : 's'} longer than the bar</b>` : ''}</p></section>`;
  }).join('');
  return printDoc(
    title || 'Cutting List',
    (title ? 'Cutting list · ' : '') + 'Saw blade ' + D.kerf + 'mm · end trim ' + D.trim + 'mm',
    [],
    [],
    {
      kind: 'Cutting List',
      asHtml,
      groups: [
        {
          t: 'Job',
          r: [
            ['Job number', D.jobNo || '-'],
            ['Job name', D.jobName ? String(D.jobName).toLocaleUpperCase('en-GB') : '-'],
            ['Prepared by', USER],
          ],
        },
      ],
      kpis: [
        ['Bars needed', String(bars), P.length + ' profile' + (P.length == 1 ? '' : 's')],
        ['Cuts', String(P.reduce((s, x) => s + x.R.stats.cuts, 0))],
        ['Wastage', total ? pct(waste / total) : '0%'],
        ['Wastage length', mm(waste) + 'mm'],
      ],
      tables: [
        {
          t: 'Cut List',
          h: ['Profile', 'Room / position', 'Ref', 'Length (mm)', 'How many', 'Ends'],
          r: P.flatMap(({ p }) =>
            p.cuts
              .filter((c) => +c.len > 0 && +c.qty > 0)
              .map((c) => [
                p.code || '-',
                c.label || '-',
                c.ref || '-',
                mm(c.len),
                String(c.qty),
                c.aL + '° / ' + c.aR + '°',
              ])
          ),
        },
      ],
      post: `<style>.bsec{break-inside:avoid;margin:7mm 0 0}.bsec h3{display:flex;align-items:baseline;gap:4mm;padding-bottom:1.5mm;border-bottom:.35mm solid #012b59;text-transform:uppercase}.bsec h3 span{margin-left:auto;font-weight:400;text-transform:none;color:#5b6b80;font-size:8.5pt}.bsec h3 span b{color:#012b59}.brow{display:grid;grid-template-columns:7mm 8mm 1fr;align-items:center;break-inside:avoid;margin:1.5mm 0}.bno,.bx{font-weight:700;font-size:8.5pt}.bar-s{display:block;width:100%;height:auto}.bar-s .bb{fill:#f7f9fc;stroke:#c9d3e0;stroke-width:1}.bar-s .bo{fill:url(#none);fill:#eef1f6;stroke:#9aa7b8;stroke-dasharray:3 2}.bar-s polygon{stroke-width:1.2}.bar-s text{font-family:Arial,sans-serif;fill:#13233a}.bar-s .bl{font-size:7.5px;letter-spacing:.06em;text-anchor:middle;font-weight:700}.bar-s .bn{font-size:9px;text-anchor:middle;dominant-baseline:middle}.bar-s .bn.sm{font-size:7px}.bar-s .ba{font-size:7px;fill:#5b6b80}.bar-s .ba.e{text-anchor:end}.bar-s .bw{font-size:9px;font-weight:700;dominant-baseline:middle}.bft{margin:2mm 0 0;font-size:8.6pt;color:#34465f}.bft b{color:#012b59;margin-right:3mm}.bft .bad{color:#b42318}</style>${secs}`,
    }
  );
}
export function barPrint() {
  listDoc(false);
}
export async function barToContract() {
  const D = barData(),
    k = barContract(D);
  if (!k) return toast('Type the contract number in Job Number first');
  if (!canSee('contracts')) return toast('Your account cannot open contracts');
  const page = listDoc(true);
  if (!page) return;
  const name = jobTitle(k.id, D.jobName || k.name) + ' Cutting List ' + today() + '.html',
    blob = new Blob([page], { type: 'text/html' });
  try {
    await fx('readwrite', (st) =>
      st.put({
        id: uuid(),
        ref: 'contract:' + k.id,
        name: SAFE.text(name, 120),
        cat: 'Drawing',
        size: blob.size,
        type: 'text/html',
        gen: 'cutplan',
        time: Date.now(),
        by: USER,
        blob,
      })
    );
    audit('Cutting list saved to contract', k.id, name);
    store();
    toast('Saved to contract ' + k.id + ' documents');
  } catch (e) {
    toast('Document storage is not available here');
  }
}

/* ---- Inventory, Cutting Data: which products are profiles, and their bar length ---- */
export function barProfiles() {
  if (!canSee('stock')) return;
  const P = products(),
    Lk = linked();
  openModal(
    String(html`<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>Cutting Data</h2>
      <p class="muted">Tick the products that are lengths of profile and give each its full bar length. They can then be picked by code in the Cutting Optimiser, which also shows how many bars you have.</p>
      <div class="tw bar-link"><table class="ptb"><thead><tr><th>Profile</th><th>Item Code</th><th>Description</th><th class="n">Bar Length (mm)</th><th class="n">In Stock</th></tr></thead><tbody>${P.map(
        (r) =>
          html`<tr><td><input type="checkbox" class="blk" data-pid="${r.pid}" aria-label="${r.item} is a profile" ${raw(Lk[r.pid] ? 'checked' : '')}></td><td><b>${r.item}</b></td><td>${r.desc || '-'}</td><td class="n"><input class="blen" data-pid="${r.pid}" type="number" min="500" max="20000" step="1" value="${(Lk[r.pid] && Lk[r.pid].bar) || barLenOf(r.length) || 6500}" aria-label="Bar length for ${r.item}"></td><td class="n">${r.stock} ${unitOf(r)}</td></tr>`
      )}</tbody></table></div>
      <div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" ${raw(onClick('barProfSave'))}>Save</button></div>`),
    'lg'
  );
}
export function barProfSave() {
  if (!canSee('stock')) return;
  const O = {};
  document.querySelectorAll('#mbox .blk').forEach((b) => {
    if (!b.checked) return;
    const pid = b.dataset.pid,
      len = document.querySelector('#mbox .blen[data-pid="' + CSS.escape(pid) + '"]');
    O[pid] = { bar: SAFE.num(len && len.value, { min: 500, max: 20000, dp: 0 }) || 6500 };
  });
  state.cutProf = O;
  audit('Cutting data changed', Object.keys(O).length + ' profiles', '');
  store();
  closeModal();
  toast('Saved ' + Object.keys(O).length + ' profiles');
  render(true);
}

/* start-up step (run once by main.js): the list of linked profiles under a Profile Code box */
export function plugProfilePicker() {
  plugInCombo('profiles', () =>
    barProducts().map((x) => ({
      v: x.r.item,
      t: x.r.item + (x.r.desc ? ' · ' + x.r.desc : ''),
      s: mm(x.bar) + 'mm bar · ' + x.r.stock + ' ' + unitOf(x.r) + ' in stock',
    }))
  );
}
