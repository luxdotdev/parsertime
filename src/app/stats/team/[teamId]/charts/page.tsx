import { TeamChartsTab } from "@/components/stats/team/charts/team-charts-tab";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { AppRuntime } from "@/data/runtime";
import { TeamScatterService } from "@/data/team";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { loadTeamStatsShell } from "../_lib/context";

export const maxDuration = 60;

export default async function Page(
  props: PagePropsWithLocale<"/stats/team/[teamId]/charts"> & {
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

  const { scatterData } = await AppRuntime.runPromise(
    Effect.all(
      {
        scatterData: TeamScatterService.pipe(
          Effect.flatMap((svc) => svc.getPlayerScatterStats(teamId, dateRange))
        ),
      },
      { concurrency: "unbounded" }
    )
  );

  return (
    <div className="mt-8">
      <TeamChartsTab scatterData={scatterData} />
    </div>
  );
}
