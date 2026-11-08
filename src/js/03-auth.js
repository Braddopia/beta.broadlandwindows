/* ==========================================================================
   03 · Accounts: roles, PIN sign-in, idle lock, my details (profile)
   NOTE: this app runs entirely in the browser. These checks stop casual
   access and accidents; real protection of the data needs a server.
   ========================================================================== */
const FOCUS=['home','messages','live','deliveries','stock','suppliers','downloads','settings'];
const ROLES={
  admin:  {n:'Administrator',     d:'Everything a standard user has, plus staff, holidays, reports and the admin console',v:[...FOCUS,'leads','contracts','fitting','service','contacts','staff','holidays','reports','admin']},
  staff:  {n:'Standard user',     d:'Overview, leads, contracts, calendar, service calls, contacts, live analytics, inventory and files',v:[...FOCUS,'leads','contracts','fitting','service','contacts']},
  beta:   {n:'Beta (all features)',d:'Leads, contracts, finance, staff and everything else',v:'*'}};
const RL={admin:'Administrator',staff:'Team Member',beta:'Beta Access'};
const IDLE_MIN=30, PIN_TRIES=5, PIN_LOCK_S=60;

let ROLE='staff';
try{const r=sessionStorage.getItem('bb_role'),at=+sessionStorage.getItem('bb_role_at')||0;if(ROLES[r]&&(r=='staff'||Date.now()-at<IDLE_MIN*6e4))ROLE=r}catch(e){}

const canSee=k=>{const v=ROLES[ROLE].v;return v=='*'||v.includes(k)};
const ISADM=()=>['admin','beta'].includes(ROLE);   /* money + approvals */
const ISOWN=()=>['admin','beta'].includes(ROLE);              /* people + settings */
const HOME=()=>canSee('home')?'home':'live';
/* guard for privileged actions: checked again inside the action, not just by hiding buttons */
function need(test,what){if(test())return true;toast((what||'That')+' needs an administrator account');return false}

/* ---- switching account ---- */
let pendView=null;
function swRole(){
  openModal(`<h2>Switch Account</h2><div class="rl">${Object.entries(ROLES).map(([k,r])=>`<button class="rb ${k==ROLE?'on':''}" ${A('pickRole',k)}><b>${esc(r.n)}</b><span>${esc(r.d)}</span></button>`).join('')}</div><div class="mact">${window.SSO?`<button class="btn ghost l" style="color:var(--red)" data-act="ssoOut">Sign out ${esc(SSO.email||USER)}</button>`:''}<button class="btn ghost" data-act="closeModal">Cancel</button></div>`)}
function pickRole(k){
  if(!ROLES[k])return;if(k=='staff'||k==ROLE){closeModal();setRole(k);return}
  openModal(`<h2>${esc(ROLES[k].n)} PIN</h2><div class="mf"><input id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="12" ${AC('onkeydown','pinKey','this')} data-r="${esc(k)}"><button class="btn" ${A('chkPin',k)}>Sign in</button></div><p class="muted" id="pinMsg" style="margin:0"></p><div class="mact"><button class="btn ghost" data-act="swRole">Back</button></div>`,'sm');
  setTimeout(()=>{const e=$('#pin');e&&e.focus()},50)}
function pinKey(el){if(event.key=='Enter')chkPin(el.dataset.r)}
function pinState(){try{return JSON.parse(sessionStorage.getItem('bb_pin'))||{n:0,until:0}}catch(e){return{n:0,until:0}}}
function chkPin(k){
  const st=pinState(),wait=Math.ceil((st.until-Date.now())/1000);
  if(wait>0){$('#pinMsg').textContent='Too many wrong PINs. Try again in '+wait+' seconds.';return}
  const v=$('#pin').value;
  if(S.sec.pins[k]&&pinHash(k,v)===S.sec.pins[k].h){try{sessionStorage.removeItem('bb_pin')}catch(e){}closeModal();setRole(k);audit('Signed in',ROLES[k].n,'');store();
    if(S.sec.pins[k].def&&ISOWN())setTimeout(()=>toast('This account still uses the default PIN. Change it in Admin console.'),800);return}
  st.n++;if(st.n>=PIN_TRIES){st.until=Date.now()+PIN_LOCK_S*1000;st.n=0;audit('PIN locked',ROLES[k].n,PIN_TRIES+' wrong attempts');store()}
  try{sessionStorage.setItem('bb_pin',JSON.stringify(st))}catch(e){}
  $('#pin').value='';$('#pinMsg').textContent=st.until>Date.now()?'Locked for '+PIN_LOCK_S+' seconds.':'Wrong PIN, '+(PIN_TRIES-st.n)+' tries left.'}
