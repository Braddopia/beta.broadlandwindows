/* ==========================================================================
   15 · Full-screen records for Leads and Contracts (tabbed, AdminBase-style)
   One record window: toolbar (Save & Close, Save, Report, prev/next),
   tabs, and two-column label/value rows that are edited in place.
   ========================================================================== */
const REC={};
const YN=['','Yes','No'];
const BRANCHES=['Norwich','Cambridge','Great Yarmouth','North Norfolk','Suffolk'];
const PTYPES=['','Windows','Doors','Windows & Doors','Garden Room','Conservatory','Roof Lantern','Secondary Glazing','Commercial Aluminium','Roofline','Repairs','Other'];
const CTYPES=['Domestic PVCu','Domestic Ali','Domestic Timber','Domestic Composite','Garden Room','Commercial','Service / Repair'];
const RESULTS=['','Contract Awarded','Quote Pending','Thinking It Over','Lost - Price','Lost - Timing','Lost - Competitor','Not Interested','No Show'];
const LEAD_CK=LCKG.flatMap(g=>g[2]);
const staffNames=()=>['',...new Set(S.staff.map(s=>s.name))];

/* ---- customer information: same fields on leads and contracts ---- */
const CUSTF=[
  {k:'title',l:'Title',t:'select',o:['','Mr','Mrs','Miss','Ms','Mr & Mrs','Dr','Company'],g:'Customer'},
  {k:'name',l:'Customer / contact name',req:1,g:'Customer'},{k:'salutation',adv:1,l:'Letters start "Dear ..."',g:'Customer'},{k:'company',adv:1,l:'Company (if a business)',g:'Customer'},
  {k:'prefContact',l:'Best way to contact them',t:'select',o:['','Mobile','Home phone','Work phone','Email','Post'],g:'Customer'},
  {k:'mob1',l:'Mobile',t:'tel',max:30,g:'Phone Numbers',any:1},{k:'mob2',nx:'mob1',l:'Mobile 2',t:'tel',max:30,g:'Phone Numbers'},{k:'mob3',nx:'mob2',l:'Mobile 3',t:'tel',max:30,g:'Phone Numbers'},
  {k:'home1',l:'Home phone',t:'tel',max:30,g:'Phone Numbers',any:1},{k:'home2',nx:'home1',l:'Home phone 2',t:'tel',max:30,g:'Phone Numbers'},{k:'home3',nx:'home2',l:'Home phone 3',t:'tel',max:30,g:'Phone Numbers'},
  {k:'work',l:'Work phone',t:'tel',max:30,g:'Phone Numbers',any:1},{k:'work2',nx:'work',l:'Work phone 2',t:'tel',max:30,g:'Phone Numbers'},{k:'work3',nx:'work2',l:'Work phone 3',t:'tel',max:30,g:'Phone Numbers'},
  {k:'email1',l:'Email',t:'email',g:'Email'},{k:'email2',nx:'email1',l:'Email 2',t:'email',g:'Email'},{k:'email3',nx:'email2',l:'Email 3',t:'email',g:'Email'},
  {k:'addrType',l:'Address type',t:'select',o:['','Home','Business'],g:'Home Address'},{k:'homeAddr',l:'Address line 1',max:120,g:'Home Address'},{k:'homeAddr2',l:'Address line 2',max:120,g:'Home Address'},
  {k:'town',l:'Town / city',max:60,g:'Home Address'},{k:'county',adv:1,l:'County',max:60,g:'Home Address'},{k:'homePc',l:'Postcode',max:10,g:'Home Address'},
  {k:'invSame',l:'Send the invoice to',t:'select',o:['Same as home','Different'],g:'Invoice Address'},{k:'invAddr',dep:'invSame',l:'Address line 1',max:120,g:'Invoice Address'},{k:'invAddr2',dep:'invSame',l:'Address line 2',max:120,g:'Invoice Address'},
  {k:'invTown',dep:'invSame',l:'Town / city',max:60,g:'Invoice Address'},{k:'invCounty',dep:'invSame',adv:1,l:'County',max:60,g:'Invoice Address'},{k:'invPc',dep:'invSame',l:'Postcode',max:10,g:'Invoice Address'},
  {k:'siteSame',l:'Where the work is',t:'select',o:['Same as home','Different'],g:'Site Address'},{k:'siteAddr',dep:'siteSame',l:'Address line 1',max:120,g:'Site Address'},{k:'siteAddr2',dep:'siteSame',l:'Address line 2',max:120,g:'Site Address'},
  {k:'siteTown',dep:'siteSame',l:'Town / city',max:60,g:'Site Address'},{k:'siteCounty',dep:'siteSame',adv:1,l:'County',max:60,g:'Site Address'},{k:'sitePc',dep:'siteSame',l:'Postcode',max:10,g:'Site Address'},{k:'siteAccess',l:'Access / parking notes',max:200,g:'Site Address'}];
const GDPRF=[{k:'gdprEmail',l:'Marketing by email',t:'select',o:YN},{k:'gdprSms',l:'Marketing by text',t:'select',o:YN},{k:'gdprPhone',l:'Marketing by phone',t:'select',o:YN},{k:'gdprPost',l:'Marketing by post',t:'select',o:YN},{k:'gdprDate',l:'Consent date',t:'date'},{k:'gdprHow',l:'How consent was given',max:100},{k:'gdprNotes',l:'Data notes',t:'area',max:500}];
const CUSTK=[...CUSTF,...GDPRF].map(f=>f.k);
/* move old single phone/email/address fields into the new structure */
(function migrateCustomers(){if(S.custV1)return;[...S.leads,...S.contracts].forEach(r=>{
  if(r.phone&&!r.mob1&&!r.home1){if(/^\s*07/.test(r.phone))r.mob1=r.phone;else r.home1=r.phone}
  if(r.email&&!r.email1)r.email1=r.email;if(r.address&&!r.homeAddr)r.homeAddr=r.address;r.invSame=r.invSame||'Same as home';r.siteSame=r.siteSame||'Same as home'});S.custV1=1;store()})();
const PHONES=['mob1','mob2','mob3','home1','home2','home3','work','work2','work3'];
const telOf=r=>PHONES.map(k=>r[k]).find(Boolean)||r.phone||'';
const mailOf=r=>r.email1||r.email2||r.email3||r.email||'';
const addrOf=r=>[r.homeAddr||r.address,r.homeAddr2,r.town,r.county].filter(Boolean).join(', ');
const siteOf=r=>r.siteSame=='Different'&&r.siteAddr?[r.siteAddr,r.siteAddr2,r.siteTown,r.siteCounty,r.sitePc].filter(Boolean).join(', '):[addrOf(r),r.homePc].filter(Boolean).join(', ');
function custCompat(r){r.phone=telOf(r);r.email=mailOf(r);r.address=r.siteSame=='Different'&&r.siteAddr?[r.siteAddr,r.siteAddr2].filter(Boolean).join(', '):[r.homeAddr,r.homeAddr2].filter(Boolean).join(', ')}

/* ---- row-style field (label left, value right, edited in place) ---- */
function rfH(f,v){const val=v[f.k]??'',id='f_'+f.k;let c;
  if(f.ro||(f.adm&&!ISADM()))c=`<input id="${id}" value="${esc(val)}" readonly tabindex="-1">`;
  else if(f.t=='select')c=`<select id="${id}">${(val!==''&&!f.o.map(String).includes(String(val))?[val,...f.o]:f.o).map(o=>`<option value="${esc(o)}" ${String(o)==String(val)?'selected':''}>${esc(o||'-')}</option>`).join('')}</select>`;
  else if(f.t=='area')c=`<textarea id="${id}" rows="${f.rows||2}" maxlength="${f.max||2000}">${esc(val)}</textarea>`;
  else c=`<input id="${id}" type="${f.t=='number'?'number':f.t=='date'?'date':f.t=='time'?'time':f.t=='email'?'email':f.t=='tel'?'tel':'text'}" ${f.t=='number'?'step="any" min="0" inputmode="decimal"':`maxlength="${f.max||120}"`} value="${esc(val)}" ${f.list?`list="${f.list}"`:''} autocomplete="off">`;
  const hid=(f.dep&&(v[f.dep]||'Same as home')!='Different')||nxHid(f,v);
  if(['invSame','siteSame'].includes(f.k))c=c.replace('<select ','<select onchange="recDep(this)" ');
  return `<label class="rf ${f.t=='area'?'ta':''}" ${f.dep?`data-dep="${f.dep}"`:''} ${f.nx?`data-nx="${f.nx}"`:''} ${hid?'hidden':''}><span>${esc(f.l)}${MARK(f.req,f.adm)}</span>${c}</label>`}
/* each group reads as a plain question; fields marked adv fold away under "More details" */
const GQ={'Customer':'Who Is The Customer?','Phone Numbers':'How Can We Phone Them?','Email':'Their Email Address','Home Address':'Where Do They Live?','Invoice Address':'Where Should The Invoice Go?','Site Address':'Where Is The Work Being Done?',
  'Lead':'About This Lead','Source And Interest':'How They Found Us And What They Want','Result':'What Happens Next','Next Visit':'The Next Visit',
  'Contract':'About This Contract','Sales Information':'Who Sold It And How They Found Us','Money':'The Money','Finance Plan':'Paying On Finance?','Invoice':'Invoicing','Dates':'Fitting Dates','Team':'Fitting Team','Info For FENSA':'Details For FENSA'};
const DEFV={invSame:'Same as home',siteSame:'Same as home'};
const fval=(f,v)=>String(v[f.k]??DEFV[f.k]??'').trim();
/* a section is finished when its required boxes are filled (and, for phones, at least one number) */
function grpDone(fs,v){const vis=fs.filter(f=>!(f.dep&&(v[f.dep]||'Same as home')!='Different'));
  if(!vis.some(f=>f.req||f.any||DEFV[f.k]))return vis.some(f=>!f.ro&&!f.adv&&fval(f,v));
  return vis.filter(f=>f.req).every(f=>fval(f,v))&&(!vis.some(f=>f.any)||vis.some(f=>f.any&&fval(f,v)))&&vis.some(f=>fval(f,v))}
const grpSum=(fs,v)=>fs.filter(f=>!f.adv&&!(f.dep&&(v[f.dep]||'Same as home')!='Different')).map(f=>{const x=fval(f,v);if(!x||(f.t=='number'&&+x===0&&/£/.test(f.l)))return '';return f.t=='number'&&/£/.test(f.l)?money(+x):f.k=='vatRate'?'VAT '+x+'%':f.t=='date'&&SAFE.date(x)?fd(x):x}).filter(Boolean).slice(0,4).join(' · ');
/* ---- cards that open in turn ----
   Each group is a card: icon, plain question, and "Not filled in yet" or a one-line summary with a tick.
   One card is open at a time; its Next button closes it and opens the next (or moves to the next step). */
const GRPF={};let GID=0;
const GIC={'Customer':IC.user,'Phone Numbers':'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2','Email':'M4 6h16v12H4zM4 7l8 6 8-6','Home Address':IC.home,
  'Invoice Address':IC.finance,'Site Address':'M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z','Lead':IC.leads,'Source And Interest':IC.search,'Result':IC.fitting,'Next Visit':IC.fitting,'Contract':IC.contracts,'Sales Information':IC.leads,'Money':IC.finance,'Finance Plan':IC.finance,'Invoice':IC.reports,'Dates':IC.fitting,'Team':IC.staff,'Info For FENSA':IC.admin};
const TICK='M5 13l4 4L19 7';
const grpH=(t,fs,v,id,nextT)=>{GRPF[id]=fs;const main=fs.filter(f=>!f.adv),adv=fs.filter(f=>f.adv),open=adv.some(f=>String(v[f.k]??'').trim()),done=grpDone(fs,v);
  return `<section class="rg fg gc shut ${done?'done':''}" data-g="${id}" data-ic="${esc(GIC[t]||IC.edit)}"><h4><button type="button" class="rg-t" onclick="grpOpen(this.closest('.rg'))" aria-expanded="false"><span class="rg-ic">${svg(done?TICK:(GIC[t]||IC.edit))}</span><span class="rg-tt"><span class="rg-n">${esc(GQ[t]||t)}</span><small class="rg-sum nocap">${done?esc(grpSum(fs,v)):'Not filled in yet'}</small></span><em class="rg-ch">${done?'Change':'Fill in'}</em></button></h4>${fs.some(f=>f.any)?'<p class="anyh">Fill in at least one number *</p>':''}${main.map(f=>rfH(f,v)).join('')}${adv.length?`<details class="rmore"${open?' open':''}><summary>More details <span>(${adv.length})</span></summary><div class="rmore-b">${adv.map(f=>rfH(f,v)).join('')}</div></details>`:''}<div class="rg-nx"><button type="button" class="btn" onclick="grpNext(this.closest('.rg'))">${nextT?'Next: '+esc(GQ[nextT]||nextT)+' &rarr;':'Done'}</button></div></section>`};
const byGroup=(fs,v)=>{const g={};fs.forEach(f=>(g[f.g]=g[f.g]||[]).push(f));const E=Object.entries(g);return E.map(([t,x],i)=>grpH(t,x,v,'g'+(GID++),E[i+1]&&E[i+1][0])).join('')};
function grpVals(fs){const v={};fs.forEach(f=>{const e=$('#f_'+f.k);v[f.k]=e?e.value:''});return v}
function grpRefresh(g){const fs=GRPF[g.dataset.g];if(!fs)return;const v=grpVals(fs),d=grpDone(fs,v);g.classList.toggle('done',d);
  g.querySelector('.rg-ic').innerHTML=svg(d?TICK:g.dataset.ic);g.querySelector('.rg-sum').textContent=d?grpSum(fs,v):'Not filled in yet';g.querySelector('.rg-ch').textContent=d?'Change':'Fill in';grpRing(g.closest('.rw-p'))}
function grpShut(g,s){g.classList.toggle('shut',s);g.querySelector('.rg-t').setAttribute('aria-expanded',!s);if(s)grpRefresh(g)}
function grpOpen(g){if(!g.classList.contains('shut')){grpShut(g,true);return}
  [...(g.closest('.rw-p')||document).querySelectorAll('.rg.gc')].forEach(x=>{if(x!==g&&!x.classList.contains('shut'))grpShut(x,true)});grpShut(g,false);
  const f=g.querySelector('.rf:not([hidden]) input:not([readonly]),.rf:not([hidden]) select,.rf:not([hidden]) textarea');if(f&&matchMedia('(pointer:fine)').matches)setTimeout(()=>f.focus(),30);
  setTimeout(()=>g.scrollIntoView({block:'nearest',behavior:'smooth'}),40)}
