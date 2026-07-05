import { ScoutForTeamPicker } from "@/components/scouting/scout-for-team-picker";
import { ScoutingFaceitLink } from "@/components/scouting/scouting-faceit-link";
import { ScoutingHeroBans } from "@/components/scouting/scouting-hero-bans";
import { ScoutingMapPerformance } from "@/components/scouting/scouting-map-performance";
import { ScoutingPlayerMatchups } from "@/components/scouting/scouting-player-matchups";
import { ScoutingReport } from "@/components/scouting/scouting-report";
import { ScoutingTeamHeader } from "@/components/scouting/scouting-team-header";
import { ScoutingTeamOverview } from "@/components/scouting/scouting-team-overview";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HeroBanIntelligenceService,
  MapIntelligenceService,
} from "@/data/intelligence";
import { IntelligenceService } from "@/data/player";
import { AppRuntime } from "@/data/runtime";
import {
  OpponentStrengthService,
  ScoutingFaceitLinkService,
  ScoutingService,
} from "@/data/scouting";
import type { FaceitTeamLink } from "@/data/scouting/types";
import { Effect } from "effect";
import { auth } from "@/lib/auth";
import { resolveDataAvailability } from "@/lib/data-availability";
import { faceitScouting, scoutingTool } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import { generateInsights } from "@/lib/insights";
import { getStaticTranslations } from "@/lib/metadata-i18n";
import prisma from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type UserTeamOption = { id: number; name: string };

export async function generateMetadata(props: {
  params: Promise<{ teamAbbr: string }>;
}): Promise<Metadata> {
  const { teamAbbr } = await props.params;
  const t = await getTranslations("scoutingPage.team.metadata");
  const profile = await AppRuntime.runPromise(
    ScoutingService.pipe(
      Effect.flatMap((svc) =>
        svc.getScoutingTeamProfile(decodeURIComponent(teamAbbr))
      )
    )
  );
  const team = profile?.team.fullName ?? decodeURIComponent(teamAbbr);
  return {
    title: t("title", { team }),
    description: t("description", { team }),
    openGraph: {
      title: t("ogTitle", { team }),
      description: t("ogDescription", { team }),
    },
  };
}

async function getUserTeams(): Promise<{
  teams: UserTeamOption[];
  userId: string | null;
}> {
  const session = await auth();
  if (!session?.user?.email) return { teams: [], userId: null };

  const user = await prisma.user.findFirst({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return { teams: [], userId: null };

  const teams = await prisma.team.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { users: { some: { id: user.id } } },
        { managers: { some: { userId: user.id } } },
      ],
      id: { not: 0 },
    },
    select: { id: true, name: true, scoutingTeamAbbr: true },
    orderBy: { updatedAt: "desc" },
  });

  return {
    teams: teams.map((t) => ({ id: t.id, name: t.name })),
    userId: user.id,
  };
}

function resolveScoutForTeamId(
  scoutForParam: string | undefined,
  userTeams: UserTeamOption[]
): number | null {
  if (!scoutForParam) return null;
  const parsed = parseInt(scoutForParam, 10);
  if (Number.isNaN(parsed)) return null;
  if (!userTeams.some((t) => t.id === parsed)) return null;
  return parsed;
}

// Static shell: the page frame prerenders and the request-derived report
// streams into ONE boundary whose fallback mirrors the loaded sections, so
// navigation shows a single stable skeleton instead of a cascade.
export default function ScoutingTeamPage(
  props: PageProps<"/scouting/team/[teamAbbr]"> & {
    searchParams: Promise<{ scoutFor?: string }>;
  }
) {
  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-16 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-12">
        <Suspense fallback={<ScoutingTeamSkeleton />}>
          <ScoutingTeamContent
            params={props.params}
            searchParams={props.searchParams}
          />
        </Suspense>
      </div>
    </div>
  );
}

