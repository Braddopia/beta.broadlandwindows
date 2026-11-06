/* ==========================================================================
   02 · Data: seed data, load + migrate, save, audit trail
   Storage key is unchanged from v18 so existing data carries straight over.
   ========================================================================== */
const KEY='broadland_crm_v1', LOW=15, MAX_PHOTOS=8, MAX_LOG=1500;
const STAGES=['New','Surveyed','Quoted','Won','Lost'];
const CSTAGES=['Deposit due','Survey done','Ordered','Fitting booked','Fitted','Complete'];
const SOURCES=['Website','Phone','Referral','Trade show','Facebook','Showroom'];
const FIT=['Team A','Team B','Tom Baker','James Robinson'];
const UNITS=['Each','Units','Pair','Single','PCS','Meters (M)'];
const CT=['Supplier','Customer','Sub-contractor','Trade','Other'];
const DS=['Due','In transit','Received'];
const CO={name:'Broadland Windows, Doors & Garden Rooms',tel:'01603 483002',em:'sales@broadlandwindows.co.uk',em2:'commercial@broadlandwindows.co.uk',web:'www.broadlandwindows.co.uk',addr:'148 Hellesdon Park Road, Norwich, Norfolk NR6 5DR'};
const PRE=[['Black','#3a3a3a'],['Grey','#8a8a8a'],['Anthracite','#383e42'],['White','#e8e6e0'],['Cream','#efe3c6'],['Gold','#c9a24b'],['Silver','#b9b9b9'],['Brown','#6b4a2f'],['Oak','#b07a3c'],['Green','#2f6b4a'],['Red','#a33030'],['Blue','#034ea2']];
const hex=n=>(Object.fromEntries(PRE.map(([a,b])=>[a.toLowerCase(),b])))[String(n).trim().toLowerCase()]||'#c9c6bd';

