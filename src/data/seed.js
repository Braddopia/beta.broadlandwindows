/* data/seed: Sample data for a brand-new install (sample names only). */
import { addDays } from '../core/dates.js';
import { hex } from '../config/colours.js';

/* ---- seed data ---- */
export function seed() {
  const d = addDays,
    it = (time, type, flag, user, qty, item, length, cInName, cOutName, stock, cost, location) => ({
      time,
      type,
      flag,
      user,
      qty,
      item,
      length,
      cInName,
      cIn: hex(cInName),
      cOutName,
      cOut: hex(cOutName),
      stock,
      cost,
      location,
      supplier: /^ACET/.test(item) ? 'Example Profiles Ltd' : 'Example Glazing Ltd',
    });
  const P = (id, name, role, team, start, allow, salary) => ({
    id,
    name,
    role,
    team,
    phone: '07700 900 ' + String(100 + ((+id.slice(2) * 137) % 900)),
    email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com',
    start,
    allow,
    salary,
  });
  const data = {
    items: [
      it('09:41', 'request', true, 'Operative 1', 7, 'ACET848', '4-5MM', 'Black', 'Gold', 62, 1.85, 'Bay 3, Shelf B'),
      it('09:22', 'add', false, 'Fitter B', 3, 'VG920 KL010', '3M', 'Grey', 'Grey', 118, 0.92, 'Bay 1, Shelf A'),
      it('09:22', 'add', false, 'Fitter B', 3, 'KL005', '3M', 'Grey', 'Grey', 74, 0.78, 'Bay 1, Shelf C'),
      it('08:58', 'request', false, 'Operative 2', 3, 'KL005', '5MM', 'Gold', 'Black', 74, 0.78, 'Bay 1, Shelf C'),
      it('08:40', 'add', false, 'Stock Controller', 12, 'ACET848', '4MM', 'Black', 'Black', 62, 1.85, 'Bay 3, Shelf B'),
      it('08:15', 'remove', true, 'Fitter B', 2, 'VG920', '3M', 'Grey', 'Grey', 9, 0.92, 'Bay 1, Shelf A'),
      it('07:50', 'request', false, 'Operative 3', 5, 'KL010', '5MM', 'Gold', 'Gold', 41, 1.1, 'Bay 2, Shelf A'),
      it('07:32', 'add', false, 'Fitter A', 8, 'KL005', '3M', 'Grey', 'Grey', 74, 0.78, 'Bay 1, Shelf C'),
      it('Yesterday', 'request', true, 'Operative 4', 2, 'ACET848', '4MM', 'Black', 'Gold', 62, 1.85, 'Bay 3, Shelf B'),
    ],
    leads: [
      {
        id: '1041',
        name: 'Sample Customer A',
        phone: '01632 960 014',
        town: 'Wymondham',
        product: 'Bifold doors, 4 panel',
        value: 6850,
        source: 'Website',
        stage: 'Quoted',
        next: 'Chase quote on Fri',
      },
      {
        id: '1042',
        name: 'Sample Customer B',
        phone: '07700 900 231',
        town: 'Norwich',
        product: 'Garden room, 4m x 3m',
        value: 21400,
        source: 'Referral',
        stage: 'Surveyed',
        next: 'Send quote by Mon',
      },
      {
        id: '1043',
        name: 'Sample Customer C',
        phone: '01632 963 882',
        town: 'Great Yarmouth',
        product: '9 windows, white uPVC',
        value: 7960,
        source: 'Facebook',
        stage: 'New',
        next: 'Call to book survey',
      },
      {
        id: '1044',
        name: 'Sample Customer D',
        phone: '07700 900 118',
        town: 'Aylsham',
        product: 'Composite front door',
        value: 2150,
        source: 'Phone',
        stage: 'New',
        next: 'Survey Tue 10am',
      },
      {
        id: '1045',
        name: 'Sample Customer E',
        phone: '01632 964 340',
        town: 'Aylsham',
        product: '7 windows + front door',
        value: 9420,
        source: 'Showroom',
        stage: 'Won',
        next: 'Raise contract',
        contract: true,
      },
      {
        id: '1046',
        name: 'Sample Customer F',
        phone: '07700 900 457',
        town: 'Dereham',
        product: 'Sliding patio door',
        value: 3890,
        source: 'Website',
        stage: 'Won',
        next: 'Raise contract',
      },
      {
        id: '1047',
        name: 'Sample Customer G',
        phone: '01632 960 776',
        town: 'Norwich',
        product: 'Conservatory roof',
        value: 11200,
        source: 'Trade show',
        stage: 'Quoted',
        next: 'Follow up after finance',
      },
      {
        id: '1048',
        name: 'Sample Customer H',
        phone: '07700 900 664',
        town: 'Thetford',
        product: '3 windows',
        value: 1980,
        source: 'Phone',
        stage: 'Lost',
        next: 'Went with cheaper quote',
      },
    ],
    contracts: [
      {
        id: '1023421',
        name: 'Sample Customer E',
        town: 'Aylsham',
        product: '7 windows + front door',
        value: 9420,
        paid: 2826,
        stage: 'Fitting booked',
        fit: '2026-11-12',
        fitter: 'Team A',
        notes: '',
      },
      {
        id: '1023418',
        name: 'Sample Customer I',
        town: 'Norwich',
        product: 'Bifold doors, 3 panel',
        value: 5480,
        paid: 5480,
        stage: 'Fitted',
        fit: '2026-11-03',
        fitter: 'Team B',
        notes: 'Snagging visit needed',
      },
      {
        id: '1023415',
        name: 'Sample Customer J',
        town: 'North Walsham',
        product: 'Garden room, 3m x 3m',
        value: 18900,
        paid: 9450,
        stage: 'Ordered',
        fit: '2026-11-26',
        fitter: 'Team A',
        notes: 'Base laid 19 Nov',
      },
      {
        id: '1023412',
        name: 'Sample Customer K',
        town: 'Cromer',
        product: '12 windows',
        value: 11340,
        paid: 3402,
        stage: 'Survey done',
        fit: '',
        fitter: 'Team B',
        notes: '',
      },
      {
        id: '1023409',
        name: 'Sample Customer L',
        town: 'Diss',
        product: 'French doors',
        value: 2760,
        paid: 0,
        stage: 'Deposit due',
        fit: '',
        fitter: 'Fitter A',
        notes: '',
      },
    ],
    calls: [
      {
        id: 'S-0871',
        name: 'Sample Customer I',
        town: 'Norwich',
        contract: '1023418',
        issue: 'Bifold handle stiff, one panel rubbing',
        priority: 'Normal',
        status: 'Open',
        visit: '2026-11-09',
        fitter: 'Fitter A',
        notes: '',
      },
      {
        id: 'S-0870',
        name: 'Sample Customer M',
        town: 'Holt',
        contract: '1023405',
        issue: 'Misted unit, kitchen window',
        priority: 'Low',
        status: 'Booked',
        visit: '2026-11-11',
        fitter: 'Fitter B',
        notes: 'Replacement unit ordered',
      },
      {
        id: 'S-0869',
        name: 'Sample Customer N',
        town: 'Sheringham',
        contract: '1023403',
        issue: 'Water ingress below patio door',
        priority: 'Urgent',
        status: 'Open',
        visit: '',
        fitter: 'Team A',
        notes: '',
      },
      {
        id: 'S-0866',
        name: 'Sample Customer O',
        town: 'Wymondham',
        contract: '1023401',
        issue: 'Replace lost door key set',
        priority: 'Low',
        status: 'Complete',
        visit: '2026-10-30',
        fitter: 'Fitter A',
        notes: '',
      },
    ],
    contacts: [
      {
        id: 'K-1',
        co: 'Example Glass Ltd',
        name: 'Contact One',
        role: 'Account manager',
        type: 'Supplier',
        phone: '01632 960 201',
        email: 'sales@glass.example.com',
        addr: 'Norwich',
      },
      {
        id: 'K-2',
        co: 'Example Aluminium Ltd',
        name: 'Contact Two',
        role: 'Sales office',
        type: 'Supplier',
        phone: '01632 961 310',
        email: 'orders@aluminium.example.com',
        addr: 'Attleborough',
      },
      {
        id: 'K-3',
        co: 'Example Timber Ltd',
        name: 'Contact Three',
        role: 'Director',
        type: 'Supplier',
        phone: '01632 962 118',
        email: 'info@timber.example.com',
        addr: 'North Walsham',
      },
      {
        id: 'K-4',
        co: 'Example Fitting Services',
        name: 'Fitter A',
        role: 'Lead fitter',
        type: 'Sub-contractor',
        phone: '07700 900 312',
        email: 'jobs@fitting.example.com',
        addr: 'Norwich',
      },
      {
        id: 'K-5',
        co: 'Example Groundworks',
        name: 'Contact Five',
        role: 'Groundworks',
        type: 'Trade',
        phone: '07700 900 845',
        email: 'office@groundworks.example.com',
        addr: 'Dereham',
      },
    ],
    deliveries: [
      {
        id: 'D-1',
        supplier: 'Example Glass Ltd',
        items: 'Sealed units x24',
        due: d(-1),
        status: 'In transit',
        contract: '1023421',
      },
      {
        id: 'D-2',
        supplier: 'Example Aluminium Ltd',
        items: 'Bifold frames x3',
        due: d(0),
        status: 'Due',
        contract: '1023415',
      },
      {
        id: 'D-3',
        supplier: 'Example Timber Ltd',
        items: 'Garden room kit 3m x 3m',
        due: d(0),
        status: 'In transit',
        contract: '1023415',
      },
      {
        id: 'D-4',
        supplier: 'Example Glass Ltd',
        items: 'Glass panels x12',
        due: d(2),
        status: 'Due',
        contract: '1023412',
      },
      {
        id: 'D-5',
        supplier: 'Example Aluminium Ltd',
        items: 'French doors x1',
        due: d(5),
        status: 'Due',
        contract: '1023409',
      },
    ],
    staff: [
      P('U-1', 'Demo User', 'Director', '', '2012-04-02', 25, 62000),
      P('U-2', 'Fitter A', 'Lead fitter', 'Team A', '2016-09-12', 25, 34000),
      P('U-3', 'Fitter B', 'Fitter', 'Team B', '2019-03-04', 25, 31000),
      P('U-4', 'Stock Controller', 'Stock controller', '', '2020-06-15', 25, 29500),
      P('U-5', 'Operative 1', 'Production operative', '', '2021-01-11', 25, 27500),
      P('U-6', 'Operative 2', 'Production operative', '', '2022-05-03', 25, 27000),
      P('U-7', 'Operative 3', 'Production operative', '', '2023-02-20', 25, 26500),
      P('U-8', 'Operative 4', 'Production operative', '', '2024-08-05', 25, 26000),
      P('U-9', 'Sales A', 'Sales consultant', '', '2023-09-04', 25, 30000),
      P('U-10', 'Office A', 'Office manager', '', '2018-01-08', 25, 29000),
    ],
    hols: [
      { id: 'H-1', sid: 'U-2', from: '2026-11-23', to: '2026-11-27', days: 5, status: 'Approved' },
      { id: 'H-2', sid: 'U-3', from: '2026-12-21', to: '2026-12-31', days: 7, status: 'Pending' },
      { id: 'H-3', sid: 'U-4', from: '2026-08-03', to: '2026-08-14', days: 10, status: 'Approved' },
      { id: 'H-4', sid: 'U-5', from: '2026-12-24', to: '2026-12-24', days: 1, status: 'Pending' },
      { id: 'H-5', sid: 'U-1', from: '2026-04-06', to: '2026-04-10', days: 4, status: 'Approved', note: 'Easter' },
      {
        id: 'H-6',
        sid: 'U-1',
        from: '2026-08-17',
        to: '2026-08-21',
        days: 5,
        status: 'Approved',
        note: 'Summer holiday',
      },
      {
        id: 'H-7',
        sid: 'U-1',
        from: '2026-12-17',
        to: '2026-12-18',
        days: 2,
        status: 'Pending',
        note: 'Christmas shopping',
      },
    ],
    fin: [
      {
        id: 'B-1',
        payee: 'Example Glazing Ltd',
        type: 'Supplier',
        ref: 'INV-8841',
        job: '1023421',
        amount: 1840,
        due: d(-3),
        status: 'Unpaid',
      },
      {
        id: 'B-2',
        payee: 'Example Profiles Ltd',
        type: 'Supplier',
        ref: 'INV-5520',
        job: '1023415',
        amount: 2310,
        due: d(6),
        status: 'Unpaid',
      },
      {
        id: 'B-3',
        payee: 'Example Timber Ltd',
        type: 'Supplier',
        ref: 'INV-1207',
        job: '1023415',
        amount: 6450,
        due: d(12),
        status: 'Unpaid',
      },
      {
        id: 'B-4',
        payee: 'Example Groundworks',
        type: 'Job cost',
        ref: 'Garden room base',
        job: '1023415',
        amount: 1200,
        due: d(2),
        status: 'Unpaid',
      },
    ],
  };
  /* every box marked * filled in, so the sample records look and behave like real ones */
  const C = (title, first, mob, home, street, town, pc, extra) => ({
    title,
    mob1: mob,
    home1: home,
    email1: first.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com',
    homeAddr: street,
    town,
    homePc: pc,
    addrType: 'Home',
    county: 'Norfolk',
    ...extra,
  });
  const X = {
    'Sample Customer A': C('Mr', 'customer.a', '07700 900 014', '', '12 Example Road', 'Wymondham', 'NR18 0XA', {
      productType: 'Doors',
      owner: 'Sales A',
    }),
    'Sample Customer B': C(
      'Mrs',
      'customer.b',
      '07700 900 231',
      '01632 960 231',
      '4 Sample Close',
      'Norwich',
      'NR4 6XB',
      { productType: 'Garden Room', owner: 'Sales A' }
    ),
    'Sample Customer C': C('Ms', 'customer.c', '', '01632 963 882', '27 Test Street', 'Great Yarmouth', 'NR30 1XC', {
      productType: 'Windows',
      owner: 'Sales A',
    }),
    'Sample Customer D': C('Mr & Mrs', 'customer.d', '07700 900 118', '', '9 Demo Lane', 'Aylsham', 'NR11 6XD', {
      productType: 'Doors',
      owner: 'Sales A',
    }),
    'Sample Customer E': C(
      'Mr & Mrs',
      'customer.e',
      '07700 900 340',
      '01632 964 340',
      '3 Example Mews',
      'Aylsham',
      'NR11 6XE',
      {
        productType: 'Windows & Doors',
        owner: 'Sales A',
        contractType: 'Domestic PVCu',
        soldBy: 'Sales A',
        cdate: '2026-10-02',
        source: 'Showroom',
      }
    ),
    'Sample Customer F': C('Miss', 'customer.f', '07700 900 457', '', '18 Sample Avenue', 'Dereham', 'NR19 1XF', {
      productType: 'Doors',
      owner: 'Sales A',
    }),
    'Sample Customer G': C(
      'Dr',
      'customer.g',
      '07700 900 776',
      '01632 960 776',
      'The Old Rectory, Test Lane',
      'Norwich',
      'NR7 0XG',
      { productType: 'Conservatory', owner: 'Sales A' }
    ),
    'Sample Customer H': C('Mr', 'customer.h', '07700 900 664', '', '41 Demo Road', 'Thetford', 'IP24 2XH', {
      productType: 'Windows',
      owner: 'Sales A',
    }),
    'Sample Customer I': C('Mrs', 'customer.i', '07700 900 871', '', '6 Example Gardens', 'Norwich', 'NR2 3XI', {
      contractType: 'Domestic Ali',
      soldBy: 'Sales A',
      cdate: '2026-08-14',
      source: 'Website',
    }),
    'Sample Customer J': C(
      'Mr',
      'customer.j',
      '07700 900 905',
      '01632 961 905',
      'Field View, Sample Road',
      'North Walsham',
      'NR28 9XJ',
      { contractType: 'Garden Room', soldBy: 'Sales A', cdate: '2026-09-21', source: 'Referral' }
    ),
    'Sample Customer K': C('Mr & Mrs', 'customer.k', '07700 900 299', '', '14 Test Crescent', 'Cromer', 'NR27 9XK', {
      contractType: 'Domestic PVCu',
      soldBy: 'Sales A',
      cdate: '2026-10-19',
      source: 'Google search',
    }),
    'Sample Customer L': C('Ms', 'customer.l', '07700 900 290', '', '2 Demo Cottages', 'Diss', 'IP22 4XL', {
      contractType: 'Domestic Composite',
      soldBy: 'Sales A',
      cdate: '2026-11-02',
      source: 'Facebook',
    }),
  };
  /* service calls: who took the call and when, what kind of problem, how to reach the customer */
  const SV = {
    'S-0871': {
      existing: 'Yes, we fitted it',
      takenBy: 'Office A',
      takenAt: '2026-11-04',
      takenTime: '09:15',
      cat: 'Lock, handle or hinge',
      guarantee: 'Yes',
      visitTime: '10:00',
    },
    'S-0870': {
      existing: 'Yes, we fitted it',
      takenBy: 'Office A',
      takenAt: '2026-11-02',
      takenTime: '14:40',
      cat: 'Misted or broken glass',
      guarantee: 'Yes',
      visitTime: '13:30',
    },
    'S-0869': {
      existing: 'Yes, we fitted it',
      takenBy: 'Demo User',
      takenAt: '2026-11-07',
      takenTime: '08:05',
      cat: 'Leak or water coming in',
      guarantee: 'Not sure',
    },
    'S-0866': {
      existing: 'Yes, we fitted it',
      takenBy: 'Office A',
      takenAt: '2026-10-27',
      takenTime: '11:20',
      cat: 'Keys',
      guarantee: 'No',
      visitTime: '09:00',
      notes: 'New key set supplied and tested',
      charge: 35,
    },
  };
  /* contacts: each line has what it is for, its number and its email */
  const KL = {
    'K-1': [
      { t: 'Sales', n: '01632 960 201', e: 'sales@glass.example.com' },
      { t: 'Accounts', n: '01632 960 202', e: 'accounts@glass.example.com' },
    ],
    'K-2': [
      { t: 'Orders', n: '01632 961 310', e: 'orders@aluminium.example.com' },
      { t: 'Accounts', n: '01632 961 311', e: 'accounts@aluminium.example.com' },
    ],
    'K-3': [
      { t: 'Office', n: '01632 962 118', e: 'info@timber.example.com' },
      { t: 'Mobile', n: '07700 900 118', e: '' },
    ],
    'K-4': [{ t: 'Mobile', n: '07700 900 312', e: 'jobs@fitting.example.com' }],
    'K-5': [
      { t: 'Office', n: '07700 900 845', e: 'office@groundworks.example.com' },
      { t: 'Accounts', n: '01632 962 846', e: 'accounts@groundworks.example.com' },
    ],
  };
  const D0 = data;
  [...D0.leads, ...D0.contracts].forEach((r) => {
    Object.assign(r, X[r.name] || {});
    r.phone = r.mob1 || r.home1 || r.phone;
    r.email = r.email1;
    r.address = r.homeAddr;
  });
  D0.calls.forEach((c) => {
    const k = D0.contracts.find((x) => x.name == c.name) || X[c.name] || {};
    Object.assign(c, SV[c.id] || {}, {
      phone: c.phone || k.mob1 || '07700 900 ' + c.id.slice(-3),
      email: c.email || k.email1 || c.name.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com',
      address: c.address || k.homeAddr || '1 Example Street',
    });
  });
  D0.contacts.forEach((c) => {
    const L = KL[c.id];
    if (!L) return;
    c.lines = L;
    c.phones = L.filter((l) => l.n).map((l) => ({ t: l.t, n: l.n }));
    c.phone = c.phones[0].n;
    c.email = L[0].e;
    c.email2 = (L.find((l) => l.t == 'Accounts') || {}).e || '';
    c.town = c.addr;
    c.addr = '';
  });
  /* jobs past the survey have their openings measured and their products priced (the lines add up to the value) */
  const ROOMS = [
    'Lounge',
    'Kitchen',
    'Bed 1',
    'Bed 2',
    'Bed 3',
    'Bathroom',
    'Landing',
    'Hall',
    'Dining',
    'Study',
    'Utility',
    'Bed 4',
  ];
  const op = (i, type, w, h, glaz = 'Clear') => ({
    ref: 'W' + (i + 1),
    room: ROOMS[i % ROOMS.length],
    type,
    w,
    h,
    glaz,
    low: /door/i.test(type) ? 'Yes' : 'No',
    esc: i == 2 || i == 3 ? 'Yes' : 'No',
    vents: /door/i.test(type) ? 'No' : 'Yes',
    col: 'White',
    notes: '',
  });
  const JOBS = {
    'Sample Customer E': () =>
      [...Array(7)]
        .map((_, i) => op(i, 'Casement window', 1200 - i * 60, 1050))
        .concat(op(7, 'Composite door', 920, 2090, 'Toughened obscure')),
    'Sample Customer I': () => [op(0, 'Bifold door', 2990, 2100, 'Toughened')],
    'Sample Customer J': () => [
      op(0, 'French doors', 1500, 2100, 'Toughened'),
      op(1, 'Casement window', 1200, 1200),
      op(2, 'Fixed light', 600, 2100, 'Toughened'),
    ],
    'Sample Customer K': () =>
      [...Array(12)].map((_, i) =>
        op(
          i,
          i % 4 == 0 ? 'Tilt & turn window' : 'Casement window',
          900 + (i % 3) * 150,
          1150,
          i == 5 ? 'Obscure' : 'Clear'
        )
      ),
    'Sample Customer B': () => [
      op(0, 'French doors', 1600, 2100, 'Toughened'),
      op(1, 'Fixed light', 1800, 2100, 'Toughened'),
    ],
    'Sample Customer A': () => [op(0, 'Bifold door', 3600, 2100, 'Toughened')],
    'Sample Customer G': () => [op(0, 'Roof lantern', 3000, 2000, 'Solar control')],
  };
  [...D0.leads, ...D0.contracts].forEach((r) => {
    const f = JOBS[r.name];
    if (!f) return;
    r.openings = f();
    const n = r.openings.length,
      each = Math.round(((+r.value || 0) * 0.9) / n / 1.2),
      fit = Math.round((+r.value || 0) / 1.2) - each * n;
    r.lines = [
      ...r.openings.map((o) => ({
        code: o.ref,
        name: o.type + ', ' + o.col + ', ' + o.w + ' x ' + o.h + 'mm',
        qty: 1,
        guar: '10 years',
        loc: o.room,
        rate: each,
      })),
      { code: 'FIT', name: 'Fitting, making good and waste removal', qty: 1, guar: '10 years', loc: 'All', rate: fit },
    ];
  });
  D0.deliveries.forEach((x, i) => (x.ref = 'PO-' + (5120 + i)));
  return D0;
}
