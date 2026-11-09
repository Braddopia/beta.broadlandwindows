/* core/xlsx: reading and writing simple Excel (.xlsx) workbooks in the browser, with no library.

   readXlsx(file)  -> Promise<[{ name, rows: [[cell, ...], ...] }]>   one entry per sheet, cells as text or numbers
   xlsxBlob(sheets) -> Blob                                               sheets: [{ name, widths, rows, header }]

   An .xlsx file is a zip of XML files. Reading uses the browser's DecompressionStream; writing stores the
   files uncompressed (Excel opens them normally). Only cell values are read; formatting is ignored. */

/* ---------------- zip ---------------- */
const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

async function inflate(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/** the files inside a zip: { name: Uint8Array } */
export async function unzip(buf) {
  const b = new Uint8Array(buf);
  let e = b.length - 22;
  while (e >= 0 && u32(b, e) != 0x06054b50) e--;
  if (e < 0) throw new Error('This is not an Excel (.xlsx) file');
  const count = u16(b, e + 10);
  let p = u32(b, e + 16);
  const out = {},
    dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (u32(b, p) != 0x02014b50) throw new Error('The file looks damaged');
    const method = u16(b, p + 10),
      csize = u32(b, p + 20),
      nlen = u16(b, p + 28),
      xlen = u16(b, p + 30),
      clen = u16(b, p + 32),
      lho = u32(b, p + 42),
      name = dec.decode(b.subarray(p + 46, p + 46 + nlen));
    const start = lho + 30 + u16(b, lho + 26) + u16(b, lho + 28),
      data = b.subarray(start, start + csize);
    if (method == 0) out[name] = data;
    else if (method == 8) out[name] = await inflate(data);
    p += 46 + nlen + xlen + clen;
  }
  return out;
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** a zip (stored, not compressed) from { name: string } */
export function zip(files) {
  const enc = new TextEncoder(),
    parts = [],
    central = [];
  let off = 0;
  for (const [name, text] of Object.entries(files)) {
    const nb = enc.encode(name),
      data = enc.encode(text),
      crc = crc32(data),
      h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(8, 0, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true);
    h.setUint16(26, nb.length, true);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true);
    c.setUint16(28, nb.length, true);
    c.setUint32(42, off, true);
    parts.push(new Uint8Array(h.buffer), nb, data);
    central.push(new Uint8Array(c.buffer), nb);
    off += 30 + nb.length + data.length;
  }
  const csize = central.reduce((a, x) => a + x.length, 0),
    end = new DataView(new ArrayBuffer(22)),
    n = Object.keys(files).length;
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, n, true);
  end.setUint16(10, n, true);
  end.setUint32(12, csize, true);
  end.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

/* ---------------- read ---------------- */
const colIndex = (ref) => {
  const m = /^([A-Z]+)/.exec(ref || '');
  if (!m) return -1;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
};
const xmlDoc = (bytes) => new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');
const byTag = (node, tag) => [...node.getElementsByTagNameNS('*', tag)];
const textOf = (node) =>
  byTag(node, 't')
    .map((t) => t.textContent)
    .join('');

