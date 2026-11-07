/* ==========================================================================
   07 · Sales & service: leads, contracts, service calls, contact book
   ========================================================================== */
const nid=(p,a)=>p=='S'?'S-'+String(Math.max(0,...a.map(x=>parseInt(String(x.id).split('-')[1])||0))+1).padStart(4,'0'):String(Math.max(p=='C'?2400000:1000,...a.map(x=>parseInt(x.id)||0))+1);
function del(k,id){if(k=='staff'&&!need(ISOWN,'Removing staff'))return;if(k=='fin'&&!need(ISADM,'Deleting bills'))return;
  if(!confirm('Delete '+id+"? This can't be undone."))return;S[k]=S[k].filter(x=>x.id!=id);audit('Deleted',k+' '+id,'');store();closeModal();render()}

/* ---------------- leads ----------------
   Lead refs are L0001, L0002... A converted lead moves into its new contract
   (7-digit contract number) and leaves the lead list, so its L number is free
   to be given to the next new lead. */
/* staff categories (added after load so old saves get one too) */
(function staffCats(){let ch=0;(S.staff||[]).forEach(s=>{if(!SCATS.includes(s.cat)){s.cat=guessCat(s.role||'');ch=1}});if(ch)store()})();
const staffIn=c=>S.staff.filter(s=>s.cat==c).map(s=>s.name);
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
function delLead(id){if(!need(ISOWN,'Deleting leads'))return;const l=S.leads.find(x=>x.id==id);if(!l||!confirm('Delete lead '+id+' ('+l.name+')?'))return;S.leads=S.leads.filter(x=>x.id!=id);audit('Lead deleted',id,l.name);store();closeModal();render()}
/* convert: the lead becomes a contract with the next 7-digit number; its L number is freed */
function convertLead(id){const l=S.leads.find(x=>x.id==id);if(!l)return;if(!canSee('contracts')){toast('Your account cannot create contracts');return}const cn=nid('C',S.contracts);
  form('Convert '+l.id+' to Contract '+cn,[{k:'name',l:'Customer',req:1},{k:'phone',l:'Phone',t:'tel',max:30},{k:'email',l:'Email',t:'email'},{k:'address',l:'Installation address',w:'full',max:200},{k:'town',l:'Town'},{k:'product',l:'Product / work',w:'full',req:1},{k:'value',l:'Contract value (£)',t:'number',req:1,pos:1},{k:'paid',l:'Deposit paid (£)',t:'number'},{k:'stage',l:'Stage',t:'select',o:CSTAGES},{k:'fitter',l:'Fitter',t:'select',o:FITL()},{k:'survey',l:'Survey date',t:'date'},{k:'fit',l:'Fit date',t:'date'},{k:'notes',l:'Contract notes',t:'area',w:'full'}],
    {...l,address:siteOf(l),paid:0,stage:'Deposit due',fitter:FITL()[0],notes:'From lead '+l.id+(l.notes?'. '+l.notes:'')},o=>{
      const cust={};CUSTK.forEach(k=>{if(l[k]!=null&&l[k]!=='')cust[k]=l[k]});
      const c={id:nid('C',S.contracts),...cust,...o,email1:o.email||cust.email1,cdate:today(),soldBy:l.owner||USER,source:l.source,subSource:l.subSource,salesArea:l.branch,createdBy:USER,contractType:CTYPES[0],log:[{d:today(),t:'Contract created from lead '+l.id,by:USER}],lead:l.id,pay:[],photos:(l.photos||[]).slice(),chk:{'Quote signed':true},fromLead:{id:l.id,source:l.source,owner:l.owner,created:l.created,log:l.log||[]}};
      if(o.paid>0){c.pay.push({amt:o.paid,date:today(),method:'Deposit',note:'Taken at conversion'});c.chk['Deposit received']=true}
      if(o.phone&&o.phone!=telOf(l))c.mob1=o.phone;if(o.address&&o.address!=siteOf(l)){c.siteSame='Different';c.siteAddr=o.address}custCompat(c);if(o.phone)c.phone=o.phone;if(o.address)c.address=o.address;S.contracts.unshift(c);S.leadArchive=S.leadArchive||[];S.leadArchive.push({...l,stage:'Won',convertedTo:c.id,convertedOn:today()});S.leads=S.leads.filter(x=>x.id!=l.id);
      audit('Lead converted',l.id,'Became contract '+c.id);setTimeout(()=>{toast(l.id+' is now contract '+c.id+'. '+l.id+' is free for a new lead.');go('contracts');openContract(c.id)},60)},false,'lg')}
