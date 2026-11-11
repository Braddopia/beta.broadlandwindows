/* print/print: The printed document engine: letterhead, tables, photos and print windows. */
import { docOn, docSaw } from './doc-options.js';
import { company } from '../data/company.js';
import { actRun, onClick } from '../core/actions.js';
import { LOGO_SRC } from '../core/assets.js';
import { iso } from '../core/dates.js';
import { esc } from '../core/dom.js';
import { money } from '../core/format.js';
import { SAFE } from '../data/sanitize.js';
import { PHC, PH_BLANK, phIsRef, phLoad } from '../data/photos.js';
import { state } from '../data/state.js';
import { closeModal, openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';

/* ==========================================================================
   11 · Printing + reports
   One branded A4 template (printDoc) for every report; customer letters and
   certificates use the letterhead template (openLetter).
   ========================================================================== */
/* ---- Code 39 barcode as inline SVG ---- */
export const C39 = {
  0: 'nnnwwnwnn',
  1: 'wnnwnnnnw',
  2: 'nnwwnnnnw',
  3: 'wnwwnnnnn',
  4: 'nnnwwnnnw',
  5: 'wnnwwnnnn',
  6: 'nnwwwnnnn',
  7: 'nnnwnnwnw',
  8: 'wnnwnnwnn',
  9: 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  '*': 'nwnnwnwnn',
};
export function c39(t, h) {
  const s =
    '*' +
    String(t)
      .toUpperCase()
      .replace(/[^0-9A-Z\-. ]/g, '-')
      .slice(0, 40) +
    '*';
  let x = 0,
    r = '';
  for (const ch of s) {
    const p = C39[ch];
    for (let i = 0; i < 9; i++) {
      const w = p[i] == 'w' ? 3 : 1;
      if (i % 2 == 0) r += `<rect x="${x}" y="0" width="${w}" height="${h}"/>`;
      x += w;
    }
    x += 1;
  }
  x -= 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 0 ${x + 20} ${h}" width="${(x + 20) * 0.8}" height="${h * 0.8}" fill="#000" shape-rendering="crispEdges">${r}</svg>`;
}
/* Print styles. One frosted panel per document (money or key figures) over a soft colour mesh.
   Real blur does not print, so the glass is see-through tint, a bright edge and a soft shadow. */
export const PRINT_BASE = `@page{size:A4;margin:0 0 13mm}*{box-sizing:border-box}
body{margin:0;font:9.3pt/1.5 "Segoe UI",Inter,"Helvetica Neue",Arial,sans-serif;color:#13233a;-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#dde4ee;font-variant-numeric:tabular-nums}
.pg{width:210mm;min-height:284mm;margin:0 auto;background:#fff;position:relative}
.tb{position:sticky;top:0;z-index:5;display:flex;gap:8px;justify-content:center;padding:10px;background:#012b59}
.tb button{border:0;border-radius:8px;padding:8px 18px;background:#ffd002;color:#012b59;font:600 13px system-ui,sans-serif;cursor:pointer}.tb button+button{background:#fff}
.ov{font-size:7pt;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#034ea2}
h1{margin:1.5mm 0 0;font:600 21pt/1.12 "Segoe UI",Inter,Arial,sans-serif;letter-spacing:-.02em;color:#012b59}
.sb{margin:1.2mm 0 0;font-size:10pt;color:#5a6a82}
.c{padding:0 15mm 8mm;counter-reset:s}
h3{margin:9mm 0 3mm;font:600 10.5pt "Segoe UI",Arial,sans-serif;color:#012b59;break-after:avoid;display:flex;align-items:baseline;gap:3mm}
h2.sec{margin:11mm 0 1mm;font:600 14pt "Segoe UI",Arial,sans-serif;color:#012b59;break-after:avoid;padding-bottom:2mm;border-bottom:.5mm solid #012b59}
.dg{display:grid;grid-template-columns:1fr 1fr;column-gap:10mm;border-top:.3mm solid #dfe6ef}
.dg div{display:grid;grid-template-columns:38mm 1fr;gap:4mm;padding:2.1mm 0;border-bottom:.3mm solid #dfe6ef;break-inside:avoid}
.dg span{color:#6b7a90;font-size:8.4pt}.dg b{font-weight:500}
.dg.one{grid-template-columns:1fr}
.gp{display:grid;grid-template-columns:1fr 1fr;column-gap:10mm}.gp section{break-inside:avoid}.gp .dg div{grid-template-columns:30mm 1fr}
.call{margin:6mm 0 0;padding:3mm 4mm;border-left:1mm solid #ffd002;background:#fffbe6;font-size:8.8pt;break-inside:avoid}.call b{display:block;font-size:6.8pt;letter-spacing:.14em;text-transform:uppercase;color:#7a6200;margin-bottom:.8mm}
.dt td.warn{color:#b42318;font-weight:700}
.c>h2.sec:first-child{margin-top:7mm}
.dt{width:100%;border-collapse:collapse;font-size:8.3pt}.dt thead{display:table-header-group}.dt tr{break-inside:avoid}
.dt th{text-align:left;padding:2mm 2.5mm;font-size:6.9pt;letter-spacing:.09em;text-transform:uppercase;font-weight:700;color:#5a6a82;border-bottom:.5mm solid #012b59}
.dt td{padding:2.1mm 2.5mm;border-bottom:.3mm solid #e4eaf2;vertical-align:top}.dt td.n,.dt th.n{text-align:right;white-space:nowrap}
.dt tfoot td{font-weight:700;border-bottom:0;border-top:.5mm solid #012b59}
.e{text-align:center;color:#8593a7;padding:4mm!important}
/* the glass panel */
.mesh{position:relative;border-radius:5mm;padding:4mm;overflow:hidden;break-inside:avoid;
  background:radial-gradient(70mm 45mm at 0% 0%,rgba(3,78,162,.55),transparent 70%),radial-gradient(60mm 45mm at 100% 10%,rgba(255,208,2,.65),transparent 70%),radial-gradient(70mm 40mm at 55% 120%,rgba(14,116,144,.45),transparent 70%),#dfe9f7}
.glass{border-radius:3.5mm;background:linear-gradient(155deg,rgba(255,255,255,.86),rgba(255,255,255,.64));border:.35mm solid rgba(255,255,255,.95);box-shadow:0 2mm 6mm -2mm rgba(1,43,89,.25),inset 0 .4mm 0 #fff}
.glass{overflow:hidden}.figs{display:grid;margin:-.35mm 0 0 -.35mm}
.figs div{padding:4mm 5mm;border-left:.35mm solid rgba(1,43,89,.12);border-top:.35mm solid rgba(1,43,89,.12)}
.figs small{display:block;font-size:7.2pt;color:#5a6a82}.figs b{display:block;font:600 16pt/1.15 "Segoe UI",Arial,sans-serif;color:#012b59;margin-top:1mm;letter-spacing:-.01em}
.figs i{display:block;font-style:normal;font-size:7pt;color:#6b7a90;margin-top:.5mm}
.prog{padding:0 5mm 4mm}.prog .tr{height:2.2mm;border-radius:2mm;background:rgba(1,43,89,.12);overflow:hidden}.prog .tr i{display:block;height:100%;background:linear-gradient(90deg,#034ea2,#2f7fdb)}
.prog p{display:flex;justify-content:space-between;margin:1.4mm 0 0;font-size:7.4pt;color:#5a6a82}
/* project timeline */
.tl{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;list-style:none;margin:0;padding:0;break-inside:avoid}
.tl li{position:relative;padding-top:6mm;font-size:8.2pt;text-align:center}
.tl li::before{content:"";position:absolute;top:2mm;left:0;right:0;height:.5mm;background:#dfe6ef}
.tl li:first-child::before{left:50%}.tl li:last-child::before{right:50%}
.tl li.d::before{background:#034ea2}.tl li.d:has(+li:not(.d))::before{background:linear-gradient(90deg,#034ea2 50%,#dfe6ef 50%)}
.tl li::after{content:"";position:absolute;top:.9mm;left:50%;width:2.8mm;height:2.8mm;margin-left:-1.4mm;border-radius:50%;background:#fff;border:.5mm solid #c4cfdd}
.tl li.d::after{background:#034ea2;border-color:#034ea2}.tl li.now::after{background:#ffd002;border-color:#012b59}
.tl b{display:block;font-weight:600;color:#012b59}.tl span{color:#6b7a90;font-size:7.4pt}
.bl{display:grid;grid-template-columns:40mm 1fr 24mm;gap:1.8mm 3mm;align-items:center;font-size:8.3pt}.pb{height:2.4mm;border-radius:2mm;background:#e9eef6;overflow:hidden}.pb i{display:block;height:100%;background:#034ea2}.bl b{text-align:right;font-weight:600}
.ph{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}.ph figure{margin:0;break-inside:avoid}.ph img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:2.5mm;display:block}.ph figcaption{font-size:7pt;color:#6b7a90;margin-top:1mm}
.sg{display:grid;grid-template-columns:repeat(auto-fit,minmax(40mm,1fr));gap:10mm;margin-top:16mm;break-inside:avoid}.sg div{border-top:.35mm solid #13233a;padding-top:1.5mm;font-size:7.8pt;color:#6b7a90}
.ft{position:fixed;bottom:0;left:0;right:0;height:9mm;display:flex;justify-content:space-between;align-items:center;padding:0 15mm;font-size:6.8pt;color:#8593a7;background:#fff;border-top:.3mm solid #e4eaf2}
@media screen{.ft{position:static;width:210mm;margin:0 auto 10mm}.pg{box-shadow:0 4px 30px rgba(1,43,89,.15)}}
@media print{body{background:#fff}.tb{display:none}.pg{width:auto;min-height:0;margin:0}}`;
/* INTERNAL: compact dark band, figures in a glass bar overlapping it, numbered sections */
export const PRINT_INT = `.ih{background:radial-gradient(80mm 50mm at 100% 0%,rgba(47,127,219,.45),transparent 70%),linear-gradient(120deg,#011a36,#012b59 60%,#023f86);color:#fff;padding:8mm 15mm 15mm}
.ih .r1{display:flex;justify-content:space-between;align-items:center}.ih .r1 img{height:7.5mm;display:block}
.ih .r1 span{font-size:6.6pt;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ffb4b4;border-left:.6mm solid #e05252;padding-left:2mm}
.ih .ov{color:#ffd002;margin-top:7mm}.ih h1{margin-top:2mm}.ih h1{color:#fff}.ih .sb{color:#b8cbe6}
.ih .mt{display:flex;gap:7mm;margin-top:4mm;font-size:7.8pt;color:#d6e2f3}.ih .mt b{display:block;font-size:6.2pt;letter-spacing:.14em;text-transform:uppercase;color:#8fa9cf;font-weight:700}
.ih .mt div+div{border-left:.3mm solid rgba(255,255,255,.2);padding-left:7mm}
.lift{margin:-9mm 15mm 0;position:relative}
h3::before{counter-increment:s;content:counter(s,decimal-leading-zero);font-size:8pt;font-weight:700;color:#9aabc2}
.bcode{display:flex;justify-content:flex-end;align-items:center;gap:4mm;margin-top:12mm;break-inside:avoid}.bcode div{text-align:right;font-size:6.8pt;color:#6b7a90}.bcode div b{display:block;font:600 8.5pt ui-monospace,Menlo,monospace;letter-spacing:.15em;color:#13233a}`;
/* CUSTOMER: letterhead, title and who-it's-for, glass money panel, timeline, plain friendly close */
export const PRINT_CUS = `.lh{display:flex;justify-content:space-between;align-items:center;padding:11mm 15mm 6mm;border-bottom:.3mm solid #e4eaf2}
.lh img{height:15mm;display:block}.lh .co{text-align:right;font-size:7.8pt;line-height:1.6;color:#5a6a82}
.tt{padding:9mm 15mm 7mm}
.meta{display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:6mm;margin:7mm 0 0;font-size:8.6pt}
.meta dt{font-size:6.6pt;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#8593a7;margin-bottom:1mm}.meta dd{margin:0}.meta dd b{font-size:10.5pt;color:#012b59;font-weight:600}.meta dd span{color:#5a6a82}
.end{margin-top:12mm;padding-top:5mm;border-top:.3mm solid #e4eaf2;display:grid;grid-template-columns:1fr auto;gap:8mm;align-items:end;break-inside:avoid}
.end p{margin:0;font-size:9pt;color:#34465f;max-width:110mm}.end p b{color:#012b59}
.end .rv{text-align:right}.end .rv small{display:block;font-size:6.6pt;letter-spacing:.14em;text-transform:uppercase;color:#8a98ad;margin-bottom:1.5mm}.rvb{display:flex;gap:1.6mm;justify-content:flex-end}.rvb span{display:flex;flex-direction:column;align-items:center;min-width:17mm;padding:1.6mm 2mm;border-radius:2.2mm;background:#f3f6fb;border:.25mm solid #e1e8f2}.rvb b{font:700 11pt/1 Arial,sans-serif;color:#012b59}.rvb b i{font-style:normal;font-size:6.5pt;color:#8a98ad;font-weight:600}.rvb em{font-style:normal;font-size:6.2pt;color:#5a6a82;margin-top:.8mm;white-space:nowrap}
.stars{display:inline-flex;gap:.2mm}.stars svg{width:3mm;height:3mm}`;
/* rows: [[label,value]...]  empty values ('', '-', 'Not set', 'n/a') are left out.
   o: {kind, ref, kpis, money:{total,paid}, steps:[[label,date,done]], tables:[{t,h,r,foot}], sections:[{t,kpis,bars,tables}],
       pre, post, sign, barcode, customer:{name,address,contact} -> customer layout, thanks} */
export const blankV = (v) =>
  v == null || ['', '-', 'not set', 'n/a', 'none', 'unassigned'].includes(String(v).trim().toLowerCase());
export function printDoc(t, sub, rows, ph, o) {
  o = o || {};
  const PR = (ph || []).filter(phIsRef);
  if (!o.__w && PR.some((r) => !PHC.has(r.slice(3)))) {
    const w0 = window.open('', '_blank');
    if (!w0) {
      toast('Allow pop-ups to open reports');
      return;
    }
    w0.document.write('<p style="font:16px sans-serif;padding:2rem">Loading photos…</p>');
    phLoad(PR).then(() => printDoc(t, sub, rows, ph, { ...o, __w: w0 }));
    return;
  }
  /* the parts switched off for this kind of document in Settings, Document Builder */
  const DK = o.doc || o.kind || '',
    on = (part) => docOn(DK, part);
  docSaw(DK, [...(o.tables || []), ...(o.sections || [])].map((x) => x.t).filter(Boolean));
  o = {
    ...o,
    tables: (o.tables || []).filter((x) => on('t:' + x.t)),
    sections: (o.sections || []).filter((x) => on('t:' + x.t)),
    kpis: on('kpis') ? o.kpis : null,
    money: on('money') ? o.money : null,
    steps: on('steps') ? o.steps : null,
    groups: on('details') ? o.groups : [],
    pre: on('extra') ? o.pre : '',
    post: on('extra') ? o.post : '',
    sign: on('sign') && o.sign,
    barcode: on('barcode') && o.barcode,
  };
  if (!on('details')) rows = [];
  if (!on('photos')) ph = [];
  rows = (rows || []).filter((r) => r && !blankV(r[1]));
  ph = (ph || []).map((p) => SAFE.img(p)).filter((p) => p && p !== PH_BLANK);
  const cus = !!o.customer;
  /* o.asHtml: hand back the finished page (to keep as a document) instead of opening a window */
  const w = o.asHtml ? null : o.__w || window.open('', '_blank');
  if (!w && !o.asHtml) {
    toast('Allow pop-ups to open reports');
    return;
  }
  if (o.__w) w.document.open();
  const now = new Date(),
    date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    ref =
      o.ref || 'BW-' + iso(now).slice(2).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const isN = (v) => typeof v == 'number' || /^[£-]?[\d,]+(\.\d+)?%?$/.test(String(v).trim());
  const tb = (x) =>
    `<h3>${esc(x.t)}</h3><table class="dt"><thead><tr>${x.h.map((h, i) => `<th class="${x.r.length && isN(x.r[0][i]) ? 'n' : ''}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${x.r.map((r) => `<tr>${r.map((c) => `<td class="${isN(c) ? 'n' : ''} ${/^Needs safety glass/.test(c) ? 'warn' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${x.h.length}" class="e">Nothing to show</td></tr>`}</tbody>${x.foot ? `<tfoot><tr>${x.foot.map((c) => `<td class="${isN(c) ? 'n' : ''}">${esc(c)}</td>`).join('')}</tr></tfoot>` : ''}</table>`;
  const figs = (k) =>
    k && k.length
      ? `<div class="figs" style="grid-template-columns:repeat(${k.length <= 5 ? k.length : Math.ceil(k.length / 2)},1fr)">${k.map((x) => `<div><small>${esc(x[0])}</small><b>${esc(x[1])}</b>${x[2] ? `<i>${esc(x[2])}</i>` : ''}</div>`).join('')}</div>`
      : '';
  const panel = (k, m) => {
    if (!(k && k.length) && !m) return '';
    let pr = '';
    if (m && m.total > 0) {
      const pc = Math.max(0, Math.min(100, Math.round((100 * m.paid) / m.total)));
      pr = `<div class="prog"><div class="tr"><i style="width:${pc}%"></i></div><p><span>${pc}% paid</span><span>${pc >= 100 ? 'Paid in full' : esc(money(m.total - m.paid)) + ' to pay'}</span></p></div>`;
    }
    return `<div class="mesh"><div class="glass">${figs(k)}${pr}</div></div>`;
  };
  const bars = (b) => {
    const mx = Math.max(1, ...b.rows.map((r) => +r[1] || 0));
    return `<h3>${esc(b.t)}</h3><div class="bl">${b.rows.map((r) => `<span>${esc(r[0])}</span><div class="pb"><i style="width:${Math.round((100 * (+r[1] || 0)) / mx)}%"></i></div><b>${esc(r[2](r[1]))}</b>`).join('')}</div>`;
  };
  const steps = (s) => {
    if (!s || !s.length) return '';
    const last = s.map((x) => !!x[2]).lastIndexOf(true);
    return `<h3>${cus ? 'Your project' : 'Progress'}</h3><ol class="tl">${s.map((x, i) => `<li class="${x[2] ? 'd' : ''} ${i == last + 1 ? 'now' : ''}"><b>${esc(x[0])}</b><span>${esc(x[1] || (x[2] ? 'Done' : 'To come'))}</span></li>`).join('')}</ol>`;
  };
  const secs = (o.sections || [])
    .map(
      (s) =>
        `<h2 class="sec">${esc(s.t)}</h2>${s.kpis && s.kpis.length ? `<div style="margin-top:4mm">${panel(s.kpis)}</div>` : ''}${(s.bars || []).map(bars).join('')}${(s.tables || []).map(tb).join('')}`
    )
    .join('');
  const det = rows.length
    ? `<h3>${cus ? 'The details' : 'Details'}</h3><div class="dg ${cus || rows.length < 6 ? 'one' : ''}">${rows.map((r) => `<div><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div>`
    : '';
  const grp = (o.groups || [])
    .map((g) => ({ t: g.t, r: g.r.filter((r) => r && !blankV(r[1])) }))
    .filter((g) => g.r.length);
  const gps = grp.length
    ? `<div class="gp">${grp.map((g) => `<section><h3>${esc(g.t)}</h3><div class="dg one">${g.r.map((r) => `<div><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div></section>`).join('')}</div>`
    : '';
  const body = `${steps(o.steps)}${gps}${det}${o.pre || ''}${(o.tables || []).map(tb).join('')}${secs}${o.post || ''}${ph.length ? `<h3>Photos</h3><div class="ph">${ph.map((p, i) => `<figure><img src="${p}"><figcaption>Photo ${i + 1}</figcaption></figure>`).join('')}</div>` : ''}`;
  const tp = state.brand.tp,
    g = state.brand.g;
  /* the customer layout's closing line and review scores, each only if switched on */
  const thanksH = on('thanks')
      ? `<p><b>Thank you for choosing Broadland Windows.</b> ${esc(o.thanks || 'If you have any questions about this document, our team is always happy to help.')}${o.customer && o.customer.contact ? ` Your contact here is ${esc(o.customer.contact)}.` : ''}</p>`
      : '<p></p>',
    reviewsH = on('reviews')
      ? `<div class="rv"><small>Rated by our customers</small><div class="rvb">${[['Google', g.score, 5], ['Trustpilot', tp.score, 5], ...(state.brand.tt ? [['Trusted Trader', state.brand.tt.score, 5]] : []), ...(state.brand.rl ? [['ReferenceLine', state.brand.rl.score, 10]] : [])].map(([n, s, o]) => `<span><b>${(+s || 0).toFixed(1)}<i>/${o}</i></b><em>${esc(n)}</em></span>`).join('')}</div></div>`
      : '',
    endH = on('thanks') || on('reviews') ? `<div class="end">${thanksH}${reviewsH}</div>` : '',
    metaC = on('meta')
      ? `<dl class="meta"><div><dt>Prepared for</dt><dd><b>${esc((o.customer && o.customer.name) || 'Customer')}</b>${o.customer && o.customer.address ? `<br><span>${esc(o.customer.address)}</span>` : ''}</dd></div><div><dt>Date</dt><dd>${date}</dd></div><div><dt>Reference</dt><dd>${esc(ref)}</dd></div></dl>`
      : '',
    metaI = on('meta')
      ? `<div class="mt"><div><b>Reference</b>${esc(ref)}</div><div><b>Date</b>${date}</div><div><b>Prepared by</b>${esc(USER)}</div></div>`
      : '';
  const page = cus
    ? `<header class="lh">${on('logo') ? `<img src="${LOGO_SRC.full}" alt="Broadland Windows">` : '<span></span>'}<div class="co">${esc(company.tel)}<br>${esc(company.em)}<br>${esc(company.web)}</div></header>
      <section class="tt">${o.kind && o.kind.toLowerCase() != t.toLowerCase() ? `<div class="ov">${esc(o.kind)}</div>` : ''}<h1>${esc(t)}</h1>${sub ? `<p class="sb">${esc(sub)}</p>` : ''}
        ${metaC}</section>
      <div class="c">${panel(o.kpis, o.money)}${body}${o.sign ? '<div class="sg"><div>Customer signature and date</div><div>For Broadland Windows</div></div>' : ''}
      ${endH}</div>`
    : `<header class="ih"><div class="r1">${on('logo') ? `<img src="${LOGO_SRC.white}" alt="Broadland">` : '<span></span>'}${on('tag') ? '<span>Internal · not for customers</span>' : ''}</div>
      ${o.kind && o.kind.toLowerCase() != t.toLowerCase() ? `<div class="ov">${esc(o.kind)}</div>` : '<div style="height:5mm"></div>'}<h1>${esc(t)}</h1>${sub ? `<p class="sb">${esc(sub)}</p>` : ''}
      ${metaI}</header>
      ${(o.kpis && o.kpis.length) || o.money ? `<div class="lift">${panel(o.kpis, o.money)}</div>` : '<div style="height:2mm"></div>'}
      <div class="c">${body}${o.sign ? '<div class="sg"><div>Prepared by</div><div>Checked by</div><div>Date</div></div>' : ''}${o.barcode ? `<div class="bcode"><div><b>${esc(String(o.barcode).toUpperCase())}</b>Scan to open in the CRM</div>${c39(o.barcode, 40)}</div>` : ''}</div>`;
  const foot = cus
    ? `<span>${esc(company.name)} · ${esc(company.addr)}${company.vatNo ? ' · VAT ' + esc(company.vatNo) : ''}${company.fensa ? ' · FENSA ' + esc(company.fensa) : ''}</span><span>${esc(ref)}</span>`
    : `<span>Broadland Windows · Internal use only</span><span>Printed ${now.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>`;
  const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(t)}</title><style>${PRINT_BASE}${cus ? PRINT_CUS : PRINT_INT}</style></head><body>
  ${o.asHtml ? '' : '<div class="tb"><button data-pa="print">Print or save as PDF</button><button data-pa="close">Close</button></div>'}<div class="pg">${page}</div>${on('footer') ? `<footer class="ft">${foot}</footer>` : ''}</body></html>`;
  if (o.asHtml) return doc;
  w.document.write(doc);
  w.document.close();
  fitPage(w);
}
/* shrink a slightly-too-long report so it prints on one A4 page (never below 72%) */
export function fitPage(w) {
  try {
    w.document.querySelectorAll('[data-pa]').forEach((b) => b.addEventListener('click', () => w[b.dataset.pa]()));
    /* Esc closes the printed-document window too */
    w.document.addEventListener('keydown', (e) => e.key == 'Escape' && w.close());
  } catch (e) {}
  setTimeout(() => {
    try {
      const d = w.document,
        pg = d.querySelector('.pg');
      if (!pg) return;
      const mm = d.createElement('div');
      mm.style.height = '100mm';
      d.body.appendChild(mm);
      const px = mm.offsetHeight / 100;
      mm.remove();
      const max = (297 - 14) * px,
        h = pg.scrollHeight;
      if (h > max && h < max / 0.72) {
        const z = Math.floor((max / h) * 100) / 100;
        const s = d.createElement('style');
        s.textContent = '@media print{.pg{zoom:' + z + '}}';
        d.head.appendChild(s);
      }
    } catch (e) {}
  }, 350);
}
/* choose customer or internal version */
/* cus / int / more[i][2] are actions: ['fnName', arg1, arg2...] */
export function docPick(fn, ...a) {
  closeModal();
  actRun(fn, a);
}
export function docChoice(title, cus, int, more) {
  openModal(
    `<h2>${esc(title)}</h2><div class="rl"><button class="rb" ${onClick('docPick', ...cus)}><b>Customer copy</b><span>Clean letterhead to send or hand to the customer. No internal costs or notes.</span></button><button class="rb" ${onClick('docPick', ...int)}><b>Internal sheet</b><span>Full details for the team, with reference barcode.</span></button>${(more || []).map((m) => `<button class="rb" ${onClick('docPick', ...m[2])}><b>${esc(m[0])}</b><span>${esc(m[1])}</span></button>`).join('')}</div><div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button></div>`,
    'sm'
  );
}
