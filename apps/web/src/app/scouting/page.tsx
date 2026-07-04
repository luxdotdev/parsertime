import { TeamSearch } from "@/components/scouting/team-search";
import { Skeleton } from "@/components/ui/skeleton";
import { AppRuntime } from "@/data/runtime";
import { ScoutingService } from "@/data/scouting";
import { Effect } from "effect";
import { scoutingTool } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("scoutingPage.metadata");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("ogTitle"), description: t("ogDescription") },
  };
}

// Static shell: the page frame prerenders and the flag-gated content streams
// into ONE boundary whose fallback mirrors the heading + search layout, so
// navigation shows a single stable skeleton the real content replaces in
// place. The heading stays in the content child because the whole page is
// behind the scouting flag (notFound) and the title is locale-dependent.
export default function ScoutingPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-4 pt-16 pb-8 sm:px-8 md:pt-24">
      <div className="w-full max-w-2xl space-y-8">
        <Suspense fallback={<ScoutingSkeleton />}>
          <ScoutingContent />
        </Suspense>
      </div>
    </div>
  );
}

async function ScoutingContent() {
  const scoutingEnabled = await getFlag(scoutingTool);
  if (!scoutingEnabled) notFound();

  const t = await getTranslations("scoutingPage");
  const teams = await AppRuntime.runPromise(
    ScoutingService.pipe(Effect.flatMap((svc) => svc.getScoutingTeams()))
  );

  return (
    <>
      <div className="space-y-2 text-center">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.18em] uppercase">
          {t("searchEyebrow")}
        </p>
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-lg text-balance">
          {t("subtitle")}
        </p>
      </div>
      <TeamSearch teams={teams} />
    </>
  );
}

// Mirrors the loaded layout: eyebrow/title/subtitle heading block (space-y-2,
// centered) followed by the h-14 search input.
function ScoutingSkeleton() {
  return (
    <>
      <div className="flex flex-col items-center space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-7 w-80 max-w-full" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
    </>
  );
}
