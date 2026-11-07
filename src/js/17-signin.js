/* ==========================================================================
   17 · Staff sign-in with Google or Microsoft work accounts
   Off until an admin sets it up (Admin Console > Staff Sign-In).
   Only emails on the approved list (or the approved domain) get in, with the
   role an admin gave them. Note: with no server this identifies who is using
   the CRM; it cannot stop someone who edits the page in their own browser.
   ========================================================================== */
const MSAL_SRC='https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.38.3/lib/msal-browser.min.js',MSAL_SRI='sha384-OJTwghM0Gh3Zc+gmd6l0lz1pFw9KuHHq0mSEZgmQEKgMnuSWWDb3bU9KzuD7w2hU';
const SSO_HOURS=10;
window.SSO=null;
const authCfg=()=>S.auth=Object.assign({on:false,google:'',ms:'',tenant:'organizations',domain:'',autoStd:false,users:[]},S.auth||{});
function loadJs(src,sri){return new Promise((ok,no)=>{if([...document.scripts].some(s=>s.src==src))return ok();const s=document.createElement('script');s.src=src;s.async=true;if(sri){s.integrity=sri;s.crossOrigin='anonymous'}s.referrerPolicy='no-referrer';s.onload=ok;s.onerror=()=>no(new Error('Could not load '+src));document.head.appendChild(s)})}
const b64u=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return decodeURIComponent(atob(s).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''))};

/* ---- the sign-in screen ---- */
function gateShow(msg){let g=$('#gate');if(!g){g=document.createElement('div');g.id='gate';g.setAttribute('role','dialog');g.setAttribute('aria-modal','true');document.body.appendChild(g)}
  const A_=authCfg();document.body.classList.add('gated');
  g.innerHTML=`<div class="gate-c"><img src="${LOGO_SRC.full}" alt="Broadland Windows" class="gate-lg"><h1>Sign in</h1><p class="muted">Use your work Google or Microsoft account.</p>
   <div id="gateMsg" class="gate-m ${msg?'on':''}">${esc(msg||'')}</div>
   <div class="gate-b">${A_.google?'<div id="gbtn" class="gbtn"></div>':''}${A_.ms?`<button class="btn ms" onclick="ssoMs()">${svg('M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z')} Sign in with Microsoft</button>`:''}</div>
   <button class="gate-pin" onclick="gatePin()">Administrator? Use your PIN</button></div>`;
  if(A_.google)loadJs('https://accounts.google.com/gsi/client').then(()=>{google.accounts.id.initialize({client_id:A_.google,callback:r=>ssoGoogle(r.credential),ux_mode:'popup',auto_select:false,itp_support:true});google.accounts.id.renderButton($('#gbtn'),{theme:'outline',size:'large',shape:'pill',text:'signin_with',width:280})}).catch(()=>gateMsg('Google sign-in could not load. Check the internet connection.'))}
function gateMsg(m){const e=$('#gateMsg');if(e){e.textContent=m;e.classList.toggle('on',!!m)}}
function gateHide(){const g=$('#gate');if(g)g.remove();document.body.classList.remove('gated')}

/* ---- Google: check the signed token says it is for us, from Google, still in date, with a verified email ---- */
function ssoGoogle(jwt){try{const c=JSON.parse(b64u(String(jwt).split('.')[1]||'')),A_=authCfg();
    if(c.aud!==A_.google||!['accounts.google.com','https://accounts.google.com'].includes(c.iss)||!(c.exp*1000>Date.now())||!c.email_verified){gateMsg('That Google sign-in could not be checked. Please try again.');return}
    ssoAccept(c.email,c.name||'','Google')}catch(e){gateMsg('That Google sign-in could not be read. Please try again.')}}
/* ---- Microsoft: sign in through a Microsoft popup ---- */
let MSAPP=null;
async function ssoMs(){const A_=authCfg();gateMsg('');try{await loadJs(MSAL_SRC,MSAL_SRI);
    if(!MSAPP){MSAPP=new msal.PublicClientApplication({auth:{clientId:A_.ms,authority:'https://login.microsoftonline.com/'+encodeURIComponent(A_.tenant||'organizations'),redirectUri:location.origin+location.pathname},cache:{cacheLocation:'sessionStorage'}});if(MSAPP.initialize)await MSAPP.initialize()}
    const r=await MSAPP.loginPopup({scopes:['openid','profile','email'],prompt:'select_account'}),c=r.idTokenClaims||{};
    ssoAccept(c.email||c.preferred_username||(r.account&&r.account.username)||'',c.name||'','Microsoft')}catch(e){gateMsg(/popup/i.test(e&&e.message||'')?'Allow pop-ups for this site, then try again.':'Microsoft sign-in did not finish. Please try again.')}}

