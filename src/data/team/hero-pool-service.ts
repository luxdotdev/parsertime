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
import type { BaseTeamData, TeamDateRange } from "./shared-core";
import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildProgressMaps,
  findTeamNameForMapInMemory,
  parseDateRangeFromCacheKey,
} from "./shared-core";
import { teamCacheRequestTotal, teamCacheMissTotal } from "./metrics";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "./shared-data-service";

const heroPoolQuerySuccessTotal = Metric.counter(
  "team.hero_pool.query.success",
  { description: "Total successful team hero pool queries", incremental: true }
);

const heroPoolQueryErrorTotal = Metric.counter("team.hero_pool.query.error", {
  description: "Total team hero pool query failures",
  incremental: true,
});

const heroPoolQueryDuration = Metric.histogram(
  "team.hero_pool.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team hero pool query duration in milliseconds"
);

export type {
  HeroPlaytime,
  HeroWinrate,
  HeroSpecialist,
  HeroDiversity,
  HeroPoolAnalysis,
  HeroPoolRawData,
} from "./types";
import type {
  HeroPlaytime,
  HeroWinrate,
  HeroSpecialist,
  HeroDiversity,
  HeroPoolAnalysis,
  HeroPoolRawData,
} from "./types";

function createEmptyHeroPoolAnalysis(): HeroPoolAnalysis {
  return {
    mostPlayedByRole: { Tank: [], Damage: [], Support: [] },
    topHeroWinrates: [],
    specialists: [],
    diversity: {
      totalUniqueHeroes: 0,
      heroesPerRole: { Tank: 0, Damage: 0, Support: 0 },
      diversityScore: 0,
      effectiveHeroPool: 0,
    },
  };
}

export function processHeroPoolAnalysis(sharedData: BaseTeamData): HeroPoolAnalysis {
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

  if (mapDataRecords.length === 0) return createEmptyHeroPoolAnalysis();

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

  type HeroData = {
    playtime: number;
    gamesPlayed: Set<number>;
    playedBy: Set<string>;
    wins: number;
    losses: number;
  };
  type PlayerHeroData = { playtime: number; gamesPlayed: Set<number> };

  const heroDataMap = new Map<HeroName, HeroData>();
  const playerHeroMap = new Map<string, Map<HeroName, PlayerHeroData>>();

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

    for (const stat of playersOnMap) {
      const heroName = stat.player_hero as HeroName;
      const playerName = stat.player_name;

      if (!heroDataMap.has(heroName)) {
        heroDataMap.set(heroName, {
          playtime: 0,
          gamesPlayed: new Set(),
          playedBy: new Set(),
          wins: 0,
          losses: 0,
        });
      }
      const heroData = heroDataMap.get(heroName)!;
      heroData.playtime += stat.hero_time_played;
      heroData.gamesPlayed.add(mapDataId);
      heroData.playedBy.add(playerName);
      if (isWin) heroData.wins++;
      else heroData.losses++;

      if (!playerHeroMap.has(playerName))
        playerHeroMap.set(playerName, new Map());
      const playerHeroes = playerHeroMap.get(playerName)!;
      if (!playerHeroes.has(heroName))
        playerHeroes.set(heroName, { playtime: 0, gamesPlayed: new Set() });
      const playerHeroData = playerHeroes.get(heroName)!;
      playerHeroData.playtime += stat.hero_time_played;
      playerHeroData.gamesPlayed.add(mapDataId);
    }
  }

  const mostPlayedByRole: HeroPoolAnalysis["mostPlayedByRole"] = {
    Tank: [],
    Damage: [],
    Support: [],
  };
  const allHeroWinrates: HeroWinrate[] = [];

  for (const [heroName, data] of heroDataMap.entries()) {
    const role = determineRole(heroName);
    if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;

    mostPlayedByRole[role].push({
      heroName,
      role,
      totalPlaytime: data.playtime,
      gamesPlayed: data.gamesPlayed.size,
      playedBy: Array.from(data.playedBy),
    });

    const gamesPlayed = data.wins + data.losses;
    if (gamesPlayed > 0) {
      allHeroWinrates.push({
        heroName,
        role,
        wins: data.wins,
        losses: data.losses,
        winrate: (data.wins / gamesPlayed) * 100,
        gamesPlayed,
        totalPlaytime: data.playtime,
      });
    }
  }

  mostPlayedByRole.Tank.sort((a, b) => b.totalPlaytime - a.totalPlaytime);
  mostPlayedByRole.Damage.sort((a, b) => b.totalPlaytime - a.totalPlaytime);
  mostPlayedByRole.Support.sort((a, b) => b.totalPlaytime - a.totalPlaytime);

  const topHeroWinrates = allHeroWinrates
    .filter((h) => h.gamesPlayed >= 3)
    .sort((a, b) => b.winrate - a.winrate)
    .slice(0, 10);

  const specialists: HeroSpecialist[] = [];
  for (const [playerName, heroesMap] of playerHeroMap.entries()) {
    for (const [heroName, data] of heroesMap.entries()) {
      const role = determineRole(heroName);
      if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;
      const totalHeroPlaytime = heroDataMap.get(heroName)?.playtime ?? 0;
      const ownershipPercentage =
        totalHeroPlaytime > 0 ? (data.playtime / totalHeroPlaytime) * 100 : 0;
      if (ownershipPercentage >= 30) {
        specialists.push({
          playerName,
          heroName,
          role,
          playtime: data.playtime,
          gamesPlayed: data.gamesPlayed.size,
          ownershipPercentage,
        });
      }
    }
  }
  specialists.sort((a, b) => b.ownershipPercentage - a.ownershipPercentage);

  const uniqueHeroes = heroDataMap.size;
  const heroesPerRole = {
    Tank: mostPlayedByRole.Tank.length,
    Damage: mostPlayedByRole.Damage.length,
    Support: mostPlayedByRole.Support.length,
  };
  const effectiveHeroPool = Array.from(heroDataMap.values()).filter(
    (data) => data.gamesPlayed.size >= 3
  ).length;
  const maxHeroes = 41;
  const diversityScore = Math.min((uniqueHeroes / maxHeroes) * 100, 100);

  return {
    mostPlayedByRole,
    topHeroWinrates,
    specialists,
    diversity: {
      totalUniqueHeroes: uniqueHeroes,
      heroesPerRole,
      diversityScore,
      effectiveHeroPool,
    },
  };
}

