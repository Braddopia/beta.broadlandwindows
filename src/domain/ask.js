/* domain/ask: understanding a typed question well enough to match it against answers and page labels.
   Words are lower-cased, plurals trimmed, filler words dropped, and words that mean the same thing
   ("outstanding", "owing", "balance", "to collect") folded into one. Plain functions (tests/unit). */

const STOP = new Set(
  'a an and are as at be by can do does for from get give has have how i in is it its me my of on or our please show tell the their there this to us what whats when where which who will with you your much many total number count amount'.split(
    ' '
  )
);
/* words that mean the same thing for our purposes: the first word of each line is the one used */
const SAME = [
  'owed outstanding owing owe debt debts balance balances unpaid collect arrears',
  'call ticket repair callout service',
  'lead enquiry prospect',
  'contract job',
  'fit fitting install installation',
  'delivery deliveries',
  'holiday leave off vacation',
  'staff employee people team headcount worker',
  'stock inventory item product',
  'value worth',
  'sale sold turnover revenue',
  'collected received taken banked',
  'bill invoice payable',
  'payroll wage wages salary salaries pay',
  'conversion win',
  'low reorder',
  'overdue late',
  'urgent emergency',
  'average typical mean',
  'phone telephone tel number',
];
const CANON = new Map();
SAME.forEach((line) => {
  const [first, ...rest] = line.split(' ');
  [first, ...rest].forEach((w) => CANON.set(w, first));
});

/** one word in its plain form: "Fittings" -> "fit", "owing" -> "owed" */
export function stem(w) {
  let x = String(w || '')
    .toLowerCase()
    .replace(/[^a-z0-9£%]/g, '');
  if (CANON.has(x)) return CANON.get(x);
  if (x.length > 4 && x.endsWith('ies')) x = x.slice(0, -3) + 'y';
  else if (x.length > 3 && x.endsWith('es') && /(ch|sh|x|ss)es$/.test(x)) x = x.slice(0, -2);
  else if (x.length > 3 && x.endsWith('s') && !x.endsWith('ss')) x = x.slice(0, -1);
  return CANON.get(x) || x;
}
/** the words that matter in a question, each in its plain form */
export function askWords(q) {
  return String(q || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9£%]+/)
    .filter((w) => w && !STOP.has(w))
    .map(stem)
    .filter(Boolean);
}
/** how well a question matches a list of phrases: the length of the longest phrase whose words are all asked for */
export function askScore(words, phrases) {
  const have = new Set(words);
  let best = 0;
  for (const p of phrases) {
    const need = askWords(p);
    if (need.length && need.every((w) => have.has(w))) best = Math.max(best, need.length);
  }
  return best;
}
/** does a label on a page answer the question? every word asked for appears in it (in plain form) */
export function labelHit(words, label) {
  if (!words.length) return false;
  const have = new Set(askWords(label));
  return words.every((w) => have.has(w));
}
