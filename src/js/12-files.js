/* ==========================================================================
   12 · Files: brochures, Smart Systems manuals, Other Content uploads,
        brand and print assets (uploads stored in this browser's IndexedDB)
   ========================================================================== */
const UP='https://www.broadlandwindows.co.uk/wp-content/uploads/';
const DL=[['Hardwood','Hardwood Windows','2025/06/HW_Windows_Merge.pdf'],['Hardwood','Hardwood Special Products','2025/06/HW_Special_Merge.pdf'],['Hardwood','Hardwood Doors','2025/06/HW_Door_Merge.pdf'],['Hardwood','Teknos Colour Collection 2025','2026/05/Teknos-Colour-Collection-2025.pdf'],['PVCu','JF x Broadland 2025','2025/06/JF-x-BW-2025.pdf'],['PVCu','LR Ultimate Heritage Collection 2025','2025/06/LR-Ultimate-Heritage-Collection-2025-Broadland.pdf'],['PVCu','Rose Collection (July 2023)','2025/07/Rose-Collection-Brochure-July-2023.pdf'],['Secondary glazing','Broadland Secondary Glazing','2025/07/Broadland-Secondary-Glazing.pdf'],['Composite doors','Hallmark Colour Lab 2025','2025/06/HALLMARK-Colour-Lab-2025.pdf'],['Composite doors','Hallmark Doors & Panels 2025','2025/06/HALLMARK-Doors-Panels-2025.pdf'],['Composite doors','Hallmark uPVC Panels 2025 (image)','2025/06/COVER-HALLMARK-uPVC-Panels-2025-scaled.jpg'],['Aluminium','Alitherm Heritage 60','2026/10/Alitherm-Heritage-60.pdf'],['Aluminium','Smarts Colour Guide 2025','2025/06/SMARTS-Colour-Guide-2025.pdf'],['Aluminium','Smarts Designer Door 2025','2025/06/SMARTS-Designer-Door-2025.pdf'],['Aluminium','Smarts Heritage Full Brochure','2025/06/SMARTS-Heritage-FULL-Brochure-2020.pdf'],['Aluminium','Smarts Alitherm 400 2025','2025/06/SMARTS-Alitherm-400-2025.pdf'],['Aluminium','Smarts Signature Doors 2023','2025/06/SMARTS-Signature-Doors-2023.pdf'],['Aluminium','Smarts Visofold Series 2025','2025/06/SMARTS-Visofold-Series-2025.pdf'],['Aluminium','Smarts Visoglide Series 2024','2025/06/SMARTS-Visoglide-Series-2024.pdf'],['Aluminium','Smarts AluSpace','2025/07/Smarts-AluSpace-1.pdf'],['Aluminium','Hallmark Aluminium Doors & Panels 2025','2025/06/HALLMARK-Aluminium-Doors-Panels-2025.pdf'],['Roof lanterns','Broadland Titan Lanterns','2025/06/Broadland-Titan-Lanterns.pdf']].map(([cat,title,f])=>({cat,title,url:UP+f}));
const SSM=`Alitherm 300 ETC v092019|1003|12 MB
Alitherm 400 Casement v012026|1296|32.7 MB
Alitherm 400 ETD Door v062023|1101|77.1 MB
Alitherm 400 Flush Door v07.2024|1274|43.1 MB
Alitherm 400 HD v10.2026|1343|28.6 MB
Alitherm 400 Stepped Door v07.2026|1327|59.4 MB
Alitherm 400 Tilt Turn v07.2026|1334|27.8 MB
Alitherm 500 ETC v05 2018|943|7 MB
Alitherm 600 v102021|1084|19 MB
Alitherm 700 ETC v102018|970|12 MB
Alitherm 800 ETC v03 2023|1130|32 MB
Alitherm Heritage 60 v112023|1143|25.5 MB
Alitherm Heritage Door W20 v052021|1061|22 MB
Alitherm Heritage HD v012022|1092|21 MB
Alitherm Heritage Window v102021|1081|18.1 MB
Aliver Orangery Roof EHE v032021|1059|4 MB
Aliver Rooflight v112022|1112|8.4 MB
Aliver VR100 - July 2007|192|1.8 MB
Aliver VR1000 - July 2007|193|3 MB
Aliver VR2000 - July 2007|194|5 MB
Aliver VR2000+ - July 2007|195|9 MB
Aliver VR5000+ - July 2007|196|5 MB
Aluspace v032025|1233|23.8 MB
Decowall|1138|1.1 MB
Designer Doors v112018|984|4 MB
EcoFutural EF v122018|975|34 MB
Fapim Hardware v06 2014|946|3 MB
IDA Interior Screen and Doors v07.2020|1032|19 MB
Invisoglide v032026|1283|24.1 MB
Mac Glass v04.2026|1300|6.6 MB
MC 600 v112021|1083|15 MB
MC Wall v01 2018|942|54 MB
MC600 Plus v072025|1254|10.3 MB
Punch Tooling Oct 2007 (Smart Punch Tooling Manual)|536|15 MB
SB Chrono v12 2018|1224|88.4 MB
Shopline SH - Sep 2001|380|10 MB
Signature Doors v052025|1237|8.9 MB
Slide 2000 GSL v07-2012 / 0614|714|8 MB
Slide Mono Rail GSL v08-2013 / 0614|715|8 MB
Smart AOV v08.2026|1329|7.6 MB
Smart Lantern v062025|1253|4.7 MB
Smart Wall v072024|1202|32 MB
Standard Profiles UTL - July 2007|188|230 KB
SZ Manual v092016|916|12 MB
Ultraglide v092022|1119|37.1 MB
Universal UN - July 2007|187|1.8 MB
UTL v042019|1000|242 KB
Victorian Plus VR+ - July 2007|197|6 MB
Visofold 1000 v032025|1310|56.4 MB
Visofold 2000 DV v08 2010 / 0613|645|19 MB
Visofold 3000 DV v02-2010 / 0614|719|28 MB
Visofold 4000 DV v08-2008 / 0613|647|6 MB
Visofold 6000 DV v092019|1001|26 MB
Visoglide Original v122024|1209|15.4 MB
Visoglide Plus Upgrade Hybrid v052026|1311|56.5 MB
Visoglide Plus v03 2023|1133|89.8 MB
Visotherm Door v10.2022|1134|40 MB
Visotherm Tilt Turn v01.2026|1277|28.4 MB
Visotherm Window v102025|1266|31.1 MB
VS 600 v04-2013 / 0614|718|6 MB
VS400 V05.2026|1336|11.2 MB`.split('\n').map(l=>{const[t,id,s]=l.split('|'),f=/^Alitherm/.test(t)?'Alitherm':/^Aliver/.test(t)?'Aliver':/^Visofold/.test(t)?'Visofold':/^(Visoglide|Invisoglide|Ultraglide|Slide)/.test(t)?'Sliding':/^Visotherm/.test(t)?'Visotherm':'Other';return{t,s,f,u:'https://previous.smartsystems.co.uk/documentlibrary/asset.asp?id='+id}});
const MC=['Manufacturing Manual','Fitting Guide','Spec Sheet','Price List','Other'];
const tc=s=>String(s||'').replace(/\b\w/g,c=>c.toUpperCase());
/* cover image: a custom one if set, else WordPress's auto-generated PDF cover (name-pdf.jpg), else the drawn cover */
/* WordPress names PDF covers in a few ways; try each before falling back to the drawn cover */
const coverAlt=d=>/\.pdf$/i.test(d.url)&&!(S.covers&&S.covers[d.url])?['-pdf-1.jpg','-1-pdf.jpg','-pdf-pdf.jpg'].map(s=>d.url.replace(/\.pdf$/i,s)).join(' '):'';
function coverNext(img){const a=(img.dataset.alt||'').split(' ').filter(Boolean);if(!a.length){img.style.display='none';return}img.dataset.alt=a.slice(1).join(' ');img.src=a[0]}
const coverUrl=d=>S.covers&&SAFE.url(S.covers[d.url])||(/\.jpe?g$/i.test(d.url)?d.url:d.url.replace(/\.pdf$/i,'-pdf.jpg'));
const RK='bb_recent';
const ldRecent=()=>{try{return(JSON.parse(localStorage.getItem(RK))||[]).filter(x=>SAFE.url(x.u))}catch(e){return[]}};

