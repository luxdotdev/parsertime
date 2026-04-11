import { determineRole } from "@/lib/player-table-data";
import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import { mapNameToMapTypeMapping } from "@/types/map";
import type { HeroName } from "@/types/heroes";
import { roleHeroMapping } from "@/types/heroes";
import { $Enums } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { TournamentTeamQueryError } from "./errors";
import {
  ttStatsQuerySuccessTotal,
  ttStatsQueryErrorTotal,
  ttStatsQueryDuration,
  ttCacheRequestTotal,
  ttCacheMissTotal,
} from "./metrics";
import {
  TournamentTeamSharedDataService,
  TournamentTeamSharedDataServiceLive,
} from "./shared-data-service";

import {
  findTeamNameForMapInMemory,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildCapturesMaps,
  buildProgressMaps,
} from "@/data/team/shared-core";

import { processTeamWinrates } from "@/data/team/stats-service";
import { processTeamFightStats } from "@/data/team/fight-stats-service";
import {
  processRolePerformanceStats,
  processBestRoleTrios,
  processRoleWinratesByMap,
} from "@/data/team/role-stats-service";
import { processHeroPoolAnalysis } from "@/data/team/hero-pool-service";
import { processTeamHeroSwapStats } from "@/data/team/hero-swap-service";
import { processTeamMatchResults } from "@/data/team/trends-service";
import { processMapModePerformance } from "@/data/team/map-mode-service";
import { processQuickWinsStats } from "@/data/team/quick-wins-service";
import {
  processTeamUltStats,
  processUltImpactAnalysis,
} from "@/data/team/ult-service";
import { processBanImpactAnalysis } from "@/data/team/ban-impact-service";
import { processAbilityImpactAnalysis } from "@/data/team/ability-impact-service";
import {
  processMatchupWinrateData,
  processEnemyHeroAnalysis,
} from "@/data/team/matchup-service";

import type {
  TeamWinrates,
  TopMapByPlaytime,
  BestMapByWinrate,
  TeamFightStats,
  RolePerformanceStats,
  RoleBalanceAnalysis,
  RoleTrio,
  RoleWinrateByMap,
  HeroPoolAnalysis,
  TeamHeroSwapStats,
  MapModePerformance,
  QuickWinsStats,
  TeamUltStats,
  UltImpactAnalysis,
  CombinedBanAnalysis,
  AbilityImpactAnalysis,
  MatchupWinrateData,
  EnemyHeroAnalysis,
  WinrateDataPoint,
  RecentForm,
  RecentFormMatch,
  StreakInfo,
  HeroPickrateMatrix,
  PlayerMapPerformanceMatrix,
  PlayerMapPerformance,
  SimulatorContext,
} from "@/data/team";
import type { ProcessedMatchResult } from "@/data/team/trends-service";

export type TournamentTeamStatsServiceInterface = {
  readonly getWinrates: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<TeamWinrates, TournamentTeamQueryError>;

  readonly getFightStats: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<TeamFightStats, TournamentTeamQueryError>;

  readonly getRolePerformanceStats: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<RolePerformanceStats, TournamentTeamQueryError>;

  readonly getRoleBalanceAnalysis: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<RoleBalanceAnalysis, TournamentTeamQueryError>;

  readonly getBestRoleTrios: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<RoleTrio[], TournamentTeamQueryError>;

  readonly getRoleWinratesByMap: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<RoleWinrateByMap[], TournamentTeamQueryError>;

  readonly getHeroPoolAnalysis: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<HeroPoolAnalysis, TournamentTeamQueryError>;

  readonly getHeroSwapStats: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<TeamHeroSwapStats, TournamentTeamQueryError>;

  readonly getMapModePerformance: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<MapModePerformance, TournamentTeamQueryError>;

  readonly getQuickWinsStats: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<QuickWinsStats, TournamentTeamQueryError>;

  readonly getUltStats: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<TeamUltStats, TournamentTeamQueryError>;

  readonly getUltImpact: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<UltImpactAnalysis, TournamentTeamQueryError>;

  readonly getBanImpactAnalysis: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<CombinedBanAnalysis, TournamentTeamQueryError>;

  readonly getAbilityImpact: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<AbilityImpactAnalysis, TournamentTeamQueryError>;

  readonly getMatchupWinrateData: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<MatchupWinrateData, TournamentTeamQueryError>;

  readonly getEnemyHeroAnalysis: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<EnemyHeroAnalysis, TournamentTeamQueryError>;

  readonly getMatchResults: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<ProcessedMatchResult[], TournamentTeamQueryError>;

  readonly getWinrateOverTime: (
    tournamentId: number,
    tournamentTeamId: number,
    groupBy?: "week" | "month"
  ) => Effect.Effect<WinrateDataPoint[], TournamentTeamQueryError>;

  readonly getRecentForm: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<RecentForm, TournamentTeamQueryError>;

  readonly getStreakInfo: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<StreakInfo, TournamentTeamQueryError>;

  readonly getTopMapsByPlaytime: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<TopMapByPlaytime[], TournamentTeamQueryError>;

  readonly getTop5MapsByPlaytime: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<TopMapByPlaytime[], TournamentTeamQueryError>;

  readonly getBestMapByWinrate: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<BestMapByWinrate | undefined, TournamentTeamQueryError>;

  readonly getBlindSpotMap: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<BestMapByWinrate | undefined, TournamentTeamQueryError>;

  readonly getHeroPickrateMatrix: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<HeroPickrateMatrix, TournamentTeamQueryError>;

  readonly getPlayerMapPerformanceMatrix: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<PlayerMapPerformanceMatrix, TournamentTeamQueryError>;

  readonly getSimulatorContext: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<SimulatorContext, TournamentTeamQueryError>;
};

