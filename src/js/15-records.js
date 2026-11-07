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
  {k:'title',l:'Title',t:'select',o:['','Mr','Mrs','Miss','Ms','Mr & Mrs','Dr','Company'],req:1,g:'Customer'},
  {k:'name',l:'Customer / contact name',req:1,g:'Customer'},{k:'salutation',adv:1,l:'Letters start "Dear ..."',g:'Customer'},{k:'company',adv:1,l:'Company (if a business)',g:'Customer'},
  {k:'prefContact',l:'Best way to contact them',t:'select',o:['','Mobile','Home phone','Work phone','Email','Post'],g:'Customer'},
  {k:'mob1',l:'Mobile',t:'tel',max:30,g:'Phone Numbers',any:1},{k:'mob2',nx:'mob1',l:'Mobile 2',t:'tel',max:30,g:'Phone Numbers'},{k:'mob3',nx:'mob2',l:'Mobile 3',t:'tel',max:30,g:'Phone Numbers'},
  {k:'home1',l:'Home phone',t:'tel',max:30,g:'Phone Numbers',any:1},{k:'home2',nx:'home1',l:'Home phone 2',t:'tel',max:30,g:'Phone Numbers'},{k:'home3',nx:'home2',l:'Home phone 3',t:'tel',max:30,g:'Phone Numbers'},
  {k:'work',l:'Work phone',t:'tel',max:30,g:'Phone Numbers',any:1},{k:'work2',nx:'work',l:'Work phone 2',t:'tel',max:30,g:'Phone Numbers'},{k:'work3',nx:'work2',l:'Work phone 3',t:'tel',max:30,g:'Phone Numbers'},
  {k:'email1',l:'Email',t:'email',req:1,g:'Email'},{k:'email2',nx:'email1',l:'Email 2',t:'email',g:'Email'},{k:'email3',nx:'email2',l:'Email 3',t:'email',g:'Email'},
  {k:'addrType',l:'Address type',t:'select',o:['','Home','Business'],req:1,g:'Home Address'},{k:'homeAddr',l:'Address line 1',req:1,max:120,g:'Home Address'},{k:'homeAddr2',l:'Address line 2',max:120,g:'Home Address'},
  {k:'town',l:'Town / city',req:1,max:60,g:'Home Address'},{k:'county',adv:1,l:'County',max:60,g:'Home Address'},{k:'homePc',l:'Postcode',req:1,max:10,g:'Home Address'},
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
  if(f.ro)c=`<input id="${id}" value="${esc(val)}" readonly tabindex="-1">`;
  else if(f.t=='select')c=`<select id="${id}">${(val!==''&&!f.o.map(String).includes(String(val))?[val,...f.o]:f.o).map(o=>`<option value="${esc(o)}" ${String(o)==String(val)?'selected':''}>${esc(o||'-')}</option>`).join('')}</select>`;
  else if(f.t=='area')c=`<textarea id="${id}" rows="${f.rows||2}" maxlength="${f.max||2000}">${esc(val)}</textarea>`;
  else c=`<input id="${id}" type="${f.t=='number'?'number':f.t=='date'?'date':f.t=='time'?'time':f.t=='email'?'email':f.t=='tel'?'tel':'text'}" ${f.t=='number'?'step="any" min="0" inputmode="decimal"':`maxlength="${f.max||120}"`} value="${esc(val)}" ${f.list?`list="${f.list}"`:''} autocomplete="off">`;
  const hid=(f.dep&&(v[f.dep]||'Same as home')!='Different')||nxHid(f,v);
  if(['invSame','siteSame'].includes(f.k))c=c.replace('<select ','<select onchange="recDep(this)" ');
  return `<label class="rf ${f.t=='area'?'ta':''}" ${f.dep?`data-dep="${f.dep}"`:''} ${f.nx?`data-nx="${f.nx}"`:''} ${hid?'hidden':''}><span>${esc(f.l)}${f.req?' *':''}</span>${c}</label>`}
/* each group reads as a plain question; fields marked adv fold away under "More details" */
const GQ={'Customer':'Who Is The Customer?','Phone Numbers':'How Can We Phone Them?','Email':'Their Email Address','Home Address':'Where Do They Live?','Invoice Address':'Where Should The Invoice Go?','Site Address':'Where Is The Work Being Done?',
  'Lead':'About This Lead','Source And Interest':'How They Found Us And What They Want','Result':'What Happens Next','Next Visit':'The Next Visit'};
const DEFV={invSame:'Same as home',siteSame:'Same as home'};
const fval=(f,v)=>String(v[f.k]??DEFV[f.k]??'').trim();
/* a section is finished when its required boxes are filled (and, for phones, at least one number) */
function grpDone(fs,v){const vis=fs.filter(f=>!(f.dep&&(v[f.dep]||'Same as home')!='Different'));
  if(!vis.some(f=>f.req||f.any||DEFV[f.k]))return false;
  return vis.filter(f=>f.req).every(f=>fval(f,v))&&(!vis.some(f=>f.any)||vis.some(f=>f.any&&fval(f,v)))&&vis.some(f=>fval(f,v))}
const grpSum=(fs,v)=>fs.filter(f=>!f.adv&&!(f.dep&&(v[f.dep]||'Same as home')!='Different')).map(f=>fval(f,v)).filter(Boolean).slice(0,4).join(' · ');
const grpH=(t,fs,v)=>{const main=fs.filter(f=>!f.adv),adv=fs.filter(f=>f.adv),open=adv.some(f=>String(v[f.k]??'').trim()),shut=RW&&!RW.isNew&&grpDone(fs,v);
  return `<section class="rg fg ${shut?'shut done':''}"><h4><button type="button" class="rg-t" onclick="grpToggle(this)" aria-expanded="${!shut}">${shut?'<i class="rg-ok" aria-hidden="true">&#10003;</i>':''}<span>${esc(GQ[t]||t)}</span>${shut?`<small class="rg-sum nocap">${esc(grpSum(fs,v))}</small><em class="rg-ch">Change</em>`:''}</button>${fs.some(f=>f.any)&&!shut?'<small class="anyh">Fill in at least one number *</small>':''}</h4>${main.map(f=>rfH(f,v)).join('')}${adv.length?`<details class="rmore"${open?' open':''}><summary>More details <span>(${adv.length})</span></summary><div class="rmore-b">${adv.map(f=>rfH(f,v)).join('')}</div></details>`:''}</section>`};
