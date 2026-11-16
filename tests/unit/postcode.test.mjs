// Postcodes for the service-call map: found wherever typed, tidied, and distances from the office.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callPostcode, driveText, milesApart, outcodeOf, pcNorm } from '../../src/domain/postcode.js';

test('a postcode is tidied to the usual form, wherever it was typed', () => {
  assert.equal(pcNorm('nr65dr'), 'NR6 5DR');
  assert.equal(pcNorm('12 Example Road, Wymondham, NR18 0XA'), 'NR18 0XA');
  assert.equal(pcNorm('IP22  4AB'), 'IP22 4AB');
  assert.equal(pcNorm('Norwich'), '');
  assert.equal(outcodeOf('NR6 5DR'), 'NR6');
  assert.equal(outcodeOf('pe30'), 'PE30');
  assert.equal(outcodeOf('nowhere'), '');
});

test("a call's postcode: its own box first, then the contract's site or home postcode, then the address", () => {
  const k = { homePc: 'NR18 0XA', siteSame: 'Different', sitePc: 'NR12 8AB' };
  assert.equal(callPostcode({ pc: 'nr1 1aa' }, k), 'NR1 1AA');
  assert.equal(callPostcode({}, k), 'NR12 8AB');
  assert.equal(callPostcode({}, { homePc: 'NR18 0XA' }), 'NR18 0XA');
  assert.equal(callPostcode({ address: '3 Mill Lane, Holt NR25 6AB' }), 'NR25 6AB');
  assert.equal(callPostcode({ town: 'Holt' }), '');
});

test('distance and a rough drive time from the office', () => {
  const office = [52.655, 1.258],
    holt = [52.906, 1.091];
  const mi = milesApart(office, holt);
  assert.ok(mi > 18 && mi < 20, String(mi));
  assert.equal(milesApart(office, office), 0);
  assert.match(driveText(mi), /^about \d+ min$/);
  assert.equal(driveText(60), 'about 2 hr 5 min');
});
