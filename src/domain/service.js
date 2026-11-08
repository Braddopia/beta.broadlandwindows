/* domain/service: Service call rules: open or past, and the list views. */
import { today } from '../core/dates.js';
import { forPerson, me } from './people.js';

export const svcOpen = (c) => c.status != 'Complete',
  svcMine = (c) => {
    const m = me();
    return !!m && forPerson(m, c.fitter);
  };
export const SVCV = () => [
  ['open', 'Open', svcOpen],
  ['today', 'Visits Today', (c) => svcOpen(c) && c.visit == today()],
  ['urgent', 'Urgent', (c) => svcOpen(c) && c.priority == 'Urgent'],
  ['parts', 'Awaiting Parts', (c) => c.status == 'Awaiting parts'],
  ['nobook', 'Not Booked', (c) => svcOpen(c) && !c.visit],
  ['mine', 'My Calls', (c) => svcOpen(c) && svcMine(c)],
  ['done', 'Past Tickets', (c) => !svcOpen(c)],
  ['all', 'All', () => true],
];
