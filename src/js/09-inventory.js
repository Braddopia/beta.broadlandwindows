/* ==========================================================================
   09 · Inventory
   - Products view: KPIs, filters, sort/filter popover, batch tools, 50 rows/page
   - Movements view: stock in/out log and requests (pending order numbers)
   - Near full-screen item editor with photos
   Model: S.items is a movement log; the newest row per Stock ID (pid) holds
   the product's current details. Product photos live in S.pphotos[pid].
   ========================================================================== */
(function migratePhotos(){S.pphotos=S.pphotos||{};S.items.forEach(r=>{if(r.photos&&r.photos.length){const a=S.pphotos[r.pid]=S.pphotos[r.pid]||[];r.photos.forEach(p=>{if(SAFE.img(p)&&!a.includes(p)&&a.length<MAX_PHOTOS)a.push(p)})}delete r.photos})})();

const key=r=>r.pid;
const products=()=>{const m=new Map();S.items.forEach(r=>{if(!m.has(r.pid))m.set(r.pid,r)});return[...m.values()]};
const prodRows=k=>S.items.filter(x=>x.pid==k);
const prod=k=>S.items.find(x=>x.pid==k);
const ro=r=>r.reorder==null||r.reorder===''?LOW:+r.reorder||0;
const isLow=r=>r.stock<ro(r);
const hasLoc=r=>r.location&&r.location!='-';
const unitOf=r=>UNITS.includes(r.unit)?r.unit:'Each';
const colTxt=r=>[r.cInName,r.cOutName].filter(x=>x&&x!='-').join(' / ')||'-';
const stt=r=>r.stock<=0?['Out','r']:isLow(r)?['Low','y']:['OK','g'];
const pphotos=k=>(S.pphotos[k]||[]).filter(SAFE.img);
const ordTag=r=>r.type=='request'&&r.ord?`<span class="ord ${r.reqStatus=='Pending'?'p':''}" title="${r.reqStatus=='Pending'?'Pending order number':'Order number'+(r.pref?', was '+esc(r.pref):'')}">${esc(r.ord)}</span>`:'';
const reqTag=r=>{const s=r.reqStatus||'Pending';return `<span class="tag ${s=='Approved'?'g':s=='Rejected'?'r':s=='Cleared'?'n':'y'}">${esc(s)}</span>`};
const SEL=new Set();

/* ---------------- page ---------------- */
function vStock(){const v=UI.inv.v;
  const tog=`<div class="seg2"><button class="${v=='products'?'on':''}" ${A('setUI','inv.v','products')}>Products</button><button class="${v=='moves'?'on':''}" ${A('setUI','inv.v','moves')}>Movements</button></div>`;
  return v=='moves'?vMoves(tog):vProducts(tog)}

function invFiltered(){const I=UI.inv,P=products();
  const okF=r=>I.f=='all'||(I.f=='low'&&isLow(r)&&r.stock>0)||(I.f=='out'&&r.stock<=0)||(I.f=='noloc'&&!hasLoc(r))||(I.f=='nosup'&&!r.supplier);
  const val={pid:r=>r.pid,item:r=>r.item,length:r=>r.length,colours:colTxt,unit:unitOf,location:r=>hasLoc(r)?r.location:'~',stock:r=>+r.stock,reorder:ro,supplier:r=>r.supplier||'~',cost:r=>+r.cost,value:r=>r.stock*r.cost,status:r=>r.stock<=0?0:isLow(r)?1:2}[I.sort]||(r=>r.item);
  return P.filter(r=>hit(r)&&okF(r)&&(I.sup=='all'||r.supplier==I.sup)&&(I.loc=='all'||r.location==I.loc)&&(I.unit=='all'||unitOf(r)==I.unit)).sort((a,b)=>cmp(val(a),val(b))*I.dir||cmp(a.item,b.item))}

