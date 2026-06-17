import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { FightMapContent } from "@/components/team/fight-map-content";
import { AppRuntime } from "@/data/runtime";
import { FightFieldService } from "@/data/team/fight-field-service";
import { loadCalibration } from "@/lib/map-calibration/load-calibration";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { notFound } from "next/navigation";
import { loadTeamStatsShell } from "../_lib/context";

export const maxDuration = 60;

export default async function Page(
  props: PagePropsWithLocale<"/stats/team/[teamId]/tendencies"> & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const shell = await loadTeamStatsShell(params.teamId, searchParams);
  if (shell.gated) {
    return <TeamStatsGate scrimCount={shell.totalScrimCount} />;
  }
  if (!shell.positionalEnabled) notFound();

  const { teamId } = shell;

  // Fight map (tendencies): engagement-outcome field per map, pooled over a
  // fixed recent-scrims window — independent of the timeframe picker. Gated
  // by the positional flag, since the field is built from coordinate data.
  const fightMapData = await AppRuntime.runPromise(
    FightFieldService.pipe(Effect.flatMap((svc) => svc.getFightFields(teamId)))
  ).then(async (views) => {
    const entries = await Promise.all(
      views.map(
        async (view) =>
          [view.mapName, await loadCalibration(view.mapName)] as const
      )
    );
    return { views, calibrations: Object.fromEntries(entries) };
  });

  return (
    <div className="mt-8 space-y-12">
      <FightMapContent
        views={fightMapData.views}
        calibrations={fightMapData.calibrations}
      />
    </div>
  );
}
