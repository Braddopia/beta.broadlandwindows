/* core/crypto: SHA-256 hashing (used for PINs). */

/* ---- SHA-256 (used for PIN hashes; works offline and on file://) ---- */
export function sha256(str) {
  const K = [],
    H = [];
  let n = 2,
    c = 0;
  const prime = (x) => {
      for (let i = 2; i * i <= x; i++) if (x % i == 0) return false;
      return true;
    },
    frac = (x) => ((x - (x | 0)) * 4294967296) | 0;
  while (c < 64) {
    if (prime(n)) {
      if (c < 8) H[c] = frac(Math.pow(n, 1 / 2));
      K[c] = frac(Math.pow(n, 1 / 3));
      c++;
    }
    n++;
  }
  const b = unescape(encodeURIComponent(str)),
    l = b.length * 8,
    w = [];
  for (let i = 0; i < b.length; i++) w[i >> 2] |= b.charCodeAt(i) << ((3 - (i % 4)) * 8);
  w[l >> 5] |= 0x80 << (24 - (l % 32));
  w[(((l + 64) >> 9) << 4) + 15] = l;
  const r = (x, k) => (x >>> k) | (x << (32 - k));
  for (let j = 0; j < w.length; j += 16) {
    const W = [];
    for (let k = 0; k < 16; k++) W[k] = w[j + k] | 0;
    const h = H.slice();
    for (let i = 0; i < 64; i++) {
      if (i >= 16) {
        const a = W[i - 15],
          d = W[i - 2];
        W[i] = (W[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + W[i - 7] + (r(d, 17) ^ r(d, 19) ^ (d >>> 10))) | 0;
      }
      const e = h[4],
        t1 = (h[7] + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & h[5]) ^ (~e & h[6])) + K[i] + W[i]) | 0,
        a0 = h[0],
        t2 = ((r(a0, 2) ^ r(a0, 13) ^ r(a0, 22)) + ((a0 & h[1]) ^ (a0 & h[2]) ^ (h[1] & h[2]))) | 0;
      h.unshift((t1 + t2) | 0);
      h[4] = (h[4] + t1) | 0;
      h.pop();
    }
    for (let i = 0; i < 8; i++) H[i] = (H[i] + h[i]) | 0;
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
