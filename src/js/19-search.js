/* ==========================================================================
   19 · Search: the main way to find anything and do anything
   - Top bar: type to see matching leads, contracts, service calls, contacts,
     suppliers, stock, staff and files (only what this account may see).
     The page you are on is still filtered too.
   - Ctrl+K (Cmd+K on a Mac) anywhere: a big centred search box.
   - Actions: type "new lead", "deliveries", "dark"... or start with ">" to
     see only actions (new records, go to a page, scan, look, tour).
   - The hint in the box cycles through real examples from your data.
   ========================================================================== */
/* every text value in a record, including phone/email lists; skips photos and files */
function srchText(o,d=0){if(o==null||d>3)return'';if(typeof o!='object')return typeof o=='string'&&(o.length>300||o.startsWith('data:'))?'':String(o);
  return Object.entries(o).filter(([k])=>!/^(photos|files|docs|sig|signature|pay|audit|appts|lines|ck)$/.test(k)).map(([,v])=>srchText(v,d+1)).join(' ')}
/* all words must appear; a number like "01632960014" also matches "01632 960 014" */
function srchMatch(txt,query){const t=txt.toLowerCase(),td=t.replace(/[\s()-]/g,'');
  return query.split(/\s+/).filter(Boolean).every(w=>t.includes(w)||(/^[\d+]{4,}$/.test(w)&&td.includes(w)))}
const SRCH=[
  ['leads','Leads',()=>allLeads(),l=>[l.name||'Lead '+l.id,['Lead '+l.id,l.stage,l.town,l.homePc].filter(Boolean).join(' · ')],l=>{const a=(S.leadArchive||[]).find(x=>x.id==l.id&&x.convertedTo);if(a&&!S.leads.some(x=>x.id==l.id))openContract(a.convertedTo);else openLead(l.id)}],
  ['contracts','Contracts',()=>S.contracts,c=>[c.name||'Contract '+c.id,['Contract '+c.id,c.stage,c.town].filter(Boolean).join(' · ')],c=>openContract(c.id)],
  ['service','Service Calls',()=>S.calls,c=>[c.name||c.id,[c.id,c.issue,c.status].filter(Boolean).join(' · ')],c=>editCall(c.id)],
  ['contacts','Contact Book',()=>S.contacts,c=>[c.co||c.name,[c.co?c.name:'',c.type,c.phone].filter(Boolean).join(' · ')],c=>editContact(c.id)],
  ['suppliers','Suppliers',()=>S.suppliers.map((x,i)=>({...x,_i:i})),x=>[x.name,[x.account,x.contact,x.phone].filter(Boolean).join(' · ')],x=>editSup(x._i)],
  ['stock','Inventory',()=>products(),r=>[r.item||r.pid,['Stock ID '+r.pid,r.supplier,r.location].filter(Boolean).join(' · ')],r=>viewItem(r.pid)],
  ['staff','Staff',()=>S.staff,s=>[s.name,[s.role,s.team].filter(Boolean).join(' · ')],s=>editStaff(s.id)],
  ['downloads','Files And Manuals',()=>{const H=S.fileHide||{};return[...DL.filter(d=>!H[d.url]).map(d=>({t:d.title,s:'Brochure · '+d.cat,u:d.url})),...SSM.filter(m=>!H[m.u]).map(m=>({t:m.t,s:'Manual · '+m.f,u:m.u})),...MF.filter(f=>!/^brand asset$/i.test(f.cat)).map(f=>({t:f.name,s:'File · '+tc(f.cat),id:f.id}))]},
    f=>[f.t,f.s],f=>{if(f.id){manOpen(f.id);return}const u=SAFE.url(f.u);if(u)window.open(u,'_blank','noopener,noreferrer')}]];
