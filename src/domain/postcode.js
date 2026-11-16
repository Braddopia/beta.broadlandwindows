/* domain/postcode: UK postcodes and distances for the service-call map. Plain functions (tests/unit).
   A postcode is found wherever it was typed (its own box, a contract, or the end of an address) and tidied to the
   usual form "NR6 5DR"; its first half (the outcode, "NR6") places a pin roughly when the full one is not known. */

const PC = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;
const OUT = /^[A-Z]{1,2}\d[A-Z\d]?$/i;

/** a postcode in the usual form ("nr65dr" -> "NR6 5DR"), or '' when the text holds none */
export function pcNorm(text) {
  const m = PC.exec(String(text || '').toUpperCase());
  return m ? m[1] + ' ' + m[2] : '';
}
/** the first half of a postcode ("NR6 5DR" -> "NR6"); an outcode on its own is accepted too */
export function outcodeOf(text) {
  const p = pcNorm(text);
  if (p) return p.split(' ')[0];
  const t = String(text || '')
    .trim()
    .toUpperCase();
  return OUT.test(t) ? t : '';
}
/** the postcode of a service call: its own box, then its contract's site (or home) postcode, then the address */
export function callPostcode(call, contract) {
  if (!call) return '';
  const k = contract || {};
  return (
    pcNorm(call.pc) ||
    pcNorm(k.siteSame == 'Different' ? k.sitePc : '') ||
    pcNorm(k.homePc) ||
    pcNorm(call.address) ||
    pcNorm(k.address)
  );
}
/** miles between two [latitude, longitude] points, along the earth's surface */
export function milesApart([la1, lo1], [la2, lo2]) {
  const r = Math.PI / 180,
    a =
      Math.sin(((la2 - la1) * r) / 2) ** 2 +
      Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(((lo2 - lo1) * r) / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
/** a rough driving time in minutes for a straight-line distance: roads wind (x1.3) at about 38mph across Norfolk */
export const driveMins = (miles) => Math.max(5, Math.round((((miles * 1.3) / 38) * 60) / 5) * 5);
/** "about 35 min" / "about 1 hr 20 min" */
export function driveText(miles) {
  const m = driveMins(miles);
  return 'about ' + (m < 60 ? m + ' min' : Math.floor(m / 60) + ' hr' + (m % 60 ? ' ' + (m % 60) + ' min' : ''));
}
