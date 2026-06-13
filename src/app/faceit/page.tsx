import { FaceitTeamSearch } from "@/components/faceit/team-search";
import { AppRuntime } from "@/data/runtime";
import { FaceitTeamScoutingService } from "@/data/faceit";
import { Effect } from "effect";
import { faceitScouting } from "@/lib/flags";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("faceitScoutingPage");
  return { title: t("metadata.searchTitle"), description: t("subtitle") };
}

export default async function FaceitPage() {
  const enabled = await faceitScouting();
  if (!enabled) notFound();

  const t = await getTranslations("faceitScoutingPage");
  const teams = await AppRuntime.runPromise(
    FaceitTeamScoutingService.pipe(Effect.flatMap((svc) => svc.getFaceitTeams()))
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
        <FaceitTeamSearch teams={teams} />
      </div>
    </div>
  );
}
