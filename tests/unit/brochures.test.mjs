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
  assert.equal(L[0].url, 'https://www.broadlandwindows.co.uk/wp-content/uploads/2025/07/Broadland-Secondary-Glazing.pdf');
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
