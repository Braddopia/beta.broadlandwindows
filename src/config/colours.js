/* config/colours: the preset frame colours offered in the colour picker, and their swatch colours. */

export const PRE = [
  ['Black', '#3a3a3a'],
  ['Grey', '#8a8a8a'],
  ['Anthracite', '#383e42'],
  ['White', '#e8e6e0'],
  ['Cream', '#efe3c6'],
  ['Gold', '#c9a24b'],
  ['Silver', '#b9b9b9'],
  ['Brown', '#6b4a2f'],
  ['Oak', '#b07a3c'],
  ['Green', '#2f6b4a'],
  ['Red', '#a33030'],
  ['Blue', '#034ea2'],
];
/* swatch colour for a typed colour name (grey when unknown) */
export const hex = (n) =>
  Object.fromEntries(PRE.map(([a, b]) => [a.toLowerCase(), b]))[String(n).trim().toLowerCase()] || '#c9c6bd';
