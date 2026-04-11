import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
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
import type { BaseTeamData, TeamDateRange } from "./shared-core";
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

const mapModeQuerySuccessTotal = Metric.counter("team.map_mode.query.success", {
  description: "Total successful team map mode queries",
  incremental: true,
});

const mapModeQueryErrorTotal = Metric.counter("team.map_mode.query.error", {
  description: "Total team map mode query failures",
  incremental: true,
});

const mapModeQueryDuration = Metric.histogram(
  "team.map_mode.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team map mode query duration in milliseconds"
);

export type { MapModeStats, MapModePerformance } from "./types";
import type { MapModeStats, MapModePerformance } from "./types";

function createEmptyMapModePerformance(): MapModePerformance {
  const emptyStats: MapModeStats = {
    mapType: $Enums.MapType.Control,
    wins: 0,
    losses: 0,
    winrate: 0,
    gamesPlayed: 0,
    avgPlaytime: 0,
    bestMap: null,
    worstMap: null,
  };
  return {
    overall: { totalGames: 0, totalWins: 0, totalLosses: 0, overallWinrate: 0 },
    byMode: {
      [$Enums.MapType.Control]: {
        ...emptyStats,
        mapType: $Enums.MapType.Control,
      },
      [$Enums.MapType.Hybrid]: {
        ...emptyStats,
        mapType: $Enums.MapType.Hybrid,
      },
      [$Enums.MapType.Escort]: {
        ...emptyStats,
        mapType: $Enums.MapType.Escort,
      },
      [$Enums.MapType.Push]: { ...emptyStats, mapType: $Enums.MapType.Push },
      [$Enums.MapType.Clash]: { ...emptyStats, mapType: $Enums.MapType.Clash },
      [$Enums.MapType.Flashpoint]: {
        ...emptyStats,
        mapType: $Enums.MapType.Flashpoint,
      },
    },
    bestMode: null,
    worstMode: null,
  };
}

export function processMapModePerformance(
  sharedData: BaseTeamData,
  matchEnds: { match_time: number; MapDataId: number | null }[]
): MapModePerformance {
  const {
    teamRosterSet,
    mapDataRecords: allMapDataRecords,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
    payloadProgresses,
    pointProgresses,
  } = sharedData;

  if (allMapDataRecords.length === 0) return createEmptyMapModePerformance();

  const finalRoundMap = buildFinalRoundMap(finalRounds);
  const matchStartMap = buildMatchStartMap(matchStarts);

  const matchEndMap = new Map<number, number>();
  for (const match of matchEnds) {
    if (match.MapDataId) matchEndMap.set(match.MapDataId, match.match_time);
  }

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

  type MapModeData = {
    wins: number;
    losses: number;
    totalPlaytime: number;
    mapWinrates: Map<string, { wins: number; losses: number }>;
  };
  const modeData = new Map<$Enums.MapType, MapModeData>();

  const activeModes = [
    $Enums.MapType.Control,
    $Enums.MapType.Hybrid,
    $Enums.MapType.Escort,
    $Enums.MapType.Flashpoint,
  ];
  for (const mapType of activeModes) {
    modeData.set(mapType, {
      wins: 0,
      losses: 0,
      totalPlaytime: 0,
      mapWinrates: new Map(),
    });
  }

  let totalGames = 0,
    totalWins = 0,
    totalLosses = 0;

  for (const mapDataRecord of allMapDataRecords) {
    const mapDataId = mapDataRecord.id;
    const mapName = mapDataRecord.name;
    if (!mapName) continue;

    const mapType =
      mapNameToMapTypeMapping[mapName as keyof typeof mapNameToMapTypeMapping];
    if (!mapType) continue;
    if (mapType === $Enums.MapType.Push || mapType === $Enums.MapType.Clash)
      continue;

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
    const playtime = matchEndMap.get(mapDataId) ?? 0;

    const data = modeData.get(mapType)!;
    if (isWin) {
      data.wins++;
      totalWins++;
    } else {
      data.losses++;
      totalLosses++;
    }
    data.totalPlaytime += playtime;
    totalGames++;

    if (!data.mapWinrates.has(mapName))
      data.mapWinrates.set(mapName, { wins: 0, losses: 0 });
    const mapWinrate = data.mapWinrates.get(mapName)!;
    if (isWin) mapWinrate.wins++;
    else mapWinrate.losses++;
  }

  // oxlint-disable-next-line typescript-eslint/consistent-type-assertions
  const byMode = {} as Record<$Enums.MapType, MapModeStats>;
  let bestMode: $Enums.MapType | null = null;
  let bestWinrate = -1;
  let worstMode: $Enums.MapType | null = null;
  let worstWinrate = 101;

  for (const [mapType, data] of modeData.entries()) {
    const gamesPlayed = data.wins + data.losses;
    const winrate = gamesPlayed > 0 ? (data.wins / gamesPlayed) * 100 : 0;
    const avgPlaytime = gamesPlayed > 0 ? data.totalPlaytime / gamesPlayed : 0;

    let bestMap: MapModeStats["bestMap"] = null;
    let worstMap: MapModeStats["worstMap"] = null;

    if (data.mapWinrates.size > 0) {
      let bestMapWinrate = -1;
      let worstMapWinrate = 101;
      for (const [mn, mapData] of data.mapWinrates.entries()) {
        const mapGames = mapData.wins + mapData.losses;
        if (mapGames === 0) continue;
        const mapWinrateVal = (mapData.wins / mapGames) * 100;
        if (mapWinrateVal > bestMapWinrate) {
          bestMapWinrate = mapWinrateVal;
          bestMap = { name: mn, winrate: mapWinrateVal };
        }
        if (mapWinrateVal < worstMapWinrate) {
          worstMapWinrate = mapWinrateVal;
          worstMap = { name: mn, winrate: mapWinrateVal };
        }
      }
    }

    byMode[mapType] = {
      mapType,
      wins: data.wins,
      losses: data.losses,
      winrate,
      gamesPlayed,
      avgPlaytime,
      bestMap,
      worstMap,
    };

    if (gamesPlayed >= 3) {
      if (winrate > bestWinrate) {
        bestWinrate = winrate;
        bestMode = mapType;
      }
      if (winrate < worstWinrate) {
        worstWinrate = winrate;
        worstMode = mapType;
      }
    }
  }

  const overallWinrate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

  return {
    overall: { totalGames, totalWins, totalLosses, overallWinrate },
    byMode,
    bestMode,
    worstMode,
  };
}

