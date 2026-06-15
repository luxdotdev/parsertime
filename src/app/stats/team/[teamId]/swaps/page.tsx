import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { SwapOverviewCard } from "@/components/stats/team/swap-overview-card";
import { SwapPairsCard } from "@/components/stats/team/swap-pairs-card";
import { SwapPlayerBreakdownCard } from "@/components/stats/team/swap-player-breakdown-card";
import { SwapTimingCard } from "@/components/stats/team/swap-timing-card";
import { SwapWinrateImpactCard } from "@/components/stats/team/swap-winrate-impact-card";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { TeamStatsHeader } from "@/components/stats/team/team-stats-header";
import { AppRuntime } from "@/data/runtime";
import { TeamHeroSwapService } from "@/data/team";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { loadTeamStatsHeaderData, loadTeamStatsShell } from "../_lib/context";

export const maxDuration = 60;

export default async function Page(
  props: PagePropsWithLocale<"/stats/team/[teamId]/swaps"> & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const shell = await loadTeamStatsShell(params.teamId, searchParams);
  if (shell.gated) {
    return (
      <TeamStatsGate team={shell.team} scrimCount={shell.totalScrimCount} />
    );
  }

  const { teamId, dateRange } = shell;
  const headerData = await loadTeamStatsHeaderData(shell);

  const { heroSwapStats } = await AppRuntime.runPromise(
    Effect.all(
      {
        heroSwapStats: TeamHeroSwapService.pipe(
          Effect.flatMap((svc) => svc.getTeamHeroSwapStats(teamId, dateRange))
        ),
      },
      { concurrency: "unbounded" }
    )
  );

  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <TeamStatsHeader
        team={shell.team}
        teamId={teamId}
        effectiveTimeframe={shell.effectiveTimeframe}
        permissions={shell.permissions}
        headerData={headerData}
        totalScrimCount={shell.totalScrimCount}
        positionalEnabled={shell.positionalEnabled}
        simulationEnabled={shell.simulationEnabled}
      />
      <div className="mt-8 space-y-12">
        <StatRibbon
          cells={[
            {
              label: "Total swaps",
              value: String(heroSwapStats.totalSwaps),
              sub: `across ${heroSwapStats.totalMaps} maps`,
              emphasis: true,
            },
            {
              label: "Swaps per map",
              value: heroSwapStats.swapsPerMap.toFixed(1),
              sub: "average",
            },
            {
              label: "Post-swap WR",
              value:
                heroSwapStats.swapWins + heroSwapStats.swapLosses > 0
                  ? `${heroSwapStats.swapWinrate.toFixed(0)}%`
                  : "—",
              sub:
                heroSwapStats.swapWins + heroSwapStats.swapLosses > 0
                  ? `${heroSwapStats.swapWins}–${heroSwapStats.swapLosses}`
                  : "no swap maps",
            },
            {
              label: "No-swap WR",
              value:
                heroSwapStats.noSwapWins + heroSwapStats.noSwapLosses > 0
                  ? `${heroSwapStats.noSwapWinrate.toFixed(0)}%`
                  : "—",
              sub:
                heroSwapStats.noSwapWins + heroSwapStats.noSwapLosses > 0
                  ? `${heroSwapStats.noSwapWins}–${heroSwapStats.noSwapLosses}`
                  : "no static maps",
            },
          ]}
          columns={4}
        />
        <SwapOverviewCard swapStats={heroSwapStats} />
        <SwapTimingCard swapStats={heroSwapStats} />
        <SwapWinrateImpactCard swapStats={heroSwapStats} />
        <SwapPairsCard swapStats={heroSwapStats} />
        <SwapPlayerBreakdownCard swapStats={heroSwapStats} />
      </div>
    </div>
  );
}
