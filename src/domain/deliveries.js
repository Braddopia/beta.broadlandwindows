/* domain/deliveries: Delivery status from the due date, and which window each delivery falls in. */
import { today } from '../core/dates.js';

/* set the supplier's status page under Suppliers > Edit > Website */
export const ORDDONE = /complete|despatch|dispatch|deliver|cancel/i;
/* delivery status comes from the due date: over a week away Ordered, within 7 days Due, within 4 days In transit, past the date Overdue. Received is set by hand. */
export const dDays = (x) =>
  Math.round((new Date((x.due || today()) + 'T00:00') - new Date(today() + 'T00:00')) / 864e5);
export const dAuto = (x) =>
  x.status == 'Received'
    ? 'Received'
    : !x.due
      ? 'Ordered'
      : dDays(x) < 0
        ? 'Overdue'
        : dDays(x) == 0
          ? 'Due today'
          : dDays(x) <= 4
            ? 'In transit'
            : dDays(x) <= 7
              ? 'Due'
              : 'Ordered';
/* ---------------- deliveries ---------------- */
/* delivery time windows: overdue, today, rest of this week (to Sunday; at weekends the coming week), rest of this month, later, received */
export const DWIN = [
  ['od', 'Overdue', 'r'],
  ['td', 'Due Today', 'y'],
  ['wk', 'Due This Week', ''],
  ['mo', 'Due This Month', ''],
  ['lt', 'Later', ''],
  ['rec', 'Received', 'g'],
];
export const dLate = (x) => dAuto(x) == 'Overdue',
  dDueToday = (x) => dAuto(x) == 'Due today';
export function delWin(x) {
  if (x.status == 'Received') return 'rec';
  const td = today();
  if (x.due < td) return 'od';
  if (x.due == td) return 'td';
  const d = new Date(td + 'T00:00'),
    we = new Date(d);
  we.setDate(d.getDate() + ((7 - d.getDay()) % 7) + (d.getDay() == 6 || d.getDay() == 0 ? 7 : 0));
  /* at the weekend, 'this week' means the coming working week */ const me = new Date(
      d.getFullYear(),
      d.getMonth() + 1,
      0
    ),
    iso = (z) =>
      z.getFullYear() + '-' + String(z.getMonth() + 1).padStart(2, '0') + '-' + String(z.getDate()).padStart(2, '0');
  return x.due <= iso(we) ? 'wk' : x.due <= iso(me) ? 'mo' : 'lt';
}
