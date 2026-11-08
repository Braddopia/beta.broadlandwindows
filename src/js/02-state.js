/* ==========================================================================
   02 · Data: seed data, load + migrate, save, audit trail
   Storage key is unchanged from v18 so existing data carries straight over.
   ========================================================================== */
const KEY='broadland_crm_v1', LOW=15, MAX_PHOTOS=8, MAX_LOG=1500;
const STAGES=['New','Surveyed','Quoted','Won','Lost'];
const CSTAGES=['Deposit due','Survey done','Ordered','Fitting booked','Fitted','Complete'];
const SOURCES=['Website','Google search','Phone','Showroom','Referral','Repeat customer','Signboard','Van signage','Facebook','Instagram','TikTok','Leaflet','Newspaper or magazine','Radio','Trade show','Trusted Trader','ReferenceLine','Other'];
const FIT=['Team A','Team B','Fitter A','Fitter B'];
const SCATS=['Salespeople','Fitters','Office','Factory'];
const guessCat=r=>/sales|surveyor|consultant|estimator/i.test(r)?'Salespeople':/fit|install/i.test(r)?'Fitters':/operative|production|factory|stock|warehouse|driver/i.test(r)?'Factory':'Office';
const UNITS=['Each','Units','Pair','Single','PCS','Meters (M)'];
const CT=['Supplier','Customer','Sub-contractor','Trade','Other'];
const DS=['Due','In transit','Received'];
const CO={name:'Broadland Windows, Doors & Garden Rooms',tel:'01603 483002',em:'sales@broadlandwindows.co.uk',em2:'commercial@broadlandwindows.co.uk',web:'www.broadlandwindows.co.uk',addr:'148 Hellesdon Park Road, Norwich, Norfolk NR6 5DR'};
const PRE=[['Black','#3a3a3a'],['Grey','#8a8a8a'],['Anthracite','#383e42'],['White','#e8e6e0'],['Cream','#efe3c6'],['Gold','#c9a24b'],['Silver','#b9b9b9'],['Brown','#6b4a2f'],['Oak','#b07a3c'],['Green','#2f6b4a'],['Red','#a33030'],['Blue','#034ea2']];
const hex=n=>(Object.fromEntries(PRE.map(([a,b])=>[a.toLowerCase(),b])))[String(n).trim().toLowerCase()]||'#c9c6bd';