function leadCsv(){csvDownload('broadland-leads-'+today()+'.csv',[['Ref','Customer','Phone','Email','Town','Product','Source','Owner','Stage','Value','Win %','Follow-up','Next step'],...S.leads.map(l=>[l.id,l.name,l.phone,l.email,l.town,l.product,l.source,l.owner||'',l.stage,l.value,leadProb(l),l.followup||'',l.next||''])])}

/* ---------------- contracts ---------------- */
const CK=['Survey booked','Survey done','Quote signed','Deposit received','Materials ordered','Delivery received','Fit booked','Fitted','Snagging clear','Final payment','Guarantee issued'];
const stTag=s=>`<span class="tag ${s=='Complete'||s=='Fitted'?'g':s=='Deposit due'?'y':''}">${esc(s)}</span>`;
function ckpi(L){const v=sum(L,c=>c.value),p=sum(L,c=>c.paid),wc=L.filter(c=>c.cost),mg=wc.length?Math.round(100*(1-sum(wc,c=>c.cost)/sum(wc,c=>c.value))):'-';
  return `<div class="kpis">${[['Contracts',L.length],['Total value',m0(v)],['Collected',m0(p)],['Outstanding',m0(v-p)],...(ISADM()?[['Avg margin',mg=='-'?'-':mg+'%']]:[])].map(k=>`<div class="kpi"><small>${k[0]}</small><b>${k[1]}</b></div>`).join('')}</div>`}
function reportContract(id,mode){const c=S.contracts.find(x=>x.id==id);if(!c)return;
  if(!mode){docChoice('Contract '+c.id,'reportContract('+JSON.stringify(id)+',"c")','reportContract('+JSON.stringify(id)+',"i")');return}
  if(mode=='c'){const bal=c.value-c.paid;
    printDoc('Your Contract Summary',c.product,[['Contract number',c.id],['Product',c.product],['Installation address',c.address||c.town||'-'],['Survey date',fd(c.survey)],['Fitting date',c.fit?fdl(c.fit):'To be confirmed'],['Fitting team',c.fitter||'To be confirmed']],[],
      {customer:{name:c.name,address:c.address||c.town,contact:USER},kind:'Contract Summary',ref:'CON-'+c.id,kpis:[['Contract value',money(c.value)],['Paid to date',money(c.paid)],['Balance remaining',money(bal)]],
       tables:(c.pay||[]).length?[{t:'Payments received',h:['Date','Method','Amount'],r:c.pay.map(p=>[fdl(p.date),p.method,money(p.amt)])}]:[],
       thanks:bal>0?'The remaining balance of '+money(bal)+' is due before or on completion. If you have any questions, just call us.':'Your contract is fully paid. Thank you!'});return}
  printDoc('Contract '+c.id,c.name,[['Contract No.',c.id],['Customer',c.name],['Phone',c.phone||'-'],['Email',c.email||'-'],['Address',c.address||c.town],['Product',c.product],...(ISADM()?[['Job Cost',money(c.cost)],['Margin',c.cost&&c.value?Math.round(100*(c.value-c.cost)/c.value)+'%':'n/a']]:[]),['Survey / Order',fd(c.survey)+' / '+fd(c.order)],['Fit Date',fd(c.fit)],['Fitter',c.fitter],['Checklist',CK.filter(k=>(c.chk||{})[k]).length+' of '+CK.length+' done'],['Notes',c.notes||'-']],c.photos,{kind:'Contract Sheet',ref:'CON-'+c.id,kpis:[['Value',money(c.value)],['Paid',money(c.paid)],['Balance',money(c.value-c.paid)],['Stage',c.stage]],tables:(c.pay||[]).length?[{t:'Payments',h:['Date','Method','Note','Amount'],r:c.pay.map(p=>[fd(p.date),p.method,p.note||'',money(p.amt)])}]:[],barcode:c.id})}
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
  if(mode=='c'){printDoc('Service Visit Report',c.status=='Complete'?'Work completed':'Visit '+(c.visit?fdl(c.visit):'to be arranged'),[['Reference',c.id],['Your contract',c.contract||'-'],['Issue reported',c.issue],['Visit date',c.visit?fdl(c.visit):'To be arranged'],['Engineer',c.fitter||'To be confirmed'],['Work carried out',c.notes||'To be completed on the visit'],['Status',c.status]],c.photos,{customer:{name:c.name,address:c.town,contact:USER},kind:'Service Visit',ref:c.id,sign:true,thanks:'If the problem comes back or anything else needs attention, call us and quote reference '+c.id+'.'});return}
  printDoc('Service Call '+c.id,c.name,[['Customer',c.name],['Town',c.town],['Contract',c.contract],['Issue',c.issue],['Visit',fd(c.visit)],['Fitter',c.fitter],['Work Done / Notes',c.notes||'-']],c.photos,{kind:'Service Sheet',ref:c.id,kpis:[['Priority',c.priority],['Status',c.status]],sign:true,barcode:c.id})}