/* ---- seed data ---- */
function seed(){
  const d=addDays,it=(time,type,flag,user,qty,item,length,cInName,cOutName,stock,cost,location)=>({time,type,flag,user,qty,item,length,cInName,cIn:hex(cInName),cOutName,cOut:hex(cOutName),stock,cost,location,supplier:/^ACET/.test(item)?'Smart Systems':'Ecoglass'});
  const P=(id,name,role,team,start,allow,salary)=>({id,name,role,team,phone:'07700 900 '+String(100+(+id.slice(2))*137%900),email:name.toLowerCase().replace(/[^a-z]+/g,'.')+'@broadland.example',start,allow,salary});
  return{
  items:[it('09:41','request',true,'M. Ahmed',7,'ACET848','4-5MM','Black','Gold',62,1.85,'Bay 3, Shelf B'),it('09:22','add',false,'James Robinson',3,'VG920 KL010','3M','Grey','Grey',118,.92,'Bay 1, Shelf A'),it('09:22','add',false,'James Robinson',3,'KL005','3M','Grey','Grey',74,.78,'Bay 1, Shelf C'),it('08:58','request',false,'S. Patel',3,'KL005','5MM','Gold','Black',74,.78,'Bay 1, Shelf C'),it('08:40','add',false,'Sarah Chen',12,'ACET848','4MM','Black','Black',62,1.85,'Bay 3, Shelf B'),it('08:15','remove',true,'James Robinson',2,'VG920','3M','Grey','Grey',9,.92,'Bay 1, Shelf A'),it('07:50','request',false,'L. Novak',5,'KL010','5MM','Gold','Gold',41,1.10,'Bay 2, Shelf A'),it('07:32','add',false,'Tom Baker',8,'KL005','3M','Grey','Grey',74,.78,'Bay 1, Shelf C'),it('Yesterday','request',true,'R. Osei',2,'ACET848','4MM','Black','Gold',62,1.85,'Bay 3, Shelf B')],
  leads:[{id:'1041',name:'Mrs J. Thompson',phone:'01603 555 014',town:'Wymondham',product:'Bifold doors, 4 panel',value:6850,source:'Website',stage:'Quoted',next:'Chase quote on Fri'},{id:'1042',name:'Mr D. Ellis',phone:'07700 900 231',town:'Norwich',product:'Garden room, 4m x 3m',value:21400,source:'Referral',stage:'Surveyed',next:'Send quote by Mon'},{id:'1043',name:'The Hargreaves',phone:'01493 555 882',town:'Great Yarmouth',product:'9 windows, white uPVC',value:7960,source:'Facebook',stage:'New',next:'Call to book survey'},{id:'1044',name:'Ms P. Okafor',phone:'07700 900 118',town:'Aylsham',product:'Composite front door',value:2150,source:'Phone',stage:'New',next:'Survey Tue 10am'},{id:'1045',name:'Mr & Mrs Green',phone:'01263 555 340',town:'Aylsham',product:'7 windows + front door',value:9420,source:'Showroom',stage:'Won',next:'Raise contract',contract:true},{id:'1046',name:'Mr K. Nowak',phone:'07700 900 457',town:'Dereham',product:'Sliding patio door',value:3890,source:'Website',stage:'Won',next:'Raise contract'},{id:'1047',name:'Mrs A. Rahman',phone:'01603 555 776',town:'Norwich',product:'Conservatory roof',value:11200,source:'Trade show',stage:'Quoted',next:'Follow up after finance'},{id:'1048',name:'Mr S. Bell',phone:'07700 900 664',town:'Thetford',product:'3 windows',value:1980,source:'Phone',stage:'Lost',next:'Went with cheaper quote'}],
  contracts:[{id:'2402318',name:'Mr & Mrs Green',town:'Aylsham',product:'7 windows + front door',value:9420,paid:2826,stage:'Fitting booked',fit:'2026-11-12',fitter:'Team A',notes:''},{id:'2402311',name:'Mr R. Hughes',town:'Norwich',product:'Bifold doors, 3 panel',value:5480,paid:5480,stage:'Fitted',fit:'2026-11-03',fitter:'Team B',notes:'Snagging visit needed'},{id:'2402305',name:'Mrs L. Fenn',town:'North Walsham',product:'Garden room, 3m x 3m',value:18900,paid:9450,stage:'Ordered',fit:'2026-11-26',fitter:'Team A',notes:'Base laid 19 Nov'},{id:'2402299',name:'Mr T. Abbott',town:'Cromer',product:'12 windows',value:11340,paid:3402,stage:'Survey done',fit:'',fitter:'Team B',notes:''},{id:'2402290',name:'Mrs C. Bright',town:'Diss',product:'French doors',value:2760,paid:0,stage:'Deposit due',fit:'',fitter:'Tom Baker',notes:''}],
  calls:[{id:'S-0871',name:'Mr R. Hughes',town:'Norwich',contract:'2402311',issue:'Bifold handle stiff, one panel rubbing',priority:'Normal',status:'Open',visit:'2026-11-09',fitter:'Tom Baker',notes:''},{id:'S-0870',name:'Mrs D. Palmer',town:'Holt',contract:'2402204',issue:'Misted unit, kitchen window',priority:'Low',status:'Booked',visit:'2026-11-11',fitter:'James Robinson',notes:'Replacement unit ordered'},{id:'S-0869',name:'Mr G. Lowe',town:'Sheringham',contract:'2402187',issue:'Water ingress below patio door',priority:'Urgent',status:'Open',visit:'',fitter:'Team A',notes:''},{id:'S-0866',name:'Ms H. Clarke',town:'Wymondham',contract:'2402150',issue:'Replace lost door key set',priority:'Low',status:'Complete',visit:'2026-10-30',fitter:'Tom Baker',notes:''}],
  contacts:[{id:'K-1',co:'Anglia Glass & Glazing',name:'Pete Marlow',role:'Account manager',type:'Supplier',phone:'01603 555 201',email:'pete@angliaglass.example',addr:'Norwich'},{id:'K-2',co:'Norfolk Aluminium Systems',name:'Dawn Kerrigan',role:'Sales office',type:'Supplier',phone:'01953 555 310',email:'orders@norfolkalu.example',addr:'Attleborough'},{id:'K-3',co:'Broads Timber & Frames',name:'Ian Cutler',role:'Director',type:'Supplier',phone:'01692 555 118',email:'ian@broadstimber.example',addr:'North Walsham'},{id:'K-4',co:'Baker Fitting Services',name:'Tom Baker',role:'Lead fitter',type:'Sub-contractor',phone:'07700 900 312',email:'tom@bakerfitting.example',addr:'Norwich'},{id:'K-5',co:'Fenland Groundworks',name:'Mark Spall',role:'Groundworks',type:'Trade',phone:'07700 900 845',email:'mark@fenlandgw.example',addr:'Dereham'}],
  deliveries:[{id:'D-1',supplier:'Anglia Glass & Glazing',items:'Sealed units x24',due:d(-1),status:'In transit',contract:'2402318'},{id:'D-2',supplier:'Norfolk Aluminium Systems',items:'Bifold frames x3',due:d(0),status:'Due',contract:'2402305'},{id:'D-3',supplier:'Broads Timber & Frames',items:'Garden room kit 3m x 3m',due:d(0),status:'In transit',contract:'2402305'},{id:'D-4',supplier:'Anglia Glass & Glazing',items:'Glass panels x12',due:d(2),status:'Due',contract:'2402299'},{id:'D-5',supplier:'Norfolk Aluminium Systems',items:'French doors x1',due:d(5),status:'Due',contract:'2402290'}],
  staff:[P('U-1','Bradley Bye','Director','','2012-04-02',33,62000),P('U-2','Tom Baker','Lead fitter','Team A','2016-09-12',28,34000),P('U-3','James Robinson','Fitter','Team B','2019-03-04',28,31000),P('U-4','Sarah Chen','Stock controller','','2020-06-15',28,29500),P('U-5','M. Ahmed','Production operative','','2021-01-11',28,27500),P('U-6','S. Patel','Production operative','','2022-05-03',28,27000),P('U-7','L. Novak','Production operative','','2023-02-20',28,26500),P('U-8','R. Osei','Production operative','','2024-08-05',28,26000)],
  hols:[{id:'H-1',sid:'U-2',from:'2026-11-23',to:'2026-11-27',days:5,status:'Approved'},{id:'H-2',sid:'U-3',from:'2026-12-21',to:'2026-12-31',days:7,status:'Pending'},{id:'H-3',sid:'U-4',from:'2026-08-03',to:'2026-08-14',days:10,status:'Approved'},{id:'H-4',sid:'U-5',from:'2026-12-24',to:'2026-12-24',days:1,status:'Pending'}],
  fin:[{id:'B-1',payee:'Anglia Glass & Glazing',type:'Supplier',ref:'INV-8841',job:'2402318',amount:1840,due:d(-3),status:'Unpaid'},{id:'B-2',payee:'Norfolk Aluminium Systems',type:'Supplier',ref:'INV-5520',job:'2402305',amount:2310,due:d(6),status:'Unpaid'},{id:'B-3',payee:'Broads Timber & Frames',type:'Supplier',ref:'INV-1207',job:'2402305',amount:6450,due:d(12),status:'Unpaid'},{id:'B-4',payee:'Fenland Groundworks',type:'Job cost',ref:'Garden room base',job:'2402305',amount:1200,due:d(2),status:'Unpaid'}]
}}

