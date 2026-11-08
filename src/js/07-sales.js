/* ==========================================================================
   07 · Sales & service: leads, contracts, service calls, contact book
   ========================================================================== */
/* new numbers: one more than the highest used, or the start an administrator set in Settings > Numbering */
const nid=(p,a)=>{const N=(typeof S!='undefined'&&S.num)||{};return p=='S'?'S-'+String(Math.max(0,(+N.call||1)-1,...a.map(x=>parseInt(String(x.id).split('-')[1])||0))+1).padStart(4,'0'):String(Math.max(p=='C'?Math.max(2400000,(+N.contract||1)-1):1000,...a.map(x=>parseInt(x.id)||0))+1)};
/* deleting is admin-only, and only for these lists */
const DEL_RULE={contracts:[ISOWN,'Deleting contracts'],staff:[ISOWN,'Removing staff'],calls:[ISOWN,'Deleting service calls'],contacts:[ISOWN,'Deleting contacts'],fin:[ISADM,'Deleting bills']};
function del(k,id){const r=DEL_RULE[k];if(!r||!Array.isArray(S[k])||!need(r[0],r[1]))return;
  askYes('Delete '+id+'?','This cannot be undone.','Delete',()=>{S[k]=S[k].filter(x=>x.id!=id);if(k=='staff'){S.hols=S.hols.filter(h=>h.sid!=id);if(S.abs)delete S.abs[id]}audit('Deleted',k+' '+id,'');store();render();if(typeof RW!='undefined'&&RW&&String(RW.id)==String(id)&&$('#mbox .rw')){RW.dirty=0;closeModal()}},true)}

/* ---------------- leads ----------------
   Lead refs are L0001, L0002... A converted lead moves into its new contract
   (7-digit contract number) and leaves the lead list, so its L number is free
   to be given to the next new lead. */
/* staff categories (added after load so old saves get one too) */
(function staffCats(){let ch=0;(S.staff||[]).forEach(s=>{if(!SCATS.includes(s.cat)){s.cat=guessCat(s.role||'');ch=1}});if(ch)store()})();
const staffIn=c=>S.staff.filter(s=>s.cat==c).map(s=>s.name);
const RANDOM_SP='Pick at random';
/* 'Pick at random' stays chosen until the record is saved, then a real salesperson is appointed */
const spResolve=v=>{if(v!==RANDOM_SP)return v;const L=OWNERS().filter(x=>x!='Unassigned');return L[Math.floor(Math.random()*L.length)]||'Unassigned'};
(function salesABC(){if(S.salesABC)return;['Sales B','Sales C'].forEach((n,i)=>{if(!S.staff.some(s=>s.name==n))S.staff.push({id:'U-S'+(i+2),name:n,role:'Sales consultant',team:'',phone:'07700 900 '+(610+i*7),email:n.toLowerCase().replace(' ','.')+'@example.com',start:'2025-03-0'+(i+3),allow:25,salary:30000,cat:'Salespeople'})});S.salesABC=1;store()})();
const OWNERS=()=>{const s=staffIn('Salespeople');return['Unassigned',...new Set(s.length?s:S.staff.map(x=>x.name))]};
const FITL=()=>[...new Set([...staffIn('Fitters'),...FIT])];
const PROB={New:10,Surveyed:30,Quoted:55,Won:100,Lost:0};
(function migrateLeads(){if(S.leadsV2)return;S.leadArchive=S.leadArchive||[];
  const conv=S.leads.filter(l=>l.contract);S.leadArchive.push(...conv.map(l=>({...l,convertedTo:(S.contracts.find(c=>c.lead==l.id)||{}).id||''})));
  let n=0;S.leads=S.leads.filter(l=>!l.contract).map(l=>{const old=l.id;l.id='L'+String(++n).padStart(4,'0');l.oldRef=old;S.contracts.forEach(c=>{if(c.lead==old)c.lead=l.id});return l});S.leadsV2=1;store()})();
