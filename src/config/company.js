/* config/company: Company details, with the values saved in Settings laid over the defaults. */
import { state } from '../data/state.js';

export const company = {
  name: 'Broadland Windows, Doors & Garden Rooms',
  tel: '01603 483002',
  em: 'sales@broadlandwindows.co.uk',
  em2: 'commercial@broadlandwindows.co.uk',
  web: 'www.broadlandwindows.co.uk',
  addr: '148 Hellesdon Park Road, Norwich, Norfolk NR6 5DR',
};
export function coLoad() {
  state.co = state.co && typeof state.co == 'object' ? state.co : {};
  Object.assign(company, { vat: '20', depRes: 20, depCom: 25, terms: 14, invPrefix: 'INV-' }, state.co);
  state.bugs = Array.isArray(state.bugs) ? state.bugs : [];
  state.num = state.num && typeof state.num == 'object' ? state.num : {};
}
