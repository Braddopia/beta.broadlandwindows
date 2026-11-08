/* ==========================================================================
   04 · Shell: views registry, navigation, render loop, modal, forms,
        photos, pagination, toast, theme, top bar
   ========================================================================== */
/* All page-level UI state lives here (instead of a dozen loose globals) */
const UI={
  svc:{f:'open',page:1,per:50},
  inv:{v:'products',f:'all',sup:'all',loc:'all',unit:'all',sort:'item',dir:1,page:1,per:50},
  mov:{f:'all',sort:'',dir:1,page:1,per:50},
  cal:{m:'month',o:0,sd:null,ly:{fit:1,svc:1,del:1,hol:1}},
  hol:{m:0,v:'chart',cm:new Date().getMonth(),y:new Date().getFullYear(),brush:''}, rep:{t:'summary'}, fin:{t:'debtors',pm:0},
  del:{f:'out',s:'all',v:'list'}, files:{cat:'all',az:0,list:0,ssq:'',page:1,per:50},
  con:{f:'all'}, board:'factory', msg:{box:'in',to:'Everyone'}, staff:{c:'all'}, sup:{open:''}, lead:{v:'list',f:'live',src:'all',own:'all',sort:'id',dir:1,page:1,per:50}, ctr:{v:'list',f:'cur',sort:'id',dir:1,page:1,per:50}, nc:{t:'All'}, audit:{page:1,per:50}
};
function setUI(path,val){const p=path.split('.');let o=UI;for(let i=0;i<p.length-1;i++)o=o[p[i]];o[p[p.length-1]]=val;if(p.length==2&&p[1]!='page'&&UI[p[0]]&&typeof UI[p[0]]=='object'&&'page' in UI[p[0]])UI[p[0]].page=1;render()}
function togUI(path){const p=path.split('.');let o=UI;for(let i=0;i<p.length-1;i++)o=o[p[i]];const k=p[p.length-1];o[k]=o[k]?0:1;render()}

/* ---- views: key -> title, page function, optional after-render hook ---- */
const VIEWS={
  home:{t:'Overview',fn:vHome}, messages:{t:'Messages',fn:vMessages,after:msnAfter}, live:{t:'Floor Boards',fn:vLive,after:liveAfter},
  deliveries:{t:'Deliveries',fn:vDeliveries}, suppliers:{t:'Suppliers',fn:vSuppliers},
  leads:{t:'Leads',fn:vLeads}, contracts:{t:'Contracts',fn:vContracts},
  fitting:{t:'Calendar',fn:vCalendar}, service:{t:'Service Calls',fn:vService},
  stock:{t:'Inventory',fn:vStock}, contacts:{t:'Contact Book',fn:vContacts},
  staff:{t:'Staff',fn:vStaff}, holidays:{t:'Holiday Planner',fn:vHolidays},
  reports:{t:'Reports',fn:vReports}, downloads:{t:'Files',fn:vFiles,after:loadMan},
  finance:{t:'Finance',fn:vFinance}, admin:{t:'Admin Console',fn:vAdmin}, settings:{t:'Settings',fn:vSettings}
};
const NG=[['Workspace',['home','messages']],['Sales',['leads','contracts']],['Operations',['live','deliveries','fitting','service']],['Stock & People',['stock','suppliers','contacts','staff','holidays']],['Insights',['reports','downloads']],['Admin',['finance','admin','settings']]];
let view=HOME(),q='',lastView='';

/* page filter: same matching as the top-bar search (19-search.js), so phone lists and spacing differences match too */
const hit=o=>!q||srchMatch(srchText(o),q);

function badges(){const td=today();return{
  messages:msgUnread(),
  leads:S.leads.filter(l=>!['Won','Lost'].includes(l.stage)).length,
  service:S.calls.filter(c=>c.status!='Complete').length,
  fitting:ISOWN()?S.contracts.filter(c=>c.fit&&c.stage!='Complete').length:0,
  stock:S.items.filter(r=>r.type=='request'&&r.reqStatus=='Pending').length,
  staff:ISOWN()?S.hols.filter(h=>h.status=='Pending').length:0,
  holidays:ISOWN()?S.hols.filter(h=>h.status=='Pending').length:0}}

function navHtml(b){let n=0;return NG.map(([g,keys])=>{const ks=keys.filter(k=>canSee(k)&&(k!='admin'||ISOWN()));
  const gl=g=='Admin'&&ks.every(k=>k=='settings')?'You':g=='Stock & People'&&!ks.some(k=>['staff','holidays','contacts'].includes(k))?'Stock':g;
  return ks.length?`<div class="nl">${esc(gl)}</div>`+ks.map(k=>`<button class="nav ${k==view?'on':''}" style="--n:${n++}" title="${esc(VIEWS[k].t)}" ${A('go',k)} ${k==view?'aria-current="page"':''}>${svg(IC[k])}<span>${esc(VIEWS[k].t)}</span>${b[k]?`<i>${b[k]}</i>`:''}</button>`).join(''):''}).join('')}

function go(v){
  document.body.classList.remove('sopen');closeFpop();
  if(!VIEWS[v])return;
  if(!canSee(v)||(v=='admin'&&!ISOWN())){pendView=v;swRole();return}
  view=v;q='';$('#q').value='';sbSync();render()}

