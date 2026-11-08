/* features/scanner/scanner: The barcode scanner. */
import { $ } from '../../core/dom.js';
import { SAFE } from '../../data/sanitize.js';
import { audit } from '../../data/audit.js';
import { store } from '../../data/persistence.js';

/* ==========================================================================
   10 · Barcode scanner (camera via BarcodeDetector, ZXing fallback)
   Scanned codes are validated, de-duplicated and logged.
   ========================================================================== */
export let scanCb = null,
  scanning = false,
  stream = null,
  reader = null,
  lastScan = { c: '', t: 0 };
export function loadZX() {
  return new Promise((ok, no) => {
    if (window.ZXing) return ok();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
    s.integrity = 'sha384-BzBxP10ZE72aitqj5UMmUsbKFliP/DZqA8Wq+BNNhlIJDGoEd1tpkMYXOg9+n6sB';
    s.crossOrigin = 'anonymous';
    s.referrerPolicy = 'no-referrer';
    s.onload = ok;
    s.onerror = no;
    document.head.appendChild(s);
  });
}
export async function scan(cb) {
  scanCb = cb;
  $('#scanner').classList.add('open');
  $('#manual').value = '';
  $('#scanMsg').textContent = 'Point the camera at a barcode.';
  if (!window.isSecureContext || !navigator.mediaDevices) {
    $('#scanMsg').textContent = 'The camera needs a secure (https) connection. You can still type the code below.';
    return;
  }
  const v = $('#vid');
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    v.srcObject = stream;
    await v.play();
    if (!$('#scanner').classList.contains('open')) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
      return;
    }
  } catch (e) {
    $('#scanMsg').textContent = 'Camera not available. Allow camera permission, or type the code below.';
    return;
  }
  scanning = true;
  if ('BarcodeDetector' in window) {
    const d = new BarcodeDetector();
    const loop = async () => {
      if (!scanning) return;
      try {
        const r = await d.detect(v);
        if (r.length) {
          got(r[0].rawValue);
          if (!scanning) return;
        }
      } catch (e) {}
      setTimeout(loop, 250);
    };
    loop();
  } else {
    try {
      await loadZX();
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
      reader = new ZXing.BrowserMultiFormatReader();
      reader.decodeFromVideoDevice(null, 'vid', (r) => {
        if (r) got(r.getText());
      });
    } catch (e) {
      $('#scanMsg').textContent = 'Scanner library could not load. Type the code below instead.';
    }
  }
}
export function stopScan() {
  scanning = false;
  try {
    reader && reader.reset();
  } catch (e) {}
  reader = null;
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  $('#scanner').classList.remove('open');
}
export function got(raw) {
  const code = SAFE.code(raw);
  if (!code) {
    $('#scanMsg').textContent =
      'That code has characters we cannot use. Letters, numbers, spaces, dots, dashes and slashes only.';
    return;
  }
  if (code == lastScan.c && Date.now() - lastScan.t < 1500) return; /* ignore double reads */
  lastScan = { c: code, t: Date.now() };
  stopScan();
  if (navigator.vibrate) navigator.vibrate(60);
  audit('Barcode scanned', code, '');
  store();
  scanCb && scanCb(code);
}
