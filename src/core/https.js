/* core/https: Always use HTTPS when hosted. */

/* start-up step (run once by main.js) */
export function forceHttps() {
  /* always run over HTTPS when hosted (local files and localhost are left alone) */
  if (location.protocol == 'http:' && !/^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname))
    location.replace('https://' + location.host + location.pathname + location.search + location.hash);
}