function setRole(r){
  ROLE=r;try{sessionStorage.setItem('bb_role',r);sessionStorage.setItem('bb_role_at',Date.now())}catch(e){}
  if(pendView&&canSee(pendView)&&(pendView!='admin'||ISOWN()))view=pendView;pendView=null;
  if(!canSee(view)||(view=='admin'&&!ISOWN()))view=HOME();
  render();toast('Signed in as '+ROLES[r].n)}

/* ---- idle timeout: privileged accounts drop back to Standard user ---- */
let lastAct=Date.now();
['pointerdown','keydown','wheel','touchstart'].forEach(t=>addEventListener(t,()=>{lastAct=Date.now();if(ROLE!='staff'){try{sessionStorage.setItem('bb_role_at',Date.now())}catch(e){}}},{passive:true}));
setInterval(()=>{if(!window.SSO&&ROLE!='staff'&&!document.body.classList.contains('tv')&&Date.now()-lastAct>IDLE_MIN*6e4){const was=ROLES[ROLE].n;closeModal();setRole('staff');toast('Signed out of '+was+' after '+IDLE_MIN+' minutes idle')}},30000);

/* ---- PIN management (owner accounts) ---- */
function chPin(){
  if(!need(ISOWN,'Changing PINs'))return;
  openModal(`<h2>Account PINs</h2><p class="muted">PINs are stored as salted SHA-256 hashes. Use 4 to 12 digits.</p>${Object.entries(ROLES).filter(([k])=>k!='staff').map(([k,r])=>`<div class="row"><span><b>${esc(r.n)}</b><br><span class="muted">${S.sec.pins[k].def?'<span class="tag y">Default PIN</span>':'Custom PIN set'}</span></span><button class="mini pri" ${A('setPin',k)}>Change</button></div>`).join('')}<div class="mact"><button class="btn" data-act="closeModal">Done</button></div>`)}
function setPin(k){
  if(!need(ISOWN,'Changing PINs'))return;
  form('New PIN: '+ROLES[k].n,[{k:'a',l:'New PIN',t:'password',req:1,max:12},{k:'b',l:'Repeat new PIN',t:'password',req:1,max:12}],{},o=>{
    if(!/^\d{4,12}$/.test(o.a)){toast('Use 4 to 12 digits');return false}
    if(o.a!==o.b){toast('The PINs do not match');return false}
    if(o.a=='1234'||/^(\d)\1+$/.test(o.a)){toast('Pick a PIN that is harder to guess');return false}
    S.sec.pins[k]={h:pinHash(k,o.a),def:0};audit('PIN changed',ROLES[k].n,'');setTimeout(chPin,50)})}

/* ---- my details: name, contact info. Job role, team, start date are admin-only ---- */
function editProfile(){
  const p=S.profile,m=me()||{},adm=ISOWN(),lk=t=>MARK(0,1);
  openModal(`<button class="mx" data-act="closeModal" aria-label="Close">&times;</button><div class="pf"><span class="av2">${esc(initials(p.name))}</span><div><h2 style="margin:0">My Details</h2><span class="muted">${esc(ROLES[ROLE].n)} account</span></div></div>
  <div class="grid">
   <div class="ff"><label for="p_name">Display name *</label><input id="p_name" maxlength="60" value="${esc(p.name)}"></div>
   <div class="ff"><label for="p_email">Email${MARK(1)}</label><input id="p_email" class="nocap" type="email" maxlength="120" value="${esc((window.SSO&&SSO.email)||p.email||m.email||'')}" ${window.SSO&&SSO.email?'readonly':''}>${window.SSO&&SSO.email?'<span class="hint">From your Microsoft 365 sign-in</span>':'<span class="hint">Fills in by itself once you sign in with Microsoft 365</span>'}</div>
   <div class="ff"><label for="p_phone">Work phone${MARK(1)}</label><input id="p_phone" type="tel" maxlength="30" value="${esc(p.phone||m.phone||CO.tel||'01603 483002')}"></div>
   <div class="ff"><label for="p_mobile">Mobile</label><input id="p_mobile" type="tel" maxlength="30" value="${esc(p.mobile||'')}"></div>
   <div class="ff full"><label for="p_en">Emergency contacts</label><select id="p_en" data-onchange="emerDraw">${[0,1,2,3].map(n=>`<option value="${n}" ${n==emerList(p).length?'selected':''}>${n?n+' '+(n==1?'person':'people'):'None yet'}</option>`).join('')}</select></div>
   <div class="ff full" id="p_emer">${emerRows(emerList(p))}</div>
   <div class="ff full"><label for="p_sig">Email signature / sign-off</label><textarea id="p_sig" rows="2" maxlength="400">${esc(p.signature||'')}</textarea></div>
   <div class="ff"><label for="p_role">Job role ${adm?'':lk('Admin only')}</label><input id="p_role" maxlength="60" value="${esc(m.role||'')}" ${adm?'':'readonly'}></div>
   <div class="ff"><label for="p_team">Team ${adm?'':lk('Admin only')}</label>${adm?`<select id="p_team">${['','Team A','Team B'].map(t=>`<option ${t==(m.team||'')?'selected':''} value="${esc(t)}">${esc(t||'None')}</option>`).join('')}</select>`:`<input id="p_team" readonly value="${esc(m.team||'None')}">`}</div>
   <div class="ff"><label for="p_start">Start date ${adm?'':lk('Admin only')}</label><input id="p_start" type="date" value="${esc(m.start||'')}" ${adm?'':'readonly'}></div>
   <div class="ff"><label for="p_allow">Holiday allowance ${adm?'':lk('Admin only')}</label><input id="p_allow" type="number" min="0" max="60" value="${esc(m.allow??'')}" ${adm?'':'readonly'}></div>
  </div>
  ${m.id?'':'<p class="warn">Your name is not linked to a staff record yet. An administrator can add you under Staff.</p>'}
  <div class="mact"><button class="btn ghost l" data-act="swRole">${svg(IC.switch)}Switch account</button><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn" data-act="saveProfile">Save details</button></div>`,'md')}
