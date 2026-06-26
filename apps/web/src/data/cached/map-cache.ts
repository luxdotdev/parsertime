import "server-only";

import { MatchStoryService } from "@/data/map/match-story-service";
import { PlayerService } from "@/data/player";
import { AppRuntime } from "@/data/runtime";
import { Effect } from "effect";
import { cacheLife, cacheTag } from "next/cache";

// A map's stats are immutable once it's uploaded — adding more maps to the
// scrim never changes an existing map's data. Cache the per-map reads
// indefinitely and invalidate `map:${mapId}` only when that map is removed or
// its winner changes (see the scrim mutation routes).

export async function getCachedMostPlayedHeroes(mapId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(`map:${mapId}`);
  return AppRuntime.runPromise(
    PlayerService.pipe(Effect.flatMap((svc) => svc.getMostPlayedHeroes(mapId)))
  );
}

export async function getCachedMatchStory(mapId: number, mapDataId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(`map:${mapId}`);
  // A story failure must never break the map page — the tab just hides.
  return AppRuntime.runPromise(
    MatchStoryService.pipe(
      Effect.flatMap((svc) => svc.getMatchStory(mapDataId)),
      Effect.catchAll(() => Effect.succeed(null))
    )
  );
}