function nextLeadId(){const used=new Set(S.leads.map(l=>l.id));let n=Math.max(1,+(S.num&&S.num.lead)||1);while(used.has('L'+String(n).padStart(4,'0')))n++;return 'L'+String(n).padStart(4,'0')}
const allLeads=()=>[...S.leads,...(S.leadArchive||[]).map(l=>({...l,stage:'Won'}))];
/* a won lead is always 100% and a lost one 0%, whatever was typed before */
const leadProb=l=>l.stage=='Won'?100:l.stage=='Lost'?0:l.prob!=null&&l.prob!==''?+l.prob:PROB[l.stage]??0;
const leadTag=s=>`<span class="tag fw ${s=='Won'?'g':s=='Lost'?'r':s=='Quoted'?'y':s=='New'?'n':''}">${esc(s)}</span>`;
function mvLead(id,d){const l=S.leads.find(x=>x.id==id),i=STAGES.indexOf(l.stage)+d;if(i<0||i>=STAGES.length)return;const a=l.stage;l.stage=STAGES[i];(l.log=l.log||[]).unshift({d:today(),t:'Stage: '+a+' to '+l.stage,by:USER});audit('Lead stage',l.id,a+' to '+l.stage);store();render()}
function delLead(id){if(!need(ISOWN,'Deleting leads'))return;const l=S.leads.find(x=>x.id==id);if(!l)return;askYes('Delete lead '+id+'?',l.name+' will be removed. This cannot be undone.','Delete lead',()=>{S.leads=S.leads.filter(x=>x.id!=id);audit('Lead deleted',id,l.name);store();render();if(typeof RW!='undefined'&&RW&&String(RW.id)==String(id)&&$('#mbox .rw')){RW.dirty=0;closeModal()}},true)}
/* convert: the lead becomes a contract with the next 7-digit number; its L number is freed */
function convertLead(id){const l=S.leads.find(x=>x.id==id);if(!l)return;if(!canSee('contracts')){toast('Your account cannot create contracts');return}const cn=nid('C',S.contracts);
  form('Convert '+l.id+' to Contract '+cn,[{k:'name',l:'Customer',req:1},{k:'phone',l:'Phone',t:'tel',max:30},{k:'email',l:'Email',t:'email'},{k:'address',l:'Installation address',w:'full',max:200},{k:'town',l:'Town'},{k:'product',l:'Product / work',w:'full',req:1},{k:'value',l:'Contract value (£)',t:'number',req:1,pos:1},{k:'paid',l:'Deposit paid (£)',t:'number'},{k:'stage',l:'Stage',t:'select',o:CSTAGES},{k:'fitter',l:'Fitter',t:'select',o:FITL()},{k:'survey',l:'Survey date',t:'date'},{k:'fit',l:'Fit date',t:'date'},{k:'notes',l:'Contract notes',t:'area',w:'full'}],
    {...l,address:siteOf(l),paid:0,stage:'Deposit due',fitter:FITL()[0],notes:'From lead '+l.id+(l.notes?'. '+l.notes:'')},o=>{
      const cust={};CUSTK.forEach(k=>{if(l[k]!=null&&l[k]!=='')cust[k]=l[k]});
      const c={id:nid('C',S.contracts),...cust,...o,email1:o.email||cust.email1,cdate:today(),soldBy:l.owner||USER,source:l.source,subSource:l.subSource,salesArea:l.branch,createdBy:USER,contractType:CTYPES[0],log:[{d:today(),t:'Contract created from lead '+l.id,by:USER}],lead:l.id,openings:(l.openings||[]).map(x=>({...x})),pay:[],photos:(l.photos||[]).slice(),chk:{'Contract signed by customer':true},fromLead:{id:l.id,source:l.source,owner:l.owner,created:l.created,log:l.log||[]}};
      if(o.paid>0){c.pay.push({amt:o.paid,date:today(),method:'Deposit',note:'Taken at conversion'});c.chk['Deposit taken']=true}
      if(o.phone&&o.phone!=telOf(l))c.mob1=o.phone;if(o.address&&o.address!=siteOf(l)){c.siteSame='Different';c.siteAddr=o.address}custCompat(c);if(o.phone)c.phone=o.phone;if(o.address)c.address=o.address;S.contracts.unshift(c);S.leadArchive=S.leadArchive||[];S.leadArchive.push({...l,stage:'Won',convertedTo:c.id,convertedOn:today()});S.leads=S.leads.filter(x=>x.id!=l.id);
      audit('Lead converted',l.id,'Became contract '+c.id);docsMove('lead:'+l.id,'contract:'+c.id);c.phTags=(l.phTags||[]).slice();setTimeout(()=>{toast(l.id+' is now contract '+c.id+'. '+l.id+' is free for a new lead.');go('contracts');openContract(c.id)},60)},false,'lg')}
function leadCsv(){csvDownload('broadland-leads-'+today()+'.csv',[['Ref','Customer','Phone','Email','Town','Product','Source','Owner','Stage','Value','Win %','Follow-up','Next step'],...S.leads.map(l=>[l.id,l.name,l.phone,l.email,l.town,l.product,l.source,l.owner||'',l.stage,l.value,leadProb(l),l.followup||'',l.next||''])])}

/* ---------------- contracts ---------------- */
const CK_V2=['Contract signed by customer','Deposit received','Check survey booked','Check survey done, sizes confirmed','Frames and glass ordered','Frames delivered and checked','Fitting date confirmed with customer','Installation complete','Snagging list cleared','Final balance paid','Handover form signed','Guarantee issued'];
/* checklist in stages: [stage, what it means, items] */
const CKG=[['Sale Agreed','Paperwork signed and money in.',['Contract signed by customer','Deposit taken']],['Check Survey','Exact sizes before anything is ordered.',['Survey visit booked','Sizes measured and confirmed']],['Ordering','Frames and glass on their way.',['Frames and glass ordered','Delivery checked in, nothing damaged']],['Fitting','The install itself.',['Fit date agreed with customer','Windows and doors fitted']],['Sign-Off','Finishing the job properly.',['Snags put right','Balance paid in full','Handover form signed','Guarantee sent to customer']]];
const CK=CKG.flatMap(g=>g[2]);
const LCKG=[['First Contact','Get back to them quickly and book a visit.',['Customer called back within 24 hours','Survey appointment booked']],['Home Visit','What to cover at the survey.',['Home survey carried out','Colour and glass samples shown','Brochure left with customer']],['Quote','Everything they need to decide.',['Payment and finance options explained','Planning or listed building checked','Written quote sent']],['Follow Up','Keep the conversation going.',['Showroom visit offered','Follow-up call made after quote']]];
const CK3={'Deposit received':'Deposit taken','Check survey booked':'Survey visit booked','Check survey done, sizes confirmed':'Sizes measured and confirmed','Frames delivered and checked':'Delivery checked in, nothing damaged','Fitting date confirmed with customer':'Fit date agreed with customer','Installation complete':'Windows and doors fitted','Snagging list cleared':'Snags put right','Final balance paid':'Balance paid in full','Guarantee issued':'Guarantee sent to customer','Brochure given or sent':'Brochure left with customer'};
/* old checklist wording -> new, so existing ticks are kept */
const CK_OLD={'Quote signed':'Contract signed by customer','Survey booked':'Check survey booked','Survey done':'Check survey done, sizes confirmed','Materials ordered':'Frames and glass ordered','Delivery received':'Frames delivered and checked','Fit booked':'Fitting date confirmed with customer','Fitted':'Installation complete','Snagging clear':'Snagging list cleared','Final payment':'Final balance paid',
  'Appointment booked':'Survey appointment booked','Brochure sent':'Brochure given or sent','Quote sent':'Written quote sent','Follow-up call made':'Follow-up call made after quote','Finance discussed':'Payment and finance options explained','Samples shown':'Colour and glass samples shown'};
