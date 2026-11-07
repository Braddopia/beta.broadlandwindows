/* ==========================================================================
   03 · Accounts: roles, PIN sign-in, idle lock, my details (profile)
   NOTE: this app runs entirely in the browser. These checks stop casual
   access and accidents; real protection of the data needs a server.
   ========================================================================== */
const FOCUS=['home','live','deliveries','stock','suppliers','downloads'];
const ROLES={
  admin:  {n:'Administrator',     d:'Everything a standard user has, plus staff and holidays',v:[...FOCUS,'leads','contracts','staff','holidays']},
  finance:{n:'Finance',           d:'Live analytics, inventory and files',v:FOCUS},
  sales:  {n:'Sales',             d:'Live analytics, inventory and files',v:FOCUS},
  stock:  {n:'Stock and warehouse',d:'Live analytics, inventory and files',v:FOCUS},
  fitter: {n:'Fitter',            d:'Live analytics, inventory and files',v:FOCUS},
  staff:  {n:'Standard user',     d:'Overview, leads, contracts, live analytics, inventory and files',v:[...FOCUS,'leads','contracts']},
  beta:   {n:'Beta (all features)',d:'Leads, contracts, finance, staff and everything else',v:'*'}};
const RL={admin:'Administrator',finance:'Finance',sales:'Sales',stock:'Stock And Warehouse',fitter:'Fitter',staff:'Team Member',beta:'Beta Access'};
const IDLE_MIN=30, PIN_TRIES=5, PIN_LOCK_S=60;

let ROLE='staff';
try{const r=sessionStorage.getItem('bb_role'),at=+sessionStorage.getItem('bb_role_at')||0;if(ROLES[r]&&(r=='staff'||Date.now()-at<IDLE_MIN*6e4))ROLE=r}catch(e){}

const canSee=k=>{const v=ROLES[ROLE].v;return v=='*'||v.includes(k)};
const ISADM=()=>['admin','finance','beta'].includes(ROLE);   /* money + approvals */
const ISOWN=()=>['admin','beta'].includes(ROLE);              /* people + settings */
const HOME=()=>canSee('home')?'home':'live';
/* guard for privileged actions: checked again inside the action, not just by hiding buttons */
function need(test,what){if(test())return true;toast((what||'That')+' needs an administrator account');return false}

/* ---- switching account ---- */
let pendView=null;
function swRole(){
  openModal(`<h2>Switch Account</h2><div class="rl">${Object.entries(ROLES).map(([k,r])=>`<button class="rb ${k==ROLE?'on':''}" ${A('pickRole',k)}><b>${esc(r.n)}</b><span>${esc(r.d)}</span></button>`).join('')}</div><div class="mact"><button class="btn ghost" onclick="closeModal()">Cancel</button></div>`)}