function vProducts(tog){
  const Ad=ISADM(),I=UI.inv,P=products(),list=invFiltered(),pg=paginate(I,list),n=SEL.size,cnt=f=>P.filter(f).length;
  const pend=S.items.filter(r=>r.type=='request'&&r.reqStatus=='Pending').length,alerts=S.items.filter(r=>r.flag&&!r.cleared).length;
  const K=[['Products',P.length,'',['inv.f','all']],['Units On Shelf',sum(P,r=>r.stock),'',null],...(Ad?[['Stock Value',m0(sum(P,r=>r.stock*r.cost)),'',null]]:[]),['Low Stock',cnt(r=>isLow(r)&&r.stock>0),cnt(r=>isLow(r)&&r.stock>0)?'warn':'',['inv.f','low']],['Out Of Stock',cnt(r=>r.stock<=0),cnt(r=>r.stock<=0)?'bad':'',['inv.f','out']],['Pending Requests',pend,pend?'warn':'',['moves','request']],['Alerts',alerts,alerts?'bad':'',['moves','alert']]];
  const kpi=k=>k[3]?`<button class="kpi ${k[2]} ${k[3][0]=='inv.f'&&I.f==k[3][1]&&k[3][1]!='all'?'on':''}" ${k[3][0]=='moves'?A('invMoves',k[3][1]):A('setUI',k[3][0],k[3][1])}><small>${k[0]}</small><b>${k[1]}</b></button>`:`<div class="kpi"><small>${k[0]}</small><b>${k[1]}</b></div>`;
  const ch=(v,t)=>`<button class="chip ${I.f==v?'on':''}" ${A('setUI','inv.f',v)}>${t}</button>`;
  const filtersOn=I.sup!='all'||I.loc!='all'||I.unit!='all';
  const rows=pg.rows.map(r=>{const k=key(r),s=stt(r),on=SEL.has(k);return `<tr class="clk-r ${on?'sel':''}" ${RC('viewItem',k)}><td><input type="checkbox" aria-label="Select ${esc(r.item)}" ${on?'checked':''} ${AC('onchange','invSel',k,'this.checked')}></td><td><code>${esc(r.pid)}</code></td><td><b>${esc(r.item)}</b></td><td class="c-sm">${esc(r.length)}</td><td class="c-md">${esc(colTxt(r))}</td><td>${esc(unitOf(r))}</td><td class="c-md">${hasLoc(r)?esc(r.location):'<span class="muted">Not Set</span>'}</td><td class="n">${r.stock}</td><td class="c-sm">${esc(r.supplier||'-')}</td><td class="n c-sm">${money(r.cost)}</td>${Ad?`<td class="n c-md">${money(r.stock*r.cost)}</td>`:''}<td class="ac"><div class="acts r"><span class="tag fw ${s[1]}">${s[0]=='OK'?'In Stock':s[0]=='Low'?'Low':'Out'}</span><button class="mini" ${A('viewItem',k)}>View</button><button class="mini pri" ${A('editItem',k)}>${svg(IC.edit)}Edit</button><button class="mini c-sm" ${A('reportProd',k)}>Report</button></div></td></tr>`}).join('');
  const need=P.filter(isLow).sort((a,b)=>a.stock-b.stock);
  return `<div class="head"><div><h1>Inventory</h1><span class="muted">${P.length} products, ${sum(P,r=>r.stock)} units${Ad?', '+m0(sum(P,r=>r.stock*r.cost)):''}</span></div><div class="tools">${tog}<span class="vs"></span><div class="seg2"><button class="g" ${A('stockForm','add')}>+ Add</button><button class="r" ${A('stockForm','remove')}>- Remove</button><button ${A('stockForm','request')}>Request</button></div><button class="mini" onclick="invNew()">Batch Add</button><button class="mini" onclick="invRep()">Reports</button><button class="mini" onclick="invCsv()">Export CSV</button></div></div>
  <div class="kpis">${K.map(kpi).join('')}</div>
  <div class="sg2">${ch('all','All ('+P.length+')')}${ch('low','Low ('+cnt(r=>isLow(r)&&r.stock>0)+')')}${ch('out','Out ('+cnt(r=>r.stock<=0)+')')}${ch('noloc','No Location ('+cnt(r=>!hasLoc(r))+')')}${ch('nosup','No Supplier ('+cnt(r=>!r.supplier)+')')}${filtersOn?`<span class="vs"></span><button class="chip on" onclick="invReset()">Filters on &times;</button>`:''}</div>
  ${n?`<div class="selbar"><b>${n} Selected</b><button class="mini pri" ${A('invBatch','add')}>Add Stock</button><button class="mini" ${A('invBatch','remove')}>Remove Stock</button><button class="mini" ${A('invSetF','location')}>Set Location</button><button class="mini" ${A('invSetF','supplier')}>Set Supplier</button><button class="mini" ${A('invSetF','unit')}>Set Unit</button><button class="mini" onclick="invRep()">Report</button><button class="mini" onclick="invLabels()">Labels</button><button class="mini" ${A('invCsv',1)}>Export</button>${ISOWN()?'<button class="mini del" onclick="invDel()">Delete</button>':''}<button class="mini" onclick="SEL.clear();render()">Clear</button></div>`:''}
  <div class="tw"><table class="ptb"><thead><tr><th><input type="checkbox" aria-label="Select all on this page" ${pg.rows.length&&pg.rows.every(r=>SEL.has(key(r)))?'checked':''} ${AC('onchange','invAll','this.checked')}></th>${thS('inv','pid','ID')}${thS('inv','item','Item')}${thS('inv','length','Length','c-sm')}${thS('inv','colours','Colours','c-md')}${thS('inv','unit','Unit')}${thS('inv','location','Location','c-md')}${thS('inv','stock','Stock','n')}${thS('inv','supplier','Supplier','c-sm')}${thS('inv','cost','Cost','n c-sm')}${Ad?thS('inv','value','Value','n c-md'):''}<th class="ac"><span class="srt" ${A('sortBy','inv','status')} style="cursor:pointer;margin-right:.5rem">Status${UI.inv.sort=='status'?`<span class="ar">${UI.inv.dir>0?'▲':'▼'}</span>`:''}</span><button class="fbtn ${filtersOn?'on':''}" id="invF" title="Sort and filter" aria-label="Sort and filter" onclick="invFilter(this)">${svg(IC.filter)}</button></th></tr></thead><tbody>${rows||`<tr><td colspan="14" class="empty">${emptyArt('stock','No products match.')}</td></tr>`}</tbody></table></div>
  ${pagerH('inv',pg,'products')}
  <div class="two" style="margin-top:1.1rem"><div class="panel"><h2>Reorder List</h2>${need.slice(0,8).map(r=>`<div class="row"><span><b>${esc(r.item)}</b> <span class="muted">${esc(r.supplier||'No supplier')}</span><br><span class="muted">${r.stock} ${esc(unitOf(r))} left, suggest ${r.reorderQty||Math.max(LOW*2-r.stock,LOW)}</span></span><button class="mini pri" ${A('stockForm','request',r.pid)}>Request</button></div>`).join('')||'<p class="empty">Nothing needs reordering.</p>'}${need.length>8?`<p class="muted">+${need.length-8} more, use the Low filter.</p>`:''}</div>${suppliersPanel()}</div>`}
