/* ==========================================================================
   04 · Shell: views registry, navigation, render loop, modal, forms,
        photos, pagination, toast, theme, top bar
   ========================================================================== */
/* All page-level UI state lives here (instead of a dozen loose globals) */
const UI={
  inv:{v:'products',f:'all',sup:'all',loc:'all',unit:'all',sort:'item',dir:1,page:1,per:50},
  mov:{f:'all',sort:'',dir:1,page:1,per:50},
  cal:{m:'month',o:0,sd:null,ly:{fit:1,svc:1,del:1,hol:1}},
  hol:{m:0,v:'chart',cm:new Date().getMonth(),y:new Date().getFullYear(),brush:''}, rep:{t:'summary'}, fin:{t:'debtors',pm:0},
  del:{f:'out',s:'all',v:'list'}, files:{cat:'all',az:0,list:0,ssq:'',page:1,per:50},
  con:{f:'all'}, staff:{c:'all'}, sup:{open:''}, lead:{v:'list',f:'live',src:'all',own:'all',sort:'id',dir:1,page:1,per:50}, ctr:{v:'list',f:'cur',sort:'id',dir:1,page:1,per:50}, nc:{t:'All'}, audit:{page:1,per:50}
};
function setUI(path,val){const p=path.split('.');let o=UI;for(let i=0;i<p.length-1;i++)o=o[p[i]];o[p[p.length-1]]=val;if(p.length==2&&p[1]!='page'&&'page' in UI[p[0]])UI[p[0]].page=1;render()}
function togUI(path){const p=path.split('.');let o=UI;for(let i=0;i<p.length-1;i++)o=o[p[i]];const k=p[p.length-1];o[k]=o[k]?0:1;render()}

/* ---- views: key -> title, page function, optional after-render hook ---- */
const VIEWS={
  home:{t:'Overview',fn:vHome}, live:{t:'Factory Floor',fn:vLive,after:liveAfter},
  deliveries:{t:'Deliveries',fn:vDeliveries}, suppliers:{t:'Suppliers',fn:vSuppliers},
  leads:{t:'Leads',fn:vLeads}, contracts:{t:'Contracts',fn:vContracts},
  fitting:{t:'Calendar',fn:vCalendar}, service:{t:'Service Calls',fn:vService},
  stock:{t:'Inventory',fn:vStock}, contacts:{t:'Contact Book',fn:vContacts},
  staff:{t:'Staff',fn:vStaff}, holidays:{t:'Holiday Planner',fn:vHolidays},
  reports:{t:'Reports',fn:vReports}, downloads:{t:'Files',fn:vFiles,after:loadMan},
  finance:{t:'Finance',fn:vFinance}, admin:{t:'Admin Console',fn:vAdmin}
};
const NG=[['Workspace',['home']],['Sales',['leads','contracts']],['Operations',['live','deliveries','fitting','service']],['Stock & People',['stock','suppliers','contacts','staff','holidays']],['Insights',['reports','downloads']],['Admin',['finance','admin']]];
let view=HOME(),q='',lastView='';

const hit=o=>!q||Object.values(o).filter(v=>v!=null&&typeof v!='object').join(' ').toLowerCase().includes(q);

function badges(){const td=today();return{
  leads:S.leads.filter(l=>!['Won','Lost'].includes(l.stage)).length,
  service:S.calls.filter(c=>c.status!='Complete').length,
  fitting:S.contracts.filter(c=>c.fit&&c.stage!='Complete').length,
  stock:S.items.filter(r=>r.type=='request'&&r.reqStatus=='Pending').length,
  staff:ISOWN()?S.hols.filter(h=>h.status=='Pending').length:0,
  holidays:ISOWN()?S.hols.filter(h=>h.status=='Pending').length:0}}

function navHtml(b){let n=0;return NG.map(([g,keys])=>{const ks=keys.filter(k=>canSee(k)&&(k!='admin'||ISOWN()));
  const gl=g=='Stock & People'&&!ks.some(k=>['staff','holidays','contacts'].includes(k))?'Stock':g;
  return ks.length?`<div class="nl">${esc(gl)}</div>`+ks.map(k=>`<button class="nav ${k==view?'on':''}" style="--n:${n++}" title="${esc(VIEWS[k].t)}" ${A('go',k)} ${k==view?'aria-current="page"':''}>${svg(IC[k])}<span>${esc(VIEWS[k].t)}</span>${b[k]?`<i>${b[k]}</i>`:''}</button>`).join(''):''}).join('')}

