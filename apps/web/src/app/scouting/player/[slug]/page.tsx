import { ScoutingPlayerHeader } from "@/components/scouting/scouting-player-header";
import { ScoutingPlayerMapWinrates } from "@/components/scouting/scouting-player-map-winrates";
import { ScoutingPlayerRead } from "@/components/scouting/scouting-player-read";
import { ScoutingPlayerScrimProfile } from "@/components/scouting/scouting-player-scrim-profile";
import { ScoutingPlayerTournaments } from "@/components/scouting/scouting-player-tournaments";
import { Skeleton } from "@/components/ui/skeleton";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { ScoutingService, ScoutingAnalyticsService } from "@/data/player";
import { scoutingTool } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import { getStaticTranslations } from "@/lib/metadata-i18n";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

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

// Static shell: the page frame prerenders and the profile streams into ONE
// boundary whose fallback mirrors the loaded sections' flat layout.
export default function ScoutingPlayerPage(
  props: PageProps<"/scouting/player/[slug]">
) {
  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-16 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-12">
        <Suspense fallback={<ScoutingPlayerSkeleton />}>
          <ScoutingPlayerContent params={props.params} />
        </Suspense>
      </div>
    </div>
  );
}

async function ScoutingPlayerContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const scoutingEnabled = await getFlag(scoutingTool);
  if (!scoutingEnabled) notFound();

  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const t = await getTranslations("scoutingPage.player.profile");

  const profile = await AppRuntime.runPromise(
    ScoutingService.pipe(Effect.flatMap((svc) => svc.getPlayerProfile(slug)))
  );
  if (!profile) notFound();

  const analytics = await AppRuntime.runPromise(
    ScoutingAnalyticsService.pipe(
      Effect.flatMap((svc) =>
        svc.getPublicPlayerScoutingAnalytics(profile.name)
      )
    )
  );

  return (
    <>
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
    </>
  );
}

function SectionHeaderSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-2 h-7 w-44" />
    </div>
  );
}

// Mirrors the loaded sections' pending layout: back link + SectionHeader +
// StatRibbon header, the scouting read (insight lists + hero pool), map
// winrates, and tournament history — same paddings and flat design language.
function ScoutingPlayerSkeleton() {
  const t = getStaticTranslations("scoutingPage.player.profile");

  return (
    <>
      <div>
        <Link
          href="/scouting/player"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("backToSearch")}
        </Link>
        <header className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-48" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-5 w-36 rounded-sm" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="border-border grid grid-cols-2 border-y sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex flex-col gap-1 px-4 py-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </header>
      </div>

      <section className="space-y-8">
        <SectionHeaderSkeleton />
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {Array.from({ length: 2 }, (_, col) => (
            <div key={col} className="space-y-3">
              <Skeleton className="h-3 w-20" />
              <div className="border-border divide-border divide-y border-y">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex gap-3 py-3">
                    <Skeleton className="mt-1.5 size-1.5 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          <div className="space-y-3">
            <Skeleton className="h-3 w-32" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-6 w-20 rounded-sm" />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-3 w-40" />
            <div className="space-y-2.5">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeaderSkeleton />
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-40 w-full rounded-md" />
          </div>
        ))}
      </section>

      <section className="space-y-5">
        <SectionHeaderSkeleton />
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </section>
    </>
  );
}
