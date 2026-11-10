/* domain/exact: when a search is an exact match for a record. Plain functions (tested in tests/unit).
   Exact means the whole search equals one of the record's identifying values: its number (L0001,
   1023421, S-0871), name, company, account or office reference, a phone number, an email or a
   postcode. Spaces, brackets, dots and dashes are ignored, so "01632 960 014" = "01632960014". */
import { PHONES } from './customers.js';

export const exactNorm = (v) =>
  String(v ?? '')
    .toLowerCase()
    .replace(/[\s().-]/g, '');

const KEYS = [
  'id',
  'name',
  'co',
  'company',
  'account',
  'officeRef',
  'phone',
  'mobile',
  'email',
  'email1',
  'email2',
  'email3',
  'homePc',
  'sitePc',
  'pc',
  'postcode',
  'ref',
];
/** every value that counts for an exact match, normalised */
export function exactKeys(r) {
  if (!r || typeof r != 'object') return [];
  return [...KEYS, ...PHONES]
    .map((k) => r[k])
    .filter((v) => typeof v == 'string' || typeof v == 'number')
    .map(exactNorm)
    .filter((v) => v.length >= 2);
}
/** is the search exactly this record? (at least 3 characters, so short words never count) */
export function isExact(r, query) {
  const q = exactNorm(query);
  return q.length >= 3 && exactKeys(r).includes(q);
}
