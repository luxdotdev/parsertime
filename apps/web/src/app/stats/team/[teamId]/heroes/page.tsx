import { HeroBanImpactCard } from "@/components/stats/team/hero-ban-impact-card";
import { HeroOurBansCard } from "@/components/stats/team/hero-our-bans-card";
import { HeroPoolContainer } from "@/components/stats/team/hero-pool-container";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { AppRuntime } from "@/data/runtime";
import {
  TeamAnalyticsService,
  TeamBanImpactService,
  TeamHeroPoolService,
} from "@/data/team";
import { calculateHeroPickrateMatrix } from "@/lib/hero-pickrate-utils";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { Suspense } from "react";
import { HeroesSkeleton } from "./loading-skeleton";
import { loadTeamStatsShell } from "../_lib/context";

export const maxDuration = 60;

export default function Page(
  props: PagePropsWithLocale<"/stats/team/[teamId]/heroes"> & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  return (
    <Suspense fallback={<HeroesSkeleton />}>
      <PageContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function PageContent({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: PagePropsWithLocale<"/stats/team/[teamId]/heroes"> & {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const shell = await loadTeamStatsShell(params.teamId, searchParams);
  if (shell.gated) {
    return <TeamStatsGate scrimCount={shell.totalScrimCount} />;
  }

  const { teamId, dateRange } = shell;

  const { heroPool, banImpactAnalysis, heroPickrateRawData } =
    await AppRuntime.runPromise(
      Effect.all(
        {
          heroPool: TeamHeroPoolService.pipe(
            Effect.flatMap((svc) =>
              svc.getHeroPoolAnalysis(teamId, dateRange?.from, dateRange?.to)
            )
          ),
          banImpactAnalysis: TeamBanImpactService.pipe(
            Effect.flatMap((svc) =>
              svc.getTeamBanImpactAnalysis(teamId, dateRange)
            )
          ),
          heroPickrateRawData: TeamAnalyticsService.pipe(
            Effect.flatMap((svc) =>
              svc.getHeroPickrateRawData(teamId, dateRange)
            )
          ),
        },
        { concurrency: "unbounded" }
      )
    );
  const heroPickrateMatrix = calculateHeroPickrateMatrix(heroPickrateRawData);

  return (
    <div className="mt-8 space-y-12">
      <StatRibbon
        cells={[
          {
            label: "Heroes played",
            value: String(heroPool.diversity.totalUniqueHeroes),
            sub: "unique heroes",
            emphasis: true,
          },
          {
            label: "Effective pool",
            value: heroPool.diversity.effectiveHeroPool.toFixed(1),
            sub: "core rotation",
          },
          {
            label: "Top winrate",
            value: heroPool.topHeroWinrates[0]
              ? `${heroPool.topHeroWinrates[0].winrate.toFixed(0)}%`
              : "—",
            sub: heroPool.topHeroWinrates[0]?.heroName ?? "—",
          },
          {
            label: "Bans against us",
            value: String(banImpactAnalysis.received.totalMapsAnalyzed),
            sub: `${banImpactAnalysis.received.banImpacts.length} unique`,
          },
        ]}
        columns={4}
      />
      <HeroPoolContainer
        initialData={heroPool}
        heatmapInitialData={heroPickrateMatrix}
      />
      <HeroBanImpactCard analysis={banImpactAnalysis} />
      <HeroOurBansCard outgoing={banImpactAnalysis.outgoing} />
    </div>
  );
}