/* actions: [label, extra words to match, run, allowed?] */
const CMDS=()=>[
  ['New Lead','add enquiry customer',()=>{go('leads');editLead()},()=>canSee('leads')],
  ['New Contract','add job order',()=>{go('contracts');editContract()},()=>canSee('contracts')],
  ['Take A Payment','pay money deposit balance receipt',()=>cmdkSet('pay '),()=>ISADM()&&canSee('contracts')],
  ['Call Someone','ring phone dial',()=>cmdkSet('call '),()=>true],
  ['Email Someone','mail send',()=>cmdkSet('email '),()=>true],
  ['Mark A Lead Won Or Lost','won lost lead stage',()=>cmdkSet('won '),()=>canSee('leads')],
  ['Add A Note To A Job','note log lead contract',()=>cmdkSet('note '),()=>canSee('leads')||canSee('contracts')],
  ['New Contact','add contact book supplier',()=>{go('contacts');editContact()},()=>canSee('contacts')],
  ['New Service Call','add repair callout',()=>{go('service');editCall()},()=>canSee('service')],
  ['New Delivery','add delivery',()=>{go('deliveries');editDel()},()=>canSee('deliveries')],
  ['Add Stock','stock in goods in',()=>{go('stock');stockForm('add')},()=>canSee('stock')],
  ['Request Stock','order stock',()=>{go('stock');stockForm('request')},()=>canSee('stock')],
  ['Book Holiday','holiday leave time off',()=>bookMine(),()=>true],
  ['Scan Barcode','scan camera code',()=>scan(found),()=>true],
  ...Object.entries(VIEWS).filter(([k])=>canSee(k)&&(k!='admin'||ISOWN())).map(([k,v])=>['Go To '+v.t,'open page show '+k,()=>go(k),()=>true]),
  ['Settings','preferences options company my',()=>go('settings'),()=>true],
  ['Company Details','settings address phone vat number',()=>coEditK('co'),()=>ISOWN()],
  ['VAT And Invoice Settings','settings vat deposit bank invoice terms',()=>coEditK('money'),()=>ISOWN()],
  ['Update Review Scores','reviews google trustpilot trusted trader referenceline',()=>editRatings(),()=>ISOWN()],
  ['Change PINs','security pin password',()=>chPin(),()=>ISOWN()],
  ['Download Backup','export save data',()=>backupDl(),()=>ISOWN()],
  ['Fewer Animations On Or Off','motion reduce glow',()=>{motionSet(!document.body.classList.contains('rm'));render(true)},()=>true],
  ['Print This Page','print pdf',()=>print(),()=>true],
  ['Leave Admin Mode','lock sign out standard',()=>setRole('staff'),()=>ROLE!='staff'],
  ['Light Or Dark Mode','theme dark light night',()=>setTh(document.body.dataset.theme=='dark'?'light':'dark'),()=>true],
  ['Change The Look','background pattern colour',()=>lookPop(true),()=>true],
  ['My Details','profile phone email',()=>editProfile(),()=>true],
  ['Switch Account','sign in admin pin role',()=>swRole(),()=>true],
  ['Show The Tour','help guide',()=>startTour(),()=>true],
  ['Report A Problem','bug broken not working issue fault',()=>bugReport(),()=>true]].filter(c=>c[3]());
/* ---- typed commands: do a job straight from search ---- */
function recFind(q,kinds){q=String(q||'').trim().toLowerCase();if(!q)return[];const o=[];
  if(kinds.includes('c')&&canSee('contracts'))S.contracts.forEach(c=>{if(String(c.id).toLowerCase()==q||srchMatch(srchText(c),q))o.push({k:'c',r:c,id:c.id,n:c.name||'Contract '+c.id,x:String(c.id).toLowerCase()==q})});
  if(kinds.includes('l')&&canSee('leads'))S.leads.forEach(l=>{if(String(l.id).toLowerCase()==q||srchMatch(srchText(l),q))o.push({k:'l',r:l,id:l.id,n:l.name||'Lead '+l.id,x:String(l.id).toLowerCase()==q})});
  if(kinds.includes('k')&&canSee('contacts'))S.contacts.forEach(c=>{if(srchMatch(srchText(c),q))o.push({k:'k',r:c,id:c.id,n:c.co||c.name})});
  return o.sort((a,b)=>(b.x?1:0)-(a.x?1:0)).slice(0,5)}
