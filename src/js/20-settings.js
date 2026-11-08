/* ==========================================================================
   20 · Settings: my settings (everyone) and company settings (administrators)
   Company details live in S.co and are copied over the CO defaults at start-up,
   so printed documents, invoices and VAT sums all use them.
   ========================================================================== */
const SET_CO=[{k:'name',l:'Company name',req:1,w:'full',max:120},{k:'tel',l:'Main phone',t:'tel',max:30},{k:'web',l:'Website',max:120},
  {k:'em',l:'Sales email',t:'email',max:120},{k:'em2',l:'Second email',t:'email',max:120},{k:'addr',l:'Address',w:'full',max:200},
  {k:'vatNo',l:'VAT number',max:30},{k:'coNo',l:'Company number',max:30},{k:'fensa',l:'FENSA number',max:30}];
const SET_MONEY=[{k:'vat',l:'VAT rate for new contracts (%)',t:'select',o:['20','5','0']},{k:'depRes',l:'Deposit for home jobs (% of contract)',t:'number',max:100,dp:0},{k:'depCom',l:'Deposit for commercial jobs (% of contract)',t:'number',max:100,dp:0},
  {k:'terms',l:'Balance due (days after fitting)',t:'number',max:365,dp:0},{k:'invPrefix',l:'Invoice number starts with',max:12},
  {k:'bank',l:'Bank account name',max:80,w:'full'},{k:'sort',l:'Sort code',max:12},{k:'acct',l:'Account number',max:12}];
function coLoad(){S.co=S.co&&typeof S.co=='object'?S.co:{};Object.assign(CO,{vat:'20',depRes:20,depCom:25,terms:14,invPrefix:'INV-'},S.co);S.bugs=Array.isArray(S.bugs)?S.bugs:[];S.num=S.num&&typeof S.num=='object'?S.num:{}}
function coEdit(title,F){if(!need(ISOWN,'Company settings'))return;
  form(title,F,{...CO},o=>{Object.keys(o).forEach(k=>{if(typeof o[k]=='string')o[k]=SAFE.text(o[k],200)});
    S.co=Object.assign(S.co||{},o);Object.assign(CO,o);audit('Company settings changed',title,F.map(f=>f.l.replace(/ \(.*\)/,'')).join(', '));toast(title+' saved')})}
