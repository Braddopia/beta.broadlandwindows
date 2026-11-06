/* ==========================================================================
   99 · Start-up
   ========================================================================== */
(function boot(){
  seedHM();
  render();
  document.body.classList.add('ready');setTimeout(()=>document.body.classList.remove('ready'),2000);
  setTimeout(()=>syncHM(true),1500);setInterval(()=>syncHM(true),600000);
})();