function go(v){
  document.body.classList.remove('sopen');closeFpop();
  if(!VIEWS[v])return;
  if(!canSee(v)||(v=='admin'&&!ISOWN())){pendView=v;swRole();return}
  view=v;q='';$('#q').value='';sbSync();render()}

function render(){
  if(!canSee(view)||(view=='admin'&&!ISOWN()))view=HOME();
  const V=VIEWS[view];
  $('#nav').innerHTML=navHtml(badges());
  let h;try{h=V.fn()}catch(e){console.error(e);h=`<div class="panel"><h2>Something Went Wrong</h2><p class="muted">${esc(e.message)}</p></div>`}
  const m=$('#main');m.innerHTML=h;
  document.body.classList.toggle('lv',view=='live');
  document.body.classList.toggle('isadm',ISADM());
  shellSync();
  $$('#main .kpi,#main .panel,#main .col,#main .bc,#main .cc,#main .dlane,#main .supc').forEach((e,i)=>e.style.setProperty('--i',Math.min(i,14)));
  if(view!=lastView){countUp();lastView=view;m.classList.remove('enter');void m.offsetWidth;if(view!='live')m.classList.add('enter');clearTimeout(render.t);render.t=setTimeout(()=>m.classList.remove('enter'),1200);m.scrollTop=0}
  try{V.after&&V.after()}catch(e){console.error(e)}
}

/* ---- sidebar footer, top bar, bell ---- */
function shellSync(){
  const m=me();
  $('#av').textContent=initials(USER);$('#whoN').textContent=USER;$('#whoR').textContent=(m&&m.role?m.role+' · ':'')+ROLES[ROLE].n;
  $('#acct').innerHTML=svg(IC.switch)+'<span>'+esc(ROLES[ROLE].n)+'</span>';
  $('#adminbar').textContent=ROLES[ROLE].n+' account: '+ROLES[ROLE].d;
  const sec=$('#secbar'),dp=ISOWN()&&Object.values(S.sec.pins).some(p=>p.def);
  sec.classList.toggle('on',!!(dp||!window.isSecureContext));
  sec.textContent=!window.isSecureContext?'This page is not on a secure (https) connection: the camera scanner and some protections will not work.':dp?'Some accounts still use the default PIN 1234. Change them in Admin console.':'';
  $$('#nwm button').forEach(b=>b.style.display=canSee(b.dataset.v)?'':'none');
  const c=ncCount(),bn=$('#bellN');bn.textContent=c>99?'99+':c;bn.style.display=c?'':'none';
  if($('#nc').classList.contains('open'))ncDraw();
  $('#itemCodes').innerHTML=[...new Set(S.items.map(x=>x.item))].sort().map(x=>`<option value="${esc(x)}">`).join('');const d=$('#locs');d.innerHTML=[...new Set(S.items.map(x=>x.location).filter(x=>x&&x!='-'))].sort().map(x=>`<option value="${esc(x)}">`).join('');
}

