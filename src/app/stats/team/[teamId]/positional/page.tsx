import {
  PositionalStatsCards,
  PositionalStatsEmpty,
} from "@/components/stats/team/positional-stats-cards";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { TeamStatsHeader } from "@/components/stats/team/team-stats-header";
import { AppRuntime } from "@/data/runtime";
import {
  TeamPositionalArtifactsService,
  TeamPositionalStatsService,
} from "@/data/team";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { notFound } from "next/navigation";
import { loadTeamStatsHeaderData, loadTeamStatsShell } from "../_lib/context";

export const maxDuration = 60;

export default async function Page(
  props: PagePropsWithLocale<"/stats/team/[teamId]/positional"> & {
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
  if (!shell.positionalEnabled) notFound();

  const { teamId } = shell;
  const headerData = await loadTeamStatsHeaderData(shell);

  const { positionalStats, positionalArtifacts } = await AppRuntime.runPromise(
    Effect.all(
      {
        positionalStats: TeamPositionalStatsService.pipe(
          Effect.flatMap((svc) => svc.getTeamPositionalStats(teamId))
        ),
        positionalArtifacts: TeamPositionalArtifactsService.pipe(
          Effect.flatMap((svc) => svc.getTeamPositionalArtifacts(teamId))
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
        {positionalStats ? (
          <PositionalStatsCards
            data={positionalStats}
            artifacts={positionalArtifacts}
          />
        ) : (
          <PositionalStatsEmpty />
        )}
      </div>
    </div>
  );
}
