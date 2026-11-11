/* config/roles: Account types and the pages each one can open. */

/* ==========================================================================
   03 · Accounts: roles, PIN sign-in, idle lock, my details (profile)
   NOTE: this app runs entirely in the browser. These checks stop casual
   access and accidents; real protection of the data needs a server.
   ========================================================================== */
export const FOCUS = [
  'home',
  'messages',
  'live',
  'deliveries',
  'stock',
  'suppliers',
  'cutting',
  'bars',
  'downloads',
  'settings',
];
export const ROLES = {
  admin: {
    n: 'Administrator',
    d: 'Everything a standard user has, plus staff, holidays, reports and the admin console',
    v: [...FOCUS, 'leads', 'contracts', 'fitting', 'service', 'contacts', 'staff', 'holidays', 'reports', 'admin'],
  },
  staff: {
    n: 'Standard user',
    d: 'Overview, leads, contracts, calendar, service calls, contacts, live analytics, inventory and files',
    v: [...FOCUS, 'leads', 'contracts', 'fitting', 'service', 'contacts'],
  },
  beta: { n: 'Beta (all features)', d: 'Leads, contracts, finance, staff and everything else', v: '*' },
};
/* what each account type may do (checked by can() in domain/permissions.js) */
export const PERMISSIONS = {
  money: ['admin', 'beta'] /* prices, costs, payments, bills and approvals */,
  manage: ['admin', 'beta'] /* staff, settings, numbering, deleting records */,
};
export const IDLE_MIN = 30,
  PIN_TRIES = 5,
  PIN_LOCK_S = 60;
