import { AppRuntime } from "@/data/runtime";
import { FaceitTeamScoutingService } from "@/data/faceit";
import { Effect } from "effect";
import { faceitScouting } from "@/lib/flags";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { FaceitTeamHeader } from "@/components/faceit/faceit-team-header";
import { FaceitGamePlan } from "@/components/faceit/faceit-game-plan";
import { FaceitTeamOverview } from "@/components/faceit/faceit-team-overview";
import { FaceitMapPerformance } from "@/components/faceit/faceit-map-performance";
import { FaceitHeroBanEnvironment } from "@/components/faceit/faceit-hero-ban-environment";
import { FaceitRoster } from "@/components/faceit/faceit-roster";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string }>;
}): Promise<Metadata> {
  const { teamId } = await params;
  const t = await getTranslations("faceitScoutingPage.metadata");
  const team = await prisma.faceitTeam.findUnique({
    where: { faceitTeamId: teamId },
    select: { name: true },
  });
  const name = team?.name ?? "FACEIT team";
  return {
    title: t("profileTitle", { team: name }),
    description: t("profileDescription", { team: name }),
  };
}

export default async function FaceitTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ combined?: string }>;
}) {
  const enabled = await faceitScouting();
  if (!enabled) notFound();

  const { teamId } = await params;
  const { combined: combinedParam } = await searchParams;
  const combined = combinedParam === "1";

  const profile = await AppRuntime.runPromise(
    FaceitTeamScoutingService.pipe(
      Effect.flatMap((svc) => svc.getFaceitTeamProfile(teamId, { combined }))
    )
  );
  if (!profile) notFound();

  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-16 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-12">
        <FaceitTeamHeader
          name={profile.team.name}
          overview={profile.overview}
          strength={profile.strength}
          related={profile.relatedTeams}
          teamId={teamId}
          combined={combined}
        />
        <FaceitGamePlan recommendations={profile.recommendations} />
        <FaceitTeamOverview
          overview={profile.overview}
          attackDefense={profile.mapAnalysis.attackDefense}
        />
        <FaceitMapPerformance analysis={profile.mapAnalysis} />
        <FaceitHeroBanEnvironment entries={profile.heroBanEnvironment} />
        <FaceitRoster roster={profile.roster} />
      </div>
    </div>
  );
}