function pickRole(k){
  if(!ROLES[k])return;if(k=='staff'||k==ROLE){closeModal();setRole(k);return}
  openModal(`<h2>${esc(ROLES[k].n)} PIN</h2><div class="mf"><input id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="12" ${AC('onkeydown','pinKey','this')} data-r="${esc(k)}"><button class="btn" ${A('chkPin',k)}>Sign in</button></div><p class="muted" id="pinMsg" style="margin:0"></p><div class="mact"><button class="btn ghost" onclick="swRole()">Back</button></div>`,'sm');
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
setInterval(()=>{if(ROLE!='staff'&&!document.body.classList.contains('tv')&&Date.now()-lastAct>IDLE_MIN*6e4){const was=ROLES[ROLE].n;closeModal();setRole('staff');toast('Signed out of '+was+' after '+IDLE_MIN+' minutes idle')}},30000);

/* ---- PIN management (owner accounts) ---- */
function chPin(){
  if(!need(ISOWN,'Changing PINs'))return;
  openModal(`<h2>Account PINs</h2><p class="muted">PINs are stored as salted SHA-256 hashes. Use 4 to 12 digits.</p>${Object.entries(ROLES).filter(([k])=>k!='staff').map(([k,r])=>`<div class="row"><span><b>${esc(r.n)}</b><br><span class="muted">${S.sec.pins[k].def?'<span class="tag y">Default PIN</span>':'Custom PIN set'}</span></span><button class="mini pri" ${A('setPin',k)}>Change</button></div>`).join('')}<div class="mact"><button class="btn" onclick="closeModal()">Done</button></div>`)}
function setPin(k){
  if(!need(ISOWN,'Changing PINs'))return;
  form('New PIN: '+ROLES[k].n,[{k:'a',l:'New PIN',t:'password',req:1,max:12},{k:'b',l:'Repeat new PIN',t:'password',req:1,max:12}],{},o=>{
    if(!/^\d{4,12}$/.test(o.a)){toast('Use 4 to 12 digits');return false}
    if(o.a!==o.b){toast('The PINs do not match');return false}
    if(o.a=='1234'||/^(\d)\1+$/.test(o.a)){toast('Pick a PIN that is harder to guess');return false}
    S.sec.pins[k]={h:pinHash(k,o.a),def:0};audit('PIN changed',ROLES[k].n,'');setTimeout(chPin,50)})}

/* ---- my details: name, contact info. Job role, team, start date are admin-only ---- */
function editProfile(){
  const p=S.profile,m=me()||{},adm=ISOWN(),lk=t=>`<span class="lockd">${svg(IC.lock)}${t}</span>`;
  openModal(`<button class="mx" onclick="closeModal()" aria-label="Close">&times;</button><div class="pf"><span class="av2">${esc(initials(p.name))}</span><div><h2 style="margin:0">My Details</h2><span class="muted">${esc(ROLES[ROLE].n)} account</span></div></div>
  <div class="grid">
   <div class="ff"><label for="p_name">Display name *</label><input id="p_name" maxlength="60" value="${esc(p.name)}"></div>
   <div class="ff"><label for="p_email">Email</label><input id="p_email" type="email" maxlength="120" value="${esc(p.email||m.email||'')}"></div>
   <div class="ff"><label for="p_phone">Work phone</label><input id="p_phone" type="tel" maxlength="30" value="${esc(p.phone||m.phone||'')}"></div>
   <div class="ff"><label for="p_mobile">Mobile</label><input id="p_mobile" type="tel" maxlength="30" value="${esc(p.mobile||'')}"></div>
   <div class="ff full"><label for="p_emer">Emergency contact (name and number)</label><input id="p_emer" maxlength="120" value="${esc(p.emergency||'')}"></div>
   <div class="ff full"><label for="p_sig">Email signature / sign-off</label><textarea id="p_sig" rows="2" maxlength="400">${esc(p.signature||'')}</textarea></div>
   <div class="ff"><label for="p_role">Job role ${adm?'':lk('Admin only')}</label><input id="p_role" maxlength="60" value="${esc(m.role||'')}" ${adm?'':'readonly'}></div>
   <div class="ff"><label for="p_team">Team ${adm?'':lk('Admin only')}</label>${adm?`<select id="p_team">${['','Team A','Team B'].map(t=>`<option ${t==(m.team||'')?'selected':''} value="${esc(t)}">${esc(t||'None')}</option>`).join('')}</select>`:`<input id="p_team" readonly value="${esc(m.team||'None')}">`}</div>
   <div class="ff"><label for="p_start">Start date ${adm?'':lk('Admin only')}</label><input id="p_start" type="date" value="${esc(m.start||'')}" ${adm?'':'readonly'}></div>
   <div class="ff"><label for="p_allow">Holiday allowance ${adm?'':lk('Admin only')}</label><input id="p_allow" type="number" min="0" max="60" value="${esc(m.allow??'')}" ${adm?'':'readonly'}></div>
  </div>
  ${m.id?'':'<p class="warn">Your name is not linked to a staff record yet. An administrator can add you under Staff.</p>'}
  <div class="mact"><button class="btn ghost l" onclick="swRole()">${svg(IC.switch)}Switch account</button><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveProfile()">Save details</button></div>`,'md')}
function saveProfile(){
  const v=i=>SAFE.text(($('#'+i)||{}).value,i=='p_sig'?400:120),p=S.profile,m=me();
  const name=v('p_name');if(name.length<2){toast('Please enter your name');return}
  const em=v('p_email');if(em&&!SAFE.email(em)){toast('That email address does not look right');return}
  const old=p.name;Object.assign(p,{name,email:em,phone:v('p_phone'),mobile:v('p_mobile'),emergency:v('p_emer'),signature:v('p_sig')});
  if(m){p.sid=m.id;Object.assign(m,{name,email:em||m.email,phone:p.phone||m.phone});
    if(ISOWN()){m.role=v('p_role')||m.role;m.team=v('p_team')=='None'?'':v('p_team');m.start=SAFE.date(v('p_start'))||m.start;const al=SAFE.num(v('p_allow'),{max:60,dp:0});if(al!=null)m.allow=al}}
  if(old!=name){/* keep authored records pointing at the new name */S.items.forEach(r=>{if(r.user==old)r.user=name});(S.notes||[]).forEach(n=>{if(n.to==old)n.to=name;if(n.by==old)n.by=name})}
  audit('Profile updated',name,old!=name?'Renamed from '+old:'');store();closeModal();render();toast('Your details are saved')}
