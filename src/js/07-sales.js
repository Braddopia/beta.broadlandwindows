/* ==========================================================================
   07 · Sales & service: leads, contracts, service calls, contact book
   ========================================================================== */
const nid=(p,a)=>p=='S'?'S-'+String(Math.max(0,...a.map(x=>parseInt(String(x.id).split('-')[1])||0))+1).padStart(4,'0'):String(Math.max(p=='C'?2400000:1000,...a.map(x=>parseInt(x.id)||0))+1);
/* deleting is admin-only, and only for these lists */
const DEL_RULE={contracts:[ISOWN,'Deleting contracts'],staff:[ISOWN,'Removing staff'],calls:[ISOWN,'Deleting service calls'],contacts:[ISOWN,'Deleting contacts'],fin:[ISADM,'Deleting bills']};
function del(k,id){const r=DEL_RULE[k];if(!r||!Array.isArray(S[k])||!need(r[0],r[1]))return;
  askYes('Delete '+id+'?','This cannot be undone.','Delete',()=>{S[k]=S[k].filter(x=>x.id!=id);audit('Deleted',k+' '+id,'');store();render()},true)}

/* ---------------- leads ----------------
   Lead refs are L0001, L0002... A converted lead moves into its new contract
   (7-digit contract number) and leaves the lead list, so its L number is free
   to be given to the next new lead. */
/* staff categories (added after load so old saves get one too) */
(function staffCats(){let ch=0;(S.staff||[]).forEach(s=>{if(!SCATS.includes(s.cat)){s.cat=guessCat(s.role||'');ch=1}});if(ch)store()})();
const staffIn=c=>S.staff.filter(s=>s.cat==c).map(s=>s.name);
const RANDOM_SP='Pick at random';
(function salesABC(){if(S.salesABC)return;['Sales B','Sales C'].forEach((n,i)=>{if(!S.staff.some(s=>s.name==n))S.staff.push({id:'U-S'+(i+2),name:n,role:'Sales consultant',team:'',phone:'07700 900 '+(610+i*7),email:n.toLowerCase().replace(' ','.')+'@example.com',start:'2025-03-0'+(i+3),allow:25,salary:30000,cat:'Salespeople'})});S.salesABC=1;store()})();
const OWNERS=()=>{const s=staffIn('Salespeople');return['Unassigned',...new Set(s.length?s:S.staff.map(x=>x.name))]};
const FITL=()=>[...new Set([...staffIn('Fitters'),...FIT])];
const PROB={New:10,Surveyed:30,Quoted:55,Won:90,Lost:0};
(function migrateLeads(){if(S.leadsV2)return;S.leadArchive=S.leadArchive||[];
  const conv=S.leads.filter(l=>l.contract);S.leadArchive.push(...conv.map(l=>({...l,convertedTo:(S.contracts.find(c=>c.lead==l.id)||{}).id||''})));
  let n=0;S.leads=S.leads.filter(l=>!l.contract).map(l=>{const old=l.id;l.id='L'+String(++n).padStart(4,'0');l.oldRef=old;S.contracts.forEach(c=>{if(c.lead==old)c.lead=l.id});return l});S.leadsV2=1;store()})();
