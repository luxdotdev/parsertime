import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { UltCombosCard } from "@/components/stats/team/ult-combos-card";
import { UltEconomyCard } from "@/components/stats/team/ult-economy-card";
import { UltImpactAnalysisCard } from "@/components/stats/team/ult-impact-analysis-card";
import { UltPlayerRankingsCard } from "@/components/stats/team/ult-player-rankings-card";
import { UltResponseCard } from "@/components/stats/team/ult-response-card";
import { UltRoleBreakdownCard } from "@/components/stats/team/ult-role-breakdown-card";
import { UltUsageOverviewCard } from "@/components/stats/team/ult-usage-overview-card";
import { UltimateEconomyCard } from "@/components/stats/team/ultimate-economy-card";
import { AppRuntime } from "@/data/runtime";
import { TeamFightStatsService, TeamUltService } from "@/data/team";
import { ultimateImpactTool } from "@/lib/flags";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { loadTeamStatsShell } from "../_lib/context";

export const maxDuration = 60;

export default async function Page(
  props: PagePropsWithLocale<"/stats/team/[teamId]/ultimates"> & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const shell = await loadTeamStatsShell(params.teamId, searchParams);
  if (shell.gated) {
    return <TeamStatsGate scrimCount={shell.totalScrimCount} />;
  }

  const { teamId, dateRange } = shell;

  const [
    { ultStats, fightStats, ultImpactAnalysis, ultCombos, ultEconomy },
    ultimateImpactToolEnabled,
  ] = await Promise.all([
    AppRuntime.runPromise(
      Effect.all(
        {
          ultStats: TeamUltService.pipe(
            Effect.flatMap((svc) => svc.getTeamUltStats(teamId, dateRange))
          ),
          fightStats: TeamFightStatsService.pipe(
            Effect.flatMap((svc) => svc.getTeamFightStats(teamId, dateRange))
          ),
          ultImpactAnalysis: TeamUltService.pipe(
            Effect.flatMap((svc) => svc.getTeamUltImpact(teamId, dateRange))
          ),
          ultCombos: TeamUltService.pipe(
            Effect.flatMap((svc) => svc.getTeamUltCombos(teamId, dateRange))
          ),
          ultEconomy: TeamUltService.pipe(
            Effect.flatMap((svc) => svc.getTeamUltEconomy(teamId, dateRange))
          ),
        },
        { concurrency: "unbounded" }
      )
    ),
    ultimateImpactTool(),
  ]);

  return (
    <div className="mt-8 space-y-12">
      <StatRibbon
        cells={[
          {
            label: "Total ultimates",
            value: String(ultStats.totalUltsUsed),
            sub: `${ultStats.ultsPerMap.toFixed(1)} per map`,
            emphasis: true,
          },
          {
            label: "In fights",
            value: `${ultStats.fightInitiationRate.toFixed(0)}%`,
            sub: `${ultStats.fightInitiationCount} initiations`,
          },
          {
            label: "Avg charge",
            value: `${ultStats.avgChargeTime.toFixed(0)}s`,
            sub: `held ${ultStats.avgHoldTime.toFixed(0)}s`,
          },
          {
            label: "Wasted",
            value: String(fightStats.wastedUltimates),
            sub: "no fight impact",
          },
        ]}
        columns={4}
      />
      <UltUsageOverviewCard ultStats={ultStats} />
      {ultimateImpactToolEnabled && (
        <UltImpactAnalysisCard analysis={ultImpactAnalysis} />
      )}
      <UltCombosCard analysis={ultCombos} />
      <UltResponseCard analysis={ultCombos} />
      <UltimateEconomyCard fightStats={fightStats} />
      <UltEconomyCard analysis={ultEconomy} />
      <UltRoleBreakdownCard ultStats={ultStats} />
      <UltPlayerRankingsCard ultStats={ultStats} />
    </div>
  );
}