function grpToggle(b){const g=b.closest('.rg');if(!g.classList.contains('done'))return;const s=g.classList.toggle('shut');b.setAttribute('aria-expanded',!s);if(!s){const f=g.querySelector('input:not([readonly]),select,textarea');if(f)f.focus()}}
const byGroup=(fs,v)=>{const g={};fs.forEach(f=>(g[f.g]=g[f.g]||[]).push(f));return Object.entries(g).map(([t,x])=>grpH(t,x,v)).join('')};
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
  const W=RW={kind,id:r?r.id:null,isNew:!r,v:r?JSON.parse(JSON.stringify(r)):D.blank(),list:D.order()};
  W.v.log=W.v.log||[];W.v.photos=(W.v.photos||[]).filter(SAFE.img);tmp=W.v.photos;tmpDraw=()=>{recThumbs();recRail()};
  const ord=RSTEPS[kind],tabs=D.tabs(W).sort((a,b)=>ord.indexOf(a.k)-ord.indexOf(b.k)),tab=tabs.some(t=>t.k==RTAB[kind])?RTAB[kind]:tabs[0].k,pos=W.list.indexOf(W.id);W.steps=tabs.map(t=>t.k);
  const nm=k=>(RNAME[kind]||{})[k]||tabs.find(t=>t.k==k).t,hint=k=>{const h=RHINT[k];return typeof h=='object'?h[kind]:h||''};
  openModal(`<div class="rw">
   <div class="rw-bar"><button class="rb1 sv" onclick="recSave(false)">${svg('M5 12l5 5L20 7')}Save</button>${W.isNew?'':D.actions(W)}<span class="rw-sp"></span>
    ${W.isNew||W.list.length<2?'':`<button class="rb1" title="Save this one and open the previous ${esc(D.label.toLowerCase())}" ${A('recNav',-1)} ${pos<=0?'disabled':''}>&lsaquo; Previous</button><span class="rw-pos">${esc(D.label)} ${pos+1} of ${W.list.length}</span><button class="rb1" title="Save this one and open the next ${esc(D.label.toLowerCase())}" ${A('recNav',1)} ${pos>=W.list.length-1?'disabled':''}>Next &rsaquo;</button>`}
    <button class="rb1 cl" onclick="recClose()">${svg('M6 6l12 12M18 6L6 18')}Close</button></div>
   <div class="rw-h"><div><small>${esc(D.label)}${W.isNew?' · New':''}</small><h2>${esc(D.heading(W))}</h2>${W.isNew?'':`<div class="rw-hc">${telOf(W.v)?`<a class="nocap" href="tel:${esc(telOf(W.v).replace(/[^\d+]/g,''))}">${svg('M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2')}${esc(telOf(W.v))}</a>`:''}${mailOf(W.v)?`<a class="nocap" href="mailto:${esc(mailOf(W.v))}">${svg('M4 6h16v12H4zM4 7l8 6 8-6')}${esc(mailOf(W.v))}</a>`:''}${W.v.town?`<span>${svg('M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z')}${esc(W.v.town)}</span>`:''}</div>`}</div><div class="rw-hk">${D.headStats(W)}</div></div>
   <div class="rw-x"><aside class="rw-rail"><div class="rw-cust" id="rwCust"></div><div class="rw-prog"><span id="rwPct"></span><i><b id="rwBar"></b></i></div>
     <ol class="rw-steps">${tabs.map((t,i)=>`<li><button type="button" data-t="${t.k}" class="${t.k==tab?'on':''}" ${A('recTab',t.k)}><i>${i+1}</i><span><b>${esc(nm(t.k))}</b><small data-st="${t.k}"></small></span></button></li>`).join('')}</ol></aside>
    <div class="rw-main"><div class="rw-b">${tabs.map((t,i)=>`<div class="rw-p ${t.k==tab?'on':''}" data-t="${t.k}" role="tabpanel"><div class="rw-sh"><small>Step ${i+1} of ${tabs.length}</small><h3>${esc(nm(t.k))}</h3><p>${esc(hint(t.k))}</p>${t.k=='customer'||t.k=='details'?'<p class="rw-req">Boxes marked * must be filled in.</p>':''}</div>${t.h(W)}</div>`).join('')}</div>
     <div class="rw-foot"><button type="button" class="btn ghost" id="rwPrev" onclick="recStep(-1)"></button><span class="rw-sp"></span><button type="button" class="btn ghost" onclick="recSave(false)">Save</button><button type="button" class="btn" id="rwNext" onclick="recStep(1)"></button></div></div></div></div>`,'full');
  W.nm=nm;recThumbs();recDocs();recFoot();recRail();
  if(!W.isNew){const todo=W.steps.find(k=>{const b=$(`#mbox .rw-steps button[data-t="${k}"]`);return b&&!b.classList.contains('ok')&&!REC_OPTIONAL.includes(k)});recTab(todo||W.steps[0])}$('#mbox .rw-x').addEventListener('input',()=>{RW.dirty=1;clearTimeout(recRail.t);recRail.t=setTimeout(recRail,250)});$('#mbox .rw-x').addEventListener('change',e=>{RW.dirty=1;const c=e.target;if(c.classList&&c.classList.contains('rck')){const w=c.parentElement.querySelector('.ck-w');if(w)w.textContent=c.checked?'Done today by '+USER:''}recRail()});
  drawThumbs()}
function recTab(k){RTAB[RW.kind]=k;$$('#mbox .rw-steps button').forEach(b=>b.classList.toggle('on',b.dataset.t==k));$$('#mbox .rw-p').forEach(p=>p.classList.toggle('on',p.dataset.t==k));$('#mbox .rw-b').scrollTop=0;recFoot();recRail();const b=$(`#mbox .rw-steps button[data-t="${k}"]`);if(b&&b.scrollIntoView)b.scrollIntoView({block:'nearest',inline:'nearest'})}
function recStep(d){const S2=RW.steps,i=S2.indexOf(RTAB[RW.kind]);if(d>0&&i==S2.length-1){recSave(true);return}const n=S2[i+d];if(n)recTab(n)}
function recFoot(){const S2=RW.steps,i=S2.indexOf(RTAB[RW.kind]),p=$('#rwPrev'),n=$('#rwNext');if(!p)return;
  p.hidden=i<=0;p.innerHTML=i>0?'&larr; Back: '+esc(RW.nm(S2[i-1])):'';n.innerHTML=i<S2.length-1?'Next: '+esc(RW.nm(S2[i+1]))+' &rarr;':'Save and finish';n.classList.toggle('green',i==S2.length-1)}