export class TournamentTeamStatsService extends Context.Tag(
  "@app/data/tournament-team/TournamentTeamStatsService"
)<TournamentTeamStatsService, TournamentTeamStatsServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

function cacheKey(tournamentId: number, tournamentTeamId: number): string {
  return `${tournamentId}:${tournamentTeamId}`;
}

function wrapMethod<T>(
  spanName: string,
  tournamentId: number,
  tournamentTeamId: number,
  body: (
    wideEvent: Record<string, unknown>
  ) => Effect.Effect<T, TournamentTeamQueryError>
): Effect.Effect<T, TournamentTeamQueryError> {
  const startTime = Date.now();
  const wideEvent: Record<string, unknown> = {
    tournamentId,
    tournamentTeamId,
  };

  return Effect.gen(function* () {
    yield* Effect.annotateCurrentSpan("tournamentId", tournamentId);
    yield* Effect.annotateCurrentSpan("tournamentTeamId", tournamentTeamId);
    const result = yield* body(wideEvent);
    wideEvent.outcome = "success";
    yield* Metric.increment(ttStatsQuerySuccessTotal);
    return result;
  }).pipe(
    Effect.tapError((error) =>
      Effect.sync(() => {
        wideEvent.outcome = "error";
        wideEvent.error_tag = error._tag;
        wideEvent.error_message = error.message;
      }).pipe(Effect.andThen(Metric.increment(ttStatsQueryErrorTotal)))
    ),
    Effect.ensuring(
      Effect.suspend(() => {
        const durationMs = Date.now() - startTime;
        wideEvent.duration_ms = durationMs;
        wideEvent.outcome ??= "interrupted";
        const log =
          wideEvent.outcome === "error"
            ? Effect.logError(`tournamentTeam.stats.${spanName}`)
            : Effect.logInfo(`tournamentTeam.stats.${spanName}`);
        return log.pipe(
          Effect.annotateLogs(wideEvent),
          Effect.andThen(ttStatsQueryDuration(Effect.succeed(durationMs)))
        );
      })
    ),
    Effect.withSpan(`tournamentTeam.stats.${spanName}`)
  );
}

