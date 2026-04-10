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
import type { BaseTeamData, TeamDateRange } from "./shared-core";
import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildProgressMaps,
  findTeamNameForMapInMemory,
} from "./shared-core";
import { teamCacheRequestTotal, teamCacheMissTotal } from "./metrics";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "./shared-data-service";

const trendsQuerySuccessTotal = Metric.counter("team.trends.query.success", {
  description: "Total successful team trends queries",
  incremental: true,
});

const trendsQueryErrorTotal = Metric.counter("team.trends.query.error", {
  description: "Total team trends query failures",
  incremental: true,
});

const trendsQueryDuration = Metric.histogram(
  "team.trends.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team trends query duration in milliseconds"
);

export type {
  WinrateDataPoint,
  RecentFormMatch,
  RecentForm,
  StreakInfo,
} from "./types";
import type {
  WinrateDataPoint,
  RecentFormMatch,
  RecentForm,
  StreakInfo,
} from "./types";

type ProcessedMatchResult = {
  scrimId: number;
  scrimName: string;
  date: Date;
  mapName: string;
  isWin: boolean;
};

function processTeamMatchResults(
  sharedData: BaseTeamData,
  mapDataRecordsWithScrim: {
    id: number;
    name: string | null;
    Scrim?: {
      id: number;
      name: string;
      date: Date;
    } | null;
  }[]
): ProcessedMatchResult[] {
  const {
    teamRosterSet,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
    payloadProgresses,
    pointProgresses,
  } = sharedData;

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

  const matchResults: ProcessedMatchResult[] = [];

  for (const mapDataRecord of mapDataRecordsWithScrim) {
    const mapDataId = mapDataRecord.id;
    const scrim = mapDataRecord.Scrim;

    if (!scrim) continue;

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

    matchResults.push({
      scrimId: scrim.id,
      scrimName: scrim.name,
      date: scrim.date,
      mapName: mapDataRecord.name ?? "Unknown",
      isWin,
    });
  }

  return matchResults;
}

export type TeamTrendsServiceInterface = {
  readonly getTeamMatchResults: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<ProcessedMatchResult[], TeamQueryError>;

  readonly getWinrateOverTime: (
    teamId: number,
    groupBy?: "week" | "month",
    dateRange?: TeamDateRange
  ) => Effect.Effect<WinrateDataPoint[], TeamQueryError>;

  readonly getRecentForm: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<RecentForm, TeamQueryError>;

  readonly getStreakInfo: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<StreakInfo, TeamQueryError>;
};

export class TeamTrendsService extends Context.Tag(
  "@app/data/team/TeamTrendsService"
)<TeamTrendsService, TeamTrendsServiceInterface>() {}