function invMoves(f){UI.inv.v='moves';UI.mov.f=f;UI.mov.page=1;render()}
function invReset(){Object.assign(UI.inv,{sup:'all',loc:'all',unit:'all',f:'all',page:1});closeFpop();render()}

/* sort + filter popover (funnel icon in the table header) */
function invFilter(btn){const I=UI.inv,P=products(),Ad=ISADM(),opts=(a,cur,all)=>`<option value="all">${all}</option>`+a.map(x=>`<option value="${esc(x)}" ${x==cur?'selected':''}>${esc(x)}</option>`).join('');
  const sorts=[['item','Item code'],['pid','Stock ID'],['stock','Stock level'],['status','Status'],['location','Location'],['supplier','Supplier'],['unit','Unit'],['reorder','Reorder level'],['cost','Cost each'],...(Ad?[['value','Stock value']]:[])];
  openFpop(btn,`<h3>Sort By</h3><select ${AC('onchange','invPop','sort','this.value')}>${sorts.map(([k,t])=>`<option value="${k}" ${I.sort==k?'selected':''}>${t}</option>`).join('')}</select><select ${AC('onchange','invPop','dir','this.value')}><option value="1" ${I.dir>0?'selected':''}>Ascending (A to Z, low to high)</option><option value="-1" ${I.dir<0?'selected':''}>Descending (Z to A, high to low)</option></select>
   <h3>Filter</h3><select aria-label="Status" ${AC('onchange','invPop','f','this.value')}>${[['all','All statuses'],['low','Low stock'],['out','Out of stock'],['noloc','No location'],['nosup','No supplier']].map(([k,t])=>`<option value="${k}" ${I.f==k?'selected':''}>${t}</option>`).join('')}</select>
   <select aria-label="Supplier" ${AC('onchange','invPop','sup','this.value')}>${opts([...new Set(P.map(r=>r.supplier).filter(Boolean))].sort(),I.sup,'All suppliers')}</select>
   <select aria-label="Location" ${AC('onchange','invPop','loc','this.value')}>${opts([...new Set(P.filter(hasLoc).map(r=>r.location))].sort(),I.loc,'All locations')}</select>
   <select aria-label="Unit" ${AC('onchange','invPop','unit','this.value')}>${opts(UNITS,I.unit,'All units')}</select>
   <div class="acts"><button class="mini" onclick="invReset()">Reset</button><button class="mini pri" onclick="closeFpop()">Done</button></div>`)}
function invPop(k,v){UI.inv[k]=k=='dir'?+v:v;UI.inv.page=1;render();const b=$('#invF');if(b){$('#fpop').classList.remove('open');invFilter(b)}}

/* selection + batch tools */
function invSel(k,on){on?SEL.add(k):SEL.delete(k);render()}
function invAll(on){paginate(UI.inv,invFiltered()).rows.forEach(r=>on?SEL.add(key(r)):SEL.delete(key(r)));render()}
function moveRow(b,kind,qty,stock,extra){return{...b,at:Date.now(),time:nowT(),type:kind,flag:false,cleared:false,uid:uuid(),user:USER,qty,stock,reqStatus:undefined,ord:undefined,pref:undefined,note:undefined,...(extra||{})}}
function invBatch(kind){form((kind=='add'?'Add Stock To ':'Remove Stock From ')+SEL.size+' Items',[{k:'qty',l:'Quantity for each item',t:'number',req:1,pos:1,w:'full',max:1e6}],{qty:1},o=>{
  SEL.forEach(k=>{const b=prod(k);if(!b)return;const st=kind=='add'?b.stock+o.qty:Math.max(0,b.stock-o.qty);prodRows(k).forEach(x=>x.stock=st);S.items.unshift(moveRow(b,kind,o.qty,st))});audit('Batch '+kind,SEL.size+' products','Qty '+o.qty+' each')})}
