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
const LEAD_CK=['Appointment booked','Survey done','Brochure sent','Quote sent','Follow-up call made','Finance discussed','Samples shown','Showroom visit offered'];
const staffNames=()=>['',...new Set(S.staff.map(s=>s.name))];

/* ---- customer information: same fields on leads and contracts ---- */
const CUSTF=[
  {k:'title',l:'Title',t:'select',o:['','Mr','Mrs','Miss','Ms','Mr & Mrs','Dr','Company'],g:'Customer'},
  {k:'name',l:'Customer / contact name',req:1,g:'Customer'},{k:'company',l:'Company',g:'Customer'},
  {k:'salutation',adv:1,l:'Salutation (Dear ...)',g:'Customer'},{k:'addrType',adv:1,l:'Address type',t:'select',o:['Home','Business'],g:'Customer'},
  {k:'prefContact',adv:1,l:'Preferred contact',t:'select',o:['','Mobile','Home phone','Work phone','Email','Post'],g:'Customer'},
  {k:'mob1',l:'Mobile 1',t:'tel',max:30,g:'Phone Numbers'},{k:'mob2',l:'Mobile 2',t:'tel',max:30,g:'Phone Numbers'},
  {k:'home1',l:'Home 1',t:'tel',max:30,g:'Phone Numbers'},{k:'home2',l:'Home 2',t:'tel',max:30,g:'Phone Numbers'},{k:'work',l:'Work',t:'tel',max:30,g:'Phone Numbers'},
  {k:'email1',l:'Email 1',t:'email',g:'Email'},{k:'email2',l:'Email 2',t:'email',g:'Email'},
  {k:'homeAddr',l:'Home address',t:'area',max:300,g:'Home Address'},{k:'town',l:'Town',g:'Home Address'},{k:'homePc',l:'Postcode',max:10,g:'Home Address'},
  {k:'invSame',l:'Invoice to',t:'select',o:['Same as home','Different'],g:'Invoice Address'},{k:'invAddr',dep:'invSame',l:'Invoice address',t:'area',max:300,g:'Invoice Address'},{k:'invPc',dep:'invSame',l:'Postcode',max:10,g:'Invoice Address'},
  {k:'siteSame',l:'Installation at',t:'select',o:['Same as home','Different'],g:'Site Address'},{k:'siteAddr',dep:'siteSame',l:'Site address',t:'area',max:300,g:'Site Address'},{k:'sitePc',dep:'siteSame',l:'Postcode',max:10,g:'Site Address'},{k:'siteAccess',dep:'siteSame',l:'Access / parking notes',max:200,g:'Site Address'}];
const GDPRF=[{k:'gdprEmail',l:'Marketing by email',t:'select',o:YN},{k:'gdprSms',l:'Marketing by text',t:'select',o:YN},{k:'gdprPhone',l:'Marketing by phone',t:'select',o:YN},{k:'gdprPost',l:'Marketing by post',t:'select',o:YN},{k:'gdprDate',l:'Consent date',t:'date'},{k:'gdprHow',l:'How consent was given',max:100},{k:'gdprNotes',l:'Data notes',t:'area',max:500}];
const CUSTK=[...CUSTF,...GDPRF].map(f=>f.k);
/* move old single phone/email/address fields into the new structure */
(function migrateCustomers(){if(S.custV1)return;[...S.leads,...S.contracts].forEach(r=>{
  if(r.phone&&!r.mob1&&!r.home1){if(/^\s*07/.test(r.phone))r.mob1=r.phone;else r.home1=r.phone}
  if(r.email&&!r.email1)r.email1=r.email;if(r.address&&!r.homeAddr)r.homeAddr=r.address;r.invSame=r.invSame||'Same as home';r.siteSame=r.siteSame||'Same as home'});S.custV1=1;store()})();
const telOf=r=>r.mob1||r.home1||r.work||r.mob2||r.home2||r.phone||'';
const mailOf=r=>r.email1||r.email2||r.email||'';
const addrOf=r=>[r.homeAddr||r.address,r.town].filter(Boolean).join(', ');
const siteOf=r=>r.siteSame=='Different'&&r.siteAddr?[r.siteAddr,r.sitePc].filter(Boolean).join(' '):[addrOf(r),r.homePc].filter(Boolean).join(' ');
function custCompat(r){r.phone=telOf(r);r.email=mailOf(r);r.address=r.siteSame=='Different'&&r.siteAddr?r.siteAddr:(r.homeAddr||'')}