async function ScoutingTeamContent({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: PageProps<"/scouting/team/[teamAbbr]">["params"];
  searchParams: Promise<{ scoutFor?: string }>;
}) {
  const scoutingEnabled = await getFlag(scoutingTool);
  if (!scoutingEnabled) notFound();

  const [params, searchParams] = await Promise.all([
    paramsPromise,
    searchParamsPromise,
  ]);
  const teamAbbr = decodeURIComponent(params.teamAbbr);
  const t = await getTranslations("scoutingPage.team");

  const profile = await AppRuntime.runPromise(
    ScoutingService.pipe(
      Effect.flatMap((svc) => svc.getScoutingTeamProfile(teamAbbr))
    )
  );
  if (!profile) notFound();

  const { overview } = profile;
  const { teams: userTeams } = await getUserTeams();

  const userTeamId = resolveScoutForTeamId(searchParams.scoutFor, userTeams);
  const hasUserTeamLink = userTeamId !== null;

  const [
    { strengthRating, strengthPercentile },
    dataAvailability,
    faceitEnabled,
  ] = await Promise.all([
    AppRuntime.runPromise(
      Effect.all(
        {
          strengthRating: OpponentStrengthService.pipe(
            Effect.flatMap((svc) => svc.getTeamStrengthRating(teamAbbr))
          ),
          strengthPercentile: OpponentStrengthService.pipe(
            Effect.flatMap((svc) => svc.getTeamStrengthPercentile(teamAbbr))
          ),
        },
        { concurrency: "unbounded" }
      )
    ),
    resolveDataAvailability(teamAbbr, userTeamId),
    getFlag(faceitScouting),
  ]);

  const [mapIntelligence, banIntelligence, playerIntelligence, faceitLink] =
    await AppRuntime.runPromise(
      Effect.all(
        {
          mapIntelligence: MapIntelligenceService.pipe(
            Effect.flatMap((svc) =>
              svc.getMapIntelligence(teamAbbr, userTeamId, dataAvailability)
            )
          ),
          banIntelligence: HeroBanIntelligenceService.pipe(
            Effect.flatMap((svc) =>
              svc.getHeroBanIntelligence(teamAbbr, userTeamId, dataAvailability)
            )
          ),
          playerIntelligence: userTeamId
            ? IntelligenceService.pipe(
                Effect.flatMap((svc) =>
                  svc.getPlayerIntelligence(
                    userTeamId,
                    teamAbbr,
                    dataAvailability
                  )
                )
              )
            : Effect.succeed(null),
          faceitLink:
            faceitEnabled && profile.team.fullName
              ? ScoutingFaceitLinkService.pipe(
                  Effect.flatMap((svc) =>
                    svc.getFaceitTeamLink(profile.team.fullName)
                  )
                )
              : Effect.succeed<FaceitTeamLink | null>(null),
        },
        { concurrency: "unbounded" }
      )
    ).then(
      (r) =>
        [
          r.mapIntelligence,
          r.banIntelligence,
          r.playerIntelligence,
          r.faceitLink,
        ] as const
    );

  const insightReport = generateInsights({
    mapIntelligence,
    banIntelligence,
    playerIntelligence,
    strengthRating,
    opponentAbbr: teamAbbr,
    hasUserTeamLink,
    dataAvailability,
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/scouting"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("backToSearch")}
        </Link>
        <ScoutForTeamPicker userTeams={userTeams} currentTeamId={userTeamId} />
      </div>

      <ScoutingTeamHeader
        name={profile.team.fullName || profile.team.abbreviation}
        abbreviation={profile.team.abbreviation}
        overview={overview}
        strength={strengthRating}
        strengthPercentile={strengthPercentile}
      />

      <ScoutingReport
        report={insightReport}
        hasUserTeamLink={hasUserTeamLink}
      />

      {faceitLink ? <ScoutingFaceitLink link={faceitLink} /> : null}

      <ScoutingTeamOverview
        overview={overview}
        matchHistory={profile.matchHistory}
      />

      <ScoutingMapPerformance
        mapAnalysis={profile.mapAnalysis}
        mapIntelligence={mapIntelligence}
        hasUserTeamLink={hasUserTeamLink}
      />

      <ScoutingHeroBans
        heroBans={profile.heroBans}
        banIntelligence={banIntelligence}
        hasUserTeamLink={hasUserTeamLink}
      />

      <ScoutingPlayerMatchups
        playerIntelligence={playerIntelligence}
        hasUserTeamLink={hasUserTeamLink}
        opponentName={profile.team.fullName || profile.team.abbreviation}
      />
    </>
  );
}

// Mirrors the loaded sections (back-link row, header stat ribbon, report,
// overview, map performance, hero bans, matchups) so the streamed content
// replaces this in place. The back link is static, so it renders for real.
function ScoutingTeamSkeleton() {
  const t = getStaticTranslations("scoutingPage.team");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/scouting"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("backToSearch")}
        </Link>
        <Skeleton className="h-8 w-40 rounded-md" />
      </div>

      <header className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-5 w-14" />
          </div>
        </div>
        <dl className="border-border grid grid-cols-2 divide-x divide-y border-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-y-0">
          {["a", "b", "c", "d"].map((k) => (
            <div key={k} className="flex flex-col gap-2 px-4 py-4">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </dl>
      </header>

      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="border-border divide-border divide-y border-y">
          {["a", "b", "c", "d"].map((k) => (
            <div key={k} className="flex gap-3 py-4">
              <Skeleton className="mt-1.5 size-1.5 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2.5 w-28" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-2.5 w-24" />
          <div className="flex flex-wrap gap-1.5">
            {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
              <Skeleton key={k} className="size-7 rounded-sm" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-2.5 w-28" />
          <div className="border-border overflow-x-auto rounded-md border">
            <Skeleton className="h-9 w-full rounded-none" />
            {["a", "b", "c", "d", "e", "f"].map((k) => (
              <div
                key={k}
                className="border-border flex gap-4 border-t px-4 py-3"
              >
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="ml-auto h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-44" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-2.5 w-32" />
          <div className="border-border overflow-x-auto rounded-md border">
            <Skeleton className="h-9 w-full rounded-none" />
            {["a", "b", "c", "d", "e", "f"].map((k) => (
              <div
                key={k}
                className="border-border flex gap-4 border-t px-4 py-3"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-2.5 w-20" />
          <div className="border-border overflow-x-auto rounded-md border">
            <Skeleton className="h-9 w-full rounded-none" />
            {["a", "b", "c", "d", "e", "f"].map((k) => (
              <div
                key={k}
                className="border-border flex gap-4 border-t px-4 py-3"
              >
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="ml-auto h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-2.5 w-24" />
          <div className="border-border overflow-x-auto rounded-md border">
            <Skeleton className="h-9 w-full rounded-none" />
            {["a", "b", "c", "d"].map((k) => (
              <div
                key={k}
                className="border-border flex gap-4 border-t px-4 py-3"
              >
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="ml-auto h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-36" />
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Skeleton className="h-2.5 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="border-border overflow-x-auto rounded-md border">
            <Skeleton className="h-9 w-full rounded-none" />
            {["a", "b", "c", "d", "e", "f"].map((k) => (
              <div
                key={k}
                className="border-border flex gap-4 border-t px-4 py-3"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {["a", "b"].map((k) => (
            <div key={k} className="space-y-3">
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
              <div className="border-border divide-border divide-y overflow-hidden rounded-md border">
                {["a", "b", "c", "d", "e", "f"].map((j) => (
                  <div key={j} className="flex items-center gap-3 px-4 py-2.5">
                    <Skeleton className="h-4 w-28 shrink-0" />
                    <Skeleton className="h-2.5 flex-1" />
                    <Skeleton className="h-4 w-8 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="border-border space-y-3 rounded-md border px-4 py-3">
          <Skeleton className="h-2.5 w-24" />
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2.5 w-20" />
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="border-border divide-border divide-y overflow-hidden rounded-md border">
            {["a", "b"].map((k) => (
              <div key={k} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-full" />
              </div>
            ))}
          </div>
        </div>
        {["a", "b", "c"].map((k) => (
          <div key={k} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Skeleton className="h-2.5 w-28" />
              <Skeleton className="h-3 w-44" />
            </div>
            <div className="border-border divide-border divide-y overflow-hidden rounded-md border">
              {["a", "b"].map((j) => (
                <div key={j} className="space-y-2.5 px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                  <div className="space-y-2">
                    {["a", "b", "c"].map((m) => (
                      <div key={m} className="flex items-center gap-3">
                        <Skeleton className="h-4 w-28 shrink-0" />
                        <Skeleton className="h-3 flex-1" />
                        <Skeleton className="h-4 w-10 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