/* progress for each step, worked out from what is on screen now */
function recRail(){if(!RW||!$('#rwCust'))return;const g=k=>{const e=$('#f_'+k);return String(e?e.value:(RW.v[k]??'')).trim()},n=s=>$$(`#mbox ${s}`).length,v=RW.v;
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
  const ckt=$('#mbox .ck-top');if(ckt){ckt.querySelector(':scope>b').textContent=ckd+' of '+ck.length+' done';ckt.querySelector('i b').style.width=Math.round(100*ckd/(ck.length||1))+'%'}
  let done=0;RW.steps.forEach(k=>{const s=ST[k]||['',false],el=$(`#mbox small[data-st="${k}"]`);if(el)el.textContent=s[0];const b=$(`#mbox .rw-steps button[data-t="${k}"]`);if(b)b.classList.toggle('ok',!!s[1]);if(s[1])done++});
  const pc=Math.round(100*done/RW.steps.length);$('#rwPct').textContent=done+' of '+RW.steps.length+' steps complete';$('#rwBar').style.width=pc+'%';
  $('#rwCust').innerHTML=`<b>${esc([g('title'),g('name')].filter(Boolean).join(' ')||'New customer')}</b>${g('company')?`<span>${esc(g('company'))}</span>`:''}${tel?`<a class="nocap" href="tel:${esc(tel.replace(/[^\\d+]/g,''))}">${esc(tel)}</a>`:'<span class="muted">No phone yet</span>'}${em?`<a class="nocap" href="mailto:${esc(em)}">${esc(em)}</a>`:''}${ad?`<span class="muted">${esc(ad)}</span>`:''}`}
function recRedraw(t){const D=REC[RW.kind],x=D.tabs(RW).find(z=>z.k==t),p=$(`#mbox .rw-p[data-t="${t}"]`);if(x&&p)p.innerHTML=x.h(RW);recRail()}
function recRead(){const D=REC[RW.kind],o=readFields(D.fields(RW));if(!o)return null;
  const at={...(RW.v.chkAt||{})};$$('#mbox .rck').forEach(c=>{const k=c.dataset.k;(o.chk=o.chk||{})[k]=c.checked;if(c.checked&&!at[k])at[k]={d:today(),by:USER};if(!c.checked)delete at[k]});o.chkAt=at;
  o.phTags=(RW.v.phTags||[]).slice(0,MAX_PHOTOS);if($('#mbox .pl'))o.lines=readLines();if($('#mbox .op')||RW.v.openings)o.openings=$('#mbox .op')?readOps():RW.v.openings;o.photos=tmp.slice(0,MAX_PHOTOS);return o}
function recSave(close){const D=REC[RW.kind],o=recRead();if(!o){const a=document.activeElement,p=a&&a.closest&&a.closest('.rw-p');if(p&&!p.classList.contains('on')){recTab(p.dataset.t);setTimeout(()=>a.focus(),30)}return false}const e=D.check&&D.check(RW,o);if(e){toast(e.replace(/ \(.*step\)$/,''));if(/Customer step/.test(e)){recTab('customer');if(/phone/i.test(e)){const f=$('#f_mob1')||$('#f_home1');if(f)fieldErr(f,'Fill in at least one phone number')}else if(/name/i.test(e)){const f=$('#f_name');if(f)fieldErr(f,'Type the customer name')}}return false}
  const id=D.save(RW,o);store();if(close){closeModal();render()}else{render();recOpen(RW.kind,id)}toast('Saved');return true}
function recNav(d){const L=RW.list,i=L.indexOf(RW.id),n=d=='first'?0:d=='last'?L.length-1:i+d;if(n<0||n>=L.length)return;const kind=RW.kind;if(RW.dirty&&!recSave(false))return;recOpen(kind,L[n])}
/* small inline lists inside a record */
function recAdd(list,fs,tab){const o={};for(const k of fs){const e=$('#ra_'+k);o[k]=e?SAFE.text(e.value,300):''}if(!Object.values(o).some(Boolean)){toast('Fill in the details first');return}
  RW.v[list]=RW.v[list]||[];RW.v[list].unshift({...o,by:USER,at:today()});RW.dirty=1;recRedraw(tab)}
function recDel(list,i,tab){RW.v[list].splice(i,1);RW.dirty=1;recRedraw(tab)}
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
function recDocDel(id){const f=(RW.docs||[]).find(x=>x.id==id);if(!f)return;const w=RW;if(!confirm('Remove '+f.name+'? It is deleted from this device.'))return;fx('readwrite',s=>s.delete(id)).then(()=>{audit('Document removed',recRef(),f.name);store();recDocs()})}
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
  {k:'takenBy',adv:1,l:'Taken by',t:'select',o:staffNames(),g:'Lead'},{k:'branch',l:'Sales area / branch',t:'select',o:['',...BRANCHES],g:'Lead'},{k:'owner',l:'Salesperson',t:'select',o:[...OWNERS(),RANDOM_SP],g:'Lead'},
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
  else if(how=='ics'){const p=n=>String(n).padStart(2,'0'),d=a.d.replace(/-/g,''),tm=(a.tm||'09:00').replace(':','')+'00',e=new Date(a.d+'T'+(a.tm||'09:00'));e.setHours(e.getHours()+1);const end=d+'T'+p(e.getHours())+p(e.getMinutes())+'00';
    const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Broadland Windows//CRM//EN','BEGIN:VEVENT','UID:'+uuid()+'@broadland-crm','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z','DTSTART:'+d+'T'+tm,'DTEND:'+end,'SUMMARY:'+(a.ty||'Appointment')+': '+c.nm,'LOCATION:'+c.addr.replace(/[,;]/g,'\\$&'),'DESCRIPTION:'+(a.w?'With '+a.w:''),'END:VEVENT','END:VCALENDAR'].join('\r\n');
    download('appointment-'+a.d+'.ics',new Blob([ics],{type:'text/calendar'}))}
  if(how!='copy'){(RW.v.log=RW.v.log||[]).unshift({d:today(),t:how=='ics'?'Calendar file made':how=='sms'?'Text reminder':'Email reminder',n:(a.ty||'')+' '+apptWhen(a),by:USER});RW.dirty=1;recRedraw('notes')}}
