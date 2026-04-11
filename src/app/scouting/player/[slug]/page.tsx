import { PlayerHeroPool } from "@/components/scouting/player-hero-pool";
import { PlayerHeroZScores } from "@/components/scouting/player-hero-zscores";
import { PlayerKillAnalysis } from "@/components/scouting/player-kill-analysis";
import { PlayerMapWinrates } from "@/components/scouting/player-map-winrates";
import { PlayerPerformanceRadar } from "@/components/scouting/player-performance-radar";
import { PlayerProfileHeader } from "@/components/scouting/player-profile-header";
import { PlayerScrimOverview } from "@/components/scouting/player-scrim-overview";
import { PlayerStrengthsWeaknesses } from "@/components/scouting/player-strengths-weaknesses";
import { PlayerTournamentHistory } from "@/components/scouting/player-tournament-history";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { ScoutingService, ScoutingAnalyticsService } from "@/data/player";
import { scoutingTool } from "@/lib/flags";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ScoutingPlayerPage(
  props: PageProps<"/scouting/player/[slug]">
) {
  const scoutingEnabled = await scoutingTool();
  if (!scoutingEnabled) notFound();

  const params = await props.params;
  const slug = decodeURIComponent(params.slug);
  const t = await getTranslations("scoutingPage.player.profile");

  const profile = await AppRuntime.runPromise(
    ScoutingService.pipe(Effect.flatMap((svc) => svc.getPlayerProfile(slug)))
  );
  if (!profile) notFound();

  const analytics = await AppRuntime.runPromise(
    ScoutingAnalyticsService.pipe(
      Effect.flatMap((svc) => svc.getPlayerScoutingAnalytics(profile.name))
    )
  );

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="space-y-4">
        <Link
          href="/scouting/player"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("backToSearch")}
        </Link>

        <PlayerProfileHeader profile={profile} />
      </div>

      <PlayerHeroPool
        signatureHeroes={profile.signatureHeroes}
        heroFrequencies={profile.heroFrequencies}
      />

      <PlayerScrimOverview scrimData={analytics.scrimData} />

      {analytics.scrimData && (
        <>
          <PlayerPerformanceRadar heroes={analytics.scrimData.heroes} />
          <PlayerHeroZScores heroes={analytics.scrimData.heroes} />
        </>
      )}

      <PlayerMapWinrates
        competitiveMapWinrates={analytics.competitiveMapWinrates}
      />

      {analytics.scrimData && (
        <PlayerKillAnalysis
          killPatterns={analytics.scrimData.killPatterns}
          roleDistribution={analytics.scrimData.roleDistribution}
        />
      )}

      <PlayerStrengthsWeaknesses
        strengths={analytics.strengths}
        weaknesses={analytics.weaknesses}
      />

      <PlayerTournamentHistory tournamentRecords={profile.tournamentRecords} />
    </div>
  );
}
