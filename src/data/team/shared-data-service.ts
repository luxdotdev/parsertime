import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import { mapNameToMapTypeMapping } from "@/types/map";
import { $Enums } from "@/generated/prisma/browser";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { TeamQueryError } from "./errors";
import {
  teamBaseDataQueryDuration,
  teamBaseDataQueryErrorTotal,
  teamBaseDataQuerySuccessTotal,
  teamCacheRequestTotal,
  teamCacheMissTotal,
  teamExtendedDataQueryDuration,
  teamExtendedDataQueryErrorTotal,
  teamExtendedDataQuerySuccessTotal,
  teamRosterQueryDuration,
  teamRosterQueryErrorTotal,
  teamRosterQuerySuccessTotal,
} from "./metrics";
import type {
  BaseTeamData,
  ExtendedTeamData,
  TeamDateRange,
} from "./shared-core";
import { findSubstituteMapIds } from "./shared-core";
import { getTeamSubstituteNames } from "./substitutes";

export type BaseTeamDataOptions = {
  excludePush?: boolean;
  excludeClash?: boolean;
  includeDateInfo?: boolean;
  dateRange?: TeamDateRange;
};

export type TeamSharedDataServiceInterface = {
  readonly getTeamRoster: (
    teamId: number
  ) => Effect.Effect<string[], TeamQueryError>;

  readonly getBaseTeamData: (
    teamId: number,
    options?: BaseTeamDataOptions
  ) => Effect.Effect<BaseTeamData, TeamQueryError>;

  readonly getExtendedTeamData: (
    teamId: number,
    options?: BaseTeamDataOptions
  ) => Effect.Effect<ExtendedTeamData, TeamQueryError>;
};

export class TeamSharedDataService extends Context.Tag(
  "@app/data/team/TeamSharedDataService"
)<TeamSharedDataService, TeamSharedDataServiceInterface>() {}

/** Derives an option-filtered view from the superset without refetching.
 * The team page requests up to five exclude/dateInfo variants concurrently;
 * fetching each independently quintupled the heaviest read on the page and
 * exhausted the connection pool. Excludes are a pure in-memory filter. */