export type TeamMapModeServiceInterface = {
  readonly getMapModePerformance: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<MapModePerformance, TeamQueryError>;
};

export class TeamMapModeService extends Context.Tag(
  "@app/data/team/TeamMapModeService"
)<TeamMapModeService, TeamMapModeServiceInterface>() {}

export const make = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getMapModePerformance(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<MapModePerformance, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const sharedData = yield* shared.getBaseTeamData(teamId, { dateRange });
      const { mapDataRecords: allMapDataRecords } = sharedData;

      if (allMapDataRecords.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.total_games = 0;
        yield* Metric.increment(mapModeQuerySuccessTotal);
        return createEmptyMapModePerformance();
      }

      const mapDataIds = allMapDataRecords.map((md) => md.id);

      const matchEnds = yield* Effect.tryPromise({
        try: () =>
          prisma.matchEnd.findMany({
            where: { MapDataId: { in: mapDataIds } },
            select: { match_time: true, MapDataId: true },
          }),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch match ends for map mode",
            cause: error,
          }),
      });

      const result = processMapModePerformance(sharedData, matchEnds);

      wideEvent.outcome = "success";
      wideEvent.total_games = result.overall.totalGames;
      wideEvent.best_mode = result.bestMode;
      yield* Metric.increment(mapModeQuerySuccessTotal);

      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(mapModeQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.mapMode.getMapModePerformance")
              : Effect.logInfo("team.mapMode.getMapModePerformance");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(mapModeQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.mapMode.getMapModePerformance")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  function cacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
    return `${teamId}:${JSON.stringify(dateRange ?? {})}`;
  }

  const mapModeCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getMapModePerformance(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getMapModePerformance: (teamId: number, dateRange?: TeamDateRange) =>
      mapModeCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamMapModeServiceInterface;
});

export const TeamMapModeServiceLive = Layer.effect(
  TeamMapModeService,
  make
).pipe(Layer.provide(TeamSharedDataServiceLive));