function invSetF(f){const L={location:'Location (Bay, Bin, Shelf, Rack)',supplier:'Supplier',unit:'Unit'}[f];
  form('Set '+L.replace(/ \(.*/,'')+' For '+SEL.size+' Items',[f=='location'?{k:'v',l:L,w:'full',req:1,list:'locs',max:60}:{k:'v',l:L,t:'select',o:f=='unit'?UNITS:SUPN(),w:'full',req:1}],{},o=>{S.items.forEach(x=>{if(SEL.has(key(x)))x[f]=o.v});audit('Batch set '+f,SEL.size+' products',o.v)})}
function invDel(){const n=SEL.size;if(!n||!need(ISOWN,'Deleting products'))return;askYes('Delete '+n+' product'+(n>1?'s':'')+'?','All of their stock history goes too. This cannot be undone.','Delete',()=>{
  S.items=S.items.filter(x=>!SEL.has(key(x)));SEL.forEach(k=>delete S.pphotos[k]);audit('Products deleted',n+' products',[...SEL].join(', '));SEL.clear();store();render();toast(n+' deleted')},true)}
function invNew(){openModal(`<h2>Batch Add Products</h2><p class="muted">One product per line, comma or tab separated: Item Code, Qty, Cost, Supplier, Location, Length, Colour In, Colour Out, Unit. The first four are required. You can paste straight from Excel.</p><div class="ff"><textarea id="bn" rows="9" placeholder="ACET848, 20, 1.85, Example Profiles Ltd, Bay 3 Shelf B, 4MM, Black, Gold, PCS"></textarea></div><div class="mact"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="invNewRun()">Add Products</button></div>`,'lg')}
function invNewRun(){const lines=$('#bn').value.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).slice(0,2000),ok=[],bad=[];
  lines.forEach((l,i)=>{const c=l.split(/\t|,/).map(x=>SAFE.text(x,60));if(i==0&&/^item/i.test(c[0]))return;const[item,q,cost,sup,loc,len,ci,co,un]=c,qty=SAFE.num(q,{max:1e6}),cs=SAFE.num(cost,{max:1e6});
    if(!SAFE.code(item)||!(qty>0)||!(cs>0)||!sup){bad.push(i+1);return}const unit=UNITS.find(u=>u.toLowerCase()==String(un||'').toLowerCase())||'Each';ok.push({item:SAFE.code(item),qty,cost:cs,supplier:sup,location:loc||'',length:len||'-',cInName:ci||'-',cOutName:co||'-',unit})});
  if(bad.length){toast('Check line'+(bad.length>1?'s ':' ')+bad.slice(0,8).join(', ')+': item, quantity, cost and supplier are required');return}if(!ok.length){toast('Nothing to add');return}
  ok.forEach(o=>{const ex=S.items.find(x=>ikey(x)==ikey(o)),pid=ex?ex.pid:stkId(),st=(ex?ex.stock:0)+o.qty;prodRows(pid).forEach(x=>x.stock=st);if(!S.suppliers.some(s=>s.name==o.supplier))S.suppliers.push({name:o.supplier});
    S.items.unshift({at:Date.now(),time:nowT(),type:'add',flag:false,uid:uuid(),pid,user:USER,qty:o.qty,unit:o.unit,item:o.item,length:o.length,cInName:o.cInName,cIn:hex(o.cInName),cOutName:o.cOutName,cOut:hex(o.cOutName),stock:st,cost:o.cost,location:o.location||(ex?ex.location:'-'),barcode:ex?ex.barcode:'',supplier:o.supplier,reorder:ex&&ex.reorder,lead:ex&&ex.lead})});
  audit('Batch add',ok.length+' products','');store();closeModal();render();toast(ok.length+' product'+(ok.length>1?'s':'')+' added')}
function invCsv(onlySel){const Ad=ISADM(),P=(onlySel?products().filter(r=>SEL.has(key(r))):invFiltered());
  csvDownload('broadland-stock-'+today()+'.csv',[['Stock ID','Item','Length','Colour In','Colour Out','Unit','Location','Stock','Reorder Level','Supplier','Barcode',...(Ad?['Cost Each','Stock Value']:[])],...P.map(r=>[r.pid,r.item,r.length,r.cInName,r.cOutName,unitOf(r),r.location,r.stock,ro(r),r.supplier||'',r.barcode||r.item,...(Ad?[r.cost,(r.stock*r.cost).toFixed(2)]:[])])]);toast('Exported '+P.length+' products')}

/* ---------------- movements ---------------- */
function vMoves(tog){const M=UI.mov,Ad=ISADM();
  const ok=r=>M.f=='all'||(M.f=='alert'?r.flag&&!r.cleared:M.f=='pending'?r.type=='request'&&r.reqStatus=='Pending':r.type==M.f);
  const L=S.items.filter(r=>ok(r)&&hit(r)),pg=paginate(M,L),cnt=f=>S.items.filter(f).length;
  const ch=(v,t)=>`<button class="chip ${M.f==v?'on':''}" ${A('setUI','mov.f',v)}>${t}</button>`;
  return `<div class="head"><div><h1>Inventory</h1><span class="muted">Stock movements and requests</span></div><div class="tools">${tog}<span class="vs"></span><div class="seg2"><button class="g" ${A('stockForm','add')}>+ Add</button><button class="r" ${A('stockForm','remove')}>- Remove</button><button ${A('stockForm','request')}>Request</button></div></div></div>
  <div class="sg2">${ch('all','All')}${ch('request','Requests ('+cnt(r=>r.type=='request')+')')}${ch('pending','Pending ('+cnt(r=>r.type=='request'&&r.reqStatus=='Pending')+')')}${ch('add','Added')}${ch('remove','Removed')}${ch('alert','Alerts ('+cnt(r=>r.flag&&!r.cleared)+')')}</div>
  <div class="tw"><table class="ptb"><thead><tr><th>Order No.</th><th>Time</th><th>Type</th><th class="c-sm">User</th><th class="n">Qty</th><th>Item</th><th class="c-sm">Length</th><th class="c-md">Colours</th><th class="n c-md">Stock After</th><th class="ac"></th></tr></thead><tbody>
  ${pg.rows.map(r=>{const req=r.type=='request',pend=req&&r.reqStatus=='Pending';return `<tr class="clk-r" ${RC('viewItem',r.pid)} style="${req&&['Cleared','Rejected'].includes(r.reqStatus)?'opacity:.6':''}"><td>${ordTag(r)||'<span class="muted">-</span>'}</td><td>${esc(r.time)}</td><td><span class="tag ${r.type=='add'?'g':r.type=='remove'?'r':'y'}">${esc(r.type)}</span>${req?' '+reqTag(r):''}${r.flag&&!r.cleared?' <span class="tag r">Alert</span>':''}</td><td class="c-sm">${esc(r.user)}</td><td class="n">${r.qty} ${esc(unitOf(r))}</td><td><b>${esc(r.item)}</b></td><td class="c-sm">${esc(r.length)}</td><td class="c-md">${esc(colTxt(r))}</td><td class="n c-md">${req?'<span class="muted">-</span>':r.stock}</td><td class="ac"><div class="acts r">${pend&&Ad?`<button class="mini pri" ${A('reqApprove',r.uid)}>Approve</button><button class="mini del" ${A('reqReject',r.uid)}>Reject</button>`:''}${req&&r.reqStatus=='Approved'?`<button class="mini ok" ${A('reqReceive',r.uid)}>Receive</button>`:''}${(req&&!['Cleared','Rejected'].includes(r.reqStatus)&&!pend)||(r.flag&&!r.cleared)?`<button class="mini" ${A('moveClear',r.uid)}>Clear</button>`:''}<button class="mini" ${A('viewItem',r.pid)}>View</button>${ISOWN()?`<button class="mini del" ${A('moveDel',r.uid)} aria-label="Delete entry">&times;</button>`:''}</div></td></tr>`}).join('')||'<tr><td colspan="10" class="empty">No entries match.</td></tr>'}
  </tbody></table></div>${pagerH('mov',pg,'entries')}`}
