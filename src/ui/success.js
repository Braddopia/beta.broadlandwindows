/* ui/success: the moment something new is made (a contract, a lead, a contact, a service call, a holiday...), the
   banner at the bottom rises with a tick that draws itself in a ring, what was made, and a second line saying which
   one. One banner, low down out of the way, keeping Undo where there is one. Exaggerated feedback with
   follow-through (docs/UX-PRINCIPLES.md); with less motion asked for it simply shows. */
import { toast } from './toast.js';

/** celebrate('Contract Created', '1023431 - SAMPLE CUSTOMER', { label: 'Undo', run: fn }) */
export function celebrate(title, sub, action) {
  toast(title, { sub, big: true, action });
}