function nextLeadId(){const used=new Set(S.leads.map(l=>l.id));let n=1;while(used.has('L'+String(n).padStart(4,'0')))n++;return 'L'+String(n).padStart(4,'0')}
const allLeads=()=>[...S.leads,...(S.leadArchive||[]).map(l=>({...l,stage:'Won'}))];
const leadProb=l=>l.prob!=null&&l.prob!==''?+l.prob:PROB[l.stage]??0;
const leadTag=s=>`<span class="tag fw ${s=='Won'?'g':s=='Lost'?'r':s=='Quoted'?'y':s=='New'?'n':''}">${esc(s)}</span>`;
function mvLead(id,d){const l=S.leads.find(x=>x.id==id),i=STAGES.indexOf(l.stage)+d;if(i<0||i>=STAGES.length)return;const a=l.stage;l.stage=STAGES[i];(l.log=l.log||[]).unshift({d:today(),t:'Stage: '+a+' to '+l.stage,by:USER});audit('Lead stage',l.id,a+' to '+l.stage);store();render()}
function delLead(id){if(!need(ISOWN,'Deleting leads'))return;const l=S.leads.find(x=>x.id==id);if(!l)return;askYes('Delete lead '+id+'?',l.name+' will be removed. This cannot be undone.','Delete lead',()=>{S.leads=S.leads.filter(x=>x.id!=id);audit('Lead deleted',id,l.name);store();render()},true)}
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
function vService(){const L=S.calls.filter(hit).sort((a,b)=>(a.status=='Complete')-(b.status=='Complete')||['Urgent','Normal','Low'].indexOf(a.priority)-['Urgent','Normal','Low'].indexOf(b.priority));
  return `<div class="head"><h1>Service Calls</h1><div class="tools"><button class="btn" onclick="editCall()">New service call</button></div></div>
  <div class="tw"><table><thead><tr><th>Ref</th><th>Customer</th><th>Issue</th><th>Priority</th><th>Status</th><th class="c-sm">Visit</th><th class="c-md">Fitter</th><th class="ac"></th></tr></thead><tbody>
  ${L.map(c=>`<tr><td><b>${esc(c.id)}</b><br><span class="muted">${esc(c.contract)}</span></td><td>${esc(c.name)}<br><span class="muted">${esc(c.town)}</span></td><td>${esc(c.issue)} ${phCount(c.photos)}</td><td>${prTag(c.priority)}</td><td><span class="tag ${c.status=='Complete'?'g':c.status=='Booked'?'':'y'}">${esc(c.status)}</span></td><td class="c-sm">${fd(c.visit)}</td><td class="c-md">${esc(c.fitter)}</td><td class="ac"><div class="acts r"><button class="mini" ${A('editCall',c.id)}>Edit</button><button class="mini" ${A('reportCall',c.id)}>Report</button><button class="mini del" ${A('del','calls',c.id)}>Delete</button></div></td></tr>`).join('')||'<tr><td colspan="8" class="empty">No service calls match.</td></tr>'}
  </tbody></table></div>`}
function editCall(id,cid){const c=S.calls.find(x=>x.id==id),k=S.contracts.find(x=>x.id==cid)||{};if(cid)go('service');
  form(c?'Edit '+c.id:'New Service Call',[{k:'name',l:'Customer',req:1},{k:'town',l:'Town'},{k:'contract',l:'Contract ref',max:30},{k:'fitter',l:'Fitter',t:'select',o:FITL()},{k:'issue',l:'Issue',t:'area',w:'full',req:1},{k:'priority',l:'Priority',t:'select',o:['Urgent','Normal','Low']},{k:'status',l:'Status',t:'select',o:['Open','Booked','Complete']},{k:'visit',l:'Visit date',t:'date'},{k:'notes',l:'Work done / notes',t:'area',w:'full'}],c||{name:k.name||'',town:k.town||'',contract:k.id||'',priority:'Normal',status:'Open',fitter:FIT[2]},o=>{if(c)Object.assign(c,o);else S.calls.unshift({id:nid('S',S.calls),...o});audit(c?'Service call edited':'Service call added',c?c.id:o.name,'')},true)}