const apptBtns=i=>`<div class="apb"><button type="button" class="mini pri" ${A('apptSend',i,'email')}>Email reminder</button><button type="button" class="mini" ${A('apptSend',i,'sms')}>Text reminder</button><button type="button" class="mini" ${A('apptSend',i,'ics')}>Add to calendar</button><button type="button" class="mini" ${A('apptSend',i,'copy')}>Copy</button></div>`;
const apptTab=W=>`<div class="rcols"><section class="rg"><h4>Next Visit</h4>${APPTF.map(f=>rfH(f,W.v)).join('')}${apptBtns(-1)}</section>
  <section class="rg"><h4>Other Visits And Calls</h4><div class="radd"><select id="ra_ty">${ATYPES.map(x=>`<option>${x}</option>`).join('')}</select><input id="ra_d" type="date"><input id="ra_tm" type="time"><select id="ra_w">${staffNames().filter(Boolean).map(x=>`<option>${esc(x)}</option>`).join('')}</select><button class="mini pri" ${A('recAdd','appts',['ty','d','tm','w'],'appts')}>Book</button></div>
  ${(W.v.appts||[]).map((a,i)=>`<div class="apc"><div class="apc-h"><span class="apc-d"><b>${a.d?new Date(a.d+'T00:00').getDate():'-'}</b><small>${a.d?new Date(a.d+'T00:00').toLocaleDateString('en-GB',{month:'short'}):''}</small></span><span><b>${esc(a.ty||'Visit')}</b><br><span class="muted">${a.d?esc(apptWhen(a)):'No date'}${a.w?' · '+esc(a.w):''}</span></span><button class="mini del" ${A('recDel','appts',i,'appts')} aria-label="Remove">&times;</button></div>${apptBtns(i)}</div>`).join('')||emptyArt('holiday','Nothing else booked yet.')}</section></div>`;
const nextAppt=l=>[l.apptDate,...(l.appts||[]).map(a=>a.d)].filter(Boolean).sort().find(d=>d>=today())||'';
REC.lead={label:'Lead',
  get:id=>S.leads.find(l=>l.id==id),order:()=>leadList().map(l=>l.id),
  blank:()=>({id:nextLeadId(),created:today(),stage:'New',source:'Website',owner:USER,takenBy:USER,invSame:'Same as home',siteSame:'Same as home',addrType:'Home',log:[],appts:[],chk:{}}),
  heading:W=>`${W.v.id}  ${[W.v.title,W.v.name].filter(Boolean).join(' ')||'New lead'}${W.v.company?' · '+W.v.company:''}`,
  headStats:W=>`${leadTag(W.v.stage||'New')}<span><small>Net Value</small><b>${m0(W.v.value)}</b></span><span><small>Next Action</small><b>${W.v.followup?fd(W.v.followup):'-'}</b></span>`,
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
  save:(W,o)=>{const isNew=W.isNew,l=isNew?{id:nextLeadId(),log:[{d:today(),t:'Lead created',by:USER}]}:S.leads.find(x=>x.id==W.id);if(!l)return;
    const a=l.stage;if(o.prob===0&&!($('#f_prob').value||'').trim())o.prob='';const nid2=ISOWN()&&o.id&&/^L\d{4}$/.test(o.id)&&!S.leads.some(x=>x!==l&&x.id==o.id)?o.id:null;delete o.id;if(nid2&&nid2!=l.id){audit('Lead number changed',l.id,'to '+nid2);l.id=nid2}
    Object.assign(l,o,{log:W.v.log,appts:W.v.appts||[]});if(l.stage=='Won')l.prob=100;else if(l.stage=='Lost')l.prob=0;if(!isNew&&a!=o.stage)l.log.unshift({d:today(),t:'Stage: '+a+' to '+o.stage,by:USER});
    if(isNew){l.log=[...W.v.log,{d:today(),t:'Lead created',by:USER}];S.leads.push(l)}custCompat(l);audit(isNew?'Lead added':'Lead edited',l.id,l.name);return l.id}};
function recConvert(){if(!recSave(false))return;const id=RW.id;closeModal();convertLead(id)}

/* ======================= CONTRACT record ======================= */
const CDETF=W=>[
  {k:'id',l:'Contract number',ro:1,g:'Contract'},{k:'cdate',l:'Contract date',t:'date',g:'Contract'},{k:'officeRef',l:'Office ref 1',g:'Contract'},{k:'officeRef2',l:'Office ref 2',g:'Contract'},
  {k:'contractType',l:'Contract type',t:'select',o:CTYPES,g:'Contract'},{k:'supplyOnly',l:'Supply only',t:'select',o:YN,g:'Contract'},{k:'stage',l:'Stage',t:'select',o:CSTAGES,g:'Contract'},
  {k:'onHold',l:'On hold',t:'select',o:YN,g:'Contract'},{k:'cancelled',l:'Cancelled',t:'select',o:YN,g:'Contract'},{k:'product',l:'Work / products summary',t:'area',max:300,g:'Contract'},{k:'flash',l:'Flash note (shows in red)',max:160,g:'Contract'},
  {k:'lead',l:'Lead number',ro:1,g:'Sales Information'},{k:'salesArea',l:'Sales area',t:'select',o:['',...BRANCHES],g:'Sales Information'},{k:'soldBy',l:'Salesperson',t:'select',o:[...OWNERS(),RANDOM_SP],g:'Sales Information'},
  {k:'source',l:'Lead source',t:'select',o:['',...SOURCES],g:'Sales Information'},{k:'subSource',l:'Sub source',g:'Sales Information'},{k:'createdBy',l:'Created by',ro:1,g:'Sales Information'},{k:'approvals',l:'Contract approvals',g:'Sales Information'}];
