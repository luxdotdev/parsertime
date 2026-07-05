import "server-only";

import { MatchStoryService } from "@/data/map/match-story-service";
import { PlayerService } from "@/data/player";
import { AppRuntime } from "@/data/runtime";
import { mapTag, scrimTag } from "@/lib/cache-tags";
import { getFightInitiationForMapData } from "@/lib/fight-initiation";
import prisma from "@/lib/prisma";
import { Effect } from "effect";
import { cacheLife, cacheTag } from "next/cache";

// A map's stats are immutable once it's uploaded — adding more maps to the
// scrim never changes an existing map's data. Cache the per-map reads
// indefinitely and invalidate `map:${mapId}` only when that map is removed or
// its winner changes (see the scrim mutation routes).

export async function getCachedMostPlayedHeroes(mapId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(mapTag(mapId));
  return AppRuntime.runPromise(
    PlayerService.pipe(Effect.flatMap((svc) => svc.getMostPlayedHeroes(mapId)))
  );
}

export async function getCachedMatchStory(mapId: number, mapDataId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(mapTag(mapId));
  // A story failure must never break the map page — the tab just hides.
  return AppRuntime.runPromise(
    MatchStoryService.pipe(
      Effect.flatMap((svc) => svc.getMatchStory(mapDataId)),
      Effect.catchAll(() => Effect.succeed(null))
    )
  );
}

/** Map name + team name shown in the map page frame. Immutable after upload. */
export async function getCachedMapDetails(mapId: number, mapDataId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(mapTag(mapId));
  return prisma.matchStart.findFirst({
    where: { MapDataId: mapDataId },
    select: { map_name: true, team_1_name: true },
    orderBy: { id: "asc" },
  });
}

/**
 * Replay code + VOD link for the map page frame. Both are user-editable:
 * replayCode edits go through update-scrim-options (revalidates the scrim
 * tag) and VOD edits through /api/vod (revalidates the map tag).
 */
export async function getCachedMapRow(scrimId: number, mapId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(mapTag(mapId));
  cacheTag(scrimTag(scrimId));
  return prisma.map.findFirst({
    where: { id: mapId },
    select: { replayCode: true, vod: true },
  });
}

/** Hero bans for the map header. Immutable after upload. */
export async function getCachedHeroBans(mapId: number, mapDataId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(mapTag(mapId));
  return prisma.heroBan.findMany({
    where: { MapDataId: mapDataId },
    orderBy: { id: "asc" },
  });
}

/**
 * Guest-mode visibility for the map page frame. Toggled via
 * update-scrim-options, which revalidates the scrim tag.
 */
export async function getCachedScrimVisibility(scrimId: number) {
  "use cache";
  cacheLife("max");
  cacheTag(scrimTag(scrimId));
  return prisma.scrim.findFirst({
    where: { id: scrimId },
    select: { guestMode: true },
  });
}

/**
 * Fight-initiation analysis for the initiation tab. Derived purely from
 * immutable match events; failures degrade to "not available" so a bad log
 * never breaks the tab (and errors are not cached).
 */
export async function getCachedFightInitiation(
  mapId: number,
  mapDataId: number
) {
  "use cache";
  cacheLife("hours");
  cacheTag(mapTag(mapId));
  return getFightInitiationForMapData(mapDataId);
}
