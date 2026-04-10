import { determineRole } from "@/lib/player-table-data";
import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import type { HeroName } from "@/types/heroes";
import { mapNameToMapTypeMapping } from "@/types/map";
import { $Enums } from "@prisma/client";
import {
  Cache,
  Context,
  Duration,
  Effect,
  Layer,
  Metric,
  MetricBoundaries,
} from "effect";
import { TeamQueryError } from "./errors";
import { teamCacheMissTotal, teamCacheRequestTotal } from "./metrics";
import type { TeamDateRange } from "./shared-core";
import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildProgressMaps,
  findTeamNameForMapInMemory,
  parseDateRangeFromCacheKey,
} from "./shared-core";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "./shared-data-service";
import type {
  HeroPickrate,
  HeroPickrateMatrix,
  HeroPickrateRawData,
  PlayerHeroData,
  PlayerMapPerformance,
  PlayerMapPerformanceMatrix,
} from "./types";

const analyticsQuerySuccessTotal = Metric.counter(
  "team.analytics.query.success",
  {
    description: "Total successful team analytics queries",
    incremental: true,
  }
);

const analyticsQueryErrorTotal = Metric.counter("team.analytics.query.error", {
  description: "Total team analytics query failures",
  incremental: true,
});

const analyticsQueryDuration = Metric.histogram(
  "team.analytics.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team analytics query duration in milliseconds"
);

export type {
  HeroPickrate,
  HeroPickrateMatrix,
  HeroPickrateRawData,
  PlayerHeroData,
  PlayerMapPerformance,
  PlayerMapPerformanceMatrix,
} from "./types";

export type TeamAnalyticsServiceInterface = {
  readonly getHeroPickrateMatrix: (
    teamId: number,
    dateFrom?: Date,
    dateTo?: Date
  ) => Effect.Effect<HeroPickrateMatrix, TeamQueryError>;

  readonly getPlayerMapPerformanceMatrix: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<PlayerMapPerformanceMatrix, TeamQueryError>;

  readonly getHeroPickrateRawData: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<HeroPickrateRawData, TeamQueryError>;
};

export class TeamAnalyticsService extends Context.Tag(
  "@app/data/team/TeamAnalyticsService"
)<TeamAnalyticsService, TeamAnalyticsServiceInterface>() {}

function buildPlayerHeroData(
  mapDataRecords: { id: number; name: string | null }[],
  allPlayerStats: {
    player_name: string;
    player_team: string;
    player_hero: string;
    hero_time_played: number;
    MapDataId: number | null;
  }[],
  teamRosterSet: Set<string>
): HeroPickrateMatrix {
  const playerHeroMap = new Map<
    string,
    Map<HeroName, { playtime: number; games: Set<number> }>
  >();
  const allHeroesSet = new Set<HeroName>();

  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;

    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (!teamName) continue;

    const playersOnMap = allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team === teamName
    );

    if (!playersOnMap.every((p) => teamRosterSet.has(p.player_name))) continue;

    for (const stat of playersOnMap) {
      const playerName = stat.player_name;
      const heroName = stat.player_hero as HeroName;

      if (!playerHeroMap.has(playerName)) {
        playerHeroMap.set(playerName, new Map());
      }

      const playerHeroes = playerHeroMap.get(playerName)!;
      if (!playerHeroes.has(heroName)) {
        playerHeroes.set(heroName, { playtime: 0, games: new Set() });
      }

      const heroData = playerHeroes.get(heroName)!;
      heroData.playtime += stat.hero_time_played;
      heroData.games.add(mapDataId);

      allHeroesSet.add(heroName);
    }
  }

  const players: PlayerHeroData[] = [];

  for (const [playerName, heroesMap] of playerHeroMap.entries()) {
    let totalPlaytime = 0;
    const heroes: HeroPickrate[] = [];

    for (const [heroName, data] of heroesMap.entries()) {
      const role = determineRole(heroName);
      if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;

      totalPlaytime += data.playtime;
      heroes.push({
        heroName,
        role,
        playtime: data.playtime,
        gamesPlayed: data.games.size,
      });
    }

    heroes.sort((a, b) => b.playtime - a.playtime);

    players.push({
      playerName,
      heroes,
      totalPlaytime,
    });
  }

  players.sort((a, b) => b.totalPlaytime - a.totalPlaytime);

  return {
    players,
    allHeroes: Array.from(allHeroesSet),
  };
}

