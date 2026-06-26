import "server-only";

import { AppRuntime } from "@/data/runtime";
import { type TeamDateRange, TeamStatsService } from "@/data/team";
import { getTeamSubstituteNames } from "@/data/team/substitutes";
import { teamStatsTag } from "@/lib/cache-tags";
import { Effect } from "effect";
import { cacheLife, cacheTag } from "next/cache";

// Team stats change whenever a scrim is uploaded to (or removed from) the team,
// so they're tagged `team-stats:${teamId}` and invalidated from the scrim
// mutation routes. `cacheLife('days')` is a safety net in case an invalidation
// is ever missed; the per-request date range is passed in as part of the key,
// never read inside the cache scope.

export async function getCachedTeamWinrates(
  teamId: number,
  dateRange: TeamDateRange | undefined
) {
  "use cache";
  cacheLife("days");
  cacheTag(teamStatsTag(teamId));
  return AppRuntime.runPromise(
    TeamStatsService.pipe(
      Effect.flatMap((svc) => svc.getTeamWinrates(teamId, dateRange))
    )
  );
}

export async function getCachedTeamSubstituteNames(teamId: number) {
  "use cache";
  cacheLife("days");
  cacheTag(teamStatsTag(teamId));
  return getTeamSubstituteNames(teamId);
}