/* ---- seed data ---- */
function seed(){
  const d=addDays,it=(time,type,flag,user,qty,item,length,cInName,cOutName,stock,cost,location)=>({time,type,flag,user,qty,item,length,cInName,cIn:hex(cInName),cOutName,cOut:hex(cOutName),stock,cost,location,supplier:/^ACET/.test(item)?'Example Profiles Ltd':'Example Glazing Ltd'});
  const P=(id,name,role,team,start,allow,salary)=>({id,name,role,team,phone:'07700 900 '+String(100+(+id.slice(2))*137%900),email:name.toLowerCase().replace(/[^a-z]+/g,'.')+'@example.com',start,allow,salary});
  return{
  items:[it('09:41','request',true,'Operative 1',7,'ACET848','4-5MM','Black','Gold',62,1.85,'Bay 3, Shelf B'),it('09:22','add',false,'Fitter B',3,'VG920 KL010','3M','Grey','Grey',118,.92,'Bay 1, Shelf A'),it('09:22','add',false,'Fitter B',3,'KL005','3M','Grey','Grey',74,.78,'Bay 1, Shelf C'),it('08:58','request',false,'Operative 2',3,'KL005','5MM','Gold','Black',74,.78,'Bay 1, Shelf C'),it('08:40','add',false,'Stock Controller',12,'ACET848','4MM','Black','Black',62,1.85,'Bay 3, Shelf B'),it('08:15','remove',true,'Fitter B',2,'VG920','3M','Grey','Grey',9,.92,'Bay 1, Shelf A'),it('07:50','request',false,'Operative 3',5,'KL010','5MM','Gold','Gold',41,1.10,'Bay 2, Shelf A'),it('07:32','add',false,'Fitter A',8,'KL005','3M','Grey','Grey',74,.78,'Bay 1, Shelf C'),it('Yesterday','request',true,'Operative 4',2,'ACET848','4MM','Black','Gold',62,1.85,'Bay 3, Shelf B')],
  leads:[{id:'1041',name:'Sample Customer A',phone:'01632 960 014',town:'Wymondham',product:'Bifold doors, 4 panel',value:6850,source:'Website',stage:'Quoted',next:'Chase quote on Fri'},{id:'1042',name:'Sample Customer B',phone:'07700 900 231',town:'Norwich',product:'Garden room, 4m x 3m',value:21400,source:'Referral',stage:'Surveyed',next:'Send quote by Mon'},{id:'1043',name:'Sample Customer C',phone:'01632 963 882',town:'Great Yarmouth',product:'9 windows, white uPVC',value:7960,source:'Facebook',stage:'New',next:'Call to book survey'},{id:'1044',name:'Sample Customer D',phone:'07700 900 118',town:'Aylsham',product:'Composite front door',value:2150,source:'Phone',stage:'New',next:'Survey Tue 10am'},{id:'1045',name:'Sample Customer E',phone:'01632 964 340',town:'Aylsham',product:'7 windows + front door',value:9420,source:'Showroom',stage:'Won',next:'Raise contract',contract:true},{id:'1046',name:'Sample Customer F',phone:'07700 900 457',town:'Dereham',product:'Sliding patio door',value:3890,source:'Website',stage:'Won',next:'Raise contract'},{id:'1047',name:'Sample Customer G',phone:'01632 960 776',town:'Norwich',product:'Conservatory roof',value:11200,source:'Trade show',stage:'Quoted',next:'Follow up after finance'},{id:'1048',name:'Sample Customer H',phone:'07700 900 664',town:'Thetford',product:'3 windows',value:1980,source:'Phone',stage:'Lost',next:'Went with cheaper quote'}],
  contracts:[{id:'2402318',name:'Sample Customer E',town:'Aylsham',product:'7 windows + front door',value:9420,paid:2826,stage:'Fitting booked',fit:'2026-11-12',fitter:'Team A',notes:''},{id:'2402311',name:'Sample Customer I',town:'Norwich',product:'Bifold doors, 3 panel',value:5480,paid:5480,stage:'Fitted',fit:'2026-11-03',fitter:'Team B',notes:'Snagging visit needed'},{id:'2402305',name:'Sample Customer J',town:'North Walsham',product:'Garden room, 3m x 3m',value:18900,paid:9450,stage:'Ordered',fit:'2026-11-26',fitter:'Team A',notes:'Base laid 19 Nov'},{id:'2402299',name:'Sample Customer K',town:'Cromer',product:'12 windows',value:11340,paid:3402,stage:'Survey done',fit:'',fitter:'Team B',notes:''},{id:'2402290',name:'Sample Customer L',town:'Diss',product:'French doors',value:2760,paid:0,stage:'Deposit due',fit:'',fitter:'Fitter A',notes:''}],
  calls:[{id:'S-0871',name:'Sample Customer I',town:'Norwich',contract:'2402311',issue:'Bifold handle stiff, one panel rubbing',priority:'Normal',status:'Open',visit:'2026-11-09',fitter:'Fitter A',notes:''},{id:'S-0870',name:'Sample Customer M',town:'Holt',contract:'2402204',issue:'Misted unit, kitchen window',priority:'Low',status:'Booked',visit:'2026-11-11',fitter:'Fitter B',notes:'Replacement unit ordered'},{id:'S-0869',name:'Sample Customer N',town:'Sheringham',contract:'2402187',issue:'Water ingress below patio door',priority:'Urgent',status:'Open',visit:'',fitter:'Team A',notes:''},{id:'S-0866',name:'Sample Customer O',town:'Wymondham',contract:'2402150',issue:'Replace lost door key set',priority:'Low',status:'Complete',visit:'2026-10-30',fitter:'Fitter A',notes:''}],
  contacts:[{id:'K-1',co:'Example Glass Ltd',name:'Contact One',role:'Account manager',type:'Supplier',phone:'01632 960 201',email:'sales@glass.example.com',addr:'Norwich'},{id:'K-2',co:'Example Aluminium Ltd',name:'Contact Two',role:'Sales office',type:'Supplier',phone:'01632 961 310',email:'orders@aluminium.example.com',addr:'Attleborough'},{id:'K-3',co:'Example Timber Ltd',name:'Contact Three',role:'Director',type:'Supplier',phone:'01632 962 118',email:'info@timber.example.com',addr:'North Walsham'},{id:'K-4',co:'Example Fitting Services',name:'Fitter A',role:'Lead fitter',type:'Sub-contractor',phone:'07700 900 312',email:'jobs@fitting.example.com',addr:'Norwich'},{id:'K-5',co:'Example Groundworks',name:'Contact Five',role:'Groundworks',type:'Trade',phone:'07700 900 845',email:'office@groundworks.example.com',addr:'Dereham'}],
  deliveries:[{id:'D-1',supplier:'Example Glass Ltd',items:'Sealed units x24',due:d(-1),status:'In transit',contract:'2402318'},{id:'D-2',supplier:'Example Aluminium Ltd',items:'Bifold frames x3',due:d(0),status:'Due',contract:'2402305'},{id:'D-3',supplier:'Example Timber Ltd',items:'Garden room kit 3m x 3m',due:d(0),status:'In transit',contract:'2402305'},{id:'D-4',supplier:'Example Glass Ltd',items:'Glass panels x12',due:d(2),status:'Due',contract:'2402299'},{id:'D-5',supplier:'Example Aluminium Ltd',items:'French doors x1',due:d(5),status:'Due',contract:'2402290'}],
  staff:[P('U-1','Demo User','Director','','2012-04-02',25,62000),P('U-2','Fitter A','Lead fitter','Team A','2016-09-12',25,34000),P('U-3','Fitter B','Fitter','Team B','2019-03-04',25,31000),P('U-4','Stock Controller','Stock controller','','2020-06-15',25,29500),P('U-5','Operative 1','Production operative','','2021-01-11',25,27500),P('U-6','Operative 2','Production operative','','2022-05-03',25,27000),P('U-7','Operative 3','Production operative','','2023-02-20',25,26500),P('U-8','Operative 4','Production operative','','2024-08-05',25,26000),P('U-9','Sales A','Sales consultant','','2023-09-04',25,30000),P('U-10','Office A','Office manager','','2018-01-08',25,29000)],
  hols:[{id:'H-1',sid:'U-2',from:'2026-11-23',to:'2026-11-27',days:5,status:'Approved'},{id:'H-2',sid:'U-3',from:'2026-12-21',to:'2026-12-31',days:7,status:'Pending'},{id:'H-3',sid:'U-4',from:'2026-08-03',to:'2026-08-14',days:10,status:'Approved'},{id:'H-4',sid:'U-5',from:'2026-12-24',to:'2026-12-24',days:1,status:'Pending'}],
  fin:[{id:'B-1',payee:'Example Glazing Ltd',type:'Supplier',ref:'INV-8841',job:'2402318',amount:1840,due:d(-3),status:'Unpaid'},{id:'B-2',payee:'Example Profiles Ltd',type:'Supplier',ref:'INV-5520',job:'2402305',amount:2310,due:d(6),status:'Unpaid'},{id:'B-3',payee:'Example Timber Ltd',type:'Supplier',ref:'INV-1207',job:'2402305',amount:6450,due:d(12),status:'Unpaid'},{id:'B-4',payee:'Example Groundworks',type:'Job cost',ref:'Garden room base',job:'2402305',amount:1200,due:d(2),status:'Unpaid'}]
}}

