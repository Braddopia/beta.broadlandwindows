/* ==========================================================================
   99 · Start-up
   ========================================================================== */
(function boot(){
  seedHM();
  render();tourBoot();
  document.body.classList.add('ready');setTimeout(()=>document.body.classList.remove('ready'),2000);
  setTimeout(()=>syncHM(true),1500);setInterval(()=>syncHM(true),600000);
})();

/* light tap feedback on touch phones: every button, chip, tab and row gives a short buzz (Android; iOS browsers ignore it) */
const HAPTIC={light:8,medium:14,heavy:24};
function haptic(k){try{if(matchMedia('(pointer:coarse)').matches&&navigator.vibrate)navigator.vibrate(HAPTIC[k]||HAPTIC.light)}catch(e){}}
document.addEventListener('click',e=>{const t=e.target.closest('button,a,.chip,.clk-r,.nav,[onclick],label,summary');if(!t)return;haptic(t.matches('.btn.green,.rb1.go,.btn.red,.del')?'medium':'light')},true);