(function ckReword(){if(S.ckV2)return;[...S.leads,...S.contracts,...(S.leadArchive||[])].forEach(r=>{if(!r.chk)return;const n={};Object.entries(r.chk).forEach(([k,v])=>{const lead=S.leads.includes(r)||(S.leadArchive||[]).includes(r);n[(k=='Survey done'&&lead)?'Home survey carried out':(CK_OLD[k]||k)]=v});r.chk=n});S.ckV2=1;store()})();
(function ckReword3(){if(S.ckV3)return;[...S.leads,...S.contracts,...(S.leadArchive||[])].forEach(r=>{if(!r.chk)return;const n={};Object.entries(r.chk).forEach(([k,v])=>{n[CK3[k]||k]=v});r.chk=n});S.ckV3=1;store()})();
const stTag=s=>`<span class="tag ${s=='Complete'||s=='Fitted'?'g':s=='Deposit due'?'y':''}">${esc(s)}</span>`;
function ckpi(L){const v=sum(L,c=>c.value),p=sum(L,c=>c.paid),wc=L.filter(c=>c.cost),mg=wc.length?Math.round(100*(1-sum(wc,c=>c.cost)/sum(wc,c=>c.value))):'-';
  return `<div class="kpis">${[['Contracts',L.length],['Total value',m0(v)],['Collected',m0(p)],['Outstanding',m0(v-p)],...(ISADM()?[['Avg margin',mg=='-'?'-':mg+'%']]:[])].map(k=>`<div class="kpi"><small>${k[0]}</small><b>${k[1]}</b></div>`).join('')}</div>`}
function reportContract(id,mode){const c=S.contracts.find(x=>x.id==id);if(!c)return;
  if(!mode){const j=JSON.stringify(id);docChoice('Contract '+c.id,'reportContract('+j+',"c")','reportContract('+j+',"i")',[['Guarantee certificate','The 10 year guarantee with your terms, filled in with this customer, address, contract number and date.','docOpen("guarantee","c:'+String(id).replace(/[^\w-]/g,'')+'")'],['Fitting job sheet','For the fitters: site address, access, contacts, every opening and the sign-off.','reportJob('+j+')'],['Customer details','All phone numbers, emails and addresses on one page.','reportCust("contract",'+j+')']]);return}
  const bal=c.value-c.paid,addr=c.address||c.town||'',pays=c.pay||[],payT=pays.length?{h:['Date','Method','Amount'],r:pays.map(p=>[fdl(p.date),p.method||'',money(p.amt)]),foot:['Total paid','',money(sum(pays,p=>p.amt))]}:null;
  if(mode=='c'){printDoc('Contract '+c.id,c.product,[['Installation address',addr],['Survey',c.survey?fdl(c.survey):''],['Fitting date',c.fit?fdl(c.fit):'To be confirmed'],['Fitting team',c.fitter||'To be confirmed']],[],
      {customer:{name:c.name,address:addr,contact:c.soldBy&&c.soldBy!='Unassigned'?c.soldBy:''},kind:'Contract summary',ref:c.id,kpis:[['Contract value',money(c.value)],['Paid to date',money(c.paid)],['Balance',money(bal)]],money:{total:c.value,paid:c.paid},steps:ctrSteps(c),
       tables:payT?[{t:'Payments received',...payT}]:[],thanks:bal>0?'The balance of '+money(bal)+' is due on completion.':'Your contract is fully paid.'});return}
  const Ad=ISADM(),todo=CK.filter(k=>!(c.chk||{})[k]),mg=c.cost&&c.value?Math.round(100*(c.value-c.cost)/c.value)+'%':'';
  printDoc('Contract '+c.id,c.name+(c.product?' · '+c.product:''),[['Phone',telOf(c)],['Email',mailOf(c)],['Address',addr],['Stage',c.stage],['Sold by',c.soldBy],['Survey',c.survey?fdl(c.survey):''],['Ordered',c.order?fdl(c.order):''],['Fitting',c.fit?fdl(c.fit):''],['Fitter',c.fitter],...(Ad?[['Job cost',c.cost?money(c.cost):'']]:[]),['Still to do',todo.length?todo.join(', '):'Checklist complete'],['Notes',c.notes]],c.photos,
    {kind:'Contract sheet',ref:c.id,kpis:[['Value',money(c.value)],['Paid',money(c.paid)],['Balance',money(bal)],...(Ad&&mg?[['Margin',mg]]:[])],money:{total:c.value,paid:c.paid},steps:ctrSteps(c),tables:payT?[{t:'Payments',...payT}]:[],barcode:c.id})}
const fensaDue=c=>['Fitted','Complete'].includes(c.stage)&&c.fensaExported!='Yes'&&c.supplyOnly!='Yes'&&c.cancelled!='Yes';
/* ---- customer details sheet, contact list, fitter job sheet ---- */
const yn=v=>v=='Yes'?'Yes':v=='No'?'No':'';
function custGroups(r){const inv=r.invSame=='Different'?[r.invAddr,r.invPc].filter(Boolean).join(' '):'Same as home';
  return[{t:'Customer',r:[['Name',[r.title,r.name].filter(Boolean).join(' ')],['Company',r.company],['Dear',r.salutation],['Best contact',r.prefContact]]},
    {t:'Phone numbers',r:[['Mobile',r.mob1],['Mobile 2',r.mob2],['Home',r.home1],['Home 2',r.home2],['Work',r.work],...(!r.mob1&&!r.home1&&!r.work&&r.phone?[['Phone',r.phone]]:[])]},
    {t:'Email',r:[['Email',r.email1||r.email],['Email 2',r.email2]]},
    {t:'Home address',r:[['Address',r.homeAddr||r.address],['Town',r.town],['Postcode',r.homePc]]},
    {t:'Installation address',r:[['Address',siteOf(r)],['Access and parking',r.siteAccess]]},
    {t:'Invoice address',r:[['Address',inv]]},
    {t:'Marketing consent',r:[['Email',yn(r.gdprEmail)],['Text',yn(r.gdprSms)],['Phone',yn(r.gdprPhone)],['Post',yn(r.gdprPost)],['Given on',r.gdprDate?fdl(r.gdprDate):''],['How',r.gdprHow]]}]}