/* ---- row-style field (label left, value right, edited in place) ---- */
function rfH(f,v){const val=v[f.k]??'',id='f_'+f.k;let c;
  if(f.ro)c=`<input id="${id}" value="${esc(val)}" readonly tabindex="-1">`;
  else if(f.t=='select')c=`<select id="${id}">${(val!==''&&!f.o.map(String).includes(String(val))?[val,...f.o]:f.o).map(o=>`<option value="${esc(o)}" ${String(o)==String(val)?'selected':''}>${esc(o||'-')}</option>`).join('')}</select>`;
  else if(f.t=='area')c=`<textarea id="${id}" rows="${f.rows||2}" maxlength="${f.max||2000}">${esc(val)}</textarea>`;
  else c=`<input id="${id}" type="${f.t=='number'?'number':f.t=='date'?'date':f.t=='time'?'time':f.t=='email'?'email':f.t=='tel'?'tel':'text'}" ${f.t=='number'?'step="any" min="0" inputmode="decimal"':`maxlength="${f.max||120}"`} value="${esc(val)}" ${f.list?`list="${f.list}"`:''} autocomplete="off">`;
  const hid=f.dep&&(v[f.dep]||'Same as home')!='Different';
  if(['invSame','siteSame'].includes(f.k))c=c.replace('<select ','<select onchange="recDep(this)" ');
  return `<label class="rf ${f.t=='area'?'ta':''}" ${f.dep?`data-dep="${f.dep}"`:''} ${hid?'hidden':''}><span>${esc(f.l)}${f.req?' *':''}</span>${c}</label>`}
const grpH=(t,fs,v)=>`<section class="rg"><h4>${esc(t)}</h4>${fs.map(f=>rfH(f,v)).join('')}</section>`;
const byGroup=(fs,v)=>{const g={},adv=fs.filter(f=>f.adv);fs.filter(f=>!f.adv).forEach(f=>(g[f.g]=g[f.g]||[]).push(f));
  return Object.entries(g).map(([t,x])=>grpH(t,x,v)).join('')+(adv.length?`<details class="rg more"><summary>More details <span class="muted">(${adv.length})</span></summary>${adv.map(f=>rfH(f,v)).join('')}</details>`:'')};
function recDep(sel){const k=sel.id.slice(2);$$(`#mbox [data-dep="${k}"]`).forEach(r=>r.hidden=sel.value!='Different')}

/* ---- record window ---- */
let RW=null;const RTAB={lead:'details',contract:'details'};
function recOpen(kind,id){const D=REC[kind],r=id?D.get(id):null;if(id&&!r)return;
  const W=RW={kind,id:r?r.id:null,isNew:!r,v:r?JSON.parse(JSON.stringify(r)):D.blank(),list:D.order()};
  W.v.log=W.v.log||[];W.v.photos=(W.v.photos||[]).filter(SAFE.img);tmp=W.v.photos;tmpDraw=drawThumbs;
  const tabs=D.tabs(W),tab=tabs.some(t=>t.k==RTAB[kind])?RTAB[kind]:'details',pos=W.list.indexOf(W.id);
  openModal(`<div class="rw">
   <div class="rw-bar"><button class="rb1" onclick="recSave(true)">Save &amp; Close</button><button class="rb1" onclick="recSave(false)">Save</button>${W.isNew?'':D.actions(W)}<span class="rw-sp"></span>
    ${W.isNew?'':`<button class="rb1 ic" title="First" ${A('recNav','first')} ${pos<=0?'disabled':''}>&laquo;</button><button class="rb1 ic" title="Previous" ${A('recNav',-1)} ${pos<=0?'disabled':''}>&lsaquo;</button><span class="rw-pos">${pos+1} of ${W.list.length}</span><button class="rb1 ic" title="Next" ${A('recNav',1)} ${pos>=W.list.length-1?'disabled':''}>&rsaquo;</button><button class="rb1 ic" title="Last" ${A('recNav','last')} ${pos>=W.list.length-1?'disabled':''}>&raquo;</button>`}
    <button class="rb1 ic" onclick="recClose()" aria-label="Close">&times;</button></div>
   <div class="rw-h"><div><small>${esc(D.label)}${W.isNew?' · New':''}</small><h2>${esc(D.heading(W))}</h2></div><div class="rw-hk">${D.headStats(W)}</div></div>
   <nav class="rw-tabs" role="tablist">${tabs.map(t=>`<button role="tab" class="${t.k==tab?'on':''}" data-t="${t.k}" ${A('recTab',t.k)}>${esc(t.t)}${t.n?` <i>${t.n}</i>`:''}</button>`).join('')}</nav>
   <div class="rw-b">${tabs.map(t=>`<div class="rw-p ${t.k==tab?'on':''}" data-t="${t.k}" role="tabpanel">${t.h(W)}</div>`).join('')}</div></div>`,'full');
  drawThumbs()}
