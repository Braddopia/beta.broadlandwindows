/* Loads the saved CRM data from the browser database (IndexedDB) before the app starts.
   IndexedDB holds hundreds of MB; the old localStorage store held about 5 MB. */
(function(){var ran=false;function run(){if(ran)return;ran=true;var s=document.createElement('script');s.textContent=document.getElementById('appjs').textContent;document.body.appendChild(s)}
  try{var r=indexedDB.open('bb_state',1);r.onupgradeneeded=function(){r.result.createObjectStore('s')};
    r.onsuccess=function(){try{var g=r.result.transaction('s','readonly').objectStore('s').get('broadland_crm_v1');g.onsuccess=function(){window.__BOOT=g.result||null;run()};g.onerror=run}catch(e){run()}};
    r.onerror=run;r.onblocked=run}catch(e){run()}
  setTimeout(run,2500)})();