export const make = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getHeroPickrateMatrix(
    teamId: number,
    dateFrom?: Date,
    dateTo?: Date
  ): Effect.Effect<HeroPickrateMatrix, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!(dateFrom && dateTo),
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);

      // Special handling for date range filtering - need custom query
      if (dateFrom && dateTo) {
        const teamRoster = yield* shared.getTeamRoster(teamId);
        const teamRosterSet = new Set(teamRoster);

        if (teamRoster.length === 0) {
          wideEvent.outcome = "success";
          wideEvent.player_count = 0;
          yield* Metric.increment(analyticsQuerySuccessTotal);
          const _empty: HeroPickrateMatrix = { players: [], allHeroes: [] };
          return _empty;
        }

        const dateFilter = {
          date: { gte: dateFrom, lte: dateTo },
        };

        const allMapDataRecords = yield* Effect.tryPromise({
          try: () =>
            prisma.map.findMany({
              where: {
                Scrim: {
                  Team: { id: teamId },
                  ...dateFilter,
                },
              },
              select: { id: true, name: true },
            }),
          catch: (error) =>
            new TeamQueryError({
              operation: "fetch map records for pickrate with date range",
              cause: error,
            }),
        });

        const mapDataRecords = allMapDataRecords.filter((record) => {
          const mapName = record.name;
          if (!mapName) return false;
          const mapType =
            mapNameToMapTypeMapping[
              mapName as keyof typeof mapNameToMapTypeMapping
            ];
          return (
            mapType !== $Enums.MapType.Push && mapType !== $Enums.MapType.Clash
          );
        });

        if (mapDataRecords.length === 0) {
          wideEvent.outcome = "success";
          wideEvent.player_count = 0;
          yield* Metric.increment(analyticsQuerySuccessTotal);
          const _empty: HeroPickrateMatrix = { players: [], allHeroes: [] };
          return _empty;
        }

        const mapDataIds = mapDataRecords.map((md) => md.id);

        const allPlayerStats = yield* Effect.tryPromise({
          try: () =>
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
          catch: (error) =>
            new TeamQueryError({
              operation: "fetch player stats for pickrate with date range",
              cause: error,
            }),
        });

        const result = buildPlayerHeroData(
          mapDataRecords,
          allPlayerStats,
          teamRosterSet
        );
        wideEvent.outcome = "success";
        wideEvent.player_count = result.players.length;
        yield* Metric.increment(analyticsQuerySuccessTotal);
        return result;
      }

      // No date range - use shared data
      const sharedData = yield* shared.getBaseTeamData(teamId, {
        excludePush: true,
        excludeClash: true,
      });

      if (sharedData.mapDataRecords.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.player_count = 0;
        yield* Metric.increment(analyticsQuerySuccessTotal);
        const _empty: HeroPickrateMatrix = { players: [], allHeroes: [] };
        return _empty;
      }

      const result = buildPlayerHeroData(
        sharedData.mapDataRecords,
        sharedData.allPlayerStats,
        sharedData.teamRosterSet
      );
      wideEvent.outcome = "success";
      wideEvent.player_count = result.players.length;
      yield* Metric.increment(analyticsQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(analyticsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.analytics.getHeroPickrateMatrix")
              : Effect.logInfo("team.analytics.getHeroPickrateMatrix");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(analyticsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.analytics.getHeroPickrateMatrix")
    );
  }

  function getPlayerMapPerformanceMatrix(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<PlayerMapPerformanceMatrix, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const sharedData = yield* shared.getBaseTeamData(teamId, {
        excludePush: true,
        excludeClash: true,
        dateRange,
      });

      if (sharedData.mapDataRecords.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.player_count = 0;
        yield* Metric.increment(analyticsQuerySuccessTotal);
        return {
          players: [],
          maps: [],
          performance: [],
        } satisfies PlayerMapPerformanceMatrix;
      }

      const {
        teamRosterSet,
        mapDataRecords,
        allPlayerStats,
        matchStarts,
        finalRounds,
        captures,
        payloadProgresses,
        pointProgresses,
      } = sharedData;

      // Build lookup maps
      const finalRoundMap = buildFinalRoundMap(finalRounds);
      const matchStartMap = buildMatchStartMap(matchStarts);

      const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
        captures,
        matchStartMap
      );
      const {
        team1ProgressMap: team1PayloadProgressMap,
        team2ProgressMap: team2PayloadProgressMap,
      } = buildProgressMaps(payloadProgresses, matchStartMap);
      const {
        team1ProgressMap: team1PointProgressMap,
        team2ProgressMap: team2PointProgressMap,
      } = buildProgressMaps(pointProgresses, matchStartMap);

      type MapData = {
        players: Set<string>;
        wins: number;
        losses: number;
      };

      const playerMapStats = new Map<string, Map<string, MapData>>();

      for (const mapDataRecord of mapDataRecords) {
        const mapDataId = mapDataRecord.id;
        const mapName = mapDataRecord.name;
        if (!mapName) continue;

        const teamName = findTeamNameForMapInMemory(
          mapDataId,
          allPlayerStats,
          teamRosterSet
        );
        if (!teamName) continue;

        const playersOnMap = allPlayerStats.filter(
          (stat) =>
            stat.MapDataId === mapDataId && stat.player_team === teamName
        );

        if (!playersOnMap.every((p) => teamRosterSet.has(p.player_name)))
          continue;

        const matchDetails = matchStartMap.get(mapDataId) ?? null;
        const finalRound = finalRoundMap.get(mapDataId) ?? null;
        const winner = calculateWinner({
          matchDetails,
          finalRound,
          team1Captures: team1CapturesMap.get(mapDataId) ?? [],
          team2Captures: team2CapturesMap.get(mapDataId) ?? [],
          team1PayloadProgress: team1PayloadProgressMap.get(mapDataId) ?? [],
          team2PayloadProgress: team2PayloadProgressMap.get(mapDataId) ?? [],
          team1PointProgress: team1PointProgressMap.get(mapDataId) ?? [],
          team2PointProgress: team2PointProgressMap.get(mapDataId) ?? [],
        });

        const isWin = winner === teamName;

        const uniquePlayersOnMap = new Set<string>();
        for (const stat of playersOnMap) {
          uniquePlayersOnMap.add(stat.player_name);
        }

        for (const playerName of uniquePlayersOnMap) {
          if (!playerMapStats.has(playerName)) {
            playerMapStats.set(playerName, new Map());
          }

          const playerMaps = playerMapStats.get(playerName)!;
          if (!playerMaps.has(mapName)) {
            playerMaps.set(mapName, {
              players: new Set(),
              wins: 0,
              losses: 0,
            });
          }

          const mapData = playerMaps.get(mapName)!;
          mapData.players.add(playerName);
          if (isWin) {
            mapData.wins++;
          } else {
            mapData.losses++;
          }
        }
      }

      const performance: PlayerMapPerformance[] = [];
      const uniquePlayers = new Set<string>();
      const uniqueMaps = new Set<string>();

      for (const [playerName, mapsData] of playerMapStats.entries()) {
        uniquePlayers.add(playerName);

        for (const [mapName, data] of mapsData.entries()) {
          uniqueMaps.add(mapName);
          const gamesPlayed = data.wins + data.losses;
          const winrate = gamesPlayed > 0 ? (data.wins / gamesPlayed) * 100 : 0;

          performance.push({
            playerName,
            mapName,
            wins: data.wins,
            losses: data.losses,
            winrate,
            gamesPlayed,
          });
        }
      }

      wideEvent.outcome = "success";
      wideEvent.player_count = uniquePlayers.size;
      wideEvent.map_count = uniqueMaps.size;
      yield* Metric.increment(analyticsQuerySuccessTotal);

      return {
        players: Array.from(uniquePlayers).sort(),
        maps: Array.from(uniqueMaps).sort(),
        performance,
      };
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(analyticsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.analytics.getPlayerMapPerformanceMatrix")
              : Effect.logInfo("team.analytics.getPlayerMapPerformanceMatrix");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(analyticsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.analytics.getPlayerMapPerformanceMatrix")
    );
  }

  function getHeroPickrateRawData(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<HeroPickrateRawData, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const teamRoster = yield* shared.getTeamRoster(teamId);

      if (teamRoster.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.map_count = 0;
        yield* Metric.increment(analyticsQuerySuccessTotal);
        return {
          teamRoster: [],
          mapDataRecords: [],
          allPlayerStats: [],
        } satisfies HeroPickrateRawData;
      }

      const scrimWhereClause: Record<string, unknown> = {
        Team: { id: teamId },
      };
      if (dateRange) {
        scrimWhereClause.date = { gte: dateRange.from, lte: dateRange.to };
      }

      const allMapDataRecords = yield* Effect.tryPromise({
        try: () =>
          prisma.map.findMany({
            where: { Scrim: scrimWhereClause },
            select: {
              id: true,
              name: true,
              Scrim: {
                select: {
                  date: true,
                },
              },
            },
            orderBy: {
              Scrim: {
                date: "desc",
              },
            },
          }),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch map records for raw hero pickrate data",
            cause: error,
          }),
      });

      const mapDataRecords = allMapDataRecords
        .filter((record) => {
          const mapName = record.name;
          if (!mapName) return false;
          const mapType =
            mapNameToMapTypeMapping[
              mapName as keyof typeof mapNameToMapTypeMapping
            ];
          return (
            mapType !== $Enums.MapType.Push && mapType !== $Enums.MapType.Clash
          );
        })
        .map((record) => ({
          id: record.id,
          name: record.name,
          scrimDate: record.Scrim?.date ?? new Date(),
        }));

      if (mapDataRecords.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.map_count = 0;
        yield* Metric.increment(analyticsQuerySuccessTotal);
        return {
          teamRoster,
          mapDataRecords: [],
          allPlayerStats: [],
        } satisfies HeroPickrateRawData;
      }

      const mapDataIds = mapDataRecords.map((md) => md.id);

      const allPlayerStats = yield* Effect.tryPromise({
        try: () =>
          prisma.playerStat.findMany({
            where: { MapDataId: { in: mapDataIds } },
            select: {
              player_name: true,
              player_team: true,
              player_hero: true,
              hero_time_played: true,
              MapDataId: true,
            },
          }),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch player stats for raw hero pickrate data",
            cause: error,
          }),
      });

      wideEvent.outcome = "success";
      wideEvent.map_count = mapDataRecords.length;
      wideEvent.stat_count = allPlayerStats.length;
      yield* Metric.increment(analyticsQuerySuccessTotal);

      return {
        teamRoster,
        mapDataRecords,
        allPlayerStats,
      };
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(analyticsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.analytics.getHeroPickrateRawData")
              : Effect.logInfo("team.analytics.getHeroPickrateRawData");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(analyticsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.analytics.getHeroPickrateRawData")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  function cacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
    return `${teamId}:${JSON.stringify(dateRange ?? {})}`;
  }

  function pickrateCacheKeyOf(teamId: number, dateFrom?: Date, dateTo?: Date) {
    return `${teamId}:${dateFrom?.toISOString() ?? ""}:${dateTo?.toISOString() ?? ""}`;
  }

  const pickrateCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const parts = key.split(":");
      const teamIdStr = parts[0];
      const dateFromStr = parts.slice(1, -1).join(":") || "";
      const dateToStr = parts[parts.length - 1] || "";
      const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
      const dateTo = dateToStr ? new Date(dateToStr) : undefined;
      return getHeroPickrateMatrix(Number(teamIdStr), dateFrom, dateTo).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const mapPerfCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getPlayerMapPerformanceMatrix(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const rawDataCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getHeroPickrateRawData(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getHeroPickrateMatrix: (teamId: number, dateFrom?: Date, dateTo?: Date) =>
      pickrateCache
        .get(pickrateCacheKeyOf(teamId, dateFrom, dateTo))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getPlayerMapPerformanceMatrix: (
      teamId: number,
      dateRange?: TeamDateRange
    ) =>
      mapPerfCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getHeroPickrateRawData: (teamId: number, dateRange?: TeamDateRange) =>
      rawDataCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamAnalyticsServiceInterface;
});

export const TeamAnalyticsServiceLive = Layer.effect(
  TeamAnalyticsService,
  make
).pipe(Layer.provide(TeamSharedDataServiceLive));
