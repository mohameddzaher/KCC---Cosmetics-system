import { deflateRawSync } from 'zlib';

/**
 * Writing a real .xlsx — a workbook Excel opens natively, with no library.
 *
 * The obvious dependency for this carries a published advisory on the version
 * npm serves, and a spreadsheet writer is not worth a known vulnerability in a
 * live system. An .xlsx is a zip of XML parts, and zlib ships with Node, so the
 * whole thing is about two hundred lines that nobody else has to audit.
 *
 * What makes the output look made on purpose rather than dumped: a bold header
 * on a tinted fill, column widths that fit the content, the header row frozen,
 * an autofilter across it, thousands separators on numbers, percentages as
 * percentages, and a bold totals row.
 */

export type XlsxType = 'text' | 'number' | 'percent' | 'money';

export interface XlsxColumn {
  header: string;
  key: string;
  /** Characters, not pixels — Excel's own unit. */
  width?: number;
  type?: XlsxType;
}

export interface XlsxOptions {
  sheetName?: string;
  columns: XlsxColumn[];
  rows: Array<Record<string, unknown>>;
  /** Column keys to sum in a bold final row. */
  totalsFor?: string[];
  /** A line above the table: what this is and when it was taken. */
  title?: string;
}

/* ------------------------------------------------------------------ */
/* zip                                                                 */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

interface Entry {
  name: string;
  data: Buffer;
  deflated: Buffer;
  crc: number;
  offset: number;
}

/** A zip with one deflated entry per part, in the order Excel expects. */
function zip(parts: Array<{ name: string; content: string }>): Buffer {
  const entries: Entry[] = [];
  const chunks: Buffer[] = [];
  let offset = 0;

  for (const part of parts) {
    const data = Buffer.from(part.content, 'utf8');
    const deflated = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const name = Buffer.from(part.name, 'utf8');

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);        // version needed
    local.writeUInt16LE(0, 6);         // flags
    local.writeUInt16LE(8, 8);         // deflate
    local.writeUInt16LE(0, 10);        // time
    local.writeUInt16LE(0, 12);        // date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, name, deflated);
    entries.push({ name: part.name, data, deflated, crc, offset });
    offset += local.length + name.length + deflated.length;
  }

  const central: Buffer[] = [];
  let centralSize = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const head = Buffer.alloc(46);
    head.writeUInt32LE(0x02014b50, 0);
    head.writeUInt16LE(20, 4);         // version made by
    head.writeUInt16LE(20, 6);         // version needed
    head.writeUInt16LE(0, 8);
    head.writeUInt16LE(8, 10);
    head.writeUInt16LE(0, 12);
    head.writeUInt16LE(0, 14);
    head.writeUInt32LE(e.crc, 16);
    head.writeUInt32LE(e.deflated.length, 20);
    head.writeUInt32LE(e.data.length, 24);
    head.writeUInt16LE(name.length, 28);
    head.writeUInt16LE(0, 30);
    head.writeUInt16LE(0, 32);
    head.writeUInt16LE(0, 34);
    head.writeUInt16LE(0, 36);
    head.writeUInt32LE(0, 38);
    head.writeUInt32LE(e.offset, 42);
    central.push(head, name);
    centralSize += head.length + name.length;
  }

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, ...central, end]);
}

/* ------------------------------------------------------------------ */
/* the sheet                                                           */
/* ------------------------------------------------------------------ */

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Control characters are not legal in XML and Excel refuses the file.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/** A1, B1 … Z1, AA1 — Excel's column letters. */
function ref(col: number, row: number): string {
  let s = '';
  let n = col + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return `${s}${row}`;
}

/** Style slots, in the order they are declared in cellXfs below. */
const S = { text: 0, header: 1, number: 2, percent: 3, money: 4, title: 5, totalText: 6, totalNum: 7 } as const;

function styleFor(type: XlsxType | undefined, total: boolean): number {
  if (total) return type && type !== 'text' ? S.totalNum : S.totalText;
  switch (type) {
    case 'number': return S.number;
    case 'percent': return S.percent;
    case 'money': return S.money;
    default: return S.text;
  }
}