function motionSet(on){try{localStorage.setItem('bb_rm',on?'1':'')}catch(e){}document.body.classList.toggle('rm',!!on)}
(function(){try{if(localStorage.getItem('bb_rm'))document.body.classList.add('rm')}catch(e){}})();
function vSettings(){const own=ISOWN(),p=S.profile||{},dark=document.body.dataset.theme=='dark',rm=document.body.classList.contains('rm');
  const row=(t,s,act)=>`<div class="set-r"><span><b>${esc(t)}</b>${s?`<small>${s}</small>`:''}</span><span class="set-a">${act}</span></div>`;
  const dl=(F)=>`<dl class="set-dl">${F.map(f=>`<div><dt>${esc(f.l.replace(/ \(.*\)/,''))}</dt><dd class="${/em|web/.test(f.k)?'nocap':''}">${esc(String(CO[f.k]??''))||'<span class="muted">Not set</span>'}</dd></div>`).join('')}</dl>`;
  return `<div class="head"><h1>Settings</h1></div>
  <div class="set">
   <section class="panel set-c"><h2><span class="set-ic">${svg(IC.user)}</span><span>My Settings</span></h2>
    ${row('My Details',esc([p.name,p.phone||p.mobile].filter(Boolean).join(' · '))||'Name and phone','<button class="btn ghost sm" data-act="editProfile">Edit</button>')}
    ${row('Light Or Dark','How the site looks for you',`<span class="seg"><button class="${dark?'':'on'}" ${A('setThR','light')}>Light</button><button class="${dark?'on':''}" ${A('setThR','dark')}>Dark</button></span>`)}
    ${row('Page Background And Greeting Box','Patterns and colours','<button class="btn ghost sm" data-act="lookOpen" data-stop="1">Change</button>')}
    ${row('Fewer Animations','Turns off movement and glow effects',`<label class="tsw"><input type="checkbox" ${rm?'checked':''} ${AC('onchange','motionSet','this.checked')}><span></span></label>`)}
    ${row('Help Tour','A short guide to the site','<button class="btn ghost sm" data-act="startTour">Start</button>')}
    ${row('Report A Problem','Something not working or looking wrong? Tell us here','<button class="btn sm" data-act="bugReport">Report</button>')}
    ${row('Account','Signed in as '+esc(ROLES[ROLE].n),'<button class="btn ghost sm" data-act="swRole">Switch</button>')}
   </section>
   ${own?`<section class="panel set-c"><h2><span class="set-ic">${svg(IC.contacts)}</span><span>Company Details</span><button class="btn sm" ${A('coEditK','co')}>Edit</button></h2>${dl(SET_CO)}<p class="muted set-n">Used on printed contracts, invoices and guarantees.</p></section>
   <section class="panel set-c"><h2><span class="set-ic">${svg(IC.finance)}</span><span>Money And Invoices</span><button class="btn sm" ${A('coEditK','money')}>Edit</button></h2>${dl(SET_MONEY)}</section>
   <section class="panel set-c"><h2><span class="set-ic">${svg(IC.admin)}</span><span>Security And Data</span></h2>
    ${row('Account PINs','Change the PIN for each account','<button class="btn ghost sm" data-act="chPin">Change</button>')}
    ${row('Backup','Download everything as one file','<button class="btn ghost sm" data-act="backupDl">Download</button>')}
    ${row('Restore','Load a backup file','<label class="btn ghost sm" style="cursor:pointer">Choose File<input type="file" accept=".json,application/json" hidden data-onchange="backupLoad" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]"></label>')}
    ${row('Review Scores','Google, Trustpilot, Trusted Trader, ReferenceLine','<button class="btn ghost sm" data-act="editRatings">Update</button>')}
    ${row('Admin Console','Approvals, audit trail and more',`<button class="btn ghost sm" ${A('go','admin')}>Open</button>`)}
    ${row('Photo Storage',`${phRefs().length} photos kept in their own store, so years of jobs stay quick`,'<button class="btn ghost sm" data-act="phTidyGo">Tidy Up</button>')}
   </section>
   <section class="panel set-c"><h2><span class="set-ic">${svg(IC.contracts)}</span><span>Numbering</span><button class="btn sm" data-act="numEdit">Change</button></h2>
    ${NUMS.map(([k,n])=>row(n,'Next one will be <b class="nocap">'+esc(numNext(k))+'</b>'+(S.num[k]?' (set by hand)':' (automatic)'),S.num[k]?`<button class="btn ghost sm" ${A('numReset',k)}>Reset</button>`:'')).join('')}
   </section>
   <section class="panel set-c"><h2><span class="set-ic">${svg(IC.reports)}</span><span>Export Data</span></h2>
    ${[['leads','Leads'],['contracts','Contracts'],['calls','Service Calls'],['deliveries','Deliveries'],['contacts','Contact Book'],['stock','Stock']].map(([k,n])=>row(n,'Spreadsheet (CSV) of every record',`<button class="btn ghost sm" ${A('csvAll',k)}>Export</button>`)).join('')}
    ${row('Everything','One backup file with all data and photos','<button class="btn ghost sm" data-act="backupDl">Download</button>')}
   </section>
   <section class="panel set-c set-w"><h2><span class="set-ic">${svg(IC.service)}</span><span>Reported Problems</span>${S.bugs.length?`<button class="btn ghost sm" ${A('csvAll','bugs')}>Export</button>`:''}</h2>
    ${S.bugs.map(b=>`<div class="set-r"><span><b>${esc(b.what.length>90?b.what.slice(0,90)+'…':b.what)}</b><small>${esc([b.id,b.where,b.sev,b.by,new Date(b.at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})].filter(Boolean).join(' · '))}${(b.photos||[]).length?' · '+(b.photos||[]).length+' photo'+((b.photos||[]).length>1?'s':''):''}</small></span><span class="set-a"><span class="tag ${b.status=='Fixed'?'g':b.status=='Open'?'y':'n'}">${esc(b.status)}</span><button class="btn ghost sm" ${A('bugView',b.id)}>Open</button></span></div>`).join('')||'<p class="muted">Nothing reported. Everyone can report a problem from My Settings.</p>'}
   </section>`:`<section class="panel set-c"><h2><span class="set-ic">${svg(IC.lock)}</span><span>Company Settings</span></h2><p class="muted">Company details, VAT and invoice settings are for administrators.</p><button class="btn ghost sm" data-act="swRole">Switch Account</button></section>`}
  </div>`}
