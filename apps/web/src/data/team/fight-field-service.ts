import { EffectObservabilityLive } from "@/instrumentation";
import {
  buildFightField,
  CALLOUT_RADIUS_M,
  type FieldCallout,
  type FightField,
  type FightPoint,
} from "@/lib/fight-field";
import { CONTROL_OBJECTIVE_MAP } from "@/lib/map-calibration/control-map-index";
import prisma from "@/lib/prisma";
import {
  TENDENCIES_MAX_MAPDATA,
  TENDENCIES_SCRIM_WINDOW,
} from "@/lib/routes/constants";
import {
  getEngagementsForMapDataBatch,
  type EngagementWithZone,
} from "@/lib/ult-quality-db";
import {
  mergeEngagementSummaries,
  summarizeEngagements,
  type EngagementSummary,
} from "@/lib/engagement-rollups";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { TeamQueryError } from "./errors";
import {
  fightFieldQueryDuration,
  fightFieldQueryErrorTotal,
  fightFieldQuerySuccessTotal,
  teamCacheMissTotal,
  teamCacheRequestTotal,
} from "./metrics";
import {
  findSubstituteMapIds,
  findTeamNameForMapInMemory,
} from "./shared-core";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "./shared-data-service";
import { getTeamSubstituteNames } from "./substitutes";

export type NamedCallout = FieldCallout & { zoneName: string | null };

export type FightMapView = {
  /** Display + calibration key: "King's Row", or "Busan: Downtown". */
  mapName: string;
  field: FightField | null;
  namedCallouts: NamedCallout[];
  totalDecisiveFights: number;
  overallWinratePercent: number | null;
  zoneScorecard:
    | {
        zoneName: string;
        won: number;
        lost: number;
        even: number;
        winratePercent: number | null;
      }[]
    | null;
};

export type FightFieldResult = FightMapView[];

export type FightFieldServiceInterface = {
  readonly getFightFields: (
    teamId: number
  ) => Effect.Effect<FightFieldResult, TeamQueryError>;
};

export class FightFieldService extends Context.Tag(
  "@app/data/team/FightFieldService"
)<FightFieldService, FightFieldServiceInterface>() {}

const CACHE_TTL = Duration.minutes(5);
const CACHE_CAPACITY = 32;

type PooledEngagement = EngagementWithZone & { won: boolean | null };

export const make: Effect.Effect<
  FightFieldServiceInterface,
  never,
  TeamSharedDataService
> = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getFightFields(
    teamId: number
  ): Effect.Effect<FightFieldResult, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = { teamId };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);

      const scrims = yield* Effect.tryPromise({
        try: () =>
          prisma.scrim.findMany({
            where: { Team: { id: teamId } },
            orderBy: { date: "desc" },
            take: TENDENCIES_SCRIM_WINDOW,
            select: {
              maps: {
                select: { name: true, mapData: { select: { id: true } } },
              },
            },
          }),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch scrims for fight fields",
            cause: error,
          }),
      });

      const mapDataIdsByMapName = new Map<string, number[]>();
      for (const scrim of scrims) {
        for (const map of scrim.maps) {
          if (!map.name) continue;
          const ids = mapDataIdsByMapName.get(map.name) ?? [];
          for (const md of map.mapData) {
            if (ids.length >= TENDENCIES_MAX_MAPDATA) break;
            ids.push(md.id);
          }
          mapDataIdsByMapName.set(map.name, ids);
        }
      }

      const allMapDataIds = Array.from(mapDataIdsByMapName.values()).flat();
      wideEvent.scrim_count = scrims.length;
      wideEvent.map_name_count = mapDataIdsByMapName.size;

      const teamRoster = yield* shared.getTeamRoster(teamId);
      const teamRosterSet = new Set(teamRoster);
      const substituteNames = yield* Effect.tryPromise({
        try: () => getTeamSubstituteNames(teamId),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch substitutes for fight fields",
            cause: error,
          }),
      });

      const [allPlayerStats, allRoundStarts] =
        allMapDataIds.length === 0
          ? [[], []]
          : yield* Effect.tryPromise({
              try: () =>
                Promise.all([
                  prisma.playerStat.findMany({
                    where: { MapDataId: { in: allMapDataIds } },
                    select: {
                      player_name: true,
                      player_team: true,
                      MapDataId: true,
                    },
                  }),
                  prisma.roundStart.findMany({
                    where: { MapDataId: { in: allMapDataIds } },
                    select: {
                      MapDataId: true,
                      match_time: true,
                      objective_index: true,
                    },
                    orderBy: { match_time: "asc" },
                  }),
                ]),
              catch: (error) =>
                new TeamQueryError({
                  operation: "fetch stats and rounds for fight fields",
                  cause: error,
                }),
            });

      const roundStartsByMapData = new Map<
        number,
        { t: number; objectiveIndex: number }[]
      >();
      for (const r of allRoundStarts) {
        if (r.MapDataId == null) continue;
        const list = roundStartsByMapData.get(r.MapDataId) ?? [];
        list.push({ t: r.match_time, objectiveIndex: r.objective_index });
        roundStartsByMapData.set(r.MapDataId, list);
      }

      const views: FightMapView[] = [];

      // Maps a substitute played in for our team are dropped wholesale, the
      // same as every other team-stats read.
      const excludedMapIds = findSubstituteMapIds(
        allMapDataIds,
        allPlayerStats,
        teamRosterSet,
        substituteNames
      );

      // Prefetch engagements for every eligible map in one batched call:
      // cache hits resolve from the shared memo, misses load chunk-wise
      // with `IN` queries instead of a per-map battery.
      const eligibleIds: number[] = [];
      for (const [, mapDataIds] of mapDataIdsByMapName) {
        for (const mapDataId of mapDataIds) {
          if (excludedMapIds.has(mapDataId)) continue;
          const side = findTeamNameForMapInMemory(
            mapDataId,
            allPlayerStats,
            teamRosterSet
          );
          if (side !== null) eligibleIds.push(mapDataId);
        }
      }
      const engagementsByMapData = yield* Effect.tryPromise({
        try: () => getEngagementsForMapDataBatch(eligibleIds),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch engagements for fight fields",
            cause: error,
          }),
      });

      for (const [mapName, mapDataIds] of mapDataIdsByMapName) {
        const subMaps = CONTROL_OBJECTIVE_MAP[mapName];
        // One pool per display map: the base name, or each control sub-map.
        const pools = new Map<
          string,
          {
            points: FightPoint[];
            engagements: PooledEngagement[];
            summaries: EngagementSummary[];
          }
        >();
        function poolFor(key: string) {
          const existing = pools.get(key);
          if (existing) return existing;
          const points: FightPoint[] = [];
          const engagements: PooledEngagement[] = [];
          const summaries: EngagementSummary[] = [];
          const created = { points, engagements, summaries };
          pools.set(key, created);
          return created;
        }

        for (const mapDataId of mapDataIds) {
          if (excludedMapIds.has(mapDataId)) continue;
          const ourSide = findTeamNameForMapInMemory(
            mapDataId,
            allPlayerStats,
            teamRosterSet
          );
          if (ourSide === null) continue;

          const engagements = engagementsByMapData.get(mapDataId) ?? [];
          if (engagements.length === 0) continue;

          const rounds = roundStartsByMapData.get(mapDataId) ?? [];
          function assign(t: number): number | null {
            let current: number | null = null;
            for (const r of rounds) {
              if (r.t <= t) current = r.objectiveIndex;
              else break;
            }
            return current;
          }

          const byPool = new Map<string, EngagementWithZone[]>();
          for (const engagement of engagements) {
            let key = mapName;
            if (subMaps) {
              const idx = assign(engagement.start);
              if (idx === null || !subMaps[idx]) continue;
              key = subMaps[idx];
            }
            const list = byPool.get(key) ?? [];
            list.push(engagement);
            byPool.set(key, list);
          }

          for (const [key, engs] of byPool) {
            const pool = poolFor(key);
            pool.summaries.push(summarizeEngagements(engs, ourSide));
            for (const engagement of engs) {
              const won =
                engagement.winner === null
                  ? null
                  : engagement.winner === ourSide;
              pool.engagements.push({ ...engagement, won });
              if (won !== null) {
                pool.points.push({
                  x: engagement.centroid.x,
                  z: engagement.centroid.z,
                  won,
                });
              }
            }
          }
        }

        for (const [displayName, pool] of pools) {
          if (pool.engagements.length === 0) continue;
          const field = buildFightField(pool.points);

          const namedCallouts: NamedCallout[] = (field?.callouts ?? []).map(
            (callout) => {
              const votes = new Map<string, number>();
              for (const engagement of pool.engagements) {
                if (!engagement.zoneName) continue;
                if (
                  Math.hypot(
                    engagement.centroid.x - callout.x,
                    engagement.centroid.z - callout.z
                  ) > CALLOUT_RADIUS_M
                ) {
                  continue;
                }
                votes.set(
                  engagement.zoneName,
                  (votes.get(engagement.zoneName) ?? 0) + 1
                );
              }
              let zoneName: string | null = null;
              let best = 0;
              for (const [name, count] of votes) {
                if (count > best) {
                  best = count;
                  zoneName = name;
                }
              }
              return { ...callout, zoneName };
            }
          );

          const merged = mergeEngagementSummaries(pool.summaries);
          const zoneScorecard =
            merged.byZone.length > 0
              ? merged.byZone
                  .map((zone) => ({
                    zoneName: zone.zoneName,
                    won: zone.won,
                    lost: zone.lost,
                    even: zone.even,
                    winratePercent:
                      zone.won + zone.lost > 0
                        ? Math.round((zone.won / (zone.won + zone.lost)) * 100)
                        : null,
                  }))
                  .sort(
                    (a, b) =>
                      b.won + b.lost + b.even - (a.won + a.lost + a.even)
                  )
              : null;

          views.push({
            mapName: displayName,
            field,
            namedCallouts,
            totalDecisiveFights: pool.points.length,
            overallWinratePercent: field?.overallWinrate ?? null,
            zoneScorecard,
          });
        }
      }

      views.sort((a, b) => b.totalDecisiveFights - a.totalDecisiveFights);

      wideEvent.view_count = views.length;
      wideEvent.outcome = "success";
      yield* Metric.increment(fightFieldQuerySuccessTotal);
      return views;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(fightFieldQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.fightField.getFightFields")
              : Effect.logInfo("team.fightField.getFightFields");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(fightFieldQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.fightField.getFightFields")
    );
  }

  const fieldCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (teamId: number) =>
      getFightFields(teamId).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      ),
  });

  return {
    getFightFields: (teamId: number) =>
      fieldCache
        .get(teamId)
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies FightFieldServiceInterface;
});

export const FightFieldServiceLive = Layer.effect(FightFieldService, make).pipe(
  Layer.provide(TeamSharedDataServiceLive),
  Layer.provide(EffectObservabilityLive)
);