export function buildXlsx(opts: XlsxOptions): Buffer {
  const { columns, rows } = opts;
  const sheetName = (opts.sheetName || 'Sheet1').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
  const titleRows = opts.title ? 1 : 0;
  const headerRow = titleRows + 1;

  const cells: string[] = [];

  if (opts.title) {
    cells.push(
      `<row r="1" ht="20" customHeight="1"><c r="${ref(0, 1)}" s="${S.title}" t="inlineStr"><is><t>${esc(opts.title)}</t></is></c></row>`
    );
  }

  cells.push(
    `<row r="${headerRow}" ht="22" customHeight="1">` +
      columns
        .map(
          (c, i) =>
            `<c r="${ref(i, headerRow)}" s="${S.header}" t="inlineStr"><is><t>${esc(c.header)}</t></is></c>`
        )
        .join('') +
      '</row>'
  );

  rows.forEach((row, r) => {
    const n = headerRow + 1 + r;
    const body = columns
      .map((c, i) => {
        const raw = row[c.key];
        const numeric = c.type && c.type !== 'text';
        const style = styleFor(c.type, false);
        if (raw === null || raw === undefined || raw === '') {
          return `<c r="${ref(i, n)}" s="${style}"/>`;
        }
        if (numeric) {
          const num = Number(raw);
          if (Number.isFinite(num)) {
            return `<c r="${ref(i, n)}" s="${style}"><v>${num}</v></c>`;
          }
        }
        return `<c r="${ref(i, n)}" s="${style}" t="inlineStr"><is><t>${esc(raw)}</t></is></c>`;
      })
      .join('');
    cells.push(`<row r="${n}">${body}</row>`);
  });

  if (opts.totalsFor?.length && rows.length > 0) {
    const n = headerRow + 1 + rows.length;
    const body = columns
      .map((c, i) => {
        const style = styleFor(c.type, true);
        if (i === 0) {
          return `<c r="${ref(i, n)}" s="${style}" t="inlineStr"><is><t>Total</t></is></c>`;
        }
        if (!opts.totalsFor!.includes(c.key)) return `<c r="${ref(i, n)}" s="${style}"/>`;
        const sum = rows.reduce((acc, row) => {
          const v = Number(row[c.key]);
          return acc + (Number.isFinite(v) ? v : 0);
        }, 0);
        return `<c r="${ref(i, n)}" s="${style}"><v>${Number(sum.toFixed(2))}</v></c>`;
      })
      .join('');
    cells.push(`<row r="${n}">${body}</row>`);
  }

  const lastRow = headerRow + rows.length + (opts.totalsFor?.length && rows.length ? 1 : 0);
  const cols = columns
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width || 18}" customWidth="1"/>`)
    .join('');

  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0">` +
    // The header stays put while the rows scroll.
    `<pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/>` +
    `</sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${cols}</cols>` +
    `<sheetData>${cells.join('')}</sheetData>` +
    `<autoFilter ref="${ref(0, headerRow)}:${ref(columns.length - 1, Math.max(headerRow, lastRow))}"/>` +
    `</worksheet>`;

  const styles =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="3">` +
    `<numFmt numFmtId="164" formatCode="#,##0.00"/>` +
    `<numFmt numFmtId="165" formatCode="0.0%"/>` +
    `<numFmt numFmtId="166" formatCode="#,##0.00&quot; SAR&quot;"/>` +
    `</numFmts>` +
    `<fonts count="4">` +
    `<font><sz val="11"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="14"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="11"/><name val="Calibri"/></font>` +
    `</fonts>` +
    `<fills count="3">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FF2F2014"/><bgColor indexed="64"/></patternFill></fill>` +
    `</fills>` +
    `<borders count="2">` +
    `<border><left/><right/><top/><bottom/><diagonal/></border>` +
    `<border><left/><right/><top style="thin"><color rgb="FF999999"/></top><bottom/><diagonal/></border>` +
    `</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="8">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>` +
    `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>` +
    `<xf numFmtId="165" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>` +
    `<xf numFmtId="166" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>` +
    `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" applyFont="1"/>` +
    `<xf numFmtId="0" fontId="3" fillId="0" borderId="1" applyFont="1" applyBorder="1"/>` +
    `<xf numFmtId="164" fontId="3" fillId="0" borderId="1" applyNumberFormat="1" applyFont="1" applyBorder="1"/>` +
    `</cellXfs>` +
    // Declares the Normal style, which some readers warn about when missing.
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`;

  return zip([
    {
      name: '[Content_Types].xml',
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `</Types>`,
    },
    {
      name: '_rels/.rels',
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
        `</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`,
    },
    { name: 'xl/styles.xml', content: styles },
    { name: 'xl/worksheets/sheet1.xml', content: sheet },
  ]);
}
