import {
  PositionalStatsCards,
  PositionalStatsEmpty,
} from "@/components/stats/team/positional-stats-cards";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { AppRuntime } from "@/data/runtime";
import {
  TeamPositionalArtifactsService,
  TeamPositionalStatsService,
} from "@/data/team";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PositionalSkeleton } from "./loading-skeleton";
import { loadTeamStatsShell } from "../_lib/context";

export const maxDuration = 60;

export default function Page(
  props: PagePropsWithLocale<"/stats/team/[teamId]/positional"> & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  return (
    <Suspense fallback={<PositionalSkeleton />}>
      <PageContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function PageContent({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: PagePropsWithLocale<"/stats/team/[teamId]/positional"> & {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const shell = await loadTeamStatsShell(params.teamId, searchParams);
  if (shell.gated) {
    return <TeamStatsGate scrimCount={shell.totalScrimCount} />;
  }
  if (!shell.positionalEnabled) notFound();

  const { teamId } = shell;

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
  );
}
