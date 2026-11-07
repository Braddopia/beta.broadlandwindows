/* ==========================================================================
   16 · Illustrations, empty states and the welcome tour
   Pattern tiles in the chosen Look (see 18-looks.js), with line icons.
   ========================================================================== */
/* Empty lists and the tour use a pattern tile (in the chosen Look) with a line icon, instead of drawings. */
const ART_IC={van:IC.deliveries,survey:IC.edit,stock:IC.stock,holiday:IC.holidays,team:IC.staff,chart:IC.reports,done:'M5 13l4 4L19 7',files:IC.downloads};
const emptyArt=(k,txt)=>`<div class="emp">${ART_IC[k]?`<span class="pmed lkp">${svg(ART_IC[k])}</span>`:''}<p>${esc(txt)}</p></div>`;

/* ---------------- welcome tour ---------------- */
const TOUR=[{art:'team',t:'Welcome to Broadland Windows CRM',d:'A quick look round the main parts of the site. It takes about a minute, and you can skip it at any time.'},
  {sel:'#nav',t:'Your menu',d:'Every page you can use is here, grouped by job: sales, operations, stock and insights. What you see depends on your account.'},
  {sel:'#sb',t:'Search',d:'Type a name, postcode, item code or contract number to filter the page you are on. Press / on the keyboard to jump here.'},
  {sel:'#nwb',t:'Add something new',d:'Start a new lead, service call, contact or stock movement from any page.'},
  {sel:'#scanBtn',t:'Scan a barcode',d:'Use the camera to find a product or book stock in and out.'},
  {sel:'#bell',t:'Notifications',d:'Stock requests, low stock, deliveries due and FENSA reminders all land here.'},
  {sel:'#thb',t:'Light or dark',d:'Switch the look to suit the room. The factory screen works well in dark.'},
  {sel:'#lookBtn',t:'Change the look',d:'Pick the page background, and a pattern for the blue greeting box on the overview.'},
  {sel:'.hero-cz',page:'home',t:'Make the overview yours',d:'Choose which numbers and panels show on your dashboard, and in what order.'},
  {sel:'#meBtn',t:'Your details',d:'Update your phone and email, and check your holiday allowance.'},
  {sel:'#acct',t:'Switch account',d:'Sign in as an administrator with your PIN when you need more access. It signs you out again after 30 minutes idle.'},
  {art:'done',t:"You're all set",d:'Press the ? button at the top any time to see this tour again.'}];
let TI=0;
const tourTest=()=>{try{return localStorage.getItem('bb_tour_test')=='1'}catch(e){return false}};
function tourToggle(on){try{localStorage.setItem('bb_tour_test',on?'1':'0')}catch(e){}toast(on?'The tour will show every time the site opens':'The tour will only show once');const c=$('#tourTest');if(c)c.checked=on;render()}
function startTour(){if(view!='home'&&TOUR.some(s=>s.page=='home'))go('home');TI=0;let o=$('#tour');if(!o){o=document.createElement('div');o.id='tour';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');document.body.appendChild(o)}o.classList.add('open');setTimeout(tourDraw,60)}
function endTour(){const o=$('#tour');if(o)o.classList.remove('open');try{localStorage.setItem('bb_tour_seen','1')}catch(e){}}
function tourGo(d){TI=Math.max(0,Math.min(TOUR.length-1,TI+d));tourDraw()}
function tourDraw(){const o=$('#tour');if(!o)return;const s=TOUR[TI],el=s.sel&&$(s.sel),vis=el&&el.offsetParent!==null&&el.getBoundingClientRect().width>0,last=TI==TOUR.length-1;
  const r=vis?el.getBoundingClientRect():null,pad=8;
  o.innerHTML=`<div class="tspot ${vis?'':'none'}" style="${vis?`left:${r.left-pad}px;top:${r.top-pad}px;width:${r.width+pad*2}px;height:${r.height+pad*2}px`:''}"></div>
   <div class="tcard ${vis?'':'mid'}">${!vis&&s.art&&ART_IC[s.art]?`<div class="tban lkp">${svg(ART_IC[s.art])}</div>`:''}<small>${TI+1} of ${TOUR.length}</small><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p>
    <div class="tdots">${TOUR.map((_,i)=>`<i class="${i==TI?'on':''}"></i>`).join('')}</div>
    ${ISOWN()||ROLE=='beta'?`<label class="ttest"><input type="checkbox" id="tourTest" ${tourTest()?'checked':''} onchange="tourToggle(this.checked)"> Show every time (testing)</label>`:''}
    <div class="tbtn"><button class="btn ghost sm" onclick="endTour()">${last?'Close':'Skip tour'}</button><span></span>${TI?'<button class="btn ghost sm" onclick="tourGo(-1)">Back</button>':''}<button class="btn sm" onclick="${last?'endTour()':'tourGo(1)'}">${last?'Finish':'Next'}</button></div></div>`;
  const c=o.querySelector('.tcard');if(vis){const cw=c.offsetWidth,ch=c.offsetHeight;let top=r.bottom+16,left=r.left;if(top+ch>innerHeight-12)top=Math.max(12,r.top-ch-16);if(r.width<260&&r.left>innerWidth/2)left=r.right-cw;if(r.left<300&&r.height>innerHeight*.5){left=r.right+20;top=Math.max(12,Math.min(innerHeight-ch-12,r.top+40))}
    c.style.left=Math.max(12,Math.min(innerWidth-cw-12,left))+'px';c.style.top=top+'px'}
  const b=o.querySelector('.tbtn .btn:last-child');if(b)b.focus()}
document.addEventListener('keydown',e=>{const o=$('#tour');if(!o||!o.classList.contains('open'))return;if(e.key=='Escape')endTour();else if(e.key=='ArrowRight')tourGo(1);else if(e.key=='ArrowLeft')tourGo(-1)});
addEventListener('resize',()=>{const o=$('#tour');if(o&&o.classList.contains('open'))tourDraw()});
function tourBoot(){const b=document.createElement('button');b.className='ib';b.id='helpBtn';b.type='button';b.title='Show the tour';b.setAttribute('aria-label','Show the tour');b.innerHTML=svg('M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 100-20 10 10 0 000 20z');b.onclick=startTour;const t=$('#thb');if(t)t.before(b);
  let seen=false;try{seen=localStorage.getItem('bb_tour_seen')=='1'}catch(e){}if(tourTest()||!seen)setTimeout(startTour,1600)}