/* emergency contacts: up to three people, each with a name, how they know you and a number */
const emerList=p=>Array.isArray(p.emer)?p.emer.slice(0,3):p.emergency?[{n:p.emergency,r:'',t:''}]:[];
const emerRows=L=>L.map((e,i)=>`<div class="emr"><b>Person ${i+1}</b><input id="pe_n${i}" maxlength="60" placeholder="Name" aria-label="Name" value="${esc(e.n||'')}"><input id="pe_r${i}" maxlength="40" placeholder="Relationship, e.g. partner" aria-label="Relationship" value="${esc(e.r||'')}"><input id="pe_t${i}" type="tel" maxlength="30" placeholder="Phone number" aria-label="Phone number" value="${esc(e.t||'')}"></div>`).join('');
function emerRead(){const n=+(($('#p_en')||{}).value||0),o=[];for(let i=0;i<n;i++){const g=k=>SAFE.text(($('#pe_'+k+i)||{}).value,60);o.push({n:g('n'),r:g('r'),t:g('t')})}return o}
function emerDraw(){const n=+$('#p_en').value,cur=emerRead().concat([{},{},{}]).slice(0,n);$('#p_emer').innerHTML=emerRows(cur);const f=$('#pe_n'+(n-1));if(f&&!f.value)f.focus()}
function saveProfile(){
  const v=i=>SAFE.text(($('#'+i)||{}).value,i=='p_sig'?400:120),p=S.profile,m=me();
  const name=v('p_name');if(name.length<2){toast('Please enter your name');return}
  const em=(window.SSO&&SSO.email)||v('p_email'),bad=(id,m)=>{const e=$('#'+id);if(e)fieldErr(e,m);else toast(m)};if(!em){bad('p_email','Enter your work email');return}if(!SAFE.email(em)){bad('p_email','That email address does not look right');return}
  const ph=v('p_phone');if(!ph){bad('p_phone','Enter your work phone');return}
  const E=emerRead();for(let i=0;i<E.length;i++){if(!E[i].n){bad('pe_n'+i,'Enter the name of person '+(i+1));return}if(!E[i].t){bad('pe_t'+i,'Enter a phone number for '+E[i].n);return}}
  const old=p.name;Object.assign(p,{name,email:em,phone:ph,mobile:v('p_mobile'),emer:E,emergency:E.map(x=>[x.n,x.r?'('+x.r+')':'',x.t].filter(Boolean).join(' ')).join('; '),signature:v('p_sig')});
  if(m){p.sid=m.id;Object.assign(m,{name,email:em||m.email,phone:p.phone||m.phone});
    if(ISOWN()){m.role=v('p_role')||m.role;m.team=v('p_team')=='None'?'':v('p_team');m.start=SAFE.date(v('p_start'))||m.start;const al=SAFE.num(v('p_allow'),{max:60,dp:0});if(al!=null)m.allow=al}}
  if(old!=name)renamePerson(old,name);
  audit('Profile updated',name,old!=name?'Renamed from '+old:'');store();render();doneIn('Your details are saved')}