function render(soft){
  if(!canSee(view)||(view=='admin'&&!ISOWN()))view=HOME();
  const V=VIEWS[view];
  $('#nav').innerHTML=navHtml(badges());
  let h;try{h=V.fn()}catch(e){console.error(e);h=`<div class="panel"><h2>Something Went Wrong</h2><p class="muted">${esc(e.message)}</p></div>`}
  const m=$('#main');if(soft&&view==lastView)morph(m,h);else m.innerHTML=h;
  document.body.dataset.view=view;document.body.classList.toggle('lv',view=='live');document.body.classList.toggle('vmsg',view=='messages');
  requestAnimationFrame(()=>$$('#main .kpi>b').forEach(b=>b.style.setProperty('--n',Math.max(2,b.textContent.trim().length))));
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
/* short 'working' state on a button so a press always shows it was felt */
function busyBtn(b,ms){if(!b||b.classList.contains('busy'))return;b.classList.add('busy');b.setAttribute('aria-busy','true');setTimeout(()=>{b.classList.remove('busy');b.removeAttribute('aria-busy')},ms||600)}
function toast(t){if(document.body.classList.contains('tv'))return;const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',3400)}

/* ---- modal ---- */
let REC_STASH=null;
function openModal(h,size){const b=$('#mbox'),isRec=/^\s*<div class="rw[ "]/.test(h);
  if(isRec)REC_STASH=null;else if(!REC_STASH&&$('#modal').classList.contains('open')&&typeof RW!='undefined'&&RW){const rw=b.querySelector(':scope>.rw');if(rw){const rb=rw.querySelector('.rw-b');REC_STASH={node:rw,cls:b.className,rw:RW,sy:rb?rb.scrollTop:0};rw.remove()}}
  b.className='mb '+(size||'md'); /* one standard width unless a window needs another */b.innerHTML=h;$('#modal').classList.add('open');b.scrollTop=0;
  if(size!='full')setTimeout(()=>{const f=b.querySelector('input:not([readonly]):not([type=hidden]):not([type=checkbox]),select,textarea');if(f&&matchMedia('(pointer:fine)').matches)f.focus({preventScroll:true})},60)}
/* "next" fields: Mobile 2 shows once Mobile 1 has something in it, and so on */
const nxHid=(f,v)=>!!f.nx&&!String(v[f.nx]??'').trim()&&!String(v[f.k]??'').trim();
document.addEventListener('change',e=>{const el=e.target;if(el.tagName=='SELECT'&&typeof NEWCO!='undefined'&&el.value===NEWCO){supNewCo();return}if(el.tagName=='SELECT'&&el.value===RANDOM_SP){const L=OWNERS().filter(x=>x!='Unassigned');const pick=L[Math.floor(Math.random()*L.length)]||'Unassigned';el.value=pick;toast('Picked at random: '+pick)}});
document.addEventListener('input',e=>{const el=e.target;if(!el.id||!el.id.startsWith('f_'))return;const k=el.id.slice(2);
  $$(`#mbox [data-nx="${k}"]`).forEach(r=>{const own=r.querySelector('input,select,textarea');r.hidden=!el.value.trim()&&!(own&&own.value.trim())})});
/* styled confirmation instead of the browser's own box */
let ASK=null,ASK_NO=null;
function askYes(title,msg,okLabel,cb,danger,noCb){ASK=cb;ASK_NO=noCb||null;openModal(`<div class="ask"><div class="ask-ic ${danger?'r':''}">${danger?'!':'?'}</div><h2>${esc(title)}</h2><p class="muted">${esc(msg)}</p></div><div class="mact"><button class="btn ghost" data-act="askNo">${noCb?'No, go back':'Cancel'}</button><button class="btn ${danger?'red':''}" data-act="askGo">${esc(okLabel||'Yes')}</button></div>`,'sm')}
/* askIn: our own confirm box, layered above any open window. Esc or Cancel closes it. */
let ASKI=null;
function askIn(title,msg,okLabel,cb,danger){if(ASKI)ASKI.remove();const o=document.createElement('div');o.className='aski';o.setAttribute('role','alertdialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label',title);
  o.innerHTML=`<div class="aski-b"><div class="ask-ic ${danger?'r':''}">${danger?'!':'?'}</div><h3>${esc(title)}</h3>${msg?`<p>${esc(msg)}</p>`:''}<div class="aski-a"><button type="button" class="btn ghost" data-a="0">Cancel</button><button type="button" class="btn ${danger?'red':'green'}" data-a="1">${esc(okLabel||'Yes')}</button></div></div>`;
  const key=e=>{if(e.key=='Escape'){e.stopPropagation();e.preventDefault();done(false)}},done=ok=>{o.remove();document.removeEventListener('keydown',key,true);if(ASKI===o)ASKI=null;if(ok&&cb)cb()};
  o.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b)done(b.dataset.a=='1');else if(e.target==o)done(false)});
  document.addEventListener('keydown',key,true);ASKI=o;document.body.appendChild(o);o.querySelector('[data-a="1"]').focus()}
/* "done" shown inside the same window with a tick, then it closes by itself */
function doneIn(msg){if(!$('#modal').classList.contains('open'))return;const b=$('#mbox'),id='dn'+Date.now();b.className='mb sm';
  b.innerHTML=`<div class="donein" id="${id}" role="status" aria-live="polite"><svg viewBox="0 0 52 52" class="dn-svg" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="M15 27l7 7 15-15"/></svg><h2>${esc(msg||'Saved')}</h2></div>`;
  setTimeout(()=>{if($('#'+id))closeModal()},1150)}
function askNo(){const f=ASK_NO;ASK=ASK_NO=null;closeModal();if(f)f()}
function askGo(){const f=ASK;ASK=null;closeModal();if(f)f()}
function closeModal(){if(REC_STASH){const s=REC_STASH,b=$('#mbox');REC_STASH=null;b.innerHTML='';b.className=s.cls;b.appendChild(s.node);RW=s.rw;$('#modal').classList.add('open');const rb=b.querySelector('.rw-b');if(rb)rb.scrollTop=s.sy;if(typeof recReturn=='function')recReturn();return}
  $('#modal').classList.remove('open');if(typeof syncPend!='undefined'&&syncPend)setTimeout(syncPull,0);const a=document.activeElement;if(a&&a!==document.body&&!a.closest('#modal'))a.blur()}