function reportCust(kind,id){const r=kind=='lead'?S.leads.find(x=>x.id==id):S.contracts.find(x=>x.id==id);if(!r)return;
  printDoc('Customer details',[r.title,r.name].filter(Boolean).join(' ')+(r.company?' · '+r.company:''),[],[],{kind:(kind=='lead'?'Lead ':'Contract ')+r.id,ref:r.id,groups:custGroups(r),
    post:kind=='contract'?`<h3>Job</h3><div class="dg one">${[['Work',r.product],['Stage',r.stage],['Fitting',r.fit?fdl(r.fit):''],['Fitter',r.fitter],['Salesperson',r.soldBy]].filter(x=>!blankV(x[1])).map(x=>`<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join('')}</div>`:''})}
function contactList(kind){const L=kind=='lead'?leadList():ctrList(),ph=r=>[r.mob1,r.mob2,r.home1,r.home2,r.work].filter(Boolean).join(' / ')||r.phone||'';
  printDoc((kind=='lead'?'Lead':'Customer')+' contact list',L.length+' '+(kind=='lead'?'leads':'contracts')+' in the current view',[],[],{kind:'Contact list',tables:[{t:'Contacts',h:['Ref','Name','Phone numbers','Email','Installation address'],r:L.map(r=>[r.id,[r.title,r.name].filter(Boolean).join(' '),ph(r),[r.email1||r.email,r.email2].filter(Boolean).join(' / '),siteOf(r)])}]})}
function reportJob(id){const c=S.contracts.find(x=>x.id==id);if(!c)return;const O=c.openings||[],L=c.lines||[],bal=c.value-c.paid,ph=[c.mob1,c.mob2,c.home1,c.home2,c.work].filter(Boolean),bad=O.filter(opSafe).length;
  printDoc('Fitting job sheet',[c.title,c.name].filter(Boolean).join(' ')+' · '+siteOf(c),[],c.photos,{kind:'Job '+c.id,ref:c.id,
    kpis:[['Fitting',c.fit?new Date(c.fit+'T00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}):'Not booked'],['Team',c.fitter||'-'],['Openings',O.length||'-'],['To collect',bal>0?money(bal):'Paid']],
    groups:[{t:'On site',r:[['Address',siteOf(c)],['Access and parking',c.siteAccess],['Work',c.product]]},{t:'Contact',r:[['Name',[c.title,c.name].filter(Boolean).join(' ')],...ph.map((p,i)=>['Phone'+(i?' '+(i+1):''),p]),['Email',c.email1||c.email]]}],
    pre:(c.flash?`<div class="call"><b>Note</b>${esc(c.flash)}</div>`:'')+(c.fitNotes?`<div class="call"><b>Fitting notes</b>${esc(c.fitNotes)}</div>`:'')+(bad?`<div class="call"><b>Safety glass</b>${bad} opening${bad==1?'':'s'} marked below need toughened or laminated glass. Check before fitting.</div>`:''),
    tables:[...(O.length?[{t:'Survey schedule',h:['Ref','Room','Type','W x H mm','Glass','Fire escape','Vents','Colour','Notes'],r:O.map(x=>[x.ref,x.room,x.type,(x.w||'?')+' x '+(x.h||'?'),opSafe(x)?'Needs safety glass ('+(x.glaz||'none')+')':x.glaz,x.esc,x.vents,x.col,x.notes])}]:[]),
      ...(L.length?[{t:'Products',h:['Code','Product','Qty','Location'],r:L.map(x=>[x.code,x.name,x.qty,x.loc])}]:[]),
      {t:'Sign-off',h:['Check','Done'],r:['Old frames removed and disposed of','Frames fixed, level and sealed','Glass and beads correct, safety glass where needed','Trickle vents and fire escape hinges fitted','All sashes and doors open, close and lock','Keys handed over','Site cleaned','Customer shown how to use and care for products'].map(x=>[x,'☐'])}],
    sign:true,barcode:c.id})}
/* project timeline for printed contracts: [label, date, done] */
function ctrSteps(c){const i=CSTAGES.indexOf(c.stage);return[['Contract signed',c.cdate?fd(c.cdate):'',true],['Survey',c.survey?fd(c.survey):'',i>=1],['Products ordered',c.order?fd(c.order):'',i>=2],['Fitting',c.fit?fd(c.fit):'',i>=4],['Complete','',i>=5]]}
function markFit(id){const c=S.contracts.find(x=>x.id==id);c.stage='Fitted';audit('Marked fitted',id,'');store();render();toast('Contract '+id+' marked as fitted')}

/* ---------------- service calls ---------------- */
const SVC_ST=['Open','Booked','Awaiting parts','Complete'],SVC_CAT=['Misted or broken glass','Lock, handle or hinge','Leak or water coming in','Draught','Door or window sticking','Damage','Keys','Roof or conservatory','Other'],SVC_PR=['Urgent','Normal','Low'];
const svcOpen=c=>c.status!='Complete',svcMine=c=>{const m=me();return !!m&&forPerson(m,c.fitter)};
const SVCV=()=>[['open','Open',svcOpen],['today','Visits Today',c=>svcOpen(c)&&c.visit==today()],['urgent','Urgent',c=>svcOpen(c)&&c.priority=='Urgent'],['parts','Awaiting Parts',c=>c.status=='Awaiting parts'],['nobook','Not Booked',c=>svcOpen(c)&&!c.visit],['mine','My Calls',c=>svcOpen(c)&&svcMine(c)],['done','Past Tickets',c=>!svcOpen(c)],['all','All',()=>true]];
/* at a glance: does the customer still owe money on their contract? */
const svcBal=c=>{const k=c.contract&&S.contracts.find(x=>x.id==c.contract);if(!k)return '';const b=(+k.value||0)-(+k.paid||0);return b>0?`<span class="tag r svb" title="Contract ${esc(k.id)} still has a balance">${m0(b)} owed</span>`:'<span class="tag g svb">Paid up</span>'};
const svcTag=s=>`<span class="tag ${s=='Complete'?'g':s=='Booked'?'':s=='Awaiting parts'?'n':'y'}">${esc(s||'Open')}</span>`;
function vService(){const U=UI.svc,V=SVCV(),f=(V.find(x=>x[0]==U.f)||V[0])[2],td=today(),O=S.calls.filter(svcOpen);
  const L0=S.calls.filter(c=>f(c)&&hit(c)).sort((a,b)=>svcOpen(b)-svcOpen(a)||SVC_PR.indexOf(a.priority)-SVC_PR.indexOf(b.priority)||String(a.visit||'9').localeCompare(String(b.visit||'9')));
  const L=L0,pg=paginate(U,L0);
  const k=(t,n,key,cls)=>`<button class="kpi ${cls||''}" ${A('setUI','svc.f',key)}><small>${t}</small><b>${n}</b></button>`;
  return `<div class="head"><div><h1>Service Calls</h1><span class="muted">${esc((V.find(x=>x[0]==U.f)||V[0])[1])}: ${L.length}</span></div><div class="tools"><button class="mini" ${A('svcDaySheet',td)}>Today's Day Sheet</button><button class="mini" onclick="svcReport()">Service Report</button><button class="btn" onclick="editCall()">New Service Call</button></div></div>
  <div class="subbar"><span class="sb-l">Show</span><div class="views">${V.map(([key,n,fn])=>`<button class="chip ${U.f==key?'on':''}" ${A('setUI','svc.f',key)}>${esc(n)} <i>${S.calls.filter(fn).length}</i></button>`).join('')}</div></div>
  <div class="kpis">${k('Open Calls',O.length,'open')}${k('Urgent',O.filter(c=>c.priority=='Urgent').length,'urgent',O.some(c=>c.priority=='Urgent')?'bad':'')}${k('Visits Today',O.filter(c=>c.visit==td).length,'today')}${k('Awaiting Parts',O.filter(c=>c.status=='Awaiting parts').length,'parts')}${k('Not Booked Yet',O.filter(c=>!c.visit).length,'nobook',O.some(c=>!c.visit)?'warn':'')}${k('Overdue Visits',O.filter(c=>c.visit&&c.visit<td).length,'open',O.some(c=>c.visit&&c.visit<td)?'bad':'')}</div>
  <div class="tw"><table class="ptb abt"><thead><tr><th>Ref</th><th>Customer</th><th>Problem</th><th>Priority</th><th>Status</th><th class="c-sm">Visit</th><th class="c-md">Engineer</th><th class="ac"></th></tr></thead><tbody>
  ${pg.rows.map(c=>`<tr class="clk-r" ${RC('editCall',c.id)}><td><b class="lref">${esc(c.id)}</b>${c.contract?`<small class="sub">${esc(c.contract)}</small>`:''}</td><td><b>${esc(c.name)}</b><small class="sub">${esc([c.town,c.phone].filter(Boolean).join(' · '))}</small>${svcBal(c)}</td><td><span class="cl2">${esc(c.issue)}</span><small class="sub">${esc(c.cat||'')}${c.cat&&c.photos&&c.photos.length?' · ':''}${phCount(c.photos)}</small></td><td>${prTag(c.priority)}</td><td>${svcTag(c.status)}</td><td class="c-sm">${c.visit?`<b class="${svcOpen(c)&&c.visit<td?'od':''}">${fd(c.visit)}</b>${c.visitTime?`<small class="sub">${esc(c.visitTime)}</small>`:''}`:'<span class="muted">Not booked</span>'}</td><td class="c-md">${esc(c.fitter||'-')}</td><td class="ac"><div class="acts r"><button class="mini" ${A('reportCall',c.id)}>Report</button>${ISOWN()?`<button class="mini del" ${A('del','calls',c.id)}>Delete</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="8" class="empty">No service calls here.</td></tr>'}
  </tbody></table></div>${pagerH('svc',pg,'calls')}`}
/* the call sheet: who rang, what is wrong, who is going, what was done */
const SVCF=()=>[{t:'h',l:'The Call'},{k:'existing',l:'Existing customer?',t:'select',o:['Yes, we fitted it','No, new customer'],req:1,w:'full'},{k:'takenBy',l:'Call taken by',t:'select',o:['',...staffNames().filter(Boolean)],req:1},{k:'takenAt',l:'Date taken',t:'date',req:1},{k:'takenTime',l:'Time taken',t:'time'},
  {k:'contract',l:'Contract number',max:30,list:'dlCon',hint:'Type the number or pick the customer: their details fill in'},{k:'name',l:'Customer',req:1},{k:'phone',l:'Phone',t:'tel',max:30,hint:'Needed for a new customer'},{k:'email',l:'Email',t:'email'},{k:'address',l:'Address',w:'full',max:200,hint:'Needed for a new customer'},{k:'town',l:'Town',hint:'Needed for a new customer'},
  {t:'h',l:'The Problem'},{k:'cat',l:'Type of problem',t:'select',o:['',...SVC_CAT],req:1},{k:'priority',l:'Priority',t:'select',o:SVC_PR},{k:'issue',l:'What is wrong (in their words)',t:'area',w:'full',req:1},{k:'guarantee',l:'Under guarantee?',t:'select',o:['','Yes','No','Not sure']},
  {t:'h',l:'The Visit'},{k:'fitter',l:'Service engineer attending',t:'select',o:['',...FITL()]},{k:'status',l:'Status',t:'select',o:SVC_ST},{k:'visit',l:'Visit date',t:'date'},{k:'visitTime',l:'Visit time',t:'time'},{k:'arrived',l:'Arrived on site',t:'time'},{k:'left',l:'Left site',t:'time'},
  {t:'h',l:'Work Done'},{k:'notes',l:'Work carried out',t:'area',w:'full'},{k:'parts',l:'Parts used or ordered',t:'area',w:'full',max:400},{k:'followUp',l:'Another visit needed?',t:'select',o:['','No','Yes']},{k:'followNote',l:'What the next visit is for',max:200},
  {k:'charge',l:'Charge to customer (£)',t:'number',hint:'Leave at 0 if covered by the guarantee'},{k:'signed',l:'Customer signed off?',t:'select',o:['','Yes','No']},{k:'doneAt',l:'Date completed',t:'date',hint:'Needed to close the call. It then moves to Past Tickets and stays on the contract history'}];
function editCall(id,cid){const c=S.calls.find(x=>x.id==id),k=S.contracts.find(x=>x.id==cid)||{};if(id&&!c)return;
  const v=c?{...c,existing:c.existing||(S.contracts.some(x=>x.id==c.contract)?'Yes, we fitted it':'No, new customer')}:{name:k.name||'',phone:telOf(k)||'',email:mailOf(k)||'',address:addrOf(k)||'',town:k.town||'',contract:k.id||'',priority:'Normal',status:'Open',takenBy:USER,takenAt:today(),takenTime:new Date().toTimeString().slice(0,5),guarantee:k.id?'Yes':'',existing:k.id?'Yes, we fitted it':'No, new customer'};
  form(c?'Service Call '+c.id:'New Service Call',SVCF(),v,o=>{const bad=(k,m)=>{const e=$('#f_'+k);if(e)fieldErr(e,m);return false};
    if(/^Yes/.test(o.existing)){const x=S.contracts.find(z=>z.id==o.contract.trim());if(!x)return bad('contract','Pick the contract for this customer');o.contract=x.id}
    else{if(!o.phone)return bad('phone','Add a phone number for a new customer');if(!o.address)return bad('address','Add the address for a new customer');if(!o.town)return bad('town','Add the town for a new customer')}
    if(o.status=='Complete'&&!o.doneAt)return bad('doneAt','Enter the date the work was completed');if(o.status!='Complete')o.doneAt='';if(o.visit&&o.status=='Open')o.status='Booked';
    if(c){Object.assign(c,o);audit('Service call edited',c.id,o.status)}else{const n={id:nid('S',S.calls),...o};S.calls.unshift(n);audit('Service call added',n.id,o.name)}},'Up to 8 photos. They print with the service report and stay on the call.','lg');
  setTimeout(()=>{const g=$('#mbox .grid');if(g&&!$('#dlCon'))g.insertAdjacentHTML('beforeend',`<datalist id="dlCon">${S.contracts.map(x=>`<option value="${esc(x.id)}">${esc([x.name,x.town].filter(Boolean).join(', '))}</option>`).join('')}</datalist>`);
    const ex=$('#f_existing'),cw=$('#f_contract')&&$('#f_contract').closest('.ff'),sync=()=>{if(cw)cw.hidden=!/^Yes/.test(ex.value)};if(ex){ex.addEventListener('change',sync);sync()}},20);
  setTimeout(()=>{const ct=$('#f_contract');if(ct)ct.addEventListener('change',()=>{const x=S.contracts.find(z=>z.id==ct.value.trim());if(!x)return;[['name',x.name],['phone',telOf(x)],['email',mailOf(x)],['address',addrOf(x)],['town',x.town]].forEach(([f,val])=>{const e=$('#f_'+f);if(e&&!e.value&&val)e.value=val});const g=$('#f_guarantee');if(g&&!g.value)g.value='Yes';toast('Filled in from contract '+x.id)})},30)}
function reportCall(id,mode){const c=S.calls.find(x=>x.id==id);if(!c)return;const j=JSON.stringify(id);
  if(!mode){docChoice('Service Call '+c.id,'reportCall('+j+',"c")','reportCall('+j+',"i")');return}
  const when=c.visit?fdl(c.visit)+(c.visitTime?' at '+c.visitTime:''):'To be arranged',onsite=c.arrived?c.arrived+(c.left?' to '+c.left:''):'';
  if(mode=='c'){printDoc('Service Visit Report',c.status=='Complete'?'Work completed':'Visit '+when,[['Your contract',c.contract],['Problem reported',c.issue],['Type of problem',c.cat],['Visit',when],['Engineer',c.fitter||'To be confirmed'],['Work carried out',c.notes||'To be completed on the visit'],['Parts',c.parts],['Another visit',c.followUp=='Yes'?(c.followNote||'Yes, we will be in touch to book it'):''],['Charge',+c.charge>0?money(c.charge):c.guarantee=='Yes'?'Covered by your guarantee':''],['Status',c.status]],c.photos,{customer:{name:c.name,address:[c.address,c.town].filter(Boolean).join(', ')},kind:'Service visit',ref:c.id,sign:true,thanks:'If the problem comes back or anything else needs attention, call us and quote reference '+c.id+'.'});return}
  printDoc('Service Call '+c.id,c.name+(c.town?' · '+c.town:''),[['Phone',c.phone],['Address',[c.address,c.town].filter(Boolean).join(', ')],['Contract',c.contract],['Call taken',[c.takenAt?fd(c.takenAt):'',c.takenTime,c.takenBy?'by '+c.takenBy:''].filter(Boolean).join(' ')],['Type of problem',c.cat],['Problem',c.issue],['Under guarantee',c.guarantee],['Visit',when],['Engineer',c.fitter],['On site',onsite],['Work done',c.notes],['Parts',c.parts],['Another visit',c.followUp=='Yes'?c.followNote||'Yes':c.followUp],['Charge',+c.charge>0?money(c.charge):''],['Customer signed off',c.signed],['Completed',c.doneAt?fd(c.doneAt):'']],c.photos,{kind:'Service sheet',ref:c.id,kpis:[['Priority',c.priority],['Status',c.status],['Engineer',c.fitter||'-']],sign:true,barcode:c.id})}
/* printable list of every visit on a day, one table per engineer */
function svcDaySheet(d){d=SAFE.date(d)||today();const V=S.calls.filter(c=>c.visit==d&&svcOpen(c)).sort((a,b)=>String(a.visitTime||'99').localeCompare(String(b.visitTime||'99')));
  if(!V.length){toast('No service visits booked for '+fd(d));return}const G={};V.forEach(c=>{(G[c.fitter||'No engineer yet']=G[c.fitter||'No engineer yet']||[]).push(c)});
  printDoc('Engineer Day Sheet',fdl(d),[],[],{kind:'Day sheet',sections:Object.entries(G).map(([e,L])=>({t:e+' ('+L.length+' visit'+(L.length>1?'s':'')+')',kpis:[],bars:[],tables:[{t:'Visits',h:['Time','Ref','Customer','Address','Phone','Problem','Priority','Parts'],r:L.map(c=>[c.visitTime||'-',c.id,c.name,[c.address,c.town].filter(Boolean).join(', '),c.phone||'',c.issue,c.priority,c.parts||''])}]}))});audit('Day sheet printed','Service',fd(d))}
function svcReport(){const d=R.service();printDoc('Service Report',new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}),[],[],{kind:'Report',sections:[d]})}

/* ---------------- contact book ---------------- */
function vContacts(){const F=UI.con.f,L=S.contacts.filter(c=>(F=='all'||c.type==F)&&hit(c)).sort((a,b)=>(a.co||a.name||'').localeCompare(b.co||b.name||'')),letter=c=>{const x=((c.co||c.name||'#').trim()[0]||'#').toUpperCase();return /[A-Z]/.test(x)?x:'#'};
  const have=new Set(L.map(letter)),AZ=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ','#'];let last='';
  const card=c=>`<div class="cc2 clk-r" ${RC('editContact',c.id)}><div class="cc2-h"><span class="cav" style="--h:${[...(c.co||c.name||'?')].reduce((a,x)=>a+x.charCodeAt(0),0)%360}">${esc(initials(c.co||c.name))}</span><div><b>${esc(c.co||c.name)}</b><small>${esc([c.name&&c.name!=c.co?c.name:'',c.role].filter(Boolean).join(' · ')||' ')}</small></div><span class="tag">${esc(c.type||'')}</span></div>
    <div class="cc2-b">${conPhones(c).map(p=>`<a class="nocap" href="${esc(telHref(p.n))}">${svg('M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2')}<span class="cpl">${esc(p.t)}</span>${esc(p.n)}</a>`).join('')}${c.email?`<a class="nocap" href="mailto:${esc(c.email)}">${svg('M4 6h16v12H4zM4 7l8 6 8-6')}${esc(c.email)}</a>`:''}${c.email2?`<a class="nocap" href="mailto:${esc(c.email2)}">${svg('M4 6h16v12H4zM4 7l8 6 8-6')}<span class="cpl">Accounts</span>${esc(c.email2)}</a>`:''}${c.addr||c.town||c.pc?`<span>${svg('M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z')}${esc([c.addr,c.town,c.pc].filter(Boolean).join(', '))}</span>`:''}${!c.phone&&!c.email&&!c.addr?'<span class="muted">No details yet</span>':''}</div>
    <div class="cc2-f"><button class="mini" ${A('editContact',c.id)}>Edit</button>${ISOWN()?`<button class="mini del" ${A('del','contacts',c.id)}>Delete</button>`:''}</div></div>`;
  return `<div class="head"><div><h1>Contact Book</h1><span class="muted">${L.length} of ${S.contacts.length} contacts</span></div><div class="tools">${ISOWN()?'<button class="btn ghost" onclick="impCust()">Import customers</button>':''}<button class="btn" onclick="editContact()">New contact</button></div></div>
  <div class="subbar"><span class="sb-l">Show</span><div class="views">${['all',...CT].map(k=>`<button class="chip ${F==k?'on':''}" ${A('setUI','con.f',k)}>${k=='all'?'All':esc(k)} <i>${k=='all'?S.contacts.length:S.contacts.filter(c=>c.type==k).length}</i></button>`).join('')}</div></div>
  <div class="azbar">${AZ.map(x=>have.has(x)?`<button ${A('azGo',x)}>${x}</button>`:`<span>${x}</span>`).join('')}</div>
  <div class="cbook">${L.map(c=>{const x=letter(c),hd=x!=last?(last=x,`<div class="az2" id="az-${x=='#'?'0':x}">${x}</div>`):'';return hd+card(c)}).join('')||emptyArt('team','No contacts match.')}</div>`}
function azGo(x){const e=document.getElementById('az-'+(x=='#'?'0':x));if(e)e.scrollIntoView({behavior:'smooth',block:'start'})}
/* ---- contact window: tidy two-column layout, any number of labelled phone numbers ----
   c.phones=[{t:'Office',n:'01632 ...'}]; c.phone mirrors the first one (used by lists, suppliers, search) */
const CPH=['Office','Mobile','Direct DDI','Accounts','Sales rep','Orders','Out of hours'],CPH_ALL=[...CPH,'Fax','Home'];
const conPhones=c=>Array.isArray(c&&c.phones)&&c.phones.length?c.phones.filter(p=>p&&p.n):c&&c.phone?[{t:'Office',n:c.phone}]:[];
const telHref=n=>'tel:'+String(n).replace(/[^\d+]/g,'');
function cphRow(p){const t=p&&p.t||'';return `<div class="cphr"><select aria-label="Number type">${(t&&!CPH.includes(t)?[t,...CPH]:CPH).map(x=>`<option${x==t?' selected':''}>${esc(x)}</option>`).join('')}</select><input type="tel" inputmode="tel" maxlength="30" placeholder="Phone number" aria-label="Phone number" value="${esc(p&&p.n||'')}"><button type="button" class="cphx" title="Remove this number" aria-label="Remove this number">&times;</button></div>`}
/* always one empty row at the end: the next box only appears once the last one is filled */
function cphTidy(){const box=$('#cphs');if(!box)return;const rows=[...box.querySelectorAll('.cphr')];
  rows.forEach((r,i)=>{if(i<rows.length-1&&!r.querySelector('input').value.trim()&&rows.length>1&&document.activeElement!=r.querySelector('input'))r.remove()});
  const R=[...box.querySelectorAll('.cphr')],last=R[R.length-1];
  if(!last||last.querySelector('input').value.trim()){const used=R.map(r=>r.querySelector('select').value);box.insertAdjacentHTML('beforeend',cphRow({t:CPH.find(x=>!used.includes(x))||'Office'}))}
  [...box.querySelectorAll('.cphr')].forEach((r,i,a)=>{r.querySelector('.cphx').hidden=a.length<2||(i==a.length-1&&!r.querySelector('input').value.trim())})}
/* which boxes must be filled in depends on the type: a customer needs email and address, a company needs its name and a job title */
const cReq=t=>({type:1,co:t!='Customer',name:1,role:t!='Customer',email:t=='Customer',addr:t=='Customer',town:t=='Customer',pc:t=='Customer'});
function cReqDraw(){const t=($('#c_type')||{}).value||'Supplier',R=cReq(t);$$('#mbox [data-rq]').forEach(s=>{s.innerHTML=R[s.dataset.rq]?MARK(1):''})}
function editContact(id,draft,after){const c=S.contacts.find(x=>x.id==id),v=draft||(c?{...c,phones:conPhones(c)}:{type:'Supplier',phones:[]});
  const fld=(k,l,o={})=>`<div class="ff ${o.w||''}"><label for="c_${k}">${esc(l)}<span data-rq="${k}"></span>${MARK(0,o.adm)}</label>${o.sel?`<select id="c_${k}">${o.sel.map(x=>`<option${x==(v[k]||'')?' selected':''}>${esc(x)}</option>`).join('')}</select>`:o.area?`<textarea id="c_${k}" rows="2" maxlength="${o.max||600}">${esc(v[k]||'')}</textarea>`:`<input id="c_${k}" type="${o.t||'text'}" maxlength="${o.max||120}" value="${esc(v[k]||'')}" autocomplete="off"${o.ph?` placeholder="${esc(o.ph)}"`:''}${o.t=='email'||k=='web'?' class="nocap"':''}>`}</div>`;
  openModal(`<button class="mx" onclick="closeModal()" aria-label="Close">&times;</button><h2>${c?'Edit Contact':'New Contact'}</h2>
   <div class="cform">
    <section><h3>Who</h3><div class="grid">${fld('type','Type',{sel:CT})}${fld('co','Company',{max:80})}${fld('name','Contact name',{max:60})}${fld('role','Job title',{max:60})}</div></section>
    <section><h3>Phone Numbers <small>At least one *</small></h3><div id="cphs" class="cphs">${v.phones.map(cphRow).join('')}</div><p class="hint">Pick what each number is for. Another box appears when you fill one in.</p></section>
    <section><h3>Email And Web</h3><div class="grid">${fld('email','Main email',{t:'email'})}${fld('email2','Accounts email',{t:'email'})}${fld('web','Website',{w:'full',max:200,ph:'https://'})}</div></section>
    <section><h3>Address</h3><div class="grid">${fld('addr','Address',{w:'full',max:200})}${fld('town','Town',{max:60})}${fld('pc','Postcode',{max:10})}</div></section>
    <section><h3>Notes</h3>${fld('notes','Notes',{area:1,w:'full'})}</section>
   </div>
   <div class="mact"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" id="saveBtn">${c?'Save changes':'Add contact'}</button></div>`,'md');
  const tsel=$('#c_type');tsel.previousElementSibling.querySelector('[data-rq]').innerHTML=MARK(1);tsel.addEventListener('change',cReqDraw);cReqDraw();
  const box=$('#cphs');cphTidy();
  box.addEventListener('input',cphTidy);box.addEventListener('focusout',()=>setTimeout(cphTidy,0));
  box.addEventListener('click',e=>{const x=e.target.closest('.cphx');if(!x)return;x.closest('.cphr').remove();cphTidy()});
  $('#saveBtn').onclick=()=>{const g=k=>($('#c_'+k).value||'').trim(),o={co:SAFE.text(g('co'),80),type:CT.includes(g('type'))?g('type'):'Other',name:SAFE.text(g('name'),60),role:SAFE.text(g('role'),60),email:g('email').toLowerCase(),email2:g('email2').toLowerCase(),web:SAFE.url(g('web'))?SAFE.text(g('web'),200):'',addr:SAFE.text(g('addr'),200),town:SAFE.text(g('town'),60),pc:SAFE.text(g('pc'),10).toUpperCase(),notes:SAFE.text(g('notes'),600)};
    o.phones=[...$$('#cphs .cphr')].map(r=>({t:CPH_ALL.includes(r.querySelector('select').value)?r.querySelector('select').value:'Office',n:SAFE.text(r.querySelector('input').value,30)})).filter(p=>p.n);
    const bad=(m,k)=>{toast(m);const e=k?$('#c_'+k):$('#cphs input');e&&e.focus();return false};
    const R=cReq(o.type);if(R.co&&!o.co)return bad('Company name is required','co');if(!o.name)return bad('Contact name is required','name');if(R.role&&!o.role)return bad('Job title is required','role');
    if(!o.co)o.co=o.name;
    if(!o.phones.length)return bad('Add at least one phone number');
    const wrong=o.phones.find(p=>!/^[\d +()-]{6,30}$/.test(p.n)||(p.n.match(/\d/g)||[]).length<6);if(wrong)return bad(wrong.n+' does not look like a phone number');
    if(o.email&&!SAFE.email(o.email))return bad('Main email does not look like an email address','email');
    if(o.email2&&!SAFE.email(o.email2))return bad('Accounts email does not look like an email address','email2');
    if(o.web&&!SAFE.url(o.web))return bad('The website must start with https://','web');
    if(R.email&&!o.email)return bad('Main email is required for a customer','email');if(R.addr&&!o.addr)return bad('Address is required for a customer','addr');if(R.town&&!o.town)return bad('Town is required for a customer','town');if(R.pc&&!o.pc)return bad('Postcode is required for a customer','pc');
    o.phone=o.phones[0].n;
    const go=()=>{const oldCo=c?c.co:o.co;if(c)Object.assign(c,o);else S.contacts.push({id:shortId('K'),...o});if((c||o).type=='Supplier'||S.suppliers.some(s=>s.name.toLowerCase()==String(oldCo).toLowerCase()))supFromContact(oldCo,c||o);audit(c?'Contact edited':'Contact added',o.co,'')};
    const done=()=>{store();render();if(after)after(o.co);else doneIn('Contact saved')};
    if(!ISOWN()){closeModal();askYes(c?'Save changes to '+(c.co||'this contact')+'?':'Add '+o.co+' to the contact book?',c?'The contact details will be updated for everyone'+(S.suppliers.some(s=>s.name.toLowerCase()==String(c.co).toLowerCase())?', and on the supplier page too.':'.'):'Everyone will be able to see this contact.','Yes, save',()=>{go();done()},false,()=>editContact(id,o,after));return}
    go();done()}}
function impCust(){let n=0;S.contracts.forEach(c=>{if(!S.contacts.some(k=>k.co==c.name)){n++;S.contacts.push({id:shortId('K'),co:c.name,name:c.name,role:'Contract '+c.id,type:'Customer',phone:c.phone||'',email:c.email||'',addr:c.address||c.town})}});audit('Customers imported','Contact book',n+' added');store();render();toast(n+' customer'+(n==1?'':'s')+' added')}
