/* domain/job-title: the one way a job is named everywhere: "2402318 - SAMPLE CUSTOMER E".
   The job number comes first, then the job (customer) name in capitals. Plain functions (tests/unit). */

/** "number - NAME", or whichever half is known */
export function jobTitle(no, name) {
  const n = String(no ?? '').trim(),
    m = String(name ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleUpperCase('en-GB');
  return n && m ? n + ' - ' + m : n || m;
}
/** the title of a contract (or a lead): its number and customer name */
export const recTitle = (r) => (r ? jobTitle(r.id, r.name) : '');
