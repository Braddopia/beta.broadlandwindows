/* features/documents/documents: Customer documents: guarantee, handover, letters. */
import { company } from '../../data/company.js';
import { LOGO_SRC } from '../../core/assets.js';
import { dslash, fdl, today } from '../../core/dates.js';
import { $, esc } from '../../core/dom.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';
import { state } from '../../data/state.js';
import { siteOf } from '../../domain/customers.js';
import { fitPage } from '../../print/print.js';
import { fieldErr } from '../../ui/forms/form.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

/* ---------------- customer documents (letterhead) ---------------- */
export const GT = [
  'To claim on this guarantee, the final contract payment must be paid in full.',
  'Claims must be notified to the company as soon as the defect becomes apparent, quoting the contract number.',
  'The company must be informed within 28 days of a change in ownership to enable the guarantee to be transferred for the unexpired residue of its term. A fee of £120 (including VAT) will be charged; the transfer will also be subject to an inspection by the company to satisfy itself that the products have been properly maintained. Conservatory guarantees are non-transferable.',
  'Properties within 5 miles of the coast are subject to saline & abrasive conditions, which give a natural reduction in paint finish and ironmongery life and more frequent maintenance is recommended, with records kept & maintained.',
  "Interstitial blind units, slope position glazing and roof glazing units carry a 5-year manufacturer's guarantee only.",
  'Glass breakages (including unexplained breakages) are not covered by the guarantee.',
].join('\n');
export const GM =
  'PVCu products and painted aluminium surfaces need regular cleaning with soapy water.\nHardwood windows and doors should be monitored for re-coating with good quality water-based micro-porous stain or paint at regular intervals not exceeding 2 years in duration.\nAll finishes may be affected by proprietary cleaners.\nAll moving parts on all products need to be lightly lubricated at six-monthly intervals with machine oil or silicone spray (WD-40 for example): 3 monthly in coastal areas (within 5 miles).';