const CFINF=()=>[{k:'value',l:'Contract value (£)',t:'number',g:'Money'},{k:'paid',l:'Paid so far (£)',t:'number',g:'Money'},...(ISADM()?[{k:'cost',l:'Job cost (£)',t:'number',g:'Money'}]:[]),{k:'payMethod',l:'Payment method',t:'select',o:['','Cash','Bank transfer','Card','Finance','Cheque'],g:'Money'},{k:'invoiced',l:'Invoiced',t:'select',o:YN,g:'Invoice'},{k:'invoiceNo',l:'Invoice number',g:'Invoice'},{k:'invoiceDate',l:'Invoice date',t:'date',g:'Invoice'}];
const CFITF=()=>[{k:'survey',l:'Survey date',t:'date',g:'Dates'},{k:'order',l:'Order date',t:'date',g:'Dates'},{k:'delDate',l:'Delivery date',t:'date',g:'Dates'},{k:'fit',l:'Fit date',t:'date',g:'Dates'},
  {k:'fitter',l:'Fitter / team',t:'select',o:FITL(),g:'Team'},{k:'installMgr',l:'Installation manager',t:'select',o:staffNames(),g:'Team'},{k:'surveyor',l:'Assigned surveyor',t:'select',o:staffNames(),g:'Team'},{k:'fitNotes',l:'Fitting notes',t:'area',max:600,g:'Team'},
  {k:'winCount',l:'Window count',t:'number',dp:0,g:'Info For FENSA'},{k:'doorCount',l:'Door count',t:'number',dp:0,g:'Info For FENSA'},{k:'conservatory',l:'Conservatory',t:'select',o:YN,g:'Info For FENSA'},{k:'roofline',l:'Roofline',t:'select',o:YN,g:'Info For FENSA'},{k:'fensaExported',l:'Exported to FENSA',t:'select',o:YN,g:'Info For FENSA'},{k:'fensaNA',l:'FENSA not required',t:'select',o:YN,g:'Info For FENSA'}];
REC.contract={label:'Contract',
  get:id=>S.contracts.find(c=>c.id==id),order:()=>ctrList().map(c=>c.id),
  blank:()=>({id:nid('C',S.contracts),cdate:today(),stage:'Deposit due',fitter:FIT[0],contractType:CTYPES[0],soldBy:USER,createdBy:USER,invSame:'Same as home',siteSame:'Same as home',addrType:'Home',pay:[],chk:{},lines:[],log:[]}),
  heading:W=>`${W.v.id}  ${[W.v.title,W.v.name].filter(Boolean).join(' ')||'New contract'}${W.v.company?' · '+W.v.company:''}`,
  headStats:W=>`${stTag(W.v.stage||'Deposit due')}${W.v.flash?`<span class="flash">${esc(W.v.flash)}</span>`:''}<span><small>Value</small><b>${m0(W.v.value)}</b></span><span><small>Balance</small><b>${m0((+W.v.value||0)-(+W.v.paid||0))}</b></span><span><small>Fit</small><b>${W.v.fit?fd(W.v.fit):'-'}</b></span>`,
  actions:W=>`<button class="rb1" ${A('reportContract',W.id)}>${svg(IC.reports)}Reports</button><button class="rb1" ${A('recCall')}>${svg(IC.service)}Service call</button>${ISOWN()?`<button class="rb1 dl" ${A('del','contracts',W.id)}>${svg('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3')}Delete</button>`:''}`,
  fields:W=>[...CDETF(W),...CUSTF,...GDPRF,...CFINF(),...CFITF(),{k:'notes',l:'Notes',t:'area'}],
  tabs:W=>{const calls=S.calls.filter(c=>c.contract==W.v.id),dels=S.deliveries.filter(d=>d.contract==W.v.id);return[
    {k:'details',t:'Details',h:W=>`<div class="rcols">${byGroup(CDETF(W),W.v)}</div>`},
    {k:'customer',t:'Customer',h:W=>`<div class="rcols">${byGroup(CUSTF,W.v)}</div>`},
    {k:'survey',t:'Survey',n:(W.v.openings||[]).length,h:opsTab},
    {k:'products',t:'Products',n:(W.v.lines||[]).length,h:linesTab},
    {k:'check',t:'Job Progress',h:W=>ckTab(W,CK)},
    {k:'finance',t:'Finance',h:W=>{const P=W.v.pay||[];return `<div class="rcols">${byGroup(CFINF(),W.v)}<section class="rg"><h4>Payments Received</h4>${ISADM()?`<div class="radd"><input id="ra_amt" type="number" step="any" min="0" placeholder="Amount £"><input id="ra_date" type="date" value="${today()}"><select id="ra_method">${['Bank transfer','Card','Cheque','Cash','Finance','Deposit'].map(x=>`<option>${x}</option>`).join('')}</select><button class="mini pri" onclick="recPay()">Add</button></div>`:''}${P.map((p,i)=>`<div class="row"><span>${fd(p.date)} <span class="muted">${esc(p.method)} ${esc(p.note||'')}</span></span><b>${money(p.amt)}</b></div>`).join('')||'<p class="empty">No payments logged.</p>'}<div class="row"><span><b>Balance</b></span><b>${money((+W.v.value||0)-(+W.v.paid||0))}</b></div></section></div>`}},
    {k:'deliveries',t:'Deliveries',n:dels.length,h:W=>`<div class="rg wide"><h4><span>Deliveries For This Job</span><button class="mini pri" ${A('recDelivery')}>New delivery</button></h4>${dels.map(d=>`<div class="row"><span><b>${esc(d.supplier)}</b> ${esc(d.items)}<br><span class="muted">Due ${fd(d.due)}${d.stage?', '+esc(d.stage):''}</span></span>${dTag(d)}</div>`).join('')||'<p class="empty">No deliveries linked to this contract number.</p>'}</div>`},
    {k:'fitting',t:'Fitting',h:W=>`<div class="rcols">${byGroup(CFITF(),W.v)}</div>`},
    {k:'notes',t:'Notes & Activity',n:W.v.log.length,h:W=>logTab(W,'notes')},
    {k:'docs',t:'Photos & Docs',n:(W.v.photos||[]).length,h:photoTab},
    {k:'calls',t:'Service Calls',n:calls.length,h:W=>`<div class="rg wide"><h4><span>Service Calls</span><button class="mini pri" ${A('recCall')}>New service call</button></h4>${calls.map(c=>`<div class="row"><span><b>${esc(c.id)}</b> ${esc(c.issue)}<br><span class="muted">${esc(c.status)}, ${c.visit?'visit '+fd(c.visit):'no visit booked'}, ${esc(c.fitter||'')}</span></span>${prTag(c.priority)}</div>`).join('')||'<p class="empty">No service calls for this contract.</p>'}</div>`},
    {k:'gdpr',t:'GDPR',h:W=>`<div class="rcols">${grpH('Marketing Consent',GDPRF,W.v)}</div>`}]},
  check:(W,o)=>{if(!o.name)return 'Customer name is needed (Customer step)';if(!PHONES.some(k=>o[k]))return 'Add at least one phone number (Customer step)';if(o.paid>o.value&&o.value>0&&!confirm('Paid is more than the contract value. Save anyway?'))return 'Not saved'},
  save:(W,o)=>{const isNew=W.isNew,c=isNew?{id:W.v.id}:S.contracts.find(x=>x.id==W.id);if(!c)return;delete o.id;delete o.lead;delete o.createdBy;
    const np=(W.v.pay||[]).length-((c.pay||[]).length);if(np>0)audit('Payment recorded',c.id||W.v.id,np+' payment'+(np>1?'s':'')+', '+money(sum((W.v.pay||[]).slice(-np),x=>x.amt)));if(!ISADM())delete o.cost;Object.assign(c,o,{pay:W.v.pay||[],log:W.v.log||[],createdBy:c.createdBy||W.v.createdBy||USER});if(isNew){if(S.contracts.some(x=>x.id==c.id))c.id=nid('C',S.contracts);S.contracts.unshift(c)}
    custCompat(c);audit(isNew?'Contract added':'Contract edited',c.id,c.name);return c.id}};