function cmdSmart(query){const out=[],m=re=>query.match(new RegExp(re.source,'i'));let x;
  if((x=m(/^(?:pay|payment|take payment|paid)\s+£?(\d+(?:\.\d{1,2})?)\s+(.+)$/))&&ISADM()){const amt=SAFE.num(x[1],{max:1e7});recFind(x[2],'c').forEach(f=>out.push(['Record '+money(amt)+' Payment On '+f.id,f.n+' · balance '+money((+f.r.value||0)-(+f.r.paid||0)),()=>quickPay(f.id,amt),IC.finance]))}
  else if((x=m(/^(?:pay|payment|take payment)\s+(.+)$/))&&ISADM())recFind(x[1],'c').forEach(f=>out.push(['Take A Payment On '+f.id,f.n+' · balance '+money((+f.r.value||0)-(+f.r.paid||0)),()=>{openContract(f.id);recTab('finance');setTimeout(payOpen,80)},IC.finance]));
  if((x=m(/^(?:call|ring|phone)\s+(.+)$/)))recFind(x[1],'clk').forEach(f=>{const n=f.k=='k'?f.r.phone:telOf(f.r);if(n)out.push(['Call '+f.n,n,()=>{location.href='tel:'+String(n).replace(/[^\d+]/g,'')},'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2'])});
  if((x=m(/^(?:email|mail)\s+(.+)$/)))recFind(x[1],'clk').forEach(f=>{const e=f.k=='k'?f.r.email:mailOf(f.r);if(e&&SAFE.email(e))out.push(['Email '+f.n,e,()=>{location.href='mailto:'+e},'M4 6h16v12H4zM4 7l8 6 8-6'])});
  if((x=m(/^(?:mark\s+)?(won|lost)\s+(.+)$/)))recFind(x[2],'l').forEach(f=>out.push(['Mark '+f.id+' As '+tc(x[1]),f.n+' · now '+(f.r.stage||'New'),()=>leadQuick(f.id,tc(x[1])),x[1]=='won'?'M5 12l5 5L20 7':'M6 6l12 12M18 6L6 18']));
  if((x=m(/^note\s+(\S+)\s+(.{2,})$/)))recFind(x[1],'cl').filter(f=>f.x).forEach(f=>out.push(['Add Note To '+f.id,'“'+x[2].slice(0,60)+'”',()=>noteQuick(f.k,f.id,x[2]),IC.edit]));
  return out}
const recIsOpen=id=>RW&&$('#modal').classList.contains('open')&&String(RW.id)==String(id);
function quickPay(id,amt){if(!need(ISADM,'Taking payments'))return;if(recIsOpen(id)){toast('That contract is open. Use its Finance step, or close it first');return}const c=S.contracts.find(x=>x.id==id);if(!c||!(amt>0))return;
  askIn('Record a '+money(amt)+' payment?','On contract '+id+(c.name?' ('+c.name+')':'')+'.','Record Payment',()=>quickPayGo(id,amt))}
function quickPayGo(id,amt){const c=S.contracts.find(x=>x.id==id);if(!c||!need(ISADM,'Taking payments'))return;c.pay=c.pay||[];c.pay.push({amt,date:today(),method:'Bank transfer',kind:(+c.paid||0)?'Stage payment':'Deposit',ref:'From search',by:USER});
  c.paid=Math.round(((+c.paid||0)+amt)*100)/100;audit('Payment recorded',id,money(amt));store();render(true);toast(money(amt)+' recorded on '+id+'. Balance now '+money((+c.value||0)-c.paid)+'.')}
function leadQuick(id,st){const l=S.leads.find(x=>x.id==id);if(!l)return;if(recIsOpen(id)){toast('That lead is open. Use the stage bar in it, or close it first');return}const a=l.stage;if(a==st){toast(id+' is already '+st);return}l.stage=st;l.prob=st=='Won'?100:0;l.log=l.log||[];l.log.unshift({d:today(),t:'Stage: '+(a||'New')+' to '+st,by:USER});
  audit('Lead edited',id,'Stage '+st);store();render(true);toast(id+' marked as '+st)}
function noteQuick(k,id,txt){if(recIsOpen(id)){toast('That record is open. Add the note in it, or close it first');return}const r=(k=='c'?S.contracts:S.leads).find(x=>x.id==id);txt=SAFE.text(txt,300);if(!r||!txt)return;r.log=r.log||[];r.log.unshift({t:'Note',n:txt,by:USER,at:today()});audit('Note added',id,txt.slice(0,60));store();render(true);toast('Note added to '+id)}
function cmdkSet(v){cmdk(true);setTimeout(()=>{const ci=$('#cq');if(ci){ci.value=v;cmdkRun(v);ci.focus()}},30)}
/* uploaded files live in the browser database: read them once so they can be found from any page */
function srchFiles(){if(srchFiles.done||MF.length)return;srchFiles.done=1;try{fx('readonly',s=>s.getAll()).then(r=>{MF=(r||[]).filter(f=>!f.ref).sort((x,y)=>y.time-x.time)}).catch(()=>{})}catch(e){}}