function reportCall(id,mode){const c=S.calls.find(x=>x.id==id);if(!c)return;
  if(!mode){docChoice('Service Call '+c.id,'reportCall('+JSON.stringify(id)+',"c")','reportCall('+JSON.stringify(id)+',"i")');return}
  if(mode=='c'){printDoc('Service Visit Report',c.status=='Complete'?'Work completed':'Visit '+(c.visit?fdl(c.visit):'to be arranged'),[['Your contract',c.contract],['Issue reported',c.issue],['Visit date',c.visit?fdl(c.visit):'To be arranged'],['Engineer',c.fitter||'To be confirmed'],['Work carried out',c.notes||'To be completed on the visit'],['Status',c.status]],c.photos,{customer:{name:c.name,address:c.town},kind:'Service visit',ref:c.id,sign:true,thanks:'If the problem comes back or anything else needs attention, call us and quote reference '+c.id+'.'});return}
  printDoc('Service call '+c.id,c.name+(c.town?' · '+c.town:''),[['Contract',c.contract],['Issue',c.issue],['Visit',c.visit?fdl(c.visit):''],['Engineer',c.fitter],['Work done',c.notes]],c.photos,{kind:'Service sheet',ref:c.id,kpis:[['Priority',c.priority],['Status',c.status]],sign:true,barcode:c.id})}

/* ---------------- contact book ---------------- */
function vContacts(){let last='';const F=UI.con.f,L=S.contacts.filter(c=>(F=='all'||c.type==F)&&hit(c)).sort((a,b)=>(a.co||'').localeCompare(b.co||'')||(a.name||'').localeCompare(b.name||''));
  return `<div class="head"><h1>Contact Book</h1><div class="tools">${ISOWN()?'<button class="btn ghost" onclick="impCust()">Import customers</button>':''}<button class="btn" onclick="editContact()">New contact</button></div></div>
  <div class="chips">${['all',...CT].map(k=>`<button class="chip ${F==k?'on':''}" ${A('setUI','con.f',k)}>${k=='all'?'All':esc(k)}</button>`).join('')}</div>
  <div class="book">${L.map(c=>{const ch=(c.co||'?')[0].toUpperCase(),hd=ch!=last?(last=ch,`<div class="az">${esc(ch)}</div>`):'';return hd+`<div class="cc"><div class="av">${esc(initials(c.co))}</div><div class="ci"><b>${esc(c.co)}</b><div>${esc(c.name)}${c.role?' &middot; '+esc(c.role):''}</div>${c.phone?`<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>`:''}${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:''}<div class="muted">${esc(c.addr||'')}</div><span class="tag">${esc(c.type)}</span></div><div class="acts" style="flex-direction:column"><button class="mini" ${A('editContact',c.id)}>Edit</button>${ISOWN()?`<button class="mini del" ${A('del','contacts',c.id)}>Delete</button>`:''}</div></div>`}).join('')||'<p class="empty">No contacts match.</p>'}</div>`}
function editContact(id,draft){const c=S.contacts.find(x=>x.id==id);
  form(c?'Edit Contact':'New Contact',[{k:'co',l:'Company',w:'full',req:1},{k:'name',l:'Contact name'},{k:'role',l:'Role'},{k:'type',l:'Type',t:'select',o:CT},{k:'phone',l:'Phone',t:'tel',max:30},{k:'email',l:'Email',t:'email',w:'full'},{k:'addr',l:'Address / town',w:'full',max:200}],draft||c||{type:'Supplier'},o=>{const go=()=>{if(c)Object.assign(c,o);else S.contacts.push({id:shortId('K'),...o});audit(c?'Contact edited':'Contact added',o.co,'')};
    if(!ISOWN()){setTimeout(()=>askYes(c?'Save changes to '+(c.co||'this contact')+'?':'Add '+o.co+' to the contact book?',c?'The contact details will be updated for everyone.':'Everyone will be able to see this contact.','Yes, save',()=>{go();store();render();toast('Contact saved')},false,()=>editContact(id,o)),0);return false}go()})}
function impCust(){let n=0;S.contracts.forEach(c=>{if(!S.contacts.some(k=>k.co==c.name)){n++;S.contacts.push({id:shortId('K'),co:c.name,name:c.name,role:'Contract '+c.id,type:'Customer',phone:c.phone||'',email:c.email||'',addr:c.address||c.town})}});audit('Customers imported','Contact book',n+' added');store();render();toast(n+' customer'+(n==1?'':'s')+' added')}