/* ---- load ---- */
let S;
(function load(){
  let raw=null;try{raw=localStorage.getItem(KEY)}catch(e){}
  if(raw){try{S=JSON.parse(raw)}catch(e){
    /* never silently throw data away: keep the unreadable copy */
    try{localStorage.setItem(KEY+'_unreadable_'+Date.now(),raw)}catch(x){}
    setTimeout(()=>toast('Saved data could not be read. A copy was kept and demo data loaded.'),1800)}}
  if(!S||typeof S!='object'||!Array.isArray(S.items))S=seed();
})();

/* ---- migrate older versions, fill gaps ---- */
function stkId(){return String(Math.max(0,...S.items.map(r=>/^\d{4}$/.test(r.pid)?+r.pid:0))+1).padStart(4,'0')}
const ikey=r=>[r.item,r.length,r.cInName,r.cOutName].map(v=>{v=String(v||'').trim().toLowerCase();return v=='-'?'':v}).join('|');
(function migrate(){
  const s0=seed();
  ['items','leads','contracts','calls','contacts','deliveries','staff','hols','fin'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=s0[k]});
  ['suppliers','orders','notes','audit'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=[]});
  S.pay=S.pay||{};S.seen=S.seen||{};S.dis=S.dis||{};S.seq=S.seq||{};
  if(!S.suppliers.length)S.suppliers=[{name:'Smart Systems',account:'BW-10442',terms:'30 days end of month',lead:10,contact:'Trade counter',phone:'01234 555 100',email:'orders@smart.example'},{name:'Ecoglass',account:'ECO-2291',terms:'Pro forma',lead:5,contact:'Sales office',phone:'01234 555 200',email:'sales@ecoglass.example'},{name:'Hallmark',hm:1,account:'8ACED097',terms:'30 days',url:'https://hallmarkpod.azurewebsites.net/cust/statusview?custid=8ACED097-5D20-47BB-8EE7-CBAAF9B4EA2D'}];
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
  /* profile: who is using this browser */
  if(!S.profile){const u=S.staff.find(s=>s.name=='Bradley Bye')||S.staff[0]||{};S.profile={sid:u.id||'',name:u.name||'Bradley Bye',email:u.email||'',phone:u.phone||'',mobile:'',emergency:'',signature:'',notes:''}}
  /* security: per-install salt and hashed PINs (default 1234 until changed) */
  S.sec=S.sec||{};S.sec.salt=S.sec.salt||uuid();
  S.sec.pins=S.sec.pins||{};
  ['admin','finance','sales','stock','fitter','beta'].forEach(r=>{if(!S.sec.pins[r])S.sec.pins[r]={h:pinHash(r,'1234'),def:1}});
})();
function pinHash(role,pin){return sha256(S.sec.salt+':'+role+':'+pin)}

