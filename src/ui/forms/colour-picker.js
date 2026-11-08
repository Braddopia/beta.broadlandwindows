/* ui/forms/colour-picker: The colour picker (RAL colours and finishes). */
import { onClick } from '../../core/actions.js';
import { $, esc } from '../../core/dom.js';
import { SAFE } from '../../data/sanitize.js';

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
export const hex = (n) =>
  Object.fromEntries(PRE.map(([a, b]) => [a.toLowerCase(), b]))[String(n).trim().toLowerCase()] || '#c9c6bd';
export function colourField(f, v) {
  const base = f.k.slice(0, -4),
    hx = SAFE.hex(v[base] || '#8a8a8a');
  return `<div class="inl"><input id="f_${f.k}" placeholder="Colour name (optional)" maxlength="30" value="${esc(v[f.k] ?? '')}"><input type="hidden" id="f_${f.k}_hex" value="${hx}"><button type="button" class="cbtn" id="cb_${f.k}" style="background:${hx}" title="Pick a colour" aria-label="Pick a colour" ${onClick('cpOpen', f.k)}></button></div><div class="sws"><button type="button" class="mini" ${onClick('pickC', f.k, '', '#8a8a8a')}>No Colour</button>${PRE.map(([n, h]) => `<button type="button" class="sw" title="${n}" aria-label="${n}" style="background:${h}" ${onClick('pickC', f.k, n, h)}></button>`).join('')}</div>`;
}
export function pickC(k, n, h) {
  $('#f_' + k).value = n;
  $('#f_' + k + '_hex').value = h;
  const b = $('#cb_' + k);
  if (b) b.style.background = h;
}
export function pickHex(k) {
  const e = $('#f_' + k);
  if (!e.value) e.value = 'Custom';
}
/* ---- colour picker: window and door finishes first, then any colour ---- */
/* RAL Classic: [number, name, screen colour] (screen colours are close, not exact: always check a real swatch) */
export const RAL =
  `1000|Green beige|BEBD7F;1001|Beige|C2B078;1002|Sand yellow|C6A664;1003|Signal yellow|E5BE01;1004|Golden yellow|CDA434;1005|Honey yellow|A98307;1006|Maize yellow|E4A010;1007|Daffodil yellow|DC9D00;1011|Brown beige|8A6642;1012|Lemon yellow|C7B446;1013|Oyster white|EAE6CA;1014|Ivory|E1CC4F;1015|Light ivory|E6D690;1016|Sulfur yellow|EDFF21;1017|Saffron yellow|F5D033;1018|Zinc yellow|F8F32B;1019|Grey beige|9E9764;1020|Olive yellow|999950;1021|Rape yellow|F3DA0B;1023|Traffic yellow|FAD201;1024|Ochre yellow|AEA04B;1026|Luminous yellow|FFFF00;1027|Curry|9D9101;1028|Melon yellow|F4A900;1032|Broom yellow|D6AE01;1033|Dahlia yellow|F3A505;1034|Pastel yellow|EFA94A;1035|Pearl beige|6A5D4D;1036|Pearl gold|705335;1037|Sun yellow|F39F18;2000|Yellow orange|ED760E;2001|Red orange|C93C20;2002|Vermilion|CB2821;2003|Pastel orange|FF7514;2004|Pure orange|F44611;2005|Luminous orange|FF2301;2007|Luminous bright orange|FFA420;2008|Bright red orange|F75E25;2009|Traffic orange|F54021;2010|Signal orange|D84B20;2011|Deep orange|EC7C26;2012|Salmon orange|E55137;2013|Pearl orange|C35831;3000|Flame red|AF2B1E;3001|Signal red|A52019;3002|Carmine red|A2231D;3003|Ruby red|9B111E;3004|Purple red|75151E;3005|Wine red|5E2129;3007|Black red|412227;3009|Oxide red|642424;3011|Brown red|781F19;3012|Beige red|C1876B;3013|Tomato red|A12312;3014|Antique pink|D36E70;3015|Light pink|EA899A;3016|Coral red|B32821;3017|Rose|E63244;3018|Strawberry red|D53032;3020|Traffic red|CC0605;3022|Salmon pink|D95030;3024|Luminous red|F80000;3026|Luminous bright red|FE0000;3027|Raspberry red|C51D34;3028|Pure red|CB3234;3031|Orient red|B32428;3032|Pearl ruby red|721422;3033|Pearl pink|B44C43;4001|Red lilac|6D3F5B;4002|Red violet|922B3E;4003|Heather violet|DE4C8A;4004|Claret violet|641C34;4005|Blue lilac|6C4675;4006|Traffic purple|A03472;4007|Purple violet|4A192C;4008|Signal violet|924E7D;4009|Pastel violet|A18594;4010|Telemagenta|CF3476;4011|Pearl violet|8673A1;4012|Pearl blackberry|6C6874;5000|Violet blue|354D73;5001|Green blue|1F3438;5002|Ultramarine blue|20214F;5003|Sapphire blue|1D1E33;5004|Black blue|18171C;5005|Signal blue|1E2460;5007|Brilliant blue|3E5F8A;5008|Grey blue|26252D;5009|Azure blue|025669;5010|Gentian blue|0E294B;5011|Steel blue|231A24;5012|Light blue|3B83BD;5013|Cobalt blue|1E213D;5014|Pigeon blue|606E8C;5015|Sky blue|2271B3;5017|Traffic blue|063971;5018|Turquoise blue|3F888F;5019|Capri blue|1B5583;5020|Ocean blue|1D334A;5021|Water blue|256D7B;5022|Night blue|252850;5023|Distant blue|49678D;5024|Pastel blue|5D9B9B;5025|Pearl gentian blue|2A6478;5026|Pearl night blue|102C54;6000|Patina green|316650;6001|Emerald green|287233;6002|Leaf green|2D572C;6003|Olive green|424632;6004|Blue green|1F3A3D;6005|Moss green|2F4538;6006|Grey olive|3E3B32;6007|Bottle green|343B29;6008|Brown green|39352A;6009|Fir green|31372B;6010|Grass green|35682D;6011|Reseda green|587246;6012|Black green|343E40;6013|Reed green|6C7156;6014|Yellow olive|47402E;6015|Black olive|3B3C36;6016|Turquoise green|1E5945;6017|May green|4C9141;6018|Yellow green|57A639;6019|Pastel green|BDECB6;6020|Chrome green|2E3A23;6021|Pale green|89AC76;6022|Olive drab|25221B;6024|Traffic green|308446;6025|Fern green|3D642D;6026|Opal green|015D52;6027|Light green|84C3BE;6028|Pine green|2C5545;6029|Mint green|20603D;6032|Signal green|317F43;6033|Mint turquoise|497E76;6034|Pastel turquoise|7FB5B5;6035|Pearl green|1C542D;6036|Pearl opal green|193737;6037|Pure green|008F39;6038|Luminous green|00BB2D;7000|Squirrel grey|78858B;7001|Silver grey|8A9597;7002|Olive grey|7E7B52;7003|Moss grey|6C7059;7004|Signal grey|969992;7005|Mouse grey|646B63;7006|Beige grey|6D6552;7008|Khaki grey|6A5F31;7009|Green grey|4D5645;7010|Tarpaulin grey|4C514A;7011|Iron grey|434B4D;7012|Basalt grey|4E5754;7013|Brown grey|464531;7015|Slate grey|434750;7016|Anthracite grey|293133;7021|Black grey|23282B;7022|Umbra grey|332F2C;7023|Concrete grey|686C5E;7024|Graphite grey|474A51;7026|Granite grey|2F353B;7030|Stone grey|8B8C7A;7031|Blue grey|474B4E;7032|Pebble grey|B8B799;7033|Cement grey|7D8471;7034|Yellow grey|8F8B66;7035|Light grey|D7D7D7;7036|Platinum grey|7F7679;7037|Dusty grey|7D7F7D;7038|Agate grey|B5B8B1;7039|Quartz grey|6C6960;7040|Window grey|9DA1AA;7042|Traffic grey A|8D948D;7043|Traffic grey B|4E5452;7044|Silk grey|CAC4B0;7045|Telegrey 1|909090;7046|Telegrey 2|82898F;7047|Telegrey 4|D0D0D0;7048|Pearl mouse grey|898176;8000|Green brown|826C34;8001|Ochre brown|955F20;8002|Signal brown|6C3B2A;8003|Clay brown|734222;8004|Copper brown|8E402A;8007|Fawn brown|59351F;8008|Olive brown|6F4F28;8011|Nut brown|5B3A29;8012|Red brown|592321;8014|Sepia brown|382C1E;8015|Chestnut brown|633A34;8016|Mahogany brown|4C2F27;8017|Chocolate brown|45322E;8019|Grey brown|403A3A;8022|Black brown|212121;8023|Orange brown|A65E2E;8024|Beige brown|79553D;8025|Pale brown|755C48;8028|Terra brown|4E3B31;8029|Pearl copper|763C28;9001|Cream|FDF4E3;9002|Grey white|E7EBDA;9003|Signal white|F4F4F4;9004|Signal black|282828;9005|Jet black|0A0A0A;9006|White aluminium|A5A5A5;9007|Grey aluminium|8F8F8F;9010|Pure white|FFFFFF;9011|Graphite black|1C1C1C;9016|Traffic white|F6F6F6;9017|Traffic black|1E1E1E;9018|Papyrus white|D7D7D7;9022|Pearl light grey|9C9C9C;9023|Pearl dark grey|828282`
    .split(';')
    .map((x) => {
      const [n, m, h] = x.split('|');
      return [n, m, '#' + h.toLowerCase()];
    });
