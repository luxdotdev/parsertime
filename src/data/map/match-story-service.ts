import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import { groupKillsIntoFightsByMapDataId } from "@/lib/server-utils";
import { loadLatestArtifact } from "@/lib/win-probability/artifact-store";
import {
  computeMatchStory,
  type EngagementLike,
  type MatchStoryData,
} from "@/lib/win-probability/timeline";
import { fetchEventLog } from "@/lib/win-probability/training/extract";
import { Context, Effect, Layer } from "effect";
import { MapQueryError } from "./errors";

export type MatchStoryResult =
  | { status: "ready"; data: MatchStoryData }
  | { status: "no_family_model" };

export type ScrimWpaEntry = {
  player: string;
  team: string;
  wpa: number;
  maps: number;
};

export type MatchStoryServiceInterface = {
  /** null → no artifact / unsupported mode: hide the tab entirely. */
  readonly getMatchStory: (
    mapDataId: number
  ) => Effect.Effect<MatchStoryResult | null, MapQueryError>;
  /** Aggregated per-player WPA across all maps of a scrim; null → no artifact. */
  readonly getScrimWpa: (
    scrimId: number
  ) => Effect.Effect<ScrimWpaEntry[] | null, MapQueryError>;
};

export class MatchStoryService extends Context.Tag(
  "@app/data/map/MatchStoryService"
)<MatchStoryService, MatchStoryServiceInterface>() {}

/** A map's story is immutable for a given model version, so results are
 * cached per instance. Without this, every page view re-runs the full
 * event fan-out and starves the (5-connection) Prisma pool under
 * concurrent requests — the staging incident of 2026-06-12. */
const STORY_CACHE_CAP = 128;
const storyCache = new Map<string, MatchStoryResult | null>();

function cacheGet(key: string): MatchStoryResult | null | undefined {
  if (!storyCache.has(key)) return undefined;
  const value = storyCache.get(key)!;
  // Refresh recency (Map preserves insertion order).
  storyCache.delete(key);
  storyCache.set(key, value);
  return value;
}

function cacheSet(key: string, value: MatchStoryResult | null): void {
  storyCache.set(key, value);
  if (storyCache.size > STORY_CACHE_CAP) {
    storyCache.delete(storyCache.keys().next().value!);
  }
}

async function assembleStory(
  mapDataId: number
): Promise<MatchStoryResult | null> {
  const artifact = await loadLatestArtifact();
  if (artifact === null) return null;

  const resolvedId = await resolveMapDataId(mapDataId);
  const cacheKey = `${resolvedId}:v${artifact.modelVersion}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  const log = await fetchEventLog(resolvedId);
  if (log === null) {
    cacheSet(cacheKey, null);
    return null; // unsupported mode or missing rounds
  }

  const where = { MapDataId: resolvedId };
  const [fights, offensive, defensive] = await Promise.all([
    // The canonical fight grouping — identical boundaries to the killfeed.
    // (The spatial engagement clustering chains drifting fights into long
    // blobs by design; wrong unit for a fight ledger.)
    groupKillsIntoFightsByMapDataId(resolvedId),
    prisma.offensiveAssist.findMany({ where }),
    prisma.defensiveAssist.findMany({ where }),
  ]);
  const engagements: EngagementLike[] = fights.map((fight) => {
    const killsByTeam: Record<string, number> = {};
    const participants: string[] = [];
    for (const kill of fight.kills) {
      killsByTeam[kill.attacker_team] =
        (killsByTeam[kill.attacker_team] ?? 0) + 1;
      for (const name of [kill.attacker_name, kill.victim_name]) {
        if (!participants.includes(name)) participants.push(name);
      }
    }
    const k1 = killsByTeam[log.team1] ?? 0;
    const k2 = killsByTeam[log.team2] ?? 0;
    return {
      start: fight.start,
      end: fight.end,
      zoneName: null,
      winner: k1 > k2 ? log.team1 : k2 > k1 ? log.team2 : null,
      killsByTeam,
      participants,
    };
  });
  const assists = [...offensive, ...defensive].map((a) => ({
    time: a.match_time,
    team: a.player_team,
    player: a.player_name,
  }));

  const data = computeMatchStory({ log, artifact, engagements, assists });
  const result: MatchStoryResult =
    data === null ? { status: "no_family_model" } : { status: "ready", data };
  cacheSet(cacheKey, result);
  return result;
}

async function aggregateScrimWpa(
  scrimId: number
): Promise<ScrimWpaEntry[] | null> {
  const artifact = await loadLatestArtifact();
  if (artifact === null) return null;

  const maps = await prisma.matchStart.findMany({
    where: { scrimId, MapDataId: { not: null } },
    select: { MapDataId: true },
    distinct: ["MapDataId"],
  });
  const totals = new Map<string, ScrimWpaEntry>();
  for (const m of maps) {
    const story = await assembleStory(m.MapDataId!);
    if (story?.status !== "ready") continue;
    for (const p of story.data.wpa) {
      const id = `${p.team} ${p.player}`;
      const existing = totals.get(id) ?? {
        player: p.player,
        team: p.team,
        wpa: 0,
        maps: 0,
      };
      existing.wpa += p.wpa;
      existing.maps += 1;
      totals.set(id, existing);
    }
  }
  return [...totals.values()].sort((a, b) => b.wpa - a.wpa);
}

export const make: Effect.Effect<MatchStoryServiceInterface> = Effect.succeed({
  getMatchStory: (mapDataId: number) =>
    Effect.tryPromise({
      try: () => assembleStory(mapDataId),
      catch: (error) =>
        new MapQueryError({ operation: "compute match story", cause: error }),
    }),
  getScrimWpa: (scrimId: number) =>
    Effect.tryPromise({
      try: () => aggregateScrimWpa(scrimId),
      catch: (error) =>
        new MapQueryError({ operation: "compute scrim wpa", cause: error }),
    }),
});

export const MatchStoryServiceLive = Layer.effect(MatchStoryService, make);
