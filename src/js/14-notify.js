/* ==========================================================================
   14 · Notification centre: stock requests, alerts, stock in/out, mentions
   ========================================================================== */
const NCTABS_ALL=['All','Requests','Stock In/Out','Alerts'],NCTABS_STD=['All','My Requests','Alerts'];
const NCTABS=NCTABS_ALL;const ncTabs=()=>ISADM()?NCTABS_ALL:NCTABS_STD;
let ncAlerts=[];
function ncData(){const td=today(),req=[],mov=[],alr=[];
  const Ad=ISADM();S.items.forEach(r=>{if(r.type=='request'){if(['Pending','Approved'].includes(r.reqStatus)&&!r.cleared&&(Ad||r.user==USER))req.push(r)}else if(Ad){mov.push({r,n:!S.seen[r.uid]});if(r.flag&&!r.cleared)alr.push({k:'Alert',t:r.item+': '+r.type+' '+r.qty,s:r.user+', '+r.time,uid:r.uid})}});
  products().forEach(r=>{const k='low:'+r.pid;if(isLow(r)&&S.dis[k]!==r.stock)alr.push({k:'Low Stock',t:r.item,s:r.stock+' '+unitOf(r)+' left at '+(hasLoc(r)?r.location:'no location'),key:k,stock:r.stock})});
  S.contracts.filter(c=>fensaDue(c)&&c.fit&&c.fit<=addDays(-14)).forEach(c=>{const g=Math.round((new Date(td)-new Date(c.fit))/864e5);alr.push({k:'FENSA',t:c.name+' #'+c.id,s:'Fitted '+g+' days ago. Notify FENSA within 30 days of fitting.',go:'contracts'})});
  S.deliveries.filter(d=>d.status=='Due'&&d.due<=td).forEach(d=>alr.push({k:'Delivery',t:d.supplier+': '+d.items,s:d.due<td?'Overdue since '+fd(d.due):'Due today',go:'deliveries'}));
  return{req,mov:Ad?mov.slice(0,20):[],alr:alr.filter(x=>Ad||!['FENSA','Alert'].includes(x.k)),men:[]}}
function ncCount(){const d=ncData();return d.req.filter(r=>r.reqStatus=='Pending'||!ISADM()).length+d.mov.filter(x=>x.n).length+d.alr.length+d.men.filter(n=>!n.read).length}
function ncDraw(){const nc=$('#nc'),d=ncData(),T=UI.nc.t,show=k=>T=='All'||T==k||(k=='Requests'&&T=='My Requests'),Ad=ISADM();ncAlerts=d.alr;
  const sec=(t,h)=>`<h3 class="nch">${t}</h3>${h||emptyArt('done','Nothing here.')}`;
  const rq=d.req.map(r=>`<div class="nrow ${r.flag?'hot':''}"><span><span class="tag ${r.reqStatus=='Pending'?'y':'g'}">${esc(r.reqStatus)}</span> <b>${ordTag(r)} ${r.qty} ${esc(unitOf(r))} x ${esc(r.item)}</b><small>${esc(colTxt(r))}, ${esc(r.user)}, ${esc(r.time)}${r.note?', '+esc(r.note):''}</small></span><span class="acts">${r.reqStatus=='Pending'&&Ad?`<button class="mini pri" ${A('ncAct','approve',r.uid)}>Approve</button><button class="mini del" ${A('ncAct','reject',r.uid)}>Reject</button>`:''}${r.reqStatus=='Approved'?`<button class="mini" ${A('ncAct','receive',r.uid)}>Receive</button><button class="mini" ${A('ncAct','clr',r.uid)}>Clear</button>`:''}</span></div>`).join('');
  const al=d.alr.map((x,j)=>`<div class="nrow"><span><span class="tag ${x.k=='Alert'?'r':'y'}">${esc(x.k)}</span> <b>${esc(x.t)}</b><small>${esc(x.s)}</small></span><span class="acts">${x.go?`<button class="mini" ${A('ncAct','go',x.go)}>Open</button>`:`<button class="mini pri" ${A('ncAct','alr',j)}>Clear</button>`}</span></div>`).join('');
  const mv=d.mov.map(x=>`<div class="nrow ${x.n?'':'seen'}"><span><span class="tag ${x.r.type=='add'?'g':'r'}">${x.r.type=='add'?'In':'Out'}</span> <b>${x.r.qty} ${esc(unitOf(x.r))} x ${esc(x.r.item)}</b><small>${esc(x.r.user)}, ${esc(x.r.time)}, stock now ${x.r.stock}</small></span>${x.n?'<span class="dotn"></span>':''}</div>`).join('');
  const mn=d.men.slice().reverse().map(n=>`<div class="nrow ${n.read?'seen':''}"><span><span class="tag">Mention</span> <b>${esc(n.t)}</b><small>From ${esc(n.by)}, ${new Date(n.at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small></span><span class="acts">${n.read?'':`<button class="mini" ${A('ncAct','read',n.id)}>Read</button>`}<button class="mini del" ${A('ncAct','del',n.id)}>Delete</button></span></div>`).join('');
  nc.innerHTML=`<div class="nc-h"><h2>Notification Centre</h2><button class="mini" onclick="ncToggle(false)">Close</button></div><div class="chips" style="padding:.6rem 1.1rem 0">${ncTabs().map(t=>`<button class="chip ${T==t?'on':''}" ${A('ncTab',t)}>${t}</button>`).join('')}</div><div class="nc-t"><button class="mini" ${A('ncAct','readall')}>Mark all read</button><button class="mini" ${A('ncAct','clrall')}>Clear all</button><button class="mini pri" onclick="ncToggle(false);go('messages')">Messages</button></div><div class="nc-b">${show('Requests')?sec((ISADM()?'Stock Requests':'My Stock Requests')+' ('+d.req.length+')',rq):''}${show('Alerts')?sec('Alerts ('+d.alr.length+')',al):''}${ISADM()&&show('Stock In/Out')?sec('Stock In And Out',mv):''}</div>`}
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