/* Next skips cards that are already finished; when none are left in this step, go to the next step */
function grpNext(g){grpShut(g,true);const G=[...(g.closest('.rw-p')||document).querySelectorAll('.rg.gc')],i=G.indexOf(g);
  const n=G.slice(i+1).find(x=>!x.classList.contains('done'))||G.slice(0,i).find(x=>!x.classList.contains('done'));
  if(n)grpOpen(n);else{const S2=RW.steps,i=S2.indexOf(RTAB[RW.kind]);if(i<S2.length-1)recStep(1)}}
function grpRing(P){if(!P)return;const G=[...P.querySelectorAll('.rg.gc')];if(!G.length)return;const d=G.filter(x=>x.classList.contains('done')).length;let r=P.querySelector('.gring');
  if(!r){const H=P.querySelector('.rw-sh');if(!H)return;H.insertAdjacentHTML('beforeend','<div class="gring"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" fill="none" stroke="var(--line)" stroke-width="4"/><circle class="gr-v" cx="18" cy="18" r="15" fill="none" stroke="#12794c" stroke-width="4" stroke-linecap="round" transform="rotate(-90 18 18)"/></svg><b></b></div>');r=P.querySelector('.gring')}
  r.querySelector('.gr-v').setAttribute('stroke-dasharray',(94*d/G.length)+' 95');r.querySelector('b').textContent=d+' of '+G.length+' done'}
/* first time a step is shown: open the first card that still needs filling in */
function grpInit(P){if(!P||P.dataset.ginit)return;const G=[...P.querySelectorAll('.rg.gc')];if(!G.length)return;P.dataset.ginit=1;
  const first=G.find(x=>!x.classList.contains('done'));if(first)grpShut(first,false);grpRing(P)}
function recDep(sel){const k=sel.id.slice(2);$$(`#mbox [data-dep="${k}"]`).forEach(r=>r.hidden=sel.value!='Different')}

/* ---- record window ---- */
/* steps that are nice to have: never the reason a record opens part-way through */
const REC_OPTIONAL=['notes','docs','calls','gdpr','appts','deliveries'];
let RW=null;const RTAB={lead:'customer',contract:'customer'};
/* the record is worked through as steps, in the order the job happens */
const RSTEPS={lead:['customer','details','appts','survey','check','notes','docs','gdpr'],contract:['customer','details','survey','products','finance','fitting','deliveries','check','notes','docs','calls','gdpr']};
const RNAME={lead:{details:'Enquiry'},contract:{details:'Contract'}};
const RHINT={customer:'Who they are, how to reach them and where the work is.',details:{lead:'Where the enquiry came from, what they want and what happens next.',contract:'Contract type, stage and sales information.'},appts:'Book the visit, then send the customer a reminder by email or text, or add it to a calendar.',survey:'Every window and door opening: sizes, type and glass.',products:'What is being supplied and fitted, with prices.',finance:'Contract value, payments and invoicing.',fitting:'Dates, fitting team and the details FENSA needs.',deliveries:'Supplier deliveries booked for this job.',check:{lead:'The steps that turn an enquiry into a sale. Tick each one as you go.',contract:'Every stage from signed contract to guarantee. Ticks record who did it and when.'},notes:'General notes and a log of calls, emails and visits.',docs:'Photos from the survey and fitting, and any documents.',calls:'Service calls raised on this job.',gdpr:'Marketing consent and data notes.'};
function recOpen(kind,id){const D=REC[kind],r=id?D.get(id):null;if(id&&!r)return;
  const W=RW={kind,id:r?r.id:null,isNew:!r,v:r?JSON.parse(JSON.stringify(r)):D.blank(),list:D.order()};if(kind=='contract')fitSync(W.v);
  W.v.log=W.v.log||[];W.v.photos=(W.v.photos||[]).filter(SAFE.img);tmp=W.v.photos;tmpDraw=()=>{recThumbs();recRail()};
  const ord=RSTEPS[kind],opt=k=>REC_OPTIONAL.includes(k)?1:0,tabs=D.tabs(W).sort((a,b)=>opt(a.k)-opt(b.k)||ord.indexOf(a.k)-ord.indexOf(b.k)),tab=tabs.some(t=>t.k==RTAB[kind])?RTAB[kind]:tabs[0].k,pos=W.list.indexOf(W.id);W.steps=tabs.map(t=>t.k);
  const nm=k=>(RNAME[kind]||{})[k]||tabs.find(t=>t.k==k).t,hint=k=>{const h=RHINT[k];return typeof h=='object'?h[kind]:h||''};
  openModal(`<div class="rw">
   <div class="rw-bar"><button class="rb1 sv" onclick="recSave(false)">${svg('M5 12l5 5L20 7')}Save</button>${W.isNew?'':D.actions(W)}<span class="rw-sp"></span>
    ${W.isNew||W.list.length<2?'':`<button class="rb1" title="Save this one and open the previous ${esc(D.label.toLowerCase())}" ${A('recNav',-1)} ${pos<=0?'disabled':''}>&lsaquo; Previous</button><span class="rw-pos">${esc(D.label)} ${pos+1} of ${W.list.length}</span><button class="rb1" title="Save this one and open the next ${esc(D.label.toLowerCase())}" ${A('recNav',1)} ${pos>=W.list.length-1?'disabled':''}>Next &rsaquo;</button>`}
    <button class="rb1 cl" onclick="recClose()">${svg('M6 6l12 12M18 6L6 18')}Close</button></div>
   <div class="rw-h"><div><small>${esc(D.label)}${W.isNew?' · New':''}</small><h2>${esc(D.heading(W))}</h2>${W.isNew?'':`<div class="rw-hc">${telOf(W.v)?`<a class="nocap" href="tel:${esc(telOf(W.v).replace(/[^\d+]/g,''))}">${svg('M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2')}${esc(telOf(W.v))}</a>`:''}${mailOf(W.v)?`<a class="nocap" href="mailto:${esc(mailOf(W.v))}">${svg('M4 6h16v12H4zM4 7l8 6 8-6')}${esc(mailOf(W.v))}</a>`:''}${W.v.town?`<span>${svg('M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z')}${esc(W.v.town)}</span>`:''}</div>`}</div><div class="rw-hk">${D.headStats(W)}</div></div>
   <div class="rw-path" id="rwStg"></div>
   <div class="rw-x"><aside class="rw-rail"><div class="rw-prog"><span id="rwPct"></span><i><b id="rwBar"></b></i></div>
     <div class="rw-next" id="rwNextUp"></div><p class="rw-grp">Steps</p><ol class="rw-steps">${tabs.map((t,i)=>`${i&&opt(t.k)&&!opt(tabs[i-1].k)?'</ol><p class="rw-grp">Extras <span>if needed</span></p><ol class="rw-steps">':''}<li><button type="button" data-t="${t.k}" class="${t.k==tab?'on':''}" ${A('recTab',t.k)}><i>${i+1}</i><span><b>${esc(nm(t.k))}</b><small data-st="${t.k}"></small></span></button></li>`).join('')}</ol></aside>
    <div class="rw-main"><div class="rw-b">${tabs.map((t,i)=>`<div class="rw-p ${t.k==tab?'on':''}" data-t="${t.k}" role="tabpanel"><div class="rw-sh"><small>Step ${i+1} of ${tabs.length}</small><h3>${esc(nm(t.k))}</h3><p>${esc(hint(t.k))}</p>${t.k=='customer'||t.k=='details'?`<p class="rw-req">Boxes marked <span class="rq">*</span> must be filled in. Boxes with ${MARK(0,1)} can only be changed by an administrator.</p>`:''}<div class="rw-todo" data-td="${t.k}" aria-live="polite"></div></div>${t.h(W)}</div>`).join('')}</div>
     <div class="rw-foot"><button type="button" class="btn ghost" id="rwPrev" onclick="recStep(-1)"></button><span class="rw-sp"></span><button type="button" class="btn ghost" onclick="recSave(false)">Save</button><button type="button" class="btn" id="rwNext" onclick="recStep(1)"></button></div></div></div></div>`,'full');
  W.nm=nm;recThumbs();recDocs();recFoot();recRail();stgDraw();actDraw();
  if(!W.isNew){const todo=W.steps.find(k=>{const b=$(`#mbox .rw-steps button[data-t="${k}"]`);return b&&!b.classList.contains('ok')&&!REC_OPTIONAL.includes(k)});recTab(todo||W.steps[0])}grpInit($('#mbox .rw-p.on'));
  $('#mbox .rw-x').addEventListener('change',e=>{const g=e.target.closest&&e.target.closest('.rg.gc');if(g)grpRefresh(g)});$('#mbox .rw-x').addEventListener('input',()=>{RW.dirty=1;clearTimeout(recRail.t);recRail.t=setTimeout(recRail,250)});$('#mbox .rw-x').addEventListener('change',e=>{RW.dirty=1;const c=e.target;if(c.classList&&c.classList.contains('rck')){const w=c.parentElement.querySelector('.ck-w');if(w)w.textContent=c.checked?'Done today by '+USER:''}recRail()});
  drawThumbs()}
function recTab(k){RTAB[RW.kind]=k;$$('#mbox .rw-steps button').forEach(b=>b.classList.toggle('on',b.dataset.t==k));$$('#mbox .rw-p').forEach(p=>p.classList.toggle('on',p.dataset.t==k));grpInit($('#mbox .rw-p.on'));$('#mbox .rw-b').scrollTop=0;recFoot();recRail();const b=$(`#mbox .rw-steps button[data-t="${k}"]`);if(b&&b.scrollIntoView)b.scrollIntoView({block:'nearest',inline:'nearest'})}
function recStep(d){const S2=RW.steps,i=S2.indexOf(RTAB[RW.kind]);if(d>0&&i==S2.length-1){recSave(true);return}const n=S2[i+d];if(n)recTab(n)}
function recFoot(){const S2=RW.steps,i=S2.indexOf(RTAB[RW.kind]),p=$('#rwPrev'),n=$('#rwNext');if(!p)return;
  p.hidden=i<=0;p.innerHTML=i>0?'&larr; Back: '+esc(RW.nm(S2[i-1])):'';n.innerHTML=i<S2.length-1?'Next: '+esc(RW.nm(S2[i+1]))+' &rarr;':'Save and finish';n.classList.toggle('green',i==S2.length-1)}
/* progress for each step, worked out from what is on screen now */
function recRail(){if(!RW||!$('#rwPct'))return;const g=k=>{const e=$('#f_'+k);return String(e?e.value:(RW.v[k]??'')).trim()},n=s=>$$(`#mbox ${s}`).length,v=RW.v;
  const ck=$$('#mbox .rck'),ckd=ck.filter(c=>c.checked).length,tel=[g('mob1'),g('home1'),g('work'),g('mob2'),g('home2')].find(Boolean)||v.phone||'',em=g('email1')||v.email||'',ad=[g('homeAddr')||v.address,g('town')].filter(Boolean).join(', ');
  const ops=n('.op[data-f="ref"]'),lines=n('.pl[data-f="name"]'),val=+g('value')||0,paid=+g('paid')||0,ph=(tmp||[]).length,log=(v.log||[]).length;
  const ST={customer:[[g('name'),tel||em,ad].filter(Boolean).length+' of 3: name, contact, address',!!(g('name')&&(tel||em)&&ad)],
    details:RW.kind=='lead'?[g('source')?'From '+g('source'):'Source not set',!!(g('source')&&g('product'))]:[g('stage')||'Stage not set',!!(g('stage')&&g('product'))],
    appts:[g('apptDate')?'Booked '+fd(g('apptDate')):(v.appts||[]).length?(v.appts||[]).length+' booked':'None booked',!!(g('apptDate')||(v.appts||[]).length)],
    survey:[ops?ops+' opening'+(ops==1?'':'s'):'Nothing surveyed yet',ops>0],products:[lines?lines+' line'+(lines==1?'':'s'):'No products yet',lines>0],
    finance:[val?(val-paid>0?m0(val-paid)+' to collect':'Paid in full'):'No value yet',val>0&&paid>=val],fitting:[g('fit')?'Fit '+fd(g('fit')):'No fit date',!!g('fit')],
    deliveries:[S.deliveries.filter(d=>d.contract==v.id).length+' booked',S.deliveries.some(d=>d.contract==v.id)&&S.deliveries.filter(d=>d.contract==v.id).every(d=>d.status=='Received')],
    check:[ckd+' of '+ck.length+' done',ck.length>0&&ckd==ck.length],notes:[log?log+' entr'+(log==1?'y':'ies'):g('notes')?'Notes added':'Nothing yet',!!(log||g('notes'))],
    docs:[ph+' photo'+(ph==1?'':'s')+', '+(RW.docs||[]).length+' doc'+((RW.docs||[]).length==1?'':'s'),ph>0||(RW.docs||[]).length>0],calls:[S.calls.filter(c=>c.contract==v.id).length+' calls',false],gdpr:[g('gdprDate')?'Consent '+fd(g('gdprDate')):'Not recorded',!!g('gdprDate')]};
  const NEED={customer:[!g('name')&&['Customer name','name'],!(tel||em)&&['A phone number or email','mob1'],!ad&&['Home address','homeAddr']],
    details:[RW.kind=='lead'?!g('source')&&['Where they found us','source']:!g('stage')&&['Contract stage','stage'],!g('product')&&['What they want','product']],
    appts:[!(g('apptDate')||(v.appts||[]).length)&&['A visit date','apptDate']],survey:[!ops&&['At least one window or door','']],products:[!lines&&['At least one product','']],
    finance:[!val&&['Contract value','value'],val>0&&paid<val&&['Payment still to collect','paid']],fitting:[!g('fit')&&['Fitting date','fit'],!g('fitter1')&&['Lead fitter','fitter1']],
    check:[ck.length>ckd&&[(ck.length-ckd)+' tick'+(ck.length-ckd==1?'':'s')+' left','']],gdpr:[!g('gdprDate')&&['Consent date','gdprDate']]};
  finSum();fitReveal();stgDraw();
  const ckt=$('#mbox .ck-top');if(ckt){ckt.querySelector(':scope>b').textContent=ckd+' of '+ck.length+' done';ckt.querySelector('i b').style.width=Math.round(100*ckd/(ck.length||1))+'%'}
  let done=0;RW.steps.forEach(k=>{const s=ST[k]||['',false],el=$(`#mbox small[data-st="${k}"]`);if(el)el.textContent=s[0];const b=$(`#mbox .rw-steps button[data-t="${k}"]`);if(b)b.classList.toggle('ok',!!s[1]);if(s[1])done++});
  const pc=Math.round(100*done/RW.steps.length);$('#rwPct').textContent=done+' of '+RW.steps.length+' steps complete';$('#rwBar').style.width=pc+'%';
  recTodo(NEED)}
