import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import { mapNameToMapTypeMapping } from "@/types/map";
import { $Enums } from "@prisma/client";
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
          const _empty: string[] = []; return _empty;
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
          const _empty: string[] = []; return _empty;
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
          const _empty: string[] = []; return _empty;
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

        wideEvent.map_count = mapDataIds.length;
        wideEvent.player_stat_count = allPlayerStats.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(teamBaseDataQuerySuccessTotal);

        return {
          teamId,
          teamRoster,
          teamRosterSet,
          mapDataRecords: mapDataRecords as BaseTeamData["mapDataRecords"],
          mapDataIds,
          allPlayerStats,
          matchStarts,
          finalRounds,
          captures,
          payloadProgresses,
          pointProgresses,
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
        // Call the local closure directly — no context dependency
        const baseData = yield* getBaseTeamData(teamId, options);

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

    function baseDataCacheKeyOf(
      teamId: number,
      options?: BaseTeamDataOptions
    ) {
      return `${teamId}:${JSON.stringify(options ?? {})}`;
    }

    const baseDataCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const [teamIdStr, optionsJson] = [
          key.slice(0, key.indexOf(":")),
          key.slice(key.indexOf(":") + 1),
        ];
        const teamId = Number(teamIdStr);
        const options = JSON.parse(optionsJson) as BaseTeamDataOptions;
        return getBaseTeamData(teamId, options).pipe(
          Effect.tap(() => Metric.increment(teamCacheMissTotal))
        );
      },
    });

    const extendedDataCacheKeyOf = baseDataCacheKeyOf;

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
        baseDataCache
          .get(baseDataCacheKeyOf(teamId, options))
          .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
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
