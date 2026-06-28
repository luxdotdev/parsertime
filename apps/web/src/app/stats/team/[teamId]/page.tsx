import {
  OverviewAnalysisSection,
  QuickStatsRibbonSection,
  TeamRosterSection,
} from "@/components/stats/team/overview-sections";
import {
  SkeletonRibbon,
  SkeletonSection,
  SkeletonTable,
} from "@/components/stats/team/overview-skeletons";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import type { PagePropsWithLocale } from "@/types/next";
import { Suspense } from "react";
import { OverviewSkeleton } from "./loading-skeleton";
import { loadTeamStatsShell } from "./_lib/context";

// The heaviest dashboard in the app: dozens of services over a shared
// connection pool. The platform default (20s on preview) is too tight for
// a cold cache; warm renders are far faster.
export const maxDuration = 60;

export default function TeamStatsOverviewPage(
  props: PagePropsWithLocale<"/stats/team/[teamId]"> & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <TeamStatsOverviewContent
        params={props.params}
        searchParams={props.searchParams}
      />
    </Suspense>
  );
}

async function TeamStatsOverviewContent({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: PagePropsWithLocale<"/stats/team/[teamId]"> & {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const shell = await loadTeamStatsShell(params.teamId, searchParams);
  if (shell.gated) {
    return <TeamStatsGate scrimCount={shell.totalScrimCount} />;
  }

  const { teamId, dateRange, isManager, substituteNames } = shell;

  // Stream each block independently: the above-the-fold ribbon paints as soon
  // as its (light) reads resolve, while the heavier analysis and roster reads
  // continue in the background instead of blocking the whole page's first byte.
  return (
    <div className="mt-8 space-y-12">
      <Suspense fallback={<SkeletonRibbon />}>
        <QuickStatsRibbonSection teamId={teamId} dateRange={dateRange} />
      </Suspense>

      <Suspense
        fallback={
          <>
            <SkeletonSection bodyHeight={260} />
            <SkeletonTable rows={6} />
          </>
        }
      >
        <OverviewAnalysisSection teamId={teamId} dateRange={dateRange} />
      </Suspense>

      <Suspense fallback={<SkeletonSection bodyHeight={320} />}>
        <TeamRosterSection
          teamId={teamId}
          isManager={isManager}
          substituteNames={substituteNames}
        />
      </Suspense>
    </div>
  );
}
