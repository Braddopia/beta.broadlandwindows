import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactFromRecord, recordFromContact, sameCustomer } from '../../src/domain/customers.js';

const lead = {
  name: 'Sample Customer A',
  mob1: '07700 900 111',
  home1: '01603 000 222',
  email1: 'a@example.com',
  homeAddr: '1 Sample Road',
  town: 'Norwich',
  homePc: 'nr1 1aa',
};
test('a lead becomes a Customer contact with every phone, the email and the address', () => {
  const c = contactFromRecord(lead);
  assert.equal(c.type, 'Customer');
  assert.equal(c.name, 'Sample Customer A');
  assert.deepEqual(
    c.lines.map((l) => [l.t, l.n, l.e]),
    [
      ['Mobile', '07700 900 111', 'a@example.com'],
      ['Home', '01603 000 222', ''],
    ]
  );
  assert.equal(c.phone, '07700 900 111');
  assert.equal(c.email, 'a@example.com');
  assert.equal(c.pc, 'NR1 1AA');
  assert.equal(c.addr, '1 Sample Road');
});
test('a Customer contact fills a lead back in', () => {
  const o = recordFromContact(contactFromRecord(lead));
  assert.equal(o.name, 'Sample Customer A');
  assert.equal(o.mob1, '07700 900 111');
  assert.equal(o.home1, '01603 000 222');
  assert.equal(o.email1, 'a@example.com');
  assert.equal(o.homePc, 'NR1 1AA');
  assert.equal(o.town, 'Norwich');
});
test('the same customer is matched by name with postcode or phone, not by name alone', () => {
  const c = contactFromRecord(lead);
  assert.equal(sameCustomer(c, { ...lead, homePc: 'NR1 1AA' }), true);
  assert.equal(sameCustomer(c, { ...lead, homePc: 'IP1 1AA' }), false);
  assert.equal(sameCustomer(c, { name: 'Sample Customer A', mob1: '07700900111' }), true);
  assert.equal(sameCustomer(c, { name: 'Sample Customer A', mob1: '07700 900 999' }), false);
  assert.equal(sameCustomer({ ...c, type: 'Supplier' }, lead), false);
});
