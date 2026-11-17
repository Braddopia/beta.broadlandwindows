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

/* ---- customers in the Contact Book: a lead or contract and its Customer contact share their details ---- */
const PH_KIND = { mob: 'Mobile', home: 'Home', work: 'Office' };
const norm = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
const pcKey = (s) =>
  String(s || '')
    .toUpperCase()
    .replace(/\s+/g, '');
const digits = (s) => String(s || '').replace(/\D/g, '');
/** the Contact Book entry for a lead or contract's customer: name, every phone, email and home address */
export function contactFromRecord(r) {
  const lines = PHONES.filter((k) => r[k]).map((k) => ({
    t: PH_KIND[k.replace(/\d$/, '')] || 'Mobile',
    n: r[k],
    e: '',
  }));
  ['email1', 'email2', 'email3']
    .map((k) => r[k] || (k == 'email1' ? r.email : ''))
    .filter(Boolean)
    .forEach((e, i) => {
      const free = lines.find((l) => !l.e);
      if (free && i == 0) free.e = e;
      else lines.push({ t: lines.length ? 'Home' : 'Mobile', n: '', e });
    });
  const phones = lines.filter((l) => l.n).map((l) => ({ t: l.t, n: l.n }));
  return {
    type: 'Customer',
    co: r.company || r.name || '',
    name: r.name || '',
    role: '',
    lines,
    phones,
    phone: phones[0] ? phones[0].n : '',
    email: (lines.find((l) => l.e) || {}).e || '',
    addr: [r.homeAddr, r.homeAddr2].filter(Boolean).join(', ') || r.address || '',
    town: r.town || '',
    pc: String(r.homePc || '').toUpperCase(),
  };
}
/** the boxes of a lead or contract filled from a Customer contact (only the ones the contact has) */
export function recordFromContact(c) {
  const o = { name: c.name || c.co || '' };
  if (c.co && c.co != c.name) o.company = c.co;
  const L = (
    Array.isArray(c.lines) && c.lines.length ? c.lines : (c.phones || []).map((p) => ({ ...p, e: '' }))
  ).filter((l) => l && (l.n || l.e));
  const used = { mob: 0, home: 0, work: 0 };
  L.filter((l) => l.n).forEach((l) => {
    const g = l.t == 'Home' ? 'home' : l.t == 'Mobile' ? 'mob' : 'work';
    used[g]++;
    if (used[g] <= 3) o[g == 'work' ? (used[g] == 1 ? 'work' : 'work' + used[g]) : g + used[g]] = l.n;
  });
  L.filter((l) => l.e)
    .slice(0, 3)
    .forEach((l, i) => (o['email' + (i + 1)] = l.e));
  if (!o.email1 && c.email) o.email1 = c.email;
  if (c.addr) o.homeAddr = c.addr;
  if (c.town) o.town = c.town;
  if (c.pc) o.homePc = c.pc;
  return o;
}
/** is this Customer contact the same person as the lead or contract? Same name, and the same postcode or phone */
export function sameCustomer(c, r) {
  if (!c || c.type != 'Customer' || !norm(r.name) || norm(c.name || c.co) != norm(r.name)) return false;
  const pa = pcKey(c.pc),
    pb = pcKey(r.homePc);
  if (pa && pb) return pa == pb;
  const tels = new Set([c.phone, ...(c.phones || []).map((p) => p.n)].map(digits).filter((d) => d.length > 5));
  const mine = PHONES.map((k) => digits(r[k])).filter((d) => d.length > 5);
  return !tels.size || !mine.length || mine.some((d) => tels.has(d));
}