/* ---- report a problem (everyone); administrators see the list ---- */
const BUG_SEV=['Small annoyance','Something does not work','It stops me working'];
function bugReport(){const views=Object.values(VIEWS).map(v=>v.t);
  form('Report A Problem',[{k:'where',l:'Where was it?',t:'select',o:['',...views,'Lead or contract window','Printing or reports','Something else'],req:1},{k:'sev',l:'How bad is it?',t:'select',o:BUG_SEV,req:1},{k:'what',l:'What went wrong?',t:'area',w:'full',max:1000,req:1,hint:'Say what you expected and what happened instead'},{k:'steps',l:'What were you doing just before?',t:'area',w:'full',max:600}],
    {where:(VIEWS[view]||{}).t||'',sev:BUG_SEV[1]},o=>{const n=S.bugs.reduce((m,b)=>Math.max(m,parseInt(String(b.id).slice(2))||0),0)+1,b={id:'P-'+String(n).padStart(3,'0'),at:Date.now(),by:USER,role:ROLE,status:'Open',...o};
      S.bugs.unshift(b);audit('Problem reported',b.id,o.what.slice(0,60))},'A screenshot or photo of the screen helps us fix it faster.')}
function bugView(id){if(!need(ISOWN,'Reported problems'))return;const b=S.bugs.find(x=>x.id==id);if(!b)return;
  form('Problem '+b.id,[{k:'status',l:'Status',t:'select',o:['Open','Being looked at','Fixed','Not a problem']},{k:'sev',l:'How bad',t:'select',o:BUG_SEV},{k:'where',l:'Where',ro:1},{k:'by',l:'Reported by',ro:1},{k:'what',l:'What went wrong',t:'area',w:'full',max:1000},{k:'steps',l:'What they were doing',t:'area',w:'full',max:600},{k:'reply',l:'Notes / what was done',t:'area',w:'full',max:600}],
    b,o=>{const was=b.status;Object.assign(b,o);audit('Problem updated',b.id,was!=o.status?was+' to '+o.status:'')},true);
  $('#mbox .mact').insertAdjacentHTML('afterbegin',`<button class="btn ghost l" style="color:var(--red)" ${A('bugDel',id)}>Delete</button>`)}
function bugDel(id){askIn('Delete this report?','It is removed for everyone.','Delete',()=>{S.bugs=S.bugs.filter(x=>x.id!=id);audit('Problem deleted',id,'');store();closeModal();render()},true)}
/* ---- numbering: set where new leads, contracts and service calls start from ---- */
const NUMS=[['lead','Lead numbers'],['contract','Contract numbers'],['call','Service call numbers']];
function numNext(k){return k=='lead'?nextLeadId():k=='contract'?nid('C',S.contracts):nid('S',S.calls)}
function numEdit(){if(!need(ISOWN,'Numbering'))return;
  form('Numbering',[{k:'lead',l:'Next lead number',t:'number',max:9999,dp:0,hint:'e.g. 50 gives L0050. Leave at 0 for automatic'},{k:'contract',l:'Next contract number',t:'number',max:9999999,dp:0,hint:'e.g. 2500001. Leave at 0 for automatic'},{k:'call',l:'Next service call number',t:'number',max:9999,dp:0,hint:'e.g. 1000 gives S-1000. Leave at 0 for automatic'}],
    {...S.num},o=>{const u=S.num;['lead','contract','call'].forEach(k=>{if(+o[k]>0)u[k]=+o[k];else delete u[k]});audit('Numbering changed','Settings',NUMS.map(([k,n])=>n+': '+(u[k]||'auto')).join(', '))})}