export const ralLabel = (r) => r[1].replace(/\b\w/g, (c) => c.toUpperCase()) + ' (RAL ' + r[0] + ')';
export const ralNear = (hx) => {
  const c = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16)),
    a = c(hx);
  let b = null,
    bd = 1e9;
  RAL.forEach((r) => {
    const q = c(r[2]),
      rm = (a[0] + q[0]) / 2,
      d = (2 + rm / 256) * (a[0] - q[0]) ** 2 + 4 * (a[1] - q[1]) ** 2 + (2 + (255 - rm) / 256) * (a[2] - q[2]) ** 2;
    if (d < bd) {
      bd = d;
      b = r;
    }
  });
  return b;
};
export const ralFind = (q) => {
  q = String(q || '')
    .trim()
    .toLowerCase()
    .replace(/^ral\s*/, '');
  if (!q) return [];
  return RAL.filter((r) => r[0].startsWith(q) || r[1].toLowerCase().includes(q)).slice(0, 6);
};
export const FIN_RAL = [
  '9016',
  '9001',
  '7038',
  '7035',
  '7015',
  '7016',
  '7012',
  '9005',
  '8022',
  '6009',
  '7032',
  '3003',
  '5011',
].map((n) => RAL.find((r) => r[0] == n));
export const FINISH = [
  ...FIN_RAL.map((r) => [ralLabel(r), r[2]]),
  ['Chartwell Green', '#a9bba5'],
  ['Golden Oak', '#b5752f'],
  ['Irish Oak', '#8a5a33'],
  ['Rosewood', '#5a2a1f'],
  ['Light Oak', '#c79a5c'],
  ['Gold', '#c9a24b'],
  ['Silver', '#b9b9b9'],
];
export let CP = { k: '', h: 0, s: 0, v: 0 };
export const hsv2hex = (h, s, v) => {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return (
    '#' +
    [f(5), f(3), f(1)]
      .map((x) =>
        Math.round(x * 255)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
};
export const hex2hsv = (x) => {
  const n = parseInt(x.slice(1), 16),
    r = ((n >> 16) & 255) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255,
    mx = Math.max(r, g, b),
    d = mx - Math.min(r, g, b);
  let h = 0;
  if (d) {
    h = mx == r ? ((g - b) / d) % 6 : mx == g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: mx ? d / mx : 0, v: mx };
};
export function cpOpen(k) {
  let p = $('#cpop');
  if (!p) {
    p = document.createElement('div');
    p.id = 'cpop';
    document.body.appendChild(p);
    document.addEventListener('mousedown', (e) => {
      const q = $('#cpop');
      if (q && q.classList.contains('open') && !e.target.closest('#cpop,.cbtn')) q.classList.remove('open');
    });
  }
  if (p.classList.contains('open') && CP.k == k) {
    p.classList.remove('open');
    return;
  }
  const hx = SAFE.hex($('#f_' + k + '_hex').value);
  CP = { k, ...hex2hsv(hx), ral: null };
  const cur = ($('#f_' + k).value || '').toLowerCase();
  p.innerHTML = `<div class="cp-h"><b>Pick a colour</b><button type="button" class="cp-x" aria-label="Close" data-act="cpClose">&times;</button></div>
   <small class="cp-l">Window and door finishes</small><div class="cp-g">${FINISH.map(([n, h]) => `<button type="button" class="cp-s ${cur == n.toLowerCase() ? 'on' : ''}" title="${esc(n)}" ${onClick('cpPick', n, h)}><i style="background:${h}"></i><span>${esc((/RAL \d+/.exec(n) || [n])[0])}</span></button>`).join('')}</div>
   <small class="cp-l">Any colour</small><div class="cp-sv" id="cpSv"><i id="cpKnob"></i></div><input type="range" class="cp-hue" id="cpHue" min="0" max="359" value="${Math.round(CP.h)}" data-oninput="cpHue" data-args-input="[{&quot;$&quot;:&quot;value&quot;}]" aria-label="Hue">
   <div class="cp-row"><span class="cp-pv" id="cpPv"></span><label class="cp-hx">RAL<input id="cpRal" maxlength="30" aria-label="RAL number or name" data-oninput="cpRalIn" data-args-input="[{&quot;$&quot;:&quot;value&quot;}]" autocomplete="off"></label><button type="button" class="btn sm" data-act="cpUse">Use colour</button></div>
   <div class="cp-nm" id="cpNm"></div><div class="cp-sug" id="cpSug"></div>
   <button type="button" class="cp-none" ${onClick('cpPick', '', '#8a8a8a')}>No colour</button>`;
  p.classList.add('open');
  const b = $('#cb_' + k).getBoundingClientRect();
  p.style.left = Math.max(8, Math.min(innerWidth - p.offsetWidth - 8, b.right - p.offsetWidth)) + 'px';
  p.style.top = Math.max(8, Math.min(innerHeight - p.offsetHeight - 8, b.bottom + 8)) + 'px';
  const sv = $('#cpSv'),
    drag = (e) => {
      const r = sv.getBoundingClientRect();
      CP.s = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      CP.v = 1 - Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      cpDraw(true);
    };
  sv.addEventListener('pointerdown', (e) => {
    sv.setPointerCapture(e.pointerId);
    drag(e);
    sv.onpointermove = drag;
  });
  sv.addEventListener('pointerup', () => {
    sv.onpointermove = null;
  });
  cpDraw(false);
  const m = /RAL (\d{4})/.exec($('#f_' + k).value || '');
  const cr = m && RAL.find((r) => r[0] == m[1]);
  if (cr) cpSet(cr);
  else {
    CP.ral = ralNear(hx);
    cpShow(true);
    $('#cpPv').style.background = hx;
  }
}
export function cpDraw(setHex) {
  const hx = hsv2hex(CP.h, CP.s, CP.v),
    sv = $('#cpSv');
  if (!sv) return;
  if (setHex) CP.ral = ralNear(hx);
  sv.style.background = `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${CP.h},100%,50%))`;
  const k = $('#cpKnob');
  k.style.left = CP.s * 100 + '%';
  k.style.top = (1 - CP.v) * 100 + '%';
  k.style.background = hx;
  cpShow(setHex);
}
export function cpShow(fill) {
  const r = CP.ral;
  $('#cpPv').style.background = r ? r[2] : '#ccc';
  $('#cpNm').innerHTML = r ? `<b>RAL ${esc(r[0])}</b> ${esc(r[1])}<span class="muted"> · closest match</span>` : '';
  if (fill && r) $('#cpRal').value = r[0];
  $('#cpSug').innerHTML = '';
}
export function cpHue(v) {
  CP.h = +v;
  cpDraw(true);
}
export function cpSet(r) {
  CP.ral = r;
  Object.assign(CP, hex2hsv(r[2]));
  $('#cpHue').value = Math.round(CP.h);
  cpDraw(false);
  $('#cpNm').innerHTML = `<b>RAL ${esc(r[0])}</b> ${esc(r[1])}`;
  $('#cpRal').value = r[0];
}
export function cpRalIn(v) {
  const L = ralFind(v),
    ex = L.find(
      (r) =>
        r[0] ==
        String(v)
          .trim()
          .replace(/^ral\s*/i, '')
    );
  if (ex) {
    cpSet(ex);
    $('#cpSug').innerHTML = '';
    return;
  }
  $('#cpSug').innerHTML =
    L.map(
      (r) =>
        `<button type="button" ${onClick('cpSugPick', r[0])}><i style="background:${r[2]}"></i>${esc(r[0])} ${esc(r[1])}</button>`
    ).join('') || (v.trim() ? '<span class="muted">No RAL colour matches</span>' : '');
}
export function cpSugPick(n) {
  const r = RAL.find((x) => x[0] == n);
  if (r) {
    cpSet(r);
    $('#cpSug').innerHTML = '';
  }
}
export function cpUse() {
  const r = CP.ral || ralNear(hsv2hex(CP.h, CP.s, CP.v));
  pickC(CP.k, ralLabel(r), r[2]);
  $('#cpop').classList.remove('open');
}
export function cpPick(n, h) {
  pickC(CP.k, n, h);
  $('#cpop').classList.remove('open');
}
export function cpClose() {
  $('#cpop').classList.remove('open');
}