$('#modal').addEventListener('mousedown',e=>{if(e.target.id=='modal')closeModal()});

/* update the page in place: only the parts that changed are replaced, so glass panels are not rebuilt */
function morph(el,html){const t=document.createElement('template');t.innerHTML=html;morphKids(el,t.content)}
function morphKids(a,b){const X=[...a.childNodes],Y=[...b.childNodes];
  for(let i=0;i<Math.max(X.length,Y.length);i++){const an=X[i],bn=Y[i];
    if(!bn){an.remove();continue}if(!an){a.appendChild(bn);continue}
    if(an.nodeType!=bn.nodeType||an.nodeName!=bn.nodeName||/^(INPUT|SELECT|TEXTAREA|CANVAS|VIDEO|IFRAME)$/.test(an.nodeName)){a.replaceChild(bn,an);continue}
    if(an.nodeType!=1){if(an.nodeValue!==bn.nodeValue)an.nodeValue=bn.nodeValue;continue}
    if(an.isEqualNode(bn))continue;
    [...an.attributes].forEach(x=>{if(!bn.hasAttribute(x.name))an.removeAttribute(x.name)});[...bn.attributes].forEach(x=>{if(an.getAttribute(x.name)!==x.value)an.setAttribute(x.name,x.value)});
    morphKids(an,bn)}}
/* ---- generic form ----
   field: {k,l,t:text|number|date|select|area|colour|password|email|tel, o:[options], req, pos, ro, w:'full', scan, list, max, min, dp, hint} */
let tmp=null,tmpDraw=null;
function form(title,fields,v,cb,photos,size){
  v=v||{};tmp=photos?(v.photos||[]).filter(SAFE.img).slice():null;tmpDraw=drawThumbs;
  const sel=f=>{const cur=v[f.k]??'',has=f.o.some(o=>String(Array.isArray(o)?o[0]:o)==String(cur));return `<select id="f_${f.k}" ${f.ro?'disabled':''}>${(cur!==''&&!has?[cur,...f.o]:f.o).map(o=>{const[val,lab]=Array.isArray(o)?o:[o,o||'-'];return `<option value="${esc(val)}"${String(val)==String(v[f.k]??'')?' selected':''}>${esc(lab)}</option>`}).join('')}</select>`};
  const inp=f=>f.t=='colour'?colourField(f,v):f.t=='select'?sel(f):f.t=='area'?`<textarea id="f_${f.k}" rows="3" maxlength="${f.max||2000}">${esc(v[f.k]||'')}</textarea>`
    :`<input id="f_${f.k}" type="${f.t||'text'}"${f.t=='number'?` step="any" min="${f.min??0}"${f.max?` max="${f.max}"`:''} inputmode="decimal"`:` maxlength="${f.max||120}"`} value="${esc(v[f.k]??'')}"${f.ro?' readonly':''}${f.list?` list="${f.list}"`:''}${f.t=='email'||/url|web|portal|feed|link/i.test(f.k)?' class="nocap"':''} autocomplete="off">`;
  openModal(`<h2>${esc(title)}</h2><div class="grid">${fields.map(f=>f.t=='h'?`<h3 class="fsec full">${esc(f.l)}</h3>`:`<div class="ff ${f.w||''}"><label for="f_${f.k}">${esc(f.l)}${MARK(f.req,f.adm)}</label>${f.scan?`<div class="inl">${inp(f)}<button type="button" class="btn scan sm" ${A('scanInto','f_'+f.k)}>Scan</button></div>`:inp(f)}${f.hint?`<span class="hint ${/https?:|@/.test(f.hint)?'nocap':''}">${esc(f.hint)}</span>`:''}</div>`).join('')}
   ${photos?`<div class="ff full"><label>Photos <span class="muted">(up to ${MAX_PHOTOS})</span></label>${typeof photos=='string'?`<span class="hint">${esc(photos)}</span>`:''}<div class="thumbs phg" id="thumbs"></div><div class="prow"><label class="btn ghost sm">Take photo<input type="file" accept="image/*" capture="environment" hidden data-onchange="addPh" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]"></label><label class="btn ghost sm">Choose from gallery<input type="file" accept="image/*" multiple hidden data-onchange="addPh" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]"></label></div></div>`:''}</div>
   <div class="mact"><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" id="saveBtn">Save changes</button></div>`,size||'md'); /* every plain form is the same width */
  if(photos)drawThumbs();
  $('#saveBtn').onclick=()=>{const o=readFields(fields);if(!o)return;if(photos)o.photos=tmp;const bx=$('#mbox'),mk=bx.firstElementChild;if(cb(o)===false)return;store();render();if($('#modal').classList.contains('open')&&bx.firstElementChild===mk)doneIn('Saved')}}
/* read + validate form fields; returns null (and focuses the field) when invalid */
/* show a problem next to the box itself (and still as a message at the bottom) */
function fieldErr(e,msg){toast(msg);const w=e.closest('.rf,.ff');if(w){w.classList.add('err');let m=w.querySelector('.ferr');if(!m){m=document.createElement('em');m.className='ferr';w.appendChild(m)}m.textContent=msg;
    const d=w.closest('details');if(d)d.open=true;const sg=w.closest('.rg.shut');if(sg)sg.classList.remove('shut');const clr=()=>{w.classList.remove('err');m.remove();e.removeEventListener('input',clr);e.removeEventListener('change',clr)};e.addEventListener('input',clr);e.addEventListener('change',clr)}
  const p=e.closest('.rw-p');if(p&&!p.classList.contains('on')&&typeof recTab=='function')recTab(p.dataset.t);e.focus();if(e.scrollIntoView)e.scrollIntoView({block:'center'})}
