import { revalidateTag } from "next/cache";

// Tag helpers for the cached data readers under `src/data/cached`. Kept in one
// place so the tag format stays in sync between the readers and the mutation
// routes that invalidate them.

export function scrimTag(scrimId: number) {
  return `scrim:${scrimId}`;
}

export function mapTag(mapId: number) {
  return `map:${mapId}`;
}

export function teamStatsTag(teamId: number) {
  return `team-stats:${teamId}`;
}

export function revalidateScrim(scrimId: number) {
  revalidateTag(scrimTag(scrimId), "max");
}

export function revalidateMap(mapId: number) {
  revalidateTag(mapTag(mapId), "max");
}

export function revalidateTeamStats(teamId: number) {
  revalidateTag(teamStatsTag(teamId), "max");
}