function numReset(k){if(!need(ISOWN,'Numbering'))return;delete S.num[k];audit('Numbering reset',k,'');store();render();toast('Back to automatic numbering')}
function phTidyGo(){if(!need(ISOWN,'Photo storage'))return;phTidy().then(n=>{toast(n?n+' unused photo'+(n>1?'s':'')+' removed':'Nothing to tidy');render(true)})}
/* ---- export any list as a spreadsheet ---- */
function csvAll(k){if(!need(ISOWN,'Exporting data'))return;const d=today();
  const T={leads:()=>{leadCsv();return null},
    contracts:()=>[['Contract','Date','Customer','Phone','Email','Address','Town','Postcode','Type','Stage','Value','Paid','Balance','Sold by','Fit date','Fitters'],...S.contracts.map(c=>[c.id,c.cdate||'',c.name,telOf(c),mailOf(c),c.homeAddr||c.address||'',c.town||'',c.homePc||'',c.contractType||'',c.stage||'',+c.value||0,+c.paid||0,(+c.value||0)-(+c.paid||0),c.soldBy||'',c.fit||'',c.fitter||''])],
    calls:()=>[['Ref','Taken','Taken by','Customer','Phone','Town','Contract','Problem','Type','Priority','Status','Visit','Engineer','Completed','Work done'],...S.calls.map(c=>[c.id,c.takenAt||'',c.takenBy||'',c.name,c.phone||'',c.town||'',c.contract||'',c.issue,c.cat||'',c.priority,c.status,c.visit||'',c.fitter||'',c.doneAt||'',c.notes||''])],
    deliveries:()=>[['Supplier','Items','Due','Status','Job','Received','Checked by','QC','Damaged','Damage'],...S.deliveries.map(x=>[x.supplier,x.items,x.due,dAuto(x),x.contract||'',x.recvDate||'',x.checkedBy||'',x.qc||'',x.damaged||'',x.damage||''])],
    contacts:()=>[['Company','Name','Type','Job title','Phone','Email','Address','Town','Postcode'],...S.contacts.map(c=>[c.co,c.name||'',c.type,c.role||'',c.phone||'',c.email||'',c.addr||'',c.town||'',c.pc||''])],
    stock:()=>[['Stock ID','Item','Length','Colour in','Colour out','Unit','Stock','Location','Supplier','Cost'],...products().map(r=>[r.pid,r.item,r.length,r.cInName,r.cOutName,unitOf(r),r.stock,r.location||'',r.supplier||'',r.cost||0])],
    bugs:()=>[['Ref','Reported','By','Where','How bad','Status','What','Before','Notes'],...S.bugs.map(b=>[b.id,new Date(b.at).toISOString().slice(0,10),b.by,b.where,b.sev,b.status,b.what,b.steps||'',b.reply||''])]};
  const rows=T[k]&&T[k]();if(!rows)return;csvDownload('broadland-'+k+'-'+d+'.csv',rows);audit('Data exported',k,rows.length-1+' rows')}
function coEditK(k){if(k=='co')coEdit('Company Details',SET_CO);else coEdit('Money And Invoices',SET_MONEY)}
function setThR(t){setTh(t);render(true)}

function lookOpen(){lookPop(true)}
