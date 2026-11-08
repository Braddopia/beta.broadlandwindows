/* domain/customers: A customer's phone, email and addresses, worked out from their record. */

export const PHONES = ['mob1', 'mob2', 'mob3', 'home1', 'home2', 'home3', 'work', 'work2', 'work3'];
export const telOf = (r) => PHONES.map((k) => r[k]).find(Boolean) || r.phone || '';
export const mailOf = (r) => r.email1 || r.email2 || r.email3 || r.email || '';
export const addrOf = (r) => [r.homeAddr || r.address, r.homeAddr2, r.town, r.county].filter(Boolean).join(', ');
export const siteOf = (r) =>
  r.siteSame == 'Different' && r.siteAddr
    ? [r.siteAddr, r.siteAddr2, r.siteTown, r.siteCounty, r.sitePc].filter(Boolean).join(', ')
    : [addrOf(r), r.homePc].filter(Boolean).join(', ');
export function custCompat(r) {
  r.phone = telOf(r);
  r.email = mailOf(r);
  r.address =
    r.siteSame == 'Different' && r.siteAddr
      ? [r.siteAddr, r.siteAddr2].filter(Boolean).join(', ')
      : [r.homeAddr, r.homeAddr2].filter(Boolean).join(', ');
}
