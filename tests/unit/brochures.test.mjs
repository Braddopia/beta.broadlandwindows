// The daily brochure check: reading the website's brochure page (v19.17).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBrochures, guessCat } from '../../scripts/fetch-brochures.mjs';

const PAGE = `
<h2>Hardwood</h2>
<a href="https://www.broadlandwindows.co.uk/wp-content/uploads/2025/06/HW_Windows_Merge.pdf">Hardwood Windows</a>
<a href="https://www.broadlandwindows.co.uk/wp-content/uploads/2025/06/HW_Door_Merge.pdf">Download</a>
<h2>Aluminium Products</h2>
<h3>Smarts Visofold</h3>
<a href="https://www.broadlandwindows.co.uk/wp-content/uploads/2025/06/SMARTS-Visofold-Series-2025.pdf"><img src="x.jpg"></a>
<a href="https://www.broadlandwindows.co.uk/wp-content/uploads/2025/06/SMARTS-Visofold-Series-2025.pdf">Again</a>
<a href="/contact">Contact us</a>`;

test('every brochure link is found once, with a title and its section', () => {
  const L = parseBrochures(PAGE);
  assert.equal(L.length, 3);
  assert.deepEqual(L[0], {
    cat: 'Hardwood',
    title: 'Hardwood Windows',
    url: 'https://www.broadlandwindows.co.uk/wp-content/uploads/2025/06/HW_Windows_Merge.pdf',
  });
  // a link that only says "Download" takes the heading above it
  assert.equal(L[1].title, 'Hardwood');
  assert.equal(L[1].cat, 'Hardwood');
  // an image link takes the nearest heading; the section heading gives the range
  assert.equal(L[2].title, 'Smarts Visofold');
  assert.equal(L[2].cat, 'Aluminium');
});

test('a brochure with no heading nearby is placed by its own name', () => {
  assert.equal(guessCat('Broadland Titan Lanterns'), 'Roof lanterns');
  assert.equal(guessCat('HALLMARK Colour Lab 2025'), 'Composite doors');
  assert.equal(guessCat('Rose Collection'), 'PVCu');
});

test('links written as "/wp-content/..." (no domain) are read as files on our own website', () => {
  const L = parseBrochures(`<h2>Roof lanterns</h2>
<a class="btn" href="/wp-content/uploads/2025/07/Broadland-Secondary-Glazing.pdf">View</a>
<a href="https://elsewhere.example/wp-content/uploads/x.pdf">Other site</a>`);
  assert.equal(L.length, 1);
  assert.equal(
    L[0].url,
    'https://www.broadlandwindows.co.uk/wp-content/uploads/2025/07/Broadland-Secondary-Glazing.pdf'
  );
  assert.equal(L[0].title, 'Roof lanterns');
});

test('each brochure keeps the cover picture the website shows with it', () => {
  const L = parseBrochures(`<h2>Aluminium</h2>
<div class="card"><img loading="lazy" src="data:image/svg+xml,x" data-src="/wp-content/uploads/2025/06/Visofold-cover.jpg">
<a href="/wp-content/uploads/2025/06/SMARTS-Visofold-Series-2025.pdf">Visofold</a></div>
<a href="/wp-content/uploads/2025/06/Titan.pdf"><img src="https://www.broadlandwindows.co.uk/wp-content/uploads/2025/06/Titan.png"> Titan</a>`);
  assert.equal(L[0].img, 'https://www.broadlandwindows.co.uk/wp-content/uploads/2025/06/Visofold-cover.jpg');
  assert.equal(L[1].img, 'https://www.broadlandwindows.co.uk/wp-content/uploads/2025/06/Titan.png');
});

test('hardwood files named "HW_..." are Hardwood with a readable title, whatever else the name says', async () => {
  const { tidyTitle } = await import('../../scripts/fetch-brochures.mjs');
  assert.equal(guessCat('HW_Door_Merge'), 'Hardwood');
  assert.equal(guessCat('HW_Windows_Merge.pdf'), 'Hardwood');
  assert.equal(tidyTitle('HW_Door_Merge', 'https://x/HW_Door_Merge.pdf'), 'Hardwood Doors');
  assert.equal(tidyTitle('HW_Special_Merge'), 'Hardwood Special');
  assert.equal(tidyTitle('Alitherm Heritage 60'), 'Alitherm Heritage 60');
});

