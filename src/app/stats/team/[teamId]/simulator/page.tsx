import { SimulatorTab } from "@/components/stats/team/simulator-tab";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { AppRuntime } from "@/data/runtime";
import { TeamPredictionService } from "@/data/team";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { notFound } from "next/navigation";
import { loadTeamStatsShell } from "../_lib/context";

export const maxDuration = 60;

export default async function Page(
  props: PagePropsWithLocale<"/stats/team/[teamId]/simulator"> & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const shell = await loadTeamStatsShell(params.teamId, searchParams);
  if (shell.gated) {
    return <TeamStatsGate scrimCount={shell.totalScrimCount} />;
  }
  if (!shell.simulationEnabled) notFound();

  const { teamId, dateRange } = shell;

  const simulatorContext = await AppRuntime.runPromise(
    TeamPredictionService.pipe(
      Effect.flatMap((svc) => svc.getSimulatorContext(teamId, dateRange))
    )
  );

  return (
    <div className="mt-8 space-y-6">
      <SimulatorTab ctx={simulatorContext} />
    </div>
  );
}
