/** Quotes a CSV cell (RFC 4180). */
const cell = (value: string | number | null | undefined): string => `"${String(value ?? '').replace(/"/g, '""')}"`;

/** UTF-8 CSV with a BOM, so Excel opens Arabic text correctly. */
export function toCsv(header: readonly string[], rows: readonly (readonly (string | number | null | undefined)[])[]): Blob {
  const text = [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
  return new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
}
