import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import { removeDuplicateRows } from "@/lib/utils";
import type { HeroName } from "@/types/heroes";
import {
  type CalculatedStat,
  type MapType,
  type PlayerStat,
  Prisma,
} from "@prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import {
  aggregatePlayerStats,
  calculatePer10,
  calculateTrends,
} from "./computation";
import { ComparisonQueryError, ComparisonValidationError } from "./errors";
import {
  availableMapsDuration,
  availableMapsErrorTotal,
  availableMapsSuccessTotal,
  comparisonCacheRequestTotal,
  comparisonCacheMissTotal,
  comparisonStatsDuration,
  comparisonStatsErrorTotal,
  comparisonStatsSuccessTotal,
  teamPlayersDuration,
  teamPlayersErrorTotal,
  teamPlayersSuccessTotal,
} from "./metrics";
import type {
  AggregatedStats,
  AvailableMap,
  ComparisonStats,
  GetAvailableMapsParams,
  MapBreakdown,
  TeamPlayer,
} from "./types";

export { aggregatePlayerStats } from "./computation";

export type ComparisonAggregationServiceInterface = {
  readonly getComparisonStats: (
    mapIds: number[],
    playerName: string,
    heroes?: HeroName[]
  ) => Effect.Effect<
    ComparisonStats,
    ComparisonQueryError | ComparisonValidationError
  >;

  readonly getAvailableMapsForComparison: (
    params: GetAvailableMapsParams
  ) => Effect.Effect<AvailableMap[], ComparisonQueryError>;

  readonly getTeamPlayers: (
    teamId: number,
    mapIds?: number[]
  ) => Effect.Effect<TeamPlayer[], ComparisonQueryError>;
};

