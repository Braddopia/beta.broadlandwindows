/* features/contacts/customer-book: every lead and contract's customer is kept in the Contact Book as a Customer
   contact, and a new lead or contract can start from a customer already there (the "Customer" drop-down at the top
   of its Customer step fills in their name, numbers, email and address). */
import { $ } from '../../core/dom.js';
import { shortId } from '../../core/ids.js';
import { state } from '../../data/state.js';
import { contactFromRecord, recordFromContact, sameCustomer } from '../../domain/customers.js';
import { toast } from '../../ui/toast.js';
import * as repos from '../../data/repository.js';

/** the choices for the Customer drop-down: a new customer, or anyone already in the Contact Book as a Customer */
export function customerChoices() {
  return [
    ['', 'New customer (type their details below)'],
    ...state.contacts
      .filter((c) => c.type == 'Customer' && (c.name || c.co))
      .sort((a, b) => (a.name || a.co).localeCompare(b.name || b.co))
      .map((c) => [c.id, [c.name || c.co, c.town, c.pc].filter(Boolean).join(' · ')]),
  ];
}
/** save a lead or contract's customer into the Contact Book: the linked contact is brought up to date, or the same
    person is found by name with postcode or phone, or a new Customer contact is added. Boxes left empty on the
    record never wipe what the contact already has. The caller saves (store()). */
export function custToBook(r) {
  if (!r || !String(r.name || '').trim()) return null;
  const from = contactFromRecord(r);
  let c =
    (r.contact && state.contacts.find((x) => x.id == r.contact)) || state.contacts.find((x) => sameCustomer(x, r));
  if (c) {
    const keep = {};
    Object.entries(from).forEach(([k, v]) => {
      if (Array.isArray(v) ? v.length : v) keep[k] = v;
    });
    keep.type = 'Customer';
    repos.contacts.changed(Object.assign(c, keep));
  } else {
    c = { id: shortId('K'), ...from, notes: '' };
    repos.contacts.add(c);
  }
  r.contact = c.id;
  return c;
}
/** the Customer drop-down changed in a lead or contract window: fill its boxes from that contact. In a step-by-step
    form, `into` is its values, so boxes on later steps are filled in too. */
export function custFill(id, into) {
  const c = state.contacts.find((x) => x.id == id);
  if (!c) return;
  const o = recordFromContact(c);
  if (into) Object.assign(into, o, { contact: c.id });
  let n = 0;
  Object.entries(o).forEach(([k, v]) => {
    const el = $('#mbox #f_' + k);
    if (!el || el.value == v) return;
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    const box = el.closest('label,.rf');
    if (box) {
      box.classList.remove('filled');
      void box.offsetWidth;
      box.classList.add('filled');
    }
    n++;
  });
  toast(n ? 'Filled in from the Contact Book' : 'Already up to date');
}
/** the first step of the New Lead and New Contract forms: picking a customer fills in every step */
export function wzCustomer(v) {
  const s = $('#mbox #f_contact');
  if (s) s.addEventListener('change', () => custFill(s.value, v));
}
/** the Customer drop-down at the top of the New Lead and New Contract forms */
export const custPick = () => ({
  k: 'contact',
  l: 'Customer',
  t: 'select',
  o: customerChoices(),
  w: 'full',
  hint: 'Pick someone already in the Contact Book, or leave it as a new customer',
});