/* ======== plain-English search: "fittings this week", "unpaid contracts", "leads from facebook",
   "urgent service calls", "deliveries overdue", "contracts in norwich over £10000", "won leads for sales a" ======== */
const NLE=()=>[
  {k:'fit',re:/\b(fit|fits|fitting|fittings|install|installs|installation)\b/,v:'contracts',n:'Fittings',L:()=>S.contracts.filter(c=>c.fit&&c.cancelled!='Yes'),d:c=>c.fit,sh:c=>[c.name,['Fit '+fd(c.fit),c.fitter||'No fitter',c.id].join(' · ')],o:c=>openContract(c.id)},
  {k:'call',re:/\b(service|services|call|calls|repair|repairs|ticket|tickets|callout|callouts)\b/,v:'service',n:'Service calls',L:()=>S.calls,d:c=>c.visit||c.takenAt,sh:c=>[c.name,[c.id,c.status,c.visit?'Visit '+fd(c.visit):'Not booked',c.fitter].filter(Boolean).join(' · ')],o:c=>editCall(c.id)},
  {k:'del',re:/\b(delivery|deliveries|delivering|order|orders)\b/,v:'deliveries',n:'Deliveries',L:()=>S.deliveries,d:x=>x.due,sh:x=>[x.supplier+': '+x.items,[dAuto(x),fd(x.due),x.contract].filter(Boolean).join(' · ')],o:x=>editDel(x.id)},
  {k:'lead',re:/\b(lead|leads|enquiry|enquiries|prospect|prospects)\b/,v:'leads',n:'Leads',L:()=>S.leads,d:l=>nextAppt(l)||l.followup||l.created,sh:l=>[l.name,[l.id,l.stage,l.source,l.owner].filter(Boolean).join(' · ')],o:l=>openLead(l.id)},
  {k:'con',re:/\b(contract|contracts|job|jobs|customer|customers|sale|sales)\b/,v:'contracts',n:'Contracts',L:()=>S.contracts,d:c=>c.fit||c.cdate,sh:c=>[c.name,[c.id,c.stage,(+c.value||0)-(+c.paid||0)>0?m0((+c.value||0)-(+c.paid||0))+' owed':'Paid'].join(' · ')],o:c=>openContract(c.id)},
  {k:'stock',re:/\b(stock|inventory|items|products)\b/,v:'stock',n:'Stock',L:()=>products(),d:()=>'',sh:r=>[r.item,[r.stock+' '+unitOf(r),hasLoc(r)?r.location:'',r.supplier].filter(Boolean).join(' · ')],o:r=>viewItem(key(r))}];
function nlRange(q){const td=today(),D=s=>{const x=new Date(td+'T00:00');x.setDate(x.getDate()+s);return iso(x)},[ws,we]=weekRange(),n=new Date(td+'T00:00'),m0d=(y,m)=>iso(new Date(y,m,1)),m1d=(y,m)=>iso(new Date(y,m+1,0));
  if(/\btoday\b/.test(q))return[td,td,'today'];if(/\btomorrow\b/.test(q))return[D(1),D(1),'tomorrow'];if(/\byesterday\b/.test(q))return[D(-1),D(-1),'yesterday'];
  if(/\bnext week\b/.test(q))return[iso(new Date(new Date(ws+'T00:00').getTime()+7*864e5)),iso(new Date(new Date(we+'T00:00').getTime()+7*864e5)),'next week'];
  if(/\blast week\b/.test(q))return[iso(new Date(new Date(ws+'T00:00').getTime()-7*864e5)),iso(new Date(new Date(we+'T00:00').getTime()-7*864e5)),'last week'];
  if(/\bthis week\b|\bweek\b/.test(q))return[ws,we,'this week'];
  if(/\bnext month\b/.test(q))return[m0d(n.getFullYear(),n.getMonth()+1),m1d(n.getFullYear(),n.getMonth()+1),'next month'];
  if(/\blast month\b/.test(q))return[m0d(n.getFullYear(),n.getMonth()-1),m1d(n.getFullYear(),n.getMonth()-1),'last month'];
  if(/\bthis month\b|\bmonth\b/.test(q))return[m0d(n.getFullYear(),n.getMonth()),m1d(n.getFullYear(),n.getMonth()),'this month'];
  const MN=['january','february','march','april','may','june','july','august','september','october','november','december'],mi=MN.findIndex(m=>new RegExp('\\b'+m.slice(0,3)+'(?:'+m.slice(3)+')?\\b').test(q));
  if(mi>=0){const y=(q.match(/\b(20\d\d)\b/)||[])[1]||n.getFullYear();return[m0d(+y,mi),m1d(+y,mi),MN[mi]+(q.match(/\b20\d\d\b/)?' '+y:'')]}
  const y=(q.match(/\b(?:in|during|for)\s+(20\d\d)\b/)||[])[1];if(y)return[y+'-01-01',y+'-12-31',y];return null}
