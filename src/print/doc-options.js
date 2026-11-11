/* print/doc-options: what shows on each printed document, chosen in Settings, Document Builder.
   Every part is on unless it has been switched off. Tables and report sections are switched by their
   title; the titles a document has printed are remembered so the builder can list them. */
import { state } from '../data/state.js';

/* the parts most documents share */
const LOGO = ['logo', 'Logo and letterhead'],
  META = ['meta', 'Reference and date'],
  KPIS = ['kpis', 'Key figures panel'],
  MONEY = ['money', 'Payment progress bar'],
  STEPS = ['steps', 'Project timeline'],
  DETAILS = ['details', 'Details and contact boxes'],
  PHOTOS = ['photos', 'Photos'],
  SIGN = ['sign', 'Signature lines'],
  FOOT = ['footer', 'Footer line'],
  CUS = [
    ['reviews', 'Review scores'],
    ['thanks', 'Thank-you note'],
  ],
  INT = [
    ['tag', '"Internal, not for customers" tag'],
    ['barcode', 'Barcode to open it in the CRM'],
  ],
  EXTRA = ['extra', 'Drawings and extra pages'];

/** every document that can be customised: key (its kind), name, group, customer-facing, parts */
export const DOCS = [
  {
    k: 'Stock labels',
    n: 'Stock Labels',
    g: 'Stock Labels',
    parts: [
      ['item', 'Item code (large)'],
      ['desc', 'Description'],
      ['spec', 'Length, colours and unit'],
      ['barcode', 'Barcode'],
      ['code', 'Code under the barcode'],
      ['pid', 'Stock ID'],
      ['loc', 'Location'],
      ['supplier', 'Supplier'],
    ],
  },
  {
    k: 'Contract summary',
    n: 'Contract Summary',
    g: 'Contract Documents',
    cus: 1,
    parts: [LOGO, META, KPIS, MONEY, STEPS, DETAILS, SIGN, ...CUS, FOOT],
  },
  {
    k: 'Invoice',
    n: 'Invoice',
    g: 'Contract Documents',
    cus: 1,
    parts: [LOGO, META, KPIS, MONEY, DETAILS, SIGN, ...CUS, FOOT],
  },
  {
    k: 'Fitting job sheet',
    n: 'Fitting Job Sheet',
    g: 'Contract Documents',
    parts: [LOGO, META, KPIS, DETAILS, PHOTOS, SIGN, ...INT, FOOT],
  },
  {
    k: 'Contract sheet',
    n: 'Contract Sheet',
    g: 'Contract Documents',
    parts: [LOGO, META, KPIS, MONEY, STEPS, DETAILS, PHOTOS, SIGN, ...INT, FOOT],
  },
  { k: 'Customer details', n: 'Customer Details', g: 'Contract Documents', parts: [LOGO, META, DETAILS, ...INT, FOOT] },
  { k: 'Contact list', n: 'Contact List', g: 'Contract Documents', parts: [LOGO, META, ...INT, FOOT] },
  {
    k: 'Service visit',
    n: 'Service Visit (Customer Copy)',
    g: 'Service And Cutting',
    cus: 1,
    parts: [LOGO, META, DETAILS, PHOTOS, SIGN, ...CUS, FOOT],
  },
  {
    k: 'Service sheet',
    n: 'Service Sheet',
    g: 'Service And Cutting',
    parts: [LOGO, META, DETAILS, PHOTOS, SIGN, ...INT, FOOT],
  },
  { k: 'Day sheet', n: 'Engineer Day Sheet', g: 'Service And Cutting', parts: [LOGO, META, KPIS, ...INT, FOOT] },
  { k: 'Service report', n: 'Service Report', g: 'Service And Cutting', parts: [LOGO, META, KPIS, ...INT, FOOT] },
  {
    k: 'Cutting Plan',
    n: 'Cutting Plan',
    g: 'Service And Cutting',
    parts: [LOGO, META, KPIS, DETAILS, EXTRA, ...INT, FOOT],
  },
  {
    k: 'Cutting List',
    n: 'Cutting List (Bars)',
    g: 'Service And Cutting',
    parts: [LOGO, META, KPIS, DETAILS, EXTRA, ...INT, FOOT],
  },
  {
    k: 'Stock Report',
    n: 'Inventory Reports',
    g: 'Stock And Other Reports',
    parts: [LOGO, META, KPIS, PHOTOS, SIGN, ...INT, FOOT],
  },
  { k: 'Stock Take', n: 'Stock Take', g: 'Stock And Other Reports', parts: [LOGO, META, KPIS, SIGN, ...INT, FOOT] },
  { k: 'Deliveries', n: 'Delivery Reports', g: 'Stock And Other Reports', parts: [LOGO, META, KPIS, ...INT, FOOT] },
  { k: 'Factory Report', n: 'Factory Report', g: 'Stock And Other Reports', parts: [LOGO, META, KPIS, ...INT, FOOT] },
  {
    k: 'Management Report',
    n: 'Reports And Management Report',
    g: 'Stock And Other Reports',
    parts: [LOGO, META, KPIS, ...INT, FOOT],
  },
];
export const docInfo = (k) => DOCS.find((d) => d.k == k);

const opts = () => (state.docOpts && typeof state.docOpts == 'object' ? state.docOpts : (state.docOpts = {}));
/** is this part of this document switched on? (everything is, until someone switches it off) */
export const docOn = (k, part) => !k || !(opts()[k] && opts()[k][part] === false);
/** switch a part on or off (the caller saves and records the change) */
export function docSet(k, part, on) {
  const O = opts();
  O[k] = O[k] || {};
  if (on) delete O[k][part];
  else O[k][part] = false;
  if (!Object.keys(O[k]).length) delete O[k];
}
/** put a document back to showing everything */
export const docReset = (k) => delete opts()[k];
/** how many parts of a document are switched off */
export const docOff = (k) => Object.keys(opts()[k] || {}).length;

/** remember the tables and sections a document printed, so the builder can offer them */
export function docSaw(k, titles) {
  if (!k || !titles.length) return;
  state.docSeen = state.docSeen && typeof state.docSeen == 'object' ? state.docSeen : {};
  const had = state.docSeen[k] || [];
  state.docSeen[k] = [...new Set([...had, ...titles])].slice(0, 40);
}
export const docTables = (k) => ((state.docSeen || {})[k] || []).slice();