/** every sheet's cell values, in workbook order */
export async function readXlsx(file) {
  const z = await unzip(await file.arrayBuffer());
  if (!z['xl/workbook.xml']) throw new Error('This is not an Excel (.xlsx) file');
  const shared = z['xl/sharedStrings.xml'] ? byTag(xmlDoc(z['xl/sharedStrings.xml']), 'si').map(textOf) : [];
  const rels = {};
  if (z['xl/_rels/workbook.xml.rels'])
    byTag(xmlDoc(z['xl/_rels/workbook.xml.rels']), 'Relationship').forEach((r) => {
      const t = r
        .getAttribute('Target')
        .replace(/^\/?xl\//, '')
        .replace(/^\//, '');
      rels[r.getAttribute('Id')] = 'xl/' + t;
    });
  const sheets = byTag(xmlDoc(z['xl/workbook.xml']), 'sheet');
  return sheets.map((s, i) => {
    const rid =
        s.getAttribute('r:id') ||
        s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'),
      path = rels[rid] || 'xl/worksheets/sheet' + (i + 1) + '.xml',
      rows = [];
    if (z[path])
      byTag(xmlDoc(z[path]), 'row').forEach((row) => {
        const r = [];
        let next = 0;
        byTag(row, 'c').forEach((c) => {
          let ci = colIndex(c.getAttribute('r'));
          if (ci < 0) ci = next;
          next = ci + 1;
          const t = c.getAttribute('t'),
            v = byTag(c, 'v')[0];
          let val = null;
          if (t == 's') val = v ? (shared[+v.textContent] ?? '') : '';
          else if (t == 'inlineStr') val = textOf(c);
          else if (t == 'b') val = v ? v.textContent == '1' : null;
          else if (v)
            val = t == 'str' || t == 'e' ? v.textContent : isFinite(+v.textContent) ? +v.textContent : v.textContent;
          r[ci] = val;
        });
        const rn = +row.getAttribute('r');
        if (rn > 0) rows[rn - 1] = r;
        else rows.push(r);
      });
    return { name: s.getAttribute('name') || 'Sheet' + (i + 1), rows: Array.from(rows, (r) => r || []) };
  });
}

/* ---------------- write ---------------- */
const X = (s) =>
  String(s ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const colName = (i) => {
  let s = '';
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};
/** a sheet name Excel accepts: 31 characters, none of []:*?/\ */
export const sheetName = (n, used) => {
  let b =
      String(n || 'Sheet')
        .replace(/[[\]:*?/\\]/g, '-')
        .trim()
        .slice(0, 31) || 'Sheet',
    s = b,
    i = 2;
  while (used.has(s.toLowerCase())) s = b.slice(0, 28) + ' ' + i++;
  used.add(s.toLowerCase());
  return s;
};

/** sheets: [{ name, widths: [chars...], rows: [[...]], header: true (first row bold, repeated on every printed page) }]
    a cell is text, a number, empty, or { f: 'SUM(E:E)', v: 123 } for a formula */
export function xlsxBlob(sheets) {
  const used = new Set(),
    S = sheets.map((s) => ({ ...s, name: sheetName(s.name, used) })),
    files = {};
  files['[Content_Types].xml'] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    S.map(
      (s, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    ).join('') +
    '</Types>';
  files['_rels/.rels'] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  files['xl/workbook.xml'] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    S.map((s, i) => `<sheet name="${X(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
    '</sheets><definedNames>' +
    S.map((s, i) =>
      s.header
        ? `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">'${X(s.name.replace(/'/g, "''"))}'!$1:$1</definedName>`
        : ''
    ).join('') +
    '</definedNames></workbook>';
  files['xl/_rels/workbook.xml.rels'] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    S.map(
      (s, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    ).join('') +
    `<Relationship Id="rId${S.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  /* styles: 0 plain, 1 header (bold, grey, boxed), 2 boxed cell */
  files['xl/styles.xml'] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9E2EF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/></cellXfs></styleSheet>';
  S.forEach((s, i) => {
    const rows = s.rows
      .map((r, ri) => {
        const st = s.header && ri == 0 ? 1 : 2;
        return (
          `<row r="${ri + 1}">` +
          r
            .map((v, ci) => {
              const ref = colName(ci) + (ri + 1);
              if (typeof v == 'number' && isFinite(v)) return `<c r="${ref}" s="${st}"><v>${v}</v></c>`;
              /* { f: 'F2*C2', v: 12.5 }: an Excel formula, with its value so the file reads right before Excel recalculates */
              if (v && typeof v == 'object' && v.f)
                return `<c r="${ref}" s="${st}"><f>${X(v.f)}</f>${typeof v.v == 'number' && isFinite(v.v) ? `<v>${v.v}</v>` : ''}</c>`;
              if (v == null || v === '') return `<c r="${ref}" s="${st}"/>`;
              return `<c r="${ref}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${X(v)}</t></is></c>`;
            })
            .join('') +
          '</row>'
        );
      })
      .join('');
    const cols = (s.widths || [])
      .map((w, ci) => `<col min="${ci + 1}" max="${ci + 1}" width="${w}" customWidth="1"/>`)
      .join('');
    files[`xl/worksheets/sheet${i + 1}.xml`] =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
      (s.header
        ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        : '') +
      (cols ? `<cols>${cols}</cols>` : '') +
      `<sheetData>${rows}</sheetData><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/><headerFooter><oddHeader>&amp;L&amp;"-,Bold"${X(s.title || s.name)}&amp;RPage &amp;P of &amp;N</oddHeader></headerFooter></worksheet>`;
  });
  return new Blob([zip(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
