/* ==========================================================================
   10 · Barcode scanner (camera via BarcodeDetector, ZXing fallback)
   Scanned codes are validated, de-duplicated and logged.
   ========================================================================== */
let scanCb=null,scanning=false,stream=null,reader=null,lastScan={c:'',t:0};
function loadZX(){return new Promise((ok,no)=>{if(window.ZXing)return ok();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';s.crossOrigin='anonymous';s.referrerPolicy='no-referrer';s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
async function scan(cb){
  scanCb=cb;$('#scanner').classList.add('open');$('#manual').value='';$('#scanMsg').textContent='Point the camera at a barcode.';
  if(!window.isSecureContext||!navigator.mediaDevices){$('#scanMsg').textContent='The camera needs a secure (https) connection. You can still type the code below.';return}
  const v=$('#vid');
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});v.srcObject=stream;await v.play()}
  catch(e){$('#scanMsg').textContent='Camera not available. Allow camera permission, or type the code below.';return}
  scanning=true;
  if('BarcodeDetector' in window){const d=new BarcodeDetector();const loop=async()=>{if(!scanning)return;try{const r=await d.detect(v);if(r.length)return got(r[0].rawValue)}catch(e){}setTimeout(loop,250)};loop()}
  else{try{await loadZX();stream.getTracks().forEach(t=>t.stop());stream=null;reader=new ZXing.BrowserMultiFormatReader();reader.decodeFromVideoDevice(null,'vid',r=>{if(r)got(r.getText())})}
    catch(e){$('#scanMsg').textContent='Scanner library could not load. Type the code below instead.'}}}
function stopScan(){scanning=false;try{reader&&reader.reset()}catch(e){}reader=null;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$('#scanner').classList.remove('open')}
function got(raw){
  const code=SAFE.code(raw);
  if(!code){$('#scanMsg').textContent='That code has characters we cannot use. Letters, numbers, spaces, dots, dashes and slashes only.';return}
  if(code==lastScan.c&&Date.now()-lastScan.t<1500)return;   /* ignore double reads */
  lastScan={c:code,t:Date.now()};stopScan();if(navigator.vibrate)navigator.vibrate(60);
  audit('Barcode scanned',code,'');store();scanCb&&scanCb(code)}
