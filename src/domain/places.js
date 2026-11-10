/* domain/places: an approximate map of Norfolk for the service-call map. Plain data and functions
   (tested in tests/unit). Nothing leaves the computer: towns are placed from this list, not looked up.
   Positions are longitude / latitude, close enough to put a pin in the right part of the county. */

/* the county outline, clockwise from the Wash (approximate) */
export const NORFOLK = [
  [0.19, 52.74],
  [0.33, 52.8],
  [0.4, 52.78],
  [0.46, 52.87],
  [0.49, 52.94],
  [0.57, 52.97],
  [0.7, 52.98],
  [0.85, 52.97],
  [1.0, 52.96],
  [1.2, 52.95],
  [1.3, 52.93],
  [1.43, 52.88],
  [1.53, 52.82],
  [1.64, 52.75],
  [1.7, 52.7],
  [1.74, 52.64],
  [1.74, 52.58],
  [1.73, 52.53],
  [1.62, 52.53],
  [1.55, 52.49],
  [1.45, 52.46],
  [1.3, 52.4],
  [1.15, 52.37],
  [1.0, 52.38],
  [0.9, 52.4],
  [0.75, 52.41],
  [0.62, 52.45],
  [0.5, 52.46],
  [0.42, 52.5],
  [0.35, 52.53],
  [0.25, 52.53],
  [0.2, 52.58],
  [0.17, 52.63],
  [0.14, 52.67],
  [0.18, 52.71],
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
/** the county outline as an SVG path */
export const outlinePath = () => NORFOLK.map((p, i) => (i ? 'L' : 'M') + project(p).join(' ')).join(' ') + ' Z';
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
