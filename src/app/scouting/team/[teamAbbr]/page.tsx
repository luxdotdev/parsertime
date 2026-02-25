import { HeroBanChart } from "@/components/scouting/hero-ban-chart";
import { MapPerformanceChart } from "@/components/scouting/map-performance-chart";
import { MatchHistoryTable } from "@/components/scouting/match-history-table";
import { MethodologyCard } from "@/components/scouting/methodology-card";
import { ScoutingRecommendations } from "@/components/scouting/scouting-recommendations";
import { TeamOverviewCards } from "@/components/scouting/team-overview-cards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getScoutingTeamProfile } from "@/data/scouting-dto";
import { scoutingTool } from "@/lib/flags";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ScoutingTeamPage(
  props: PageProps<"/scouting/team/[teamAbbr]">
) {
  const scoutingEnabled = await scoutingTool();
  if (!scoutingEnabled) notFound();

  const params = await props.params;
  const teamAbbr = decodeURIComponent(params.teamAbbr);
  const t = await getTranslations("scoutingPage.team");

  const profile = await getScoutingTeamProfile(teamAbbr);
  if (!profile) notFound();

  const { overview } = profile;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="space-y-4">
        <Link
          href="/scouting"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("backToSearch")}
        </Link>

        <header className="space-y-1">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {profile.team.abbreviation}
            </h1>
            <span className="text-muted-foreground text-lg">
              {profile.team.fullName}
            </span>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular-nums">
            <span>
              {overview.wins}W &ndash; {overview.losses}L
            </span>
            <span className="font-medium">
              {overview.winRate.toFixed(1)}% {t("overview.winRate")}
            </span>
            <span>
              {overview.weightedWinRate.toFixed(1)}%{" "}
              {t("overview.weightedWinRate")}
            </span>
            <FormStreak form={overview.recentForm} />
          </div>
        </header>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="heroBans">{t("tabs.heroBans")}</TabsTrigger>
          <TabsTrigger value="maps">{t("tabs.maps")}</TabsTrigger>
          <TabsTrigger value="recommendations">
            {t("tabs.recommendations")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <TeamOverviewCards overview={overview} />
          <MatchHistoryTable matches={profile.matchHistory} />
          <MethodologyCard translationKey="scoutingPage.team.overview.methodology" />
        </TabsContent>

        <TabsContent value="heroBans" className="space-y-4">
          <HeroBanChart heroBans={profile.heroBans} />
          <MethodologyCard translationKey="scoutingPage.team.heroBans.methodology" />
        </TabsContent>

        <TabsContent value="maps" className="space-y-4">
          <MapPerformanceChart mapAnalysis={profile.mapAnalysis} />
          <MethodologyCard translationKey="scoutingPage.team.maps.methodology" />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <ScoutingRecommendations recommendations={profile.recommendations} />
          <MethodologyCard translationKey="scoutingPage.team.recommendations.methodology" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FormStreak({ form }: { form: ("win" | "loss")[] }) {
  if (form.length === 0) return null;

  let streak = 1;
  const currentResult = form[0];
  for (let i = 1; i < form.length; i++) {
    if (form[i] === currentResult) streak++;
    else break;
  }

  const label = currentResult === "win" ? "W" : "L";

  return (
    <span
      className={
        currentResult === "win"
          ? "font-semibold text-emerald-600 dark:text-emerald-400"
          : "font-semibold text-red-600 dark:text-red-400"
      }
    >
      {label}
      {streak}
    </span>
  );
}
