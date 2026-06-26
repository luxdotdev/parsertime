import { FaceitPlayerSearch } from "@/components/faceit/player-search";
import { AppRuntime } from "@/data/runtime";
import { FaceitPlayerScoutingService } from "@/data/faceit";
import { Effect } from "effect";
import { faceitScouting } from "@/lib/flags";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = getMetadataTranslations("faceitPlayerPage");
  return { title: t("metadata.searchTitle"), description: t("subtitle") };
}

export default async function FaceitPlayerSearchPage() {
  const enabled = await faceitScouting();
  if (!enabled) notFound();
  const t = await getTranslations("faceitPlayerPage");
  const players = await AppRuntime.runPromise(
    FaceitPlayerScoutingService.pipe(
      Effect.flatMap((svc) => svc.getFaceitPlayers())
    )
  );
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
        <FaceitPlayerSearch players={players} />
      </div>
    </div>
  );
}
