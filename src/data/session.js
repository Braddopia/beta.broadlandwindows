/* data/session: which account type is signed in on this device. Only setRoleValue changes it. */

export let ROLE = 'staff';
export function setRoleValue(r) {
  ROLE = r;
}
