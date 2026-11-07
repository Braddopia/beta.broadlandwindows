/* ==========================================================================
   19 · Search everything from the top bar
   Typing shows matching leads, contracts, service calls, contacts, suppliers,
   stock and staff in a list under the box (only what this account may see).
   The page you are on is still filtered too, as before.
   ========================================================================== */
/* every text value in a record, including phone/email lists; skips photos and files */
function srchText(o,d=0){if(o==null||d>3)return'';if(typeof o!='object')return typeof o=='string'&&(o.length>300||o.startsWith('data:'))?'':String(o);
  return Object.entries(o).filter(([k])=>!/^(photos|files|docs|sig|signature|pay|audit|appts|lines|ck)$/.test(k)).map(([,v])=>srchText(v,d+1)).join(' ')}
/* all words must appear; a number like "01632960014" also matches "01632 960 014" */
function srchMatch(txt,query){const t=txt.toLowerCase(),td=t.replace(/[\s()-]/g,'');
  return query.split(/\s+/).filter(Boolean).every(w=>t.includes(w)||(/^[\d+]{4,}$/.test(w)&&td.includes(w)))}
const SRCH=[
  ['leads','Leads',()=>allLeads(),l=>[l.name||'Lead '+l.id,['Lead '+l.id,l.stage,l.town,l.postcode||l.pc].filter(Boolean).join(' · ')],l=>openLead(l.id)],
  ['contracts','Contracts',()=>S.contracts,c=>[c.name||'Contract '+c.id,['Contract '+c.id,c.stage,c.town].filter(Boolean).join(' · ')],c=>openContract(c.id)],
  ['service','Service Calls',()=>S.calls,c=>[c.name||c.id,[c.id,c.issue,c.status].filter(Boolean).join(' · ')],c=>editCall(c.id)],
  ['contacts','Contact Book',()=>S.contacts,c=>[c.co||c.name,[c.co?c.name:'',c.type,c.phone].filter(Boolean).join(' · ')],c=>editContact(c.id)],
  ['suppliers','Suppliers',()=>S.suppliers.map((x,i)=>({...x,_i:i})),x=>[x.name,[x.account,x.contact,x.phone].filter(Boolean).join(' · ')],x=>editSup(x._i)],
  ['stock','Inventory',()=>products(),r=>[r.item||r.pid,['Stock ID '+r.pid,r.supplier,r.loc].filter(Boolean).join(' · ')],r=>viewItem(r.pid)],
  ['staff','Staff',()=>S.staff,s=>[s.name,[s.role,s.team].filter(Boolean).join(' · ')],s=>editStaff(s.id)],
  ['downloads','Files And Manuals',()=>{const H=S.fileHide||{};return[...DL.filter(d=>!H[d.url]).map(d=>({t:d.title,s:'Brochure · '+d.cat,u:d.url})),...SSM.filter(m=>!H[m.u]).map(m=>({t:m.t,s:'Manual · '+m.f,u:m.u})),...MF.filter(f=>!/^brand asset$/i.test(f.cat)).map(f=>({t:f.name,s:'File · '+tc(f.cat),id:f.id}))]},
    f=>[f.t,f.s],f=>{if(f.id){manOpen(f.id);return}const u=SAFE.url(f.u);if(u)window.open(u,'_blank','noopener,noreferrer')}]];
/* uploaded files live in the browser database: read them once so they can be found from any page */
function srchFiles(){if(srchFiles.done||MF.length)return;srchFiles.done=1;try{fx('readonly',s=>s.getAll()).then(r=>{MF=(r||[]).filter(f=>!f.ref).sort((x,y)=>y.time-x.time)}).catch(()=>{})}catch(e){}}
let SR=[],SRi=0;
function srchRun(raw){const box=$('#sres');if(!box)return;const query=String(raw||'').trim().toLowerCase();SR=[];SRi=0;
  if(query.length<2){box.classList.remove('open');box.innerHTML='';return}
  const groups=[];
  SRCH.forEach(([v,label,list,show,open])=>{if(!canSee(v))return;let L;try{L=list().filter(o=>srchMatch(srchText(o),query))}catch(e){return}
    if(!L.length)return;groups.push(`<div class="srg">${esc(label)}<span>${L.length}</span></div>`+L.slice(0,5).map(o=>{const[t,s]=show(o),i=SR.length;SR.push(()=>{srchClose(true);open(o)});
      return `<button type="button" class="sri" data-i="${i}" role="option"><b>${esc(tc(String(t||'')))}</b><small>${esc(s||'')}</small></button>`}).join(''))});
  const r=$('#sb').getBoundingClientRect(),w=Math.min(innerWidth-16,Math.max(r.width,340));box.style.top=(r.bottom+6)+'px';box.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';box.style.width=w+'px';
  box.innerHTML=groups.join('')||`<p class="srn">Nothing found for “${esc(raw.trim())}”.</p>`;box.classList.add('open');srchMark()}
function srchMark(){$$('#sres .sri').forEach((b,i)=>b.classList.toggle('on',i==SRi))}
function srchClose(clear){const box=$('#sres');if(box)box.classList.remove('open');if(clear){$('#q').value='';q='';sbSync();render()}}
(function search(){const sb=$('#sb'),inp=$('#q');if(!sb||!inp)return;
  const box=document.createElement('div');box.id='sres';box.setAttribute('role','listbox');box.setAttribute('aria-label','Search results');document.body.appendChild(box); /* not inside the glass top bar: its blur would offset a fixed box */
  inp.setAttribute('aria-controls','sres');
  inp.addEventListener('input',()=>srchRun(inp.value));
  inp.addEventListener('focus',()=>{srchFiles();if(inp.value.trim().length>1)srchRun(inp.value)});
  inp.addEventListener('keydown',e=>{if(!box.classList.contains('open'))return;
    if(e.key=='ArrowDown'||e.key=='ArrowUp'){e.preventDefault();SRi=(SRi+(e.key=='ArrowDown'?1:-1)+SR.length)%Math.max(SR.length,1);srchMark();const on=$('#sres .sri.on');on&&on.scrollIntoView({block:'nearest'})}
    else if(e.key=='Enter'&&SR[SRi]){e.preventDefault();SR[SRi]()}
    else if(e.key=='Escape')srchClose()});
  box.addEventListener('mousedown',e=>e.preventDefault()); /* keep focus in the box while clicking a result */
  box.addEventListener('click',e=>{const b=e.target.closest('.sri');if(b&&SR[+b.dataset.i])SR[+b.dataset.i]()});
  document.addEventListener('click',e=>{if(!e.target.closest('#sres,#sb'))srchClose()});
  $('#qClr').addEventListener('click',()=>srchClose());
})();
