/* features/tour/tour-steps: what each tour says.
   WELCOME runs once, the very first time someone opens the site. TAB_TOURS[view] runs once, the first time
   that tab is opened. A step points at `sel` (optionally the first match whose text starts with `txt`);
   if that isn't on screen, the card shows in the middle instead. Steps go in screen order. */

export const WELCOME = [
  {
    art: 'team',
    t: 'Welcome To Broadland Windows CRM',
    d: 'Everything for the business in one place: leads, contracts, fittings, service calls, stock and the team. This short tour shows you round. It takes about a minute.',
  },
  {
    sel: '#nav',
    t: 'Your Menu',
    d: 'Every page you can use, grouped by job: Sales, Operations, Stock, People and Insights. What you see depends on your account. The numbers show what needs your attention.',
  },
  {
    sel: '#meBtn',
    t: 'Your Details',
    d: 'Keep your phone, email and emergency contacts up to date, and see how much holiday you have left.',
  },
  {
    sel: '#acct',
    t: 'Switch Account',
    d: 'Need more access? Sign in as an administrator with your PIN. You are signed out again after 30 minutes without use.',
  },
  {
    sel: '#sb',
    t: 'Search Everything',
    d: 'Type a name, postcode, phone number, item code or contract number. An exact match is shown first with a rainbow edge. Press / to jump here, or Ctrl+K for quick commands.',
  },
  {
    sel: '#scanBtn',
    t: 'Scan A Barcode',
    d: 'Use your phone or laptop camera to scan a label. It finds the product straight away so you can book stock in or out.',
  },
  {
    sel: '#nwb',
    t: 'Add Something New',
    d: 'Start a new lead, service call, contact, stock movement or holiday from any page, without going to that tab first.',
  },
  {
    sel: '#bell',
    t: 'Notifications',
    d: 'Stock requests, low stock, deliveries due, holiday requests and FENSA reminders all land here. The number shows how many are waiting.',
  },
  {
    sel: '#lookBtn',
    t: 'Change The Look',
    d: 'Pick a page background and a pattern for the blue greeting box. It only changes your screen.',
  },
  {
    sel: '#thb',
    t: 'Light Or Dark',
    d: 'Switch to suit the room. Dark is easier on the eyes in the evening and on the factory screen.',
  },
  {
    sel: '#helpBtn',
    t: 'Help Is Here',
    d: 'Press ? any time to replay the tour for the page you are on. Each tab also has its own short tour the first time you open it.',
  },
  {
    sel: '.hero-cz',
    page: 'home',
    t: 'Make The Overview Yours',
    d: 'Choose which numbers and panels show on your overview, and in what order. Click any number card to go straight to that list.',
  },
  {
    sel: '#rpb',
    t: 'Report A Problem',
    d: 'Something not right? Press this on any page or window. It can attach a picture of your screen so we see exactly what you saw.',
  },
  {
    art: 'done',
    t: "You're All Set",
    d: 'That is the tour. Open any tab to get a quick look at what it does, and press ? if you ever want to see it again.',
  },
];

const T = (sel, t, d, txt) => (txt ? { sel, txt, t, d } : { sel, t, d });
const TOOL = '#main .head .tools > *';