function nlq(raw){const q=' '+String(raw||'').toLowerCase().replace(/[?.!,]/g,' ').replace(/\s+/g,' ')+' ';if(q.trim().length<4)return null;
  const E=NLE().find(e=>e.re.test(q)&&canSee(e.v));if(!E)return null;const td=today(),F=[],T=[];let L=E.L();
  const open=r=>E.k=='lead'?!['Won','Lost'].includes(r.stage):E.k=='call'?r.status!='Complete':E.k=='del'?r.status!='Received':E.k=='stock'?true:r.stage!='Complete'&&r.cancelled!='Yes';
  const bal=c=>(+c.value||0)-(+c.paid||0);
  const R=nlRange(q);if(R){const[a,b,t]=R;F.push(r=>{const d=E.k=='lead'?[nextAppt(r),r.followup,r.created].filter(Boolean):[E.d(r)];return d.some(x=>x&&x>=a&&x<=b)});T.push(t)}
  if(/\b(overdue|late|behind|past due)\b/.test(q)){F.push(r=>open(r)&&(E.k=='del'?dAuto(r)=='Overdue':E.k=='lead'?r.followup&&r.followup<td:E.k=='call'?r.visit&&r.visit<td:(E.d(r)||'9')<td));T.push('overdue')}
  if(/\b(unpaid|owing|owe|owed|outstanding|balance|balances|not paid|money owed|debt)\b/.test(q)&&['con','fit'].includes(E.k)){F.push(c=>bal(c)>0);T.push('with money owed')}
  if(/\b(paid in full|fully paid|paid up|all paid)\b/.test(q)&&['con','fit'].includes(E.k)){F.push(c=>bal(c)<=0&&+c.value>0);T.push('paid in full')}
  const num=s=>{const m=String(s).replace(/,/g,'').match(/(\d+(?:\.\d+)?)(k)?/);return m?(+m[1])*(m[2]?1000:1):null};
  let m=q.match(/\b(?:over|above|more than|bigger than|at least)\s*£?\s*([\d,.]+k?)/);if(m){const v=num(m[1]);F.push(r=>(+r.value||0)>=v);T.push('over '+m0(v))}
  m=q.match(/\b(?:under|below|less than|smaller than|up to)\s*£?\s*([\d,.]+k?)/);if(m){const v=num(m[1]);F.push(r=>(+r.value||0)<=v);T.push('under '+m0(v))}
  const STW=E.k=='lead'?[...STAGES.map(s=>[s,s]),['enquiry','New'],['home visit','Surveyed'],['quote','Quoted']]:['con','fit'].includes(E.k)?[...CSTAGES.map(s=>[s,s]),['deposit','Deposit due'],['check survey','Survey done']]:E.k=='call'?[['awaiting parts','Awaiting parts'],['booked','Booked'],['complete','Complete'],['past','Complete'],['closed','Complete'],['open','Open']]:[];
  const st=STW.find(([w])=>new RegExp('\\b'+w.toLowerCase()+'\\b').test(q));if(st){F.push(r=>(r.stage||r.status)==st[1]);T.push(st[1].toLowerCase())}
  else if(/\b(open|active|live|current|ongoing)\b/.test(q)){F.push(open);T.push('open')}
  if(E.k=='call'&&/\burgent\b/.test(q)){F.push(c=>c.priority=='Urgent'&&open(c));T.push('urgent')}
  if(E.k=='del'){if(/\bin transit\b/.test(q)){F.push(x=>dAuto(x)=='In transit');T.push('in transit')}if(/\breceived|arrived|delivered\b/.test(q)){F.push(x=>x.status=='Received');T.push('received')}if(/\bdamaged?\b/.test(q)){F.push(x=>x.damaged=='Yes');T.push('damaged')}}
  if(E.k=='stock'){if(/\bout of stock|\bnone left|\bempty\b/.test(q)){F.push(r=>r.stock<=0);T.push('out of stock')}else if(/\blow\b|\brunning low|\breorder/.test(q)){F.push(r=>isLow(r));T.push('running low')}}
  const src=SOURCES.find(s=>s&&new RegExp('\\b'+s.toLowerCase().replace(/[^a-z0-9 ]/g,'.')+'\\b').test(q));if(src&&['lead','con'].includes(E.k)){F.push(r=>r.source==src);T.push('from '+src)}
  const ppl=[...new Set([...S.staff.map(s=>s.name),...OWNERS(),...FITL()].filter(x=>x&&x!='Unassigned'))].sort((a,b)=>b.length-a.length).find(nm=>q.includes(' '+nm.toLowerCase()+' '));
  if(ppl){F.push(r=>[r.owner,r.soldBy,r.takenBy,r.checkedBy,...String(r.fitter||'').split(/,\s*/)].includes(ppl));T.push('for '+ppl)}
  const towns=[...new Set([...S.leads,...S.contracts,...S.calls].map(r=>r.town).filter(Boolean))].sort((a,b)=>b.length-a.length),tw=towns.find(t=>q.includes(' '+t.toLowerCase()+' '));
  if(tw){F.push(r=>(r.town||'')==tw);T.push('in '+tw)}
  const pc=q.match(/\b([a-z]{1,2}\d{1,2}[a-z]?)\b/);if(pc&&!tw&&/^(nr|ip|pe|cb|co)/.test(pc[1])){const P=pc[1].toUpperCase();F.push(r=>String(r.homePc||r.sitePc||'').toUpperCase().startsWith(P));T.push('in '+P)}
  if(!F.length&&q.trim().split(' ').length>2)return null;
  L=L.filter(r=>F.every(f=>{try{return f(r)}catch(e){return false}}));
  L.sort((a,b)=>String(E.d(a)||'9').localeCompare(String(E.d(b)||'9')));
  const PRE=['urgent','open','won','lost','quoted','surveyed','new','booked','complete','received','damaged','overdue','fitted','ordered','awaiting parts'],pre=T.filter(x=>PRE.includes(x)),rest=T.filter(x=>!PRE.includes(x));
  return{E,L,title:(pre.length?pre.join(', ')+' '+E.n.toLowerCase():E.n)+(rest.length?' '+rest.join(', '):'')}}
