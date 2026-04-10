import type { HeroName } from "@/types/heroes";
import { roleHeroMapping } from "@/types/heroes";
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
import {
  TeamBanImpactService,
  TeamBanImpactServiceLive,
} from "./ban-impact-service";
import type { TeamQueryError } from "./errors";
import {
  TeamHeroPoolService,
  TeamHeroPoolServiceLive,
} from "./hero-pool-service";
import { TeamMapModeService, TeamMapModeServiceLive } from "./map-mode-service";
import { TeamMatchupService, TeamMatchupServiceLive } from "./matchup-service";
import { teamCacheMissTotal, teamCacheRequestTotal } from "./metrics";
import {
  TeamRoleStatsService,
  TeamRoleStatsServiceLive,
} from "./role-stats-service";
import type { TeamDateRange } from "./shared-core";
import { TeamStatsService, TeamStatsServiceLive } from "./stats-service";

const predictionQuerySuccessTotal = Metric.counter(
  "team.prediction.query.success",
  {
    description: "Total successful team prediction queries",
    incremental: true,
  }
);

const predictionQueryErrorTotal = Metric.counter(
  "team.prediction.query.error",
  {
    description: "Total team prediction query failures",
    incremental: true,
  }
);

const predictionQueryDuration = Metric.histogram(
  "team.prediction.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team prediction query duration in milliseconds"
);

export type { SimulatorContext } from "./types";
import type { SimulatorContext } from "./types";

const EXCLUDED_MAP_TYPES = new Set<$Enums.MapType>([
  $Enums.MapType.Push,
  $Enums.MapType.Clash,
]);

export type TeamPredictionServiceInterface = {
  readonly getSimulatorContext: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<SimulatorContext, TeamQueryError>;
};

export class TeamPredictionService extends Context.Tag(
  "@app/data/team/TeamPredictionService"
)<TeamPredictionService, TeamPredictionServiceInterface>() {}

export const make = Effect.gen(function* () {
  const statsService = yield* TeamStatsService;
  const banImpactService = yield* TeamBanImpactService;
  const heroPoolService = yield* TeamHeroPoolService;
  const mapModeService = yield* TeamMapModeService;
  const roleStatsService = yield* TeamRoleStatsService;
  const matchupService = yield* TeamMatchupService;

  function getSimulatorContext(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<SimulatorContext, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);

      const {
        winrates,
        banAnalysis,
        heroPool,
        mapModePerf,
        roleTrios,
        enemyHeroes,
      } = yield* Effect.all(
        {
          winrates: statsService.getTeamWinrates(teamId, dateRange),
          banAnalysis: banImpactService.getTeamBanImpactAnalysis(
            teamId,
            dateRange
          ),
          heroPool: heroPoolService.getHeroPoolAnalysis(
            teamId,
            dateRange?.from,
            dateRange?.to
          ),
          mapModePerf: mapModeService.getMapModePerformance(teamId, dateRange),
          roleTrios: roleStatsService.getBestRoleTrios(teamId, dateRange),
          enemyHeroes: matchupService.getEnemyHeroAnalysis(teamId, dateRange),
        },
        { concurrency: "unbounded" }
      );

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
      for (const [modeKey, modeData] of Object.entries(mapModePerf.byMode)) {
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

      wideEvent.outcome = "success";
      wideEvent.total_games = totalGames;
      wideEvent.base_winrate = baseWinrate;
      wideEvent.available_maps = availableMaps.length;
      yield* Metric.increment(predictionQuerySuccessTotal);

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
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(predictionQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.prediction.getSimulatorContext")
              : Effect.logInfo("team.prediction.getSimulatorContext");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(predictionQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.prediction.getSimulatorContext")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  function cacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
    return `${teamId}:${JSON.stringify(dateRange ?? {})}`;
  }

  const simulatorCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dateRange = JSON.parse(rest) as TeamDateRange | undefined;
      const dr = dateRange?.from ? dateRange : undefined;
      return getSimulatorContext(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getSimulatorContext: (teamId: number, dateRange?: TeamDateRange) =>
      simulatorCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamPredictionServiceInterface;
});

export const TeamPredictionServiceLive = Layer.effect(
  TeamPredictionService,
  make
).pipe(
  Layer.provide(
    Layer.mergeAll(
      TeamStatsServiceLive,
      TeamBanImpactServiceLive,
      TeamHeroPoolServiceLive,
      TeamMapModeServiceLive,
      TeamRoleStatsServiceLive,
      TeamMatchupServiceLive
    )
  )
);