export const make = Effect.gen(function* () {
  const sharedData = yield* TournamentTeamSharedDataService;

  function getWinrates(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<TeamWinrates, TournamentTeamQueryError> {
    return wrapMethod(
      "getWinrates",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const baseData = yield* sharedData.getBaseTeamData(
            tournamentId,
            tournamentTeamId
          );
          const result = processTeamWinrates(baseData);
          wideEvent.overall_wins = result.overallWins;
          wideEvent.overall_losses = result.overallLosses;
          wideEvent.map_count = Object.keys(result.byMap).length;
          return result;
        })
    );
  }

  function getFightStats(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<TeamFightStats, TournamentTeamQueryError> {
    return wrapMethod(
      "getFightStats",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const extendedData = yield* sharedData.getExtendedTeamData(
            tournamentId,
            tournamentTeamId
          );
          const result = processTeamFightStats(extendedData);
          wideEvent.total_fights = result.totalFights;
          wideEvent.overall_winrate = result.overallWinrate;
          return result;
        })
    );
  }

  function getRolePerformanceStats(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<RolePerformanceStats, TournamentTeamQueryError> {
    return wrapMethod(
      "getRolePerformanceStats",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const baseData = yield* sharedData.getBaseTeamData(
            tournamentId,
            tournamentTeamId
          );
          const result = processRolePerformanceStats(baseData);
          wideEvent.tank_playtime = result.Tank.totalPlaytime;
          return result;
        })
    );
  }

  function getRoleBalanceAnalysis(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<RoleBalanceAnalysis, TournamentTeamQueryError> {
    return wrapMethod(
      "getRoleBalanceAnalysis",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const t = yield* Effect.tryPromise({
            try: () => getTranslations("teamStatsPage.roleBalanceRadar"),
            catch: (error) =>
              new TournamentTeamQueryError({
                operation: "get translations for role balance",
                cause: error,
              }),
          });

          const roleStats = yield* getRolePerformanceStats(
            tournamentId,
            tournamentTeamId
          );

          const roles: ("Tank" | "Damage" | "Support")[] = [
            "Tank",
            "Damage",
            "Support",
          ];
          const totalPlaytime = roles.reduce(
            (sum, role) => sum + roleStats[role].totalPlaytime,
            0
          );

          if (totalPlaytime === 0) {
            return {
              overall: t("insufficientData"),
              weakestRole: null,
              strongestRole: null,
              balanceScore: 0,
              insights: [t("noData")],
            };
          }

          const roleScores = roles.map((role) => {
            const stats = roleStats[role];
            if (stats.totalPlaytime === 0) return { role, score: 0 };
            const kdScore = Math.min(stats.kd / 2, 1);
            const survivalScore = Math.max(0, 1 - stats.deathsPer10Min / 2);
            const ultScore = Math.min(stats.ultEfficiency / 3, 1);
            const activityScore = Math.min(stats.totalPlaytime / 3600, 1);
            const score =
              (kdScore + survivalScore + ultScore + activityScore) / 4;
            return { role, score };
          });

          roleScores.sort((a, b) => b.score - a.score);
          const strongestRole = roleScores[0].role;
          const weakestRole = roleScores[roleScores.length - 1].role;

          const scoreDiff =
            roleScores[0].score - roleScores[roleScores.length - 1].score;
          const balanceScore = Math.max(0, 1 - scoreDiff);

          let overall: string = t("balanced");
          if (balanceScore < 0.6) {
            if (roleScores[0].score > 0.7) {
              overall = t(`${strongestRole.toLowerCase()}Heavy`);
            }
          }

          const insights: string[] = [];
          if (balanceScore >= 0.8) insights.push(t("excellentBalance"));
          else if (balanceScore >= 0.6) insights.push(t("fairlyBalanced"));
          else insights.push(t("considerStrengthening", { role: weakestRole }));

          roles.forEach((role) => {
            const stats = roleStats[role];
            if (stats.kd < 1.0 && stats.totalPlaytime > 600)
              insights.push(t("negativeKD", { role }));
            if (stats.deathsPer10Min > 7 && stats.totalPlaytime > 600)
              insights.push(t("dyingFrequently", { role }));
          });

          wideEvent.balance_score = balanceScore;
          return {
            overall,
            weakestRole: balanceScore < 0.9 ? weakestRole : null,
            strongestRole: balanceScore < 0.9 ? strongestRole : null,
            balanceScore,
            insights,
          };
        })
    );
  }

  function getBestRoleTrios(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<RoleTrio[], TournamentTeamQueryError> {
    return wrapMethod(
      "getBestRoleTrios",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const baseData = yield* sharedData.getBaseTeamData(
            tournamentId,
            tournamentTeamId
          );
          const result = processBestRoleTrios(baseData);
          wideEvent.trio_count = result.length;
          return result;
        })
    );
  }

  function getRoleWinratesByMap(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<RoleWinrateByMap[], TournamentTeamQueryError> {
    return wrapMethod(
      "getRoleWinratesByMap",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const baseData = yield* sharedData.getBaseTeamData(
            tournamentId,
            tournamentTeamId
          );
          const result = processRoleWinratesByMap(baseData);
          wideEvent.map_count = result.length;
          return result;
        })
    );
  }

  function getHeroPoolAnalysis(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<HeroPoolAnalysis, TournamentTeamQueryError> {
    return wrapMethod(
      "getHeroPoolAnalysis",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const baseData = yield* sharedData.getBaseTeamData(
            tournamentId,
            tournamentTeamId
          );
          const result = processHeroPoolAnalysis(baseData);
          wideEvent.unique_heroes = result.diversity.totalUniqueHeroes;
          return result;
        })
    );
  }

  function getHeroSwapStats(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<TeamHeroSwapStats, TournamentTeamQueryError> {
    return wrapMethod(
      "getHeroSwapStats",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const baseData = yield* sharedData.getBaseTeamData(
            tournamentId,
            tournamentTeamId
          );

          if (baseData.mapDataIds.length === 0) {
            wideEvent.total_swaps = 0;
            return {
              totalSwaps: 0,
              totalMaps: 0,
              swapsPerMap: 0,
              mapsWithSwaps: 0,
              mapsWithoutSwaps: 0,
              avgHeroTimeBeforeSwap: 0,
              noSwapWinrate: 0,
              noSwapWins: 0,
              noSwapLosses: 0,
              swapWinrate: 0,
              swapWins: 0,
              swapLosses: 0,
              timingDistribution: [],
              winrateBySwapCount: [],
              topSwapPairs: [],
              playerBreakdown: [],
              timingOutcomes: [],
            } satisfies TeamHeroSwapStats;
          }

          const [allHeroSwaps, matchEnds, roundStarts] =
            yield* Effect.tryPromise({
              try: () =>
                Promise.all([
                  prisma.heroSwap.findMany({
                    where: {
                      MapDataId: { in: baseData.mapDataIds },
                      match_time: { not: 0 },
                    },
                    select: {
                      id: true,
                      match_time: true,
                      player_team: true,
                      player_name: true,
                      player_hero: true,
                      previous_hero: true,
                      hero_time_played: true,
                      MapDataId: true,
                    },
                    orderBy: { match_time: "asc" },
                  }),
                  prisma.matchEnd.findMany({
                    where: { MapDataId: { in: baseData.mapDataIds } },
                    select: { match_time: true, MapDataId: true },
                  }),
                  prisma.roundStart.findMany({
                    where: { MapDataId: { in: baseData.mapDataIds } },
                    select: { match_time: true, MapDataId: true },
                  }),
                ]),
              catch: (error) =>
                new TournamentTeamQueryError({
                  operation: "fetch hero swap data",
                  cause: error,
                }),
            });

          const result = processTeamHeroSwapStats(
            baseData,
            allHeroSwaps,
            matchEnds,
            roundStarts
          );
          wideEvent.total_swaps = result.totalSwaps;
          wideEvent.maps_with_swaps = result.mapsWithSwaps;
          return result;
        })
    );
  }

  function getMapModePerformance(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<MapModePerformance, TournamentTeamQueryError> {
    return wrapMethod(
      "getMapModePerformance",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const baseData = yield* sharedData.getBaseTeamData(
            tournamentId,
            tournamentTeamId
          );

          if (baseData.mapDataRecords.length === 0) {
            wideEvent.total_games = 0;
            const emptyStats = {
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
              overall: {
                totalGames: 0,
                totalWins: 0,
                totalLosses: 0,
                overallWinrate: 0,
              },
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
                [$Enums.MapType.Push]: {
                  ...emptyStats,
                  mapType: $Enums.MapType.Push,
                },
                [$Enums.MapType.Clash]: {
                  ...emptyStats,
                  mapType: $Enums.MapType.Clash,
                },
                [$Enums.MapType.Flashpoint]: {
                  ...emptyStats,
                  mapType: $Enums.MapType.Flashpoint,
                },
              },
              bestMode: null,
              worstMode: null,
            } satisfies MapModePerformance;
          }

          const matchEnds = yield* Effect.tryPromise({
            try: () =>
              prisma.matchEnd.findMany({
                where: { MapDataId: { in: baseData.mapDataIds } },
                select: { match_time: true, MapDataId: true },
              }),
            catch: (error) =>
              new TournamentTeamQueryError({
                operation: "fetch match ends for map mode",
                cause: error,
              }),
          });

          const result = processMapModePerformance(baseData, matchEnds);
          wideEvent.total_games = result.overall.totalGames;
          wideEvent.best_mode = result.bestMode;
          return result;
        })
    );
  }

  function getQuickWinsStats(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<QuickWinsStats, TournamentTeamQueryError> {
    return wrapMethod(
      "getQuickWinsStats",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const fightStats = yield* getFightStats(
            tournamentId,
            tournamentTeamId
          );
          const extendedData = yield* sharedData.getExtendedTeamData(
            tournamentId,
            tournamentTeamId
          );
          const result = processQuickWinsStats(extendedData, fightStats);
          wideEvent.last10_winrate = result.last10GamesPerformance.winrate;
          return result;
        })
    );
  }

  function getUltStats(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<TeamUltStats, TournamentTeamQueryError> {
    return wrapMethod(
      "getUltStats",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const extendedData = yield* sharedData.getExtendedTeamData(
            tournamentId,
            tournamentTeamId
          );

          if (extendedData.mapDataIds.length === 0) {
            wideEvent.total_ults = 0;
            return {
              totalUltsUsed: 0,
              totalUltsEarned: 0,
              totalMaps: 0,
              ultsPerMap: 0,
              avgChargeTime: 0,
              avgHoldTime: 0,
              fightInitiationRate: 0,
              fightInitiationCount: 0,
              totalFightsWithUlts: 0,
              topFightOpeningHeroes: [],
              roleBreakdown: [],
              playerRankings: [],
            } satisfies TeamUltStats;
          }

          const calculatedStats = yield* Effect.tryPromise({
            try: () =>
              prisma.calculatedStat.findMany({
                where: {
                  MapDataId: { in: extendedData.mapDataIds },
                  stat: {
                    in: ["AVERAGE_ULT_CHARGE_TIME", "AVERAGE_TIME_TO_USE_ULT"],
                  },
                },
              }),
            catch: (error) =>
              new TournamentTeamQueryError({
                operation: "fetch calculated stats for ult stats",
                cause: error,
              }),
          });

          const result = processTeamUltStats(extendedData, calculatedStats);
          wideEvent.total_ults = result.totalUltsUsed;
          return result;
        })
    );
  }

  function getUltImpact(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<UltImpactAnalysis, TournamentTeamQueryError> {
    return wrapMethod(
      "getUltImpact",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const extendedData = yield* sharedData.getExtendedTeamData(
            tournamentId,
            tournamentTeamId
          );
          const result = processUltImpactAnalysis(extendedData);
          wideEvent.hero_count = result.availableHeroes.length;
          return result;
        })
    );
  }

  function getBanImpactAnalysis(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<CombinedBanAnalysis, TournamentTeamQueryError> {
    return wrapMethod(
      "getBanImpactAnalysis",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const baseData = yield* sharedData.getBaseTeamData(
            tournamentId,
            tournamentTeamId
          );

          if (baseData.mapDataRecords.length === 0) {
            wideEvent.total_maps = 0;
            return {
              received: {
                banImpacts: [],
                mostBanned: [],
                weakPoints: [],
                totalMapsAnalyzed: 0,
              },
              outgoing: {
                ourBanImpacts: [],
                mostBannedByUs: [],
                strongBans: [],
                totalMapsAnalyzed: 0,
              },
            } satisfies CombinedBanAnalysis;
          }

          const heroBans = yield* Effect.tryPromise({
            try: () =>
              prisma.heroBan.findMany({
                where: { MapDataId: { in: baseData.mapDataIds } },
                select: { MapDataId: true, team: true, hero: true },
              }),
            catch: (error) =>
              new TournamentTeamQueryError({
                operation: "fetch hero bans",
                cause: error,
              }),
          });

          const result = processBanImpactAnalysis(baseData, heroBans);
          wideEvent.total_maps = result.received.totalMapsAnalyzed;
          wideEvent.received_ban_count = result.received.banImpacts.length;
          wideEvent.outgoing_ban_count = result.outgoing.ourBanImpacts.length;
          return result;
        })
    );
  }

  function getAbilityImpact(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<AbilityImpactAnalysis, TournamentTeamQueryError> {
    return wrapMethod(
      "getAbilityImpact",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const extendedData = yield* sharedData.getExtendedTeamData(
            tournamentId,
            tournamentTeamId
          );

          if (extendedData.mapDataIds.length === 0) {
            wideEvent.hero_count = 0;
            return {
              byHero: {},
              availableHeroes: [],
            } satisfies AbilityImpactAnalysis;
          }

          const [allAbility1Events, allAbility2Events] =
            yield* Effect.tryPromise({
              try: () =>
                Promise.all([
                  prisma.ability1Used.findMany({
                    where: { MapDataId: { in: extendedData.mapDataIds } },
                    select: {
                      match_time: true,
                      player_team: true,
                      player_hero: true,
                      MapDataId: true,
                    },
                    orderBy: { match_time: "asc" },
                  }),
                  prisma.ability2Used.findMany({
                    where: { MapDataId: { in: extendedData.mapDataIds } },
                    select: {
                      match_time: true,
                      player_team: true,
                      player_hero: true,
                      MapDataId: true,
                    },
                    orderBy: { match_time: "asc" },
                  }),
                ]),
              catch: (error) =>
                new TournamentTeamQueryError({
                  operation: "fetch ability events",
                  cause: error,
                }),
            });

          const result = processAbilityImpactAnalysis(
            extendedData,
            allAbility1Events,
            allAbility2Events
          );
          wideEvent.hero_count = result.availableHeroes.length;
          return result;
        })
    );
  }

  function getMatchupWinrateData(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<MatchupWinrateData, TournamentTeamQueryError> {
    return wrapMethod(
      "getMatchupWinrateData",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const baseData = yield* sharedData.getBaseTeamData(
            tournamentId,
            tournamentTeamId
          );
          const result = processMatchupWinrateData(baseData);
          wideEvent.map_count = result.maps.length;
          return result;
        })
    );
  }

  function getEnemyHeroAnalysis(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<EnemyHeroAnalysis, TournamentTeamQueryError> {
    return wrapMethod(
      "getEnemyHeroAnalysis",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const baseData = yield* sharedData.getBaseTeamData(
            tournamentId,
            tournamentTeamId
          );
          const result = processEnemyHeroAnalysis(baseData);
          wideEvent.enemy_hero_count = result.winrateVsHero.length;
          return result;
        })
    );
  }

  function getMatchResults(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<ProcessedMatchResult[], TournamentTeamQueryError> {
    return wrapMethod(
      "getMatchResults",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const baseData = yield* sharedData.getBaseTeamData(
            tournamentId,
            tournamentTeamId
          );
          const results = processTeamMatchResults(
            baseData,
            baseData.mapDataRecords
          );
          wideEvent.match_count = results.length;
          return results;
        })
    );
  }

  function getWinrateOverTime(
    tournamentId: number,
    tournamentTeamId: number,
    groupBy: "week" | "month" = "week"
  ): Effect.Effect<WinrateDataPoint[], TournamentTeamQueryError> {
    return wrapMethod(
      "getWinrateOverTime",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const matchResults = yield* getMatchResults(
            tournamentId,
            tournamentTeamId
          );

          if (matchResults.length === 0) {
            wideEvent.period_count = 0;
            const _empty: WinrateDataPoint[] = [];
            return _empty;
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
              periodData.set(periodKey, {
                date: periodDate,
                wins: 0,
                losses: 0,
              });
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

          wideEvent.period_count = dataPoints.length;
          return dataPoints;
        })
    );
  }

  function getRecentForm(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<RecentForm, TournamentTeamQueryError> {
    return wrapMethod(
      "getRecentForm",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const matchResults = yield* getMatchResults(
            tournamentId,
            tournamentTeamId
          );

          if (matchResults.length === 0) {
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

          function calculateWinrateForMatches(
            matches: RecentFormMatch[]
          ): number {
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

          wideEvent.last5_winrate = result.last5Winrate;
          return result;
        })
    );
  }

  function getStreakInfo(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<StreakInfo, TournamentTeamQueryError> {
    return wrapMethod(
      "getStreakInfo",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const matchResults = yield* getMatchResults(
            tournamentId,
            tournamentTeamId
          );

          if (matchResults.length === 0) {
            return {
              currentStreak: { type: "none" as const, count: 0 },
              longestWinStreak: {
                count: 0,
                startDate: null,
                endDate: null,
              },
              longestLossStreak: {
                count: 0,
                startDate: null,
                endDate: null,
              },
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

          wideEvent.current_streak_type = currentStreak.type;
          wideEvent.current_streak_count = currentStreak.count;
          return {
            currentStreak,
            longestWinStreak,
            longestLossStreak,
          };
        })
    );
  }

  function getTopMapsByPlaytime(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<TopMapByPlaytime[], TournamentTeamQueryError> {
    return wrapMethod(
      "getTopMapsByPlaytime",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const baseData = yield* sharedData.getBaseTeamData(
            tournamentId,
            tournamentTeamId
          );

          if (baseData.mapDataIds.length === 0) {
            wideEvent.map_count = 0;
            const _empty: TopMapByPlaytime[] = [];
            return _empty;
          }

          const matchEnds = yield* Effect.tryPromise({
            try: () =>
              prisma.matchEnd.findMany({
                where: { MapDataId: { in: baseData.mapDataIds } },
                select: { match_time: true, MapDataId: true },
              }),
            catch: (error) =>
              new TournamentTeamQueryError({
                operation: "fetch match ends for playtime",
                cause: error,
              }),
          });

          const mapDataIdToName = new Map<number, string>();
          for (const record of baseData.mapDataRecords) {
            mapDataIdToName.set(record.id, record.name ?? "Unknown Map");
          }

          const playtimeByMapName = new Map<string, number>();
          for (const matchEnd of matchEnds) {
            const mdId = matchEnd.MapDataId;
            if (!mdId) continue;
            const mapName = mapDataIdToName.get(mdId) ?? "Unknown Map";
            const currentPlaytime = playtimeByMapName.get(mapName) ?? 0;
            playtimeByMapName.set(
              mapName,
              currentPlaytime + matchEnd.match_time
            );
          }

          const result = Array.from(playtimeByMapName.entries())
            .map(([name, playtime]) => ({ name, playtime }))
            .sort((a, b) => b.playtime - a.playtime);

          wideEvent.map_count = result.length;
          return result;
        })
    );
  }

  function getTop5MapsByPlaytime(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<TopMapByPlaytime[], TournamentTeamQueryError> {
    return getTopMapsByPlaytime(tournamentId, tournamentTeamId).pipe(
      Effect.map((maps) => maps.slice(0, 5))
    );
  }

  function getBestMapByWinrate(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<BestMapByWinrate | undefined, TournamentTeamQueryError> {
    return wrapMethod(
      "getBestMapByWinrate",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const [winrates, topMaps] = yield* Effect.all([
            getWinrates(tournamentId, tournamentTeamId),
            getTopMapsByPlaytime(tournamentId, tournamentTeamId),
          ]);

          const mapsWithStats = Object.keys(winrates.byMap).map((map) => ({
            mapName: map,
            playtime: topMaps.find((m) => m.name === map)?.playtime ?? 0,
            winrate: winrates.byMap[map].totalWinrate,
          }));

          const result = mapsWithStats.sort((a, b) => {
            if (b.winrate !== a.winrate) return b.winrate - a.winrate;
            return b.playtime - a.playtime;
          })[0];

          wideEvent.best_map = result?.mapName;
          return result;
        })
    );
  }

  function getBlindSpotMap(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<BestMapByWinrate | undefined, TournamentTeamQueryError> {
    return wrapMethod(
      "getBlindSpotMap",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const [winrates, topMaps] = yield* Effect.all([
            getWinrates(tournamentId, tournamentTeamId),
            getTopMapsByPlaytime(tournamentId, tournamentTeamId),
          ]);

          const mapsWithStats = Object.keys(winrates.byMap).map((map) => ({
            mapName: map,
            playtime: topMaps.find((m) => m.name === map)?.playtime ?? 0,
            winrate: winrates.byMap[map].totalWinrate,
          }));

          const result = mapsWithStats.sort((a, b) => {
            if (b.winrate !== a.winrate) return a.winrate - b.winrate;
            return b.playtime - a.playtime;
          })[0];

          wideEvent.blind_spot_map = result?.mapName;
          return result;
        })
    );
  }

  function getHeroPickrateMatrix(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<HeroPickrateMatrix, TournamentTeamQueryError> {
    return wrapMethod(
      "getHeroPickrateMatrix",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const baseData = yield* sharedData.getBaseTeamData(
            tournamentId,
            tournamentTeamId
          );

          if (baseData.mapDataRecords.length === 0) {
            wideEvent.player_count = 0;
            return { players: [], allHeroes: [] } satisfies HeroPickrateMatrix;
          }

          const { teamRosterSet, mapDataRecords, allPlayerStats } = baseData;

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
              (stat) =>
                stat.MapDataId === mapDataId && stat.player_team === teamName
            );
            if (!playersOnMap.every((p) => teamRosterSet.has(p.player_name)))
              continue;

            for (const stat of playersOnMap) {
              const playerName = stat.player_name;
              const heroName = stat.player_hero as HeroName;

              if (!playerHeroMap.has(playerName))
                playerHeroMap.set(playerName, new Map());
              const playerHeroes = playerHeroMap.get(playerName)!;
              if (!playerHeroes.has(heroName))
                playerHeroes.set(heroName, { playtime: 0, games: new Set() });
              const heroData = playerHeroes.get(heroName)!;
              heroData.playtime += stat.hero_time_played;
              heroData.games.add(mapDataId);
              allHeroesSet.add(heroName);
            }
          }

          const players = Array.from(playerHeroMap.entries()).map(
            ([playerName, heroesMap]) => {
              let totalPlaytime = 0;
              const heroes = [];

              for (const [heroName, data] of heroesMap.entries()) {
                const role = determineRole(heroName);
                if (role !== "Tank" && role !== "Damage" && role !== "Support")
                  continue;
                totalPlaytime += data.playtime;
                heroes.push({
                  heroName,
                  role,
                  playtime: data.playtime,
                  gamesPlayed: data.games.size,
                });
              }

              heroes.sort((a, b) => b.playtime - a.playtime);
              return { playerName, heroes, totalPlaytime };
            }
          );

          players.sort((a, b) => b.totalPlaytime - a.totalPlaytime);
          wideEvent.player_count = players.length;

          return {
            players,
            allHeroes: Array.from(allHeroesSet),
          } satisfies HeroPickrateMatrix;
        })
    );
  }

  function getPlayerMapPerformanceMatrix(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<PlayerMapPerformanceMatrix, TournamentTeamQueryError> {
    return wrapMethod(
      "getPlayerMapPerformanceMatrix",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const baseData = yield* sharedData.getBaseTeamData(
            tournamentId,
            tournamentTeamId
          );

          if (baseData.mapDataRecords.length === 0) {
            wideEvent.player_count = 0;
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
          } = baseData;

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
              team1PayloadProgress:
                team1PayloadProgressMap.get(mapDataId) ?? [],
              team2PayloadProgress:
                team2PayloadProgressMap.get(mapDataId) ?? [],
              team1PointProgress: team1PointProgressMap.get(mapDataId) ?? [],
              team2PointProgress: team2PointProgressMap.get(mapDataId) ?? [],
            });

            const isWin = winner === teamName;

            const uniquePlayersOnMap = new Set<string>();
            for (const stat of playersOnMap) {
              uniquePlayersOnMap.add(stat.player_name);
            }

            for (const playerName of uniquePlayersOnMap) {
              if (!playerMapStats.has(playerName))
                playerMapStats.set(playerName, new Map());
              const playerMaps = playerMapStats.get(playerName)!;
              if (!playerMaps.has(mapName))
                playerMaps.set(mapName, {
                  players: new Set(),
                  wins: 0,
                  losses: 0,
                });
              const mapData = playerMaps.get(mapName)!;
              mapData.players.add(playerName);
              if (isWin) mapData.wins++;
              else mapData.losses++;
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
              const winrate =
                gamesPlayed > 0 ? (data.wins / gamesPlayed) * 100 : 0;
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

          wideEvent.player_count = uniquePlayers.size;
          wideEvent.map_count = uniqueMaps.size;

          return {
            players: Array.from(uniquePlayers).sort(),
            maps: Array.from(uniqueMaps).sort(),
            performance,
          };
        })
    );
  }

  function getSimulatorContext(
    tournamentId: number,
    tournamentTeamId: number
  ): Effect.Effect<SimulatorContext, TournamentTeamQueryError> {
    return wrapMethod(
      "getSimulatorContext",
      tournamentId,
      tournamentTeamId,
      (wideEvent) =>
        Effect.gen(function* () {
          const {
            winrates,
            banAnalysis,
            heroPool,
            mapModePerf,
            roleTrios,
            enemyHeroes,
          } = yield* Effect.all(
            {
              winrates: getWinrates(tournamentId, tournamentTeamId),
              banAnalysis: getBanImpactAnalysis(tournamentId, tournamentTeamId),
              heroPool: getHeroPoolAnalysis(tournamentId, tournamentTeamId),
              mapModePerf: getMapModePerformance(
                tournamentId,
                tournamentTeamId
              ),
              roleTrios: getBestRoleTrios(tournamentId, tournamentTeamId),
              enemyHeroes: getEnemyHeroAnalysis(tournamentId, tournamentTeamId),
            },
            { concurrency: "unbounded" }
          );

          const EXCLUDED_MAP_TYPES = new Set<$Enums.MapType>([
            $Enums.MapType.Push,
            $Enums.MapType.Clash,
          ]);

          const totalGames = winrates.overallWins + winrates.overallLosses;
          const baseWinrate =
            totalGames > 0 ? winrates.overallWins / totalGames : 0.5;

          const heroBanDeltas: Record<string, number> = {};
          const heroBanSampleSizes: Record<string, number> = {};
          for (const impact of banAnalysis.received.banImpacts) {
            heroBanDeltas[impact.hero] = impact.winRateDelta;
            heroBanSampleSizes[impact.hero] = impact.mapsBanned;
          }

          const ourBanDeltas: Record<string, number> = {};
          const ourBanSampleSizes: Record<string, number> = {};
          for (const impact of banAnalysis.outgoing.ourBanImpacts) {
            ourBanDeltas[impact.hero] = impact.winRateDelta;
            ourBanSampleSizes[impact.hero] = impact.mapsBanned;
          }

          const mapWinrates: Record<string, number> = {};
          const mapSampleSizes: Record<string, number> = {};
          const availableMaps: string[] = [];

          for (const [mapName, mapData] of Object.entries(winrates.byMap)) {
            const mapType =
              mapNameToMapTypeMapping[
                mapName as keyof typeof mapNameToMapTypeMapping
              ];
            if (mapType && EXCLUDED_MAP_TYPES.has(mapType)) continue;

            const games = mapData.totalWins + mapData.totalLosses;
            if (games === 0) continue;

            mapWinrates[mapName] = mapData.totalWinrate / 100;
            mapSampleSizes[mapName] = games;
            availableMaps.push(mapName);
          }

          availableMaps.sort();

          const mapModeWinrates: Record<string, number> = {};
          for (const [modeKey, modeData] of Object.entries(
            mapModePerf.byMode
          )) {
            if (EXCLUDED_MAP_TYPES.has(modeKey as $Enums.MapType)) continue;
            if (modeData.gamesPlayed > 0) {
              mapModeWinrates[modeKey] = modeData.winrate / 100;
            }
          }

          const heroPoolWinrates: Record<string, number> = {};
          const heroPoolSampleSizes: Record<string, number> = {};
          for (const hero of heroPool.topHeroWinrates) {
            heroPoolWinrates[hero.heroName] = hero.winrate / 100;
            heroPoolSampleSizes[hero.heroName] = hero.gamesPlayed;
          }

          const enemyHeroWinrates: Record<string, number> = {};
          const enemyHeroSampleSizes: Record<string, number> = {};
          for (const hero of enemyHeroes.winrateVsHero) {
            enemyHeroWinrates[hero.heroName] = hero.winrate / 100;
            enemyHeroSampleSizes[hero.heroName] = hero.gamesPlayed;
          }

          const allHeroes: HeroName[] = [
            ...roleHeroMapping.Tank,
            ...roleHeroMapping.Damage,
            ...roleHeroMapping.Support,
          ];

          wideEvent.total_games = totalGames;
          wideEvent.base_winrate = baseWinrate;
          wideEvent.available_maps = availableMaps.length;

          return {
            baseWinrate,
            totalGames,
            heroBanDeltas,
            heroBanSampleSizes,
            ourBanDeltas,
            ourBanSampleSizes,
            mapWinrates,
            mapSampleSizes,
            mapModeWinrates,
            roleTrioWinrates: roleTrios,
            heroPoolWinrates,
            heroPoolSampleSizes,
            enemyHeroWinrates,
            enemyHeroSampleSizes,
            availableHeroes: allHeroes,
            availableMaps,
          };
        })
    );
  }

  const winratesCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getWinrates(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const fightStatsCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getFightStats(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const rolePerformanceCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getRolePerformanceStats(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const roleBalanceCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getRoleBalanceAnalysis(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const roleTriosCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getBestRoleTrios(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const roleWinratesByMapCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getRoleWinratesByMap(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const heroPoolCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getHeroPoolAnalysis(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const heroSwapCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getHeroSwapStats(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const mapModeCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getMapModePerformance(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const quickWinsCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getQuickWinsStats(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const ultStatsCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getUltStats(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const ultImpactCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getUltImpact(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const banImpactCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getBanImpactAnalysis(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const abilityImpactCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getAbilityImpact(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const matchupWinrateCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getMatchupWinrateData(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const enemyHeroCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getEnemyHeroAnalysis(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const matchResultsCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getMatchResults(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const winrateOverTimeCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const [ttId, groupBy] = [
        rest.slice(0, rest.indexOf(":")),
        rest.slice(rest.indexOf(":") + 1),
      ];
      return getWinrateOverTime(
        Number(tId),
        Number(ttId),
        (groupBy || "week") as "week" | "month"
      ).pipe(Effect.tap(() => Metric.increment(ttCacheMissTotal)));
    },
  });

  const recentFormCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getRecentForm(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const streakInfoCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getStreakInfo(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const topMapsCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getTopMapsByPlaytime(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const top5MapsCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getTop5MapsByPlaytime(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const bestMapCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getBestMapByWinrate(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const blindSpotCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getBlindSpotMap(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const heroPickrateCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getHeroPickrateMatrix(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const playerMapPerfCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getPlayerMapPerformanceMatrix(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  const simulatorCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [tId, ttId] = key.split(":");
      return getSimulatorContext(Number(tId), Number(ttId)).pipe(
        Effect.tap(() => Metric.increment(ttCacheMissTotal))
      );
    },
  });

  return {
    getWinrates: (tId: number, ttId: number) =>
      winratesCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getFightStats: (tId: number, ttId: number) =>
      fightStatsCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getRolePerformanceStats: (tId: number, ttId: number) =>
      rolePerformanceCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getRoleBalanceAnalysis: (tId: number, ttId: number) =>
      roleBalanceCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getBestRoleTrios: (tId: number, ttId: number) =>
      roleTriosCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getRoleWinratesByMap: (tId: number, ttId: number) =>
      roleWinratesByMapCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getHeroPoolAnalysis: (tId: number, ttId: number) =>
      heroPoolCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getHeroSwapStats: (tId: number, ttId: number) =>
      heroSwapCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getMapModePerformance: (tId: number, ttId: number) =>
      mapModeCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getQuickWinsStats: (tId: number, ttId: number) =>
      quickWinsCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getUltStats: (tId: number, ttId: number) =>
      ultStatsCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getUltImpact: (tId: number, ttId: number) =>
      ultImpactCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getBanImpactAnalysis: (tId: number, ttId: number) =>
      banImpactCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getAbilityImpact: (tId: number, ttId: number) =>
      abilityImpactCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getMatchupWinrateData: (tId: number, ttId: number) =>
      matchupWinrateCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getEnemyHeroAnalysis: (tId: number, ttId: number) =>
      enemyHeroCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getMatchResults: (tId: number, ttId: number) =>
      matchResultsCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getWinrateOverTime: (
      tId: number,
      ttId: number,
      groupBy?: "week" | "month"
    ) =>
      winrateOverTimeCache
        .get(`${tId}:${ttId}:${groupBy ?? "week"}`)
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getRecentForm: (tId: number, ttId: number) =>
      recentFormCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getStreakInfo: (tId: number, ttId: number) =>
      streakInfoCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getTopMapsByPlaytime: (tId: number, ttId: number) =>
      topMapsCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getTop5MapsByPlaytime: (tId: number, ttId: number) =>
      top5MapsCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getBestMapByWinrate: (tId: number, ttId: number) =>
      bestMapCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getBlindSpotMap: (tId: number, ttId: number) =>
      blindSpotCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getHeroPickrateMatrix: (tId: number, ttId: number) =>
      heroPickrateCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getPlayerMapPerformanceMatrix: (tId: number, ttId: number) =>
      playerMapPerfCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    getSimulatorContext: (tId: number, ttId: number) =>
      simulatorCache
        .get(cacheKey(tId, ttId))
        .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
  } satisfies TournamentTeamStatsServiceInterface;
});

export const TournamentTeamStatsServiceLive = Layer.effect(
  TournamentTeamStatsService,
  make
).pipe(Layer.provide(TournamentTeamSharedDataServiceLive));
