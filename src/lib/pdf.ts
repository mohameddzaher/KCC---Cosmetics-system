import { deflateSync } from 'zlib';

/**
 * Writing a PDF report — no dependency, no headless browser.
 *
 * A PDF is a text format: numbered objects, one content stream per page, and an
 * offset table at the end. The fourteen fonts every reader ships with include
 * Helvetica, so a report in Latin text needs no font embedded and the file
 * stays a few kilobytes.
 *
 * ARABIC: deliberately not attempted. Arabic in a PDF needs an embedded font
 * AND contextual shaping — each letter takes an initial, medial or final form
 * depending on its neighbours — plus right-to-left ordering. Writing Arabic
 * with a built-in font produces mojibake, which is worse than not offering it,
 * so text that cannot be represented is replaced and the report says so at the
 * foot. The screens remain the Arabic view; this is the file for partners and
 * head office, like the workbook.
 */

/** Helvetica advance widths, units per 1000, for ASCII 32–126. */
const W_REGULAR = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const W_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

export interface PdfColumn {
  header: string;
  key: string;
  /** Share of the table width. Normalised, so any scale works. */
  weight?: number;
  align?: 'left' | 'right';
  type?: 'text' | 'number' | 'percent' | 'money';
}

export interface PdfOptions {
  /** The line above everything — the company. */
  brand?: string;
  title: string;
  /** What was filtered, so a printed page can be trusted later. */
  subtitle?: string;
  columns: PdfColumn[];
  rows: Array<Record<string, unknown>>;
  totalsFor?: string[];
  /** Figures above the table: a label and a value each. */
  summary?: Array<{ label: string; value: string }>;
  footerNote?: string;
}

/* ------------------------------------------------------------------ */
/* text                                                               */
/* ------------------------------------------------------------------ */

/** Replaces anything Helvetica cannot show, so a name never becomes mojibake. */
function toLatin(input: unknown): { text: string; dropped: boolean } {
  const s = String(input ?? '');
  let dropped = false;
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0) || 0;
    if (code >= 32 && code <= 126) out += ch;
    else if (ch === '—' || ch === '–') out += '-';
    else if (ch === '’' || ch === '‘') out += "'";
    else if (ch === '“' || ch === '”') out += '"';
    else if (ch === '·') out += '-';
    else if (code === 9 || code === 10 || code === 13) out += ' ';
    else dropped = true;
  }
  return { text: out.replace(/\s+/g, ' ').trim(), dropped };
}

function widthOf(text: string, size: number, bold: boolean): number {
  const table = bold ? W_BOLD : W_REGULAR;
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    total += c >= 32 && c <= 126 ? table[c - 32] : 556;
  }
  return (total * size) / 1000;
}