export const TAB_TOURS = {
  messages: [
    T('#main .msn-l', 'Your Chats', 'Conversations with the team. Click one to open it.'),
    T('#m_t', 'Write A Message', 'Type here and press Enter to send. Shift+Enter starts a new line.'),
  ],
  fitting: [
    T(
      '#main .seg',
      'Month, Week Or Agenda',
      'See the month at a glance, a week in detail, or a simple list of what is coming up.'
    ),
    T(
      '#main .chips',
      'Choose What Shows',
      'Turn fittings, service visits, deliveries and holidays on or off so you only see what you need.'
    ),
    T(
      '#main .cm',
      'The Calendar',
      'Click an entry to open the job. Fittings are named by job number and customer, like 1023421 - SAMPLE CUSTOMER.'
    ),
  ],
  contacts: [
    T('#main .azbar', 'A To Z', 'Jump straight to a letter in the contact book.'),
    T(
      '#main .cbook .cc2',
      'Contact Cards',
      'Each card is one customer, supplier or sub-contractor, with phone, email and town. Edit a contact straight from its card.'
    ),
    T(
      TOOL,
      'Import Customers',
      'Have your customers in a spreadsheet already? Bring them all in at once here, instead of typing each one.',
      'Import'
    ),
    T(TOOL, 'New Contact', 'Add a single person or company by hand.', 'New Contact'),
  ],
  leads: [
    T('#main .pipe', 'Your Pipeline', 'Where every lead is, stage by stage, from first enquiry to won.'),
    T('#main .seg2', 'List Or Board', 'Switch between a table and a board of cards, one column per stage.'),
    T('#main .kpis', 'At A Glance', 'The key numbers for the leads on screen.'),
    T(
      '#main .tw',
      'The Lead List',
      'Click a row to open the lead. Click a column heading to sort, or use the search bar to narrow it down.'
    ),
    T(
      TOOL,
      'Add A Lead',
      'Start a new enquiry. It gets the next lead number and walks you through customer, survey and quote.',
      'New Lead'
    ),
  ],
  contracts: [
    T('#main .pipe', 'Contract Stages', 'Where every contract is, from deposit to complete.'),
    T('#main .seg2', 'List Or Board', 'A table, or a board of cards grouped by stage.'),
    T('#main .kpis', 'At A Glance', 'The key numbers for the contracts on screen.'),
    T(
      '#main .tw',
      'The Contract List',
      'Click a row to open the contract: deposit, survey, ordering, fitting and invoice all live in one window.'
    ),
    T(TOOL, 'New Contract', 'Start a new contract with a step-by-step wizard.', 'New Contract'),
  ],
  live: [
    T(
      '#main .fl-head',
      'The Factory Screen',
      'Made for the TV on the shop floor and kept up to date by itself. Pick a board, customise it, print a report or go full screen.'
    ),
    T(
      '#main .kpis',
      'Today In Numbers',
      'Deliveries due and overdue, and jobs in progress, big enough to read from across the room.'
    ),
    T(
      '#main .lvg > .panel',
      'The Boards',
      'Live boards for deliveries and jobs. Mark a delivery received straight from here.'
    ),
  ],
  deliveries: [
    T('#main .seg2', 'List Or Board', 'A table, or cards grouped by when they are due.'),
    T('#main .kpis', 'At A Glance', 'Overdue, due today, this week, later and in transit.'),
    T(TOOL, 'New Delivery', 'Book in a delivery you are expecting from a supplier.', 'New Delivery'),
    T(TOOL, 'Sync Hallmark', 'Pull the latest delivery dates from Hallmark so this list stays right.', 'Sync'),
    T(TOOL, 'Delivery Reports', 'Print what is due, what arrived damaged and who checked it.', 'Reports'),
    T('#main .tw', 'Check It In', 'Click a delivery to mark it arrived, note any damage, add photos and sign it off.'),
  ],
  service: [
    T('#main .seg2', 'List Or Map', 'See calls as a list, or as pins on a map of Norfolk to plan a route.'),
    T('#main .kpis', 'At A Glance', 'Open, urgent, visits today, awaiting parts, not booked yet and overdue.'),
    T(TOOL, "Today's Day Sheet", "Print today's visits for the engineer to take out.", 'Today'),
    T(TOOL, 'Service Report', 'A printed summary of service calls.', 'Service Report'),
    T(
      TOOL,
      'New Service Call',
      'Log a problem step by step: customer, problem, checks, visit and photos.',
      'New Service'
    ),
    T('#main .tw', 'The Call List', 'Click a call to update it, book the visit or close it with the work done.'),
  ],
  stock: [
    T(
      '#invQ',
      'Find Stock',
      'Type or scan a Stock ID or item code. An exact match jumps to the top with a rainbow edge.'
    ),
    T(
      '#main .seg2',
      'Products, Movements, Stock Take',
      'What you hold, every movement in and out, and the stock take count sheets.'
    ),
    T(TOOL, 'Add Stock', 'Book stock in. Scan the label or pick the product, then enter how many.', 'Add Stock'),
    T(
      TOOL,
      'Remove Stock',
      'Book stock out to a job. Type or scan the Stock ID; it never makes a new product.',
      'Remove Stock'
    ),
    T(TOOL, 'Request Stock', 'Ask for something to be ordered. An administrator approves or rejects it.', 'Request'),
    T(TOOL, 'Reports', 'Cost by supplier, by area, dead stock, QC and more, ready to print.', 'Reports'),
    T('#main .tw', 'The Stock List', 'Click a row to see a product, print its label or check its history.'),
  ],
  suppliers: [
    T(TOOL, 'Add Supplier', 'Add a company you buy from, with account number and contacts.', 'Add Supplier'),
    T(
      '#main .sups .supw',
      'Supplier Cards',
      'Phone, email, account number and the people you deal with, all on one card.'
    ),
  ],
  cutting: [
    T(
      '#cut_job_no',
      'Job Number',
      'Type the contract number. The job name fills in and you can save the plan to that contract.'
    ),
    T(
      '#main .cut-lists',
      'Boards And Pieces',
      'List the boards you have in stock and the pieces you need. The plan updates as you type.'
    ),
    T('#cutKpis', 'How It Worked Out', 'Boards used, pieces placed and how much is waste.'),
    T('#cutOut', 'The Cutting Plan', 'Each board drawn to scale with every piece labelled, ready to cut.'),
    T(
      TOOL,
      'Print Or Save',
      'Print the plan on A4, or save it to the contract so it lives with the job.',
      'Print Plan'
    ),
  ],
  staff: [
    T('#main .views', 'Choose A View', 'Show everyone, or just salespeople, fitters, office or factory staff.'),
    T('#main .tw', 'The Team', 'Click a person to open their details.'),
    T(TOOL, 'Add Staff Member', 'Set up someone new with their role, team and holiday allowance.', 'Add Staff'),
  ],
  holidays: [
    T('#main .seg', 'Chart, Month Or Year', 'See who is off as a chart, a month calendar or the whole year.'),
    T(TOOL, 'Christmas Shutdown', 'Set the days the business is closed over Christmas.', 'Christmas'),
    T(
      TOOL,
      'Book Holiday',
      'Ask for time off. Weekends and bank holidays are left out of the count for you.',
      'Book Holiday'
    ),
    T('#main .xls', 'Who Is Off', 'Every booking at a glance, team by team.'),
  ],
  reports: [
    T('#main .chips', 'Pick A Report', 'Sales, contracts, service, stock and more. Each one is built from live data.'),
    T(TOOL, 'Print This Report', 'Print what is on screen as an A4 company report.', 'Print'),
    T(TOOL, 'Export CSV', 'Download the numbers to open in Excel.', 'Export'),
    T(TOOL, 'Full Management Report', 'Every section in one printed pack.', 'Full'),
  ],
  downloads: [
    T('#main .chips', 'Filter Brochures', 'Show just the range you need: hardwood, PVCu, doors and more.'),
    T('#main .book .bc', 'Brochures', 'Each brochure can be opened, downloaded or emailed to a customer.'),
    T(TOOL, 'Copy All Links', 'Copy every brochure link to paste into an email.', 'Copy'),
  ],
  finance: [
    T(
      '#main .kpis',
      'Money At A Glance',
      'Owed by customers, bills to pay, overdue bills, monthly payroll and the net outlook.'
    ),
    T(
      '#main .chips',
      'Owed To Us Or By Us',
      'Switch between money owed to us, suppliers and job costs, and employees.'
    ),
    T('#main .tw', 'The Detail', 'The detail behind each number.'),
  ],
  admin: [
    T('#main .kpis', 'Money At A Glance', 'Contract value, money collected, owed to us and bills unpaid.'),
    T(TOOL, 'Account PINs', 'Change the PINs for each account. Change any still set to the default.', 'Account PINs'),
    T('#main .panel', 'Waiting For You', 'Stock requests to approve or reject come first, then the admin tools.'),
  ],
  settings: [
    T(
      '#main .set .set-c',
      'Your Settings',
      'Your details, light or dark, background, fewer animations, the help tour and more, each on its own row.'
    ),
    T('#main .seg', 'Light Or Dark', 'The same switch as the button at the top of the page.'),
  ],
};
