import { ScoutForTeamPicker } from "@/components/scouting/scout-for-team-picker";
import { ScoutingFaceitLink } from "@/components/scouting/scouting-faceit-link";
import { ScoutingHeroBans } from "@/components/scouting/scouting-hero-bans";
import { ScoutingMapPerformance } from "@/components/scouting/scouting-map-performance";
import { ScoutingPlayerMatchups } from "@/components/scouting/scouting-player-matchups";
import { ScoutingReport } from "@/components/scouting/scouting-report";
import { ScoutingTeamHeader } from "@/components/scouting/scouting-team-header";
import { ScoutingTeamOverview } from "@/components/scouting/scouting-team-overview";
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
import { generateInsights } from "@/lib/insights";
import prisma from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

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

export default async function ScoutingTeamPage(
  props: PageProps<"/scouting/team/[teamAbbr]"> & {
    searchParams: Promise<{ scoutFor?: string }>;
  }
) {
  const scoutingEnabled = await scoutingTool();
  if (!scoutingEnabled) notFound();

  const [params, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
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
    faceitScouting(),
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
    <div className="flex flex-1 flex-col px-4 pt-8 pb-16 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-12">
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

        <ScoutingReport report={insightReport} hasUserTeamLink={hasUserTeamLink} />

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
      </div>
    </div>
  );
}
