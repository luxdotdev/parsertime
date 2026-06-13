import { FaceitTeamSearch } from "@/components/faceit/team-search";
import { AppRuntime } from "@/data/runtime";
import { FaceitTeamScoutingService } from "@/data/faceit";
import { Effect } from "effect";
import { faceitScouting } from "@/lib/flags";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

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
          <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
        </div>
        <FaceitTeamSearch teams={teams} />
      </div>
    </div>
  );
}
