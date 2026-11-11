/* domain/places: an approximate map of Norfolk for the service-call map. Plain data and functions
   (tested in tests/unit). Nothing leaves the computer: towns are placed from this list, not looked up.
   Positions are longitude / latitude, close enough to put a pin in the right part of the county. */

/* the county outline, clockwise from the Wash: the coast round to Hopton, then the Waveney and Little Ouse
   along the Suffolk border and the Fens back up to the Nene (approximate) */
export const NORFOLK = [
  [0.21, 52.8],
  [0.3, 52.8],
  [0.38, 52.78],
  [0.42, 52.8],
  [0.44, 52.84],
  [0.45, 52.875],
  [0.48, 52.91],
  [0.49, 52.94],
  [0.54, 52.97],
  [0.64, 52.975],
  [0.75, 52.975],
  [0.85, 52.97],
  [0.93, 52.965],
  [0.98, 52.975],
  [1.05, 52.96],
  [1.14, 52.945],
  [1.21, 52.945],
  [1.3, 52.933],
  [1.34, 52.917],
  [1.44, 52.877],
  [1.48, 52.855],
  [1.535, 52.825],
  [1.6, 52.79],
  [1.655, 52.755],
  [1.695, 52.715],
  [1.735, 52.65],
  [1.742, 52.605],
  [1.737, 52.575],
  [1.735, 52.54],
  [1.7, 52.52],
  [1.66, 52.535],
  [1.62, 52.53],
  [1.585, 52.49],
  [1.57, 52.465],
  [1.5, 52.455],
  [1.44, 52.45],
  [1.37, 52.42],
  [1.3, 52.398],
  [1.2, 52.375],
  [1.11, 52.366],
  [1.03, 52.37],
  [0.96, 52.368],
  [0.88, 52.385],
  [0.8, 52.395],
  [0.745, 52.395],
  [0.68, 52.43],
  [0.62, 52.45],
  [0.55, 52.45],
  [0.5, 52.455],
  [0.44, 52.47],
  [0.4, 52.49],
  [0.37, 52.5],
  [0.3, 52.51],
  [0.25, 52.52],
  [0.22, 52.56],
  [0.2, 52.6],
  [0.17, 52.64],
  [0.165, 52.68],
  [0.17, 52.72],
  [0.19, 52.76],
];
/* main roads, as the towns and points they run through (drawn as smooth lines) */
export const ROADS = [
  {
    n: 'A47',
    p: [
      [0.17, 52.68],
      "king's lynn",
      [0.55, 52.7],
      'swaffham',
      'dereham',
      [1.12, 52.655],
      [1.24, 52.6],
      [1.36, 52.615],
      'acle',
      'great yarmouth',
    ],
  },
  { n: 'A11', p: [[0.6, 52.36], 'thetford', 'attleborough', 'wymondham', [1.24, 52.6], 'norwich'] },
  {
    n: 'A140',
    p: [[1.12, 52.3], [1.13, 52.39], 'long stratton', [1.27, 52.59], 'norwich', [1.28, 52.7], 'aylsham', 'cromer'],
  },
  { n: 'A148', p: ["king's lynn", [0.62, 52.8], 'fakenham', 'holt', 'cromer'] },
  {
    n: 'A149',
    p: [
      "king's lynn",
      'snettisham',
      'hunstanton',
      [0.64, 52.96],
      'wells-next-the-sea',
      [1.02, 52.95],
      'sheringham',
      'cromer',
      'north walsham',
      'stalham',
      [1.66, 52.68],
      'great yarmouth',
    ],
  },
  { n: 'A10', p: ["king's lynn", 'downham market', [0.36, 52.5]] },
  { n: 'A1065', p: ['fakenham', 'swaffham', [0.69, 52.5], [0.62, 52.42]] },
  { n: 'A146', p: ['norwich', [1.38, 52.58], 'loddon', 'beccles', 'lowestoft'] },
  { n: 'A143', p: ['diss', 'harleston', 'bungay', 'beccles', [1.66, 52.55], 'gorleston'] },
  { n: 'A1067', p: ['norwich', 'drayton', [1.05, 52.76], 'fakenham'] },
];
/* water: the main rivers (lines) and the larger broads (lon, lat, width, height in map units) */
export const RIVERS = [
  [
    [1.297, 52.628],
    [1.39, 52.61],
    [1.47, 52.585],
    [1.57, 52.56],
    [1.64, 52.59],
    [1.7, 52.61],
    [1.735, 52.6],
  ],
  [
    [1.25, 52.79],
    [1.33, 52.74],
    [1.403, 52.708],
    [1.47, 52.69],
    [1.546, 52.64],
    [1.62, 52.635],
    [1.71, 52.615],
  ],
  [
    [0.85, 52.83],
    [0.98, 52.76],
    [1.1, 52.71],
    [1.2, 52.68],
    [1.28, 52.645],
    [1.297, 52.628],
  ],
  [
    [0.36, 52.5],
    [0.37, 52.6],
    [0.39, 52.72],
    [0.39, 52.79],
  ],
  [
    [1.62, 52.53],
    [1.585, 52.49],
    [1.5, 52.455],
    [1.37, 52.42],
    [1.2, 52.375],
    [1.03, 52.37],
  ],
];
export const BROADS = [
  [1.58, 52.74, 26, 13],
  [1.497, 52.74, 13, 20],
  [1.42, 52.697, 14, 8],
  [1.655, 52.607, 34, 9],
  [1.6, 52.7, 12, 8],
];
/* places named on the map as landmarks, whether or not there is a call there */
export const LANDMARKS = [
  "king's lynn",
  'hunstanton',
  'wells-next-the-sea',
  'cromer',
  'great yarmouth',
  'norwich',
  'thetford',
  'swaffham',
  'dereham',
  'fakenham',
  'diss',
  'downham market',
  'north walsham',
  'wymondham',
  'aylsham',
  'lowestoft',
  'attleborough',
];
/* towns and villages the company works in (longitude, latitude) */
export const TOWNS = {
  norwich: [1.297, 52.63],
  'great yarmouth': [1.728, 52.608],
  gorleston: [1.725, 52.578],
  'caister-on-sea': [1.733, 52.651],
  "king's lynn": [0.398, 52.754],
  thetford: [0.745, 52.413],
  dereham: [0.937, 52.681],
  wymondham: [1.113, 52.57],
  'north walsham': [1.388, 52.822],
  aylsham: [1.252, 52.793],
  cromer: [1.301, 52.931],
  sheringham: [1.21, 52.943],
  holt: [1.091, 52.906],
  diss: [1.11, 52.376],
  attleborough: [1.019, 52.518],
  swaffham: [0.687, 52.648],
  fakenham: [0.848, 52.835],
  hunstanton: [0.493, 52.94],
  'downham market': [0.383, 52.603],
  'wells-next-the-sea': [0.851, 52.953],
  watton: [0.827, 52.571],
  loddon: [1.48, 52.535],
  'long stratton': [1.231, 52.487],
  harleston: [1.3, 52.403],
  acle: [1.546, 52.637],
  wroxham: [1.403, 52.708],
  hoveton: [1.41, 52.714],
  stalham: [1.516, 52.772],
  reepham: [1.111, 52.761],
  poringland: [1.348, 52.563],
  hethersett: [1.181, 52.6],
  costessey: [1.214, 52.66],
  taverham: [1.205, 52.684],
  drayton: [1.225, 52.677],
  sprowston: [1.326, 52.655],
  'thorpe st andrew': [1.343, 52.636],
  hellesdon: [1.255, 52.655],
  mundesley: [1.432, 52.876],
  hingham: [0.986, 52.58],
  brundall: [1.432, 52.623],
  blofield: [1.453, 52.632],
  bungay: [1.437, 52.456],
  beccles: [1.566, 52.457],
  lowestoft: [1.751, 52.475],
  'east harling': [0.928, 52.437],
  'old buckenham': [1.044, 52.488],
  snettisham: [0.5, 52.877],
  heacham: [0.494, 52.909],
  'terrington st clement': [0.296, 52.755],
  mattishall: [1.03, 52.659],
  horsford: [1.244, 52.7],
  rackheath: [1.373, 52.676],
  cringleford: [1.244, 52.604],
  brooke: [1.37, 52.543],
  hemsby: [1.693, 52.694],
  martham: [1.627, 52.704],
  'ormesby st margaret': [1.689, 52.672],
};
/* other ways people write the same town */
const ALIAS = {
  'gt yarmouth': 'great yarmouth',
  yarmouth: 'great yarmouth',
  'kings lynn': "king's lynn",
  'king s lynn': "king's lynn",
  lynn: "king's lynn",
  'east dereham': 'dereham',
  caister: 'caister-on-sea',
  'caister on sea': 'caister-on-sea',
  wells: 'wells-next-the-sea',
  'wells next the sea': 'wells-next-the-sea',
  thorpe: 'thorpe st andrew',
  'thorpe st. andrew': 'thorpe st andrew',
  'new costessey': 'costessey',
  'old costessey': 'costessey',
  'gorleston-on-sea': 'gorleston',
  'gorleston on sea': 'gorleston',
  downham: 'downham market',
  'north walsham town': 'north walsham',
};
/** the TOWNS key for a town as typed, or '' when it is not on the map */
export function townKey(t) {
  const k = String(t || '')
    .toLowerCase()
    .replace(/,.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (TOWNS[k]) return k;
  if (ALIAS[k] && TOWNS[ALIAS[k]]) return ALIAS[k];
  return '';
}
/* map drawing: longitude is narrowed by cos(latitude) so the county keeps its shape */
export const MAP_W = 1000,
  MAP_H = 660;
const LON0 = 0.1,
  LAT0 = 53.01,
  K = 969,
  COS = Math.cos((52.6 * Math.PI) / 180);
/** [x, y] on the map for a longitude / latitude */
export const project = ([lon, lat]) => [
  Math.round((lon - LON0) * COS * K * 10) / 10,
  Math.round((LAT0 - lat) * K * 10) / 10,
];
/** a smooth line through points (each a [lon, lat] or the name of a town) */
export function smoothPath(points, closed) {
  const P = points.map((q) => project(typeof q == 'string' ? TOWNS[q] : q));
  if (P.length < 3) return P.map((q, i) => (i ? 'L' : 'M') + q.join(' ')).join(' ');
  const at = (i) => (closed ? P[(i + P.length) % P.length] : P[Math.max(0, Math.min(P.length - 1, i))]),
    r = (v) => Math.round(v * 10) / 10;
  let d = 'M' + P[0].join(' ');
  for (let i = 0; i < (closed ? P.length : P.length - 1); i++) {
    const p0 = at(i - 1),
      p1 = at(i),
      p2 = at(i + 1),
      p3 = at(i + 2);
    /* a Catmull-Rom curve, written as the cubic curve SVG understands */
    d += ` C${r(p1[0] + (p2[0] - p0[0]) / 6)} ${r(p1[1] + (p2[1] - p0[1]) / 6)} ${r(p2[0] - (p3[0] - p1[0]) / 6)} ${r(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]} ${p2[1]}`;
  }
  return d + (closed ? ' Z' : '');
}
/** the county outline as an SVG path */
export const outlinePath = () => smoothPath(NORFOLK, true);
/** calls grouped by town: [{ key, name, x, y, items }] for towns on the map, and the ones that are not */
export function groupByTown(items, townOf) {
  const on = new Map(),
    off = [];
  items.forEach((it) => {
    const k = townKey(townOf(it));
    if (!k) return off.push(it);
    if (!on.has(k)) {
      const [x, y] = project(TOWNS[k]);
      on.set(k, { key: k, name: k.replace(/(^|[\s-])\S/g, (c) => c.toUpperCase()), x, y, items: [] });
    }
    on.get(k).items.push(it);
  });
  return { towns: [...on.values()].sort((a, b) => b.items.length - a.items.length), off };
}