const byUid=u=>S.items.find(x=>x.uid==u);
/* request numbers: P0001 while pending, then the next order number (0001, 0002...) once approved */
/* next order / pending number: one above the highest already used, so numbers never repeat.
   Approved order numbers also skip numbers used as Stock IDs, so 0001 can't mean two things. */
function nextOrd(pre){const re=new RegExp('^'+pre+'(\\d+)$'),used=[...S.items.map(x=>re.exec(x.ord||'')).filter(Boolean).map(m=>+m[1]),...(pre?[]:S.items.filter(x=>/^\d{4,}$/.test(x.pid||'')).map(x=>+x.pid))],key=pre?'pend':'order',n=Math.max(+S.seq[key]||0,0,...used)+1;S.seq[key]=n;return pre+String(n).padStart(4,'0')}
function reqApprove(u){if(!need(ISADM,'Approving requests'))return;const r=byUid(u);if(!r||r.reqStatus!='Pending')return;
  r.pref=r.ord;r.ord=nextOrd('');r.reqStatus='Approved';r.flag=false;r.approvedBy=USER;r.approvedAt=Date.now();
  audit('Request approved',r.item,r.pref+' became order '+r.ord);store();render();toast('Approved: '+r.pref+' is now order '+r.ord)}
function reqReject(u){if(!need(ISADM,'Rejecting requests'))return;const r=byUid(u);if(!r)return;r.reqStatus='Rejected';r.flag=false;audit('Request rejected',r.item,r.ord);store();render()}
function reqReceive(u){const r=byUid(u);if(!r)return;stockForm('add',r.pid,{qty:r.qty,fromReq:u})}
function moveClear(u){const r=byUid(u);if(!r)return;r.cleared=true;r.flag=false;if(r.type=='request'&&r.reqStatus!='Pending')r.reqStatus='Cleared';store();render()}
function moveDel(u){if(!need(ISOWN,'Deleting history'))return;const r=byUid(u);if(!r)return;askYes('Delete this entry?','Stock levels are not changed.','Delete entry',()=>{S.items=S.items.filter(x=>x!==r);audit('Movement deleted',r.item,r.type+' '+r.qty+(r.ord?' '+r.ord:''));store();render()},true)}

/* ---------------- one wide item window for Edit, Add, Remove and Request ---------------- */
let ieIdx=0,ieKey=null,ieMode='edit',iePre={};
function stockForm(kind,k,pre){itemWindow(kind,k,pre)}
function editItem(k){itemWindow('edit',k)}
function ieFields(){const Ad=ISADM(),Own=ISOWN(),ed=ieMode=='edit',mv=!ed,r=(ieKey&&prod(ieKey))||{};return[
  /* Product: Stock ID | Item code | Unit, then Qty | Barcode | Length (length sits under unit) */
  {k:'pid',l:ed&&Own&&!ieView?'Stock ID (admin override, must be unique)':'Stock ID',ro:!(ed&&Own),req:1,max:24,sec:'p'},
  {k:'item',l:'Item code',ro:ed&&!Ad,req:1,max:64,list:'itemCodes',sec:'p',hint:ed&&!Ad?'Only an admin can rename':''},
  {k:'unit',l:'Unit',t:'select',o:UNITS,sec:'p'},
  ed?{k:'stock',l:'Current stock',t:'number',max:1e7,sec:'p',hint:'Changing this logs an adjustment'}:{k:'qty',l:'Quantity',t:'number',req:1,pos:1,max:1e6,sec:'p'},
  {k:'barcode',l:'Barcode',max:64,sec:'p'},
  {k:'length',l:'Length',max:30,sec:'p'},
  {k:'cInName',l:'Colour in (B)',t:'colour',w:'full',sec:'c'},{k:'cOutName',l:'Colour out (A)',t:'colour',w:'full',sec:'c'},
  ...(ieMode!='remove'?[{k:'reorder',l:'Reorder level',t:'number',max:1e6,dp:0,sec:'o',hint:'0 = no low-stock warning'},{k:'reorderQty',l:'Reorder quantity',t:'number',max:1e6,dp:0,sec:'o'},{k:'lead',l:'Lead time (days)',t:'number',max:365,dp:0,sec:'o'}]:[]),
  ...((ieMode=='add')||(ed&&Ad)?[{k:'cost',l:'Cost each (£)',t:'number',max:1e6,sec:'o',hint:ieMode=='add'&&r.pid?'Leave at 0 to keep the current cost':''}]:[]),
  {k:'location',l:'Location (Bay, Bin, Shelf, Rack)',list:'locs',max:60,sec:'l'},{k:'supplier',l:'Supplier',t:'select',o:SUPN(r.supplier),req:ieMode=='add'&&!r.pid,sec:'l'},
  ...(ieMode=='request'?[{k:'note',l:'Needed for (job, reason)',w:'full',max:160,sec:'n'}]:[{k:'notes',l:ed?'Notes':'Product notes',t:'area',w:'full',sec:'n'}])]}