test('a brochure uploaded twice counts once (the newest is kept); years in names are left alone', async () => {
  const { oneEach } = await import('../../scripts/fetch-brochures.mjs');
  const U = 'https://www.broadlandwindows.co.uk/wp-content/uploads/';
  const L = oneEach(
    [
      '2025/07/Smarts-AluSpace-1.pdf',
      '2025/07/Smarts-AluSpace.pdf',
      '2025/06/HW_Door_Merge.pdf',
      '2025/05/HW_Door_Merge.pdf',
      '2025/06/SMARTS-Visofold-Series-2025.pdf',
      '2025/06/SMARTS-Visofold-Series-2024.pdf',
    ].map((f) => ({ url: U + f }))
  ).map((x) => x.url.replace(U, ''));
  assert.deepEqual(L, [
    '2025/07/Smarts-AluSpace-1.pdf',
    '2025/06/HW_Door_Merge.pdf',
    '2025/06/SMARTS-Visofold-Series-2025.pdf',
    '2025/06/SMARTS-Visofold-Series-2024.pdf',
  ]);
});

// v19.17.9: "New" only for a brochure never seen before (re-uploads and moved files keep their old date)
import { dateBrochures, fileKey } from '../../scripts/fetch-brochures.mjs';
const U = 'https://www.broadlandwindows.co.uk/wp-content/uploads/';
const BEFORE = {
  items: [
    { cat: 'Aluminium', title: 'Smarts AluSpace', url: U + '2025/07/Smarts-AluSpace.pdf', firstSeen: '2025-11-27' },
    {
      cat: 'Composite',
      title: 'Hallmark Composite Doors',
      url: U + '2025/06/Hallmark-Doors.pdf',
      firstSeen: '2025-11-27',
    },
  ],
};
const TODAY = '2026-12-01',
  OLD = '2025-12-01';

test('a re-uploaded file ("-1", or a new month folder) keeps its old date', () => {
  const { items, added } = dateBrochures(
    [
      { cat: 'Aluminium', title: 'Smarts AluSpace', url: U + '2026/11/Smarts-AluSpace-1.pdf' },
      { cat: 'Composite', title: 'Hallmark Composite Doors', url: U + '2026/12/Hallmark-Doors.pdf' },
    ],
    BEFORE,
    TODAY,
    OLD
  );
  assert.deepEqual(
    items.map((x) => x.firstSeen),
    ['2025-11-27', '2025-11-27']
  );
  assert.equal(added, 0);
  assert.equal(fileKey(U + '2026/11/Smarts-AluSpace-1.pdf'), 'smarts-aluspace.pdf');
});

test('a brochure known by its title keeps its date even under a new file name', () => {
  const { items } = dateBrochures(
    [{ cat: 'Composite', title: 'HALLMARK Composite-Doors', url: U + '2026/11/HCD-2026.pdf' }],
    BEFORE,
    TODAY,
    OLD
  );
  assert.equal(items[0].firstSeen, '2025-11-27');
});

test('a new file with a new title gets today, and is remembered', () => {
  const { items, known, added } = dateBrochures(
    [...BEFORE.items, { cat: 'Aluminium', title: 'Alitherm Heritage 70', url: U + '2026/12/Alitherm-Heritage-70.pdf' }],
    BEFORE,
    TODAY,
    OLD
  );
  assert.equal(items[2].firstSeen, TODAY);
  assert.equal(added, 1);
  assert.equal(known['f:alitherm-heritage-70.pdf'], TODAY);
});

test('a brochure taken off the website and put back is not new', () => {
  const once = dateBrochures(BEFORE.items, BEFORE, TODAY, OLD);
  const without = dateBrochures([BEFORE.items[1]], { items: once.items, known: once.known }, TODAY, OLD);
  assert.equal(without.items.length, 1); // dropped from the list straight away
  const back = dateBrochures(BEFORE.items, { items: without.items, known: without.known }, '2027-01-01', OLD);
  assert.equal(back.items[0].firstSeen, '2025-11-27');
});

test('the very first list is dated a year back, so nothing is new', () => {
  const { items, added } = dateBrochures(
    BEFORE.items.map((x) => ({ ...x, firstSeen: undefined })),
    { items: [] },
    TODAY,
    OLD
  );
  assert.ok(items.every((x) => x.firstSeen == OLD));
  assert.equal(added, 0);
});

test('nothing in brochures.json today counts as new', async () => {
  const { readFileSync } = await import('node:fs');
  const B = JSON.parse(readFileSync(new URL('../../brochures.json', import.meta.url), 'utf8'));
  const { items } = dateBrochures(B.items, B, TODAY, OLD);
  assert.ok(
    items.every((x) => x.firstSeen < '2026-11-01'),
    items.map((x) => x.firstSeen).join()
  );
});