function readFields(fields){const o={};
  for(const f of fields){if(f.t=='h')continue;const e=$('#f_'+f.k);if(!e)continue;if(f.adm&&!ISADM())continue;const raw=(e.value||'').trim(),lab=f.l.replace(/ \(.*\)/,'');
    if(f.req&&!raw){fieldErr(e,lab+' must be filled in');return null}
    if(f.t=='number'){if(raw===''){o[f.k]=0;continue}const n=SAFE.num(raw,{min:f.min??0,max:f.max??1e9,dp:f.dp??2});if(n==null||(f.pos&&!(n>0))){fieldErr(e,lab+' must be a '+(f.pos?'positive ':'')+'number');return null}if(parseFloat(raw)!=n&&(parseFloat(raw)<(f.min??0)||parseFloat(raw)>(f.max??1e9))){fieldErr(e,lab+' must be between '+(f.min??0)+' and '+(f.max??1e9));return null}o[f.k]=n}
    else if(f.t=='date'){if(raw&&!SAFE.date(raw)){fieldErr(e,lab+' is not a valid date');return null}o[f.k]=raw}
    else if(f.t=='email'){if(raw&&!SAFE.email(raw)){fieldErr(e,lab+' does not look like an email address');return null}o[f.k]=raw}
    else o[f.k]=SAFE.text(raw,f.t=='area'?(f.max||2000):(f.max||120));
    if(f.t=='colour')o[f.k+'Hex']=raw?SAFE.hex($('#f_'+f.k+'_hex').value):'';}
  return o}
function colourField(f,v){const base=f.k.slice(0,-4),hx=SAFE.hex(v[base]||'#8a8a8a');
  return `<div class="inl"><input id="f_${f.k}" placeholder="Colour name (optional)" maxlength="30" value="${esc(v[f.k]??'')}"><input type="hidden" id="f_${f.k}_hex" value="${hx}"><button type="button" class="cbtn" id="cb_${f.k}" style="background:${hx}" title="Pick a colour" aria-label="Pick a colour" ${A('cpOpen',f.k)}></button></div><div class="sws"><button type="button" class="mini" ${A('pickC',f.k,'','#8a8a8a')}>No Colour</button>${PRE.map(([n,h])=>`<button type="button" class="sw" title="${n}" aria-label="${n}" style="background:${h}" ${A('pickC',f.k,n,h)}></button>`).join('')}</div>`}