function fieldH(f,v){const val=v[f.k]??'';
  const inp=f.t=='colour'?colourField(f,v):f.t=='select'?`<select id="f_${f.k}" ${f.ro?'disabled':''}>${f.o.map(o=>`<option value="${esc(o)}" ${String(o)==String(val)?'selected':''}>${esc(o||'-')}</option>`).join('')}</select>`:f.t=='area'?`<textarea id="f_${f.k}" rows="3" maxlength="2000">${esc(val)}</textarea>`:`<input id="f_${f.k}" type="${f.t||'text'}" ${f.t=='number'?'step="any" min="0" inputmode="decimal"':`maxlength="${f.max||120}"`} value="${esc(val)}" ${f.ro?'readonly':''} ${f.list?`list="${f.list}"`:''} autocomplete="off">`;
  return `<div class="ff ${f.w||''}" ${f.nx?`data-nx="${f.nx}"`:''} ${nxHid(f,v)?'hidden':''}><label for="f_${f.k}">${esc(f.l)}${MARK(f.req,f.adm)}</label>${inp}${f.hint?`<span class="hint">${esc(f.hint)}</span>`:''}</div>`}
let ieView=false;
function itemWindow(mode,k,pre){const view=ieView=mode=='view';if(view)mode='edit';
  const r=(k&&prod(k))||null;if(mode=='edit'&&!r)return;
  ieMode=mode;ieKey=r?r.pid:null;iePre=pre||{};ieIdx=0;tmp=r?pphotos(r.pid).slice():[];tmpDraw=ieDraw;
  const ed=mode=='edit',clean=x=>x&&x!='-'?x:'';
  const v=r?{...r,length:clean(r.length),cInName:clean(r.cInName),cOutName:clean(r.cOutName),location:hasLoc(r)?r.location:'',unit:unitOf(r),reorder:r.reorder??0,qty:iePre.qty||1,cost:ed?r.cost:0,barcode:r.barcode||r.item,notes:r.notes||''}
             :{pid:stkId(),item:'',unit:'Each',qty:1,length:'',cInName:'',cOutName:'',cIn:'',cOut:'',reorder:0,cost:0,location:'',supplier:'',barcode:''};
  const F=ieFields(),sec=(t,s,cls)=>{const L=F.filter(f=>f.sec==s);return L.length?`<fieldset><legend>${t}</legend><div class="grid ${cls||''}">${L.map(f=>fieldH(f,v)).join('')}</div></fieldset>`:''};
  const T={edit:(view?'':'Edit ')+(r?r.item:''),add:'Add Stock',remove:'Remove Stock',request:'Request Stock'}[mode],B={edit:'Save changes',add:'Add stock',remove:'Remove stock',request:'Send request'}[mode];
  const s=r?stt(r):null;
  openModal(`<div class="ie-h"><div><h2>${esc(T)}</h2><span class="muted" id="ieSub">${r?`Stock ID ${esc(r.pid)} · ${prodRows(r.pid).length} movements · <span class="tag ${s[1]}">${s[0]}</span>`:'New product: a Stock ID is given automatically'}</span></div><button class="mx" onclick="closeModal()" aria-label="Close">&times;</button></div>
  <div class="ie"><div class="ie-ph"><div class="ie-main" id="ieMain"></div><div class="ie-strip" id="ieStrip"></div>
     <div class="prow"><label class="btn ghost sm">${svg(IC.photo)}Take photo<input type="file" accept="image/*" capture="environment" hidden onchange="addPh(this)"></label><label class="btn ghost sm">Upload photos<input type="file" accept="image/*" multiple hidden onchange="addPh(this)"></label><span class="muted" style="align-self:center;font-size:.75rem">Up to ${MAX_PHOTOS}, resized automatically</span></div>
     <div class="ie-stats" id="ieStats"></div></div>
   <div class="ie-f">${sec('Product','p','ie-prod')}${sec('Colours','c')}${sec('Stock And Ordering','o')}${sec('Location And Supplier','l')}${sec(mode=='request'?'Request':'Notes','n')}</div></div>
  ${view?`<div class="mact"><button class="btn ghost" ${A('reportProd',r.pid)}>Report</button><button class="btn ghost" ${A('stockForm','request',r.pid)}>Request stock</button><button class="btn ghost" onclick="closeModal()">Close</button><button class="btn" ${A('itemWindow','edit',r.pid)}>Edit</button>`:`<div class="mact">${ed&&ISOWN()?`<button class="btn ghost l" style="color:var(--red)" ${A('delProduct',r.pid)}>Delete product</button>`:''}${r?`<button class="btn ghost" ${A('reportProd',r.pid)}>Report</button>`:''}<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn ${mode=='remove'?'red':mode=='add'?'green':''}" onclick="ieSave()">${B}</button>`}</div>`,'xl');
  ieDraw();ieStats();bcDeco({diff:!!(r&&r.barcode&&r.barcode!=r.item),val:r?r.barcode||'':''});
  if(view){const b=$('#mbox');b.classList.add('ie-view');b.querySelectorAll('.ie-f input,.ie-f select,.ie-f textarea,.ie-f button,.ie-ph .prow input').forEach(e=>e.disabled=true);const mv=prodRows(r.pid).slice(0,6);$('#mbox .ie-f').insertAdjacentHTML('beforeend',`<fieldset><legend>Recent Movements</legend>${mv.map(x=>`<div class="row"><span><span class="tag ${x.type=='add'?'g':x.type=='remove'?'r':'y'}">${esc(x.type=='add'?'In':x.type=='remove'?'Out':'Request')}</span> ${x.qty} ${esc(unitOf(x))} by ${esc(x.user)}</span><span class="muted">${esc(x.time)}</span></div>`).join('')||'<p class="empty">No movements yet.</p>'}</fieldset>`)}
  if(!ed){const sync=()=>{const g=i=>($('#f_'+i)||{}).value||'',ex=S.items.find(x=>ikey(x)==ikey({item:g('item'),length:g('length'),cInName:g('cInName'),cOutName:g('cOutName')}));
      $('#f_pid').value=ex?ex.pid:stkId();if(ex&&ex.pid!=ieKey){ieKey=ex.pid;$('#f_unit').value=unitOf(ex);if(!tmp.length){tmp=pphotos(ex.pid).slice();ieDraw()}}else if(!ex)ieKey=null;ieStats()};
    ['item','length','cInName','cOutName'].forEach(i=>{const e=$('#f_'+i);e&&['input','change'].forEach(t=>e.addEventListener(t,sync))});$$('#mbox .sws button').forEach(b=>b.addEventListener('click',()=>setTimeout(sync)))}}
function ieStats(){const el=$('#ieStats');if(!el)return;const r=ieKey&&prod(ieKey);
  el.innerHTML=r?`<div><small>In Stock</small><b>${r.stock} ${esc(unitOf(r))}</b></div><div><small>Reorder At</small><b>${ro(r)}</b></div><div><small>${ISADM()?'Stock Value':'Cost Each'}</small><b>${ISADM()?m0(r.stock*r.cost):money(r.cost)}</b></div>`:`<div style="grid-column:1/-1"><small>New Product</small><b>Not in stock yet</b></div>`}
function ieDraw(){const m=$('#ieMain'),s=$('#ieStrip');if(!m)return;ieIdx=Math.min(ieIdx,Math.max(0,tmp.length-1));
  m.innerHTML=tmp.length?`<img src="${SAFE.img(tmp[ieIdx])}" alt="Product photo ${ieIdx+1}">`:`<div class="empty">${svg(IC.photo)}No photos yet.<br>Take or upload a photo of this product.</div>`;
  s.innerHTML=tmp.map((p,i)=>`<div class="th ${i==ieIdx?'on':''}"><img src="${SAFE.img(p)}" alt="Photo ${i+1}" ${A('ieSel',i)}><button type="button" aria-label="Remove photo" ${A('rmPh',i)}>&times;</button></div>`).join('')}
function ieSel(i){ieIdx=i;ieDraw()}
function iePhotos(pid){if(!tmp)return;const a=tmp.filter(SAFE.img).slice(0,MAX_PHOTOS);if(a.length)S.pphotos[pid]=a;else delete S.pphotos[pid]}
function ieSave(){const mode=ieMode,o=readFields(ieFields());if(!o)return;
  o.item=SAFE.code(o.item);if(!o.item){toast('Item code can use letters, numbers, spaces, dots, dashes and slashes');return}
  const bc=$('#bcx')&&$('#bcx').checked?SAFE.code(o.barcode):'';
  if(mode=='edit'){const k=ieKey,r=prod(k),Ad=ISADM(),Own=ISOWN();if(!r)return;
    const np=Own?SAFE.text(o.pid,24):r.pid;
    if(np!=r.pid&&!/^[\w.-]{1,24}$/.test(np)){toast('Stock ID can use letters, numbers, dots and dashes only');return}
    if(np!=r.pid&&S.items.some(x=>x.pid==np)){toast('Stock ID '+np+' is already used');return}
    const nm=Ad?o.item:r.item,probe={item:nm,length:o.length||'-',cInName:o.cInName||'-',cOutName:o.cOutName||'-'};
    if(S.items.some(x=>x.pid!=k&&ikey(x)==ikey(probe))){toast('Another product already has this item code, length and colours');return}
    const changed=o.stock!=r.stock;
    const upd={pid:np,item:nm,unit:o.unit,length:o.length||'-',cInName:o.cInName||'-',cIn:o.cInNameHex,cOutName:o.cOutName||'-',cOut:o.cOutNameHex,stock:o.stock,reorder:o.reorder,reorderQty:o.reorderQty||undefined,lead:o.lead||undefined,location:o.location||'-',supplier:o.supplier,barcode:bc,notes:o.notes,...(Ad?{cost:o.cost}:{})};
    prodRows(k).forEach(x=>Object.assign(x,upd));
    if(changed)S.items.unshift(moveRow(prod(np),o.stock>r.stock?'add':'remove',Math.abs(o.stock-r.stock),o.stock,{note:'Stock adjusted in editor'}));
    iePhotos(np);if(np!=k)delete S.pphotos[k];if(SEL.has(k)&&np!=k){SEL.delete(k);SEL.add(np)}
    audit('Product edited',nm,(np!=k?'ID '+k+' to '+np+'. ':'')+(changed?'Stock '+r.stock+' to '+o.stock:''));store();closeModal();render();toast(nm+' saved');return}
  /* add / remove / request */
  const kind=mode,ex=S.items.find(x=>ikey(x)==ikey(o)),pid=ex?ex.pid:stkId(),cur=ex?ex.stock:0;
  if(kind=='remove'&&!ex){toast('That item (with this length and colours) is not in stock yet');return}
  if(kind=='add'&&!ex&&!o.supplier){toast('Pick a supplier for a new product');return}
  if(kind=='remove'&&o.qty>cur){askIn('Only '+cur+' in stock','Remove all '+cur+' instead?','Remove '+cur,()=>{const q=$('#f_qty');if(q){q.value=cur;ieSave()}});return}
  const st=kind=='add'?cur+o.qty:kind=='remove'?Math.max(0,cur-o.qty):cur;
  const base={pid,item:o.item,unit:o.unit,length:o.length||'-',cInName:o.cInName||'-',cIn:o.cInNameHex,cOutName:o.cOutName||'-',cOut:o.cOutNameHex,cost:o.cost||(ex?ex.cost:0),location:o.location||(ex?ex.location:'-'),barcode:bc||(ex?ex.barcode:''),supplier:o.supplier||(ex?ex.supplier:''),reorder:o.reorder!=null&&kind!='remove'?o.reorder:(ex?ex.reorder:0),lead:o.lead||(ex?ex.lead:undefined),reorderQty:o.reorderQty||(ex&&ex.reorderQty),notes:o.notes||(ex&&ex.notes)};
  if(kind!='request')prodRows(pid).forEach(x=>{x.stock=st;['supplier','location','unit','lead','reorderQty','notes'].forEach(f=>{if(o[f])x[f]=o[f]});if(kind=='add'){x.reorder=base.reorder;if(o.cost)x.cost=o.cost}if(bc)x.barcode=bc});
  const row=moveRow(base,kind,o.qty,st,kind=='request'?{reqStatus:'Pending',ord:nextOrd('P'),note:o.note}:{});
  S.items.unshift(row);iePhotos(pid);
  if(iePre.fromReq){const q=byUid(iePre.fromReq);if(q){q.reqStatus='Cleared';q.cleared=true;q.receivedAt=Date.now()}}
  audit({add:'Stock added',remove:'Stock removed',request:'Stock requested'}[kind],o.item,o.qty+' '+o.unit+(row.ord?' '+row.ord:'')+' (stock '+st+')');
  store();closeModal();render();toast(kind=='request'?'Request '+row.ord+' sent for approval':kind=='add'?'Added '+o.qty+' '+o.unit+', now '+st:'Removed '+o.qty+' '+o.unit+', now '+st)}
/* barcode follows the item code unless "use a different barcode" is ticked */
function bcDeco(o){const bc=$('#f_barcode');if(!bc||$('#bcx'))return;const it=$('#f_item'),ff=bc.closest('.ff'),lab=document.createElement('label');lab.className='cbl';lab.innerHTML='<input type="checkbox" id="bcx"> Use a different barcode';ff.appendChild(lab);const cx=$('#bcx');
  const sync=()=>{if(cx.checked){bc.readOnly=false}else{bc.readOnly=true;bc.value=it?it.value.trim():''}};
  cx.checked=!!o.diff;if(o.diff)bc.value=o.val;cx.onchange=()=>{if(cx.checked){bc.value=o.val||'';bc.focus()}sync()};if(it)it.addEventListener('input',sync);sync()}
function delProduct(k){if(!need(ISOWN,'Deleting products'))return;const r=prod(k);if(!r)return;askYes('Delete '+r.item+'?','All of its stock history goes too. This cannot be undone.','Delete product',()=>{S.items=S.items.filter(x=>x.pid!=k);delete S.pphotos[k];SEL.delete(k);audit('Product deleted',r.item,'ID '+k);store();render()},true)}


/* ---------------- view item ---------------- */
function viewItem(k){itemWindow('view',k)}

/* ---------------- scanner result ---------------- */
function found(code,pv){const c=code.toLowerCase(),vs=products().filter(x=>x.item.toLowerCase()==c||(x.barcode||'').toLowerCase()==c);
  if(vs.length>1&&!pv){openModal(`<h2>${esc(code)}: Pick A Variant</h2>${vs.map(x=>`<div class="row"><span>${esc(colTxt(x))} &middot; ${esc(x.length)}<br><span class="muted">${x.stock} ${esc(unitOf(x))} in stock &middot; ID ${esc(x.pid)}</span></span><button class="mini pri" ${A('found',code,x.pid)}>Open</button></div>`).join('')}<div class="mact"><button class="btn ghost" onclick="closeModal()">Cancel</button></div>`);return}
  const r=pv?prod(pv):vs[0];
  if(!r){openModal(`<h2>No Match For ${esc(code)}</h2><p class="muted">This code isn't in inventory yet.</p><div class="mact col"><button class="btn green" ${A('newFromCode',code)}>Add as new item</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div>`);return}
  const k=r.pid;openModal(`<h2>${esc(r.item)}</h2><p class="muted">${r.stock} ${esc(unitOf(r))} in stock at ${esc(hasLoc(r)?r.location:'no location')}.${ISADM()?' '+money(r.cost)+' each.':''}</p>${gallery(pphotos(k).slice(0,3))}<div class="mact col"><button class="btn green" ${A('stockForm','add',k)}>Add stock</button><button class="btn red" ${A('stockForm','remove',k)}>Remove stock</button><button class="btn" ${A('stockForm','request',k)}>Request item</button><button class="btn ghost" ${A('editItem',k)}>Edit item and photos</button></div>`)}
function newFromCode(c){if(view!='stock')go('stock');stockForm('add');const e=$('#f_item');if(e){e.value=SAFE.code(c);e.dispatchEvent(new Event('input'))}}
