/* data/repository: the way pages add, change, find and remove records in a list (leads, contracts...).

   const r = repo('contracts');
   r.get(id)                  one record, or undefined
   r.find(test)               the records that pass the test
   r.page({ filter, sort, page, size })   one page of a filtered, sorted list: { rows, total }
   r.add(record, { first, keepMeta })   add a new record (at the start of the list when first is true;
                              keepMeta keeps the created date of a record moved from another list)
   r.changed(record)          after editing a record in place: stamps who changed it and when
   r.remove(test)             remove the records that pass the test; returns how many went

   Every add and change stamps record._meta = { createdAt, createdBy, updatedAt, updatedBy, version }.
   The version number lets a backend refuse a save made on an out-of-date copy.
   Save afterwards with store() and record the change with audit(), as everywhere else. */
import { state } from './state.js';

const who = () => (typeof USER == 'string' ? USER : 'Unknown');

function stamp(r, isNew, keepMeta) {
  const old = r._meta && typeof r._meta == 'object' ? r._meta : null,
    /* a new record never shares _meta with the record it was copied from */
    m = isNew ? (keepMeta && old ? { ...old } : {}) : old || {},
    now = Date.now();
  if (!m.createdAt) {
    m.createdAt = m.createdAt || now;
    m.createdBy = m.createdBy || who();
  }
  m.updatedAt = now;
  m.updatedBy = who();
  m.version = (+m.version || 0) + 1;
  r._meta = m;
  return r;
}

export function repo(name) {
  const list = () => {
    if (!Array.isArray(state[name])) state[name] = [];
    return state[name];
  };
  return {
    name,
    all: () => list(),
    get: (id) => list().find((x) => x.id == id),
    find: (test) => list().filter(test),
    page({ filter, sort, page = 1, size = 25 } = {}) {
      const rows = filter ? list().filter(filter) : list().slice();
      if (sort) rows.sort(sort);
      const start = (Math.max(1, page) - 1) * size;
      return { rows: rows.slice(start, start + size), total: rows.length };
    },
    add(r, { first = false, keepMeta = false } = {}) {
      stamp(r, true, keepMeta);
      first ? list().unshift(r) : list().push(r);
      return r;
    },
    changed: (r) => (r ? stamp(r, false) : r),
    remove(test) {
      const before = list().length;
      state[name] = list().filter((x) => !test(x));
      return before - state[name].length;
    },
  };
}

/* the record lists */
export const leads = repo('leads'),
  leadArchive = repo('leadArchive'),
  contracts = repo('contracts'),
  calls = repo('calls'),
  deliveries = repo('deliveries'),
  contacts = repo('contacts'),
  suppliers = repo('suppliers'),
  staff = repo('staff'),
  holidays = repo('hols'),
  bills = repo('fin'),
  messages = repo('notes'),
  problems = repo('bugs'),
  stockRows = repo('items');