/* the 'still to do' box: each missing item is a button that takes you to the box to fill in */
function recTodo(N){$$('#mbox .rw-todo').forEach(el=>{const k=el.dataset.td,m=(N[k]||[]).filter(Boolean),opt=REC_OPTIONAL.includes(k),ok=!m.length;
  const h=ok?`<div class="td-ok">${svg('M5 12l5 5L20 7')}<span>${opt?'Nothing more needed here.':'This step is done.'} ${RW.steps.indexOf(k)<RW.steps.length-1?'Press Next when ready.':'Press Save and finish.'}</span></div>`
   :`<div class="td-l"><b>${opt?'Optional: you can add':'Still to fill in'}</b>${m.map(x=>x[1]?`<button type="button" class="td-i" ${A('recGo',x[1])}>${esc(x[0])} &rsaquo;</button>`:`<span class="td-i">${esc(x[0])}</span>`).join('')}</div>`;
  if(el.dataset.h!==h){const was=el.dataset.h&&!el.querySelector('.td-ok');el.dataset.h=h;el.innerHTML=h;if(ok&&was)el.firstChild.classList.add('pop')}})}
function recGo(id){const f=$('#f_'+id);if(!f)return;const p=f.closest('.rw-p');if(p&&!p.classList.contains('on'))recTab(p.dataset.t);const g=f.closest('.rg.gc');if(g&&g.classList.contains('shut'))grpOpen(g);
  setTimeout(()=>{f.scrollIntoView({block:'center',behavior:'smooth'});f.focus({preventScroll:true});const w=f.closest('.rf,.ff')||f;w.classList.remove('flash');void w.offsetWidth;w.classList.add('flash')},60)}
/* ======== stages (like a sales "path"): where the job is, and one line on what to do next ======== */
const STG={lead:[
  {s:'New',n:'Enquiry',todo:'Ring them back and book a home visit.',go:'Visit Done'},
  {s:'Surveyed',n:'Home Visit',todo:'Write up what they want and send the quote.',go:'Quote Sent'},
  {s:'Quoted',n:'Quote',todo:'Follow up and win the job.',go:'Won'},
  {s:'Won',n:'Won',todo:'Turn it into a contract so the job can be ordered.',go:''}],
 contract:[
  {s:'Deposit due',n:'Deposit',todo:'Get it signed, take the deposit and book the check survey.',go:'Survey Done'},
  {s:'Survey done',n:'Check Survey',todo:'Sizes confirmed. Order the frames and glass.',go:'Ordered'},
  {s:'Ordered',n:'Ordered',todo:'Check the delivery in and agree a fitting date.',go:'Fitting Booked'},
  {s:'Fitting booked',n:'Fitting Booked',todo:'Fit the job.',go:'Fitted'},
  {s:'Fitted',n:'Fitted',todo:'Put any snags right, collect the balance and sign off.',go:'Complete'},
  {s:'Complete',n:'Complete',todo:'Job finished. Nothing more to do.',go:''}]};
const STG_LOST={s:'Lost',n:'Lost',todo:'This lead was lost. Note why, or reopen it if they come back.',go:''};
const stgCur=()=>{const e=$('#f_stage');return(e&&e.value)||RW.v.stage||STG[RW.kind][0].s};
const stgOf=s=>s=='Lost'?STG_LOST:STG[RW.kind].find(x=>x.s==s)||STG[RW.kind][0];
function stgDraw(){if(!RW)return;const L=STG[RW.kind],cur=stgCur(),i=L.findIndex(x=>x.s==cur),x=stgOf(cur),nx=L[i+1],el=$('#rwStg'),nu=$('#rwNextUp'),lost=cur=='Lost';
  const h=`<ol class="path ${lost?'lost':''}">${L.map((y,j)=>`<li class="${j<i?'done':j==i?'on':''}"><button type="button" ${j==i?'aria-current="step"':''} ${A('stgSet',y.s)} title="${j==i?'Where the job is now':'Move to '+esc(y.n)}">${j<i?svg('M5 12l5 5L20 7'):''}${esc(y.n)}</button></li>`).join('')}</ol>${lost?'<span class="tag r">Lost</span>':''}${RW.kind=='contract'&&RW.v.onHold=='Yes'?'<span class="tag y">On Hold</span>':''}${RW.kind=='lead'&&!RW.isNew&&cur!='Won'?`<button type="button" class="path-x" ${A('stgSet',lost?'New':'Lost')}>${lost?'Reopen':'Mark Lost'}</button>`:''}`;
  if(el&&el.dataset.h!==h){el.dataset.h=h;el.innerHTML=h}
  const g=`<small>Next Step</small><p>${esc(x.todo)}</p>${RW.kind=='lead'&&cur=='Won'&&canSee('contracts')&&!RW.isNew?'<button type="button" class="btn sm" onclick="recConvert()">Convert To Contract</button>':x.go&&nx&&!RW.isNew?`<button type="button" class="btn sm" ${A('stgSet',nx.s)}>Mark As ${esc(x.go)} &rsaquo;</button>`:''}`;
  if(nu&&nu.dataset.h!==g){nu.dataset.h=g;nu.innerHTML=g}}
function stgSet(st){if(!RW)return;const e=$('#f_stage'),cur=stgCur();if(!e||st==cur)return;
  if(![...e.options].some(o=>o.value==st)){toast('That stage is not available');return}
  const nm=stgOf(st).n,lab=REC[RW.kind].label.toLowerCase(),bad=st=='Lost';
  askIn(st=='Won'?'Mark this lead as won?':bad?'Mark this lead as lost?':'Move this '+lab+' to '+nm+'?',st=='Won'?'Next you can turn it into a contract. It is saved straight away.':bad?'You can reopen it later if they come back. It is saved straight away.':'It is saved straight away.',st=='Won'?'Yes, Won':bad?'Yes, Lost':'Move To '+nm,()=>stgGo(st,cur,nm),bad)}
function stgGo(st,cur,nm){const e=$('#f_stage');if(!RW||!e)return;
  e.value=st;e.dispatchEvent(new Event('change',{bubbles:true}));
  if(st=='Won'||st=='Lost'){const p=$('#f_prob');if(p)p.value=st=='Won'?100:0}
  if(recSave(false))setTimeout(()=>{const s=$('#rwStg .path li.on');if(s)s.classList.add('pop');toast('Moved to '+nm)},60);else stgDraw()}
/* activity: a timeline you can open or close, remembered per browser */
function actOpen(){try{return localStorage.getItem('bb_act')!=='0'&&innerWidth>1200}catch(e){return innerWidth>1200}}
function actToggle(){const x=$('#mbox .rw-x'),on=!x.classList.contains('act-on');x.classList.toggle('act-on',on);const b=$('#mbox .actb');if(b){b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)}try{localStorage.setItem('bb_act',on?'1':'0')}catch(e){}if(on)actDraw()}
function actDraw(){const el=$('#rwAct');if(!el||!RW)return;const v=RW.v,td=today(),I={Call:'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2',Email:'M4 6h16v12H4zM4 7l8 6 8-6',Visit:IC.fitting,Stage:'M5 12l5 5L20 7',Pay:IC.finance};
  const E=[...(v.log||[]).map(e=>({d:e.at||e.d||'',t:/^Stage/.test(e.t)?'Stage':e.t||'Note',n:/^Stage: /.test(e.t)?e.t.slice(7):e.n||'',by:e.by||''})),
    ...(RW.kind=='contract'?(v.pay||[]).map(p=>({d:p.date,t:'Pay',n:money(p.amt)+(p.kind?' · '+p.kind:''),by:p.by||''})):[]),
    ...(v.apptDate?[{d:v.apptDate,t:'Visit',n:[v.apptType,v.apptTime,v.apptWith].filter(Boolean).join(' · '),by:''}]:[]),
    ...(RW.kind=='contract'&&v.fit?[{d:v.fit,t:'Visit',n:'Fitting'+(v.fitter?' · '+v.fitter:''),by:''}]:[]),
    ...((v.created||v.cdate)?[{d:v.created||v.cdate,t:'Stage',n:REC[RW.kind].label+' created',by:v.takenBy||v.createdBy||''}]:[])].filter(x=>x.d).sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:0);
  const up=E.filter(x=>x.d>td),past=E.filter(x=>x.d<=td);
  const row=x=>`<li class="act-${x.t=='Pay'?'pay':x.t=='Stage'?'stg':'n'}"><i>${svg(I[x.t]||IC.edit)}</i><div><b>${esc(x.t=='Pay'?'Payment':x.t)}</b>${x.n?`<p>${esc(x.n)}</p>`:''}<small>${fd(x.d)}${x.by?' · '+esc(x.by):''}</small></div></li>`;
  el.innerHTML=`<div class="act-hd"><h3>Activity</h3><button type="button" class="mx2" onclick="actToggle()" aria-label="Close activity">&times;</button></div><div class="act-add"><select id="an_t" aria-label="Type">${['Note','Call','Email','Visit'].map(x=>`<option>${x}</option>`).join('')}</select><button type="button" class="btn sm" onclick="actAdd()">Add</button><input id="an_n" maxlength="300" placeholder="What happened?" aria-label="What happened" onkeydown="if(event.key=='Enter'){event.preventDefault();actAdd()}"></div>
   ${up.length?`<p class="act-g">Coming Up</p><ul class="act">${up.reverse().map(row).join('')}</ul>`:''}<p class="act-g">History</p><ul class="act">${past.map(row).join('')||'<li class="act-e">Nothing yet.</li>'}</ul>`}
function actAdd(){const n=SAFE.text(($('#an_n')||{}).value,300);if(!n){fieldErr($('#an_n'),'Type what happened');return}const t=['Note','Call','Email','Visit'].includes($('#an_t').value)?$('#an_t').value:'Note';
  const nt=$('#f_notes');if(nt)RW.v.notes=nt.value;RW.v.log.unshift({t,n,by:USER,at:today()});RW.dirty=1;recRedraw('notes');actDraw();const f=$('#rwAct .act li');if(f)f.classList.add('fin-in');toast(t+' added. Press Save to keep it.')}
function recRedraw(t){const D=REC[RW.kind],x=D.tabs(RW).find(z=>z.k==t),p=$(`#mbox .rw-p[data-t="${t}"]`);if(x&&p)p.innerHTML=x.h(RW);recRail()}
function recRead(){const D=REC[RW.kind],o=readFields(D.fields(RW));if(!o)return null;
  const at={...(RW.v.chkAt||{})};$$('#mbox .rck').forEach(c=>{const k=c.dataset.k;(o.chk=o.chk||{})[k]=c.checked;if(c.checked&&!at[k])at[k]={d:today(),by:USER};if(!c.checked)delete at[k]});o.chkAt=at;
  o.phTags=(RW.v.phTags||[]).slice(0,MAX_PHOTOS);if($('#mbox .pl'))o.lines=readLines();if($('#mbox .op')||RW.v.openings)o.openings=$('#mbox .op')?readOps():RW.v.openings;o.photos=tmp.slice(0,MAX_PHOTOS);return o}
function recSave(close){busyBtn($('#mbox .rw-bar .sv'));RW.closeAfter=close;const D=REC[RW.kind],o=recRead();if(!o){const a=document.activeElement,p=a&&a.closest&&a.closest('.rw-p');if(p&&!p.classList.contains('on')){recTab(p.dataset.t);setTimeout(()=>a.focus(),30)}return false}const e=D.check&&D.check(RW,o);if(e=='ASK')return false;if(e){toast(e.replace(/ \(.*step\)$/,''));if(/Customer step/.test(e)){recTab('customer');if(/phone/i.test(e)){const f=$('#f_mob1')||$('#f_home1');if(f)fieldErr(f,'Fill in at least one phone number')}else if(/name/i.test(e)){const f=$('#f_name');if(f)fieldErr(f,'Type the customer name')}}return false}
  const id=D.save(RW,o);if(id==null){toast('This record no longer exists. It may have been deleted on another screen.');return false}store();if(close){closeModal();render()}else{render();recOpen(RW.kind,id)}toast('Saved');return true}
function recNav(d){const L=RW.list,i=L.indexOf(RW.id),n=d=='first'?0:d=='last'?L.length-1:i+d;if(n<0||n>=L.length)return;const kind=RW.kind;if(RW.dirty&&!recSave(false))return;recOpen(kind,L[n])}
/* small inline lists inside a record */
function recAdd(list,fs,tab){const o={};for(const k of fs){const e=$('#ra_'+k);o[k]=e?SAFE.text(e.value,300):''}if(!Object.values(o).some(Boolean)){toast('Fill in the details first');return}
  RW.v[list]=RW.v[list]||[];RW.v[list].unshift({...o,by:USER,at:today()});RW.dirty=1;recRedraw(tab);actDraw()}
function recDel(list,i,tab){RW.v[list].splice(i,1);RW.dirty=1;recRedraw(tab);actDraw()}
/* closing with changes: ask inside the window (a separate popup would replace the record) */
function recClose(){if(!RW||!RW.dirty){closeModal();return}const w=$('#mbox .rw');if(!w){closeModal();return}let a=$('#rwAsk');
  if(!a){w.insertAdjacentHTML('beforeend',`<div class="rw-ask" id="rwAsk" role="alertdialog" aria-modal="true" aria-labelledby="rwAskT"><div class="rw-ask-b"><h3 id="rwAskT">Save your changes?</h3><p>You have changed this ${esc(REC[RW.kind].label.toLowerCase())}. If you close without saving, the changes are lost.</p>
    <div class="rw-ask-a"><button class="btn green" onclick="$('#rwAsk').remove();recSave(true)">Save and close</button><button class="btn ghost" onclick="closeModal()">Close without saving</button><button class="btn ghost" onclick="$('#rwAsk').remove()">Keep editing</button></div></div></div>`);a=$('#rwAsk')}
  a.querySelector('.btn').focus()}
