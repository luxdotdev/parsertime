import { AbilityImpactAnalysisCard } from "@/components/stats/team/ability-impact-analysis-card";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { TeamFightStatsCard } from "@/components/stats/team/team-fight-stats-card";
import { TeamInitiationCard } from "@/components/stats/team/team-initiation-card";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { WinProbabilityInsights } from "@/components/stats/team/win-probability-insights";
import { AppRuntime } from "@/data/runtime";
import { TeamInitiationService } from "@/data/team/initiation-service";
import { TeamAbilityImpactService, TeamFightStatsService } from "@/data/team";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { Suspense } from "react";
import { TeamfightsSkeleton } from "./loading-skeleton";
import { loadTeamStatsShell } from "../_lib/context";

export const maxDuration = 60;

export default function Page(
  props: PagePropsWithLocale<"/stats/team/[teamId]/teamfights"> & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  return (
    <Suspense fallback={<TeamfightsSkeleton />}>
      <PageContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function PageContent({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: PagePropsWithLocale<"/stats/team/[teamId]/teamfights"> & {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const shell = await loadTeamStatsShell(params.teamId, searchParams);
  if (shell.gated) {
    return <TeamStatsGate scrimCount={shell.totalScrimCount} />;
  }

  const { teamId, dateRange } = shell;

  const { fightStats, initiation, abilityImpactAnalysis } =
    await AppRuntime.runPromise(
      Effect.all(
        {
          fightStats: TeamFightStatsService.pipe(
            Effect.flatMap((svc) => svc.getTeamFightStats(teamId, dateRange))
          ),
          initiation: TeamInitiationService.pipe(
            Effect.flatMap((svc) => svc.getTeamInitiation(teamId, dateRange))
          ),
          abilityImpactAnalysis: TeamAbilityImpactService.pipe(
            Effect.flatMap((svc) => svc.getTeamAbilityImpact(teamId, dateRange))
          ),
        },
        { concurrency: "unbounded" }
      )
    );

  return (
    <div className="mt-8 space-y-12">
      <StatRibbon
        cells={[
          {
            label: "Fight winrate",
            value:
              fightStats.totalFights > 0
                ? `${fightStats.overallWinrate.toFixed(0)}%`
                : "—",
            sub:
              fightStats.totalFights > 0
                ? `${fightStats.fightsWon}–${fightStats.fightsLost} of ${fightStats.totalFights}`
                : "no fights",
            emphasis: true,
          },
          {
            label: "First pick",
            value:
              fightStats.firstPickFights > 0
                ? `${fightStats.firstPickWinrate.toFixed(0)}%`
                : "—",
            sub:
              fightStats.firstPickFights > 0
                ? `${fightStats.firstPickFights} fights`
                : "no data",
          },
          {
            label: "First death",
            value:
              fightStats.firstDeathFights > 0
                ? `${fightStats.firstDeathWinrate.toFixed(0)}%`
                : "—",
            sub:
              fightStats.firstDeathFights > 0
                ? `${fightStats.firstDeathFights} fights`
                : "no data",
          },
          {
            label: "Dry fight WR",
            value:
              fightStats.dryFights > 0
                ? `${fightStats.dryFightWinrate.toFixed(0)}%`
                : "—",
            sub:
              fightStats.dryFights > 0
                ? `${fightStats.dryFights} fights`
                : "no dry fights",
          },
        ]}
        columns={4}
      />
      <TeamFightStatsCard fightStats={fightStats} />
      <TeamInitiationCard initiationStats={initiation} />
      <WinProbabilityInsights fightStats={fightStats} />
      <AbilityImpactAnalysisCard analysis={abilityImpactAnalysis} />
    </div>
  );
}