export class ComparisonAggregationService extends Context.Tag(
  "@app/data/comparison/ComparisonAggregationService"
)<ComparisonAggregationService, ComparisonAggregationServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<ComparisonAggregationServiceInterface> =
  Effect.gen(function* () {
    function getComparisonStats(
      mapIds: number[],
      playerName: string,
      heroes?: HeroName[]
    ): Effect.Effect<
      ComparisonStats,
      ComparisonQueryError | ComparisonValidationError
    > {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        playerName,
        mapIdCount: mapIds.length,
        heroFilter: heroes ?? [],
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("playerName", playerName);
        yield* Effect.annotateCurrentSpan("mapIdCount", mapIds.length);
        if (mapIds.length === 0) {
          return yield* new ComparisonValidationError({
            field: "mapIds",
            reason: "At least one map must be provided",
          });
        }

        const maps = yield* Effect.tryPromise({
          try: () =>
            prisma.map.findMany({
              where: { id: { in: mapIds } },
              include: {
                Scrim: true,
                mapData: {
                  include: {
                    match_start: true,
                  },
                },
              },
            }),
          catch: (error) =>
            new ComparisonQueryError({
              operation: "fetch maps for comparison stats",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("comparison.stats.fetchMaps", {
            attributes: { mapIdCount: mapIds.length },
          })
        );

        const mapDataIds = maps.flatMap((map) =>
          map.mapData.map((md) => md.id)
        );
        wideEvent.mapDataIdCount = mapDataIds.length;

        if (mapDataIds.length === 0) {
          return yield* new ComparisonValidationError({
            field: "mapDataIds",
            reason: "No map data found for the provided map IDs",
          });
        }

        const finalRoundStats = removeDuplicateRows(
          yield* Effect.tryPromise({
            try: () =>
              prisma.$queryRaw<PlayerStat[]>`
                WITH maxTime AS (
                  SELECT
                      MAX("match_time") AS max_time,
                      "MapDataId"
                  FROM
                      "PlayerStat"
                  WHERE
                      "MapDataId" IN (${Prisma.join(mapDataIds)})
                  GROUP BY
                      "MapDataId"
                )
                SELECT
                    ps.*
                FROM
                    "PlayerStat" ps
                    INNER JOIN maxTime m ON ps."match_time" = m.max_time AND ps."MapDataId" = m."MapDataId"
                WHERE
                    ps."MapDataId" IN (${Prisma.join(mapDataIds)})
                    AND ps."player_name" ILIKE ${playerName}
                    ${heroes && heroes.length > 0 ? Prisma.sql`AND ps."player_hero" IN (${Prisma.join(heroes)})` : Prisma.empty}
              `,
            catch: (error) =>
              new ComparisonQueryError({
                operation: "fetch final round player stats",
                cause: error,
              }),
          }).pipe(
            Effect.withSpan("comparison.stats.fetchFinalRoundStats", {
              attributes: { playerName, mapDataIdCount: mapDataIds.length },
            })
          )
        );

        wideEvent.finalRoundStatCount = finalRoundStats.length;

        const calculatedStatsWhere: Prisma.CalculatedStatWhereInput = {
          MapDataId: { in: mapDataIds },
          playerName: { equals: playerName, mode: "insensitive" },
          ...(heroes && heroes.length > 0 ? { hero: { in: heroes } } : {}),
        };

        const calculatedStats = yield* Effect.tryPromise({
          try: () =>
            prisma.calculatedStat.findMany({
              where: calculatedStatsWhere,
            }),
          catch: (error) =>
            new ComparisonQueryError({
              operation: "fetch calculated stats",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("comparison.stats.fetchCalculatedStats", {
            attributes: { playerName },
          })
        );

        wideEvent.calculatedStatCount = calculatedStats.length;

        const calculatedStatsByMapDataId: Record<number, CalculatedStat[]> = {};
        calculatedStats.forEach((stat) => {
          if (!calculatedStatsByMapDataId[stat.MapDataId]) {
            calculatedStatsByMapDataId[stat.MapDataId] = [];
          }
          calculatedStatsByMapDataId[stat.MapDataId].push(stat);
        });

        const statsByMapDataId: Record<number, PlayerStat[]> = {};
        finalRoundStats.forEach((stat) => {
          if (!stat.MapDataId) return;
          if (!statsByMapDataId[stat.MapDataId]) {
            statsByMapDataId[stat.MapDataId] = [];
          }
          statsByMapDataId[stat.MapDataId].push(stat);
        });

        const perMapBreakdown: MapBreakdown[] = [];
        for (const map of maps) {
          const mapStats: PlayerStat[] = [];
          for (const md of map.mapData) {
            const mdStats = statsByMapDataId[md.id] || [];
            mapStats.push(...mdStats);
          }

          const mapCalcStats: CalculatedStat[] = [];
          for (const md of map.mapData) {
            const mdStats = calculatedStatsByMapDataId[md.id] || [];
            mapCalcStats.push(...mdStats);
          }

          if (mapStats.length === 0) continue;

          const firstMapData = map.mapData[0];
          const matchStart = firstMapData?.match_start[0];
          const heroesPlayed = Array.from(
            new Set(mapStats.map((s) => s.player_hero))
          );

          const aggregatedMapStats = mapStats.reduce(
            (acc, stat) => ({
              eliminations: acc.eliminations + stat.eliminations,
              deaths: acc.deaths + stat.deaths,
              all_damage_dealt: acc.all_damage_dealt + stat.all_damage_dealt,
              healing_dealt: acc.healing_dealt + stat.healing_dealt,
              damage_blocked: acc.damage_blocked + stat.damage_blocked,
              hero_time_played: acc.hero_time_played + stat.hero_time_played,
            }),
            {
              eliminations: 0,
              deaths: 0,
              all_damage_dealt: 0,
              healing_dealt: 0,
              damage_blocked: 0,
              hero_time_played: 0,
            }
          );

          const timePlayed = aggregatedMapStats.hero_time_played || 0;
          const statsWithPer10 = {
            ...mapStats[0],
            ...aggregatedMapStats,
            eliminationsPer10: calculatePer10(
              aggregatedMapStats.eliminations,
              timePlayed
            ),
            deathsPer10: calculatePer10(aggregatedMapStats.deaths, timePlayed),
            allDamagePer10: calculatePer10(
              aggregatedMapStats.all_damage_dealt,
              timePlayed
            ),
            healingDealtPer10: calculatePer10(
              aggregatedMapStats.healing_dealt,
              timePlayed
            ),
            damageBlockedPer10: calculatePer10(
              aggregatedMapStats.damage_blocked,
              timePlayed
            ),
          };

          perMapBreakdown.push({
            mapId: map.id,
            mapDataId: firstMapData?.id ?? 0,
            mapName: matchStart?.map_name || map.name,
            mapType: matchStart?.map_type || ("Control" as MapType),
            scrimId: map.scrimId ?? 0,
            scrimName: map.Scrim?.name ?? "Unknown",
            date: map.Scrim?.date ?? map.createdAt,
            replayCode: map.replayCode,
            heroes: heroesPlayed as HeroName[],
            stats: statsWithPer10,
            calculatedStats: mapCalcStats,
          });
        }

        perMapBreakdown.sort((a, b) => a.date.getTime() - b.date.getTime());

        const aggregated = aggregatePlayerStats(
          finalRoundStats,
          calculatedStats,
          perMapBreakdown.map((m) => m.stats),
          perMapBreakdown.map((m) => m.calculatedStats)
        );

        const trends =
          perMapBreakdown.length >= 3
            ? calculateTrends(
                perMapBreakdown.map((m) => m.stats),
                perMapBreakdown.map((m) => m.calculatedStats)
              )
            : undefined;

        let heroBreakdown: Record<string, AggregatedStats> | undefined;
        if (!heroes || heroes.length > 1) {
          const heroesInvolved = Array.from(
            new Set(finalRoundStats.map((s) => s.player_hero))
          );
          if (heroesInvolved.length > 1) {
            heroBreakdown = {};
            for (const hero of heroesInvolved) {
              const heroStats = finalRoundStats.filter(
                (s) => s.player_hero === hero
              );
              const heroCalcStats = calculatedStats.filter(
                (s) => s.hero === hero
              );
              heroBreakdown[hero] = aggregatePlayerStats(
                heroStats,
                heroCalcStats
              );
            }
          }
        }

        wideEvent.perMapBreakdownCount = perMapBreakdown.length;
        wideEvent.hasTrends = !!trends;
        wideEvent.hasHeroBreakdown = !!heroBreakdown;
        wideEvent.outcome = "success";
        yield* Metric.increment(comparisonStatsSuccessTotal);

        return {
          playerName,
          filteredHeroes: heroes ?? [],
          mapCount: perMapBreakdown.length,
          mapIds,
          aggregated,
          perMapBreakdown,
          trends,
          heroBreakdown,
        } satisfies ComparisonStats;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(comparisonStatsErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("comparison.getComparisonStats")
                : Effect.logInfo("comparison.getComparisonStats");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                comparisonStatsDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("comparison.getComparisonStats")
      );
    }

    function getAvailableMapsForComparison(
      params: GetAvailableMapsParams
    ): Effect.Effect<AvailableMap[], ComparisonQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        teamId: params.teamId,
        playerName: params.playerName,
        hasDateFrom: !!params.dateFrom,
        hasDateTo: !!params.dateTo,
        mapType: params.mapType,
        heroFilter: params.heroes ?? [],
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamId", params.teamId);
        yield* Effect.annotateCurrentSpan("playerName", params.playerName);
        const { teamId, playerName, dateFrom, dateTo, mapType, heroes } =
          params;

        const dateFilter =
          dateFrom || dateTo
            ? {
                date: {
                  ...(dateFrom ? { gte: dateFrom } : {}),
                  ...(dateTo ? { lte: dateTo } : {}),
                },
              }
            : {};

        const scrims = yield* Effect.tryPromise({
          try: () =>
            prisma.scrim.findMany({
              where: {
                teamId,
                ...dateFilter,
              },
              include: {
                maps: {
                  include: {
                    mapData: {
                      include: {
                        match_start: true,
                        player_stat: {
                          where: {
                            player_name: {
                              equals: playerName,
                              mode: "insensitive",
                            },
                            ...(heroes && heroes.length > 0
                              ? { player_hero: { in: heroes } }
                              : {}),
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          catch: (error) =>
            new ComparisonQueryError({
              operation: "fetch scrims for available maps",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("comparison.availableMaps.fetchScrims", {
            attributes: { teamId, playerName },
          })
        );

        const availableMaps: AvailableMap[] = [];

        for (const scrim of scrims) {
          for (const map of scrim.maps) {
            const playerStats = map.mapData.flatMap((md) => md.player_stat);
            if (playerStats.length === 0) continue;

            const matchStart = map.mapData[0]?.match_start[0];
            if (!matchStart) continue;

            if (mapType && matchStart.map_type !== mapType) continue;

            const heroesPlayed = Array.from(
              new Set(playerStats.map((s) => s.player_hero))
            ) as HeroName[];

            availableMaps.push({
              id: map.id,
              name: matchStart.map_name,
              scrimId: scrim.id,
              scrimName: scrim.name,
              date: scrim.date,
              mapType: matchStart.map_type,
              replayCode: map.replayCode,
              playerHeroes: heroesPlayed,
            });
          }
        }

        availableMaps.sort((a, b) => b.date.getTime() - a.date.getTime());

        wideEvent.availableMapCount = availableMaps.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(availableMapsSuccessTotal);

        return availableMaps;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(availableMapsErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("comparison.getAvailableMapsForComparison")
                : Effect.logInfo("comparison.getAvailableMapsForComparison");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(availableMapsDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("comparison.getAvailableMapsForComparison")
      );
    }

    function getTeamPlayers(
      teamId: number,
      mapIds?: number[]
    ): Effect.Effect<TeamPlayer[], ComparisonQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        teamId,
        hasMapIds: !!mapIds,
        mapIdCount: mapIds?.length ?? 0,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamId", teamId);
        if (mapIds && mapIds.length > 0) {
          const maps = yield* Effect.tryPromise({
            try: () =>
              prisma.map.findMany({
                where: {
                  id: { in: mapIds },
                  Scrim: { teamId },
                },
                select: {
                  mapData: {
                    select: {
                      player_stat: {
                        select: { player_name: true },
                        distinct: ["player_name"],
                      },
                    },
                  },
                },
              }),
            catch: (error) =>
              new ComparisonQueryError({
                operation: "fetch maps for team players (filtered)",
                cause: error,
              }),
          }).pipe(
            Effect.withSpan("comparison.teamPlayers.fetchFilteredMaps", {
              attributes: { teamId, mapIdCount: mapIds.length },
            })
          );

          const playerMapCounts = new Map<string, number>();
          for (const map of maps) {
            for (const mapData of map.mapData) {
              for (const stat of mapData.player_stat) {
                const currentCount = playerMapCounts.get(stat.player_name) ?? 0;
                playerMapCounts.set(stat.player_name, currentCount + 1);
              }
            }
          }

          const players = Array.from(playerMapCounts.entries())
            .map(([name, mapCount]) => ({ name, mapCount }))
            .sort((a, b) => a.name.localeCompare(b.name));

          wideEvent.playerCount = players.length;
          wideEvent.outcome = "success";
          yield* Metric.increment(teamPlayersSuccessTotal);
          return players;
        }

        const scrims = yield* Effect.tryPromise({
          try: () =>
            prisma.scrim.findMany({
              where: { teamId },
              select: {
                maps: {
                  select: {
                    mapData: {
                      select: {
                        player_stat: {
                          select: { player_name: true },
                          distinct: ["player_name"],
                        },
                      },
                    },
                  },
                },
              },
            }),
          catch: (error) =>
            new ComparisonQueryError({
              operation: "fetch scrims for team players",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("comparison.teamPlayers.fetchScrims", {
            attributes: { teamId },
          })
        );

        const playerMapCounts = new Map<string, number>();

        for (const scrim of scrims) {
          for (const map of scrim.maps) {
            for (const mapData of map.mapData) {
              for (const stat of mapData.player_stat) {
                const currentCount = playerMapCounts.get(stat.player_name) ?? 0;
                playerMapCounts.set(stat.player_name, currentCount + 1);
              }
            }
          }
        }

        const players = Array.from(playerMapCounts.entries())
          .map(([name, mapCount]) => ({ name, mapCount }))
          .sort((a, b) => a.name.localeCompare(b.name));

        wideEvent.playerCount = players.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(teamPlayersSuccessTotal);
        return players;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(teamPlayersErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("comparison.getTeamPlayers")
                : Effect.logInfo("comparison.getTeamPlayers");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(teamPlayersDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("comparison.getTeamPlayers")
      );
    }

    const comparisonStatsCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const [mapIds, playerName, heroes] = JSON.parse(key) as [
          number[],
          string,
          HeroName[] | undefined,
        ];
        return getComparisonStats(mapIds, playerName, heroes).pipe(
          Effect.tap(() => Metric.increment(comparisonCacheMissTotal))
        );
      },
    });

    const availableMapsCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const params = JSON.parse(key) as GetAvailableMapsParams;
        return getAvailableMapsForComparison(params).pipe(
          Effect.tap(() => Metric.increment(comparisonCacheMissTotal))
        );
      },
    });

    const teamPlayersCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const [teamId, mapIds] = JSON.parse(key) as [
          number,
          number[] | undefined,
        ];
        return getTeamPlayers(teamId, mapIds).pipe(
          Effect.tap(() => Metric.increment(comparisonCacheMissTotal))
        );
      },
    });

    return {
      getComparisonStats: (
        mapIds: number[],
        playerName: string,
        heroes?: HeroName[]
      ) =>
        comparisonStatsCache
          .get(JSON.stringify([mapIds, playerName, heroes]))
          .pipe(
            Effect.tap(() => Metric.increment(comparisonCacheRequestTotal))
          ),
      getAvailableMapsForComparison: (params: GetAvailableMapsParams) =>
        availableMapsCache
          .get(JSON.stringify(params))
          .pipe(
            Effect.tap(() => Metric.increment(comparisonCacheRequestTotal))
          ),
      getTeamPlayers: (teamId: number, mapIds?: number[]) =>
        teamPlayersCache
          .get(JSON.stringify([teamId, mapIds]))
          .pipe(
            Effect.tap(() => Metric.increment(comparisonCacheRequestTotal))
          ),
    } satisfies ComparisonAggregationServiceInterface;
  });

export const ComparisonAggregationServiceLive = Layer.effect(
  ComparisonAggregationService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
