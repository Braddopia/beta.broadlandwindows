/* config/constants: Fixed lists and limits: stages, sources, units, types and other choices. */

/* ==========================================================================
   02 · Data: seed data, load + migrate, save, audit trail
   Storage key is unchanged from v18 so existing data carries straight over.
   ========================================================================== */
export const KEY = 'broadland_crm_v1',
  LOW = 15,
  MAX_PHOTOS = 8,
  MAX_LOG = 1500;
export const STAGES = ['New', 'Surveyed', 'Quoted', 'Won', 'Lost'];
export const CSTAGES = ['Deposit due', 'Survey done', 'Ordered', 'Fitting booked', 'Fitted', 'Complete'];
export const SOURCES = [
  'Website',
  'Google search',
  'Phone',
  'Showroom',
  'Referral',
  'Repeat customer',
  'Signboard',
  'Van signage',
  'Facebook',
  'Instagram',
  'TikTok',
  'Leaflet',
  'Newspaper or magazine',
  'Radio',
  'Trade show',
  'Trusted Trader',
  'ReferenceLine',
  'Other',
];
export const FIT = ['Team A', 'Team B', 'Fitter A', 'Fitter B'];
export const SCATS = ['Salespeople', 'Fitters', 'Office', 'Factory'];
export const guessCat = (r) =>
  /sales|surveyor|consultant|estimator/i.test(r)
    ? 'Salespeople'
    : /fit|install/i.test(r)
      ? 'Fitters'
      : /operative|production|factory|stock|warehouse|driver/i.test(r)
        ? 'Factory'
        : 'Office';
export const UNITS = ['Each', 'Units', 'Pair', 'Single', 'PCS', 'Meters (M)'];
export const CT = ['Supplier', 'Customer', 'Sub-contractor', 'Trade', 'Other'];
export const DS = ['Due', 'In transit', 'Received'];
export const SUPCAT = [
  'Sealed units and glass',
  'uPVC profiles',
  'Aluminium systems',
  'Timber',
  'Composite doors',
  'Hardware and locks',
  'Roofs and conservatories',
  'Sealants and fixings',
  'Trims and cills',
  'Other',
];
/* ---------------- service calls ---------------- */
export const SVC_ST = ['Open', 'Booked', 'Awaiting parts', 'Complete'],
  SVC_CAT = [
    'Misted or broken glass',
    'Lock, handle or hinge',
    'Leak or water coming in',
    'Draught',
    'Door or window sticking',
    'Damage',
    'Keys',
    'Roof or conservatory',
    'Other',
  ],
  SVC_PR = ['Urgent', 'Normal', 'Low'];
/* ---- contact window: tidy two-column layout, any number of labelled phone numbers ----
   c.phones=[{t:'Office',n:'01632 ...'}]; c.phone mirrors the first one (used by lists, suppliers, search) */
export const CPH = ['Office', 'Mobile', 'Direct DDI', 'Accounts', 'Sales rep', 'Orders', 'Out of hours'],
  CPH_ALL = [...CPH, 'Fax', 'Home'];
export const YN = ['', 'Yes', 'No'];
export const BRANCHES = ['Norwich', 'Cambridge', 'Great Yarmouth', 'North Norfolk', 'Suffolk'];
export const PTYPES = [
  '',
  'Windows',
  'Doors',
  'Windows & Doors',
  'Garden Room',
  'Conservatory',
  'Roof Lantern',
  'Secondary Glazing',
  'Commercial Aluminium',
  'Roofline',
  'Repairs',
  'Other',
];
export const CTYPES = [
  'Domestic PVCu',
  'Domestic Ali',
  'Domestic Timber',
  'Domestic Composite',
  'Garden Room',
  'Commercial',
  'Service / Repair',
];
export const RESULTS = [
  '',
  'Contract Awarded',
  'Quote Pending',
  'Thinking It Over',
  'Lost - Price',
  'Lost - Timing',
  'Lost - Competitor',
  'Not Interested',
  'No Show',
];
/* photos (with a tag each) and documents (stored on this device, type worked out from the file) */
export const PHTAGS = ['Survey', 'Before', 'During', 'After', 'Damage', 'Other'];
export const DOCTYPES = [
  'Quote',
  'Contract',
  'Survey',
  'Drawing',
  'Invoice',
  'Certificate',
  'Spreadsheet',
  'Document',
  'Photo',
  'Other',
];
/* ---- survey schedule: one row per window or door opening ---- */
export const OTYPES = [
  'Casement window',
  'Tilt & turn window',
  'Flush sash window',
  'Vertical slider (sash)',
  'Bay window',
  'Bow window',
  'Fixed light',
  'Residential door',
  'Composite door',
  'French doors',
  'Patio / sliding door',
  'Bifold door',
  'Roof lantern',
  'Other',
];
export const GLAZ = ['Clear', 'Obscure', 'Toughened', 'Laminated', 'Toughened obscure', 'Acoustic', 'Solar control'];
export const ATYPES = [
    'Home survey',
    'Design consultation',
    'Showroom visit',
    'Measure up',
    'Call back',
    'Quote follow-up',
  ],
  ASTAT = ['Booked', 'Confirmed', 'Done', 'No show', 'Cancelled'];
/* ---- finance step: balance at a glance, then Make A Payment ---- */
export const PAYM = ['Bank transfer', 'Card', 'Cheque', 'Cash', 'Finance'],
  PAYK = ['Deposit', 'Stage payment', 'Final balance', 'Other'];
/* ---- report a problem (everyone); administrators see the list ---- */
export const BUG_SEV = ['Small annoyance', 'Something does not work', 'It stops me working'];
