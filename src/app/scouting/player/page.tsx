import { PlayerSearch } from "@/components/scouting/player-search";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { ScoutingService } from "@/data/player";
import { scoutingTool } from "@/lib/flags";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function ScoutPlayerPage() {
  const scoutingEnabled = await scoutingTool();
  if (!scoutingEnabled) notFound();

  const t = await getTranslations("scoutingPage.player");
  const players = await AppRuntime.runPromise(
    ScoutingService.pipe(Effect.flatMap((svc) => svc.getScoutingPlayers()))
  );

  return (
    <div className="flex flex-1 flex-col items-center px-4 pt-16 pb-8 sm:px-8 md:pt-24">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
        </div>
        <PlayerSearch players={players} />
      </div>
    </div>
  );
}