function cover(d){const H=s=>Math.abs([...s].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7)),h=H(d.cat)%360,door=/door/i.test(d.title+d.cat),sec=/secondary/i.test(d.cat),c1=`hsl(${h},55%,30%)`,c2=`hsl(${(h+40)%360},60%,55%)`,id='g'+H(d.title);
  const frame=door?`<rect x="118" y="42" width="84" height="150" rx="3" fill="#fff" opacity=".92"/><rect x="128" y="54" width="64" height="52" fill="${c1}" opacity=".35"/><rect x="128" y="116" width="64" height="66" fill="none" stroke="${c1}" stroke-width="3" opacity=".5"/><circle cx="190" cy="124" r="4" fill="#ffd002"/>`:`<rect x="82" y="46" width="156" height="128" rx="4" fill="#fff" opacity=".93"/>${[0,1,2,3].map(i=>`<rect x="${92+(i%2)*72}" y="${56+(i>>1)*58}" width="64" height="50" fill="${c2}" opacity=".5"/>`).join('')}${sec?'<rect x="74" y="38" width="172" height="144" rx="6" fill="none" stroke="#ffd002" stroke-width="3" stroke-dasharray="6 4"/>':''}`;
  return `<svg class="cv" viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="320" height="240" fill="url(#${id})"/><circle cx="270" cy="40" r="60" fill="#fff" opacity=".08"/>${frame}<rect x="0" y="200" width="320" height="40" fill="#000" opacity=".25"/><text x="16" y="226" fill="#fff" font-family="Bricolage Grotesque,Georgia,sans-serif" font-weight="700" font-size="15">${esc(d.cat.toUpperCase())}</text></svg>`}

