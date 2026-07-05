import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { TempoService } from "@/data/map";
import type { Locale } from "@/i18n/config";
import { getLocaleTranslations } from "@/lib/metadata-i18n";
import { TempoChart } from "./tempo-chart";

type TempoChartServerProps = {
  id: number;
  locale: Locale;
  team1Color: string;
  team2Color: string;
};

export async function TempoChartServer({
  id,
  locale,
  team1Color,
  team2Color,
}: TempoChartServerProps) {
  const [data, t] = await Promise.all([
    AppRuntime.runPromise(
      TempoService.pipe(Effect.flatMap((svc) => svc.getTempoChartData(id)))
    ),
    getLocaleTranslations(locale, "mapPage.events.tempo"),
  ]);

  if (!data) {
    return (
      <div className="border-border/50 text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        {t("noData")}
      </div>
    );
  }

  return (
    <TempoChart
      combinedSeries={data.combinedSeries}
      killsSeries={data.killsSeries}
      ultsSeries={data.ultsSeries}
      ultPins={data.ultPins}
      killPins={data.killPins}
      fightBoundaries={data.fightBoundaries}
      matchStartTime={data.matchStartTime}
      matchEndTime={data.matchEndTime}
      team1Name={data.team1Name}
      team2Name={data.team2Name}
      team1Color={team1Color}
      team2Color={team2Color}
    />
  );
}