/* ---- load ---- */
let S;
(function load(){
  /* two copies may exist (browser database and localStorage): use the most recently saved one */
  let raw=typeof window.__BOOT=='string'?window.__BOOT:null,ls=null;try{ls=localStorage.getItem(KEY)}catch(e){}window.__BOOT=null;
  const at=j=>{const m=/"_saved":(\d+)/.exec(j?j.slice(-60):'');return m?+m[1]:0};
  if(!raw||(ls&&at(ls)>at(raw)))raw=ls||raw;
  if(raw){try{S=JSON.parse(raw)}catch(e){
    /* never silently throw data away: keep the unreadable copy */
    try{localStorage.setItem(KEY+'_unreadable_'+Date.now(),raw)}catch(x){}
    setTimeout(()=>toast('Saved data could not be read. A copy was kept and demo data loaded.'),1800)}}
  if(!S||typeof S!='object'||!Array.isArray(S.items))S=seed();
  window.__BOOT_AT=+S._saved||0;
})();

/* ---- migrate older versions, fill gaps ---- */
function stkId(){return String(Math.max(0,...S.items.map(r=>/^\d{4}$/.test(r.pid)?+r.pid:0),...S.items.map(r=>r.type=='request'&&/^\d{4,}$/.test(r.ord||'')?+r.ord:0))+1).padStart(4,'0')}
const ikey=r=>[r.item,r.length,r.cInName,r.cOutName].map(v=>{v=String(v||'').trim().toLowerCase();return v=='-'?'':v}).join('|');
(function migrate(){
  const s0=seed();
  ['items','leads','contracts','calls','contacts','deliveries','staff','hols','fin'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=s0[k]});
  ['suppliers','orders','notes','audit'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=[]});
  S.pay=S.pay||{};S.seen=S.seen||{};S.dis=S.dis||{};S.seq=S.seq||{};
  if(!S.suppliers.length)S.suppliers=[{name:'Example Profiles Ltd',account:'ACC-0001',terms:'30 days end of month',lead:10,contact:'Trade counter',phone:'01632 965 100',email:'orders@profiles.example.com'},{name:'Example Glazing Ltd',account:'ACC-0002',terms:'Pro forma',lead:5,contact:'Sales office',phone:'01632 965 200',email:'sales@glazing.example.com'},{name:'Example Doors Ltd',hm:1,account:'ACC-0003',terms:'30 days'}];
  const C7=x=>/^C-\d+$/.test(x)?String(2400000+ +x.slice(2)):x;
  S.leads.forEach(l=>{l.id=String(l.id).replace(/^L-/,'');l.photos=l.photos||[]});
  S.contracts.forEach(c=>{c.id=C7(String(c.id));c.pay=c.pay||[];c.photos=c.photos||[]});
  S.calls.forEach(c=>{c.contract=C7(String(c.contract||''));c.photos=c.photos||[]});
  /* stock: unique ids, units, request order numbers */
  const pm={},lm={};
  S.items.forEach(r=>{r.photos=r.photos||[];r.uid=r.uid||uuid();r.unit=UNITS.includes(r.unit)?r.unit:'Each';if(r.reorder==null||r.reorder==='')r.reorder=LOW;const k=ikey(r);
    if(r.pid&&!/^\d{4}$/.test(r.pid)&&!/^[\w.-]{1,24}$/.test(r.pid)){lm[r.pid]=lm[r.pid]||stkId();r.pid=lm[r.pid]}
    else if(!r.pid){r.pid=pm[k]=pm[k]||stkId()}});
  S.seq.pend=S.seq.pend||0;S.seq.order=S.seq.order||0;
  S.items.slice().reverse().forEach(r=>{if(r.type!='request')return;
    if(!r.reqStatus)r.reqStatus=r.cleared?'Cleared':'Pending';
    if(!r.ord)r.ord='P'+String(++S.seq.pend).padStart(4,'0')});
  /* public review scores shown on the overview and customer documents (admin can update) */
  coLoad();
  /* one fitter field became up to six */
  S.contracts.forEach(fitSync);
  S.brand=S.brand||{};S.brand.tp=S.brand.tp||{score:4.5,count:'',url:'https://uk.trustpilot.com/review/broadlandwindows.co.uk'};S.brand.g=S.brand.g||{score:4.5,count:'',url:''};
  /* review sites figures as published (Nov 2026); admins update them in Admin Console > Reviews */
  if(!S.brand.tp.count)S.brand.tp.count='21';
  S.brand.tt=S.brand.tt||{score:4.9,count:'613',url:'https://trustedtrader.team/Norfolk/Broadland-Windows-0000015.html'};
  S.brand.rl=S.brand.rl||{score:9.6,count:'650',rec:'99',url:'https://www.referenceline.com/replacement_doors_windows_conservatories-in-norwich-broadlandwindowsltd-24531'};
  /* short quotes from public reviews; names of reviewers are deliberately not stored */
  if(!Array.isArray(S.brand.quotes))S.brand.quotes=[
    {src:'Trusted Trader',d:'2026-10-24',t:'Very impressed from start to finish with the service for our 2 replacement windows and 1 replacement door. Everyone we dealt with was friendly and courteous.'},
    {src:'Trusted Trader',d:'2026-10-22',t:'A thoroughly professional, local company that is a pleasure to deal with. Their work is of the highest quality and so is their service.'},
    {src:'Trusted Trader',d:'2026-10-22',t:'Excellent service from start to finish. Very pleased with our quality new windows and door. They have transformed our property.'},
    {src:'Trusted Trader',d:'2026-10-16',t:'Always on time, worked hard, efficient and clearly knew what they were doing. I can recommend Broadland Windows without hesitation.'},
    {src:'Trusted Trader',d:'2026-09-27',t:'The work was done quickly, with hardly any mess, and we have now got a lovely new bedroom window.'},
    {src:'Trusted Trader',d:'2026-07-28',t:'Very professional, punctual and very competitive. The quality of the products they provide is also top-notch.'},
    {src:'ReferenceLine',d:'2022-12-04',t:'I was very pleased with Broadland Windows work and would happily recommend them.'},
    {src:'ReferenceLine',d:'2022-11-07',t:'Very happy with all the work undertaken by a professional, friendly team.'},
    {src:'ReferenceLine',d:'2022-10-10',t:'Very efficient, helpful, tidy. All surfaces cleaned and all old material taken away. Very professional at all times.'}];
  /* show the two new review tiles once on an office board someone already customised */
  /* the four review tiles became one card */
  if(!S.brand._rv3){S.brand._rv3=1;S.brand._rv2=1;const o=(S.boards||{}).office;if(o&&Array.isArray(o.k)){const i=o.k.findIndex(k=>['g','tp','tt','rl'].includes(k));o.k=o.k.filter(k=>!['g','tp','tt','rl'].includes(k));if(!o.k.includes('rv'))o.k.splice(i<0?0:i,0,'rv')}}
  if(!S.brand._rv2){S.brand._rv2=1;const o=(S.boards||{}).office;if(o&&Array.isArray(o.k))['tt','rl'].forEach(k=>{if(!o.k.includes(k))o.k.splice(Math.min(2,o.k.length),0,k)})}
  /* profile: who is using this browser */
  if(!S.profile){const u=S.staff.find(s=>s.name=='Demo User')||S.staff[0]||{};S.profile={sid:u.id||'',name:u.name||'Demo User',email:u.email||'',phone:u.phone||'',mobile:'',emergency:'',signature:'',notes:''}}
  /* security: per-install salt and hashed PINs (default 1234 until changed) */
  S.sec=S.sec||{};S.sec.salt=S.sec.salt||uuid();
  S.sec.pins=S.sec.pins||{};
  ['admin','beta'].forEach(r=>{if(!S.sec.pins[r])S.sec.pins[r]={h:pinHash(r,'1234'),def:1}});['finance','sales','stock','fitter'].forEach(r=>delete S.sec.pins[r]);
})();
function pinHash(role,pin){return sha256(S.sec.salt+':'+role+':'+pin)}