/* ---- is this person allowed in, and as what? ---- */
function ssoAccept(email,name,via){const A_=authCfg(),e=String(email||'').trim().toLowerCase();if(!SAFE.email(e)){gateMsg('No email came back from '+via+'.');return}
  let u=A_.users.find(x=>x.email==e);const dom=(A_.domain||'').toLowerCase().replace(/^@/,'');
  if(!u&&dom&&A_.autoStd&&e.endsWith('@'+dom))u={email:e,role:'staff',sid:''};
  if(!u){audit('Sign-in refused',e,via);store();gateMsg(e+' is not on the approved list. Ask an administrator to add you.');return}
  const st=S.staff.find(s=>s.id==u.sid),nm=st?st.name:SAFE.text(name,80)||e.split('@')[0];
  window.SSO={email:e,name:nm,sid:st?st.id:'',role:ROLES[u.role]?u.role:'staff',via,exp:Date.now()+SSO_HOURS*36e5};
  try{sessionStorage.setItem('bb_sso',JSON.stringify(SSO))}catch(x){}
  ROLE=SSO.role;try{sessionStorage.setItem('bb_role',ROLE);sessionStorage.setItem('bb_role_at',Date.now())}catch(x){}
  audit('Signed in',nm,via+' · '+e);store();gateHide();render();toast('Signed in as '+nm)}
function ssoOut(msg){if(window.SSO)audit('Signed out',SSO.name,msg||'');window.SSO=null;try{sessionStorage.removeItem('bb_sso')}catch(e){}ROLE='staff';try{sessionStorage.setItem('bb_role','staff')}catch(e){}
  try{google.accounts.id.disableAutoSelect()}catch(e){}store();closeModal();gateShow(msg||'You are signed out.')}
/* admins can always get in with their PIN, so a set-up mistake can't lock everyone out */
function gatePin(){const g=$('#gate');if(g)g.style.display='none';pickRole('admin');const t=setInterval(()=>{if(!$('#modal.open')){clearInterval(t);if(ISOWN()){window.SSO={email:'',name:USER,sid:'',role:ROLE,via:'PIN',exp:Date.now()+SSO_HOURS*36e5};try{sessionStorage.setItem('bb_sso',JSON.stringify(SSO))}catch(e){}gateHide();render()}else if(g)g.style.display=''}},400)}
function ssoBoot(){const A_=authCfg();if(!A_.on)return;let s=null;try{s=JSON.parse(sessionStorage.getItem('bb_sso')||'null')}catch(e){}
  if(s&&s.exp>Date.now()&&(s.via=='PIN'||A_.users.some(u=>u.email==s.email)||(A_.autoStd&&A_.domain&&s.email.endsWith('@'+A_.domain.replace(/^@/,''))))){window.SSO=s;ROLE=ROLES[s.role]?s.role:'staff';return}
  try{sessionStorage.removeItem('bb_sso')}catch(e){}gateShow()}
setInterval(()=>{if(window.SSO&&(SSO.exp<Date.now()||Date.now()-lastAct>IDLE_MIN*6e4))ssoOut('Signed out after '+IDLE_MIN+' minutes without use.')},30000);

