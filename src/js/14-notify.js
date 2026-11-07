/* ==========================================================================
   14 · Notification centre: stock requests, alerts, stock in/out, mentions
   ========================================================================== */
const NCTABS=['All','Requests','Stock In/Out','Alerts','Mentions'];
let ncAlerts=[];
function ncData(){const td=today(),req=[],mov=[],alr=[];
  S.items.forEach(r=>{if(r.type=='request'){if(['Pending','Approved'].includes(r.reqStatus)&&!r.cleared)req.push(r)}else{mov.push({r,n:!S.seen[r.uid]});if(r.flag&&!r.cleared)alr.push({k:'Alert',t:r.item+': '+r.type+' '+r.qty,s:r.user+', '+r.time,uid:r.uid})}});
  products().forEach(r=>{const k='low:'+r.pid;if(isLow(r)&&S.dis[k]!==r.stock)alr.push({k:'Low Stock',t:r.item,s:r.stock+' '+unitOf(r)+' left at '+(hasLoc(r)?r.location:'no location'),key:k,stock:r.stock})});
  S.contracts.filter(c=>fensaDue(c)&&c.fit&&c.fit<=addDays(-14)).forEach(c=>{const g=Math.round((new Date(td)-new Date(c.fit))/864e5);alr.push({k:'FENSA',t:c.name+' #'+c.id,s:'Fitted '+g+' days ago. Notify FENSA within 30 days of fitting.',go:'contracts'})});
  S.deliveries.filter(d=>d.status=='Due'&&d.due<=td).forEach(d=>alr.push({k:'Delivery',t:d.supplier+': '+d.items,s:d.due<td?'Overdue since '+fd(d.due):'Due today',go:'deliveries'}));
  return{req,mov:mov.slice(0,20),alr,men:S.notes.filter(n=>n.to==USER)}}
function ncCount(){const d=ncData();return d.req.filter(r=>r.reqStatus=='Pending'||!ISADM()).length+d.mov.filter(x=>x.n).length+d.alr.length+d.men.filter(n=>!n.read).length}
function ncDraw(){const nc=$('#nc'),d=ncData(),T=UI.nc.t,show=k=>T=='All'||T==k,Ad=ISADM();ncAlerts=d.alr;
  const sec=(t,h)=>`<h3 class="nch">${t}</h3>${h||emptyArt('done','Nothing here.')}`;
  const rq=d.req.map(r=>`<div class="nrow ${r.flag?'hot':''}"><span><span class="tag ${r.reqStatus=='Pending'?'y':'g'}">${esc(r.reqStatus)}</span> <b>${ordTag(r)} ${r.qty} ${esc(unitOf(r))} x ${esc(r.item)}</b><small>${esc(colTxt(r))}, ${esc(r.user)}, ${esc(r.time)}${r.note?', '+esc(r.note):''}</small></span><span class="acts">${r.reqStatus=='Pending'&&Ad?`<button class="mini pri" ${A('ncAct','approve',r.uid)}>Approve</button><button class="mini del" ${A('ncAct','reject',r.uid)}>Reject</button>`:''}${r.reqStatus=='Approved'?`<button class="mini" ${A('ncAct','receive',r.uid)}>Receive</button><button class="mini" ${A('ncAct','clr',r.uid)}>Clear</button>`:''}</span></div>`).join('');
  const al=d.alr.map((x,j)=>`<div class="nrow"><span><span class="tag ${x.k=='Alert'?'r':'y'}">${esc(x.k)}</span> <b>${esc(x.t)}</b><small>${esc(x.s)}</small></span><span class="acts">${x.go?`<button class="mini" ${A('ncAct','go',x.go)}>Open</button>`:`<button class="mini pri" ${A('ncAct','alr',j)}>Clear</button>`}</span></div>`).join('');
  const mv=d.mov.map(x=>`<div class="nrow ${x.n?'':'seen'}"><span><span class="tag ${x.r.type=='add'?'g':'r'}">${x.r.type=='add'?'In':'Out'}</span> <b>${x.r.qty} ${esc(unitOf(x.r))} x ${esc(x.r.item)}</b><small>${esc(x.r.user)}, ${esc(x.r.time)}, stock now ${x.r.stock}</small></span>${x.n?'<span class="dotn"></span>':''}</div>`).join('');
  const mn=d.men.slice().reverse().map(n=>`<div class="nrow ${n.read?'seen':''}"><span><span class="tag">Mention</span> <b>${esc(n.t)}</b><small>From ${esc(n.by)}, ${new Date(n.at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small></span><span class="acts">${n.read?'':`<button class="mini" ${A('ncAct','read',n.id)}>Read</button>`}<button class="mini del" ${A('ncAct','del',n.id)}>Delete</button></span></div>`).join('');
  nc.innerHTML=`<div class="nc-h"><h2>Notification Centre</h2><button class="mini" onclick="ncToggle(false)">Close</button></div><div class="chips" style="padding:.6rem 1.1rem 0">${NCTABS.map(t=>`<button class="chip ${T==t?'on':''}" ${A('ncTab',t)}>${t}</button>`).join('')}</div><div class="nc-t"><button class="mini" ${A('ncAct','readall')}>Mark all read</button><button class="mini" ${A('ncAct','clrall')}>Clear all</button><button class="mini pri" onclick="ncNote()">New message</button></div><div class="nc-b">${show('Requests')?sec('Stock Requests ('+d.req.length+')',rq):''}${show('Alerts')?sec('Alerts ('+d.alr.length+')',al):''}${show('Stock In/Out')?sec('Stock In And Out',mv):''}${show('Mentions')?sec('Mentions ('+d.men.length+')',mn):''}</div>`}
