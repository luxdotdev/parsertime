import { FaceitTeamSearch } from "@/components/faceit/team-search";
import { Skeleton } from "@/components/ui/skeleton";
import { AppRuntime } from "@/data/runtime";
import { FaceitTeamScoutingService } from "@/data/faceit";
import { Effect } from "effect";
import { faceitScouting } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("faceitScoutingPage");
  return { title: t("metadata.searchTitle"), description: t("subtitle") };
}

// Static shell: only the frame prerenders. The heading stays inside the
// flag-gated content — the faceitScouting flag notFound()s the whole page,
// so the shell must not leak the feature's title.
export default function FaceitPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-4 pt-16 pb-8 sm:px-8 md:pt-24">
      <div className="w-full max-w-2xl space-y-8">
        <Suspense fallback={<FaceitSearchSkeleton />}>
          <FaceitContent />
        </Suspense>
      </div>
    </div>
  );
}

async function FaceitContent() {
  const enabled = await getFlag(faceitScouting);
  if (!enabled) notFound();

  const t = await getTranslations("faceitScoutingPage");
  const teams = await AppRuntime.runPromise(
    FaceitTeamScoutingService.pipe(
      Effect.flatMap((svc) => svc.getFaceitTeams())
    )
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
      <FaceitTeamSearch teams={teams} />
    </>
  );
}

// Mirrors the loaded state: centered eyebrow/title/subtitle stack, then the
// h-14 rounded-xl search input.
function FaceitSearchSkeleton() {
  return (
    <>
      <div className="flex flex-col items-center space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-80" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
    </>
  );
}
