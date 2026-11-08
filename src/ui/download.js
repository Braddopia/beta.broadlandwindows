/* ui/download: Downloading files, CSV export and copying to the clipboard. */
import { toast } from './toast.js';

/* ---- files ---- */
export const download = (name, blob) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
/* CSV with formula-injection protection (cells starting = + - @ are prefixed) */
export const csvCell = (v) => {
  let s = String(v ?? '');
  if (typeof v == 'string' && /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};
export const csvDownload = (name, rows) =>
  download(
    name,
    new Blob(['﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  );
/* copy to the clipboard; only say "Copied" when it really worked */
export const copyText = (t) => {
  const ok = () => toast('Copied to the clipboard'),
    old = () => {
      try {
        const x = document.createElement('textarea');
        x.value = t;
        x.style.position = 'fixed';
        x.style.opacity = '0';
        document.body.appendChild(x);
        x.select();
        const r = document.execCommand('copy');
        x.remove();
        r ? ok() : toast('Could not copy. Select the text and press Ctrl+C');
      } catch (e) {
        toast('Could not copy. Select the text and press Ctrl+C');
      }
    };
  try {
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(String(t)).then(ok, old);
    else old();
  } catch (e) {
    old();
  }
};
