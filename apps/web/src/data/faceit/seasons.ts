import prisma from "@/lib/prisma";
import { Effect } from "effect";
import { FaceitScoutingQueryError } from "./errors";
import { buildSeasonWindows } from "./season-windows";
import type { FaceitSeasonWindow } from "./types";

type RawSeasonSourceRow = {
  name: string;
  first_match: Date;
  last_match: Date;
  match_count: bigint;
};

// Season windows are derived, not stored: championships named with the league
// patterns ("S8 NA Open Central …", "FACEIT League Season 8 - …") anchor each
// season's [first match, last match] window. Grouping by name keeps the row
// count tiny; the regex parsing happens in TS (season-windows.ts) so it is
// unit-testable.
export function fetchFaceitSeasons(): Effect.Effect<
  FaceitSeasonWindow[],
  FaceitScoutingQueryError
> {
  return Effect.tryPromise({
    try: () => prisma.$queryRaw<RawSeasonSourceRow[]>`
      SELECT c.name,
             MIN(m."finishedAt") AS first_match,
             MAX(m."finishedAt") AS last_match,
             COUNT(*)::bigint AS match_count
      FROM "FaceitChampionship" c
      JOIN "FaceitMatch" m ON m."championshipId" = c."championshipId"
      GROUP BY c.name
    `,
    catch: (error) =>
      new FaceitScoutingQueryError({
        operation: "fetch faceit seasons",
        cause: error,
      }),
  }).pipe(
    Effect.map((rows) =>
      buildSeasonWindows(
        rows.map((r) => ({
          name: r.name,
          firstMatch: r.first_match,
          lastMatch: r.last_match,
          matchCount: Number(r.match_count),
        }))
      )
    ),
    Effect.withSpan("faceit.fetchFaceitSeasons")
  );
}