/* ---- admin set-up ---- */
function authPanel(){const A_=authCfg();return `<div class="panel"><h2><span>Staff Sign-In</span><span class="tag ${A_.on?'g':''}">${A_.on?'On':'Off'}</span></h2><p class="muted" style="font-size:.84rem;margin:.2rem 0 .7rem">Staff sign in with their work Google or Microsoft account. ${A_.users.length} approved email${A_.users.length==1?'':'s'}${A_.domain?', domain '+esc(A_.domain):''}.${A_.google?' Google set up.':''}${A_.ms?' Microsoft set up.':''}</p><button class="btn ghost sm" onclick="authEdit()">Set up sign-in</button></div>`}
let AZD=null;
function authEdit(){if(!need(ISOWN,'Setting up sign-in'))return;AZD=JSON.parse(JSON.stringify(authCfg()));authDraw()}
function authDraw(){const d=AZD,st=['',...S.staff.map(s=>s.id)];
  openModal(`<button class="mx" onclick="closeModal()" aria-label="Close">&times;</button><h2>Staff Sign-In</h2><p class="muted">Get the client IDs from Google Cloud (OAuth client, Web application) and Microsoft Entra (App registration, single-page app). Add this site's address as an allowed origin / redirect: <b class="nocap">${esc(location.origin+location.pathname)}</b></p>
   <div class="grid"><div class="ff w"><label for="az_g">Google client ID</label><input id="az_g" class="nocap" maxlength="200" value="${esc(d.google)}" placeholder="....apps.googleusercontent.com"></div>
    <div class="ff"><label for="az_m">Microsoft client (application) ID</label><input id="az_m" class="nocap" maxlength="80" value="${esc(d.ms)}"></div><div class="ff"><label for="az_t">Microsoft tenant</label><input id="az_t" class="nocap" maxlength="80" value="${esc(d.tenant)}"><span class="hint">Your tenant ID or domain, or "organizations"</span></div>
    <div class="ff"><label for="az_d">Company email domain</label><input id="az_d" class="nocap" maxlength="80" value="${esc(d.domain)}" placeholder="example.co.uk"></div><div class="ff"><label class="tsw" style="margin-top:1.6rem"><input type="checkbox" id="az_a" ${d.autoStd?'checked':''}><span>Anyone on this domain can sign in as Standard</span></label></div></div>
   <h3 style="margin:1rem 0 .4rem">Approved People</h3><div class="azu">${d.users.map((u,i)=>`<div class="azr"><input class="nocap" value="${esc(u.email)}" maxlength="120" ${AC('onchange','azSet',i,'email','this.value')} aria-label="Email"><select ${AC('onchange','azSet',i,'sid','this.value')} aria-label="Staff member">${st.map(s=>`<option value="${esc(s)}" ${s==u.sid?'selected':''}>${s?esc(staffName(s)):'Not linked'}</option>`).join('')}</select><select ${AC('onchange','azSet',i,'role','this.value')} aria-label="Account">${Object.keys(ROLES).map(r=>`<option value="${r}" ${r==u.role?'selected':''}>${esc(ROLES[r].n)}</option>`).join('')}</select><button class="mini del" ${A('azDel',i)} aria-label="Remove">&times;</button></div>`).join('')||'<p class="muted">Nobody added yet.</p>'}</div><button class="mini pri" onclick="azAdd()">+ Add person</button>
   <div class="mact"><label class="tsw l"><input type="checkbox" id="az_on" ${d.on?'checked':''}><span>Sign-in required</span></label><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="azSave()">Save</button></div>`,'lg')}
function azRead(){const v=i=>SAFE.text(($('#'+i)||{}).value,200);AZD.google=v('az_g');AZD.ms=v('az_m');AZD.tenant=v('az_t')||'organizations';AZD.domain=v('az_d').toLowerCase().replace(/^@/,'');AZD.autoStd=!!($('#az_a')||{}).checked;AZD.on=!!($('#az_on')||{}).checked}
function azSet(i,k,val){const u=AZD.users[i];if(!u)return;u[k]=k=='email'?SAFE.text(val,120).trim().toLowerCase():k=='role'?(ROLES[val]?val:'staff'):SAFE.text(val,40)}
function azAdd(){azRead();AZD.users.push({email:'',sid:'',role:'staff'});authDraw()}
function azDel(i){azRead();AZD.users.splice(i,1);authDraw()}
function azSave(){if(!need(ISOWN,'Setting up sign-in'))return;azRead();const d=AZD;d.users=d.users.filter(u=>u.email);
  const bad=d.users.find(u=>!SAFE.email(u.email));if(bad){toast(bad.email+' is not an email address');return}
  if(new Set(d.users.map(u=>u.email)).size!=d.users.length){toast('Each email can only be listed once');return}
  if(d.google&&!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(d.google)){toast('The Google client ID should end in .apps.googleusercontent.com');return}
  if(d.ms&&!/^[0-9a-f-]{36}$/i.test(d.ms)){toast('The Microsoft client ID looks like 00000000-0000-0000-0000-000000000000');return}
  if(d.on&&!d.google&&!d.ms){toast('Add a Google or Microsoft client ID before turning sign-in on');return}
  if(d.on&&!d.users.some(u=>['admin','beta'].includes(u.role))){toast('Add at least one administrator before turning sign-in on');return}
  const wasOn=authCfg().on;S.auth=d;audit('Sign-in settings changed',d.on?'On':'Off',d.users.length+' approved');store();closeModal();render();toast(d.on&&!wasOn?'Sign-in is on. It will ask everyone to sign in next time they open the CRM.':'Saved')}