/* ---- toast ---- */
function toast(t){if(document.body.classList.contains('tv'))return;const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',3400)}

/* ---- modal ---- */
function openModal(h,size){const b=$('#mbox');b.className='mb'+(size?' '+size:'');b.innerHTML=h;$('#modal').classList.add('open');b.scrollTop=0;
  if(size!='full')setTimeout(()=>{const f=b.querySelector('input:not([readonly]):not([type=hidden]):not([type=checkbox]),select,textarea');if(f&&matchMedia('(pointer:fine)').matches)f.focus({preventScroll:true})},60)}
/* "next" fields: Mobile 2 shows once Mobile 1 has something in it, and so on */
const nxHid=(f,v)=>!!f.nx&&!String(v[f.nx]??'').trim()&&!String(v[f.k]??'').trim();
document.addEventListener('input',e=>{const el=e.target;if(!el.id||!el.id.startsWith('f_'))return;const k=el.id.slice(2);
  $$(`#mbox [data-nx="${k}"]`).forEach(r=>{const own=r.querySelector('input,select,textarea');r.hidden=!el.value.trim()&&!(own&&own.value.trim())})});
function closeModal(){$('#modal').classList.remove('open');const a=document.activeElement;if(a&&a!==document.body&&!a.closest('#modal'))a.blur()}
$('#modal').addEventListener('mousedown',e=>{if(e.target.id=='modal')closeModal()});

/* ---- generic form ----
   field: {k,l,t:text|number|date|select|area|colour|password|email|tel, o:[options], req, pos, ro, w:'full', scan, list, max, min, dp, hint} */
let tmp=null,tmpDraw=null;
function form(title,fields,v,cb,photos,size){
  v=v||{};tmp=photos?(v.photos||[]).filter(SAFE.img).slice():null;tmpDraw=drawThumbs;
  const sel=f=>{const cur=v[f.k]??'',has=f.o.some(o=>String(Array.isArray(o)?o[0]:o)==String(cur));return `<select id="f_${f.k}" ${f.ro?'disabled':''}>${(cur!==''&&!has?[cur,...f.o]:f.o).map(o=>{const[val,lab]=Array.isArray(o)?o:[o,o||'-'];return `<option value="${esc(val)}"${String(val)==String(v[f.k]??'')?' selected':''}>${esc(lab)}</option>`}).join('')}</select>`};
  const inp=f=>f.t=='colour'?colourField(f,v):f.t=='select'?sel(f):f.t=='area'?`<textarea id="f_${f.k}" rows="3" maxlength="${f.max||2000}">${esc(v[f.k]||'')}</textarea>`
    :`<input id="f_${f.k}" type="${f.t||'text'}"${f.t=='number'?` step="any" min="${f.min??0}"${f.max?` max="${f.max}"`:''} inputmode="decimal"`:` maxlength="${f.max||120}"`} value="${esc(v[f.k]??'')}"${f.ro?' readonly':''}${f.list?` list="${f.list}"`:''} autocomplete="off">`;
  openModal(`<h2>${esc(title)}</h2><div class="grid">${fields.map(f=>`<div class="ff ${f.w||''}"><label for="f_${f.k}">${esc(f.l)}${f.req?' *':''}</label>${f.scan?`<div class="inl">${inp(f)}<button type="button" class="btn scan sm" ${A('scanInto','f_'+f.k)}>Scan</button></div>`:inp(f)}${f.hint?`<span class="hint">${esc(f.hint)}</span>`:''}</div>`).join('')}
   ${photos?`<div class="ff full"><label>Photos <span class="muted">(up to ${MAX_PHOTOS})</span></label><div class="thumbs" id="thumbs"></div><div class="prow"><label class="btn ghost sm">Take photo<input type="file" accept="image/*" capture="environment" hidden onchange="addPh(this)"></label><label class="btn ghost sm">Choose from gallery<input type="file" accept="image/*" multiple hidden onchange="addPh(this)"></label></div></div>`:''}</div>
   <div class="mact"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" id="saveBtn">Save changes</button></div>`,size);
  if(photos)drawThumbs();
  $('#saveBtn').onclick=()=>{const o=readFields(fields);if(!o)return;if(photos)o.photos=tmp;if(cb(o)===false)return;store();closeModal();render()}}
/* read + validate form fields; returns null (and focuses the field) when invalid */
function readFields(fields){const o={};
  for(const f of fields){const e=$('#f_'+f.k);if(!e)continue;const raw=(e.value||'').trim(),lab=f.l.replace(/ \(.*\)/,'');
    if(f.req&&!raw){toast(lab+' is required');e.focus();return null}
    if(f.t=='number'){if(raw===''){o[f.k]=0;continue}const n=SAFE.num(raw,{min:f.min??0,max:f.max??1e9,dp:f.dp??2});if(n==null||(f.pos&&!(n>0))){toast(lab+' must be a '+(f.pos?'positive ':'')+'number');e.focus();return null}if(parseFloat(raw)!=n&&(parseFloat(raw)<(f.min??0)||parseFloat(raw)>(f.max??1e9))){toast(lab+' must be between '+(f.min??0)+' and '+(f.max??1e9));e.focus();return null}o[f.k]=n}
    else if(f.t=='date'){if(raw&&!SAFE.date(raw)){toast(lab+' is not a valid date');e.focus();return null}o[f.k]=raw}
    else if(f.t=='email'){if(raw&&!SAFE.email(raw)){toast(lab+' does not look like an email address');e.focus();return null}o[f.k]=raw}
    else o[f.k]=SAFE.text(raw,f.t=='area'?(f.max||2000):(f.max||120));
    if(f.t=='colour')o[f.k+'Hex']=raw?SAFE.hex($('#f_'+f.k+'_hex').value):'';}
  return o}
function colourField(f,v){const base=f.k.slice(0,-4),hx=SAFE.hex(v[base]||'#8a8a8a');
  return `<div class="inl"><input id="f_${f.k}" placeholder="Colour name (optional)" maxlength="30" value="${esc(v[f.k]??'')}"><input type="hidden" id="f_${f.k}_hex" value="${hx}"><button type="button" class="cbtn" id="cb_${f.k}" style="background:${hx}" title="Pick a colour" aria-label="Pick a colour" ${A('cpOpen',f.k)}></button></div><div class="sws"><button type="button" class="mini" ${A('pickC',f.k,'','#8a8a8a')}>No Colour</button>${PRE.map(([n,h])=>`<button type="button" class="sw" title="${n}" aria-label="${n}" style="background:${h}" ${A('pickC',f.k,n,h)}></button>`).join('')}</div>`}
function pickC(k,n,h){$('#f_'+k).value=n;$('#f_'+k+'_hex').value=h;const b=$('#cb_'+k);if(b)b.style.background=h}
function pickHex(k){const e=$('#f_'+k);if(!e.value)e.value='Custom'}
/* ---- colour picker: window and door finishes first, then any colour ---- */
const FINISH=[['White (RAL 9016)','#f1f0ea'],['Cream (RAL 9001)','#e9e0c8'],['Agate Grey (RAL 7038)','#b5b8b1'],['Light Grey (RAL 7035)','#c5c7c4'],['Slate Grey (RAL 7015)','#51565c'],['Anthracite Grey (RAL 7016)','#383e42'],['Basalt Grey (RAL 7012)','#575d5e'],['Black (RAL 9005)','#0e0e10'],['Black Brown (RAL 8022)','#1e1a1a'],['Chartwell Green','#a9bba5'],['Fir Green (RAL 6009)','#27352a'],['Pebble Grey (RAL 7032)','#b8b799'],['Steel Blue (RAL 5011)','#1a2b3c'],['Ruby Red (RAL 3003)','#7b1c20'],['Golden Oak','#b5752f'],['Irish Oak','#8a5a33'],['Rosewood','#5a2a1f'],['Light Oak','#c79a5c'],['Gold','#c9a24b'],['Silver','#b9b9b9']];
let CP={k:'',h:0,s:0,v:0};
const hsv2hex=(h,s,v)=>{const f=n=>{const k=(n+h/60)%6;return v-v*s*Math.max(0,Math.min(k,4-k,1))};return '#'+[f(5),f(3),f(1)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('')};
const hex2hsv=x=>{const n=parseInt(x.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),d=mx-Math.min(r,g,b);let h=0;if(d){h=mx==r?((g-b)/d)%6:mx==g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360}return{h,s:mx?d/mx:0,v:mx}};
function cpOpen(k){let p=$('#cpop');if(!p){p=document.createElement('div');p.id='cpop';document.body.appendChild(p);
    document.addEventListener('mousedown',e=>{const q=$('#cpop');if(q&&q.classList.contains('open')&&!e.target.closest('#cpop,.cbtn'))q.classList.remove('open')})}
  if(p.classList.contains('open')&&CP.k==k){p.classList.remove('open');return}
  const hx=SAFE.hex($('#f_'+k+'_hex').value);CP={k,...hex2hsv(hx)};const cur=($('#f_'+k).value||'').toLowerCase();
  p.innerHTML=`<div class="cp-h"><b>Pick a colour</b><button type="button" class="cp-x" aria-label="Close" onclick="$('#cpop').classList.remove('open')">&times;</button></div>
   <small class="cp-l">Window and door finishes</small><div class="cp-g">${FINISH.map(([n,h])=>`<button type="button" class="cp-s ${cur==n.toLowerCase()?'on':''}" title="${esc(n)}" ${A('cpPick',n,h)}><i style="background:${h}"></i><span>${esc(n.replace(/ \(RAL \d+\)/,''))}</span></button>`).join('')}</div>
   <small class="cp-l">Any colour</small><div class="cp-sv" id="cpSv"><i id="cpKnob"></i></div><input type="range" class="cp-hue" id="cpHue" min="0" max="359" value="${Math.round(CP.h)}" oninput="cpHue(this.value)" aria-label="Hue">
   <div class="cp-row"><span class="cp-pv" id="cpPv"></span><label class="cp-hx">Hex<input id="cpHex" maxlength="7" value="${hx}" oninput="cpHexIn(this.value)" class="nocap"></label><button type="button" class="btn sm" onclick="cpUse()">Use colour</button></div>
   <button type="button" class="cp-none" ${A('cpPick','','#8a8a8a')}>No colour</button>`;
  p.classList.add('open');const b=$('#cb_'+k).getBoundingClientRect();
  p.style.left=Math.max(8,Math.min(innerWidth-p.offsetWidth-8,b.right-p.offsetWidth))+'px';p.style.top=Math.max(8,Math.min(innerHeight-p.offsetHeight-8,b.bottom+8))+'px';
  const sv=$('#cpSv'),drag=e=>{const r=sv.getBoundingClientRect();CP.s=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));CP.v=1-Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));cpDraw(true)};
  sv.addEventListener('pointerdown',e=>{sv.setPointerCapture(e.pointerId);drag(e);sv.onpointermove=drag});sv.addEventListener('pointerup',()=>{sv.onpointermove=null});cpDraw(false)}
