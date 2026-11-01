/**
 * Downloading what is on screen, after the filters have been applied.
 *
 * A spreadsheet export that ignores the filters is worse than none: management
 * reads the screen, exports it, and gets a different set of rows. Every caller
 * here passes the rows it is already showing.
 *
 * CSV rather than a generated .xlsx: Excel opens it directly, and it needs no
 * library in the bundle. The byte-order mark is what makes Excel read Arabic
 * as Arabic instead of mojibake — without it every العربية column arrives
 * unreadable, which is the usual reason CSV gets blamed.
 */

export interface CsvOptions {
  /** Columns to total in a final row. */
  totalsFor?: string[];
  /** Column order and headers; defaults to the keys of the first row. */
  columns?: Array<{ key: string; label?: string }>;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // A leading =, + or - makes Excel treat the text as a formula.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: Array<Record<string, unknown>>, opts: CsvOptions = {}): string {
  if (rows.length === 0) return '';
  const cols: Array<{ key: string; label?: string }> = opts.columns?.length
    ? opts.columns
    : Object.keys(rows[0]).map((key) => ({ key }));

  const lines = [cols.map((c) => cell(c.label || c.key)).join(',')];
  for (const row of rows) lines.push(cols.map((c) => cell(row[c.key])).join(','));

  if (opts.totalsFor?.length) {
    const totals = cols.map((c, i) => {
      if (i === 0) return cell('TOTAL');
      if (!opts.totalsFor!.includes(c.key)) return '';
      const sum = rows.reduce((n, r) => {
        const v = Number(r[c.key]);
        return n + (Number.isFinite(v) ? v : 0);
      }, 0);
      return cell(Number(sum.toFixed(2)));
    });
    lines.push(totals.join(','));
  }

  return lines.join('\r\n');
}

export function downloadCsv(
  filename: string,
  rows: Array<Record<string, unknown>>,
  opts: CsvOptions = {}
): void {
  const csv = toCsv(rows, opts);
  if (!csv) return;
  // ﻿: the mark that tells Excel this is UTF-8.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