function recPay(){if(!need(ISADM,'Recording payments'))return;const amt=SAFE.num($('#ra_amt').value,{max:1e7});if(!(amt>0)){toast('Enter an amount');return}
  const cur=readFields(CFINF());if(!cur)return;RW.v.value=cur.value;RW.v.pay=RW.v.pay||[];RW.v.pay.push({amt,date:SAFE.date($('#ra_date').value)||today(),method:SAFE.text($('#ra_method').value,40)});RW.v.paid=Math.round(((+cur.paid||0)+amt)*100)/100;
  if(RW.v.cost!=null&&cur.cost!=null)RW.v.cost=cur.cost;RW.dirty=1;recRedraw('finance');toast('Payment added. Save to keep it.')}
function recCall(){if(!recSave(false))return;const id=RW.id;closeModal();editCall(null,id)}
function recDelivery(){if(!recSave(false))return;const id=RW.id;closeModal();editDel();setTimeout(()=>{const e=$('#f_contract');if(e)e.value=id},30)}

/* ---- entry points used across the app ---- */
function openLead(id){recOpen('lead',id)}
function editLead(id){if(id)recOpen('lead',id);else leadWizard()}
function leadWizard(){const id=nextLeadId();
  wizard({title:'New Lead '+id,saveLabel:'Create lead',v:{title:'',source:'Website',owner:USER,siteSame:'Same as home',productType:''},steps:[
    {t:'Customer',d:'Who is the customer?',f:[{k:'title',l:'Title',t:'select',o:['','Mr','Mrs','Miss','Ms','Mr & Mrs','Dr','Company'],req:1},{k:'name',l:'Name',req:1},{k:'mob1',l:'Mobile',t:'tel',max:30,hint:'Fill in at least one: a mobile or a home phone'},{k:'mob2',nx:'mob1',l:'Second mobile',t:'tel',max:30},{k:'home1',l:'Home phone',t:'tel',max:30},{k:'mob3',nx:'mob2',l:'Third mobile',t:'tel',max:30},{k:'home2',nx:'home1',l:'Second home phone',t:'tel',max:30},{k:'home3',nx:'home2',l:'Third home phone',t:'tel',max:30},{k:'email1',l:'Email',t:'email',w:'full',req:1},{k:'email2',nx:'email1',l:'Second email',t:'email',w:'full'},{k:'email3',nx:'email2',l:'Third email',t:'email',w:'full'},{k:'company',l:'Company (if business)',w:'full'}]},
    {t:'Address',d:'Where are they? Fill it in like a delivery address.',f:[{k:'homeAddr',l:'Address line 1',w:'full',max:120,req:1,hint:'House number or name and street'},{k:'homeAddr2',l:'Address line 2',w:'full',max:120},{k:'town',l:'Town / city',max:60,req:1},{k:'county',l:'County',max:60},{k:'homePc',l:'Postcode',max:10,req:1},{k:'addrType',l:'Address type',t:'select',o:['Home','Business'],req:1}]},
    {t:'Enquiry',d:'What do they want?',f:[{k:'productType',l:'Product type',t:'select',o:PTYPES,req:1},{k:'source',l:'How did they find us?',t:'select',o:SOURCES,req:1},{k:'product',l:'Work wanted',t:'area',w:'full',max:300},{k:'value',l:'Rough value (£)',t:'number'},{k:'owner',l:'Salesperson',t:'select',o:[...OWNERS(),RANDOM_SP]}]},
    {t:'Next Step',d:'What happens next?',f:[{k:'apptDate',l:'Appointment date',t:'date'},{k:'apptTime',l:'Appointment time',t:'time'},{k:'next',l:'Next action',w:'full',hint:'e.g. Call back Tuesday, send brochure'},{k:'followup',l:'Next action date',t:'date'}]},
    {t:'Review',d:'Check and create',review:1}],
    check:(st,v)=>{if(st==0&&!v.name)return 'Please enter the customer name';if(st==0&&!PHONES.some(k=>v[k]))return 'Add at least one phone number'},
    save:v=>{const lid=nextLeadId(),l={...v,id:lid,stage:'New',created:today(),takenBy:USER,invSame:'Same as home',addrType:v.company?'Business':'Home',log:[{d:today(),t:'Lead created',by:USER}],appts:[],chk:{}};
      custCompat(l);S.leads.push(l);audit('Lead added',lid,l.name);toast(lid+' created. Open it any time to add more.')}})}
function openContract(id){recOpen('contract',id)}
function editContract(id){recOpen('contract',id||null)}

/* ======================= list views (AdminBase-style "live views") ======================= */
function leadList(){const U=UI.lead,td=today(),tm=addDays(1),yd=addDays(-1),[ws,we]=weekRange();
  const ap=l=>[l.apptDate,...(l.appts||[]).map(a=>a.d)].filter(Boolean),isOpen=l=>!['Won','Lost'].includes(l.stage);
  const V={live:isOpen,web:l=>isOpen(l)&&l.source=='Website'&&l.stage=='New',today:l=>ap(l).includes(td),tom:l=>ap(l).includes(tm),yest:l=>ap(l).includes(yd),week:l=>ap(l).some(d=>d>=ws&&d<=we),
    unassigned:l=>isOpen(l)&&(!l.owner||l.owner=='Unassigned'||!ap(l).length),nores:l=>ap(l).some(d=>d<td)&&!l.result&&isOpen(l),due:l=>isOpen(l)&&l.followup&&l.followup<=td,won:l=>l.stage=='Won',lost:l=>l.stage=='Lost',all:()=>true}[U.f]||(()=>true);
  const val={id:l=>l.id,created:l=>l.created||'',name:l=>l.name,town:l=>addrOf(l),pc:l=>l.homePc||'',tel:telOf,email:mailOf,owner:l=>l.owner||'~',source:l=>l.source,value:l=>+l.value,followup:l=>l.followup||'9999',stage:l=>STAGES.indexOf(l.stage),appt:l=>nextAppt(l)||'9999'}[U.sort]||(l=>l.id);
  return S.leads.filter(l=>V(l)&&(U.src=='all'||l.source==U.src)&&(U.own=='all'||(l.owner||'Unassigned')==U.own)&&hit(l)).sort((a,b)=>cmp(val(a),val(b))*U.dir||cmp(a.id,b.id))}
