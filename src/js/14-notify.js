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
function vMessages(){const N=(S.notes||[]).slice().sort((a,b)=>a.at-b.at),me2=USER;
  const people=[...new Set(S.staff.map(s=>s.name).filter(n=>n&&n!=me2))];
  const conv=w=>w=='Everyone'?N.filter(n=>n.to=='Everyone'):N.filter(n=>(n.by==me2&&n.to==w)||(n.by==w&&n.to==me2));
  const unreadIn=w=>conv(w).filter(n=>n.by!=me2&&!msgRead(n)).length;
  const chats=['Everyone',...people].map(w=>{const L=conv(w);return{w,last:L[L.length-1],un:unreadIn(w)}}).filter(c=>c.w=='Everyone'||c.last||c.w==UI.msg.to).sort((a,b)=>(b.last?b.last.at:0)-(a.last?a.last.at:0)).filter(c=>!q||c.w.toLowerCase().includes(q)||(c.last&&c.last.t.toLowerCase().includes(q)));
  const cur=UI.msg.to||'Everyone',L=conv(cur);L.filter(n=>n.by!=me2&&!msgRead(n)).forEach(n=>{if(n.to=='Everyone'){n.readBy=n.readBy||[];n.readBy.push(me2)}else n.read=true});if(L.length)store();
  const ago=t=>{const m=Math.round((Date.now()-t)/6e4);return m<1?'now':m<60?m+'m':m<1440?Math.round(m/60)+'h':new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short'})};
  const av=n=>`<span class="mav ${n=='Everyone'?'all':''}">${n=='Everyone'?'★':esc(initials(n))}</span>`;
  let lastDay='';
  return `<div class="msn"><aside class="msn-l"><div class="msn-lh"><h1>Chats</h1><select aria-label="New chat" onchange="if(this.value){setUI('msg.to',this.value)}"><option value="">+ New chat</option>${people.map(p=>`<option>${esc(p)}</option>`).join('')}</select></div>
   <div class="msn-list">${chats.map(c=>`<button class="msn-c ${c.w==cur?'on':''} ${c.un?'un':''}" ${A('setUI','msg.to',c.w)}>${av(c.w)}<span class="msn-ct"><b>${esc(c.w=='Everyone'?'Everyone (team chat)':c.w)}</b><small>${c.last?esc((c.last.by==me2?'You: ':c.w=='Everyone'?c.last.by.split(' ')[0]+': ':'')+c.last.t):'No messages yet'}</small></span><span class="msn-m">${c.last?ago(c.last.at):''}${c.un?`<i>${c.un}</i>`:''}</span></button>`).join('')}</div></aside>
   <section class="msn-r"><header class="msn-h">${av(cur)}<div><b>${esc(cur=='Everyone'?'Everyone':cur)}</b><small>${cur=='Everyone'?'Messages here go to the whole team':esc((S.staff.find(s=>s.name==cur)||{}).role||'')}</small></div></header>
    <div class="msn-t" id="msnT">${L.map(n=>{const d=new Date(n.at).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}),sep=d!=lastDay?(lastDay=d,`<div class="msn-day">${d}</div>`):'',mine=n.by==me2;return sep+`<div class="bub ${mine?'me':''}">${!mine&&cur=='Everyone'?`<small class="bub-n">${esc(n.by)}</small>`:''}<p>${esc(n.t)}</p><span class="bub-t">${new Date(n.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}${mine?`<button class="bub-x" title="Delete" aria-label="Delete message" ${A('msgDel',n.id)}>&times;</button>`:''}</span></div>`}).join('')||`<div class="msn-empty">${emptyArt('team','Say hello to '+(cur=='Everyone'?'the team':cur)+'.')}</div>`}</div>
    <div class="msn-in"><textarea id="m_t" rows="1" maxlength="1000" placeholder="Aa" aria-label="Message" onkeydown="if(event.key=='Enter'&&!event.shiftKey){event.preventDefault();msgSend()}"></textarea><button class="msn-send" onclick="msgSend()" aria-label="Send">${svg('M4 12l16-8-6 16-3-7z')}</button></div></section></div>`}
function msnAfter(){const t=$('#msnT');if(t)t.scrollTop=t.scrollHeight;const i=$('#m_t');if(i&&matchMedia('(pointer:fine)').matches)i.focus()}
function msgSend(){const to=UI.msg.to||'Everyone',t=SAFE.text($('#m_t').value,1000);if(!t){return}
  if(to!='Everyone'&&!S.staff.some(s=>s.name==to)){toast('Pick who it is for');return}
  S.notes=S.notes||[];S.notes.push({id:shortId('N'),to,by:USER,t,at:Date.now(),read:false,readBy:[]});if(S.notes.length>800)S.notes.splice(0,S.notes.length-800);audit('Message sent',to,'');store();render()}
function msgMark(id){const n=(S.notes||[]).find(x=>x.id==id);if(!n)return;if(n.to=='Everyone'){n.readBy=n.readBy||[];if(!n.readBy.includes(USER))n.readBy.push(USER)}else n.read=true;store();render()}
function msgReadAll(){(S.notes||[]).filter(msgMine).forEach(n=>{if(n.to=='Everyone'){n.readBy=n.readBy||[];if(!n.readBy.includes(USER))n.readBy.push(USER)}else n.read=true});store();render()}
function msgReply(to){UI.msg.to=S.staff.some(s=>s.name==to)?to:'Everyone';render();setTimeout(()=>{const e=$('#m_t');if(e)e.focus()},50)}
function msgDel(id){const n=(S.notes||[]).find(x=>x.id==id);if(!n||!(n.by==USER||n.to==USER))return;askYes('Delete this message?','It is removed for good.','Delete',()=>{S.notes=S.notes.filter(x=>x.id!=id);store();render()},true)}