export type TeamHeroPoolServiceInterface = {
  readonly getHeroPoolAnalysis: (
    teamId: number,
    dateFrom?: Date,
    dateTo?: Date
  ) => Effect.Effect<HeroPoolAnalysis, TeamQueryError>;

  readonly getHeroPoolRawData: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<HeroPoolRawData, TeamQueryError>;
};

export class TeamHeroPoolService extends Context.Tag(
  "@app/data/team/TeamHeroPoolService"
)<TeamHeroPoolService, TeamHeroPoolServiceInterface>() {}

export const make = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getHeroPoolAnalysis(
    teamId: number,
    dateFrom?: Date,
    dateTo?: Date
  ): Effect.Effect<HeroPoolAnalysis, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!(dateFrom && dateTo),
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      if (dateFrom && dateTo) {
        // Custom date range path
        const teamRoster = yield* shared.getTeamRoster(teamId);
        const teamRosterSet = new Set(teamRoster);

        if (teamRoster.length === 0) {
          wideEvent.outcome = "success";
          wideEvent.result = "empty";
          yield* Metric.increment(heroPoolQuerySuccessTotal);
          return createEmptyHeroPoolAnalysis();
        }

        const allMapDataRecords = yield* Effect.tryPromise({
          try: () =>
            prisma.map.findMany({
              where: {
                Scrim: {
                  Team: { id: teamId },
                  date: { gte: dateFrom, lte: dateTo },
                },
              },
              select: { id: true, name: true },
            }),
          catch: (error) =>
            new TeamQueryError({
              operation: "fetch maps for hero pool with date range",
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
          wideEvent.result = "empty";
          yield* Metric.increment(heroPoolQuerySuccessTotal);
          return createEmptyHeroPoolAnalysis();
        }

        const mapDataIds = mapDataRecords.map((md) => md.id);

        const [
          allPlayerStats,
          matchStarts,
          finalRounds,
          capturesData,
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
              operation: "fetch hero pool data with date range",
              cause: error,
            }),
        });

        const baseData: BaseTeamData = {
          teamId,
          teamRoster,
          teamRosterSet,
          mapDataRecords,
          mapDataIds,
          allPlayerStats,
          matchStarts,
          finalRounds,
          captures: capturesData,
          payloadProgresses,
          pointProgresses,
        };

        const result = processHeroPoolAnalysis(baseData);
        wideEvent.outcome = "success";
        wideEvent.unique_heroes = result.diversity.totalUniqueHeroes;
        yield* Metric.increment(heroPoolQuerySuccessTotal);
        return result;
      }

      // Default path using shared data
      const data = yield* shared.getBaseTeamData(teamId, {
        excludePush: true,
        excludeClash: true,
      });
      const result = processHeroPoolAnalysis(data);
      wideEvent.outcome = "success";
      wideEvent.unique_heroes = result.diversity.totalUniqueHeroes;
      yield* Metric.increment(heroPoolQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(heroPoolQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.heroPool.getHeroPoolAnalysis")
              : Effect.logInfo("team.heroPool.getHeroPoolAnalysis");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(heroPoolQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.heroPool.getHeroPoolAnalysis")
    );
  }

  function getHeroPoolRawData(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<HeroPoolRawData, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
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
            select: { id: true, name: true, Scrim: { select: { date: true } } },
          }),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch maps for hero pool raw data",
            cause: error,
          }),
      });

      const teamRoster = yield* shared.getTeamRoster(teamId);

      if (teamRoster.length === 0) {
        wideEvent.outcome = "success";
        yield* Metric.increment(heroPoolQuerySuccessTotal);
        return {
          teamRoster: [],
          mapDataRecords: [],
          allPlayerStats: [],
          matchStarts: [],
          finalRounds: [],
          captures: [],
          payloadProgresses: [],
          pointProgresses: [],
        } satisfies HeroPoolRawData;
      }

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
        yield* Metric.increment(heroPoolQuerySuccessTotal);
        return {
          teamRoster,
          mapDataRecords: [],
          allPlayerStats: [],
          matchStarts: [],
          finalRounds: [],
          captures: [],
          payloadProgresses: [],
          pointProgresses: [],
        } satisfies HeroPoolRawData;
      }

      const mapDataIds = mapDataRecords.map((md) => md.id);

      const [
        allPlayerStats,
        matchStarts,
        finalRounds,
        capturesData,
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
            operation: "fetch hero pool raw data tables",
            cause: error,
          }),
      });

      wideEvent.outcome = "success";
      wideEvent.map_count = mapDataRecords.length;
      yield* Metric.increment(heroPoolQuerySuccessTotal);

      return {
        teamRoster,
        mapDataRecords,
        allPlayerStats,
        matchStarts,
        finalRounds,
        captures: capturesData,
        payloadProgresses,
        pointProgresses,
      } satisfies HeroPoolRawData;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(heroPoolQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.heroPool.getHeroPoolRawData")
              : Effect.logInfo("team.heroPool.getHeroPoolRawData");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(heroPoolQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.heroPool.getHeroPoolRawData")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  const heroPoolAnalysisCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const parsed = JSON.parse(rest) as { dateFrom?: string; dateTo?: string };
      const dateFrom = parsed.dateFrom ? new Date(parsed.dateFrom) : undefined;
      const dateTo = parsed.dateTo ? new Date(parsed.dateTo) : undefined;
      return getHeroPoolAnalysis(Number(teamIdStr), dateFrom, dateTo).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const heroPoolRawDataCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getHeroPoolRawData(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getHeroPoolAnalysis: (teamId: number, dateFrom?: Date, dateTo?: Date) =>
      heroPoolAnalysisCache
        .get(
          `${teamId}:${JSON.stringify({ dateFrom: dateFrom?.toISOString(), dateTo: dateTo?.toISOString() })}`
        )
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getHeroPoolRawData: (teamId: number, dateRange?: TeamDateRange) =>
      heroPoolRawDataCache
        .get(`${teamId}:${JSON.stringify(dateRange ?? {})}`)
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamHeroPoolServiceInterface;
});

export const TeamHeroPoolServiceLive = Layer.effect(
  TeamHeroPoolService,
  make
).pipe(Layer.provide(TeamSharedDataServiceLive));
