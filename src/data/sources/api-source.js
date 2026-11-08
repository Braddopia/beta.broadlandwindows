/* data/sources/api-source: placeholder for the future Microsoft 365 backend. Not used yet.

   When the backend exists, this file becomes the bridge to it, and data/sources/data-source.js
   switches to it with setSource(apiSource(...)). Pages and business rules do not change.

   Expected shape of that backend (to be confirmed when it is built):
   - sign-in: Microsoft Entra ID (MSAL already does this in features/sign-in); every request carries
     the access token, and the server takes the account type from Entra groups or app roles
   - the server checks the same permission names as domain/permissions.js ('money', 'manage')
   - records: GET/PUT/DELETE per collection and id (leads, contracts, calls, deliveries, items...),
     each with a version number so two people saving the same record get a clear message
   - lists: paged and filtered on the server (?page=&size=&stage=&from=&to=)
   - photos and files: SharePoint/OneDrive or blob storage behind short-lived links, never public
   - changes from other users: polling or a push channel, delivered through subscribe()

   Until then, readAll/saveAll keep the whole-copy shape the app uses today. */

/** @returns {import('./data-source.js').DataSource} */
export function apiSource({ baseUrl, getToken }) {
  const call = async (path, init = {}) => {
    const token = await getToken();
    const r = await fetch(baseUrl + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...(init.headers || {}) },
    });
    if (!r.ok) throw new Error('Server said ' + r.status);
    return r.status == 204 ? null : r.json();
  };
  const notYet = () => Promise.reject(new Error('The online data service is not connected yet'));
  return {
    name: 'Online (Microsoft 365)',
    savedSize: () => 0,
    readAll: () => call('/snapshot').then((x) => (x ? JSON.stringify(x) : null)),
    saveAll: (json) => {
      call('/snapshot', { method: 'PUT', body: json }).catch(() => {});
    },
    replaceAll: (json) => call('/snapshot', { method: 'PUT', body: json }).then(() => {}),
    subscribe: () => () => {},
    putPhotos: notYet,
    getPhotos: notYet,
    removePhotosExcept: () => Promise.resolve(0),
  };
}