function pickC(k,n,h){$('#f_'+k).value=n;$('#f_'+k+'_hex').value=h;const b=$('#cb_'+k);if(b)b.style.background=h}
function pickHex(k){const e=$('#f_'+k);if(!e.value)e.value='Custom'}
/* ---- colour picker: window and door finishes first, then any colour ---- */
/* RAL Classic: [number, name, screen colour] (screen colours are close, not exact: always check a real swatch) */
const RAL=`1000|Green beige|BEBD7F;1001|Beige|C2B078;1002|Sand yellow|C6A664;1003|Signal yellow|E5BE01;1004|Golden yellow|CDA434;1005|Honey yellow|A98307;1006|Maize yellow|E4A010;1007|Daffodil yellow|DC9D00;1011|Brown beige|8A6642;1012|Lemon yellow|C7B446;1013|Oyster white|EAE6CA;1014|Ivory|E1CC4F;1015|Light ivory|E6D690;1016|Sulfur yellow|EDFF21;1017|Saffron yellow|F5D033;1018|Zinc yellow|F8F32B;1019|Grey beige|9E9764;1020|Olive yellow|999950;1021|Rape yellow|F3DA0B;1023|Traffic yellow|FAD201;1024|Ochre yellow|AEA04B;1026|Luminous yellow|FFFF00;1027|Curry|9D9101;1028|Melon yellow|F4A900;1032|Broom yellow|D6AE01;1033|Dahlia yellow|F3A505;1034|Pastel yellow|EFA94A;1035|Pearl beige|6A5D4D;1036|Pearl gold|705335;1037|Sun yellow|F39F18;2000|Yellow orange|ED760E;2001|Red orange|C93C20;2002|Vermilion|CB2821;2003|Pastel orange|FF7514;2004|Pure orange|F44611;2005|Luminous orange|FF2301;2007|Luminous bright orange|FFA420;2008|Bright red orange|F75E25;2009|Traffic orange|F54021;2010|Signal orange|D84B20;2011|Deep orange|EC7C26;2012|Salmon orange|E55137;2013|Pearl orange|C35831;3000|Flame red|AF2B1E;3001|Signal red|A52019;3002|Carmine red|A2231D;3003|Ruby red|9B111E;3004|Purple red|75151E;3005|Wine red|5E2129;3007|Black red|412227;3009|Oxide red|642424;3011|Brown red|781F19;3012|Beige red|C1876B;3013|Tomato red|A12312;3014|Antique pink|D36E70;3015|Light pink|EA899A;3016|Coral red|B32821;3017|Rose|E63244;3018|Strawberry red|D53032;3020|Traffic red|CC0605;3022|Salmon pink|D95030;3024|Luminous red|F80000;3026|Luminous bright red|FE0000;3027|Raspberry red|C51D34;3028|Pure red|CB3234;3031|Orient red|B32428;3032|Pearl ruby red|721422;3033|Pearl pink|B44C43;4001|Red lilac|6D3F5B;4002|Red violet|922B3E;4003|Heather violet|DE4C8A;4004|Claret violet|641C34;4005|Blue lilac|6C4675;4006|Traffic purple|A03472;4007|Purple violet|4A192C;4008|Signal violet|924E7D;4009|Pastel violet|A18594;4010|Telemagenta|CF3476;4011|Pearl violet|8673A1;4012|Pearl blackberry|6C6874;5000|Violet blue|354D73;5001|Green blue|1F3438;5002|Ultramarine blue|20214F;5003|Sapphire blue|1D1E33;5004|Black blue|18171C;5005|Signal blue|1E2460;5007|Brilliant blue|3E5F8A;5008|Grey blue|26252D;5009|Azure blue|025669;5010|Gentian blue|0E294B;5011|Steel blue|231A24;5012|Light blue|3B83BD;5013|Cobalt blue|1E213D;5014|Pigeon blue|606E8C;5015|Sky blue|2271B3;5017|Traffic blue|063971;5018|Turquoise blue|3F888F;5019|Capri blue|1B5583;5020|Ocean blue|1D334A;5021|Water blue|256D7B;5022|Night blue|252850;5023|Distant blue|49678D;5024|Pastel blue|5D9B9B;5025|Pearl gentian blue|2A6478;5026|Pearl night blue|102C54;6000|Patina green|316650;6001|Emerald green|287233;6002|Leaf green|2D572C;6003|Olive green|424632;6004|Blue green|1F3A3D;6005|Moss green|2F4538;6006|Grey olive|3E3B32;6007|Bottle green|343B29;6008|Brown green|39352A;6009|Fir green|31372B;6010|Grass green|35682D;6011|Reseda green|587246;6012|Black green|343E40;6013|Reed green|6C7156;6014|Yellow olive|47402E;6015|Black olive|3B3C36;6016|Turquoise green|1E5945;6017|May green|4C9141;6018|Yellow green|57A639;6019|Pastel green|BDECB6;6020|Chrome green|2E3A23;6021|Pale green|89AC76;6022|Olive drab|25221B;6024|Traffic green|308446;6025|Fern green|3D642D;6026|Opal green|015D52;6027|Light green|84C3BE;6028|Pine green|2C5545;6029|Mint green|20603D;6032|Signal green|317F43;6033|Mint turquoise|497E76;6034|Pastel turquoise|7FB5B5;6035|Pearl green|1C542D;6036|Pearl opal green|193737;6037|Pure green|008F39;6038|Luminous green|00BB2D;7000|Squirrel grey|78858B;7001|Silver grey|8A9597;7002|Olive grey|7E7B52;7003|Moss grey|6C7059;7004|Signal grey|969992;7005|Mouse grey|646B63;7006|Beige grey|6D6552;7008|Khaki grey|6A5F31;7009|Green grey|4D5645;7010|Tarpaulin grey|4C514A;7011|Iron grey|434B4D;7012|Basalt grey|4E5754;7013|Brown grey|464531;7015|Slate grey|434750;7016|Anthracite grey|293133;7021|Black grey|23282B;7022|Umbra grey|332F2C;7023|Concrete grey|686C5E;7024|Graphite grey|474A51;7026|Granite grey|2F353B;7030|Stone grey|8B8C7A;7031|Blue grey|474B4E;7032|Pebble grey|B8B799;7033|Cement grey|7D8471;7034|Yellow grey|8F8B66;7035|Light grey|D7D7D7;7036|Platinum grey|7F7679;7037|Dusty grey|7D7F7D;7038|Agate grey|B5B8B1;7039|Quartz grey|6C6960;7040|Window grey|9DA1AA;7042|Traffic grey A|8D948D;7043|Traffic grey B|4E5452;7044|Silk grey|CAC4B0;7045|Telegrey 1|909090;7046|Telegrey 2|82898F;7047|Telegrey 4|D0D0D0;7048|Pearl mouse grey|898176;8000|Green brown|826C34;8001|Ochre brown|955F20;8002|Signal brown|6C3B2A;8003|Clay brown|734222;8004|Copper brown|8E402A;8007|Fawn brown|59351F;8008|Olive brown|6F4F28;8011|Nut brown|5B3A29;8012|Red brown|592321;8014|Sepia brown|382C1E;8015|Chestnut brown|633A34;8016|Mahogany brown|4C2F27;8017|Chocolate brown|45322E;8019|Grey brown|403A3A;8022|Black brown|212121;8023|Orange brown|A65E2E;8024|Beige brown|79553D;8025|Pale brown|755C48;8028|Terra brown|4E3B31;8029|Pearl copper|763C28;9001|Cream|FDF4E3;9002|Grey white|E7EBDA;9003|Signal white|F4F4F4;9004|Signal black|282828;9005|Jet black|0A0A0A;9006|White aluminium|A5A5A5;9007|Grey aluminium|8F8F8F;9010|Pure white|FFFFFF;9011|Graphite black|1C1C1C;9016|Traffic white|F6F6F6;9017|Traffic black|1E1E1E;9018|Papyrus white|D7D7D7;9022|Pearl light grey|9C9C9C;9023|Pearl dark grey|828282`.split(';').map(x=>{const[n,m,h]=x.split('|');return[n,m,'#'+h.toLowerCase()]});
const ralLabel=r=>r[1].replace(/\b\w/g,c=>c.toUpperCase())+' (RAL '+r[0]+')';
const ralNear=hx=>{const c=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)),a=c(hx);let b=null,bd=1e9;RAL.forEach(r=>{const q=c(r[2]),rm=(a[0]+q[0])/2,d=(2+rm/256)*(a[0]-q[0])**2+4*(a[1]-q[1])**2+(2+(255-rm)/256)*(a[2]-q[2])**2;if(d<bd){bd=d;b=r}});return b};
const ralFind=q=>{q=String(q||'').trim().toLowerCase().replace(/^ral\s*/,'');if(!q)return[];return RAL.filter(r=>r[0].startsWith(q)||r[1].toLowerCase().includes(q)).slice(0,6)};
const FIN_RAL=['9016','9001','7038','7035','7015','7016','7012','9005','8022','6009','7032','3003','5011'].map(n=>RAL.find(r=>r[0]==n));
const FINISH=[...FIN_RAL.map(r=>[ralLabel(r),r[2]]),['Chartwell Green','#a9bba5'],['Golden Oak','#b5752f'],['Irish Oak','#8a5a33'],['Rosewood','#5a2a1f'],['Light Oak','#c79a5c'],['Gold','#c9a24b'],['Silver','#b9b9b9']];
let CP={k:'',h:0,s:0,v:0};
const hsv2hex=(h,s,v)=>{const f=n=>{const k=(n+h/60)%6;return v-v*s*Math.max(0,Math.min(k,4-k,1))};return '#'+[f(5),f(3),f(1)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('')};
const hex2hsv=x=>{const n=parseInt(x.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),d=mx-Math.min(r,g,b);let h=0;if(d){h=mx==r?((g-b)/d)%6:mx==g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360}return{h,s:mx?d/mx:0,v:mx}};
function cpOpen(k){let p=$('#cpop');if(!p){p=document.createElement('div');p.id='cpop';document.body.appendChild(p);
    document.addEventListener('mousedown',e=>{const q=$('#cpop');if(q&&q.classList.contains('open')&&!e.target.closest('#cpop,.cbtn'))q.classList.remove('open')})}
  if(p.classList.contains('open')&&CP.k==k){p.classList.remove('open');return}
  const hx=SAFE.hex($('#f_'+k+'_hex').value);CP={k,...hex2hsv(hx),ral:null};const cur=($('#f_'+k).value||'').toLowerCase();
  p.innerHTML=`<div class="cp-h"><b>Pick a colour</b><button type="button" class="cp-x" aria-label="Close" data-act="cpClose">&times;</button></div>
   <small class="cp-l">Window and door finishes</small><div class="cp-g">${FINISH.map(([n,h])=>`<button type="button" class="cp-s ${cur==n.toLowerCase()?'on':''}" title="${esc(n)}" ${A('cpPick',n,h)}><i style="background:${h}"></i><span>${esc((/RAL \d+/.exec(n)||[n])[0])}</span></button>`).join('')}</div>
   <small class="cp-l">Any colour</small><div class="cp-sv" id="cpSv"><i id="cpKnob"></i></div><input type="range" class="cp-hue" id="cpHue" min="0" max="359" value="${Math.round(CP.h)}" data-oninput="cpHue" data-args-input="[{&quot;$&quot;:&quot;value&quot;}]" aria-label="Hue">
   <div class="cp-row"><span class="cp-pv" id="cpPv"></span><label class="cp-hx">RAL<input id="cpRal" maxlength="30" aria-label="RAL number or name" data-oninput="cpRalIn" data-args-input="[{&quot;$&quot;:&quot;value&quot;}]" autocomplete="off"></label><button type="button" class="btn sm" data-act="cpUse">Use colour</button></div>
   <div class="cp-nm" id="cpNm"></div><div class="cp-sug" id="cpSug"></div>
   <button type="button" class="cp-none" ${A('cpPick','','#8a8a8a')}>No colour</button>`;
  p.classList.add('open');const b=$('#cb_'+k).getBoundingClientRect();
  p.style.left=Math.max(8,Math.min(innerWidth-p.offsetWidth-8,b.right-p.offsetWidth))+'px';p.style.top=Math.max(8,Math.min(innerHeight-p.offsetHeight-8,b.bottom+8))+'px';
  const sv=$('#cpSv'),drag=e=>{const r=sv.getBoundingClientRect();CP.s=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));CP.v=1-Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));cpDraw(true)};
  sv.addEventListener('pointerdown',e=>{sv.setPointerCapture(e.pointerId);drag(e);sv.onpointermove=drag});sv.addEventListener('pointerup',()=>{sv.onpointermove=null});cpDraw(false);const m=/RAL (\d{4})/.exec($('#f_'+k).value||'');const cr=m&&RAL.find(r=>r[0]==m[1]);if(cr)cpSet(cr);else{CP.ral=ralNear(hx);cpShow(true);$('#cpPv').style.background=hx}}
