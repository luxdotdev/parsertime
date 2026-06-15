import { MapPerformanceTable } from "@/components/stats/team/map-performance-table";
import { OverviewInsightsBand } from "@/components/stats/team/overview-insights-band";
import { QuickStatsRibbon } from "@/components/stats/team/quick-stats-ribbon";
import { TeamRosterGrid } from "@/components/stats/team/team-roster-grid";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { AppRuntime } from "@/data/runtime";
import {
  TeamHeroPoolService,
  TeamQuickWinsService,
  TeamRoleStatsService,
  TeamSharedDataService,
  TeamStatsService,
} from "@/data/team";
import { getTempoBaselines } from "@/lib/tempo/read";
import { getMapNames } from "@/lib/utils";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { loadTeamStatsShell } from "./_lib/context";

// The heaviest dashboard in the app: dozens of services over a shared
// connection pool. The platform default (20s on preview) is too tight for
// a cold cache; warm renders are far faster.
export const maxDuration = 60;

export default async function TeamStatsOverviewPage(
  props: PagePropsWithLocale<"/stats/team/[teamId]"> & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const shell = await loadTeamStatsShell(params.teamId, searchParams);
  if (shell.gated) {
    return <TeamStatsGate scrimCount={shell.totalScrimCount} />;
  }

  const { teamId, dateRange, isManager, substituteNames } = shell;

  const [
    {
      quickStats,
      roleStats,
      roleBalance,
      bestMapByWinrate,
      blindSpotMap,
      top5Maps,
      allMapsPlaytime,
      heroPool,
      teamRoster,
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
          allMapsPlaytime: TeamStatsService.pipe(
            Effect.flatMap((svc) => svc.getTopMapsByPlaytime(teamId, dateRange))
          ),
          heroPool: TeamHeroPoolService.pipe(
            Effect.flatMap((svc) =>
              svc.getHeroPoolAnalysis(teamId, dateRange?.from, dateRange?.to)
            )
          ),
          teamRoster: TeamSharedDataService.pipe(
            Effect.flatMap((svc) => svc.getTeamRoster(teamId))
          ),
          winrates: TeamStatsService.pipe(
            Effect.flatMap((svc) => svc.getTeamWinrates(teamId, dateRange))
          ),
        },
        { concurrency: "unbounded" }
      )
    ),
    getMapNames(),
  ]);

  const baselines = await getTempoBaselines();

  return (
    <div className="mt-8 space-y-12">
      <QuickStatsRibbon
        stats={quickStats}
        uniqueHeroes={heroPool.diversity.totalUniqueHeroes}
        uniqueMaps={allMapsPlaytime.length}
        fightBaseline={baselines.FIGHT_DURATION ?? null}
      />

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

      <TeamRosterGrid
        roster={teamRoster}
        teamId={teamId}
        isManager={isManager}
        substitutes={[...substituteNames]}
      />
    </div>
  );
}