function recTab(k){RTAB[RW.kind]=k;$$('#mbox .rw-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t==k));$$('#mbox .rw-p').forEach(p=>p.classList.toggle('on',p.dataset.t==k));$('#mbox .rw-b').scrollTop=0}
function recRedraw(t){const D=REC[RW.kind],x=D.tabs(RW).find(z=>z.k==t),p=$(`#mbox .rw-p[data-t="${t}"]`);if(x&&p)p.innerHTML=x.h(RW);const b=$(`#mbox .rw-tabs button[data-t="${t}"]`);if(b&&x)b.innerHTML=esc(x.t)+(x.n?` <i>${x.n}</i>`:'')}
function recRead(){const D=REC[RW.kind],o=readFields(D.fields(RW));if(!o)return null;
  $$('#mbox .rck').forEach(c=>{(o.chk=o.chk||{})[c.dataset.k]=c.checked});
  if($('#mbox .pl'))o.lines=readLines();o.photos=tmp.slice(0,MAX_PHOTOS);return o}
function recSave(close){const D=REC[RW.kind],o=recRead();if(!o)return false;const e=D.check&&D.check(RW,o);if(e){toast(e);return false}
  const id=D.save(RW,o);store();if(close){closeModal();render()}else{render();recOpen(RW.kind,id)}toast('Saved');return true}
function recNav(d){const L=RW.list,i=L.indexOf(RW.id),n=d=='first'?0:d=='last'?L.length-1:i+d;if(n<0||n>=L.length)return;const kind=RW.kind;if(!recSave(false))return;recOpen(kind,L[n])}
/* small inline lists inside a record */
function recAdd(list,fs,tab){const o={};for(const k of fs){const e=$('#ra_'+k);o[k]=e?SAFE.text(e.value,300):''}if(!Object.values(o).some(Boolean)){toast('Fill in the details first');return}
  RW.v[list]=RW.v[list]||[];RW.v[list].unshift({...o,by:USER,at:today()});RW.dirty=1;recRedraw(tab)}
function recDel(list,i,tab){RW.v[list].splice(i,1);RW.dirty=1;recRedraw(tab)}
function recClose(){if(RW&&RW.dirty&&!confirm('You have unsaved changes. Close without saving?'))return;closeModal()}
const photoTab=()=>`<div class="rg wide"><h4>Photos And Documents</h4><div class="thumbs" id="thumbs"></div><div class="prow"><label class="btn ghost sm">Take photo<input type="file" accept="image/*" capture="environment" hidden onchange="addPh(this)"></label><label class="btn ghost sm">Upload photos<input type="file" accept="image/*" multiple hidden onchange="addPh(this)"></label><span class="muted" style="font-size:.78rem">Up to ${MAX_PHOTOS} photos</span></div></div>`;
const logTab=(W,tab)=>`<div class="rcols"><section class="rg"><h4>Notes</h4>${rfH({k:'notes',l:'General notes',t:'area',rows:8},W.v)}</section>
  <section class="rg"><h4>Activity Log</h4><div class="radd"><select id="ra_t">${['Call','Email','Visit','Survey','Quote sent','Note'].map(x=>`<option>${x}</option>`).join('')}</select><input id="ra_n" placeholder="What happened" maxlength="300"><button class="mini pri" ${A('recAdd','log',['t','n'],tab)}>Add</button></div>
  ${W.v.log.map((e,i)=>`<div class="row"><span><b>${esc(e.t)}</b><br><span class="muted">${esc(e.n||'')}</span></span><span class="muted" style="text-align:right;white-space:nowrap">${fd(e.d||e.at)}<br>${esc(e.by||'')} <button class="mini del" ${A('recDel','log',i,tab)} aria-label="Remove">&times;</button></span></div>`).join('')||'<p class="empty">No activity yet.</p>'}</section></div>`;
const ckTab=(W,items)=>`<div class="rg wide"><h4>Checklist, ${items.filter(k=>(W.v.chk||{})[k]).length} of ${items.length} done</h4><div class="rck-g">${items.map(k=>`<label class="rckl"><input type="checkbox" class="rck" data-k="${esc(k)}" ${(W.v.chk||{})[k]?'checked':''}><span>${esc(k)}</span></label>`).join('')}</div></div>`;

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
  {k:'id',l:'Lead number',ro:1,g:'Lead'},{k:'created',l:'Lead date',t:'date',g:'Lead'},{k:'officeRef',adv:1,l:'Office reference',g:'Lead'},
  {k:'takenBy',adv:1,l:'Taken by',t:'select',o:staffNames(),g:'Lead'},{k:'branch',l:'Sales area / branch',t:'select',o:['',...BRANCHES],g:'Lead'},{k:'owner',l:'Salesperson',t:'select',o:OWNERS(),g:'Lead'},
  {k:'stage',l:'Stage',t:'select',o:STAGES,g:'Lead'},{k:'prob',adv:1,l:'Win chance (%)',t:'number',max:100,dp:0,g:'Lead'},
  {k:'source',l:'Lead source',t:'select',o:SOURCES,g:'Source And Interest'},{k:'subSource',l:'Sub source',g:'Source And Interest'},{k:'subSubSource',adv:1,l:'Sub sub source',g:'Source And Interest'},
  {k:'productType',l:'Product type',t:'select',o:PTYPES,g:'Source And Interest'},{k:'interest1',l:'Product interest 1',g:'Source And Interest'},{k:'interest2',adv:1,l:'Product interest 2',g:'Source And Interest'},
  {k:'product',l:'Work wanted',t:'area',max:300,g:'Source And Interest'},{k:'value',l:'Net value (£)',t:'number',g:'Source And Interest'},
  {k:'quoteType',adv:1,l:'Quote type',t:'select',o:['','Email','Post','In person'],g:'Result'},{k:'payMethod',adv:1,l:'Payment method',t:'select',o:['','Cash','Bank transfer','Card','Finance','Cheque'],g:'Result'},
  {k:'result',l:'Result',t:'select',o:RESULTS,g:'Result'},{k:'resultDate',adv:1,l:'Result date',t:'date',g:'Result'},{k:'followup',l:'Next action date',t:'date',g:'Result'},{k:'next',l:'Next action',g:'Result'},
  {k:'showroom',adv:1,l:'Showroom visit',t:'select',o:YN,g:'Result'},{k:'notified',adv:1,l:'Salesperson notified',t:'select',o:YN,g:'Result'},{k:'frameInfo',adv:1,l:'Frame info',g:'Result'},{k:'customCat',adv:1,l:'Custom category',g:'Result'}];
const APPTF=[{k:'apptDate',l:'Appointment date',t:'date'},{k:'apptTime',l:'Appointment time',t:'time'},{k:'demoDate',l:'Demo date',t:'date'}];
const nextAppt=l=>[l.apptDate,...(l.appts||[]).map(a=>a.d)].filter(Boolean).sort().find(d=>d>=today())||'';
REC.lead={label:'Lead',
  get:id=>S.leads.find(l=>l.id==id),order:()=>leadList().map(l=>l.id),
  blank:()=>({id:nextLeadId(),created:today(),stage:'New',source:'Website',owner:USER,takenBy:USER,invSame:'Same as home',siteSame:'Same as home',addrType:'Home',log:[],appts:[],chk:{}}),
  heading:W=>`${W.v.id}  ${[W.v.title,W.v.name].filter(Boolean).join(' ')||'New lead'}${W.v.company?' · '+W.v.company:''}`,
  headStats:W=>`${leadTag(W.v.stage||'New')}<span><small>Net Value</small><b>${m0(W.v.value)}</b></span><span><small>Next Action</small><b>${W.v.followup?fd(W.v.followup):'-'}</b></span>`,
  actions:W=>`${canSee('contracts')&&W.v.stage!='Lost'?`<button class="rb1 go" ${A('recConvert')}>Convert to contract</button>`:''}${ISOWN()?`<button class="rb1" ${A('delLead',W.id)}>Delete</button>`:''}`,
  fields:W=>[...LEADF(W),...CUSTF,...GDPRF,...APPTF,{k:'notes',l:'Notes',t:'area'}],
  tabs:W=>[{k:'details',t:'Details',h:W=>`<div class="rcols">${byGroup(LEADF(W),W.v)}</div>`},
    {k:'customer',t:'Customer',h:W=>`<div class="rcols">${byGroup(CUSTF,W.v)}</div>`},
    {k:'appts',t:'Appointments',n:(W.v.appts||[]).length,h:W=>`<div class="rcols"><section class="rg">${'<h4>Main Appointment</h4>'+APPTF.map(f=>rfH(f,W.v)).join('')}</section><section class="rg"><h4>Other Appointments</h4><div class="radd"><input id="ra_d" type="date"><input id="ra_tm" type="time"><select id="ra_ty">${['Survey','Demo','Showroom','Call back','Measure'].map(x=>`<option>${x}</option>`).join('')}</select><select id="ra_w">${OWNERS().map(x=>`<option>${esc(x)}</option>`).join('')}</select><button class="mini pri" ${A('recAdd','appts',['d','tm','ty','w'],'appts')}>Add</button></div>${(W.v.appts||[]).map((a,i)=>`<div class="row"><span><b>${a.d?fd(a.d):'No date'} ${esc(a.tm||'')}</b> ${esc(a.ty||'')}<br><span class="muted">With ${esc(a.w||'-')}</span></span><button class="mini del" ${A('recDel','appts',i,'appts')}>&times;</button></div>`).join('')||'<p class="empty">No other appointments.</p>'}</section></div>`},
    {k:'check',t:'Checklist',h:W=>ckTab(W,LEAD_CK)},
    {k:'notes',t:'Notes & Activity',n:W.v.log.length,h:W=>logTab(W,'notes')},
    {k:'docs',t:'Photos & Docs',n:(W.v.photos||[]).length,h:photoTab},
    {k:'gdpr',t:'GDPR',h:W=>`<div class="rcols">${grpH('Marketing Consent',GDPRF,W.v)}<section class="rg"><h4>About GDPR</h4><p class="muted" style="font-size:.85rem">Only market to customers who said yes. Record when and how consent was given. Customers can ask to see or delete their data at any time.</p></section></div>`}],
  check:(W,o)=>{if(!o.name)return 'Customer name is needed (Customer tab)'},
  save:(W,o)=>{const isNew=W.isNew,l=isNew?{id:nextLeadId(),log:[{d:today(),t:'Lead created',by:USER}]}:S.leads.find(x=>x.id==W.id);if(!l)return;
    const a=l.stage;if(o.prob===0&&!($('#f_prob').value||'').trim())o.prob='';delete o.id;
    Object.assign(l,o,{log:W.v.log,appts:W.v.appts||[]});if(!isNew&&a!=o.stage)l.log.unshift({d:today(),t:'Stage: '+a+' to '+o.stage,by:USER});
    if(isNew){l.log=[...W.v.log,{d:today(),t:'Lead created',by:USER}];S.leads.push(l)}custCompat(l);audit(isNew?'Lead added':'Lead edited',l.id,l.name);return l.id}};
function recConvert(){if(!recSave(false))return;const id=RW.id;closeModal();convertLead(id)}

/* ======================= CONTRACT record ======================= */
const CDETF=W=>[
  {k:'id',l:'Contract number',ro:1,g:'Contract'},{k:'cdate',l:'Contract date',t:'date',g:'Contract'},{k:'officeRef',l:'Office ref 1',g:'Contract'},{k:'officeRef2',l:'Office ref 2',g:'Contract'},
  {k:'contractType',l:'Contract type',t:'select',o:CTYPES,g:'Contract'},{k:'supplyOnly',l:'Supply only',t:'select',o:YN,g:'Contract'},{k:'stage',l:'Stage',t:'select',o:CSTAGES,g:'Contract'},
  {k:'onHold',l:'On hold',t:'select',o:YN,g:'Contract'},{k:'cancelled',l:'Cancelled',t:'select',o:YN,g:'Contract'},{k:'product',l:'Work / products summary',t:'area',max:300,g:'Contract'},{k:'flash',l:'Flash note (shows in red)',max:160,g:'Contract'},
  {k:'lead',l:'Lead number',ro:1,g:'Sales Information'},{k:'salesArea',l:'Sales area',t:'select',o:['',...BRANCHES],g:'Sales Information'},{k:'soldBy',l:'Salesperson',t:'select',o:OWNERS(),g:'Sales Information'},
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
  actions:W=>`<button class="rb1" ${A('reportContract',W.id)}>Reports</button><button class="rb1" ${A('recCall')}>Service call</button>${ISOWN()?`<button class="rb1" ${A('del','contracts',W.id)}>Delete</button>`:''}`,
  fields:W=>[...CDETF(W),...CUSTF,...GDPRF,...CFINF(),...CFITF(),{k:'notes',l:'Notes',t:'area'}],
  tabs:W=>{const calls=S.calls.filter(c=>c.contract==W.v.id),dels=S.deliveries.filter(d=>d.contract==W.v.id);return[
    {k:'details',t:'Details',h:W=>`<div class="rcols">${byGroup(CDETF(W),W.v)}</div>`},
    {k:'customer',t:'Customer',h:W=>`<div class="rcols">${byGroup(CUSTF,W.v)}</div>`},
    {k:'products',t:'Products',n:(W.v.lines||[]).length,h:linesTab},
    {k:'check',t:'Checklist',h:W=>ckTab(W,CK)},
    {k:'finance',t:'Finance',h:W=>{const P=W.v.pay||[];return `<div class="rcols">${byGroup(CFINF(),W.v)}<section class="rg"><h4>Payments Received</h4>${ISADM()?`<div class="radd"><input id="ra_amt" type="number" step="any" min="0" placeholder="Amount £"><input id="ra_date" type="date" value="${today()}"><select id="ra_method">${['Bank transfer','Card','Cheque','Cash','Finance','Deposit'].map(x=>`<option>${x}</option>`).join('')}</select><button class="mini pri" onclick="recPay()">Add</button></div>`:''}${P.map((p,i)=>`<div class="row"><span>${fd(p.date)} <span class="muted">${esc(p.method)} ${esc(p.note||'')}</span></span><b>${money(p.amt)}</b></div>`).join('')||'<p class="empty">No payments logged.</p>'}<div class="row"><span><b>Balance</b></span><b>${money((+W.v.value||0)-(+W.v.paid||0))}</b></div></section></div>`}},
    {k:'deliveries',t:'Deliveries',n:dels.length,h:W=>`<div class="rg wide"><h4><span>Deliveries For This Job</span><button class="mini pri" ${A('recDelivery')}>New delivery</button></h4>${dels.map(d=>`<div class="row"><span><b>${esc(d.supplier)}</b> ${esc(d.items)}<br><span class="muted">Due ${fd(d.due)}${d.stage?', '+esc(d.stage):''}</span></span>${dTag(d)}</div>`).join('')||'<p class="empty">No deliveries linked to this contract number.</p>'}</div>`},
    {k:'fitting',t:'Fitting',h:W=>`<div class="rcols">${byGroup(CFITF(),W.v)}</div>`},
    {k:'notes',t:'Notes & Activity',n:W.v.log.length,h:W=>logTab(W,'notes')},
    {k:'docs',t:'Photos & Docs',n:(W.v.photos||[]).length,h:photoTab},
    {k:'calls',t:'Service Calls',n:calls.length,h:W=>`<div class="rg wide"><h4><span>Service Calls</span><button class="mini pri" ${A('recCall')}>New service call</button></h4>${calls.map(c=>`<div class="row"><span><b>${esc(c.id)}</b> ${esc(c.issue)}<br><span class="muted">${esc(c.status)}, ${c.visit?'visit '+fd(c.visit):'no visit booked'}, ${esc(c.fitter||'')}</span></span>${prTag(c.priority)}</div>`).join('')||'<p class="empty">No service calls for this contract.</p>'}</div>`},
    {k:'gdpr',t:'GDPR',h:W=>`<div class="rcols">${grpH('Marketing Consent',GDPRF,W.v)}</div>`}]},
  check:(W,o)=>{if(!o.name)return 'Customer name is needed (Customer tab)';if(o.paid>o.value&&o.value>0&&!confirm('Paid is more than the contract value. Save anyway?'))return 'Not saved'},
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
    {t:'Customer',d:'Who is the customer?',f:[{k:'title',l:'Title',t:'select',o:['','Mr','Mrs','Miss','Ms','Mr & Mrs','Dr','Company']},{k:'name',l:'Name',req:1},{k:'mob1',l:'Mobile',t:'tel',max:30},{k:'home1',l:'Home phone',t:'tel',max:30},{k:'email1',l:'Email',t:'email',w:'full'},{k:'company',l:'Company (if business)',w:'full'}]},
    {t:'Address',d:'Where are they?',f:[{k:'homeAddr',l:'Address',t:'area',w:'full',max:300},{k:'town',l:'Town'},{k:'homePc',l:'Postcode',max:10}]},
    {t:'Enquiry',d:'What do they want?',f:[{k:'productType',l:'Product type',t:'select',o:PTYPES},{k:'source',l:'How did they find us?',t:'select',o:SOURCES},{k:'product',l:'Work wanted',t:'area',w:'full',max:300},{k:'value',l:'Rough value (£)',t:'number'},{k:'owner',l:'Salesperson',t:'select',o:OWNERS()}]},
    {t:'Next Step',d:'What happens next?',f:[{k:'apptDate',l:'Appointment date',t:'date'},{k:'apptTime',l:'Appointment time',t:'time'},{k:'next',l:'Next action',w:'full',hint:'e.g. Call back Tuesday, send brochure'},{k:'followup',l:'Next action date',t:'date'}]},
    {t:'Review',d:'Check and create',review:1}],
    check:(st,v)=>{if(st==0&&!v.name)return 'Please enter the customer name';if(st==0&&!v.mob1&&!v.home1&&!v.email1)return 'Add at least one phone number or email'},
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
  const list=`<div class="tw"><table class="ptb abt"><thead><tr>${thS('lead','id','Lead No')}${thS('lead','created','Date','c-sm')}${thS('lead','name','Name')}${thS('lead','town','Address','c-md')}${thS('lead','pc','Postcode','c-md')}${thS('lead','tel','Tel No','c-sm')}${thS('lead','email','Email','c-xl')}${thS('lead','owner','Salesperson','c-md')}${thS('lead','source','Source','c-md')}${thS('lead','appt','Appt','c-sm')}${thS('lead','value','Value','n')}<th class="ac"><span class="srt" ${A('sortBy','lead','stage')} style="cursor:pointer">Stage${U.sort=='stage'?`<span class="ar">${U.dir>0?'▲':'▼'}</span>`:''}</span></th></tr></thead><tbody>
   ${pg.rows.map(l=>`<tr ${A('openLead',l.id)} class="clk-r"><td><b class="lref">${esc(l.id)}</b></td><td class="c-sm">${l.created?fd(l.created):'-'}</td><td><b>${esc(([l.title,l.name].filter(Boolean).join(' ')))}</b>${l.company?`<br><span class="muted">${esc(l.company)}</span>`:''}</td><td class="c-md wrapc">${esc(addrOf(l)||'-')}</td><td class="c-md">${esc(l.homePc||'')}</td><td class="c-sm">${esc(telOf(l))}</td><td class="c-xl nocap">${esc(mailOf(l))}</td><td class="c-md">${esc(l.owner||'Unassigned')}</td><td class="c-md">${esc(l.source)}</td><td class="c-sm">${nextAppt(l)?fd(nextAppt(l)):'-'}</td><td class="n">${m0(l.value)}</td><td class="ac" onclick="event.stopPropagation()"><div class="acts r">${leadTag(l.stage)}${l.stage!='Lost'&&canSee('contracts')?`<button class="mini ${l.stage=='Won'?'pri':''}" ${A('convertLead',l.id)}>Convert</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="12" class="empty">No leads in this view.</td></tr>'}</tbody></table></div>${pagerH('lead',pg,'leads')}`;
  const board=`<div class="kan">${STAGES.map(s=>{const B=L.filter(l=>l.stage==s);return `<div class="col"><div class="colh"><b>${esc(s)}</b><span>${B.length} leads, ${m0(sum(B,l=>l.value))}</span></div>${B.map(l=>`<div class="lc"><div class="lt"><b ${A('openLead',l.id)} title="Open lead">${esc(l.name)} <small class="muted">${esc(l.id)}</small></b><span>${m0(l.value)}</span></div><p>${esc(l.product)}</p><p class="muted">${esc(l.town||'')}, via ${esc(l.source)}</p><p class="muted">${esc(l.next||'No next action set')}</p><div class="lb"><button class="mini" aria-label="Move back" ${A('mvLead',l.id,-1)}>&lsaquo;</button><button class="mini" aria-label="Move forward" ${A('mvLead',l.id,1)}>&rsaquo;</button><button class="mini" ${A('openLead',l.id)}>Open</button>${s=='Won'&&canSee('contracts')?`<button class="mini pri" ${A('convertLead',l.id)}>Convert</button>`:''}</div></div>`).join('')||'<p class="empty">Nothing here.</p>'}</div>`}).join('')}</div>`;
  return `<div class="head"><div><h1>Leads</h1><span class="muted">${esc((LVIEWS.find(x=>x[0]==U.f)||['','All'])[1])}: ${L.length} records</span></div><div class="tools">${tog}<span class="vs"></span><button class="mini" onclick="leadCsv()">Export CSV</button><button class="btn" onclick="editLead()">New lead</button></div></div>
  <div class="kpis"><button class="kpi" ${A('setUI','lead.f','live')}><small>Open Leads</small><b>${open.length}</b></button><div class="kpi"><small>Pipeline Value</small><b>${m0(pipe)}</b></div><div class="kpi"><small>Weighted Pipeline</small><b>${m0(wt)}</b><span class="ksub">Value x win chance</span></div><button class="kpi ${due.length?'warn':''}" ${A('setUI','lead.f','due')}><small>Next Action Due</small><b>${due.length}</b></button><button class="kpi ${ready.length?'warn':''}" ${A('setUI','lead.f','won')}><small>Won, To Convert</small><b>${ready.length}</b></button><div class="kpi"><small>Conversion Rate</small><b>${pc(won,won+lost)}</b><span class="ksub">${won} won, ${lost} lost</span></div></div>
  <div class="views">${LVIEWS.map(([k,t])=>`<button class="chip ${U.f==k?'on':''}" ${A('setUI','lead.f',k)}>${esc(t)} <i>${cnt(k)}</i></button>`).join('')}<span class="vs"></span><label class="fl-own">Salesperson ${sel('own',OWNERS(),'Everyone')}</label></div>
  ${U.v=='board'?board:list}`}

function ctrList(){const U=UI.ctr,[ws,we]=weekRange(),nws=iso(new Date(new Date(ws+'T00:00').getTime()+7*864e5)),nwe=iso(new Date(new Date(we+'T00:00').getTime()+7*864e5));
  const dd=c=>c.delDate||'',cur=c=>c.stage!='Complete'&&c.cancelled!='Yes';
  const V={cur,delw:c=>dd(c)>=ws&&dd(c)<=we,deln:c=>dd(c)>=nws&&dd(c)<=nwe,bal:c=>c.value-c.paid>0,uninv:c=>cur(c)&&c.invoiced!='Yes',sf:c=>cur(c)&&c.supplyOnly!='Yes',so:c=>cur(c)&&c.supplyOnly=='Yes',hold:c=>c.onHold=='Yes',comp:c=>c.stage=='Complete',all:()=>true}[U.f]||(()=>true);
  const val={id:c=>c.id,name:c=>c.name,addr:c=>addrOf(c),sold:c=>c.soldBy||'',office:c=>c.officeRef||'',site:siteOf,stage:c=>CSTAGES.indexOf(c.stage),fit:c=>c.fit||'9999',value:c=>+c.value,bal:c=>c.value-c.paid}[U.sort]||(c=>c.id);
  return S.contracts.filter(c=>V(c)&&hit(c)).sort((a,b)=>cmp(val(a),val(b))*U.dir||cmp(a.id,b.id))}
const CVIEWS=[['cur','All Current'],['delw','Deliveries This Week'],['deln','Deliveries Next Week'],['bal','Balances Outstanding'],['uninv','Uninvoiced'],['sf','Supply & Fit'],['so','Supply Only'],['hold','On Hold'],['comp','Complete'],['all','All']];
function vContracts(){const U=UI.ctr,L=ctrList(),pg=paginate(U,L),tv=sum(L,c=>c.value),bal=sum(L,c=>c.value-c.paid),cnt=k=>{const f=U.f;U.f=k;const n=ctrList().length;U.f=f;return n};
  const tog=`<div class="seg2"><button class="${U.v=='list'?'on':''}" ${A('setUI','ctr.v','list')}>List</button><button class="${U.v=='board'?'on':''}" ${A('setUI','ctr.v','board')}>Board</button></div>`;
  const board=`<div class="kan" style="grid-template-columns:repeat(${CSTAGES.length},minmax(11rem,1fr))">${CSTAGES.map(s=>{const B=L.filter(c=>c.stage==s);return `<div class="col"><div class="colh"><b>${esc(s)}</b><span>${B.length}, ${m0(sum(B,c=>c.value))}</span></div>${B.map(c=>`<div class="lc"><div class="lt"><b ${A('openContract',c.id)}>${esc(c.name)} <small class="muted">${esc(c.id)}</small></b><span>${m0(c.value)}</span></div><p>${esc(c.product)}</p><p class="muted">${esc(c.town||'')}${c.fit?', fit '+fd(c.fit):''}</p>${c.value-c.paid>0?`<p class="muted">Balance ${m0(c.value-c.paid)}</p>`:'<p><span class="tag g">Paid</span></p>'}</div>`).join('')||'<p class="empty">Nothing here.</p>'}</div>`}).join('')}</div>`;
  const list=`<div class="tw"><table class="ptb abt"><thead><tr>${thS('ctr','id','Contract No')}${thS('ctr','name','Cust Name')}${thS('ctr','addr','Address','c-md')}${thS('ctr','sold','Sold By','c-sm')}${thS('ctr','office','Office Ref','c-xl')}${thS('ctr','site','Site Address','c-xl')}${thS('ctr','fit','Fit Date','c-sm')}${thS('ctr','value','Value','n')}${thS('ctr','bal','Balance','n c-sm')}<th class="ac"><span class="srt" ${A('sortBy','ctr','stage')} style="cursor:pointer">Stage${U.sort=='stage'?`<span class="ar">${U.dir>0?'▲':'▼'}</span>`:''}</span></th></tr></thead><tbody>
   ${pg.rows.map(c=>`<tr ${A('openContract',c.id)} class="clk-r"><td><b class="lref">${esc(c.id)}</b>${c.lead?`<br><span class="muted" style="font-size:.7rem">From ${esc(c.lead)}</span>`:''}</td><td><b>${esc(c.name)}</b>${c.flash?`<br><span class="flash">${esc(c.flash)}</span>`:''}</td><td class="c-md wrapc">${esc(addrOf(c)||'-')}</td><td class="c-sm">${esc(c.soldBy||'-')}</td><td class="c-xl">${esc(c.officeRef||'')}</td><td class="c-xl wrapc">${esc(siteOf(c)||'-')}</td><td class="c-sm">${fd(c.fit)}</td><td class="n">${m0(c.value)}</td><td class="n c-sm">${m0(c.value-c.paid)}</td><td class="ac"><div class="acts r">${stTag(c.stage)}</div></td></tr>`).join('')||'<tr><td colspan="10" class="empty">No contracts in this view.</td></tr>'}</tbody></table></div>${pagerH('ctr',pg,'contracts')}`;
  return `<div class="head"><div><h1>Contracts</h1><span class="muted">${esc((CVIEWS.find(x=>x[0]==U.f)||['','All'])[1])}: ${L.length} records, ${m0(tv)} total, ${m0(bal)} to collect</span></div><div class="tools">${tog}<span class="vs"></span><button class="btn" onclick="editContract()">New contract</button></div></div>
  ${ckpi(L)}<div class="views">${CVIEWS.map(([k,t])=>`<button class="chip ${U.f==k?'on':''}" ${A('setUI','ctr.f',k)}>${esc(t)} <i>${cnt(k)}</i></button>`).join('')}</div>${U.v=='board'?board:list}`}