function cpDraw(setHex){const hx=hsv2hex(CP.h,CP.s,CP.v),sv=$('#cpSv');if(!sv)return;if(setHex)CP.ral=ralNear(hx);sv.style.background=`linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${CP.h},100%,50%))`;
  const k=$('#cpKnob');k.style.left=CP.s*100+'%';k.style.top=(1-CP.v)*100+'%';k.style.background=hx;cpShow(setHex)}
function cpShow(fill){const r=CP.ral;$('#cpPv').style.background=r?r[2]:'#ccc';$('#cpNm').innerHTML=r?`<b>RAL ${esc(r[0])}</b> ${esc(r[1])}<span class="muted"> · closest match</span>`:'';if(fill&&r)$('#cpRal').value=r[0];$('#cpSug').innerHTML=''}
function cpHue(v){CP.h=+v;cpDraw(true)}
function cpSet(r){CP.ral=r;Object.assign(CP,hex2hsv(r[2]));$('#cpHue').value=Math.round(CP.h);cpDraw(false);$('#cpNm').innerHTML=`<b>RAL ${esc(r[0])}</b> ${esc(r[1])}`;$('#cpRal').value=r[0]}
function cpRalIn(v){const L=ralFind(v),ex=L.find(r=>r[0]==String(v).trim().replace(/^ral\s*/i,''));if(ex){cpSet(ex);$('#cpSug').innerHTML='';return}
  $('#cpSug').innerHTML=L.map(r=>`<button type="button" ${A('cpSugPick',r[0])}><i style="background:${r[2]}"></i>${esc(r[0])} ${esc(r[1])}</button>`).join('')||(v.trim()?'<span class="muted">No RAL colour matches</span>':'')}
