import { PlayerSearch } from "@/components/scouting/player-search";
import { Skeleton } from "@/components/ui/skeleton";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { ScoutingService } from "@/data/player";
import { scoutingTool } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import {
  getMetadataTranslations,
  getStaticTranslations,
} from "@/lib/metadata-i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("scoutingPage.player.metadata");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("ogTitle"), description: t("ogDescription") },
  };
}

export default function ScoutPlayerPage() {
  const t = getStaticTranslations("scoutingPage.player");

  return (
    <div className="flex flex-1 flex-col items-center px-4 pt-16 pb-8 sm:px-8 md:pt-24">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.18em] uppercase">
            {t("searchEyebrow")}
          </p>
          <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-lg text-balance">
            {t("subtitle")}
          </p>
        </div>
        <Suspense fallback={<PlayerSearchSkeleton />}>
          <ScoutPlayerContent />
        </Suspense>
      </div>
    </div>
  );
}

async function ScoutPlayerContent() {
  const scoutingEnabled = await getFlag(scoutingTool);
  if (!scoutingEnabled) notFound();

  const players = await AppRuntime.runPromise(
    ScoutingService.pipe(Effect.flatMap((svc) => svc.getScoutingPlayers()))
  );

  return <PlayerSearch players={players} />;
}

// Mirrors PlayerSearch's resting layout (search input + centered helper line)
// so the streamed content replaces this in place with no jump.
function PlayerSearchSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="mt-3 flex justify-center">
        <Skeleton className="h-5 w-48" />
      </div>
    </div>
  );
}
