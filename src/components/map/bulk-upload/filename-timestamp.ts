/**
 * Overwatch Workshop log files export with names like
 * `Log-2023-12-12-22-15-10.txt`, where the trailing segment is the local
 * timestamp the match was played. We use that to default-sort a bulk upload
 * into chronological (match) order before the user reviews it.
 */
const LOG_NAME_RE = /Log-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/;

/**
 * Parse the timestamp encoded in a Workshop log filename.
 *
 * @returns epoch milliseconds, or `null` when the filename does not carry a
 * recognizable `Log-YYYY-MM-DD-HH-MM-SS` stamp (e.g. a manually renamed file).
 */
export function parseLogFilenameTimestamp(fileName: string): number | null {
  const match = fileName.match(LOG_NAME_RE);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );

  const time = date.getTime();
  if (Number.isNaN(time)) return null;

  // Reject impossible component values that Date silently rolls over
  // (e.g. month 13 -> next year). A real export never produces these.
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return time;
}

type Orderable = { timestamp: number | null; seq: number };

/**
 * Order maps for display: timestamped files ascending by match time, then any
 * files without a parseable timestamp, each group falling back to `seq`
 * (the order the user added them) so the result is stable and predictable.
 */
export function compareByFilenameTimestamp(a: Orderable, b: Orderable): number {
  if (a.timestamp !== null && b.timestamp !== null) {
    return a.timestamp - b.timestamp || a.seq - b.seq;
  }
  if (a.timestamp !== null) return -1;
  if (b.timestamp !== null) return 1;
  return a.seq - b.seq;
}
