export type CsvCell = string | number | boolean | Date | null | undefined;

const FORMULA_PREFIX = /^\s*[=+\-@\t\r]/;

export function escapeCsvCell(cell: CsvCell) {
  const raw = cell instanceof Date ? cell.toISOString() : String(cell ?? "");
  const normalized = raw.replace(/\r\n|\r/g, "\n");
  const safe = FORMULA_PREFIX.test(normalized) ? `'${normalized}` : normalized;

  return `"${safe.replace(/"/g, '""')}"`;
}

export function serializeCsv(rows: CsvCell[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}