export const DOCS = {
  guarantee: ['Guarantee certificate', 'Your 10 year guarantee with terms and maintenance'],
  completion: ['Completion and handover', 'Handover checklist with signature lines'],
  letter: ['Thank-you and review letter', 'Aftercare letter asking for a review'],
  fitting: ['Fitting confirmation', 'Appointment letter for the customer'],
};
export let DK = 'guarantee';
export function openCert(title, body) {
  const w = window.open('', '_blank');
  if (!w) {
    toast('Allow pop-ups to open documents');
    return;
  }
  w.document
    .write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#000;background:#e9edf3;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pg{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:9mm 12mm 8mm;display:flex;flex-direction:column}.bar{position:sticky;top:0;z-index:5;background:#012b59;padding:10px;text-align:center}.bar button{background:#ffd002;color:#012b59;border:0;border-radius:8px;padding:8px 20px;font:600 13px Arial,sans-serif;cursor:pointer}
  .lg{display:block;margin:0 auto 9mm;width:78mm}.gt{font:700 26pt/1.05 Arial,sans-serif;text-align:center;margin:0 0 8mm}.gt span{display:block;font-size:20pt}
  .gp{font-size:10.5pt;line-height:1.3;text-align:center;margin:0 auto 5mm;max-width:132mm}.gn{font-size:7.5pt;font-weight:700;text-decoration:underline;text-align:center;margin:0 0 5mm}.gs{font-size:7.5pt;text-align:center;margin:0 auto 5mm;max-width:135mm}
  .gc{font-size:10pt;text-align:center;margin:0 0 3.5mm}.gd{margin-top:5mm}
  .gr{display:flex;justify-content:space-between;align-items:flex-end;margin:6mm 2mm 5mm;font-size:10pt}.gr small{font-size:7.5pt}.sn{font:italic 15pt 'Segoe Script','Brush Script MT',cursive}
  hr{border:0;border-top:.3mm solid #000;margin:0 0 6mm}.gb{border:.3mm solid #000;padding:5mm 4mm;font-size:8.6pt;line-height:1.4}.gb h4{margin:0 0 1mm;font-size:10.5pt}.gb ol{margin:0 0 5mm;padding-left:6mm}.gb p{margin:0}
  .ft{margin-top:auto;padding-top:8mm;text-align:center;font-size:7.5pt;line-height:1.4}@media print{body{background:#fff}.bar{display:none}.pg{width:auto}}</style></head><body>
  <div class="bar"><button data-pa="print">Print or save as PDF</button></div><div class="pg"><img class="lg" src="${LOGO_SRC.full}" alt="Broadland">${body}<div class="ft">${esc(company.tel)}<br>${esc(company.em)} &bull; ${esc(company.web)}<br>${esc(company.addr)}${company.vatNo ? '<br>VAT No. ' + esc(company.vatNo) : ''}${company.coNo ? ' &bull; Company No. ' + esc(company.coNo) : ''}</div></div></body></html>`);
  w.document.close();
  fitPage(w);
}
export function openLetter(title, body) {
  const w = window.open('', '_blank');
  if (!w) {
    toast('Allow pop-ups to open documents');
    return;
  }
  w.document
    .write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",Inter,"Helvetica Neue",Arial,sans-serif;color:#13233a;background:#dde4ee;-webkit-print-color-adjust:exact;print-color-adjust:exact}.pg{width:210mm;min-height:297mm;margin:0 auto;background:#fff;display:flex;flex-direction:column}.bar{position:sticky;top:0;z-index:5;background:#012b59;padding:10px;text-align:center}.bar button{background:#ffd002;color:#012b59;border:0;border-radius:8px;padding:8px 20px;font:600 13px system-ui,sans-serif;cursor:pointer}
  .lhd{display:flex;justify-content:space-between;align-items:center;padding:11mm 16mm 6mm;border-bottom:.3mm solid #e4eaf2}.lhd img{height:15mm;display:block}.lhd .co{text-align:right;font-size:7.8pt;line-height:1.6;color:#5a6a82}
  .dl{padding:10mm 16mm 8mm;flex:1;text-align:center;display:flex;flex-direction:column;align-items:center}
  .dl h1{font:700 40pt "Segoe UI",Arial,sans-serif;margin:4mm 0 8mm;line-height:1;color:#012b59;letter-spacing:-.02em}.dl h1 small{display:block;font-size:14pt;letter-spacing:.42em;font-weight:600;color:#034ea2;margin-top:3mm}
  .dl p{font-size:10.2pt;line-height:1.5;margin:0 0 4mm;max-width:150mm}.dl p.nt{font-size:8.4pt;font-weight:700;margin:2mm 0 5mm;padding:0 0 0 3mm;border-left:1mm solid #ffd002;text-align:left}.dl p.sm{font-size:8.4pt;color:#5a6a82}
  .dl .row2{display:flex;justify-content:space-between;width:100%;align-items:flex-end;margin-top:6mm;font-size:10pt;text-align:left}.sn{font:italic 15pt 'Segoe Script','Brush Script MT',cursive;color:#012b59}
  .dl hr{width:100%;border:0;border-top:.3mm solid #e4eaf2;margin:6mm 0}
  .tc{width:100%;text-align:left;font-size:8.2pt;line-height:1.42;column-count:2;column-gap:8mm}.tc h4{margin:0 0 1.5mm;font-size:7pt;color:#034ea2;letter-spacing:.18em;text-transform:uppercase;break-after:avoid}.tc ol{margin:0 0 4mm;padding-left:4mm}.tc li{margin-bottom:1mm}.tc p{margin:0 0 1.2mm;font-size:8.2pt;line-height:1.42;max-width:none}
  .dl .ft2{margin-top:auto;padding-top:5mm;font-size:7.4pt;line-height:1.5;color:#8593a7;border-top:.3mm solid #e4eaf2;width:100%}
  .dl table{text-align:left;margin:3mm 0;width:100%;border-collapse:collapse;border-top:.3mm solid #dfe6ef}.dl td{padding:2.4mm 0;border-bottom:.3mm solid #dfe6ef;font-size:10pt}.dl td:first-child{color:#6b7a90;font-size:8.6pt}
  .dl p.l{text-align:left;max-width:none;width:100%;font-size:10.6pt;line-height:1.65}.dl h2{font:600 20pt "Segoe UI",Arial,sans-serif;margin:2mm 0 6mm;color:#012b59;align-self:flex-start;letter-spacing:-.01em}
  .ck td:first-child{width:9mm;font-size:12pt;color:#034ea2}
  .mesh{width:100%;border-radius:5mm;padding:3.5mm;margin:2mm 0 4mm;background:radial-gradient(70mm 45mm at 0% 0%,rgba(3,78,162,.55),transparent 70%),radial-gradient(60mm 45mm at 100% 10%,rgba(255,208,2,.65),transparent 70%),radial-gradient(70mm 40mm at 55% 120%,rgba(14,116,144,.45),transparent 70%),#dfe9f7}.glass{display:grid;grid-template-columns:1.3fr 1.6fr 1fr 1fr;text-align:left;border-radius:3.5mm;overflow:hidden;background:linear-gradient(155deg,rgba(255,255,255,.88),rgba(255,255,255,.66));border:.35mm solid #fff;box-shadow:0 2mm 6mm -2mm rgba(1,43,89,.25)}.glass div{padding:3.5mm 4.5mm;font-size:9.6pt}.glass div+div{border-left:.35mm solid rgba(1,43,89,.12)}.glass small{display:block;font-size:6.4pt;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#5a6a82;margin-bottom:1mm}.glass b{color:#012b59;font-weight:600}@media print{body{background:#fff}.bar{display:none}.pg{width:auto}}</style></head><body><div class="bar"><button data-pa="print">Print or save as PDF</button></div><div class="pg"><div class="lhd"><img src="${LOGO_SRC.full}" alt="Broadland"><div class="co">${esc(company.tel)}<br>${esc(company.em)}<br>${esc(company.web)}</div></div><div class="dl">${body}<div class="ft2">Broadland Windows Limited · ${esc(company.addr)}</div></div></div></body></html>`);
  w.document.close();
  fitPage(w);
}
export function docOpen(k, pref) {
  DK = DOCS[k] ? k : 'guarantee';
  const cs = state.contracts
      .map((c) => `<option value="c:${esc(c.id)}">#${esc(c.id)} ${esc(c.name)}</option>`)
      .join(''),
    ks = state.contacts
      .map((c) => `<option value="k:${esc(c.id)}">${esc(c.name)}${c.co ? ' (' + esc(c.co) + ')' : ''}</option>`)
      .join('');
  openModal(
    `<h2>${esc(DOCS[DK][0])}</h2><div class="dfm"><label>Customer or contact<select id="dc" data-onchange="docFill"><option value="">Type the details below</option><optgroup label="Contracts">${cs}</optgroup><optgroup label="Contact book">${ks}</optgroup></select></label><label>Name<input id="dn" maxlength="80"></label><label>Address<input id="da" maxlength="200"></label><label>Product or work<input id="dp" maxlength="160"></label><label>${DK == 'fitting' ? 'Fitting date' : DK == 'guarantee' ? 'Installation date' : 'Date'}<input id="dd" type="date" value="${today()}"></label>${DK == 'guarantee' ? `<label>Guarantee period (years)<input id="dy" type="number" min="1" max="50" value="10"></label><label>Signed by<input id="ds" maxlength="60" placeholder="Name of the person signing"></label><label>Terms and conditions (one per line)<textarea id="dt" rows="6">${esc(GT)}</textarea></label><label>General maintenance instructions<textarea id="dmi" rows="4">${esc(GM)}</textarea></label>` : ''}${DK == 'fitting' ? '<label>Fitting team<input id="dtm" maxlength="60"></label>' : ''}<label>Extra note (optional)<input id="dm" maxlength="300"></label></div><div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" data-act="docGo">Open document</button></div>`
  );
  if (pref) {
    $('#dc').value = pref;
    docFill();
  }
}
export function docFill() {
  const [t, id] = ($('#dc').value || ':').split(':'),
    r = t == 'c' ? state.contracts.find((c) => String(c.id) == id) : state.contacts.find((c) => String(c.id) == id);
  if (!r) return;
  $('#dn').value = [r.title, r.name].filter(Boolean).join(' ');
  $('#da').value =
    t == 'c' && typeof siteOf == 'function' ? siteOf(r) : [r.addr || r.address, r.town].filter(Boolean).join(', ');
  $('#dp').value = r.product || r.co || '';
  if (t == 'c' && r.fit) $('#dd').value = r.fit;
}
export function docGo() {
  const v = (i) => SAFE.text(($('#' + i) || { value: '' }).value, 4000),
    n = v('dn') || 'Customer',
    a = v('da'),
    p = v('dp'),
    d = SAFE.date(v('dd')),
    y = SAFE.num(v('dy'), { min: 1, max: 50, dp: 0 }) || 10,
    m = v('dm'),
    dcv = $('#dc').value || '',
    id = SAFE.code(dcv.startsWith('c:') ? dcv.split(':')[1] : (d || '').replace(/-/g, '')),
    note = m ? `<p class="l"><i>${esc(m)}</i></p>` : '',
    li = (s) =>
      s
        .split('\n')
        .filter(Boolean)
        .map((x) => esc(x));
  let t, b;
  if (DK == 'guarantee' && !d) {
    toast('Enter the installation date for the guarantee');
    const e = $('#dd');
    if (e) fieldErr(e, 'Enter the installation date');
    return;
  }
  if (DK == 'guarantee') {
    t = 'Guarantee ' + id;
    const pc = (a.match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i) || [''])[0],
      ad = a
        .replace(pc, '')
        .replace(/[,\s]+$/, '')
        .replace(/,\s*,/g, ',');
    b = `<h1 class="gt">${y} YEAR<span>GUARANTEE</span></h1>
     <p class="gp">Broadland Windows Limited (the company) guarantees that should any fault appear in the company's product within ${y} years of the date of supply &amp; installation stated below due to defective materials or workmanship, the company will remedy the defect or replace the product free of charge.</p>
     <p class="gn">PLEASE NOTE: ALL IRONMONGERY CARRIES A TWO-YEAR MANUFACTURER'S GUARANTEE ONLY.</p>
     <p class="gs">This guarantee does not extend to damage or faults due to accidents, misuse, neglect or failure to carry out proper and diligent maintenance.</p>
     <p class="gc">${esc(n)}</p><p class="gc">${esc(ad.replace(/,/g, '').toUpperCase())}</p>${pc ? `<p class="gc">${esc(pc.toUpperCase())}</p>` : ''}
     <p class="gc gd"><b>Installation Date:</b> ${dslash(d)}</p>${m ? `<p class="gc"><i>${esc(m)}</i></p>` : ''}
     <div class="gr"><span><b>Contract Number:</b> ${esc(id)}</span><span><b>Signed:</b> <span class="sn">${esc(v('ds'))}</span><br><small>For &amp; on behalf of Broadland Windows</small></span></div><hr>
     <div class="gb"><h4>TERMS &amp; CONDITIONS</h4><ol>${li(v('dt'))
       .map((x) => `<li>${x}</li>`)
       .join('')}</ol><h4>GENERAL MAINTENANCE INSTRUCTIONS</h4>${li(v('dmi'))
       .map((x) => `<p>${x}</p>`)
       .join('')}</div>`;
    audit('Guarantee issued', n, id);
    store();
    closeModal();
    openCert(t, b);
    return;
  } else if (DK == 'completion') {
    t = 'Completion and Handover';
    b = `<h2>Completion and Handover</h2><table><tr><td style="width:35%">Customer</td><td><b>${esc(n)}</b></td></tr><tr><td>Address</td><td>${esc(a)}</td></tr><tr><td>Work</td><td>${esc(p)}</td></tr><tr><td>Completed</td><td>${fdl(d)}</td></tr></table><table class="ck" style="margin-top:6mm">${['Windows and doors opened, closed and locked correctly', 'Keys and handles handed over', 'Care and maintenance advice explained', 'Guarantee paperwork explained', 'Site left clean and tidy', 'Customer happy with the finished work'].map((x) => `<tr><td>&#9744;</td><td>${x}</td></tr>`).join('')}</table>${note}<div class="row2" style="margin-top:22mm"><span>Customer signature: ____________________</span><span>Installer signature: ____________________</span></div>`;
  } else if (DK == 'letter') {
    t = 'Thank you';
    b = `<h2>Thank you</h2><p class="l">${fdl(d)}</p><p class="l">Dear ${esc(n)},</p><p class="l">Thank you for choosing Broadland Windows for your ${esc(p || 'recent project')}${a ? ' at ' + esc(a) : ''}. It was a pleasure to work with you and we hope you are delighted with the result.</p><p class="l">If you are happy with our service, we would be very grateful if you could leave a short review on Trustpilot or Google. It makes a real difference to a local Norfolk business.</p><p class="l">If anything is not quite right, please call us on ${esc(company.tel)} or email ${esc(company.em)} and we will put it right.</p>${note}<p class="l">Kind regards,<br><b>The team at Broadland Windows</b></p>`;
  } else {
    t = 'Fitting Confirmation';
    b = `<h2>Fitting Confirmation</h2><p class="l">Dear ${esc(n)},</p><p class="l">We are pleased to confirm your fitting appointment.</p><table><tr><td style="width:35%">Date</td><td><b>${fdl(d)}</b></td></tr><tr><td>Address</td><td>${esc(a)}</td></tr><tr><td>Work</td><td>${esc(p)}</td></tr><tr><td>Fitting team</td><td>${esc(v('dtm') || 'To be confirmed')}</td></tr></table><p class="l" style="margin-top:6mm">Please make sure our team can reach the work area, and that pets are kept safely away. If you need to change the date, call ${esc(company.tel)}.</p>${note}<p class="l">Kind regards,<br><b>Broadland Windows</b></p>`;
  }
  store();
  closeModal();
  openLetter(t, b);
}