function cpSugPick(n){const r=RAL.find(x=>x[0]==n);if(r){cpSet(r);$('#cpSug').innerHTML=''}}
function cpUse(){const r=CP.ral||ralNear(hsv2hex(CP.h,CP.s,CP.v));pickC(CP.k,ralLabel(r),r[2]);$('#cpop').classList.remove('open')}
function cpPick(n,h){pickC(CP.k,n,h);$('#cpop').classList.remove('open')}
function scanInto(id){scan(c=>{const e=$('#'+id);if(e){e.value=c;e.dispatchEvent(new Event('input'))}})}

/* ---- photos: resized + compressed before storing, capped per record ---- */
/* photos as a grid of 8 glass boxes (2 rows of 4): filled ones show the photo, the next empty one adds more */
function drawThumbs(){const t=$('#thumbs');if(!t)return;if(t.classList.contains('phg')){const n=tmp.length;t.innerHTML=Array.from({length:MAX_PHOTOS},(_,i)=>i<n?`<div class="phb on"><img src="${SAFE.img(tmp[i])}" alt="Photo ${i+1}" ${A('viewPhoto',tmp[i])}><button type="button" aria-label="Remove photo ${i+1}" ${A('rmPh',i)}>&times;</button></div>`:i==n?`<label class="phb add" title="Add photos"><input type="file" accept="image/*" multiple hidden data-onchange="addPh" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]">${svg(IC.plus)}<span>Add</span></label>`:'<div class="phb" aria-hidden="true"></div>').join('');return}
  t.innerHTML=tmp.map((p,i)=>`<div class="th"><img src="${SAFE.img(p)}" alt="Photo ${i+1}"><button type="button" aria-label="Remove photo" ${A('rmPh',i)}>&times;</button></div>`).join('')||'<span class="muted">No photos yet.</span>'}