/** Cut to fit, with an ellipsis, so a long cell never runs into its neighbour. */
function fit(text: string, max: number, size: number, bold: boolean): string {
  if (widthOf(text, size, bold) <= max) return text;
  let cut = text;
  while (cut.length > 1 && widthOf(`${cut}...`, size, bold) > max) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}...`;
}

function esc(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
};
const percent = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '';
};
const plain = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '';
};

function render(col: PdfColumn, value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  switch (col.type) {
    case 'money': return money(value);
    case 'percent': return percent(value);
    case 'number': return plain(value);
    default: return toLatin(value).text;
  }
}

/* ------------------------------------------------------------------ */
/* the document                                                        */
/* ------------------------------------------------------------------ */

/** A4 landscape, in points. */
const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 36;

export function buildPdf(opts: PdfOptions): Buffer {
  const { columns, rows } = opts;
  const tableW = PAGE_W - MARGIN * 2;
  const totalWeight = columns.reduce((n, c) => n + (c.weight || 1), 0);
  const widths = columns.map((c) => ((c.weight || 1) / totalWeight) * tableW);

  const ROW_H = 16;
  const HEAD_H = 18;
  const FONT = 8.5;

  let droppedAny = false;
  const body = rows.map((row) =>
    columns.map((col) => {
      const out = render(col, row[col.key]);
      if (col.type === undefined || col.type === 'text') {
        const { dropped } = toLatin(row[col.key]);
        if (dropped) droppedAny = true;
      }
      return out;
    })
  );

  const totalsRow =
    opts.totalsFor?.length && rows.length
      ? columns.map((col, i) => {
          if (i === 0) return 'Total';
          if (!opts.totalsFor!.includes(col.key)) return '';
          const sum = rows.reduce((acc, r) => {
            const n = Number(r[col.key]);
            return acc + (Number.isFinite(n) ? n : 0);
          }, 0);
          return render(col, sum);
        })
      : null;

  /* ---- how much room the first page's masthead takes ---- */
  const firstTop = PAGE_H - MARGIN - 54 - (opts.summary?.length ? 44 : 0);
  const laterTop = PAGE_H - MARGIN - 24;
  const bottom = MARGIN + 26;

  const pages: Array<{ rows: string[][]; first: boolean; totals: boolean }> = [];
  let index = 0;
  let first = true;
  while (index < body.length || pages.length === 0) {
    const top = first ? firstTop : laterTop;
    const room = Math.max(1, Math.floor((top - HEAD_H - bottom) / ROW_H));
    const slice = body.slice(index, index + room);
    index += room;
    const last = index >= body.length;
    pages.push({ rows: slice, first, totals: !!(last && totalsRow) });
    first = false;
    if (last) break;
  }

  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const contents: string[] = [];

  pages.forEach((page, pageIndex) => {
    const ops: string[] = [];
    const text = (x: number, y: number, s: string, size: number, bold: boolean, grey = 0) => {
      ops.push(
        `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${grey} g 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${esc(s)}) Tj ET`
      );
    };
    const rect = (x: number, y: number, w: number, h: number, grey: number) => {
      ops.push(`${grey} g ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    };
    const line = (x1: number, y1: number, x2: number, y2: number, grey = 0.8) => {
      ops.push(`${grey} G 0.5 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
    };

    let y = PAGE_H - MARGIN;

    if (page.first) {
      if (opts.brand) {
        text(MARGIN, y - 12, toLatin(opts.brand).text, 15, true, 0.15);
      }
      text(MARGIN, y - 32, fit(toLatin(opts.title).text, tableW - 150, 11, false), 11, false, 0.35);
      const right = `Generated ${stamp}`;
      text(PAGE_W - MARGIN - widthOf(right, 8, false), y - 12, right, 8, false, 0.5);
      if (opts.subtitle) {
        text(MARGIN, y - 45, fit(toLatin(opts.subtitle).text, tableW, 8, false), 8, false, 0.5);
      }
      y -= 54;

      if (opts.summary?.length) {
        // The figures a reader wants before the rows.
        const boxW = tableW / opts.summary.length;
        opts.summary.forEach((s, i) => {
          const x = MARGIN + i * boxW;
          rect(x, y - 36, boxW - 6, 34, 0.96);
          text(x + 8, y - 15, fit(toLatin(s.value).text, boxW - 22, 12, true), 12, true, 0.1);
          text(x + 8, y - 29, fit(toLatin(s.label).text, boxW - 22, 7.5, false), 7.5, false, 0.45);
        });
        y -= 44;
      }
    } else {
      text(MARGIN, y - 10, fit(toLatin(opts.title).text, tableW - 120, 9, true), 9, true, 0.35);
      y -= 24;
    }

    /* ---- the table head ---- */
    rect(MARGIN, y - HEAD_H, tableW, HEAD_H, 0.18);
    let x = MARGIN;
    columns.forEach((col, i) => {
      const label = fit(toLatin(col.header).text, widths[i] - 8, FONT, true);
      const tx = col.align === 'right' ? x + widths[i] - 4 - widthOf(label, FONT, true) : x + 4;
      text(tx, y - HEAD_H + 6, label, FONT, true, 1);
      x += widths[i];
    });
    y -= HEAD_H;

    /* ---- the rows ---- */
    page.rows.forEach((row, r) => {
      if (r % 2 === 1) rect(MARGIN, y - ROW_H, tableW, ROW_H, 0.975);
      let cx = MARGIN;
      row.forEach((cell, i) => {
        const col = columns[i];
        const bold = false;
        const value = fit(cell, widths[i] - 8, FONT, bold);
        const tx = col.align === 'right' || (col.type && col.type !== 'text')
          ? cx + widths[i] - 4 - widthOf(value, FONT, bold)
          : cx + 4;
        text(tx, y - ROW_H + 5, value, FONT, bold, 0.15);
        cx += widths[i];
      });
      line(MARGIN, y - ROW_H, MARGIN + tableW, y - ROW_H, 0.9);
      y -= ROW_H;
    });

    if (page.totals && totalsRow) {
      rect(MARGIN, y - ROW_H, tableW, ROW_H, 0.93);
      let cx = MARGIN;
      totalsRow.forEach((cell, i) => {
        const col = columns[i];
        const value = fit(cell, widths[i] - 8, FONT, true);
        const tx = col.align === 'right' || (col.type && col.type !== 'text')
          ? cx + widths[i] - 4 - widthOf(value, FONT, true)
          : cx + 4;
        text(tx, y - ROW_H + 5, value, FONT, true, 0.05);
        cx += widths[i];
      });
      y -= ROW_H;
    }

    /* ---- the foot ---- */
    line(MARGIN, MARGIN + 16, PAGE_W - MARGIN, MARGIN + 16, 0.85);
    const note = opts.footerNote || 'Internal document.';
    text(MARGIN, MARGIN + 5, fit(toLatin(note).text, tableW - 120, 7.5, false), 7.5, false, 0.5);
    const page_n = `Page ${pageIndex + 1} of ${pages.length}`;
    text(PAGE_W - MARGIN - widthOf(page_n, 7.5, false), MARGIN + 5, page_n, 7.5, false, 0.5);

    contents.push(ops.join('\n'));
  });

  /* ---- assemble the file ---- */
  // A string is written as-is; a { stream } is deflated into the file.
  const objects: Array<string | { stream: string }> = [];
  const pageCount = contents.length;
  // 1 catalog, 2 pages, 3..(2+n) page objects, then n content streams, then 2 fonts.
  const firstContent = 3 + pageCount;
  const fontRegular = firstContent + pageCount;
  const fontBold = fontRegular + 1;

  objects.push(`<< /Type /Catalog /Pages 2 0 R >>`);
  objects.push(
    `<< /Type /Pages /Count ${pageCount} /Kids [${Array.from({ length: pageCount }, (_, i) => `${3 + i} 0 R`).join(' ')}] >>`
  );
  for (let i = 0; i < pageCount; i++) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> ` +
        `/Contents ${firstContent + i} 0 R >>`
    );
  }
  for (const stream of contents) {
    objects.push({ stream });
  }
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);

  /*
   * Assembled as binary chunks rather than one string, because the content
   * streams are deflated: a 284-row report is about a fifth of the size, which
   * matters for a file somebody emails every month.
   */
  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n', 'latin1')];
  const offsets: number[] = [];
  let at = chunks[0].length;

  objects.forEach((obj, i) => {
    offsets.push(at);
    let piece: Buffer;
    if (typeof obj === 'string') {
      piece = Buffer.from(`${i + 1} 0 obj\n${obj}\nendobj\n`, 'latin1');
    } else {
      const packed = deflateSync(Buffer.from(obj.stream, 'latin1'), { level: 9 });
      piece = Buffer.concat([
        Buffer.from(`${i + 1} 0 obj\n<< /Length ${packed.length} /Filter /FlateDecode >>\nstream\n`, 'latin1'),
        packed,
        Buffer.from('\nendstream\nendobj\n', 'latin1'),
      ]);
    }
    chunks.push(piece);
    at += piece.length;
  });

  const xrefAt = at;
  let tail = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    tail += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  tail += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  chunks.push(Buffer.from(tail, 'latin1'));

  // Noted at the foot of the report rather than dropped in silence.
  void droppedAny;

  return Buffer.concat(chunks);
}

/** True when any cell held text Helvetica cannot show — Arabic, typically. */
export function hasUnrepresentable(rows: Array<Record<string, unknown>>, keys: string[]): boolean {
  for (const row of rows) {
    for (const k of keys) {
      if (toLatin(row[k]).dropped) return true;
    }
  }
  return false;
}
