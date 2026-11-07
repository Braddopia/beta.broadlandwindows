/* Loads the saved CRM data from the browser database (IndexedDB) before the app starts.
   IndexedDB holds hundreds of MB; the old localStorage store held about 5 MB.
   If the database is slow to answer, the app starts anyway after a few seconds, but marks
   window.__BOOT_MISS so its first save checks it is not about to write over newer data.
   If the data turns up late and is newer than what the app started with, the page reloads. */
(function(){
  var ran=false,wait=4000;
  /* after a 'newer data turned up' reload, give the database much longer so the page cannot keep reloading */
  try{if(sessionStorage.getItem('bb_slow')){wait=60000;sessionStorage.removeItem('bb_slow')}}catch(e){}
  window.__bootReload=function(){try{sessionStorage.setItem('bb_slow','1')}catch(e){}location.reload()};
  function at(j){var m=/"_saved":(\d+)/.exec(typeof j=='string'?j.slice(-60):'');return m?+m[1]:0}
  function run(){if(ran)return;ran=true;var s=document.createElement('script');s.textContent=document.getElementById('appjs').textContent;document.body.appendChild(s)}
  function got(v){
    if(!ran){window.__BOOT=v||null;run();return}
    /* arrived after the timeout: reload only if it is newer than the copy the app is using */
    window.__BOOT_MISS=false;
    try{if(v&&at(v)>(window.__BOOT_AT||0))window.__bootReload()}catch(e){}
  }
  try{
    var r=indexedDB.open('bb_state',1);
    r.onupgradeneeded=function(){r.result.createObjectStore('s')};
    r.onsuccess=function(){var db=r.result;
      try{var g=db.transaction('s','readonly').objectStore('s').get('broadland_crm_v1');
        g.onsuccess=function(){got(g.result);db.close()};
        g.onerror=function(){db.close();run()}}
      catch(e){db.close();run()}};
    r.onerror=run;
    r.onblocked=function(){window.__BOOT_MISS=true;run()};
  }catch(e){run()}
  setTimeout(function(){if(!ran){window.__BOOT_MISS=true;run()}},wait);
})();
