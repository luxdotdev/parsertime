import { ScoutingPlayerHeader } from "@/components/scouting/scouting-player-header";
import { ScoutingPlayerMapWinrates } from "@/components/scouting/scouting-player-map-winrates";
import { ScoutingPlayerRead } from "@/components/scouting/scouting-player-read";
import { ScoutingPlayerScrimProfile } from "@/components/scouting/scouting-player-scrim-profile";
import { ScoutingPlayerTournaments } from "@/components/scouting/scouting-player-tournaments";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { ScoutingService, ScoutingAnalyticsService } from "@/data/player";
import { scoutingTool } from "@/lib/flags";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const t = await getTranslations("scoutingPage.player.metadata");
  const profile = await AppRuntime.runPromise(
    ScoutingService.pipe(
      Effect.flatMap((svc) => svc.getPlayerProfile(decodeURIComponent(slug)))
    )
  );
  const player = profile?.name ?? decodeURIComponent(slug);
  return {
    title: t("profileTitle", { player }),
    description: t("profileDescription", { player }),
    openGraph: {
      title: t("profileTitle", { player }),
      description: t("profileDescription", { player }),
    },
  };
}

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
      Effect.flatMap((svc) => svc.getPublicPlayerScoutingAnalytics(profile.name))
    )
  );

  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-16 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-12">
        <div>
          <Link
            href="/scouting/player"
            className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("backToSearch")}
          </Link>
          <ScoutingPlayerHeader profile={profile} />
        </div>

        <ScoutingPlayerRead
          strengths={analytics.strengths}
          weaknesses={analytics.weaknesses}
          signatureHeroes={profile.signatureHeroes}
          heroFrequencies={profile.heroFrequencies}
        />

        {analytics.scrimData ? (
          <ScoutingPlayerScrimProfile scrimData={analytics.scrimData} />
        ) : null}

        <ScoutingPlayerMapWinrates
          competitiveMapWinrates={analytics.competitiveMapWinrates}
        />

        <ScoutingPlayerTournaments
          tournamentRecords={profile.tournamentRecords}
        />
      </div>
    </div>
  );
}