/* ---- the signed-in person ---- */
Object.defineProperty(window,'USER',{get:()=>(window.SSO&&SSO.name)||(S.profile&&S.profile.name)||'Unknown'});
const me=()=>(window.SSO&&SSO.sid&&S.staff.find(s=>s.id==SSO.sid))||(!window.SSO&&S.staff.find(s=>s.id==S.profile.sid))||S.staff.find(s=>s.name==USER);

/* ---- save ---- */
let storeWarned=0;
/* saving: the browser database (IndexedDB) is the main store; localStorage keeps a copy while it fits */
let SDB=null,storeSize=0;
const sdb=()=>SDB||(SDB=new Promise((ok,no)=>{try{const r=indexedDB.open('bb_state',1);r.onupgradeneeded=()=>r.result.createObjectStore('s');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}}));
const BC=typeof BroadcastChannel=='function'?new BroadcastChannel('bb_state'):null;
function saveRaw(j){storeSize=j.length;
  sdb().then(d=>{const t=d.transaction('s','readwrite'),os=t.objectStore('s');
    /* the database answered late at start-up: never write over a newer copy we have not loaded */
    if(window.__BOOT_MISS){const g=os.get(KEY);g.onsuccess=()=>{const v=g.result,m=/"_saved":(\d+)/.exec(typeof v=='string'?v.slice(-60):'');
      if(m&&+m[1]>(window.__BOOT_AT||0)){t.abort();window.__bootReload();return}window.__BOOT_MISS=false;os.put(j,KEY)}}
    else os.put(j,KEY);t.oncomplete=()=>{BC&&BC.postMessage('saved')};t.onerror=()=>toast('Could not save. Export a backup from Admin Console.')}).catch(()=>{});
  if(window.__BOOT_MISS)return; /* wait until the database check above has passed */
  try{if(j.length<4.5e6)localStorage.setItem(KEY,j);else localStorage.removeItem(KEY)}catch(e){try{localStorage.removeItem(KEY)}catch(x){}}}