function vFiles(){const F=UI.files,cats=['all',...new Set(DL.map(d=>d.cat))],rc=ldRecent();const HID=S.fileHide||{};let L=DL.filter(d=>!HID[d.url]&&(F.cat=='all'||d.cat==F.cat)&&hit(d));if(F.az)L=L.slice().sort((a,b)=>a.title.localeCompare(b.title));
  const ssq=F.ssq.toLowerCase(),ML=SSM.filter(m=>!HID[m.u]&&(m.t+' '+m.f).toLowerCase().includes(ssq)&&hit(m)),pg=paginate(F,ML);
  const fhead=(a,b,c)=>`<div class="frow fhead"><span>${a}</span><span>${b}</span><span>${c}</span><span></span></div>`;
  return `<div class="head"><div><h1>Broadland Brochures</h1><span class="muted">${L.length} of ${DL.length} brochures from <span class="nocap">broadlandwindows.co.uk</span></span></div><div class="tools"><button class="btn ghost" data-act="copyAllBrochures">Copy all links</button><a class="btn" href="https://www.broadlandwindows.co.uk/brochures/" target="_blank" rel="noopener noreferrer">Brochure Website</a></div></div>
  <div class="chips">${cats.map(c=>`<button class="chip ${F.cat==c?'on':''}" ${A('setUI','files.cat',c)}>${c=='all'?'All brochures':esc(c)}</button>`).join('')}<span class="vs"></span><button class="chip ${F.az?'on':''}" ${A('togUI','files.az')}>Sort A to Z</button><button class="chip ${F.list?'on':''}" ${A('togUI','files.list')}>List view</button></div>
  ${rc.length?`<div class="panel" style="margin-bottom:1rem"><h2>Recently Opened</h2>${rc.map(x=>`<div class="row"><span>${esc(x.t)}</span><a class="mini pri" href="${esc(SAFE.url(x.u))}" target="_blank" rel="noopener noreferrer">Open</a></div>`).join('')}</div>`:''}
  <div class="book ${F.list?'lst':''}">${L.map(d=>`<div class="bc" style="position:relative"><div class="cvw">${cover(d)}<img src="${esc(coverUrl(d))}" alt="${esc(d.title)} cover" loading="lazy" referrerpolicy="no-referrer" data-alt="${esc(coverAlt(d))}" data-onerror="coverNext" data-args-error="[{&quot;$&quot;:&quot;this&quot;}]"></div><button class="mini covb" ${A('setCover',d.url)}>Set cover</button><div class="bb"><b>${esc(d.title)}</b><span class="tag n" style="align-self:flex-start">${esc(d.cat)}</span><div class="acts"><a class="mini pri" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer" ${A('recent',d.url,d.title)}>Open</a><button class="mini" ${A('dlf',d.url)}>Download</button><a class="mini" href="mailto:?subject=${encodeURIComponent('Broadland brochure: '+d.title)}&amp;body=${encodeURIComponent(d.url)}">Email</a>${ISOWN()?`<button class="mini del" ${A('fileHide',d.url,d.title)}>Remove</button>`:''}</div></div></div>`).join('')||emptyArt('files','No brochures match.')}</div>
  <div class="panel" style="margin-top:1.2rem"><h2><span>Smart Systems Manuals <span class="muted">(${SSM.filter(m=>!HID[m.u]).length} technical fabrication manuals)</span></span>${ISOWN()&&Object.keys(HID).length?`<button class="btn ghost sm" data-act="fileHidden">Removed (${Object.keys(HID).length})</button>`:''}<a class="btn ghost sm" href="https://previous.smartsystems.co.uk/documentlibrary/?c=35" target="_blank" rel="noopener noreferrer">Open Smart Systems library</a></h2>
   <div class="upl"><input placeholder="Search" value="${esc(F.ssq)}" maxlength="60" ${AC('oninput','ssqSet','this.value')} id="ssqI" style="min-width:min(16rem,100%)"></div>
   ${fhead('Manual','Category','Size')}<div class="flist">${pg.rows.map(m=>`<div class="frow"><b>${esc(m.t)}</b><span class="tag">${esc(m.f)}</span><span class="sz">${esc(m.s)}</span><span class="acts"><a class="mini pri" href="${esc(m.u)}" target="_blank" rel="noopener noreferrer">Open</a><button class="mini" ${A('dlf',m.u)}>Download</button><button class="mini" ${A('copyText',m.u)}>Copy link</button>${ISOWN()?`<button class="mini del" ${A('fileHide',m.u,m.t)}>Remove</button>`:''}</span></div>`).join('')||'<p class="empty">No manuals match.</p>'}</div>${pagerH('files',pg,'manuals')}</div>
  <div class="panel" style="margin-top:1rem"><h2>Other Content</h2><div class="upl"><select id="mcat" aria-label="Category">${MC.map(c=>`<option>${c}</option>`).join('')}</select><label class="btn sm" style="cursor:pointer">Upload files<input type="file" multiple hidden data-onchange="manUp" data-args-change="[{&quot;$&quot;:&quot;this&quot;}]"></label><span class="muted">Stored on this device only</span></div>${fhead('File','Category','Size')}<div id="mans" class="flist">Loading</div></div>
  <div class="panel" style="margin-top:1rem"><h2>Brand And Print Assets</h2><div class="upl"><label class="btn sm" style="cursor:pointer">Upload files<input type="file" multiple hidden ${AC('onchange','manUp','this','Brand Asset')}></label><span class="muted">Stored on this device only</span></div>${fhead('File','Category','Size')}<div id="assets" class="flist">Loading</div></div>`}
function ssqSet(v){UI.files.ssq=SAFE.text(v,60);UI.files.page=1;render();const i=$('#ssqI');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}}
function recent(u,t){try{localStorage.setItem(RK,JSON.stringify([{u,t},...ldRecent().filter(x=>x.u!=u)].slice(0,6)))}catch(e){}}
function dlf(u){u=SAFE.url(u);if(!u)return;const n=decodeURIComponent(u.split('/').pop().split('?')[0])||'download';fetch(u,{credentials:'omit'}).then(r=>{if(!r.ok)throw 0;return r.blob()}).then(b=>download(n,b)).catch(()=>{window.open(u,'_blank','noopener');toast('Opened in a new tab to save')})}

/* ---- uploads (IndexedDB) ---- */
const MAX_UPLOAD=50e6, OK_TYPES=/^(application\/pdf|image\/|text\/plain|text\/csv|application\/(msword|vnd\.openxmlformats|vnd\.ms-excel|zip))/;
const idb=()=>new Promise((s,j)=>{const r=indexedDB.open('bb_files',1);r.onupgradeneeded=()=>r.result.createObjectStore('f',{keyPath:'id'});r.onsuccess=()=>s(r.result);r.onerror=()=>j(r.error)});
const fx=async(m,f)=>{const d=await idb();return new Promise((s,j)=>{const t=d.transaction('f',m),o=f(t.objectStore('f'));t.oncomplete=()=>s(o&&o.result);t.onerror=()=>j(t.error)})};
let MF=[];
async function manUp(inp,cat){const c=MC.includes(cat)||cat=='Brand Asset'?cat:($('#mcat')||{}).value||'Other';let n=0,skip=[];
  try{for(const f of inp.files){if(f.size>MAX_UPLOAD||(f.type&&!OK_TYPES.test(f.type))){skip.push(f.name);continue}await fx('readwrite',s=>s.put({id:uuid(),name:SAFE.text(f.name,120),cat:c,size:f.size,type:f.type,time:Date.now(),by:USER,blob:f}));n++}
    inp.value='';if(n){audit('File uploaded',c,n+' file(s)');store()}toast(n+' uploaded'+(skip.length?', skipped '+skip.length+' (type or size not allowed)':''));loadMan()}catch(e){toast('File storage is not available here')}}
function manDl(id){const f=MF.find(x=>x.id==id);if(f)download(f.name,f.blob)}
function manOpen(id){const f=MF.find(x=>x.id==id);if(!f)return;/* only open types the browser can show safely; everything else downloads */if(/^(application\/pdf|image\/(png|jpe?g|gif|webp)|text\/plain)/.test(f.blob.type)){window.open(URL.createObjectURL(f.blob),'_blank','noopener')}else manDl(id)}
function manDel(id){const f=MF.find(x=>x.id==id);if(!f)return;askYes('Delete '+f.name+'?','This removes the file from this device for good. It cannot be undone.','Delete file',()=>manDelGo(id),true)}
async function manDelGo(id){const f=MF.find(x=>x.id==id);if(!f)return;await fx('readwrite',s=>s.delete(id));audit('File deleted',f.name,'');store();loadMan()}
async function manRen(id){const f=MF.find(x=>x.id==id);if(!f)return;const n=SAFE.text(prompt('Rename file',f.name),120);if(!n)return;f.name=n;await fx('readwrite',s=>s.put(f));loadMan()}
async function loadMan(){const m=$('#mans'),a=$('#assets');if(!m&&!a)return;
  try{MF=((await fx('readonly',s=>s.getAll()))||[]).filter(f=>!f.ref).sort((x,y)=>y.time-x.time);
    const row=f=>`<div class="frow"><b>${esc(f.name)}</b><span class="tag">${esc(tc(f.cat))}</span><span class="sz">${kb(f.size)}</span><span class="acts"><button class="mini pri" ${A('manDl',f.id)}>Download</button><button class="mini" ${A('manOpen',f.id)}>Open</button><button class="mini" ${A('manRen',f.id)}>Rename</button><button class="mini del" ${A('manDel',f.id)}>Delete</button></span></div>`;
    const fl=f=>!q||(f.name+' '+f.cat).toLowerCase().includes(q);
    if(m)m.innerHTML=MF.filter(f=>!/^brand asset$/i.test(f.cat)&&fl(f)).map(row).join('')||emptyArt('files','No files yet. Upload manuals, fitting guides, spec sheets and anything else the team needs.');
    if(a)a.innerHTML=BUILTIN().filter(b=>!(S.fileHide||{})['asset:'+b.key]).filter(fl).map(b=>`<div class="frow"><b>${esc(b.name)}</b><span class="tag g">Built-in</span><span class="sz">${kb(b.size)}</span><span class="acts"><a class="mini pri" href="${esc(b.src)}" download="${esc(b.file)}">Download</a><button class="mini" ${A('builtinOpen',b.key)}>Open</button>${ISOWN()?`<button class="mini del" ${A('fileHide','asset:'+b.key,b.name)}>Remove</button>`:''}</span></div>`).join('')+(MF.filter(f=>/^brand asset$/i.test(f.cat)&&fl(f)).map(row).join('')||'<p class="empty" style="margin-top:.6rem">No uploaded brand or print assets yet. Upload cards and artwork above.</p>')}
  catch(e){[m,a].forEach(el=>el&&(el.innerHTML='<p class="empty">File storage is not available in this browser.</p>'))}}

/* set a brochure cover: paste the image address from the website (right-click the cover > Copy image address) */
function fileHide(u,t){if(!need(ISOWN,'Removing files'))return;askYes('Remove '+t+'?','It will no longer show on the Files page for anyone. You can bring it back later from the Removed list.','Remove',()=>{S.fileHide=S.fileHide||{};S.fileHide[u]=t;audit('File removed from list',t,'');store();render();toast(t+' removed')},true)}
function fileHidden(){const H=S.fileHide||{};openModal(`<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><h2>Removed Files</h2>${Object.entries(H).map(([u,t])=>`<div class="row"><span>${esc(t)}</span><button class="mini pri" ${A('fileShow',u)}>Bring back</button></div>`).join('')||'<p class="empty">Nothing removed.</p>'}`,'md')}
function fileShow(u){if(!need(ISOWN,'Restoring files'))return;const t=(S.fileHide||{})[u];delete S.fileHide[u];audit('File restored',t||u,'');store();closeModal();render();toast('Brought back')}
function setCover(u){const d=DL.find(x=>x.url==u);if(!d)return;S.covers=S.covers||{};
  form('Cover Image: '+d.title,[{k:'img',l:'Image address (https://...)',w:'full',max:400,hint:'On broadlandwindows.co.uk/brochures right-click the cover, choose Copy image address, and paste it here. Leave blank to use the automatic cover.'}],{img:S.covers[u]||''},o=>{
    if(o.img&&!SAFE.url(o.img)){toast('That needs to be an https:// image address');return false}
    if(o.img)S.covers[u]=SAFE.url(o.img);else delete S.covers[u];audit('Brochure cover set',d.title,o.img||'automatic')})}

/* logos that ship inside the app, listed in the Brand And Print Assets table */
const BUILTIN=()=>[['full','Broadland logo, full colour','broadland-logo-full-colour.webp'],['emblem','Sun and stork emblem','broadland-sun-emblem.webp'],['textBlue','Text logo, blue','broadland-text-logo-blue.webp'],['textWhite','Text logo, white','broadland-text-logo-white.webp']]
  .map(([key,name,file])=>({key,name,file,cat:'Brand Asset',src:LOGO_SRC[key],size:Math.round((LOGO_SRC[key].length-30)*.75)}));
function builtinOpen(k){const src=LOGO_SRC[k];if(!src)return;const w=window.open('','_blank');if(!w)return;w.document.write(`<title>Logo</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:${/white|dark/i.test(k)?'#012b59':'#fff'}"><img src="${src}" style="max-width:90vw;max-height:90vh">`);w.document.close()}

function copyAllBrochures(){copyText(DL.map(d=>d.title+': '+d.url).join('\n'))}