/* ---------------- contact book ---------------- */
function vContacts(){let last='';const F=UI.con.f,L=S.contacts.filter(c=>(F=='all'||c.type==F)&&hit(c)).sort((a,b)=>(a.co||'').localeCompare(b.co||'')||(a.name||'').localeCompare(b.name||''));
  return `<div class="head"><h1>Contact Book</h1><div class="tools"><button class="btn ghost" onclick="impCust()">Import customers</button><button class="btn" onclick="editContact()">New contact</button></div></div>
  <div class="chips">${['all',...CT].map(k=>`<button class="chip ${F==k?'on':''}" ${A('setUI','con.f',k)}>${k=='all'?'All':esc(k)}</button>`).join('')}</div>
  <div class="book">${L.map(c=>{const ch=(c.co||'?')[0].toUpperCase(),hd=ch!=last?(last=ch,`<div class="az">${esc(ch)}</div>`):'';return hd+`<div class="cc"><div class="av">${esc(initials(c.co))}</div><div class="ci"><b>${esc(c.co)}</b><div>${esc(c.name)}${c.role?' &middot; '+esc(c.role):''}</div>${c.phone?`<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>`:''}${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:''}<div class="muted">${esc(c.addr||'')}</div><span class="tag">${esc(c.type)}</span></div><div class="acts" style="flex-direction:column"><button class="mini" ${A('editContact',c.id)}>Edit</button><button class="mini del" ${A('del','contacts',c.id)}>Delete</button></div></div>`}).join('')||'<p class="empty">No contacts match.</p>'}</div>`}
function editContact(id){const c=S.contacts.find(x=>x.id==id);
  form(c?'Edit Contact':'New Contact',[{k:'co',l:'Company',w:'full',req:1},{k:'name',l:'Contact name'},{k:'role',l:'Role'},{k:'type',l:'Type',t:'select',o:CT},{k:'phone',l:'Phone',t:'tel',max:30},{k:'email',l:'Email',t:'email',w:'full'},{k:'addr',l:'Address / town',w:'full',max:200}],c||{type:'Supplier'},o=>{if(c)Object.assign(c,o);else S.contacts.push({id:shortId('K'),...o});audit(c?'Contact edited':'Contact added',o.co,'')})}
function impCust(){let n=0;S.contracts.forEach(c=>{if(!S.contacts.some(k=>k.co==c.name)){n++;S.contacts.push({id:shortId('K'),co:c.name,name:c.name,role:'Contract '+c.id,type:'Customer',phone:c.phone||'',email:c.email||'',addr:c.address||c.town})}});audit('Customers imported','Contact book',n+' added');store();render();toast(n+' customer'+(n==1?'':'s')+' added')}