const LVIEWS=[['live','Active Leads'],['due','Next Action Due'],['won','Won, To Convert'],['lost','Lost'],['all','All Leads']];
function vLeads(){const U=UI.lead,td=today(),open=S.leads.filter(l=>!['Won','Lost'].includes(l.stage)),pipe=sum(open,l=>l.value),wt=sum(open,l=>l.value*leadProb(l)/100),due=open.filter(l=>l.followup&&l.followup<=td),A2=allLeads(),won=A2.filter(l=>l.stage=='Won').length,lost=A2.filter(l=>l.stage=='Lost').length,ready=S.leads.filter(l=>l.stage=='Won');
  const L=leadList(),pg=paginate(U,L),cnt=k=>{const f=U.f;U.f=k;const n=leadList().length;U.f=f;return n};
  const sel=(k,arr,all)=>`<select class="fsel" ${AC('onchange','setUI','lead.'+k,'this.value')}><option value="all">${all}</option>${arr.map(x=>`<option ${U[k]==x?'selected':''}>${esc(x)}</option>`).join('')}</select>`;
  const tog=`<div class="seg2"><button class="${U.v=='list'?'on':''}" ${A('setUI','lead.v','list')}>List</button><button class="${U.v=='board'?'on':''}" ${A('setUI','lead.v','board')}>Board</button></div>`;
  const list=`<div class="tw"><table class="ptb abt"><thead><tr>${thS('lead','id','Lead No')}${thS('lead','name','Customer')}${thS('lead','town','Address','c-md')}${thS('lead','tel','Contact','c-sm')}${thS('lead','owner','Salesperson','c-md')}${thS('lead','source','Source','c-xl')}${thS('lead','appt','Next Visit','c-sm')}${thS('lead','value','Value','n')}<th class="ac"><span class="srt" ${A('sortBy','lead','stage')} style="cursor:pointer">Stage${U.sort=='stage'?`<span class="ar">${U.dir>0?'▲':'▼'}</span>`:''}</span></th></tr></thead><tbody>
   ${pg.rows.map(l=>`<tr ${A('openLead',l.id)} class="clk-r"><td><b class="lref">${esc(l.id)}</b>${l.created?`<small class="sub">${fd(l.created)}</small>`:''}</td><td><b>${esc(([l.title,l.name].filter(Boolean).join(' ')))}</b>${l.company?`<small class="sub">${esc(l.company)}</small>`:''}</td><td class="c-md"><span class="cl2">${esc(addrOf(l)||'-')}</span>${l.homePc?`<small class="sub">${esc(l.homePc)}</small>`:''}</td><td class="c-sm">${esc(telOf(l)||'-')}${mailOf(l)?`<small class="sub nocap">${esc(mailOf(l))}</small>`:''}</td><td class="c-md">${esc(l.owner||'Unassigned')}</td><td class="c-xl">${esc(l.source||'-')}</td><td class="c-sm">${nextAppt(l)?fd(nextAppt(l)):'-'}</td><td class="n">${m0(l.value)}</td><td class="ac" onclick="event.stopPropagation()"><div class="acts r">${leadTag(l.stage)}${l.stage!='Lost'&&canSee('contracts')?`<button class="mini ${l.stage=='Won'?'pri':''}" ${A('convertLead',l.id)}>Convert</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="9" class="empty">'+emptyArt('survey','No leads in this view.')+'</td></tr>'}</tbody></table></div>${pagerH('lead',pg,'leads')}`;
  const board=`<div class="kan">${STAGES.map(s=>{const B=L.filter(l=>l.stage==s);return `<div class="col"><div class="colh"><b>${esc(s)}</b><span>${B.length} leads, ${m0(sum(B,l=>l.value))}</span></div>${B.map(l=>`<div class="lc"><div class="lt"><b ${A('openLead',l.id)} title="Open lead">${esc(l.name)} <small class="muted">${esc(l.id)}</small></b><span>${m0(l.value)}</span></div><p>${esc(l.product)}</p><p class="muted">${esc(l.town||'')}, via ${esc(l.source)}</p><p class="muted">${esc(l.next||'No next action set')}</p><div class="lb"><button class="mini" aria-label="Move back" ${A('mvLead',l.id,-1)}>&lsaquo;</button><button class="mini" aria-label="Move forward" ${A('mvLead',l.id,1)}>&rsaquo;</button><button class="mini" ${A('openLead',l.id)}>Open</button>${s=='Won'&&canSee('contracts')?`<button class="mini pri" ${A('convertLead',l.id)}>Convert</button>`:''}</div></div>`).join('')||'<p class="empty">Nothing here.</p>'}</div>`}).join('')}</div>`;
  return `<div class="head"><div><h1>Leads</h1><span class="muted">${esc((LVIEWS.find(x=>x[0]==U.f)||['','All'])[1])}: ${L.length} records</span></div><div class="tools"><button class="mini" onclick="contactList('lead')">Contact list</button><button class="mini" onclick="leadCsv()">Export CSV</button><button class="btn" onclick="editLead()">New lead</button></div></div>
  <div class="subbar"><span class="sb-l">Show</span><div class="views">${LVIEWS.map(([k,t])=>`<button class="chip ${U.f==k?'on':''}" ${A('setUI','lead.f',k)}>${esc(t)} <i>${cnt(k)}</i></button>`).join('')}<span class="vs"></span><label class="fl-own">Salesperson ${sel('own',OWNERS(),'Everyone')}</label></div><span class="sb-sp"></span>${tog}</div>
  <div class="kpis"><button class="kpi" ${A('setUI','lead.f','live')}><small>Open Leads</small><b>${open.length}</b></button><div class="kpi"><small>Pipeline Value</small><b>${m0(pipe)}</b></div><div class="kpi"><small>Weighted Pipeline</small><b>${m0(wt)}</b><span class="ksub">Value x win chance</span></div><button class="kpi ${due.length?'warn':''}" ${A('setUI','lead.f','due')}><small>Next Action Due</small><b>${due.length}</b></button><button class="kpi ${ready.length?'warn':''}" ${A('setUI','lead.f','won')}><small>Won, To Convert</small><b>${ready.length}</b></button><div class="kpi"><small>Conversion Rate</small><b>${pc(won,won+lost)}</b><span class="ksub">${won} won, ${lost} lost</span></div></div>
  ${U.v=='board'?board:list}`}

function ctrList(){const U=UI.ctr,[ws,we]=weekRange(),nws=iso(new Date(new Date(ws+'T00:00').getTime()+7*864e5)),nwe=iso(new Date(new Date(we+'T00:00').getTime()+7*864e5));
  const dd=c=>c.delDate||'',cur=c=>c.stage!='Complete'&&c.cancelled!='Yes';
  const V={cur,delw:c=>dd(c)>=ws&&dd(c)<=we,deln:c=>dd(c)>=nws&&dd(c)<=nwe,bal:c=>c.value-c.paid>0,uninv:c=>cur(c)&&c.invoiced!='Yes',sf:c=>cur(c)&&c.supplyOnly!='Yes',so:c=>cur(c)&&c.supplyOnly=='Yes',hold:c=>c.onHold=='Yes',fensa:fensaDue,comp:c=>c.stage=='Complete',all:()=>true}[U.f]||(()=>true);
  const val={id:c=>c.id,name:c=>c.name,addr:c=>addrOf(c),sold:c=>c.soldBy||'',office:c=>c.officeRef||'',site:siteOf,stage:c=>CSTAGES.indexOf(c.stage),fit:c=>c.fit||'9999',value:c=>+c.value,bal:c=>c.value-c.paid}[U.sort]||(c=>c.id);
  return S.contracts.filter(c=>V(c)&&hit(c)).sort((a,b)=>cmp(val(a),val(b))*U.dir||cmp(a.id,b.id))}
const CVIEWS=[['cur','All Current'],['delw','Deliveries This Week'],['deln','Deliveries Next Week'],['bal','Balances Outstanding'],['uninv','Uninvoiced'],['sf','Supply & Fit'],['so','Supply Only'],['hold','On Hold'],['fensa','FENSA To Notify'],['comp','Complete'],['all','All']];
function vContracts(){const U=UI.ctr,L=ctrList(),pg=paginate(U,L),tv=sum(L,c=>c.value),bal=sum(L,c=>c.value-c.paid),cnt=k=>{const f=U.f;U.f=k;const n=ctrList().length;U.f=f;return n};
  const tog=`<div class="seg2"><button class="${U.v=='list'?'on':''}" ${A('setUI','ctr.v','list')}>List</button><button class="${U.v=='board'?'on':''}" ${A('setUI','ctr.v','board')}>Board</button></div>`;
  const board=`<div class="kan" style="grid-template-columns:repeat(${CSTAGES.length},minmax(11rem,1fr))">${CSTAGES.map(s=>{const B=L.filter(c=>c.stage==s);return `<div class="col"><div class="colh"><b>${esc(s)}</b><span>${B.length}, ${m0(sum(B,c=>c.value))}</span></div>${B.map(c=>`<div class="lc"><div class="lt"><b ${A('openContract',c.id)}>${esc(c.name)} <small class="muted">${esc(c.id)}</small></b><span>${m0(c.value)}</span></div><p>${esc(c.product)}</p><p class="muted">${esc(c.town||'')}${c.fit?', fit '+fd(c.fit):''}</p>${c.value-c.paid>0?`<p class="muted">Balance ${m0(c.value-c.paid)}</p>`:'<p><span class="tag g">Paid</span></p>'}</div>`).join('')||'<p class="empty">Nothing here.</p>'}</div>`}).join('')}</div>`;
  const list=`<div class="tw"><table class="ptb abt"><thead><tr>${thS('ctr','id','Contract No')}${thS('ctr','name','Cust Name')}${thS('ctr','addr','Address','c-md')}${thS('ctr','sold','Sold By','c-sm')}${thS('ctr','office','Office Ref','c-xl')}${thS('ctr','site','Site Address','c-xl')}${thS('ctr','fit','Fit Date','c-sm')}${thS('ctr','value','Value','n')}${thS('ctr','bal','Balance','n c-sm')}<th class="ac"><span class="srt" ${A('sortBy','ctr','stage')} style="cursor:pointer">Stage${U.sort=='stage'?`<span class="ar">${U.dir>0?'▲':'▼'}</span>`:''}</span></th></tr></thead><tbody>
   ${pg.rows.map(c=>`<tr ${A('openContract',c.id)} class="clk-r"><td><b class="lref">${esc(c.id)}</b>${c.lead?`<br><span class="muted" style="font-size:.7rem">From ${esc(c.lead)}</span>`:''}</td><td><b>${esc(c.name)}</b>${c.flash?`<br><span class="flash">${esc(c.flash)}</span>`:''}</td><td class="c-md wrapc">${esc(addrOf(c)||'-')}</td><td class="c-sm">${esc(c.soldBy||'-')}</td><td class="c-xl">${esc(c.officeRef||'')}</td><td class="c-xl wrapc">${esc(siteOf(c)||'-')}</td><td class="c-sm">${fd(c.fit)}</td><td class="n">${m0(c.value)}</td><td class="n c-sm">${m0(c.value-c.paid)}</td><td class="ac"><div class="acts r">${stTag(c.stage)}</div></td></tr>`).join('')||'<tr><td colspan="10" class="empty">'+emptyArt('files','No contracts in this view.')+'</td></tr>'}</tbody></table></div>${pagerH('ctr',pg,'contracts')}`;
  return `<div class="head"><div><h1>Contracts</h1><span class="muted">${esc((CVIEWS.find(x=>x[0]==U.f)||['','All'])[1])}: ${L.length} records, ${m0(tv)} total, ${m0(bal)} to collect</span></div><div class="tools"><button class="mini" onclick="contactList('contract')">Contact list</button><button class="btn" onclick="editContract()">New contract</button></div></div>
  <div class="subbar"><span class="sb-l">Show</span><div class="views">${CVIEWS.map(([k,t])=>`<button class="chip ${U.f==k?'on':''}" ${A('setUI','ctr.f',k)}>${esc(t)} <i>${cnt(k)}</i></button>`).join('')}</div><span class="sb-sp"></span>${tog}</div>
  ${ckpi(L)}${U.v=='board'?board:list}`}