let NLQ=null;
function nlqAll(){if(!NLQ)return;const{E,L,title}=NLQ;openModal(`<button class="mx" onclick="closeModal()" aria-label="Close">&times;</button><h2>${esc(tc(title))}</h2><p class="muted">${L.length} found</p><div class="nlq-l">${L.map((r,i)=>{const[t,s]=E.sh(r);return `<button type="button" class="sri" ${A('nlqOpen',i)}><span class="sri-t"><b>${esc(tc(String(t||'')))}</b><small>${esc(s)}</small></span></button>`}).join('')}</div>`,'md')}
function nlqOpen(i){const r=NLQ&&NLQ.L[i];if(!r)return;closeModal();NLQ.E.o(r)}
/* one search engine for the top bar list and the big Ctrl+K box */
function srchBuild(raw,big){const RUN=[],grp=[],q0=String(raw||'').trim().toLowerCase(),cmdOnly=q0.startsWith('>'),query=cmdOnly?q0.slice(1).trim():q0;
  const row=(t,s,fn,ic)=>{const i=RUN.length;RUN.push(fn);return `<button type="button" class="sri" data-i="${i}" role="option">${ic?`<span class="sri-ic">${svg(ic)}</span>`:''}<span class="sri-t"><b>${esc(tc(String(t||'')))}</b>${s?`<small>${esc(s)}</small>`:''}</span></button>`};
  const NQ=cmdOnly?null:nlq(raw);if(NQ){NLQ=NQ;const n=NQ.L.length,mx=big?7:5;grp.push(`<div class="srg nlg">${esc(tc(NQ.title))}<span>${n}</span></div>`+(n?NQ.L.slice(0,mx).map(r=>{const[t,s]=NQ.E.sh(r);return row(t,s,()=>NQ.E.o(r))}).join('')+(n>mx?row('Show all '+n,'Open the full list',()=>nlqAll(),'M4 6h16M4 12h16M4 18h10'):''):'<p class="srn">None right now.</p>'))}
  const SM=cmdOnly?[]:cmdSmart(String(raw||'').trim());if(SM.length)grp.push(`<div class="srg">Do It Now<span>${SM.length}</span></div>`+SM.map(s=>row(s[0],s[1],s[2],s[3])).join(''));
  const C=CMDS().filter(c=>!query||srchMatch(c[0]+' '+c[1],query));
  if(cmdOnly||(big&&!query)||(query.length>=2&&C.length)){const L=(cmdOnly||!query)?C:C.slice(0,4);
    if(L.length)grp.push(`<div class="srg">Actions<span>${L.length}</span></div>`+L.map(c=>row(c[0],'',c[2],/^New|^Add|^Request|^Book/.test(c[0])?IC.plus:/^Go To/.test(c[0])?'M5 12h14M13 6l6 6-6 6':/^Scan/.test(c[0])?IC.scan:'M12 3v3M12 18v3M3 12h3M18 12h3')).join(''))}
  if(!cmdOnly&&query.length>=2)SRCH.forEach(([v,label,list,show,open])=>{if(!canSee(v))return;let L;try{L=list().filter(o=>srchMatch(srchText(o),query))}catch(e){return}
    if(!L.length)return;grp.push(`<div class="srg">${esc(label)}<span>${L.length}</span></div>`+L.slice(0,big?6:5).map(o=>{const[t,s]=show(o);return row(t,s,()=>open(o))}).join(''))});
  const empty=!grp.length?(query.length<2&&!cmdOnly?'':`<p class="srn">Nothing found for “${esc(String(raw).trim())}”.</p>`):'';
  return{html:grp.join('')+empty,run:RUN}}