/* ---- the signed-in person ---- */
Object.defineProperty(window,'USER',{get:()=>(S.profile&&S.profile.name)||'Unknown'});
const me=()=>S.staff.find(s=>s.id==S.profile.sid)||S.staff.find(s=>s.name==USER);

/* ---- save ---- */
let storeWarned=0;
function store(){
  try{const j=JSON.stringify(S);localStorage.setItem(KEY,j);
    if(j.length>4.2e6&&Date.now()-storeWarned>6e5){storeWarned=Date.now();toast('Browser storage is nearly full ('+kb(j.length)+'). Remove some photos or export a backup.')}
  }catch(e){toast('Browser storage is full. Remove some photos, then try again.')}}

/* ---- audit trail: who changed what, when ---- */
function audit(action,target,detail){
  S.audit.unshift({at:Date.now(),by:USER,role:ROLE,a:SAFE.text(action,60),t:SAFE.text(target,80),d:SAFE.text(detail,240)});
  if(S.audit.length>MAX_LOG)S.audit.length=MAX_LOG}

/* ---- cross-tab sync ---- */
window.addEventListener('storage',e=>{if(e.key==KEY&&e.newValue){try{const n=JSON.parse(e.newValue);if(n&&Array.isArray(n.items)){S=n;render()}}catch(x){}}});
