import { MatchupWinrateTab } from "@/components/stats/team/matchup-winrate-tab";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { TeamStatsHeader } from "@/components/stats/team/team-stats-header";
import { AppRuntime } from "@/data/runtime";
import { TeamMatchupService } from "@/data/team";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { loadTeamStatsHeaderData, loadTeamStatsShell } from "../_lib/context";

export const maxDuration = 60;

export default async function Page(
  props: PagePropsWithLocale<"/stats/team/[teamId]/winrates"> & {
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

  const { matchupWinrateData } = await AppRuntime.runPromise(
    Effect.all(
      {
        matchupWinrateData: TeamMatchupService.pipe(
          Effect.flatMap((svc) => svc.getMatchupWinrateData(teamId, dateRange))
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
      <div className="mt-8 space-y-6">
        <MatchupWinrateTab data={matchupWinrateData} />
      </div>
    </div>
  );
}
