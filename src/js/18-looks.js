/* ==========================================================================
   18 · Looks: background pattern behind the glass, picked from the top bar
   Saved per browser (localStorage 'bb_look'). Styles live in css/07-looks.css.
   ========================================================================== */
const LOOKS=[['glow','Soft Glow'],['panes','Window Panes'],['leaded','Leaded Light'],['contour','Contour Lines'],['dots','Dot Grid'],['blueprint','Blueprint'],['aurora','Aurora']];
const lookNow=()=>{let k='glow';try{k=localStorage.getItem('bb_look')||'glow'}catch(e){}return LOOKS.some(l=>l[0]==k)?k:'glow'};
function setLook(k){if(!LOOKS.some(l=>l[0]==k))return;document.body.dataset.look=k;try{localStorage.setItem('bb_look',k)}catch(e){}
  $$('#lookPop .lkb').forEach(b=>{const on=b.dataset.k==k;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})}
function lookPop(open){let p=$('#lookPop');
  if(!p){p=document.createElement('div');p.id='lookPop';p.setAttribute('role','dialog');p.setAttribute('aria-label','Background');
    p.innerHTML=`<h3>Background</h3><p>The pattern behind the glass. Saved on this device.</p><div class="lkg">${LOOKS.map(([k,n])=>`<button type="button" class="lkb lk-${esc(k)}" data-k="${esc(k)}" ${A('setLook',k)}><i></i>${esc(n)}</button>`).join('')}</div>`;
    document.body.appendChild(p)}
  const show=open??!p.classList.contains('open');p.classList.toggle('open',show);
  if(show){setLook(lookNow());const r=$('#lookBtn').getBoundingClientRect(),w=p.offsetWidth;p.style.top=(r.bottom+8)+'px';p.style.left=Math.max(12,Math.min(innerWidth-w-12,r.right-w))+'px';const on=$('#lookPop .lkb.on');on&&on.focus()}}
(function looks(){
  document.body.dataset.look=lookNow();
  const b=document.createElement('button');b.className='ib';b.id='lookBtn';b.type='button';b.title='Background';b.setAttribute('aria-label','Background');
  b.innerHTML=svg('M12 3a9 9 0 100 18c1 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.5-.7-.5-1.1 0-1 .8-1.7 1.7-1.7H16a5 5 0 005-5c0-4-4-7.4-9-7.4zM7.5 11.5h.01M9.5 7.5h.01M14.5 7.5h.01M17 11h.01');
  b.onclick=e=>{e.stopPropagation();lookPop()};const t=$('#thb');if(t)t.before(b);
  document.addEventListener('click',e=>{const p=$('#lookPop');if(p&&p.classList.contains('open')&&!p.contains(e.target))lookPop(false)});
  document.addEventListener('keydown',e=>{if(e.key=='Escape'&&$('#lookPop.open')){lookPop(false);$('#lookBtn').focus()}});
  addEventListener('resize',()=>{if($('#lookPop.open'))lookPop(true)});
})();