/* ---- top bar list ---- */
let SR=[],SRi=0;
function srchRun(raw){const box=$('#sres');if(!box)return;const r0=String(raw||'').trim();SRi=0;
  if(r0.length<2&&!r0.startsWith('>')){SR=[];box.classList.remove('open');box.innerHTML='';return}
  const b=srchBuild(raw,false);SR=b.run.map(fn=>()=>{srchClose(true);fn()});
  const r=$('#sb').getBoundingClientRect(),w=Math.min(innerWidth-16,Math.max(r.width,340));box.style.top=(r.bottom+6)+'px';box.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';box.style.width=w+'px';
  box.innerHTML=b.html;box.classList.toggle('open',!!b.html);srchMark('#sres',SRi)}
function srchMark(sel,i){$$(sel+' .sri').forEach((b,j)=>b.classList.toggle('on',j==i))}
function srchClose(clear){const box=$('#sres');if(box)box.classList.remove('open');if(clear){$('#q').value='';q='';sbSync();render();srchHint()}}
function srchKeys(e,list,getI,setI,sel,close){if(e.key=='ArrowDown'||e.key=='ArrowUp'){e.preventDefault();const n=Math.max(list().length,1);setI((getI()+(e.key=='ArrowDown'?1:-1)+n)%n);srchMark(sel,getI());const on=$(sel+' .sri.on');on&&on.scrollIntoView({block:'nearest'})}
  else if(e.key=='Enter'&&list()[getI()]){e.preventDefault();list()[getI()]()}else if(e.key=='Escape')close()}

/* ---- big centred box (Ctrl+K) ---- */
let CX=[],CXi=0;
function cmdk(open){let o=$('#cmdk');
  if(!o){o=document.createElement('div');o.id='cmdk';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','Search and actions');
    o.innerHTML=`<div class="ck-b"><label class="ck-in">${svg(IC.search)}<input id="cq" type="search" autocomplete="off" maxlength="80" aria-label="Search or type a command" aria-controls="cres"><kbd>Esc</kbd></label><div id="cres" class="ck-r" role="listbox"></div><div class="ck-f"><span><kbd>↑</kbd><kbd>↓</kbd> Move</span><span><kbd>Enter</kbd> Open</span><span><kbd>&gt;</kbd> Actions Only</span><span><kbd>Ctrl</kbd><kbd>K</kbd> Open Anywhere</span></div></div>`;
    document.body.appendChild(o);const ci=$('#cq');
    ci.addEventListener('input',()=>cmdkRun(ci.value));
    ci.addEventListener('keydown',e=>srchKeys(e,()=>CX,()=>CXi,v=>CXi=v,'#cres',()=>cmdk(false)));
    o.addEventListener('mousedown',e=>{if(e.target==o)cmdk(false)});
    $('#cres').addEventListener('mousedown',e=>e.preventDefault());
    $('#cres').addEventListener('click',e=>{const b=e.target.closest('.sri');if(b&&CX[+b.dataset.i])CX[+b.dataset.i]()})}
  o.classList.toggle('open',open);
  if(open){srchFiles();srchClose();const ci=$('#cq');ci.value='';ci.placeholder=$('#q').placeholder;cmdkRun('');setTimeout(()=>ci.focus(),20)}}