/* ---------------- messages: their own page, open to every account ---------------- */
const msgMine=n=>n.to==USER||n.to=='Everyone';
const msgRead=n=>n.to=='Everyone'?(n.readBy||[]).includes(USER):!!n.read;
const msgUnread=()=>(S.notes||[]).filter(n=>msgMine(n)&&n.by!=USER&&!msgRead(n)).length;
function vMessages(){const U=UI.msg,box=U.box,N=(S.notes||[]).slice().sort((a,b)=>b.at-a.at),L=N.filter(n=>box=='in'?msgMine(n)&&n.by!=USER:n.by==USER).filter(n=>!q||(n.t+' '+n.by+' '+n.to).toLowerCase().includes(q));
  const people=['Everyone',...new Set(S.staff.map(s=>s.name).filter(n=>n&&n!=USER))];
  const when=t=>new Date(t).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  return `<div class="head"><div><h1>Messages</h1><span class="muted">${msgUnread()} unread</span></div><div class="tools"><div class="seg2"><button class="${box=='in'?'on':''}" ${A('setUI','msg.box','in')}>Inbox</button><button class="${box=='out'?'on':''}" ${A('setUI','msg.box','out')}>Sent</button></div>${box=='in'&&msgUnread()?'<button class="btn ghost" onclick="msgReadAll()">Mark all read</button>':''}</div></div>
  <div class="msgw"><div class="panel msg-new"><h2>New Message</h2><label class="ff"><span>To</span><select id="m_to">${people.map(p=>`<option ${U.to==p?'selected':''}>${esc(p)}</option>`).join('')}</select></label><label class="ff"><span>Message</span><textarea id="m_t" rows="5" maxlength="1000" placeholder=""></textarea></label><div class="acts r"><button class="btn" onclick="msgSend()">Send</button></div></div>
  <div class="panel msg-list">${L.map(n=>{const unread=box=='in'&&!msgRead(n);return `<div class="msg ${unread?'un':''}"><span class="av2">${esc(initials(box=='in'?n.by:n.to))}</span><div class="msg-b"><div class="msg-h"><b>${esc(box=='in'?n.by:'To '+n.to)}</b>${n.to=='Everyone'&&box=='in'?' <span class="tag">Everyone</span>':''}<span class="muted">${when(n.at)}</span></div><p>${esc(n.t)}</p><div class="acts">${box=='in'?`<button class="mini pri" ${A('msgReply',n.by)}>Reply</button>${unread?`<button class="mini" ${A('msgMark',n.id)}>Mark read</button>`:''}`:''}${box=='out'||n.to==USER?`<button class="mini del" ${A('msgDel',n.id)}>Delete</button>`:''}</div></div></div>`}).join('')||emptyArt('team',box=='in'?'No messages yet.':'You have not sent any messages.')}</div></div>`}
function msgSend(){const to=SAFE.text($('#m_to').value,80),t=SAFE.text($('#m_t').value,1000);if(!t){toast('Write a message first');return}
  if(to!='Everyone'&&!S.staff.some(s=>s.name==to)){toast('Pick who it is for');return}
  S.notes=S.notes||[];S.notes.push({id:shortId('N'),to,by:USER,t,at:Date.now(),read:false,readBy:[]});if(S.notes.length>800)S.notes.splice(0,S.notes.length-800);audit('Message sent',to,'');store();UI.msg.to=to;render();toast('Message sent to '+to)}
function msgMark(id){const n=(S.notes||[]).find(x=>x.id==id);if(!n)return;if(n.to=='Everyone'){n.readBy=n.readBy||[];if(!n.readBy.includes(USER))n.readBy.push(USER)}else n.read=true;store();render()}
function msgReadAll(){(S.notes||[]).filter(msgMine).forEach(n=>{if(n.to=='Everyone'){n.readBy=n.readBy||[];if(!n.readBy.includes(USER))n.readBy.push(USER)}else n.read=true});store();render()}
function msgReply(to){UI.msg.to=S.staff.some(s=>s.name==to)?to:'Everyone';render();setTimeout(()=>{const e=$('#m_t');if(e)e.focus()},50)}
function msgDel(id){const n=(S.notes||[]).find(x=>x.id==id);if(!n||!(n.by==USER||n.to==USER))return;askYes('Delete this message?','It is removed for good.','Delete',()=>{S.notes=S.notes.filter(x=>x.id!=id);store();render()},true)}
