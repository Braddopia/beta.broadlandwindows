/* domain/checklists: Sales steps (leads) and job progress (contracts) checklists. */

/* checklist in stages: [stage, what it means, items] */
export const CKG = [
  ['Sale Agreed', 'Paperwork signed and money in.', ['Contract signed by customer', 'Deposit taken']],
  ['Check Survey', 'Exact sizes before anything is ordered.', ['Survey visit booked', 'Sizes measured and confirmed']],
  ['Ordering', 'Frames and glass on their way.', ['Frames and glass ordered', 'Delivery checked in, nothing damaged']],
  ['Fitting', 'The install itself.', ['Fit date agreed with customer', 'Windows and doors fitted']],
  [
    'Sign-Off',
    'Finishing the job properly.',
    ['Snags put right', 'Balance paid in full', 'Handover form signed', 'Guarantee sent to customer'],
  ],
];
export const CK = CKG.flatMap((g) => g[2]);
export const LCKG = [
  [
    'First Contact',
    'Get back to them quickly and book a visit.',
    ['Customer called back within 24 hours', 'Survey appointment booked'],
  ],
  [
    'Home Visit',
    'What to cover at the survey.',
    ['Home survey carried out', 'Colour and glass samples shown', 'Brochure left with customer'],
  ],
  [
    'Quote',
    'Everything they need to decide.',
    ['Payment and finance options explained', 'Planning or listed building checked', 'Written quote sent'],
  ],
  ['Follow Up', 'Keep the conversation going.', ['Showroom visit offered', 'Follow-up call made after quote']],
];
export const CK3 = {
  'Deposit received': 'Deposit taken',
  'Check survey booked': 'Survey visit booked',
  'Check survey done, sizes confirmed': 'Sizes measured and confirmed',
  'Frames delivered and checked': 'Delivery checked in, nothing damaged',
  'Fitting date confirmed with customer': 'Fit date agreed with customer',
  'Installation complete': 'Windows and doors fitted',
  'Snagging list cleared': 'Snags put right',
  'Final balance paid': 'Balance paid in full',
  'Guarantee issued': 'Guarantee sent to customer',
  'Brochure given or sent': 'Brochure left with customer',
};
/* old checklist wording -> new, so existing ticks are kept */
export const CK_OLD = {
  'Quote signed': 'Contract signed by customer',
  'Survey booked': 'Check survey booked',
  'Survey done': 'Check survey done, sizes confirmed',
  'Materials ordered': 'Frames and glass ordered',
  'Delivery received': 'Frames delivered and checked',
  'Fit booked': 'Fitting date confirmed with customer',
  Fitted: 'Installation complete',
  'Snagging clear': 'Snagging list cleared',
  'Final payment': 'Final balance paid',
  'Appointment booked': 'Survey appointment booked',
  'Brochure sent': 'Brochure given or sent',
  'Quote sent': 'Written quote sent',
  'Follow-up call made': 'Follow-up call made after quote',
  'Finance discussed': 'Payment and finance options explained',
  'Samples shown': 'Colour and glass samples shown',
};
export const LEAD_CK = LCKG.flatMap((g) => g[2]);