function rmPh(i){tmp.splice(i,1);tmpDraw&&tmpDraw()}
function addPh(inp){const files=[...inp.files].filter(f=>/^image\//.test(f.type));inp.value='';
  const room=MAX_PHOTOS-tmp.length;if(room<=0){toast('Up to '+MAX_PHOTOS+' photos per record');return}
  if(files.length>room)toast('Only the first '+room+' photo'+(room>1?'s':'')+' were added (limit '+MAX_PHOTOS+')');
  files.slice(0,room).forEach(f=>{if(f.size>25e6){toast(f.name+' is too large');return}const img=new Image();
    img.onload=()=>{const s=Math.min(1,1280/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);tmp.push(c.toDataURL('image/jpeg',.7));URL.revokeObjectURL(img.src);tmpDraw&&tmpDraw()};
    img.onerror=()=>toast('That file could not be read as an image');img.src=URL.createObjectURL(f)})}
const gallery=a=>{a=(a||[]).filter(SAFE.img);return a.length?`<div class="gal">${a.map((p,i)=>`<img src="${SAFE.img(p)}" alt="Photo ${i+1}" ${A('viewPhoto',p)}>`).join('')}</div>`:''};
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
  $('#nwb').innerHTML=svg(IC.plus)+'<span>New</span>';$('#scanBtn').innerHTML=svg(IC.scan);
  $$('.lg-w').forEach(i=>i.src=LOGO_SRC.white);$$('.lg-e').forEach(i=>i.src=LOGO_SRC.emblem);$('#fav').href=LOGO_SRC.icon;document.documentElement.style.setProperty('--hero-emblem','url("'+LOGO_SRC.emblem+'")');
  let th='light';try{th=localStorage.getItem('bb_theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch(e){}setTh(th);
  $('#thb').onclick=()=>setTh(document.body.dataset.theme=='dark'?'light':'dark');
  $('#mnb').onclick=()=>document.body.classList.add('sopen');$('#scrim').onclick=()=>document.body.classList.remove('sopen');
  $('#meBtn').onclick=editProfile;$('#acct').onclick=swRole;$('#bell').onclick=()=>ncToggle(true);$('#ncbg').onclick=()=>ncToggle(false);
  $('#scanBtn').onclick=e=>{e.preventDefault();e.stopPropagation();scan(found)};
  $('#q').addEventListener('input',e=>{q=SAFE.text(e.target.value,80).toLowerCase();Object.values(UI).forEach(s=>{if(s&&typeof s=='object'&&'page' in s)s.page=1});sbSync();clearTimeout(render.q);render.q=setTimeout(()=>render(true),120)});
  $('#qClr').onclick=()=>{$('#q').value='';q='';sbSync();render();$('#q').focus()};
  $('#nwb').onclick=e=>{e.stopPropagation();$('#nwm').classList.toggle('open')};
  document.addEventListener('click',()=>$('#nwm').classList.remove('open'));
  $('#nwm').onclick=e=>{const b=e.target.closest('button');if(!b)return;({lead:()=>editLead(),call:()=>editCall(),contact:()=>editContact(),stock:()=>{go('stock');stockForm('add')},request:()=>{go('stock');stockForm('request')},hol:()=>holBook(),doc:()=>docOpen('guarantee'),files:()=>go('downloads')})[b.dataset.a]()};
  $('#manualGo').onclick=()=>got($('#manual').value);$('#manual').onkeydown=e=>{if(e.key=='Enter')got(e.target.value)};$('#scanClose').onclick=stopScan;
  document.addEventListener('keydown',e=>{
    if(e.key=='Escape'){if(typeof ASKI!='undefined'&&ASKI)return;if($('#modal.open .rw')&&RW&&RW.dirty){if(!$('#rwAsk'))recClose();return}closeModal();stopScan();ncToggle(false);closeFpop();document.body.classList.remove('sopen');if(document.body.classList.contains('tv'))toggleTV()}
    if((e.key=='Enter'||e.key==' ')&&e.target.dataset&&e.target.dataset.rc){e.preventDefault();e.target.click()}
    if(e.key=='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!$('.ov.open')){e.preventDefault();$('#q').focus()}});
})();

/* numbers in the tiles count up when a page opens */
function countUp(){if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  $$('#main .kpi>b').forEach(el=>{const t=el.textContent,m=t.match(/[\d,]+(\.\d+)?/);if(!m||t.length>14)return;
    const n=parseFloat(m[0].replace(/,/g,'')),dp=(m[1]||'').length-1,a=t.slice(0,m.index),b=t.slice(m.index+m[0].length),cm=m[0].includes(','),t0=performance.now();if(!(n>0))return;
    const f=x=>{const p=Math.min(1,(x-t0)/800),v=n*(1-Math.pow(1-p,3)),s=dp>0?v.toFixed(dp):Math.round(v);el.textContent=a+(cm?Number(s).toLocaleString('en-GB',{minimumFractionDigits:Math.max(0,dp),maximumFractionDigits:Math.max(0,dp)}):s)+b;if(p<1)requestAnimationFrame(f);else el.textContent=t};requestAnimationFrame(f)})}

/* ---- step-by-step wizard: steps [{t,d,f:[fields]} | {t,d,review:1}], v = values, check(step,v) -> error, save(v) ---- */
let WZ=null;
function wzDel(){WZ.del()}
function cpClose(){$('#cpop').classList.remove('open')}
function wizard(o){WZ={...o,st:0,seen:0};wzDraw()}
function wzDraw(){const W=WZ,st=W.steps[W.st],last=W.st==W.steps.length-1;
  const lab=f=>{const val=W.v[f.k];return f.t=='number'?(val?val:''):val};
  const rev=()=>W.steps.filter(x=>x.f).map(x=>`<div class="wz-r"><h3>${esc(x.t)} <button class="mini" ${A('wzGo',W.steps.indexOf(x))}>Change</button></h3>${x.f.filter(f=>!(f.nx&&!W.v[f.k])).map(f=>`<div class="si"><span>${esc(f.l.replace(/ \(.*\)/,''))}</span><b class="${f.t=='email'||/email|web|url/i.test(f.k)?'nocap':''}">${esc(lab(f))||'<span class="muted">-</span>'}</b></div>`).join('')}</div>`).join('');
  openModal(`<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>${esc(W.title)}</h2>
   <div class="stp wz">${W.steps.map((x,i)=>`<span class="${i<=W.st?'on':''} ${i<=W.seen||W.edit?'go':''}" ${i<=W.seen||W.edit?A('wzGo',i):''}><i>${i<W.st?'&#10003;':i+1}</i>${esc(x.t)}</span>`).join('')}</div>
   <p class="muted wz-d">Step ${W.st+1} of ${W.steps.length}: ${esc(st.d||'')}</p>
   <div class="wz-b">${st.review?rev():`<div class="grid">${st.f.map(f=>fieldH(f,W.v)).join('')}</div>`}</div>
   <div class="mact">${W.del?`<button class="btn ghost l" style="color:var(--red)" data-act="wzDel">Delete</button>`:''}${W.st?'<button class="btn ghost" data-act="wzStep" data-args="[-1]">Back</button>':'<button class="btn ghost" data-act="closeModal">Cancel</button>'}${W.edit&&!last?'<button class="btn ghost" data-act="wzSave">Save now</button>':''}${last?`<button class="btn green" data-act="wzSave">${esc(W.saveLabel||'Save')}</button>`:'<button class="btn" data-act="wzStep" data-args="[1]">Next</button>'}</div>`,'md');
  const f=$('#mbox .wz-b input:not([readonly]),#mbox .wz-b textarea');if(f&&matchMedia('(pointer:fine)').matches)setTimeout(()=>f.focus(),80)}
function wzRead(){const st=WZ.steps[WZ.st];if(st.review)return true;const o=readFields(st.f);if(!o)return false;Object.assign(WZ.v,o);const e=WZ.check&&WZ.check(WZ.st,WZ.v);if(e){toast(e);return false}return true}
function wzStep(d){if(d>0&&!wzRead())return;if(d<0){const st=WZ.steps[WZ.st];if(!st.review){const o={};st.f.forEach(f=>{const e=$('#f_'+f.k);if(!e)return;const r=(e.value||'').trim();o[f.k]=f.t=='number'?(SAFE.num(r,{min:f.min??0,max:f.max??1e9,dp:f.dp??2})??0):f.t=='date'?SAFE.date(r):SAFE.text(r,f.t=='area'?(f.max||2000):(f.max||120))});Object.assign(WZ.v,o)}}
  WZ.st=Math.max(0,Math.min(WZ.steps.length-1,WZ.st+d));WZ.seen=Math.max(WZ.seen,WZ.st);wzDraw()}
function wzGo(i){if(i>WZ.seen&&!WZ.edit)return;if(i!=WZ.st&&!wzRead())return;WZ.st=i;WZ.seen=Math.max(WZ.seen,i);wzDraw()}
function wzSave(){if(!wzRead())return;for(let i=0;i<WZ.steps.length;i++){const e=WZ.check&&WZ.check(i,WZ.v);if(e){WZ.st=i;wzDraw();toast(e);return}}const bx=$('#mbox'),mk=bx.firstElementChild;WZ.save(WZ.v);store();render();if($('#modal').classList.contains('open')&&bx.firstElementChild===mk)doneIn(WZ.done||'Saved')}
