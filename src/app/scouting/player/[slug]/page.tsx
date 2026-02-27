import { PlayerHeroPool } from "@/components/scouting/player-hero-pool";
import { PlayerProfileHeader } from "@/components/scouting/player-profile-header";
import { PlayerTournamentHistory } from "@/components/scouting/player-tournament-history";
import { getPlayerProfile } from "@/data/player-scouting-dto";
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

  const profile = await getPlayerProfile(slug);
  if (!profile) notFound();

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

      <PlayerTournamentHistory tournamentRecords={profile.tournamentRecords} />
    </div>
  );
}
