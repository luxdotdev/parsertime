import type { ResultColumn } from "@/lib/query-builder/types";

/** Format a numeric result value for display in tables, charts, and chips. */
export function formatMetric(
  value: number | string | null,
  column: Pick<ResultColumn, "precision" | "unit">
): string {
  if (value === null || value === undefined) return "–";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return "–";

  const precision = column.precision ?? 1;
  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  return column.unit
    ? `${formatted}${column.unit === "%" ? "%" : ` ${column.unit}`}`
    : formatted;
}

/** Tokens we light up in the compiled-query underlay so it reads as SQL. */
const SQL_KEYWORDS = new Set([
  "WITH",
  "SELECT",
  "DISTINCT",
  "ON",
  "AS",
  "FROM",
  "LEFT",
  "JOIN",
  "WHERE",
  "AND",
  "OR",
  "GROUP",
  "ORDER",
  "BY",
  "LIMIT",
  "FILTER",
  "IN",
  "NULLS",
  "LAST",
  "ASC",
  "DESC",
  "SUM",
  "AVG",
  "MAX",
  "MIN",
  "COUNT",
  "NULLIF",
]);

export type SqlToken = {
  text: string;
  kind: "keyword" | "comment" | "plain";
  /** character offset in the source, used as a stable React key */
  start: number;
};

/** Tokenize SQL for lightweight, injection-safe highlighting (no innerHTML). */
export function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  let offset = 0;
  function push(text: string, kind: SqlToken["kind"]) {
    tokens.push({ text, kind, start: offset });
    offset += text.length;
  }

  // Split on comments first, then words, preserving delimiters.
  const commentSplit = sql.split(/(\/\*[\s\S]*?\*\/)/g);
  for (const part of commentSplit) {
    if (part.startsWith("/*")) {
      push(part, "comment");
      continue;
    }
    const wordSplit = part.split(/(\b[A-Za-z_]+\b)/g);
    for (const word of wordSplit) {
      if (!word) continue;
      const isKeyword =
        SQL_KEYWORDS.has(word.toUpperCase()) && SQL_KEYWORDS.has(word);
      push(word, isKeyword ? "keyword" : "plain");
    }
  }
  return tokens;
}

export function downloadCsv(
  columns: { key: string; label: string }[],
  rows: Record<string, string | number | null>[],
  filename: string
): void {
  function escape(v: string | number | null) {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escape(row[c.key])).join(","))
    .join("\n");
  const csv = `${header}\n${body}`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