export const make = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getTeamMatchResults(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<ProcessedMatchResult[], TeamQueryError> {
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
            select: {
              id: true,
              name: true,
              Scrim: { select: { id: true, name: true, date: true } },
            },
            orderBy: { Scrim: { date: "desc" } },
          }),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch map records for match results",
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
        return mapType !== $Enums.MapType.Push;
      });

      if (mapDataRecords.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.match_count = 0;
        yield* Metric.increment(trendsQuerySuccessTotal);
        const _empty: ProcessedMatchResult[] = []; return _empty;
      }

      const sharedData = yield* shared.getBaseTeamData(teamId, {
        excludePush: true,
        dateRange,
      });

      const results = processTeamMatchResults(sharedData, mapDataRecords);
      wideEvent.outcome = "success";
      wideEvent.match_count = results.length;
      yield* Metric.increment(trendsQuerySuccessTotal);
      return results;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(trendsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.trends.getTeamMatchResults")
              : Effect.logInfo("team.trends.getTeamMatchResults");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(trendsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.trends.getTeamMatchResults")
    );
  }

  function getWinrateOverTime(
    teamId: number,
    groupBy: "week" | "month" = "week",
    dateRange?: TeamDateRange
  ): Effect.Effect<WinrateDataPoint[], TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      groupBy,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      yield* Effect.annotateCurrentSpan("groupBy", groupBy);
      const matchResults = yield* getTeamMatchResults(teamId, dateRange);

      if (matchResults.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.period_count = 0;
        yield* Metric.increment(trendsQuerySuccessTotal);
        const _empty: WinrateDataPoint[] = []; return _empty;
      }

      type PeriodKey = string;
      const periodData = new Map<
        PeriodKey,
        { date: Date; wins: number; losses: number }
      >();

      for (const result of matchResults) {
        let periodKey: string;
        let periodDate: Date;

        if (groupBy === "week") {
          const date = new Date(result.date);
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1);
          periodDate = new Date(date.setDate(diff));
          periodDate.setHours(0, 0, 0, 0);
          periodKey = periodDate.toISOString();
        } else {
          periodDate = new Date(result.date);
          periodDate.setDate(1);
          periodDate.setHours(0, 0, 0, 0);
          periodKey = periodDate.toISOString();
        }

        if (!periodData.has(periodKey)) {
          periodData.set(periodKey, { date: periodDate, wins: 0, losses: 0 });
        }

        const period = periodData.get(periodKey)!;
        if (result.isWin) period.wins++;
        else period.losses++;
      }

      const dataPoints: WinrateDataPoint[] = Array.from(periodData.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((period) => {
          const total = period.wins + period.losses;
          const winrate = total > 0 ? (period.wins / total) * 100 : 0;

          let periodLabel: string;
          if (groupBy === "week") {
            periodLabel = period.date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          } else {
            periodLabel = period.date.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            });
          }

          return {
            date: period.date,
            winrate,
            wins: period.wins,
            losses: period.losses,
            period: periodLabel,
          };
        });

      wideEvent.outcome = "success";
      wideEvent.period_count = dataPoints.length;
      yield* Metric.increment(trendsQuerySuccessTotal);
      return dataPoints;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(trendsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.trends.getWinrateOverTime")
              : Effect.logInfo("team.trends.getWinrateOverTime");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(trendsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.trends.getWinrateOverTime")
    );
  }

  function getRecentForm(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<RecentForm, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const matchResults = yield* getTeamMatchResults(teamId, dateRange);

      if (matchResults.length === 0) {
        wideEvent.outcome = "success";
        yield* Metric.increment(trendsQuerySuccessTotal);
        return {
          last5: [],
          last10: [],
          last20: [],
          last5Winrate: 0,
          last10Winrate: 0,
          last20Winrate: 0,
        };
      }

      const recentMatches: RecentFormMatch[] = matchResults
        .slice(0, 20)
        .map((result) => ({
          scrimId: result.scrimId,
          scrimName: result.scrimName,
          date: result.date,
          mapName: result.mapName,
          result: result.isWin ? ("win" as const) : ("loss" as const),
        }));

      const last5 = recentMatches.slice(0, 5);
      const last10 = recentMatches.slice(0, 10);
      const last20 = recentMatches;

      function calculateWinrateForMatches(matches: RecentFormMatch[]): number {
        if (matches.length === 0) return 0;
        const wins = matches.filter((m) => m.result === "win").length;
        return (wins / matches.length) * 100;
      }

      const result: RecentForm = {
        last5,
        last10,
        last20,
        last5Winrate: calculateWinrateForMatches(last5),
        last10Winrate: calculateWinrateForMatches(last10),
        last20Winrate: calculateWinrateForMatches(last20),
      };

      wideEvent.outcome = "success";
      wideEvent.last5_winrate = result.last5Winrate;
      yield* Metric.increment(trendsQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(trendsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.trends.getRecentForm")
              : Effect.logInfo("team.trends.getRecentForm");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(trendsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.trends.getRecentForm")
    );
  }

  function getStreakInfo(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<StreakInfo, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const matchResults = yield* getTeamMatchResults(teamId, dateRange);

      if (matchResults.length === 0) {
        wideEvent.outcome = "success";
        yield* Metric.increment(trendsQuerySuccessTotal);
        return {
          currentStreak: { type: "none" as const, count: 0 },
          longestWinStreak: { count: 0, startDate: null, endDate: null },
          longestLossStreak: { count: 0, startDate: null, endDate: null },
        };
      }

      let currentStreak: StreakInfo["currentStreak"] = {
        type: "none",
        count: 0,
      };
      if (matchResults.length > 0) {
        const streakType = matchResults[0].isWin ? "win" : "loss";
        let count = 1;
        for (let i = 1; i < matchResults.length; i++) {
          if (matchResults[i].isWin === matchResults[0].isWin) count++;
          else break;
        }
        currentStreak = { type: streakType, count };
      }

      let longestWinStreak = {
        count: 0,
        startDate: null as Date | null,
        endDate: null as Date | null,
      };
      let longestLossStreak = {
        count: 0,
        startDate: null as Date | null,
        endDate: null as Date | null,
      };

      let currentWinCount = 0;
      let currentWinStart: Date | null = null;
      let currentLossCount = 0;
      let currentLossStart: Date | null = null;

      for (let i = matchResults.length - 1; i >= 0; i--) {
        const result = matchResults[i];
        if (result.isWin) {
          if (currentWinCount === 0) currentWinStart = result.date;
          currentWinCount++;
          if (currentLossCount > 0) {
            if (currentLossCount > longestLossStreak.count) {
              longestLossStreak = {
                count: currentLossCount,
                startDate: currentLossStart,
                endDate: matchResults[i + 1].date,
              };
            }
            currentLossCount = 0;
            currentLossStart = null;
          }
        } else {
          if (currentLossCount === 0) currentLossStart = result.date;
          currentLossCount++;
          if (currentWinCount > 0) {
            if (currentWinCount > longestWinStreak.count) {
              longestWinStreak = {
                count: currentWinCount,
                startDate: currentWinStart,
                endDate: matchResults[i + 1].date,
              };
            }
            currentWinCount = 0;
            currentWinStart = null;
          }
        }
      }

      if (currentWinCount > longestWinStreak.count) {
        longestWinStreak = {
          count: currentWinCount,
          startDate: currentWinStart,
          endDate: matchResults[0].date,
        };
      }
      if (currentLossCount > longestLossStreak.count) {
        longestLossStreak = {
          count: currentLossCount,
          startDate: currentLossStart,
          endDate: matchResults[0].date,
        };
      }

      const streakResult: StreakInfo = {
        currentStreak,
        longestWinStreak,
        longestLossStreak,
      };

      wideEvent.outcome = "success";
      wideEvent.current_streak_type = currentStreak.type;
      wideEvent.current_streak_count = currentStreak.count;
      yield* Metric.increment(trendsQuerySuccessTotal);
      return streakResult;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(trendsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.trends.getStreakInfo")
              : Effect.logInfo("team.trends.getStreakInfo");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(trendsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.trends.getStreakInfo")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  function cacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
    return `${teamId}:${JSON.stringify(dateRange ?? {})}`;
  }

  const matchResultsCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dateRange = JSON.parse(rest) as TeamDateRange | undefined;
      const dr = dateRange?.from ? dateRange : undefined;
      return getTeamMatchResults(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const winrateOverTimeCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const parsed = JSON.parse(rest) as {
        groupBy?: "week" | "month";
        dateRange?: TeamDateRange;
      };
      const dr =
        parsed.dateRange?.from
          ? parsed.dateRange
          : undefined;
      return getWinrateOverTime(Number(teamIdStr), parsed.groupBy, dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const recentFormCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dateRange = JSON.parse(rest) as TeamDateRange | undefined;
      const dr = dateRange?.from ? dateRange : undefined;
      return getRecentForm(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const streakInfoCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dateRange = JSON.parse(rest) as TeamDateRange | undefined;
      const dr = dateRange?.from ? dateRange : undefined;
      return getStreakInfo(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getTeamMatchResults: (teamId: number, dateRange?: TeamDateRange) =>
      matchResultsCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getWinrateOverTime: (
      teamId: number,
      groupBy?: "week" | "month",
      dateRange?: TeamDateRange
    ) =>
      winrateOverTimeCache
        .get(
          `${teamId}:${JSON.stringify({ groupBy, dateRange: dateRange ?? {} })}`
        )
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getRecentForm: (teamId: number, dateRange?: TeamDateRange) =>
      recentFormCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getStreakInfo: (teamId: number, dateRange?: TeamDateRange) =>
      streakInfoCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamTrendsServiceInterface;
});

export const TeamTrendsServiceLive = Layer.effect(TeamTrendsService, make).pipe(
  Layer.provide(TeamSharedDataServiceLive)
);