function cpDraw(setHex){const hx=hsv2hex(CP.h,CP.s,CP.v),sv=$('#cpSv');if(!sv)return;sv.style.background=`linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${CP.h},100%,50%))`;
  const k=$('#cpKnob');k.style.left=CP.s*100+'%';k.style.top=(1-CP.v)*100+'%';k.style.background=hx;$('#cpPv').style.background=hx;if(setHex)$('#cpHex').value=hx}
function cpHue(v){CP.h=+v;cpDraw(true)}
function cpHexIn(v){if(/^#[0-9a-f]{6}$/i.test(v)){Object.assign(CP,hex2hsv(v));$('#cpHue').value=Math.round(CP.h);cpDraw(false)}}
function cpUse(){const hx=SAFE.hex($('#cpHex').value),n=$('#f_'+CP.k);pickC(CP.k,n.value&&![...FINISH,...PRE].some(f=>f[0].toLowerCase()==n.value.toLowerCase())?n.value:'Custom',hx);$('#cpop').classList.remove('open')}
function cpPick(n,h){pickC(CP.k,n,h);$('#cpop').classList.remove('open')}
function scanInto(id){scan(c=>{const e=$('#'+id);if(e){e.value=c;e.dispatchEvent(new Event('input'))}})}

/* ---- photos: resized + compressed before storing, capped per record ---- */
function drawThumbs(){const t=$('#thumbs');if(!t)return;t.innerHTML=tmp.map((p,i)=>`<div class="th"><img src="${SAFE.img(p)}" alt="Photo ${i+1}"><button type="button" aria-label="Remove photo" ${A('rmPh',i)}>&times;</button></div>`).join('')||'<span class="muted">No photos yet.</span>'}
function rmPh(i){tmp.splice(i,1);tmpDraw&&tmpDraw()}
function addPh(inp){const files=[...inp.files].filter(f=>/^image\//.test(f.type));inp.value='';
  const room=MAX_PHOTOS-tmp.length;if(room<=0){toast('Up to '+MAX_PHOTOS+' photos per record');return}
  if(files.length>room)toast('Only the first '+room+' photo'+(room>1?'s':'')+' were added (limit '+MAX_PHOTOS+')');
  files.slice(0,room).forEach(f=>{if(f.size>25e6){toast(f.name+' is too large');return}const img=new Image();
    img.onload=()=>{const s=Math.min(1,1280/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);tmp.push(c.toDataURL('image/jpeg',.7));URL.revokeObjectURL(img.src);tmpDraw&&tmpDraw()};
    img.onerror=()=>toast('That file could not be read as an image');img.src=URL.createObjectURL(f)})}
const gallery=a=>{a=(a||[]).filter(SAFE.img);return a.length?`<div class="gal">${a.map((p,i)=>`<img src="${p}" alt="Photo ${i+1}" ${A('viewPhoto',p)}>`).join('')}</div>`:''};
function viewPhoto(p){const w=window.open('','_blank');if(!w)return;w.document.write(`<title>Photo</title><body style="margin:0;background:#111;display:grid;place-items:center;height:100vh"><img src="${SAFE.img(p)}" style="max-width:100%;max-height:100vh">`);w.document.close()}
const phCount=a=>a&&a.length?`<span class="tag n">${a.length} photo${a.length>1?'s':''}</span>`:'';

/* ---- pagination ---- */
function paginate(st,rows){const per=+st.per||0,pages=per>0?Math.max(1,Math.ceil(rows.length/per)):1;st.page=Math.min(Math.max(1,st.page||1),pages);const s=per>0?(st.page-1)*per:0;
  return{rows:per>0?rows.slice(s,s+per):rows,from:rows.length?s+1:0,to:per>0?Math.min(rows.length,s+per):rows.length,total:rows.length,pages}}
function pagerH(key,p,label){const st=UI[key];if(!p.total)return'';
  const nums=[];for(let i=1;i<=p.pages;i++)if(i==1||i==p.pages||Math.abs(i-st.page)<=1)nums.push(i);else if(nums[nums.length-1]!='…')nums.push('…');
  return `<div class="pager"><span>Showing ${p.from}–${p.to} of ${p.total} ${esc(label||'rows')}</span><span class="acts">${p.pages>1?`<button class="mini" ${A('setUI',key+'.page',st.page-1)} ${st.page<=1?'disabled':''} aria-label="Previous page">&lsaquo;</button>${nums.map(n=>n=='…'?'<span class="muted">…</span>':`<button class="mini ${n==st.page?'on':''}" ${A('setUI',key+'.page',n)}>${n}</button>`).join('')}<button class="mini" ${A('setUI',key+'.page',st.page+1)} ${st.page>=p.pages?'disabled':''} aria-label="Next page">&rsaquo;</button>`:''}
   <select class="fsel" aria-label="Rows per page" ${AC('onchange','setUI',key+'.per','this.value')}>${[25,50,100,0].map(n=>`<option value="${n}" ${+st.per==n?'selected':''}>${n||'All'} per page</option>`).join('')}</select></span></div>`}
/* sortable header cell */
const thS=(key,col,label,cls='')=>{const st=UI[key];return `<th class="srt ${cls}" ${A('sortBy',key,col)} aria-sort="${st.sort==col?(st.dir>0?'ascending':'descending'):'none'}">${esc(label)}${st.sort==col?`<span class="ar">${st.dir>0?'▲':'▼'}</span>`:''}</th>`};
function sortBy(key,col){const st=UI[key];st.dir=st.sort==col?-st.dir:1;st.sort=col;render()}
const cmp=(a,b)=>typeof a=='number'&&typeof b=='number'?a-b:String(a??'').localeCompare(String(b??''),'en',{numeric:true,sensitivity:'base'});

/* ---- floating sort/filter popover ---- */
function openFpop(btn,html){const p=$('#fpop');if(p.classList.contains('open')&&p.dataset.for==btn.id){closeFpop();return}
  p.innerHTML=html;p.dataset.for=btn.id;p.classList.add('open');const r=btn.getBoundingClientRect(),w=p.offsetWidth;
  p.style.top=Math.min(innerHeight-p.offsetHeight-8,r.bottom+6)+'px';p.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px'}
function closeFpop(){const p=$('#fpop');if(p)p.classList.remove('open')}
document.addEventListener('mousedown',e=>{if(!e.target.closest('#fpop,.fbtn'))closeFpop()});

/* ---- theme + logos ---- */
const LOGO_SRC={blue:ASSETS.logoTextBlue,white:ASSETS.logoTextWhite,full:ASSETS.logoFull,textBlue:ASSETS.logoTextBlue,textWhite:ASSETS.logoTextWhite,emblem:ASSETS.emblem,icon:ASSETS.emblemIcon};
function setTh(t){document.body.dataset.theme=t;try{localStorage.setItem('bb_theme',t)}catch(e){}
  $('#thb').innerHTML=svg(t=='dark'?IC.sun:IC.moon);$$('.lg-auto').forEach(i=>i.src=t=='dark'?LOGO_SRC.textWhite:LOGO_SRC.textBlue)}

/* ---- top bar wiring ---- */
function sbSync(){$('#sb').classList.toggle('has',!!$('#q').value)}
(function shell(){
  $('#mnb').innerHTML=svg(IC.menu);$('#sbIc').outerHTML=svg(IC.search);$('#bell').insertAdjacentHTML('afterbegin',svg(IC.bell));
  $('#nwb').innerHTML=svg(IC.plus)+'<span>New</span>';$('#scanBtn').innerHTML=svg(IC.scan)+'<span>Scan barcode</span>';
  $$('.lg-w').forEach(i=>i.src=LOGO_SRC.white);$$('.lg-e').forEach(i=>i.src=LOGO_SRC.emblem);$('#fav').href=LOGO_SRC.icon;document.documentElement.style.setProperty('--hero-emblem','url("'+LOGO_SRC.emblem+'")');
  let th='light';try{th=localStorage.getItem('bb_theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch(e){}setTh(th);
  $('#thb').onclick=()=>setTh(document.body.dataset.theme=='dark'?'light':'dark');
  $('#mnb').onclick=()=>document.body.classList.add('sopen');$('#scrim').onclick=()=>document.body.classList.remove('sopen');
  $('#meBtn').onclick=editProfile;$('#acct').onclick=swRole;$('#bell').onclick=()=>ncToggle(true);$('#ncbg').onclick=()=>ncToggle(false);
  $('#scanBtn').onclick=()=>scan(found);
  $('#q').addEventListener('input',e=>{q=SAFE.text(e.target.value,80).toLowerCase();Object.values(UI).forEach(s=>{if('page' in s)s.page=1});sbSync();render()});
  $('#qClr').onclick=()=>{$('#q').value='';q='';sbSync();render();$('#q').focus()};
  $('#nwb').onclick=e=>{e.stopPropagation();$('#nwm').classList.toggle('open')};
  document.addEventListener('click',()=>$('#nwm').classList.remove('open'));
  $('#nwm').onclick=e=>{const b=e.target.closest('button');if(!b)return;({lead:()=>editLead(),call:()=>editCall(),contact:()=>editContact(),stock:()=>{go('stock');stockForm('add')},request:()=>{go('stock');stockForm('request')},hol:()=>holBook(),doc:()=>docOpen('guarantee'),files:()=>go('downloads')})[b.dataset.a]()};
  $('#manualGo').onclick=()=>got($('#manual').value);$('#manual').onkeydown=e=>{if(e.key=='Enter')got(e.target.value)};$('#scanClose').onclick=stopScan;
  document.addEventListener('keydown',e=>{
    if(e.key=='Escape'){closeModal();stopScan();ncToggle(false);closeFpop();document.body.classList.remove('sopen');if(document.body.classList.contains('tv'))toggleTV()}
    if(e.key=='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!$('.ov.open')){e.preventDefault();$('#q').focus()}});
})();

/* numbers in the tiles count up when a page opens */
function countUp(){if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  $$('#main .kpi b').forEach(el=>{const t=el.textContent,m=t.match(/[\d,]+(\.\d+)?/);if(!m||t.length>14)return;
    const n=parseFloat(m[0].replace(/,/g,'')),dp=(m[1]||'').length-1,a=t.slice(0,m.index),b=t.slice(m.index+m[0].length),cm=m[0].includes(','),t0=performance.now();if(!(n>0))return;
    const f=x=>{const p=Math.min(1,(x-t0)/800),v=n*(1-Math.pow(1-p,3)),s=dp>0?v.toFixed(dp):Math.round(v);el.textContent=a+(cm?Number(s).toLocaleString('en-GB',{minimumFractionDigits:Math.max(0,dp),maximumFractionDigits:Math.max(0,dp)}):s)+b;if(p<1)requestAnimationFrame(f);else el.textContent=t};requestAnimationFrame(f)})}

/* ---- step-by-step wizard: steps [{t,d,f:[fields]} | {t,d,review:1}], v = values, check(step,v) -> error, save(v) ---- */
let WZ=null;
function wizard(o){WZ={...o,st:0,seen:0};wzDraw()}
function wzDraw(){const W=WZ,st=W.steps[W.st],last=W.st==W.steps.length-1;
  const lab=f=>{const val=W.v[f.k];return f.t=='number'?(val?val:''):val};
  const rev=()=>W.steps.filter(x=>x.f).map(x=>`<div class="wz-r"><h3>${esc(x.t)} <button class="mini" ${A('wzGo',W.steps.indexOf(x))}>Change</button></h3>${x.f.filter(f=>!(f.nx&&!W.v[f.k])).map(f=>`<div class="si"><span>${esc(f.l.replace(/ \(.*\)/,''))}</span><b class="${f.t=='email'||/email|web|url/i.test(f.k)?'nocap':''}">${esc(lab(f))||'<span class="muted">-</span>'}</b></div>`).join('')}</div>`).join('');
  openModal(`<button class="mx" onclick="closeModal()" aria-label="Close">&times;</button><h2>${esc(W.title)}</h2>
   <div class="stp wz">${W.steps.map((x,i)=>`<span class="${i<=W.st?'on':''} ${i<=W.seen||W.edit?'go':''}" ${i<=W.seen||W.edit?A('wzGo',i):''}><i>${i<W.st?'&#10003;':i+1}</i>${esc(x.t)}</span>`).join('')}</div>
   <p class="muted wz-d">Step ${W.st+1} of ${W.steps.length}: ${esc(st.d||'')}</p>
   <div class="wz-b">${st.review?rev():`<div class="grid">${st.f.map(f=>fieldH(f,W.v)).join('')}</div>`}</div>
   <div class="mact">${W.del?`<button class="btn ghost l" style="color:var(--red)" onclick="WZ.del()">Delete</button>`:''}${W.st?'<button class="btn ghost" onclick="wzStep(-1)">Back</button>':'<button class="btn ghost" onclick="closeModal()">Cancel</button>'}${W.edit&&!last?'<button class="btn ghost" onclick="wzSave()">Save now</button>':''}${last?`<button class="btn green" onclick="wzSave()">${esc(W.saveLabel||'Save')}</button>`:'<button class="btn" onclick="wzStep(1)">Next</button>'}</div>`,'md');
  const f=$('#mbox .wz-b input:not([readonly]),#mbox .wz-b textarea');if(f&&matchMedia('(pointer:fine)').matches)setTimeout(()=>f.focus(),80)}
function wzRead(){const st=WZ.steps[WZ.st];if(st.review)return true;const o=readFields(st.f);if(!o)return false;Object.assign(WZ.v,o);const e=WZ.check&&WZ.check(WZ.st,WZ.v);if(e){toast(e);return false}return true}
function wzStep(d){if(d>0&&!wzRead())return;if(d<0){const st=WZ.steps[WZ.st];if(!st.review){const o={};st.f.forEach(f=>{const e=$('#f_'+f.k);if(!e)return;const r=(e.value||'').trim();o[f.k]=f.t=='number'?(SAFE.num(r,{min:f.min??0,max:f.max??1e9,dp:f.dp??2})??0):f.t=='date'?SAFE.date(r):SAFE.text(r,f.t=='area'?(f.max||2000):(f.max||120))});Object.assign(WZ.v,o)}}
  WZ.st=Math.max(0,Math.min(WZ.steps.length-1,WZ.st+d));WZ.seen=Math.max(WZ.seen,WZ.st);wzDraw()}
function wzGo(i){if(i>WZ.seen&&!WZ.edit)return;if(i!=WZ.st&&!wzRead())return;WZ.st=i;WZ.seen=Math.max(WZ.seen,i);wzDraw()}
function wzSave(){if(!wzRead())return;for(let i=0;i<WZ.steps.length;i++){const e=WZ.check&&WZ.check(i,WZ.v);if(e){WZ.st=i;wzDraw();toast(e);return}}WZ.save(WZ.v);store();closeModal();render()}