function deriveBaseTeamData(
  superset: BaseTeamData,
  options: BaseTeamDataOptions
): BaseTeamData {
  const { excludePush = false, excludeClash = false } = options;
  if (!excludePush && !excludeClash) return superset;
  const mapDataRecords = superset.mapDataRecords.filter((record) => {
    if (!record.name) return false;
    const mapType =
      mapNameToMapTypeMapping[
        record.name as keyof typeof mapNameToMapTypeMapping
      ];
    if (excludePush && mapType === $Enums.MapType.Push) return false;
    if (excludeClash && mapType === $Enums.MapType.Clash) return false;
    return true;
  });
  const allowed = new Set(mapDataRecords.map((record) => record.id));
  function keep<T extends { MapDataId: number | null }>(rows: T[]): T[] {
    return rows.filter(
      (row) => row.MapDataId !== null && allowed.has(row.MapDataId)
    );
  }
  return {
    ...superset,
    mapDataRecords,
    mapDataIds: mapDataRecords.map((record) => record.id),
    allPlayerStats: keep(superset.allPlayerStats),
    matchStarts: keep(superset.matchStarts),
    finalRounds: keep(superset.finalRounds),
    captures: keep(superset.captures),
    payloadProgresses: keep(superset.payloadProgresses),
    pointProgresses: keep(superset.pointProgresses),
  };
}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<TeamSharedDataServiceInterface> = Effect.gen(
  function* () {
    function getTeamRoster(
      teamId: number
    ): Effect.Effect<string[], TeamQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { teamId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamId", teamId);
        const mapRecords = yield* Effect.tryPromise({
          try: () =>
            prisma.map.findMany({
              where: { Scrim: { Team: { id: teamId } } },
              select: { mapData: { select: { id: true } } },
            }),
          catch: (error) =>
            new TeamQueryError({
              operation: "fetch map records for roster",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("team.roster.fetchMapRecords", {
            attributes: { teamId },
          })
        );

        const mapDataIds = mapRecords.flatMap((m) =>
          m.mapData.map((md) => md.id)
        );

        if (mapDataIds.length === 0) {
          wideEvent.roster_size = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(teamRosterQuerySuccessTotal);
          const _empty: string[] = [];
          return _empty;
        }

        const allPlayerStats = yield* Effect.tryPromise({
          try: () =>
            prisma.playerStat.findMany({
              where: { MapDataId: { in: mapDataIds } },
              select: {
                player_name: true,
                player_team: true,
                MapDataId: true,
              },
            }),
          catch: (error) =>
            new TeamQueryError({
              operation: "fetch player stats for roster",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("team.roster.fetchPlayerStats", {
            attributes: { teamId, mapCount: mapDataIds.length },
          })
        );

        const playerFrequencyMap = new Map<string, number>();
        const mapPlayerSets = new Map<number, Set<string>>();

        for (const stat of allPlayerStats) {
          const mapDataId = stat.MapDataId;
          if (!mapDataId) continue;

          if (!mapPlayerSets.has(mapDataId)) {
            mapPlayerSets.set(mapDataId, new Set<string>());
          }

          const playersInMap = mapPlayerSets.get(mapDataId)!;
          if (!playersInMap.has(stat.player_name)) {
            playersInMap.add(stat.player_name);
            const currentCount = playerFrequencyMap.get(stat.player_name) ?? 0;
            playerFrequencyMap.set(stat.player_name, currentCount + 1);
          }
        }

        const sortedPlayers = Array.from(playerFrequencyMap.entries()).sort(
          (a, b) => b[1] - a[1]
        );

        if (sortedPlayers.length === 0) {
          wideEvent.roster_size = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(teamRosterQuerySuccessTotal);
          const _empty: string[] = [];
          return _empty;
        }

        let anchorPlayer: string | null = null;
        for (const [playerName] of sortedPlayers) {
          const playerExists = allPlayerStats.some(
            (stat) => stat.player_name === playerName
          );
          if (playerExists) {
            anchorPlayer = playerName;
            break;
          }
        }

        if (!anchorPlayer) {
          wideEvent.roster_size = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(teamRosterQuerySuccessTotal);
          const _empty: string[] = [];
          return _empty;
        }

        function findTeamNameForMap(mapDataId: number): string | null {
          for (const [playerName] of sortedPlayers) {
            for (const stat of allPlayerStats) {
              if (
                stat.MapDataId === mapDataId &&
                stat.player_name === playerName
              ) {
                return stat.player_team;
              }
            }
          }
          return null;
        }

        const rosterPlayers = new Set<string>();

        for (const mapDataId of mapDataIds) {
          const teamName = findTeamNameForMap(mapDataId);

          if (teamName) {
            for (const stat of allPlayerStats) {
              if (
                stat.MapDataId === mapDataId &&
                stat.player_team === teamName
              ) {
                rosterPlayers.add(stat.player_name);
              }
            }
          }
        }

        const roster = Array.from(rosterPlayers);
        wideEvent.roster_size = roster.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(teamRosterQuerySuccessTotal);
        return roster;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(teamRosterQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("team.getTeamRoster")
                : Effect.logInfo("team.getTeamRoster");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                teamRosterQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("team.getTeamRoster")
      );
    }

    function getBaseTeamData(
      teamId: number,
      options: BaseTeamDataOptions = {}
    ): Effect.Effect<BaseTeamData, TeamQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        teamId,
        excludePush: options.excludePush,
        excludeClash: options.excludeClash,
        includeDateInfo: options.includeDateInfo,
        hasDateRange: !!options.dateRange,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamId", teamId);
        const {
          excludePush = false,
          excludeClash = false,
          includeDateInfo = false,
          dateRange,
        } = options;

        // Call the local closure directly — no context dependency
        const teamRoster = yield* getTeamRoster(teamId);
        const teamRosterSet = new Set(teamRoster);

        // Substitutes stay on the identity roster above, but games they played
        // in are dropped from every aggregate built on this data (see
        // findSubstituteMapIds). Fetched once here so the exclusion is uniform
        // across all derived option-variants.
        const substituteNames = yield* Effect.tryPromise({
          try: () => getTeamSubstituteNames(teamId),
          catch: (error) =>
            new TeamQueryError({
              operation: "fetch substitutes for base data",
              cause: error,
            }),
        });

        const scrimWhereClause: Record<string, unknown> = {
          Team: { id: teamId },
        };
        if (dateRange) {
          scrimWhereClause.date = { gte: dateRange.from, lte: dateRange.to };
        }

        const allMapRecords = yield* Effect.tryPromise({
          try: () =>
            prisma.map.findMany({
              where: { Scrim: scrimWhereClause },
              select: {
                id: true,
                name: true,
                mapData: { select: { id: true } },
                ...(includeDateInfo && {
                  Scrim: {
                    select: {
                      id: true,
                      name: true,
                      date: true,
                    },
                  },
                }),
              },
              ...(includeDateInfo && {
                orderBy: {
                  Scrim: {
                    date: "desc" as const,
                  },
                },
              }),
            }),
          catch: (error) =>
            new TeamQueryError({
              operation: "fetch map records for base data",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("team.baseData.fetchMapRecords", {
            attributes: { teamId },
          })
        );

        let filteredMapRecords = allMapRecords;
        if (excludePush || excludeClash) {
          filteredMapRecords = allMapRecords.filter((record) => {
            const mapName = record.name;
            if (!mapName) return false;
            const mapType =
              mapNameToMapTypeMapping[
                mapName as keyof typeof mapNameToMapTypeMapping
              ];
            if (excludePush && mapType === $Enums.MapType.Push) return false;
            if (excludeClash && mapType === $Enums.MapType.Clash) return false;
            return true;
          });
        }

        const mapDataIds = filteredMapRecords.flatMap((m) =>
          m.mapData.map((md) => md.id)
        );

        const mapDataRecords = filteredMapRecords.flatMap((m) =>
          m.mapData.map((md) => ({
            id: md.id,
            name: m.name,
            ...("Scrim" in m && m.Scrim ? { Scrim: m.Scrim } : {}),
          }))
        );

        if (mapDataIds.length === 0) {
          wideEvent.map_count = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(teamBaseDataQuerySuccessTotal);
          return {
            teamId,
            teamRoster,
            teamRosterSet,
            mapDataRecords: [],
            mapDataIds: [],
            allPlayerStats: [],
            matchStarts: [],
            finalRounds: [],
            captures: [],
            payloadProgresses: [],
            pointProgresses: [],
          } satisfies BaseTeamData;
        }

        const [
          allPlayerStats,
          matchStarts,
          finalRounds,
          captures,
          payloadProgresses,
          pointProgresses,
        ] = yield* Effect.tryPromise({
          try: () =>
            Promise.all([
              prisma.playerStat.findMany({
                where: { MapDataId: { in: mapDataIds } },
                select: {
                  player_name: true,
                  player_team: true,
                  player_hero: true,
                  hero_time_played: true,
                  MapDataId: true,
                  eliminations: true,
                  final_blows: true,
                  deaths: true,
                  offensive_assists: true,
                  hero_damage_dealt: true,
                  damage_taken: true,
                  healing_dealt: true,
                  ultimates_earned: true,
                  ultimates_used: true,
                  healing_received: true,
                  self_healing: true,
                  damage_blocked: true,
                  solo_kills: true,
                  environmental_kills: true,
                },
              }),
              prisma.matchStart.findMany({
                where: { MapDataId: { in: mapDataIds } },
              }),
              prisma.roundEnd.findMany({
                where: { MapDataId: { in: mapDataIds } },
                orderBy: { round_number: "desc" },
              }),
              prisma.objectiveCaptured.findMany({
                where: { MapDataId: { in: mapDataIds } },
                orderBy: [{ round_number: "asc" }, { match_time: "asc" }],
              }),
              prisma.payloadProgress.findMany({
                where: { MapDataId: { in: mapDataIds } },
                orderBy: [
                  { round_number: "asc" },
                  { objective_index: "asc" },
                  { match_time: "asc" },
                ],
              }),
              prisma.pointProgress.findMany({
                where: { MapDataId: { in: mapDataIds } },
                orderBy: [
                  { round_number: "asc" },
                  { objective_index: "asc" },
                  { match_time: "asc" },
                ],
              }),
            ]),
          catch: (error) =>
            new TeamQueryError({
              operation: "fetch base team data tables",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("team.baseData.fetchAllTables", {
            attributes: { teamId, mapCount: mapDataIds.length },
          })
        );

        // Drop every map a substitute played in for this team, across all
        // downstream tables. Each table keys on MapDataId, so the same excluded
        // set filters them uniformly.
        const excludedMapIds = findSubstituteMapIds(
          mapDataIds,
          allPlayerStats,
          teamRosterSet,
          substituteNames
        );

        function dropExcludedMaps<T extends { MapDataId: number | null }>(
          rows: T[]
        ): T[] {
          if (excludedMapIds.size === 0) return rows;
          return rows.filter(
            (row) =>
              row.MapDataId !== null && !excludedMapIds.has(row.MapDataId)
          );
        }

        const keptMapDataRecords =
          excludedMapIds.size === 0
            ? mapDataRecords
            : mapDataRecords.filter((record) => !excludedMapIds.has(record.id));
        const keptMapDataIds =
          excludedMapIds.size === 0
            ? mapDataIds
            : mapDataIds.filter((id) => !excludedMapIds.has(id));
        const keptPlayerStats = dropExcludedMaps(allPlayerStats);

        wideEvent.map_count = keptMapDataIds.length;
        wideEvent.excluded_map_count = excludedMapIds.size;
        wideEvent.player_stat_count = keptPlayerStats.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(teamBaseDataQuerySuccessTotal);

        return {
          teamId,
          teamRoster,
          teamRosterSet,
          mapDataRecords: keptMapDataRecords as BaseTeamData["mapDataRecords"],
          mapDataIds: keptMapDataIds,
          allPlayerStats: keptPlayerStats,
          matchStarts: dropExcludedMaps(matchStarts),
          finalRounds: dropExcludedMaps(finalRounds),
          captures: dropExcludedMaps(captures),
          payloadProgresses: dropExcludedMaps(payloadProgresses),
          pointProgresses: dropExcludedMaps(pointProgresses),
        } satisfies BaseTeamData;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(teamBaseDataQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("team.getBaseTeamData")
                : Effect.logInfo("team.getBaseTeamData");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                teamBaseDataQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("team.getBaseTeamData")
      );
    }

    function getExtendedTeamData(
      teamId: number,
      options: BaseTeamDataOptions = {}
    ): Effect.Effect<ExtendedTeamData, TeamQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { teamId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamId", teamId);
        // Goes through the superset cache so extended variants never
        // re-trigger the heavy base fetch.
        const baseData = yield* getBaseTeamDataDerived(teamId, options);

        if (baseData.mapDataIds.length === 0) {
          wideEvent.map_count = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(teamExtendedDataQuerySuccessTotal);
          return {
            ...baseData,
            allKills: [],
            allRezzes: [],
            allUltimates: [],
          } satisfies ExtendedTeamData;
        }

        const [allKills, allRezzes, allUltimates] = yield* Effect.tryPromise({
          try: () =>
            Promise.all([
              prisma.kill.findMany({
                where: { MapDataId: { in: baseData.mapDataIds } },
                orderBy: { match_time: "asc" },
              }),
              prisma.mercyRez.findMany({
                where: { MapDataId: { in: baseData.mapDataIds } },
                orderBy: { match_time: "asc" },
              }),
              prisma.ultimateStart.findMany({
                where: { MapDataId: { in: baseData.mapDataIds } },
                orderBy: { match_time: "asc" },
              }),
            ]),
          catch: (error) =>
            new TeamQueryError({
              operation: "fetch extended team data (kills, rezzes, ults)",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("team.extendedData.fetchFightTables", {
            attributes: {
              teamId,
              mapCount: baseData.mapDataIds.length,
            },
          })
        );

        wideEvent.map_count = baseData.mapDataIds.length;
        wideEvent.kill_count = allKills.length;
        wideEvent.rez_count = allRezzes.length;
        wideEvent.ult_count = allUltimates.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(teamExtendedDataQuerySuccessTotal);

        return {
          ...baseData,
          allKills,
          allRezzes,
          allUltimates,
        } satisfies ExtendedTeamData;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(teamExtendedDataQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("team.getExtendedTeamData")
                : Effect.logInfo("team.getExtendedTeamData");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                teamExtendedDataQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("team.getExtendedTeamData")
      );
    }

    const rosterCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (teamId: number) =>
        getTeamRoster(teamId).pipe(
          Effect.tap(() => Metric.increment(teamCacheMissTotal))
        ),
    });

    // One superset fetch per (team, dateRange); every exclude/dateInfo
    // variant derives from it in memory. includeDateInfo is always fetched —
    // the extra Scrim fields are additive and cheap next to the stat tables.
    function supersetCacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
      return `${teamId}:${JSON.stringify(dateRange ?? null)}`;
    }

    const baseDataSupersetCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const teamId = Number(key.slice(0, key.indexOf(":")));
        const dateRange = JSON.parse(
          key.slice(key.indexOf(":") + 1)
        ) as TeamDateRange | null;
        return getBaseTeamData(teamId, {
          includeDateInfo: true,
          ...(dateRange === null ? {} : { dateRange }),
        }).pipe(Effect.tap(() => Metric.increment(teamCacheMissTotal)));
      },
    });

    function getBaseTeamDataDerived(
      teamId: number,
      options?: BaseTeamDataOptions
    ): Effect.Effect<BaseTeamData, TeamQueryError> {
      return baseDataSupersetCache
        .get(supersetCacheKeyOf(teamId, options?.dateRange))
        .pipe(
          Effect.map((superset) => deriveBaseTeamData(superset, options ?? {}))
        );
    }

    function extendedDataCacheKeyOf(
      teamId: number,
      options?: BaseTeamDataOptions
    ) {
      return `${teamId}:${JSON.stringify(options ?? {})}`;
    }

    const extendedDataCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const [teamIdStr, optionsJson] = [
          key.slice(0, key.indexOf(":")),
          key.slice(key.indexOf(":") + 1),
        ];
        const teamId = Number(teamIdStr);
        const options = JSON.parse(optionsJson) as BaseTeamDataOptions;
        return getExtendedTeamData(teamId, options).pipe(
          Effect.tap(() => Metric.increment(teamCacheMissTotal))
        );
      },
    });

    return {
      getTeamRoster: (teamId: number) =>
        rosterCache
          .get(teamId)
          .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
      getBaseTeamData: (teamId: number, options?: BaseTeamDataOptions) =>
        getBaseTeamDataDerived(teamId, options).pipe(
          Effect.tap(() => Metric.increment(teamCacheRequestTotal))
        ),
      getExtendedTeamData: (teamId: number, options?: BaseTeamDataOptions) =>
        extendedDataCache
          .get(extendedDataCacheKeyOf(teamId, options))
          .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    } satisfies TeamSharedDataServiceInterface;
  }
);

export const TeamSharedDataServiceLive = Layer.effect(
  TeamSharedDataService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
