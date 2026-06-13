import { AppRuntime } from "@/data/runtime";
import { FaceitTeamScoutingService } from "@/data/faceit";
import { Effect } from "effect";
import { faceitScouting } from "@/lib/flags";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaceitTeamOverview } from "@/components/faceit/faceit-team-overview";
import { FaceitMapPerformance } from "@/components/faceit/faceit-map-performance";
import { FaceitHeroBanEnvironment } from "@/components/faceit/faceit-hero-ban-environment";
import { FaceitRoster } from "@/components/faceit/faceit-roster";
import { FaceitRecommendations } from "@/components/faceit/faceit-recommendations";
import { RelatedTeams } from "@/components/faceit/related-teams";

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
  const t = await getTranslations("faceitScoutingPage");

  const profile = await AppRuntime.runPromise(
    FaceitTeamScoutingService.pipe(
      Effect.flatMap((svc) => svc.getFaceitTeamProfile(teamId, { combined }))
    )
  );
  if (!profile) notFound();

  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-8 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{profile.team.name}</h1>
          <p className="text-muted-foreground">
            {profile.overview.wins}-{profile.overview.losses} · {profile.overview.winRate.toFixed(0)}% ·{" "}
            {t("strengthFsr")} {profile.strength.fsr ?? "—"} · {t("strengthTsr")} {profile.strength.tsr ?? "—"}
          </p>
        </header>
        <RelatedTeams related={profile.relatedTeams} teamId={teamId} combined={combined} />
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
            <TabsTrigger value="maps">{t("tabs.maps")}</TabsTrigger>
            <TabsTrigger value="bans">{t("tabs.bans")}</TabsTrigger>
            <TabsTrigger value="roster">{t("tabs.roster")}</TabsTrigger>
            <TabsTrigger value="recs">{t("tabs.recommendations")}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><FaceitTeamOverview overview={profile.overview} strength={profile.strength} /></TabsContent>
          <TabsContent value="maps"><FaceitMapPerformance analysis={profile.mapAnalysis} /></TabsContent>
          <TabsContent value="bans"><FaceitHeroBanEnvironment entries={profile.heroBanEnvironment} /></TabsContent>
          <TabsContent value="roster"><FaceitRoster roster={profile.roster} /></TabsContent>
          <TabsContent value="recs"><FaceitRecommendations recommendations={profile.recommendations} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
