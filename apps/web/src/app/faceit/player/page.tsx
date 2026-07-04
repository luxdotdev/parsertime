import { FaceitPlayerSearch } from "@/components/faceit/player-search";
import { Skeleton } from "@/components/ui/skeleton";
import { AppRuntime } from "@/data/runtime";
import { FaceitPlayerScoutingService } from "@/data/faceit";
import { Effect } from "effect";
import { faceitScouting } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import {
  getMetadataTranslations,
  getStaticTranslations,
} from "@/lib/metadata-i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("faceitPlayerPage");
  return { title: t("metadata.searchTitle"), description: t("subtitle") };
}

// Static shell: the frame and heading prerender (default-locale text via the
// cookie-free translator); the flag gate and player list stream into ONE
// boundary whose fallback mirrors the search input.
export default function FaceitPlayerSearchPage() {
  const t = getStaticTranslations("faceitPlayerPage");
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
        <Suspense fallback={<Skeleton className="h-14 w-full rounded-xl" />}>
          <FaceitPlayerSearchContent />
        </Suspense>
      </div>
    </div>
  );
}

async function FaceitPlayerSearchContent() {
  const enabled = await getFlag(faceitScouting);
  if (!enabled) notFound();
  const players = await AppRuntime.runPromise(
    FaceitPlayerScoutingService.pipe(
      Effect.flatMap((svc) => svc.getFaceitPlayers())
    )
  );
  return <FaceitPlayerSearch players={players} />;
}
