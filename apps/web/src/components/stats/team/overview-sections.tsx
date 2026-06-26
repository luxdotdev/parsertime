import { MapPerformanceTable } from "@/components/stats/team/map-performance-table";
import { OverviewInsightsBand } from "@/components/stats/team/overview-insights-band";
import { QuickStatsRibbon } from "@/components/stats/team/quick-stats-ribbon";
import { TeamRosterGrid } from "@/components/stats/team/team-roster-grid";
import { AppRuntime } from "@/data/runtime";
import {
  TeamHeroPoolService,
  TeamQuickWinsService,
  TeamRoleStatsService,
  TeamSharedDataService,
  TeamStatsService,
} from "@/data/team";
import type { TeamDateRange } from "@/data/team/shared-core";
import { getTempoBaselines } from "@/lib/tempo/read";
import { getMapNames } from "@/lib/utils";
import { Effect } from "effect";

// Each section fetches only its own slice and is rendered inside its own
// <Suspense> on the overview page, so the above-the-fold ribbon paints without
// waiting for the heavier analysis/roster reads. The expensive per-team base
// read is deduped across sections by the shared-data Effect cache, so the only
// duplicated work between sections is light in-memory derivation.

type SectionProps = {
  teamId: number;
  dateRange: TeamDateRange | undefined;
};

export async function QuickStatsRibbonSection({
  teamId,
  dateRange,
}: SectionProps) {
  const [{ quickStats, heroPool, allMapsPlaytime }, baselines] =
    await Promise.all([
      AppRuntime.runPromise(
        Effect.all(
          {
            quickStats: TeamQuickWinsService.pipe(
              Effect.flatMap((svc) => svc.getQuickWinsStats(teamId, dateRange))
            ),
            heroPool: TeamHeroPoolService.pipe(
              Effect.flatMap((svc) =>
                svc.getHeroPoolAnalysis(teamId, dateRange?.from, dateRange?.to)
              )
            ),
            allMapsPlaytime: TeamStatsService.pipe(
              Effect.flatMap((svc) =>
                svc.getTopMapsByPlaytime(teamId, dateRange)
              )
            ),
          },
          { concurrency: 4 }
        )
      ),
      getTempoBaselines(),
    ]);

  return (
    <QuickStatsRibbon
      stats={quickStats}
      uniqueHeroes={heroPool.diversity.totalUniqueHeroes}
      uniqueMaps={allMapsPlaytime.length}
      fightBaseline={baselines.FIGHT_DURATION ?? null}
    />
  );
}

export async function OverviewAnalysisSection({
  teamId,
  dateRange,
}: SectionProps) {
  const [
    {
      quickStats,
      roleStats,
      roleBalance,
      bestMapByWinrate,
      blindSpotMap,
      top5Maps,
      winrates,
    },
    mapNames,
  ] = await Promise.all([
    AppRuntime.runPromise(
      Effect.all(
        {
          quickStats: TeamQuickWinsService.pipe(
            Effect.flatMap((svc) => svc.getQuickWinsStats(teamId, dateRange))
          ),
          roleStats: TeamRoleStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getRolePerformanceStats(teamId, dateRange)
            )
          ),
          roleBalance: TeamRoleStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getRoleBalanceAnalysis(teamId, dateRange)
            )
          ),
          bestMapByWinrate: TeamStatsService.pipe(
            Effect.flatMap((svc) => svc.getBestMapByWinrate(teamId, dateRange))
          ),
          blindSpotMap: TeamStatsService.pipe(
            Effect.flatMap((svc) => svc.getBlindSpotMap(teamId, dateRange))
          ),
          top5Maps: TeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getTop5MapsByPlaytime(teamId, dateRange)
            )
          ),
          winrates: TeamStatsService.pipe(
            Effect.flatMap((svc) => svc.getTeamWinrates(teamId, dateRange))
          ),
        },
        { concurrency: 4 }
      )
    ),
    getMapNames(),
  ]);

  return (
    <>
      <OverviewInsightsBand
        quickStats={quickStats}
        roleStats={roleStats}
        roleBalance={roleBalance}
        bestMap={bestMapByWinrate}
        blindSpot={blindSpotMap}
        mapNames={mapNames}
      />
      <MapPerformanceTable
        topMaps={top5Maps}
        winrates={winrates.byMap}
        bestMap={bestMapByWinrate}
        blindSpot={blindSpotMap}
        mapNames={mapNames}
      />
    </>
  );
}

export async function TeamRosterSection({
  teamId,
  isManager,
  substituteNames,
}: {
  teamId: number;
  isManager: boolean;
  substituteNames: Set<string>;
}) {
  const teamRoster = await AppRuntime.runPromise(
    TeamSharedDataService.pipe(
      Effect.flatMap((svc) => svc.getTeamRoster(teamId))
    )
  );

  return (
    <TeamRosterGrid
      roster={teamRoster}
      teamId={teamId}
      isManager={isManager}
      substitutes={[...substituteNames]}
    />
  );
}