function cmdkRun(raw){const b=srchBuild(raw,true);CX=b.run.map(fn=>()=>{cmdk(false);fn()});CXi=0;$('#cres').innerHTML=b.html||'<p class="srn">Type a name, postcode, contract number or item code.<br>Or tell it what to do: <b class="nocap">pay 500 2402318</b>, <b class="nocap">call sample</b>, <b class="nocap">won L0002</b>, <b class="nocap">note 2402318 rang customer</b>.</p>';srchMark('#cres',0)}

/* ---- the hint in the box cycles through real examples ---- */
function srchHint(){const inp=$('#q');if(!inp)return;const P=[];
  const pick=a=>a.length?a[Math.floor(Math.random()*a.length)]:null;
  if(canSee('contracts'))P.push(pick(S.contracts.map(c=>c.id)));if(canSee('stock'))P.push(pick(products().map(r=>r.item)));
  if(canSee('leads'))P.push(pick(allLeads().map(l=>l.name)));P.push(pick([...S.leads,...S.contracts].map(r=>r.homePc||r.town).filter(Boolean)));
  if(canSee('suppliers'))P.push(pick(S.suppliers.map(s=>s.name)));const T=[canSee('contracts')&&'fittings this week',canSee('contracts')&&'contracts with money owed',canSee('leads')&&'leads from Facebook',canSee('service')&&'urgent service calls',canSee('deliveries')&&'deliveries overdue',canSee('stock')&&'stock running low',canSee('leads')&&'leads this month'].filter(Boolean);
  const L=[];P.filter(Boolean).forEach((x,i)=>{L.push('Search… '+x);if(T[i])L.push('Search… '+T[i])});T.slice(P.length).forEach(x=>L.push('Search… '+x));srchHint.i=((srchHint.i||0)+1)%Math.max(L.length,1);inp.placeholder=L[srchHint.i]||'Search';
  const ci=$('#cq');if(ci&&!ci.value)ci.placeholder=inp.placeholder}

(function search(){const sb=$('#sb'),inp=$('#q');if(!sb||!inp)return;
  const box=document.createElement('div');box.id='sres';box.setAttribute('role','listbox');box.setAttribute('aria-label','Search results');document.body.appendChild(box); /* not inside the glass top bar: its blur would offset a fixed box */
  inp.setAttribute('aria-controls','sres');
  inp.addEventListener('input',()=>srchRun(inp.value));
  inp.addEventListener('focus',()=>{srchFiles();if(inp.value.trim().length>1||inp.value.trim().startsWith('>'))srchRun(inp.value)});
  inp.addEventListener('keydown',e=>{if(!box.classList.contains('open'))return;srchKeys(e,()=>SR,()=>SRi,v=>SRi=v,'#sres',()=>srchClose())});
  box.addEventListener('mousedown',e=>e.preventDefault()); /* keep focus in the box while clicking a result */
  box.addEventListener('click',e=>{const b=e.target.closest('.sri');if(b&&SR[+b.dataset.i])SR[+b.dataset.i]()});
  document.addEventListener('click',e=>{if(!e.target.closest('#sres,#sb'))srchClose()});
  $('#qClr').addEventListener('click',()=>srchClose());
  /* Ctrl+K / Cmd+K anywhere opens the big box; Escape closes it */
  window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.code=='KeyK'||String(e.key).toLowerCase()=='k')){e.preventDefault();e.stopPropagation();cmdk(!$('#cmdk.open'))}else if(e.key=='Escape'&&$('#cmdk.open'))cmdk(false)},true);
  const kb=sb.querySelector('kbd');if(kb){kb.textContent=/mac|iphone|ipad/i.test((navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||navigator.userAgent)?'⌘K':'Ctrl K';kb.title='Open the big search box';kb.style.cursor='pointer';kb.addEventListener('click',e=>{e.preventDefault();cmdk(true)})}
  srchHint();setInterval(()=>{if(document.activeElement!==inp&&!inp.value)srchHint()},3500);
})();
