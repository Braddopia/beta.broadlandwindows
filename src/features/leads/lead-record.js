/* features/leads/lead-record: The lead window: its steps, fields and saving. */
import { fd, today } from '../../core/dates.js';
import { $ } from '../../core/dom.js';
import { m0 } from '../../core/format.js';
import { audit } from '../../data/audit.js';
import { state } from '../../data/state.js';
import { LEAD_CK } from '../../domain/checklists.js';
import { PHONES, custCompat } from '../../domain/customers.js';
import { pcNorm } from '../../domain/postcode.js';
import { custToBook } from '../contacts/customer-book.js';
import { nextLeadId } from '../../domain/numbering.js';
import { RANDOM_SP, spResolve } from '../../domain/people.js';
import { can, canSee } from '../../domain/permissions.js';
import { delLead, leadList } from './leads.js';
import { apptTab } from '../records/appointments.js';
import { addrTab, detailsTab } from '../records/record-parts.js';
import { reportCust } from '../contracts/documents.js';
import { stgSet } from '../records/stages.js';
import { ckTab } from '../records/checklist.js';
import { APPTF, CUSTF, GDPRF, LEADF } from '../records/fields.js';
import { logTab } from '../records/notes.js';
import { photoTab } from '../records/photos-docs.js';
import { RECORDS, recConvert, recordWin } from '../records/record-window.js';
import { opsTab } from '../records/survey.js';
import { toast } from '../../ui/toast.js';
import * as repos from '../../data/repository.js';

/* start-up step (run once by main.js) */
export function defineLeadRecord() {
  RECORDS.lead = {
    label: 'Lead',
    get: (id) => state.leads.find((l) => l.id == id),
    order: () => leadList().map((l) => l.id),
    blank: () => ({
      id: nextLeadId(),
      created: today(),
      stage: 'New',
      source: 'Website',
      owner: RANDOM_SP,
      takenBy: USER,
      invSame: 'Same as home',
      siteSame: 'Same as home',
      addrType: 'Home',
      log: [],
      appts: [],
      chk: {},
    }),
    heading: (W) =>
      `${W.v.id}  ${[W.v.title, W.v.name].filter(Boolean).join(' ') || 'New lead'}${W.v.company ? ' · ' + W.v.company : ''}`,
    headStats: (W) =>
      `<span><small>Net Value</small><b>${m0(W.v.value)}</b></span><span><small>Next Action</small><b>${W.v.followup ? fd(W.v.followup) : '-'}</b></span>`,
    reports: (W) => reportCust('lead', W.id),
    /* the Advanced menu: [words, action, arguments, style] */
    advanced: (W) => [
      ...(canSee('contracts') && W.v.stage != 'Lost' ? [['Convert To Contract', 'convert']] : []),
      W.v.stage == 'Lost' ? ['Reopen This Lead', 'stage', ['New']] : ['Mark As Lost', 'stage', ['Lost']],
      ...(can('manage') ? [['Delete This Lead', 'remove', [], 'del']] : []),
    ],
    run: {
      convert: () => recConvert(),
      stage: (s) => stgSet(s),
      remove: () => delLead(recordWin.id),
    },
    fields: (W) => [...LEADF(W), ...CUSTF, ...GDPRF, ...APPTF(), { k: 'notes', l: 'Notes', t: 'area' }],
    tabs: (W) => [
      { k: 'customer', t: 'Address', h: addrTab },
      {
        k: 'details',
        t: 'Details',
        h: (W) =>
          detailsTab(
            W,
            LEADF(W).map((f) => ({ ...f, g: f.g == 'Lead' ? '' : f.g, half: f.g == 'Result' ? 'r' : '' }))
          ),
      },
      { k: 'appts', t: 'Appointments', h: apptTab },
      { k: 'survey', t: 'Survey', h: opsTab },
      { k: 'check', t: 'Checklist', h: (W) => ckTab(W, LEAD_CK) },
      { k: 'notes', t: 'Notes etc', h: (W) => logTab(W, 'notes') },
      { k: 'docs', t: 'Documents', one: 'Document', cnt: 1, n: (W.v.photos || []).length, h: photoTab },
    ],
    check: (W, o) => {
      if (!o.name) return 'Customer name is needed (Customer step)';
      if (!PHONES.some((k) => o[k])) return 'Add at least one phone number (Customer step)';
      if (!o.homeAddr) return 'Address line 1 is needed (Customer step)';
      if (!o.town) return 'Town is needed (Customer step)';
      if (!pcNorm(o.homePc))
        return o.homePc
          ? 'That postcode does not look right, for example NR6 5DR (Customer step)'
          : 'Postcode is needed (Customer step)';
      if (can('manage') && o.id && o.id != W.id) {
        if (!/^L\d{4}$/.test(o.id)) return 'Lead numbers look like L0001';
        if (state.leads.some((x) => x.id == o.id)) return 'Lead number ' + o.id + ' is already used';
      }
    },
    save: (W, o) => {
      if (o.owner == RANDOM_SP) {
        o.owner = spResolve(o.owner);
        setTimeout(() => toast('Lead given to ' + o.owner), 400);
      }
      const isNew = W.isNew,
        l = isNew
          ? { id: nextLeadId(), log: [{ d: today(), t: 'Lead created', by: USER }] }
          : state.leads.find((x) => x.id == W.id);
      if (!l) return;
      const a = l.stage;
      if (o.prob === 0 && !($('#f_prob').value || '').trim()) o.prob = '';
      const nid2 =
        can('manage') && o.id && /^L\d{4}$/.test(o.id) && !state.leads.some((x) => x !== l && x.id == o.id)
          ? o.id
          : null;
      delete o.id;
      if (nid2 && nid2 != l.id) {
        audit('Lead number changed', l.id, 'to ' + nid2);
        l.id = nid2;
      }
      Object.assign(l, o, { log: W.v.log, appts: W.v.appts || [] });
      if (l.stage == 'Won') l.prob = 100;
      else if (l.stage == 'Lost') l.prob = 0;
      if (!isNew && a != o.stage) l.log.unshift({ d: today(), t: 'Stage: ' + a + ' to ' + o.stage, by: USER });
      if (isNew) {
        l.log = [...W.v.log, { d: today(), t: 'Lead created', by: USER }];
        repos.leads.add(l);
      } else repos.leads.changed(l);
      custCompat(l);
      l.homePc = pcNorm(l.homePc) || l.homePc;
      custToBook(l);
      audit(isNew ? 'Lead added' : 'Lead edited', l.id, l.name);
      return l.id;
    },
  };
}