function ncTab(t){UI.nc.t=t;ncDraw()}
function ncToggle(o){$('#nc').classList.toggle('open',o);$('#ncbg').classList.toggle('open',o);if(o)ncDraw()}
function ncAct(a,x){
  if(a=='approve'){reqApprove(x);return}if(a=='reject'){reqReject(x);return}
  if(a=='receive'){ncToggle(false);reqReceive(x);return}if(a=='go'){ncToggle(false);go(x);return}
  if(a=='clr')moveClear(x);
  else if(a=='alr'){const q=ncAlerts[x];if(!q)return;if(q.uid){const r=byUid(q.uid);if(r){r.cleared=true;r.flag=false}}else if(q.key)S.dis[q.key]=q.stock}
  else if(a=='read'){const n=S.notes.find(n=>n.id==x);if(n)n.read=true}
  else if(a=='del')S.notes=S.notes.filter(n=>n.id!=x);
  else if(a=='readall'){ncData().mov.forEach(m=>S.seen[m.r.uid]=1);S.notes.forEach(n=>{if(n.to==USER)n.read=true})}
  else if(a=='clrall'){const d=ncData(),T=UI.nc.t,all=T=='All';
    if(all||T=='Requests')d.req.filter(r=>r.reqStatus!='Pending').forEach(r=>{r.cleared=true;r.reqStatus='Cleared'});
    if(all||T=='Alerts')d.alr.forEach(q=>{if(q.uid){const r=byUid(q.uid);if(r){r.cleared=true;r.flag=false}}else if(q.key)S.dis[q.key]=q.stock});
    if(all||T=='Mentions')S.notes=S.notes.filter(n=>n.to!=USER);
    if(all||T=='Stock In/Out')d.mov.forEach(m=>S.seen[m.r.uid]=1)}
  /* keep the seen-list from growing forever */
  const keep=new Set(S.items.map(r=>r.uid));Object.keys(S.seen).forEach(k=>{if(!keep.has(k))delete S.seen[k]});
  store();render()}
function ncNote(){const nm=[...new Set([USER,...S.staff.map(x=>x.name).filter(Boolean)])];
  form('New Message',[{k:'to',l:'Mention (To)',t:'select',o:nm,w:'full'},{k:'t',l:'Message',t:'area',w:'full',req:1,max:500}],{to:nm[1]},o=>{S.notes.push({id:shortId('N'),to:o.to,by:USER,t:o.t,at:Date.now(),read:false});if(S.notes.length>500)S.notes.splice(0,S.notes.length-500)})}
