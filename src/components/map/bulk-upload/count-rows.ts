import type { ParserData } from "@/types/parser";

/**
 * Total number of parsed event rows in a map. The server inserts roughly one
 * DB row per entry across every event type, so this is a good proxy for "how
 * much work this map is" and lets the upload progress bar weight larger maps
 * more heavily than short ones.
 */
export function countParsedRows(data: ParserData | undefined): number {
  if (!data) return 0;
  let total = 0;
  for (const rows of Object.values(data)) {
    if (Array.isArray(rows)) total += rows.length;
  }
  return total;
}
