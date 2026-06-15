import { AbilityImpactAnalysisCard } from "@/components/stats/team/ability-impact-analysis-card";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { TeamFightStatsCard } from "@/components/stats/team/team-fight-stats-card";
import { TeamInitiationCard } from "@/components/stats/team/team-initiation-card";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { TeamStatsHeader } from "@/components/stats/team/team-stats-header";
import { WinProbabilityInsights } from "@/components/stats/team/win-probability-insights";
import { AppRuntime } from "@/data/runtime";
import { TeamInitiationService } from "@/data/team/initiation-service";
import { TeamAbilityImpactService, TeamFightStatsService } from "@/data/team";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { loadTeamStatsHeaderData, loadTeamStatsShell } from "../_lib/context";

export const maxDuration = 60;

export default async function Page(
  props: PagePropsWithLocale<"/stats/team/[teamId]/teamfights"> & {
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
    </div>
  );
}