function store(){try{delete S._saved;S._saved=Date.now();const N=phOut();if(!N.length){saveRaw(JSON.stringify(S));return}
  /* new photos go to the photo store first; if that fails they stay inside the record */
  phPutMany(N).then(()=>saveRaw(JSON.stringify(S)),()=>{PH_OFF=true;phBack(N);saveRaw(JSON.stringify(S))})}catch(e){toast('Could not save: '+e.message)}}
/* ask the browser to keep the data even when the disk is low */
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}

/* ---- audit trail: who changed what, when ---- */
function audit(action,target,detail){
  S.audit.unshift({at:Date.now(),by:USER,role:ROLE,a:SAFE.text(action,60),t:SAFE.text(target,80),d:SAFE.text(detail,240)});
  if(S.audit.length>MAX_LOG)S.audit.length=MAX_LOG}

/* ---- cross-tab sync ---- */
let syncPend=0;
function syncPull(){sdb().then(d=>{const g=d.transaction('s','readonly').objectStore('s').get(KEY);g.onsuccess=()=>{try{const n=JSON.parse(g.result);if(!n||!Array.isArray(n.items))return;if($('.ov.open')){syncPend=1;return}syncPend=0;S=n;render()}catch(x){}}})}
if(BC)BC.onmessage=()=>{if($('.ov.open')){syncPend=1;return}syncPull()};
window.addEventListener('storage',e=>{if(!BC&&e.key==KEY&&e.newValue){try{const n=JSON.parse(e.newValue);if(n&&Array.isArray(n.items)){S=n;render()}}catch(x){}}});
