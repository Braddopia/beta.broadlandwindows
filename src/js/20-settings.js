/* ==========================================================================
   20 · Settings: my settings (everyone) and company settings (administrators)
   Company details live in S.co and are copied over the CO defaults at start-up,
   so printed documents, invoices and VAT sums all use them.
   ========================================================================== */
const SET_CO=[{k:'name',l:'Company name',req:1,w:'full',max:120},{k:'tel',l:'Main phone',t:'tel',max:30},{k:'web',l:'Website',max:120},
  {k:'em',l:'Sales email',t:'email',max:120},{k:'em2',l:'Second email',t:'email',max:120},{k:'addr',l:'Address',w:'full',max:200},
  {k:'vatNo',l:'VAT number',max:30},{k:'coNo',l:'Company number',max:30},{k:'fensa',l:'FENSA number',max:30}];
const SET_MONEY=[{k:'vat',l:'VAT rate for new contracts (%)',t:'select',o:['20','5','0']},{k:'deposit',l:'Deposit asked for (% of contract)',t:'number',max:100,dp:0},
  {k:'terms',l:'Balance due (days after fitting)',t:'number',max:365,dp:0},{k:'invPrefix',l:'Invoice number starts with',max:12},
  {k:'bank',l:'Bank account name',max:80,w:'full'},{k:'sort',l:'Sort code',max:12},{k:'acct',l:'Account number',max:12}];
function coLoad(){S.co=S.co&&typeof S.co=='object'?S.co:{};Object.assign(CO,{vat:'20',deposit:25,terms:14,invPrefix:'INV-'},S.co)}
function coEdit(title,F){if(!need(ISOWN,'Company settings'))return;
  form(title,F,{...CO},o=>{Object.keys(o).forEach(k=>{if(typeof o[k]=='string')o[k]=SAFE.text(o[k],200)});
    S.co=Object.assign(S.co||{},o);Object.assign(CO,o);audit('Company settings changed',title,F.map(f=>f.l.replace(/ \(.*\)/,'')).join(', '));toast(title+' saved')})}
function motionSet(on){try{localStorage.setItem('bb_rm',on?'1':'')}catch(e){}document.body.classList.toggle('rm',!!on)}
(function(){try{if(localStorage.getItem('bb_rm'))document.body.classList.add('rm')}catch(e){}})();
function vSettings(){const own=ISOWN(),p=S.profile||{},dark=document.body.dataset.theme=='dark',rm=document.body.classList.contains('rm');
  const row=(t,s,act)=>`<div class="set-r"><span><b>${esc(t)}</b>${s?`<small>${s}</small>`:''}</span><span class="set-a">${act}</span></div>`;
  const dl=(F)=>`<dl class="set-dl">${F.map(f=>`<div><dt>${esc(f.l.replace(/ \(.*\)/,''))}</dt><dd class="${/em|web/.test(f.k)?'nocap':''}">${esc(String(CO[f.k]??''))||'<span class="muted">Not set</span>'}</dd></div>`).join('')}</dl>`;
  return `<div class="head"><h1>Settings</h1></div>
  <div class="set">
   <section class="panel set-c"><h2><span class="set-ic">${svg(IC.user)}</span><span>My Settings</span></h2>
    ${row('My Details',esc([p.name,p.phone||p.mobile].filter(Boolean).join(' · '))||'Name and phone','<button class="btn ghost sm" onclick="editProfile()">Edit</button>')}
    ${row('Light Or Dark','How the site looks for you',`<span class="seg"><button class="${dark?'':'on'}" ${A('setThR','light')}>Light</button><button class="${dark?'on':''}" ${A('setThR','dark')}>Dark</button></span>`)}
    ${row('Page Background And Greeting Box','Patterns and colours','<button class="btn ghost sm" onclick="lookPop(true)">Change</button>')}
    ${row('Fewer Animations','Turns off movement and glow effects',`<label class="tsw"><input type="checkbox" ${rm?'checked':''} ${AC('onchange','motionSet','this.checked')}><span></span></label>`)}
    ${row('Help Tour','A short guide to the site','<button class="btn ghost sm" onclick="startTour()">Start</button>')}
    ${row('Account','Signed in as '+esc(ROLES[ROLE].n),'<button class="btn ghost sm" onclick="swRole()">Switch</button>')}
   </section>
   ${own?`<section class="panel set-c"><h2><span class="set-ic">${svg(IC.contacts)}</span><span>Company Details</span><button class="btn sm" ${A('coEditK','co')}>Edit</button></h2>${dl(SET_CO)}<p class="muted set-n">Used on printed contracts, invoices and guarantees.</p></section>
   <section class="panel set-c"><h2><span class="set-ic">${svg(IC.finance)}</span><span>Money And Invoices</span><button class="btn sm" ${A('coEditK','money')}>Edit</button></h2>${dl(SET_MONEY)}</section>
   <section class="panel set-c"><h2><span class="set-ic">${svg(IC.admin)}</span><span>Security And Data</span></h2>
    ${row('Account PINs','Change the PIN for each account','<button class="btn ghost sm" onclick="chPin()">Change</button>')}
    ${row('Backup','Download everything as one file','<button class="btn ghost sm" onclick="backupDl()">Download</button>')}
    ${row('Restore','Load a backup file','<label class="btn ghost sm" style="cursor:pointer">Choose File<input type="file" accept=".json,application/json" hidden onchange="backupLoad(this)"></label>')}
    ${row('Review Scores','Google, Trustpilot, Trusted Trader, ReferenceLine','<button class="btn ghost sm" onclick="editRatings()">Update</button>')}
    ${row('Admin Console','Approvals, audit trail and more',`<button class="btn ghost sm" ${A('go','admin')}>Open</button>`)}
   </section>`:`<section class="panel set-c"><h2><span class="set-ic">${svg(IC.lock)}</span><span>Company Settings</span></h2><p class="muted">Company details, VAT and invoice settings are for administrators.</p><button class="btn ghost sm" onclick="swRole()">Switch Account</button></section>`}
  </div>`}
function coEditK(k){if(k=='co')coEdit('Company Details',SET_CO);else coEdit('Money And Invoices',SET_MONEY)}
function setThR(t){setTh(t);render(true)}
