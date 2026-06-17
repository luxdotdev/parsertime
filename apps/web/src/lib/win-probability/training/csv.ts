import { FEATURE_NAMES } from "@/lib/win-probability/features";
import type { DatasetRow } from "@/lib/win-probability/types";

/**
 * Serialize dataset rows to the canonical training CSV: a header line
 * `matchId,roundId,label,${FEATURE_NAMES.join(",")}` followed by one line per
 * row as `matchId,roundId,label,...features`. The Python trainer parses this
 * with the same column assumptions, so the byte layout must match
 * `scripts/wp/export-dataset.ts` exactly.
 */
export function datasetToCsv(rows: DatasetRow[]): string {
  const header = `matchId,roundId,label,${FEATURE_NAMES.join(",")}\n`;
  let body = "";
  for (const row of rows) {
    body += `${row.matchId},${row.roundId},${row.label},${row.features.join(",")}\n`;
  }
  return header + body;
}