/* checklist shown as stages, with who ticked each item and when */
const ckTab=(W,items)=>{const G=items===CK?CKG:LCKG,C=W.v.chk||{},T=W.v.chkAt||{},n=items.filter(k=>C[k]).length;
  return `<div class="ckw"><div class="ck-top"><b>${n} of ${items.length} done</b><i><b style="width:${Math.round(100*n/(items.length||1))}%"></b></i></div><div class="ckg">${G.map(([t,d,L],gi)=>{const dn=L.filter(k=>C[k]).length;return `<section class="rg ck-s ${dn==L.length?'all':''}"><h4><span><i class="ck-n">${gi+1}</i>${esc(t)}</span><small>${dn} of ${L.length}</small></h4><p class="muted">${esc(d)}</p>${L.map(k=>`<label class="ck-i"><input type="checkbox" class="rck" data-k="${esc(k)}" ${C[k]?'checked':''}><span><b>${esc(k)}</b><small class="ck-w">${C[k]&&T[k]?'Done '+fd(T[k].d)+' by '+esc(T[k].by):C[k]?'Done':''}</small></span></label>`).join('')}</section>`}).join('')}</div></div>`};
/* photos (with a tag each) and documents (stored on this device, type worked out from the file) */
const PHTAGS=['Survey','Before','During','After','Damage','Other'];
const DOCTYPES=['Quote','Contract','Survey','Drawing','Invoice','Certificate','Spreadsheet','Document','Photo','Other'];
function docGuess(name,type){const n=String(name).toLowerCase(),x=(n.split('.').pop()||'');
  if(/quote|quotation|estimate/.test(n))return 'Quote';if(/invoice|receipt/.test(n))return 'Invoice';if(/fensa|certificate|cert\b|guarantee|warranty/.test(n))return 'Certificate';
  if(/survey|measure/.test(n))return 'Survey';if(/contract|agreement|terms/.test(n))return 'Contract';if(/drawing|plan|elevation/.test(n)||['dwg','dxf'].includes(x))return 'Drawing';
  if(['xls','xlsx','csv','numbers'].includes(x)||/sheet|excel|csv/.test(type))return 'Spreadsheet';if(/^image\//.test(type)||['jpg','jpeg','png','heic','webp','gif'].includes(x))return 'Photo';
  if(['pdf','doc','docx','txt','rtf','odt'].includes(x)||/pdf|word|text/.test(type))return 'Document';return 'Other'}
const docIcon=t=>({Quote:'£',Invoice:'£',Certificate:'✓',Drawing:'⌗',Spreadsheet:'▦',Photo:'▣',Survey:'⌖',Contract:'✎'}[t]||'▤');
const photoTab=W=>`<div class="rcols"><section class="rg wide"><h4><span>Photos</span><span class="acts"><label class="mini pri" style="cursor:pointer">Take photo<input type="file" accept="image/*" capture="environment" hidden onchange="addPh(this)"></label><label class="mini" style="cursor:pointer">Upload photos<input type="file" accept="image/*" multiple hidden onchange="addPh(this)"></label></span></h4><p class="muted" style="margin:.1rem 0 .6rem;font-size:.82rem">Up to ${MAX_PHOTOS} photos. Tag each one so survey, before and after shots are easy to find.</p><div class="thumbs rph" id="thumbs"></div></section>
  <section class="rg wide"><h4><span>Documents</span><label class="mini pri" style="cursor:pointer">Upload documents<input type="file" multiple hidden onchange="recDocUp(this)"></label></h4><p class="muted" style="margin:.1rem 0 .6rem;font-size:.82rem">Quotes, drawings, certificates, invoices. The type is picked from the file name and format, and you can change it. Files are kept on this device.</p><div id="recDocs" class="rdocs">Loading</div></section></div>`;
function recThumbs(){const t=$('#thumbs');if(!t)return;const T=RW.v.phTags=RW.v.phTags||[];while(T.length<tmp.length)T.push('Survey');T.length=tmp.length;
  t.innerHTML=tmp.map((p,i)=>`<div class="th"><img src="${SAFE.img(p)}" alt="Photo ${i+1}"><button type="button" aria-label="Remove photo" ${A('recRmPh',i)}>&times;</button><select class="phtag" ${AC('onchange','recPhTag',i,'this.value')}>${PHTAGS.map(x=>`<option ${x==T[i]?'selected':''}>${x}</option>`).join('')}</select></div>`).join('')||emptyArt('survey','No photos yet.')}
function recRmPh(i){tmp.splice(i,1);(RW.v.phTags||[]).splice(i,1);RW.dirty=1;recThumbs();recRail()}
function recPhTag(i,v){RW.v.phTags=RW.v.phTags||[];RW.v.phTags[i]=PHTAGS.includes(v)?v:'Other';RW.dirty=1}
const recRef=()=>RW.kind+':'+(RW.id||RW.v.id);
async function recDocs(){const el=$('#recDocs');if(!el)return;try{const ref=recRef(),L=((await fx('readonly',s=>s.getAll()))||[]).filter(f=>f.ref==ref).sort((a,b)=>b.time-a.time);RW.docs=L;
  el.innerHTML=L.map(f=>`<div class="rdoc"><span class="rdi">${esc(docIcon(f.cat))}</span><span class="rdn"><b>${esc(f.name)}</b><small>${kb(f.size)} · ${new Date(f.time).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})} · ${esc(f.by||'')}</small></span><select ${AC('onchange','recDocType',f.id,'this.value')}>${DOCTYPES.map(x=>`<option ${x==f.cat?'selected':''}>${x}</option>`).join('')}</select><span class="acts"><button class="mini" ${A('recDocOpen',f.id)}>Open</button><button class="mini" ${A('recDocDl',f.id)}>Download</button><button class="mini del" ${A('recDocDel',f.id)}>Remove</button></span></div>`).join('')||emptyArt('files','No documents yet.');
  const sm=$('#mbox small[data-st="docs"]');if(sm)sm.textContent=tmp.length+' photo'+(tmp.length==1?'':'s')+', '+L.length+' doc'+(L.length==1?'':'s')}catch(e){el.innerHTML='<p class="empty">Document storage is not available in this browser.</p>'}}
async function recDocUp(inp){if(RW.isNew){toast('Save the record first, then add documents');inp.value='';return}let n=0,skip=0;const ref=recRef();
  try{for(const f of inp.files){if(f.size>MAX_UPLOAD){skip++;continue}await fx('readwrite',s=>s.put({id:uuid(),ref,name:SAFE.text(f.name,120),cat:docGuess(f.name,f.type),size:f.size,type:f.type,time:Date.now(),by:USER,blob:f}));n++}
    inp.value='';if(n)audit('Document added',ref,n+' file(s)');store();toast(n+' added'+(skip?', '+skip+' too large':''));recDocs()}catch(e){toast('Document storage is not available here')}}
async function recDocType(id,v){const f=(RW.docs||[]).find(x=>x.id==id);if(!f)return;f.cat=DOCTYPES.includes(v)?v:'Other';await fx('readwrite',s=>s.put(f));recDocs()}
function recDocOpen(id){const f=(RW.docs||[]).find(x=>x.id==id);if(!f)return;if(/^(application\/pdf|image\/(png|jpe?g|gif|webp)|text\/plain)/.test(f.blob.type))window.open(URL.createObjectURL(f.blob),'_blank','noopener');else download(f.name,f.blob)}
function recDocDl(id){const f=(RW.docs||[]).find(x=>x.id==id);if(f)download(f.name,f.blob)}
function recDocDel(id){const f=(RW.docs||[]).find(x=>x.id==id);if(!f)return;askIn('Remove '+f.name+'?','It is deleted from this device.','Remove',()=>recDocGo(f),true)}
function recDocGo(f){fx('readwrite',s=>s.delete(f.id)).then(()=>{audit('Document removed',recRef(),f.name);store();recDocs()})}
/* when a lead becomes a contract, its documents move with it */
async function docsMove(from,to){try{const L=((await fx('readonly',s=>s.getAll()))||[]).filter(f=>f.ref==from);for(const f of L){f.ref=to;await fx('readwrite',s=>s.put(f))}}catch(e){}}
const logTab=(W,tab)=>`<div class="rcols"><section class="rg"><h4>Notes</h4>${rfH({k:'notes',l:'General notes',t:'area',rows:8},W.v)}</section>
  <section class="rg"><h4>Activity Log</h4><div class="radd"><select id="ra_t">${['Call','Email','Visit','Survey','Quote sent','Note'].map(x=>`<option>${x}</option>`).join('')}</select><input id="ra_n" placeholder="What happened" maxlength="300"><button class="mini pri" ${A('recAdd','log',['t','n'],tab)}>Add</button></div>
  ${W.v.log.map((e,i)=>`<div class="row"><span><b>${esc(e.t)}</b><br><span class="muted">${esc(e.n||'')}</span></span><span class="muted" style="text-align:right;white-space:nowrap">${fd(e.d||e.at)}<br>${esc(e.by||'')} <button class="mini del" ${A('recDel','log',i,tab)} aria-label="Remove">&times;</button></span></div>`).join('')||'<p class="empty">No activity yet.</p>'}</section></div>`;
const ckTabOld=(W,items)=>`<div class="rg wide"><h4>Checklist, ${items.filter(k=>(W.v.chk||{})[k]).length} of ${items.length} done</h4><div class="rck-g">${items.map(k=>`<label class="rckl"><input type="checkbox" class="rck" data-k="${esc(k)}" ${(W.v.chk||{})[k]?'checked':''}><span>${esc(k)}</span></label>`).join('')}</div></div>`;


/* ---- survey schedule: one row per window or door opening ---- */
const OTYPES=['Casement window','Tilt & turn window','Flush sash window','Vertical slider (sash)','Bay window','Bow window','Fixed light','Residential door','Composite door','French doors','Patio / sliding door','Bifold door','Roof lantern','Other'];
const GLAZ=['Clear','Obscure','Toughened','Laminated','Toughened obscure','Acoustic','Solar control'];
const OPF=[['ref','Ref',5],['room','Room / Position',11],['type','Type',0,OTYPES],['w','Width (mm)',6],['h','Height (mm)',6],['glaz','Glass',0,GLAZ],['low','Glass Below 800mm',0,['No','Yes']],['esc','Fire Escape',0,['No','Yes']],['vents','Trickle Vents',0,['Yes','No']],['col','Colour',8],['notes','Notes',12]];
const opDoor=x=>/door/i.test(x.type||'');
const opSafe=x=>(opDoor(x)||x.low=='Yes')&&!/toughened|laminated/i.test(x.glaz||'');
const opArea=L=>Math.round(sum(L,x=>(+x.w||0)*(+x.h||0))/1e4)/100;
function opsTab(W){const L=W.v.openings=W.v.openings||[],d=L.filter(opDoor).length,bad=L.filter(opSafe).length,isC=W.kind=='contract';
  return `<div class="rg wide"><h4><span>Survey Schedule</span><span class="acts">${isC?`<button class="mini" onclick="opFensa()">Copy counts to FENSA</button>`:''}<button class="mini" ${A('opAdd','w')}>+ Window</button><button class="mini pri" ${A('opAdd','d')}>+ Door</button></span></h4>
  <p class="muted nocap" style="margin:.1rem 0 .7rem;font-size:.84rem">${L.length?`${L.length-d} window${L.length-d==1?'':'s'}, ${d} door${d==1?'':'s'}, about ${opArea(L)} m² of frame.`:'List each opening as you survey: size, type and glass.'}${bad?` <b style="color:var(--red)">${bad} need${bad==1?'s':''} safety glass</b> (doors and glass below 800mm must be toughened or laminated).`:''}</p>
  <div class="tw" style="box-shadow:none;overflow-x:auto"><table class="plt opt"><thead class="nocap"><tr>${OPF.map(f=>`<th>${esc(f[1])}</th>`).join('')}<th></th></tr></thead><tbody>
  ${L.map((x,i)=>`<tr class="${opSafe(x)?'warnr':''}">${OPF.map(f=>`<td>${f[3]?`<select class="op" data-i="${i}" data-f="${f[0]}" onchange="opChk(this)">${f[3].map(o=>`<option ${o==(x[f[0]]??'')?'selected':''}>${esc(o)}</option>`).join('')}</select>`:`<input class="op" data-i="${i}" data-f="${f[0]}" value="${esc(x[f[0]]??'')}" ${f[0]=='w'||f[0]=='h'?'type="number" min="0" step="1" inputmode="numeric"':'maxlength="120"'} style="min-width:${f[2]}ch">`}</td>`).join('')}<td><button class="mini del" ${A('opDel',i)} aria-label="Remove">&times;</button></td></tr>`).join('')||`<tr><td colspan="${OPF.length+1}" class="empty">No openings yet.</td></tr>`}
  </tbody></table></div></div>`}
function readOps(){const L=(RW.v.openings||[]).map(x=>({...x}));$$('#mbox .op').forEach(e=>{const x=L[+e.dataset.i];if(!x)return;const f=e.dataset.f;x[f]=f=='w'||f=='h'?(SAFE.num(e.value,{max:20000,dp:0})??''):SAFE.text(e.value,120)});return L}
function opAdd(k){const L=RW.v.openings=readOps(),door=k=='d',n=L.filter(x=>door?opDoor(x):!opDoor(x)).length+1;L.push({ref:(door?'D':'W')+n,room:'',type:door?'Residential door':'Casement window',w:'',h:'',glaz:door?'Toughened':'Clear',low:'No',esc:'No',vents:door?'No':'Yes',col:'',notes:''});RW.dirty=1;recRedraw('survey')}
function opDel(i){RW.v.openings=readOps();RW.v.openings.splice(i,1);RW.dirty=1;recRedraw('survey')}
function opChk(el){const x=readOps()[+el.dataset.i];if(x)el.closest('tr').classList.toggle('warnr',opSafe(x))}
function opFensa(){const L=readOps(),d=L.filter(opDoor).length;RW.v.winCount=L.length-d;RW.v.doorCount=d;['winCount','doorCount'].forEach(k=>{const e=$('#f_'+k);if(e)e.value=RW.v[k]});RW.dirty=1;toast('FENSA counts set: '+(L.length-d)+' windows, '+d+' doors. Save to keep.')}

/* ---- product lines (contracts) ---- */
function linesTab(W){const L=W.v.lines=W.v.lines||[];const tot=sum(L,x=>(+x.qty||0)*(+x.rate||0));
  return `<div class="rg wide"><h4><span>Products</span><button class="mini pri" onclick="lineAdd()">+ Add line</button></h4><div class="tw" style="box-shadow:none"><table class="plt"><thead><tr><th>No</th><th>Code</th><th>Product</th><th class="n">Qty</th><th>Guarantee</th><th>Location</th><th class="n">Rate</th><th class="n">Net Value</th><th></th></tr></thead><tbody>
  ${L.map((x,i)=>`<tr><td>${i+1}</td>${['code','name','qty','guar','loc','rate'].map(f=>`<td><input class="pl" data-i="${i}" data-f="${f}" value="${esc(x[f]??'')}" ${f=='qty'||f=='rate'?'type="number" step="any" min="0" inputmode="decimal"':'maxlength="120"'} ${f=='code'?'list="itemCodes"':''}></td>`).join('')}<td class="n">${money((+x.qty||0)*(+x.rate||0))}</td><td><button class="mini del" ${A('lineDel',i)} aria-label="Remove line">&times;</button></td></tr>`).join('')||'<tr><td colspan="9" class="empty">No products yet. Add the windows, doors and labour on this contract.</td></tr>'}
  </tbody><tfoot><tr><td colspan="7" class="n"><b>Total</b></td><td class="n"><b>${money(tot)}</b></td><td></td></tr></tfoot></table></div></div>`}
function readLines(){const L=(RW.v.lines||[]).map(x=>({...x}));$$('#mbox .pl').forEach(e=>{const x=L[+e.dataset.i];if(!x)return;const f=e.dataset.f;x[f]=f=='qty'||f=='rate'?SAFE.num(e.value,{max:1e7})??0:SAFE.text(e.value,120)});return L}
function lineAdd(){RW.v.lines=readLines();RW.v.lines.push({code:'',name:'',qty:1,guar:'10 years',loc:'',rate:0});RW.dirty=1;recRedraw('products')}
function lineDel(i){RW.v.lines=readLines();RW.v.lines.splice(i,1);RW.dirty=1;recRedraw('products')}

/* ======================= LEAD record ======================= */
const LEADF=W=>[
  {k:'id',l:ISOWN()?'Lead number (admin can change)':'Lead number',ro:!ISOWN(),max:5,g:'Lead'},{k:'created',l:'Lead date',t:'date',g:'Lead'},{k:'officeRef',adv:1,l:'Office reference',g:'Lead'},
  {k:'takenBy',adv:1,l:'Taken by',t:'select',o:staffNames(),g:'Lead'},{k:'branch',l:'Sales area / branch',t:'select',o:['',...BRANCHES],g:'Lead'},{k:'owner',l:'Salesperson',t:'select',o:[RANDOM_SP,...OWNERS()],g:'Lead'},
  {k:'stage',l:'Stage',t:'select',o:STAGES,g:'Lead'},{k:'prob',adv:1,l:'Win chance (%)',t:'number',max:100,dp:0,g:'Lead'},
  {k:'source',l:'Lead source',t:'select',o:SOURCES,req:1,g:'Source And Interest'},{k:'subSource',l:'Sub source',g:'Source And Interest'},{k:'subSubSource',adv:1,l:'Sub sub source',g:'Source And Interest'},
  {k:'productType',l:'Product type',t:'select',o:PTYPES,req:1,g:'Source And Interest'},{k:'interest1',l:'Product interest 1',g:'Source And Interest'},{k:'interest2',adv:1,l:'Product interest 2',g:'Source And Interest'},
  {k:'product',l:'Work wanted',t:'area',max:300,g:'Source And Interest'},{k:'value',l:'Net value (£)',t:'number',g:'Source And Interest'},
  {k:'quoteType',adv:1,l:'Quote type',t:'select',o:['','Email','Post','In person'],g:'Result'},{k:'payMethod',adv:1,l:'Payment method',t:'select',o:['','Cash','Bank transfer','Card','Finance','Cheque'],g:'Result'},
  {k:'result',l:'Result',t:'select',o:RESULTS,g:'Result'},{k:'resultDate',adv:1,l:'Result date',t:'date',g:'Result'},{k:'followup',l:'Next action date',t:'date',g:'Result'},{k:'next',l:'Next action',g:'Result'},
  {k:'showroom',adv:1,l:'Showroom visit',t:'select',o:YN,g:'Result'},{k:'notified',adv:1,l:'Salesperson notified',t:'select',o:YN,g:'Result'},{k:'frameInfo',adv:1,l:'Frame info',g:'Result'},{k:'customCat',adv:1,l:'Custom category',g:'Result'}];
const ATYPES=['Home survey','Design consultation','Showroom visit','Measure up','Call back','Quote follow-up'],ASTAT=['Booked','Confirmed','Done','No show','Cancelled'];
const APPTF=[{k:'apptType',l:'Visit type',t:'select',o:ATYPES,g:'Next Visit'},{k:'apptDate',l:'Date',t:'date',g:'Next Visit'},{k:'apptTime',l:'Time',t:'time',g:'Next Visit'},{k:'apptWith',l:'With',t:'select',o:['',...staffNames().filter(Boolean)],g:'Next Visit'},{k:'apptStatus',l:'Status',t:'select',o:ASTAT,g:'Next Visit'},{k:'apptNotes',l:'Notes for the visit',t:'area',max:300,g:'Next Visit'},{k:'demoDate',l:'Second visit date',t:'date',g:'Next Visit'}];
/* the appointment as it is on screen (main, i<0) or from the list */
function apptGet(i){const g=k=>{const e=$('#f_'+k);return e?e.value:(RW.v[k]||'')};if(i<0)return{ty:g('apptType')||'Home survey',d:g('apptDate'),tm:g('apptTime'),w:g('apptWith'),st:g('apptStatus')};const a=(RW.v.appts||[])[i]||{};return{ty:a.ty,d:a.d,tm:a.tm,w:a.w,st:a.st}}
function apptCust(){const g=k=>{const e=$('#f_'+k);return String(e?e.value:(RW.v[k]||'')).trim()};return{nm:[g('title'),g('name')].filter(Boolean).join(' ')||'there',em:g('email1'),mob:g('mob1')||g('mob2')||g('mob3'),addr:siteOf({siteSame:g('siteSame'),siteAddr:g('siteAddr'),siteAddr2:g('siteAddr2'),siteTown:g('siteTown'),siteCounty:g('siteCounty'),sitePc:g('sitePc'),homeAddr:g('homeAddr'),homeAddr2:g('homeAddr2'),town:g('town'),county:g('county'),homePc:g('homePc')})}}
const apptWhen=a=>a.d?new Date(a.d+'T00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})+(a.tm?' at '+a.tm:''):'';
function apptSend(i,how){const a=apptGet(i),c=apptCust();if(!a.d){toast('Set the date first');return}
  const txt=`Hello ${c.nm}, this is a reminder of your ${String(a.ty||'appointment').toLowerCase()} with Broadland Windows on ${apptWhen(a)}${c.addr?' at '+c.addr:''}.${a.w?' '+a.w+' will be with you.':''} If you need to change it, please call ${CO.tel}.`;
  if(how=='email'){if(!c.em){toast('Add the customer email on the Customer step');return}location.href='mailto:'+encodeURIComponent(c.em)+'?subject='+encodeURIComponent('Your Broadland Windows appointment, '+apptWhen(a))+'&body='+encodeURIComponent(txt+'\n\nKind regards,\nBroadland Windows')}
  else if(how=='sms'){if(!c.mob){toast('Add a mobile number on the Customer step');return}location.href='sms:'+c.mob.replace(/[^\d+]/g,'')+'?&body='+encodeURIComponent(txt)}
  else if(how=='copy')copyText(txt);
  else if(how=='ics'){const p=n=>String(n).padStart(2,'0'),d=a.d.replace(/-/g,''),tm=(a.tm||'09:00').replace(':','')+'00',e=new Date(a.d+'T'+(a.tm||'09:00'));e.setHours(e.getHours()+1);const end=iso(e).replace(/-/g,'')+'T'+p(e.getHours())+p(e.getMinutes())+'00',ix=s=>String(s||'').replace(/[\\,;]/g,'\\$&').replace(/\n/g,'\\n');
    const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Broadland Windows//CRM//EN','BEGIN:VEVENT','UID:'+uuid()+'@broadland-crm','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z','DTSTART:'+d+'T'+tm,'DTEND:'+end,'SUMMARY:'+ix((a.ty||'Appointment')+': '+c.nm),'LOCATION:'+ix(c.addr),'DESCRIPTION:'+ix(a.w?'With '+a.w:''),'END:VEVENT','END:VCALENDAR'].join('\r\n');
    download('appointment-'+a.d+'.ics',new Blob([ics],{type:'text/calendar'}))}
  if(how!='copy'){(RW.v.log=RW.v.log||[]).unshift({d:today(),t:how=='ics'?'Calendar file made':how=='sms'?'Text reminder':'Email reminder',n:(a.ty||'')+' '+apptWhen(a),by:USER});RW.dirty=1;recRedraw('notes')}}
const apptBtns=i=>`<div class="apb"><button type="button" class="mini pri" ${A('apptSend',i,'email')}>Email reminder</button><button type="button" class="mini" ${A('apptSend',i,'sms')}>Text reminder</button><button type="button" class="mini" ${A('apptSend',i,'ics')}>Add to calendar</button><button type="button" class="mini" ${A('apptSend',i,'copy')}>Copy</button></div>`;
const apptTab=W=>`<div class="rcols"><section class="rg"><h4>Next Visit</h4>${APPTF.map(f=>rfH(f,W.v)).join('')}${apptBtns(-1)}</section>
  <section class="rg"><h4>Other Visits And Calls</h4><div class="radd"><select id="ra_ty">${ATYPES.map(x=>`<option>${x}</option>`).join('')}</select><input id="ra_d" type="date"><input id="ra_tm" type="time"><select id="ra_w">${staffNames().filter(Boolean).map(x=>`<option>${esc(x)}</option>`).join('')}</select><button class="mini pri" ${A('recAdd','appts',['ty','d','tm','w'],'appts')}>Book</button></div>
  ${(W.v.appts||[]).map((a,i)=>`<div class="apc"><div class="apc-h"><span class="apc-d"><b>${a.d?new Date(a.d+'T00:00').getDate():'-'}</b><small>${a.d?new Date(a.d+'T00:00').toLocaleDateString('en-GB',{month:'short'}):''}</small></span><span><b>${esc(a.ty||'Visit')}</b><br><span class="muted">${a.d?esc(apptWhen(a)):'No date'}${a.w?' · '+esc(a.w):''}</span></span><button class="mini del" ${A('recDel','appts',i,'appts')} aria-label="Remove">&times;</button></div>${apptBtns(i)}</div>`).join('')||emptyArt('holiday','Nothing else booked yet.')}</section></div>`;
const nextAppt=l=>[l.apptDate,...(l.appts||[]).map(a=>a.d)].filter(Boolean).sort().find(d=>d>=today())||'';
REC.lead={label:'Lead',
  get:id=>S.leads.find(l=>l.id==id),order:()=>leadList().map(l=>l.id),
  blank:()=>({id:nextLeadId(),created:today(),stage:'New',source:'Website',owner:RANDOM_SP,takenBy:USER,invSame:'Same as home',siteSame:'Same as home',addrType:'Home',log:[],appts:[],chk:{}}),
  heading:W=>`${W.v.id}  ${[W.v.title,W.v.name].filter(Boolean).join(' ')||'New lead'}${W.v.company?' · '+W.v.company:''}`,
  headStats:W=>`<span><small>Net Value</small><b>${m0(W.v.value)}</b></span><span><small>Next Action</small><b>${W.v.followup?fd(W.v.followup):'-'}</b></span>`,
  actions:W=>`<button class="rb1" ${A('reportCust','lead',W.id)}>${svg(IC.reports)}Customer sheet</button>${canSee('contracts')&&W.v.stage!='Lost'?`<button class="rb1 go" ${A('recConvert')}>${svg('M5 12h14M13 6l6 6-6 6')}Convert to contract</button>`:''}${ISOWN()?`<button class="rb1 dl" ${A('delLead',W.id)}>${svg('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3')}Delete</button>`:''}`,
  fields:W=>[...LEADF(W),...CUSTF,...GDPRF,...APPTF,{k:'notes',l:'Notes',t:'area'}],
  tabs:W=>[{k:'details',t:'Details',h:W=>`<div class="rcols">${byGroup(LEADF(W),W.v)}</div>`},
    {k:'customer',t:'Customer',h:W=>`<div class="rcols">${byGroup(CUSTF,W.v)}</div>`},
    {k:'appts',t:'Appointments',n:(W.v.appts||[]).length,h:apptTab},
    {k:'survey',t:'Survey',n:(W.v.openings||[]).length,h:opsTab},
    {k:'check',t:'Sales Steps',h:W=>ckTab(W,LEAD_CK)},
    {k:'notes',t:'Notes & Activity',n:W.v.log.length,h:W=>logTab(W,'notes')},
    {k:'docs',t:'Photos & Docs',n:(W.v.photos||[]).length,h:photoTab},
    {k:'gdpr',t:'GDPR',h:W=>`<div class="rcols">${grpH('Marketing Consent',GDPRF,W.v)}<section class="rg"><h4>About GDPR</h4><p class="muted" style="font-size:.85rem">Only market to customers who said yes. Record when and how consent was given. Customers can ask to see or delete their data at any time.</p></section></div>`}],
  check:(W,o)=>{if(!o.name)return 'Customer name is needed (Customer step)';if(!PHONES.some(k=>o[k]))return 'Add at least one phone number (Customer step)';
    if(ISOWN()&&o.id&&o.id!=W.id){if(!/^L\d{4}$/.test(o.id))return 'Lead numbers look like L0001';if(S.leads.some(x=>x.id==o.id))return 'Lead number '+o.id+' is already used'}},
  save:(W,o)=>{if(o.owner==RANDOM_SP){o.owner=spResolve(o.owner);setTimeout(()=>toast('Lead given to '+o.owner),400)}const isNew=W.isNew,l=isNew?{id:nextLeadId(),log:[{d:today(),t:'Lead created',by:USER}]}:S.leads.find(x=>x.id==W.id);if(!l)return;
    const a=l.stage;if(o.prob===0&&!($('#f_prob').value||'').trim())o.prob='';const nid2=ISOWN()&&o.id&&/^L\d{4}$/.test(o.id)&&!S.leads.some(x=>x!==l&&x.id==o.id)?o.id:null;delete o.id;if(nid2&&nid2!=l.id){audit('Lead number changed',l.id,'to '+nid2);l.id=nid2}
    Object.assign(l,o,{log:W.v.log,appts:W.v.appts||[]});if(l.stage=='Won')l.prob=100;else if(l.stage=='Lost')l.prob=0;if(!isNew&&a!=o.stage)l.log.unshift({d:today(),t:'Stage: '+a+' to '+o.stage,by:USER});
    if(isNew){l.log=[...W.v.log,{d:today(),t:'Lead created',by:USER}];S.leads.push(l)}custCompat(l);audit(isNew?'Lead added':'Lead edited',l.id,l.name);return l.id}};
function recConvert(){if(!recSave(false))return;const id=RW.id;closeModal();convertLead(id)}

/* ======================= CONTRACT record ======================= */
const CDETF=W=>[
  {k:'id',l:'Contract number',ro:1,g:'Contract'},{k:'cdate',l:'Contract date',t:'date',g:'Contract'},{k:'officeRef',l:'Office ref 1',g:'Contract'},{k:'officeRef2',l:'Office ref 2',g:'Contract'},
  {k:'contractType',l:'Contract type',t:'select',o:CTYPES,g:'Contract'},{k:'supplyOnly',l:'Supply only',t:'select',o:YN,g:'Contract'},{k:'stage',l:'Stage',t:'select',o:CSTAGES,g:'Contract'},
  {k:'onHold',l:'On hold',t:'select',o:YN,g:'Contract'},{k:'cancelled',l:'Cancelled',t:'select',o:YN,g:'Contract'},{k:'product',l:'Work / products summary',t:'area',max:300,g:'Contract'},{k:'flash',l:'Flash note (shows in red)',max:160,g:'Contract'},
  {k:'lead',l:'Lead number',ro:1,g:'Sales Information'},{k:'salesArea',l:'Sales area',t:'select',o:['',...BRANCHES],g:'Sales Information'},{k:'soldBy',l:'Salesperson',t:'select',o:[RANDOM_SP,...OWNERS()],g:'Sales Information'},
  {k:'source',l:'Lead source',t:'select',o:['',...SOURCES],g:'Sales Information'},{k:'subSource',l:'Sub source',g:'Sales Information'},{k:'createdBy',l:'Created by',ro:1,g:'Sales Information'},{k:'approvals',l:'Contract approvals',g:'Sales Information'}];
const CFINF=()=>[{k:'value',l:'Contract value, including VAT (£)',t:'number',g:'Money'},{k:'vatRate',l:'VAT rate (%)',t:'select',o:['20','5','0'],g:'Money'},{k:'deposit',l:'Deposit asked for (£)',t:'number',g:'Money'},{k:'depDue',l:'Deposit due by',t:'date',g:'Money'},{k:'balDue',l:'Balance due by',t:'date',g:'Money'},{k:'paid',l:'Paid so far (£)',t:'number',g:'Money',adm:1},...(ISADM()?[{k:'cost',l:'Job cost (£)',t:'number',g:'Money',adm:1}]:[]),{k:'payMethod',l:'Main payment method',t:'select',o:['','Cash','Bank transfer','Card','Finance','Cheque'],g:'Money'},
  {k:'finCo',l:'Finance company',g:'Finance Plan'},{k:'finRef',l:'Finance reference',g:'Finance Plan'},{k:'finStatus',l:'Finance status',t:'select',o:['','Applied','Approved','Declined','Paid out'],g:'Finance Plan'},{k:'invoiced',l:'Invoiced',t:'select',o:YN,g:'Invoice'},{k:'invoiceNo',l:'Invoice number',g:'Invoice'},{k:'invoiceDate',l:'Invoice date',t:'date',g:'Invoice'}];
const CFITF=()=>[{k:'survey',l:'Survey date',t:'date',g:'Dates'},{k:'order',l:'Order date',t:'date',g:'Dates'},{k:'delDate',l:'Delivery date',t:'date',g:'Dates'},{k:'fit',l:'Fit date',t:'date',g:'Dates'},
  ...[1,2,3,4,5,6].map(i=>({k:'fitter'+i,l:i==1?'Fitter 1 (lead fitter)':'Fitter '+i,t:'select',o:['',...FITL()],g:'Team'})),{k:'installMgr',l:'Installation manager',t:'select',o:staffNames(),g:'Team'},{k:'surveyor',l:'Assigned surveyor',t:'select',o:staffNames(),g:'Team'},{k:'fitNotes',l:'Fitting notes',t:'area',max:600,g:'Team'},
  {k:'winCount',l:'Window count',t:'number',dp:0,g:'Info For FENSA'},{k:'doorCount',l:'Door count',t:'number',dp:0,g:'Info For FENSA'},{k:'conservatory',l:'Conservatory',t:'select',o:YN,g:'Info For FENSA'},{k:'roofline',l:'Roofline',t:'select',o:YN,g:'Info For FENSA'},{k:'fensaExported',l:'Exported to FENSA',t:'select',o:YN,g:'Info For FENSA'},{k:'fensaNA',l:'FENSA not required',t:'select',o:YN,g:'Info For FENSA'}];
REC.contract={label:'Contract',
  get:id=>S.contracts.find(c=>c.id==id),order:()=>ctrList().map(c=>c.id),
  blank:()=>({id:nid('C',S.contracts),cdate:today(),stage:'Deposit due',value:0,paid:0,fitter:'',vatRate:String(CO.vat??'20'),contractType:CTYPES[0],soldBy:USER,createdBy:USER,invSame:'Same as home',siteSame:'Same as home',addrType:'Home',pay:[],chk:{},lines:[],log:[]}),
  heading:W=>`${W.v.id}  ${[W.v.title,W.v.name].filter(Boolean).join(' ')||'New contract'}${W.v.company?' · '+W.v.company:''}`,
  headStats:W=>`${W.v.flash?`<span class="flash">${esc(W.v.flash)}</span>`:''}<span><small>Value</small><b>${m0(W.v.value)}</b></span><span><small>Paid</small><b>${m0(W.v.paid)}</b></span><span class="${(+W.v.value||0)-(+W.v.paid||0)>0?'hk-due':'hk-ok'}"><small>Outstanding</small><b>${(+W.v.value||0)-(+W.v.paid||0)>0?m0((+W.v.value||0)-(+W.v.paid||0)):'Paid'}</b></span><span><small>Fit</small><b>${W.v.fit?fd(W.v.fit):'-'}</b></span>`,
  actions:W=>`<button class="rb1" ${A('reportContract',W.id)}>${svg(IC.reports)}Reports</button><button class="rb1" ${A('recCall')}>${svg(IC.service)}Service call</button>${ISOWN()?`<button class="rb1 dl" ${A('del','contracts',W.id)}>${svg('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3')}Delete</button>`:''}`,
  fields:W=>[...CDETF(W),...CUSTF,...GDPRF,...CFINF(),...CFITF(),{k:'notes',l:'Notes',t:'area'}],
  tabs:W=>{const calls=S.calls.filter(c=>c.contract==W.v.id),dels=S.deliveries.filter(d=>d.contract==W.v.id);return[
    {k:'details',t:'Details',h:W=>`<div class="rcols">${byGroup(CDETF(W),W.v)}</div>`},
    {k:'customer',t:'Customer',h:W=>`<div class="rcols">${byGroup(CUSTF,W.v)}</div>`},
    {k:'survey',t:'Survey',n:(W.v.openings||[]).length,h:opsTab},
    {k:'products',t:'Products',n:(W.v.lines||[]).length,h:linesTab},
    {k:'check',t:'Job Progress',h:W=>ckTab(W,CK)},
    {k:'finance',t:'Finance',h:finTab},
    {k:'deliveries',t:'Deliveries',n:dels.length,h:W=>`<div class="rg wide"><h4><span>Deliveries For This Job</span><button class="mini pri" ${A('recDelivery')}>New delivery</button></h4>${dels.map(d=>`<div class="row"><span><b>${esc(d.supplier)}</b> ${esc(d.items)}<br><span class="muted">Due ${fd(d.due)}${d.stage?', '+esc(d.stage):''}</span></span>${dTag(d)}</div>`).join('')||'<p class="empty">No deliveries linked to this contract number.</p>'}</div>`},
    {k:'fitting',t:'Fitting',h:W=>`<div class="rcols">${byGroup(CFITF(),W.v)}</div>`},
    {k:'notes',t:'Notes & Activity',n:W.v.log.length,h:W=>logTab(W,'notes')},
    {k:'docs',t:'Photos & Docs',n:(W.v.photos||[]).length,h:photoTab},
    {k:'calls',t:'Service Calls',n:calls.length,h:W=>`<div class="rg wide"><h4><span>Service Calls</span><button class="mini pri" ${A('recCall')}>New service call</button></h4>${calls.slice().sort((a,b)=>(a.status=='Complete')-(b.status=='Complete')||String(b.takenAt||b.visit||'').localeCompare(String(a.takenAt||a.visit||''))).map(c=>`<div class="row clk-r" ${RC('editCall',c.id)}><span><b>${esc(c.id)}</b> ${esc(c.issue)}<br><span class="muted">${c.status=='Complete'?'Past ticket, completed '+(c.doneAt?fd(c.doneAt):''):esc(c.status)+', '+(c.visit?'visit '+fd(c.visit):'no visit booked')}${c.fitter?', '+esc(c.fitter):''}</span></span>${c.status=='Complete'?'<span class="tag g">Past</span>':prTag(c.priority)}</div>`).join('')||'<p class="empty">No service calls for this contract.</p>'}</div>`},
    {k:'gdpr',t:'GDPR',h:W=>`<div class="rcols">${grpH('Marketing Consent',GDPRF,W.v)}</div>`}]},
  check:(W,o)=>{if(!o.name)return 'Customer name is needed (Customer step)';if(!PHONES.some(k=>o[k]))return 'Add at least one phone number (Customer step)';if(o.paid>o.value&&o.value>0&&!W.okOver){askIn('Paid is more than the contract value','Save it anyway?','Save Anyway',()=>{W.okOver=1;recSave(W.closeAfter)});return 'ASK'}},
  save:(W,o)=>{if(o.soldBy==RANDOM_SP)o.soldBy=spResolve(o.soldBy);const isNew=W.isNew,c=isNew?{id:W.v.id}:S.contracts.find(x=>x.id==W.id);if(!c)return;delete o.id;delete o.lead;delete o.createdBy;
    const np=(W.v.pay||[]).length-((c.pay||[]).length),dp=Math.round(((+o.paid||0)-(+c.paid||0))*100)/100,a0=c.stage;if(np>0)audit('Payment recorded',c.id||W.v.id,np+' payment'+(np>1?'s':'')+', '+money(sum((W.v.pay||[]).slice(-np),x=>x.amt)));else if(o.paid!==undefined&&dp)audit(dp>0?'Paid amount raised':'Payment removed',c.id||W.v.id,money(Math.abs(dp)));if(!ISADM())delete o.cost;Object.assign(c,o,{pay:W.v.pay||[],log:W.v.log||[],createdBy:c.createdBy||W.v.createdBy||USER});c.fitter=[1,2,3,4,5,6].map(i=>c['fitter'+i]).filter(Boolean).join(', ');c.paid=+c.paid||0;c.value=+c.value||0;if(!isNew&&a0&&c.stage&&a0!=c.stage)(c.log=c.log||[]).unshift({t:'Stage',n:a0+' to '+c.stage,by:USER,at:today()});if(isNew){if(S.contracts.some(x=>x.id==c.id))c.id=nid('C',S.contracts);S.contracts.unshift(c)}
    custCompat(c);audit(isNew?'Contract added':'Contract edited',c.id,c.name);return c.id}};
/* ---- finance step: balance at a glance, then Make A Payment ---- */
const PAYM=['Bank transfer','Card','Cheque','Cash','Finance'],PAYK=['Deposit','Stage payment','Final balance','Other'];
function fitSync(c){if(c&&c.fitter&&![1,2,3,4,5,6].some(i=>c['fitter'+i]))String(c.fitter).split(/,\s*/).slice(0,6).forEach((x,i)=>c['fitter'+(i+1)]=x)}
/* fitters 2 to 6 only appear once the one before is filled in */
function fitReveal(){if(!RW||RW.kind!='contract')return;for(let i=2;i<=6;i++){const e=$('#f_fitter'+i),pv=$('#f_fitter'+(i-1));if(!e)continue;const w=e.closest('.rf')||e,pw=pv&&(pv.closest('.rf')||pv);
  const show=!!e.value||!!(pv&&pv.value&&!(pw&&pw.hidden));if(w.hidden==show){w.hidden=!show;if(show){w.classList.remove('fin-in');void w.offsetWidth;w.classList.add('fin-in')}}}}
function finNums(){const g=k=>{const e=$('#f_'+k);return e?e.value:RW.v[k]},val=+g('value')||0,paid=+g('paid')||0,rate=+(g('vatRate')??CO.vat??20)||0,dep=+g('deposit')||0;
  const vat=Math.round((val-val/(1+rate/100))*100)/100;return{val,paid,rate,vat,net:val-vat,bal:Math.round((val-paid)*100)/100,dep,depDue:g('depDue'),balDue:g('balDue')}}
function finTab(W){const P=W.v.pay||[],adm=ISADM();
  return `<div class="fin"><div class="fin-sum" id="finSum"></div>
   <div class="fin-pay" id="finPay" hidden></div>
   <section class="rg fin-list"><h4><span>Payments Received</span><small class="muted">${P.length} payment${P.length==1?'':'s'}</small></h4>
    ${P.map((p,i)=>`<div class="row fin-row"><span><b>${money(p.amt)}</b> <span class="tag">${esc(p.kind||p.method)}</span><br><small class="muted">${fd(p.date)} · ${esc(p.method)}${p.ref?' · '+esc(p.ref):''}${p.by?' · '+esc(p.by):''}</small></span>${adm?`<button type="button" class="mini del" ${A('recPayDel',i)} aria-label="Remove this payment">Remove</button>`:''}</div>`).join('')||'<p class="empty">No payments yet. Press Make A Payment when money comes in.</p>'}
   </section>
   <div class="rcols">${byGroup(CFINF(),W.v)}</div></div>`}
function finSum(){const el=$('#finSum');if(!el||!RW)return;const n=finNums(),pc=n.val?Math.min(100,Math.round(100*n.paid/n.val)):0,adm=ISADM(),td=today();
  const depLeft=Math.max(0,n.dep-n.paid),late=d=>d&&d<td;
  const st=!n.val?['No contract value yet','']:n.bal<=0?['Paid in full','g']:late(n.balDue)?['Balance overdue','r']:depLeft>0&&late(n.depDue)?['Deposit overdue','r']:depLeft>0?['Deposit to collect','y']:['Balance to collect','y'];
  const h=`<div class="fin-top"><div class="fin-big"><small>Outstanding Balance</small><b>${money(Math.max(0,n.bal))}</b><span class="tag ${st[1]}">${esc(st[0])}</span></div>
   <div class="fin-act"><button type="button" class="btn green fin-pb" ${adm?'onclick="payOpen()"':'disabled title="Only administrators can take payments"'}>${svg(adm?IC.plus:IC.lock)}Make A Payment</button>${RW.isNew?'':`<button type="button" class="btn ghost" ${A('invoicePrint',RW.id)}>${svg(IC.reports)}Print Invoice</button>`}</div></div>
   <div class="fin-bar" role="progressbar" aria-valuenow="${pc}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pc}%"></i></div><small class="muted">${money(n.paid)} paid of ${money(n.val)} (${pc}%)</small>
   <dl class="fin-g"><div><dt>Contract Value</dt><dd>${money(n.val)}</dd></div><div><dt>VAT At ${n.rate}%</dt><dd>${money(n.vat)}</dd></div><div><dt>Before VAT</dt><dd>${money(n.net)}</dd></div>
    <div><dt>Deposit</dt><dd>${n.dep?money(n.dep)+(depLeft>0?'':' ✓'):n.val&&depPct(RW.v)?`<span class="muted">${money(Math.round(n.val*depPct(RW.v))/100)} (${depPct(RW.v)}%)</span>`:'-'}${n.depDue?`<small>by ${fd(n.depDue)}</small>`:''}</dd></div><div><dt>Balance Due</dt><dd>${n.balDue?fd(n.balDue):'-'}</dd></div></dl>`;
  if(el.dataset.h!==h){el.dataset.h=h;el.innerHTML=h}}
function payOpen(){if(!need(ISADM,'Taking payments'))return;const el=$('#finPay');if(!el)return;if(!el.hidden){el.hidden=true;return}const n=finNums(),depLeft=Math.max(0,n.dep-n.paid);
  const q=(l,v)=>v>0?`<button type="button" class="td-i" ${A('payFill',v)}>${esc(l)} ${money(v)}</button>`:'';
  el.innerHTML=`<h4>Make A Payment</h4><div class="fin-q">${q('Whole balance',n.bal)}${q('Deposit',depLeft)}${!n.dep&&depPct(RW.v)?q(depPct(RW.v)+'% deposit',Math.round(n.val*depPct(RW.v))/100):''}</div>
   <div class="fin-f"><label class="rf"><span>Amount (£) *</span><input id="ra_amt" type="number" step="any" min="0" inputmode="decimal" placeholder="0.00"></label>
    <label class="rf"><span>Date</span><input id="ra_date" type="date" value="${today()}"></label>
    <label class="rf"><span>Paid by</span><select id="ra_method">${PAYM.map(x=>`<option>${x}</option>`).join('')}</select></label>
    <label class="rf"><span>What for</span><select id="ra_kind">${PAYK.map(x=>`<option${x==(n.paid?'Stage payment':'Deposit')?' selected':''}>${x}</option>`).join('')}</select></label>
    <label class="rf full"><span>Reference (optional)</span><input id="ra_ref" maxlength="60" placeholder="Card receipt, cheque number..."></label></div>
   <div class="fin-b"><button type="button" class="btn ghost" onclick="payOpen()">Cancel</button><button type="button" class="btn green" onclick="recPay()">${svg('M5 12l5 5L20 7')}Record Payment</button></div>`;
  el.hidden=false;el.classList.remove('fin-in');void el.offsetWidth;el.classList.add('fin-in');setTimeout(()=>{const a=$('#ra_amt');if(!a)return;a.focus();el.scrollIntoView({block:'nearest',behavior:'smooth'})},40)}
function finRe(){const P=$('#mbox .rw-p.on');if(P){delete P.dataset.ginit;grpInit(P)}finSum()}
function payFill(v){const e=$('#ra_amt');if(e){e.value=v;e.classList.remove('flash');void e.offsetWidth;e.classList.add('flash')}}
function finKeep(){const cur=readFields(CFINF());if(!cur)return false;Object.assign(RW.v,cur);return true}
function recPay(){if(!need(ISADM,'Recording payments'))return;const e=$('#ra_amt'),amt=SAFE.num(e.value,{max:1e7});if(!(amt>0)){fieldErr(e,'Type the amount paid');return}
  if(!finKeep())return;const n=finNums();if(amt>n.bal+0.005&&n.val>0&&!recPay.ok){askIn('That is more than the balance','The balance is '+money(n.bal)+'. Record '+money(amt)+' anyway?','Record It',()=>{recPay.ok=1;recPay()});return}recPay.ok=0;
  RW.v.pay=RW.v.pay||[];RW.v.pay.push({amt,date:SAFE.date($('#ra_date').value)||today(),method:PAYM.includes($('#ra_method').value)?$('#ra_method').value:'Other',kind:PAYK.includes($('#ra_kind').value)?$('#ra_kind').value:'Other',ref:SAFE.text($('#ra_ref').value,60),by:USER});
  RW.v.paid=Math.round(((+RW.v.paid||0)+amt)*100)/100;RW.dirty=1;recRedraw('finance');finRe();actDraw();
  const b=$('#finSum .fin-big');if(b)b.classList.add('pop');toast(money(amt)+' payment added. Press Save to keep it.')}
function recPayDel(i){if(!need(ISADM,'Removing payments'))return;const p=(RW.v.pay||[])[i];if(!p)return;askIn('Remove this payment?',money(p.amt)+' from '+fd(p.date)+'.','Remove',()=>recPayGo(i),true)}
function recPayGo(i){const p=(RW.v.pay||[])[i];if(!p||!finKeep())return;
  RW.v.pay.splice(i,1);RW.v.paid=Math.max(0,Math.round(((+RW.v.paid||0)-p.amt)*100)/100);RW.dirty=1;recRedraw('finance');finRe();toast('Payment removed. Press Save to keep the change.')}
/* service call / delivery from inside a contract: the form opens over the contract and comes back to it */
function recCall(){if(RW.isNew&&!recSave(false))return;editCall(null,RW.id)}
function recDelivery(){if(RW.isNew&&!recSave(false))return;editDel(null,null,RW.id)}
function recReturn(){if(!RW)return;['calls','deliveries'].forEach(t=>{if($(`#mbox .rw-p[data-t="${t}"]`))try{recRedraw(t)}catch(e){}})}

/* ---- entry points used across the app ---- */
function openLead(id){recOpen('lead',id)}
function editLead(id){if(id)recOpen('lead',id);else leadWizard()}
function leadWizard(){const id=nextLeadId();
  wizard({title:'New Lead '+id,saveLabel:'Create lead',v:{title:'',source:'Website',owner:RANDOM_SP,siteSame:'Same as home',productType:''},steps:[
    {t:'Customer',d:'Who is the customer?',f:[{k:'title',l:'Title',t:'select',o:['','Mr','Mrs','Miss','Ms','Mr & Mrs','Dr','Company'],req:1},{k:'name',l:'Name',req:1},{k:'mob1',l:'Mobile',t:'tel',max:30,hint:'Fill in at least one: a mobile or a home phone'},{k:'mob2',nx:'mob1',l:'Second mobile',t:'tel',max:30},{k:'home1',l:'Home phone',t:'tel',max:30},{k:'mob3',nx:'mob2',l:'Third mobile',t:'tel',max:30},{k:'home2',nx:'home1',l:'Second home phone',t:'tel',max:30},{k:'home3',nx:'home2',l:'Third home phone',t:'tel',max:30},{k:'email1',l:'Email',t:'email',w:'full',req:1},{k:'email2',nx:'email1',l:'Second email',t:'email',w:'full'},{k:'email3',nx:'email2',l:'Third email',t:'email',w:'full'},{k:'company',l:'Company (if business)',w:'full'}]},
    {t:'Address',d:'Where are they? Fill it in like a delivery address.',f:[{k:'homeAddr',l:'Address line 1',w:'full',max:120,req:1,hint:'House number or name and street'},{k:'homeAddr2',l:'Address line 2',w:'full',max:120},{k:'town',l:'Town / city',max:60,req:1},{k:'county',l:'County',max:60},{k:'homePc',l:'Postcode',max:10,req:1},{k:'addrType',l:'Address type',t:'select',o:['Home','Business'],req:1}]},
    {t:'Enquiry',d:'What do they want?',f:[{k:'productType',l:'Product type',t:'select',o:PTYPES,req:1},{k:'source',l:'How did they find us?',t:'select',o:SOURCES,req:1},{k:'product',l:'Work wanted',t:'area',w:'full',max:300},{k:'value',l:'Rough value (£)',t:'number'},{k:'owner',l:'Salesperson',t:'select',o:[RANDOM_SP,...OWNERS()]}]},
    {t:'Next Step',d:'What happens next?',f:[{k:'apptDate',l:'Appointment date',t:'date'},{k:'apptTime',l:'Appointment time',t:'time'},{k:'next',l:'Next action',w:'full',hint:'e.g. Call back Tuesday, send brochure'},{k:'followup',l:'Next action date',t:'date'}]},
    {t:'Review',d:'Check and create',review:1}],
    check:(st,v)=>{if(st==0&&!v.name)return 'Please enter the customer name';if(st==0&&!PHONES.some(k=>v[k]))return 'Add at least one phone number'},
    save:v=>{const lid=nextLeadId(),l={...v,id:lid,stage:'New',created:today(),takenBy:USER,invSame:'Same as home',addrType:v.company?'Business':'Home',log:[{d:today(),t:'Lead created',by:USER}],appts:[],chk:{}};
      l.owner=spResolve(l.owner);custCompat(l);S.leads.push(l);audit('Lead added',lid,l.name+' · '+l.owner);toast(lid+' created and given to '+l.owner+'. Open it any time to add more.')}})}
function openContract(id){recOpen('contract',id)}
function editContract(id){if(id)recOpen('contract',id);else contractWizard()}
/* a new contract in a few plain steps, like a new lead, then the full contract opens */
function depPct(c){return +((c&&c.contractType=='Commercial')?(CO.depCom??25):(CO.depRes??20))||0}
function contractWizard(){if(!canSee('contracts')){toast('Your account cannot create contracts');return}const nx=nid('C',S.contracts);
  wizard({title:'New Contract '+nx,saveLabel:'Create contract',v:{title:'',contractType:CTYPES[0],soldBy:RANDOM_SP,cdate:today()},steps:[
    {t:'Customer',d:'Who is the customer?',f:[{k:'title',l:'Title',t:'select',o:['','Mr','Mrs','Miss','Ms','Mr & Mrs','Dr','Company']},{k:'name',l:'Name',req:1},{k:'mob1',l:'Mobile',t:'tel',max:30,hint:'Fill in at least one: a mobile or a home phone'},{k:'home1',l:'Home phone',t:'tel',max:30},{k:'email1',l:'Email',t:'email',w:'full',req:1},{k:'company',l:'Company (if business)',w:'full'}]},
    {t:'Address',d:'Where is the work being done?',f:[{k:'homeAddr',l:'Address line 1',w:'full',max:120,req:1},{k:'homeAddr2',l:'Address line 2',w:'full',max:120},{k:'town',l:'Town / city',max:60,req:1},{k:'homePc',l:'Postcode',max:10,req:1}]},
    {t:'The Job',d:'What is being supplied and fitted?',f:[{k:'contractType',l:'Contract type',t:'select',o:CTYPES,req:1},{k:'product',l:'Work / products',t:'area',w:'full',max:300,req:1},{k:'value',l:'Contract value, including VAT (£)',t:'number'},{k:'cdate',l:'Contract date',t:'date'},{k:'soldBy',l:'Salesperson',t:'select',o:[RANDOM_SP,...OWNERS()]},{k:'source',l:'How did they find us?',t:'select',o:['',...SOURCES]}]},
    {t:'Review',d:'Check and create',review:1}],
    check:(st,v)=>{if(st==0&&!v.name)return 'Please enter the customer name';if(st==0&&!PHONES.some(k=>v[k]))return 'Add at least one phone number';if(st==0&&!SAFE.email(v.email1||''))return 'Enter a real email address'},
    save:v=>{const c={...REC.contract.blank(),...v,id:nid('C',S.contracts),createdBy:USER,addrType:v.company?'Business':'Home',vatRate:String(CO.vat??'20')};c.soldBy=spResolve(c.soldBy);c.value=+c.value||0;c.paid=0;
      if(c.value)c.deposit=Math.round(c.value*depPct(c))/100;fitSync(c);custCompat(c);S.contracts.unshift(c);audit('Contract added',c.id,c.name+' · '+c.soldBy);setTimeout(()=>openContract(c.id),80)}})}

/* ======================= list views (AdminBase-style "live views") ======================= */
function leadList(){const U=UI.lead,td=today(),tm=addDays(1),yd=addDays(-1),[ws,we]=weekRange();
  const ap=l=>[l.apptDate,...(l.appts||[]).map(a=>a.d)].filter(Boolean),isOpen=l=>!['Won','Lost'].includes(l.stage);
  const V={live:isOpen,web:l=>isOpen(l)&&l.source=='Website'&&l.stage=='New',today:l=>ap(l).includes(td),tom:l=>ap(l).includes(tm),yest:l=>ap(l).includes(yd),week:l=>ap(l).some(d=>d>=ws&&d<=we),
    unassigned:l=>isOpen(l)&&(!l.owner||l.owner=='Unassigned'||!ap(l).length),nores:l=>ap(l).some(d=>d<td)&&!l.result&&isOpen(l),due:l=>isOpen(l)&&l.followup&&l.followup<=td,won:l=>l.stage=='Won',lost:l=>l.stage=='Lost',all:()=>true}[U.f]||(()=>true);
  const val={id:l=>l.id,created:l=>l.created||'',name:l=>l.name,town:l=>addrOf(l),pc:l=>l.homePc||'',tel:telOf,email:mailOf,owner:l=>l.owner||'~',source:l=>l.source,value:l=>+l.value,followup:l=>l.followup||'9999',stage:l=>STAGES.indexOf(l.stage),appt:l=>nextAppt(l)||'9999'}[U.sort]||(l=>l.id);
  return S.leads.filter(l=>V(l)&&(!U.yr||U.yr=='all'||String(l.created||'').startsWith(U.yr))&&(!U.st||(l.stage||'New')==U.st)&&(U.src=='all'||l.source==U.src)&&(U.own=='all'||(l.owner||'Unassigned')==U.own)&&hit(l)).sort((a,b)=>cmp(val(a),val(b))*U.dir||cmp(a.id,b.id))}
/* years of records: pick a year to look back at, or all years */
function yrSel(key,dates){const Y=[...new Set(dates.filter(Boolean).map(d=>String(d).slice(0,4)).filter(y=>/^20\d\d$/.test(y)))].sort().reverse(),cur=UI[key].yr||'all';if(Y.length<2&&cur=='all')return '';
  return `<label class="fl-own">Year <select class="fsel" ${AC('onchange','setUI',key+'.yr','this.value')}><option value="all">All years</option>${Y.map(y=>`<option ${y==cur?'selected':''}>${y}</option>`).join('')}</select></label>`}
function pipeSet(key,s){const U=UI[key];U.st=U.st==s?'':s;if(U.st)U.f='all';U.page=1;render()}
function stgPipe(kind){const key=kind=='lead'?'lead':'ctr',U=UI[key],L=kind=='lead'?[...STG.lead,STG_LOST]:STG.contract,R2=kind=='lead'?S.leads:S.contracts.filter(c=>c.cancelled!='Yes'),f0=L[0].s;
  return `<div class="pipe" role="group" aria-label="Stages">${L.map((x,i)=>{const B=R2.filter(r=>(r.stage||f0)==x.s),on=U.st==x.s;return `<button type="button" class="pp ${on?'on':''} ${x.s=='Lost'?'pl':''} ${x.s=='Won'||x.s=='Complete'?'pw':''}" aria-pressed="${on}" ${A('pipeSet',key,x.s)}><i>${x.s=='Lost'?'×':i+1}</i><span><b>${esc(x.n)}</b><small>${B.length} · ${m0(sum(B,r=>+r.value||0))}</small></span></button>`}).join('')}</div>
   ${U.st?`<p class="pipe-f">Showing only <b>${esc((L.find(x=>x.s==U.st)||{}).n||U.st)}</b> <button type="button" class="mini" ${A('pipeSet',key,U.st)}>Show all stages</button></p>`:''}`}
function stDots(kind,s){const L=STG[kind],i=L.findIndex(x=>x.s==s),x=s=='Lost'?STG_LOST:L[i]||L[0],end=s=='Won'||s=='Complete';return `<span class="sprog ${s=='Lost'?'lost':end?'end':''}" title="${esc(s=='Lost'?'Lost':'Stage '+(Math.max(i,0)+1)+' of '+L.length)}"><span class="sbar" aria-hidden="true">${L.map((y,j)=>`<i class="${s=='Lost'?'':j<i?'d':j==i?'o':''}"></i>`).join('')}</span><b>${esc(x.n)}</b></span>`}
const LVIEWS=[['live','Active Leads'],['due','Next Action Due'],['won','Won, To Convert'],['lost','Lost'],['all','All Leads']];
function vLeads(){const U=UI.lead,td=today(),open=S.leads.filter(l=>!['Won','Lost'].includes(l.stage)),pipe=sum(open,l=>l.value),wt=sum(open,l=>l.value*leadProb(l)/100),due=open.filter(l=>l.followup&&l.followup<=td),A2=allLeads(),won=A2.filter(l=>l.stage=='Won').length,lost=A2.filter(l=>l.stage=='Lost').length,ready=S.leads.filter(l=>l.stage=='Won');
  const L=leadList(),pg=paginate(U,L),cnt=k=>{const f=U.f;U.f=k;const n=leadList().length;U.f=f;return n};
  const sel=(k,arr,all)=>`<select class="fsel" ${AC('onchange','setUI','lead.'+k,'this.value')}><option value="all">${all}</option>${arr.map(x=>`<option ${U[k]==x?'selected':''}>${esc(x)}</option>`).join('')}</select>`;
  const tog=`<div class="seg2"><button class="${U.v=='list'?'on':''}" ${A('setUI','lead.v','list')}>List</button><button class="${U.v=='board'?'on':''}" ${A('setUI','lead.v','board')}>Board</button></div>`;
  const list=`<div class="tw"><table class="ptb abt"><thead><tr>${thS('lead','id','Lead No')}${thS('lead','name','Customer')}${thS('lead','town','Address','c-md')}${thS('lead','tel','Contact','c-sm')}${thS('lead','owner','Salesperson','c-md')}${thS('lead','source','Source','c-xl')}${thS('lead','appt','Next Visit','c-sm')}${thS('lead','value','Value','n')}<th class="ac"><span class="srt" ${A('sortBy','lead','stage')} style="cursor:pointer">Stage${U.sort=='stage'?`<span class="ar">${U.dir>0?'▲':'▼'}</span>`:''}</span></th></tr></thead><tbody>
   ${pg.rows.map(l=>`<tr ${A('openLead',l.id)} class="clk-r"><td><b class="lref">${esc(l.id)}</b>${l.created?`<small class="sub">${fd(l.created)}</small>`:''}</td><td><b>${esc(([l.title,l.name].filter(Boolean).join(' ')))}</b>${l.company?`<small class="sub">${esc(l.company)}</small>`:''}</td><td class="c-md"><span class="cl2">${esc(addrOf(l)||'-')}</span>${l.homePc?`<small class="sub">${esc(l.homePc)}</small>`:''}</td><td class="c-sm">${esc(telOf(l)||'-')}${mailOf(l)?`<small class="sub nocap">${esc(mailOf(l))}</small>`:''}</td><td class="c-md">${esc(l.owner||'Unassigned')}</td><td class="c-xl">${esc(l.source||'-')}</td><td class="c-sm">${nextAppt(l)?fd(nextAppt(l)):'-'}</td><td class="n">${m0(l.value)}</td><td class="ac" onclick="event.stopPropagation()"><div class="acts r stc">${stDots('lead',l.stage)}${l.stage!='Lost'&&canSee('contracts')?`<button class="mini ${l.stage=='Won'?'pri':''}" ${A('convertLead',l.id)}>Convert</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="9" class="empty">'+emptyArt('survey','No leads in this view.')+'</td></tr>'}</tbody></table></div>${pagerH('lead',pg,'leads')}`;
  const board=`<div class="kan">${STAGES.map(s=>{const B=L.filter(l=>l.stage==s);return `<div class="col"><div class="colh"><b>${esc(s)}</b><span>${B.length} leads, ${m0(sum(B,l=>l.value))}</span></div>${B.map(l=>`<div class="lc"><div class="lt"><b ${A('openLead',l.id)} title="Open lead">${esc(l.name)} <small class="muted">${esc(l.id)}</small></b><span>${m0(l.value)}</span></div><p>${esc(l.product)}</p><p class="muted">${esc(l.town||'')}, via ${esc(l.source)}</p><p class="muted">${esc(l.next||'No next action set')}</p><div class="lb"><button class="mini" aria-label="Move back" ${A('mvLead',l.id,-1)}>&lsaquo;</button><button class="mini" aria-label="Move forward" ${A('mvLead',l.id,1)}>&rsaquo;</button><button class="mini" ${A('openLead',l.id)}>Open</button>${s=='Won'&&canSee('contracts')?`<button class="mini pri" ${A('convertLead',l.id)}>Convert</button>`:''}</div></div>`).join('')||'<p class="empty">Nothing here.</p>'}</div>`}).join('')}</div>`;
  return `<div class="head"><div><h1>Leads</h1><span class="muted">${esc((LVIEWS.find(x=>x[0]==U.f)||['','All'])[1])}: ${L.length} records</span></div><div class="tools"><button class="mini" onclick="contactList('lead')">Contact list</button><button class="mini" onclick="leadCsv()">Export CSV</button><button class="btn" onclick="editLead()">New lead</button></div></div>
  <div class="subbar"><span class="sb-l">Show</span><div class="views">${LVIEWS.map(([k,t])=>`<button class="chip ${U.f==k?'on':''}" ${A('setUI','lead.f',k)}>${esc(t)} <i>${cnt(k)}</i></button>`).join('')}<span class="vs"></span><label class="fl-own">Salesperson ${sel('own',OWNERS(),'Everyone')}</label>${yrSel('lead',S.leads.map(l=>l.created))}</div><span class="sb-sp"></span>${tog}</div>
  ${stgPipe('lead')}
  <div class="kpis"><button class="kpi" ${A('setUI','lead.f','live')}><small>Open Leads</small><b>${open.length}</b></button><div class="kpi"><small>Pipeline Value</small><b>${m0(pipe)}</b></div><div class="kpi"><small>Weighted Pipeline</small><b>${m0(wt)}</b><span class="ksub">Value x win chance</span></div><button class="kpi ${due.length?'warn':''}" ${A('setUI','lead.f','due')}><small>Next Action Due</small><b>${due.length}</b></button><button class="kpi ${ready.length?'warn':''}" ${A('setUI','lead.f','won')}><small>Won, To Convert</small><b>${ready.length}</b></button><div class="kpi"><small>Conversion Rate</small><b>${pc(won,won+lost)}</b><span class="ksub">${won} won, ${lost} lost</span></div></div>
  ${U.v=='board'?board:list}`}

function ctrList(){const U=UI.ctr,[ws,we]=weekRange(),nws=iso(new Date(new Date(ws+'T00:00').getTime()+7*864e5)),nwe=iso(new Date(new Date(we+'T00:00').getTime()+7*864e5));
  const dd=c=>c.delDate||'',cur=c=>c.stage!='Complete'&&c.cancelled!='Yes';
  const V={cur,delw:c=>dd(c)>=ws&&dd(c)<=we,deln:c=>dd(c)>=nws&&dd(c)<=nwe,bal:c=>c.value-c.paid>0,uninv:c=>cur(c)&&c.invoiced!='Yes',sf:c=>cur(c)&&c.supplyOnly!='Yes',so:c=>cur(c)&&c.supplyOnly=='Yes',hold:c=>c.onHold=='Yes',fensa:fensaDue,comp:c=>c.stage=='Complete',all:()=>true}[U.f]||(()=>true);
  const val={id:c=>c.id,name:c=>c.name,addr:c=>addrOf(c),sold:c=>c.soldBy||'',office:c=>c.officeRef||'',site:siteOf,stage:c=>CSTAGES.indexOf(c.stage),fit:c=>c.fit||'9999',value:c=>+c.value,bal:c=>c.value-c.paid}[U.sort]||(c=>c.id);
  return S.contracts.filter(c=>V(c)&&(!U.yr||U.yr=='all'||String(c.cdate||'').startsWith(U.yr))&&(!U.st||(c.stage||'Deposit due')==U.st)&&hit(c)).sort((a,b)=>cmp(val(a),val(b))*U.dir||cmp(a.id,b.id))}
const CVIEWS=[['cur','All Current'],['delw','Deliveries This Week'],['deln','Deliveries Next Week'],['bal','Balances Outstanding'],['uninv','Uninvoiced'],['sf','Supply & Fit'],['so','Supply Only'],['hold','On Hold'],['fensa','FENSA To Notify'],['comp','Complete'],['all','All']];
function vContracts(){const U=UI.ctr,L=ctrList(),pg=paginate(U,L),tv=sum(L,c=>c.value),bal=sum(L,c=>c.value-c.paid),cnt=k=>{const f=U.f;U.f=k;const n=ctrList().length;U.f=f;return n};
  const tog=`<div class="seg2"><button class="${U.v=='list'?'on':''}" ${A('setUI','ctr.v','list')}>List</button><button class="${U.v=='board'?'on':''}" ${A('setUI','ctr.v','board')}>Board</button></div>`;
  const board=`<div class="kan" style="grid-template-columns:repeat(${CSTAGES.length},minmax(11rem,1fr))">${CSTAGES.map(s=>{const B=L.filter(c=>c.stage==s);return `<div class="col"><div class="colh"><b>${esc(s)}</b><span>${B.length}, ${m0(sum(B,c=>c.value))}</span></div>${B.map(c=>`<div class="lc"><div class="lt"><b ${A('openContract',c.id)}>${esc(c.name)} <small class="muted">${esc(c.id)}</small></b><span>${m0(c.value)}</span></div><p>${esc(c.product)}</p><p class="muted">${esc(c.town||'')}${c.fit?', fit '+fd(c.fit):''}</p>${c.value-c.paid>0?`<p class="muted">Balance ${m0(c.value-c.paid)}</p>`:'<p><span class="tag g">Paid</span></p>'}</div>`).join('')||'<p class="empty">Nothing here.</p>'}</div>`}).join('')}</div>`;
  const list=`<div class="tw"><table class="ptb abt ctb"><thead><tr>${thS('ctr','id','Contract No')}${thS('ctr','name','Cust Name')}${thS('ctr','addr','Address','c-md')}${thS('ctr','sold','Sold By','c-sm')}${thS('ctr','office','Office Ref','c-xl')}${thS('ctr','site','Site Address','c-xl')}${thS('ctr','fit','Fit Date','c-sm')}${thS('ctr','value','Value','n')}${thS('ctr','bal','Balance','n c-sm')}<th class="ac"><span class="srt" ${A('sortBy','ctr','stage')} style="cursor:pointer">Stage${U.sort=='stage'?`<span class="ar">${U.dir>0?'▲':'▼'}</span>`:''}</span></th></tr></thead><tbody>
   ${pg.rows.map(c=>`<tr ${A('openContract',c.id)} class="clk-r"><td><b class="lref">${esc(c.id)}</b>${c.lead?`<br><span class="muted" style="font-size:.7rem">From ${esc(c.lead)}</span>`:''}</td><td><b>${esc(c.name)}</b>${c.flash?`<br><span class="flash">${esc(c.flash)}</span>`:''}</td><td class="c-md wrapc">${esc(addrOf(c)||'-')}</td><td class="c-sm">${esc(c.soldBy||'-')}</td><td class="c-xl">${esc(c.officeRef||'')}</td><td class="c-xl wrapc">${esc(siteOf(c)||'-')}</td><td class="c-sm">${fd(c.fit)}</td><td class="n">${m0(c.value)}</td><td class="n c-sm">${m0(c.value-c.paid)}</td><td class="ac"><div class="acts r stc">${stDots('contract',c.stage)}</div></td></tr>`).join('')||'<tr><td colspan="10" class="empty">'+emptyArt('files','No contracts in this view.')+'</td></tr>'}</tbody></table></div>${pagerH('ctr',pg,'contracts')}`;
  return `<div class="head"><div><h1>Contracts</h1><span class="muted">${esc((CVIEWS.find(x=>x[0]==U.f)||['','All'])[1])}: ${L.length} records, ${m0(tv)} total, ${m0(bal)} to collect</span></div><div class="tools"><button class="mini" onclick="contactList('contract')">Contact list</button><button class="btn" onclick="editContract()">New contract</button></div></div>
  <div class="subbar"><span class="sb-l">Show</span><div class="views">${CVIEWS.map(([k,t])=>`<button class="chip ${U.f==k?'on':''}" ${A('setUI','ctr.f',k)}>${esc(t)} <i>${cnt(k)}</i></button>`).join('')}<span class="vs"></span>${yrSel('ctr',S.contracts.map(c=>c.cdate))}</div><span class="sb-sp"></span>${tog}</div>
  ${stgPipe('contract')}${ckpi(L)}${U.v=='board'?board:list}`}
