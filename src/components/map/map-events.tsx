import { Separator } from "@/components/ui/separator";
import { TempoChartServer } from "@/components/map/tempo/tempo-chart-server";
import { getMapEvents, getUltimatesUsedList } from "@/lib/get-map-events";
import { getTranslations } from "next-intl/server";

export async function MapEvents({
  id,
  team1Color,
  team2Color,
  tempoChartEnabled,
}: {
  id: number;
  team1Color: string;
  team2Color: string;
  tempoChartEnabled: boolean;
}) {
  const [events, ultimates] = await Promise.all([
    getMapEvents(id, team1Color, team2Color),
    getUltimatesUsedList(id, team1Color, team2Color),
  ]);

  const t = await getTranslations("mapPage.events");

  return (
    <section aria-label={t("mapEvents.title")} className="space-y-5">
      {tempoChartEnabled && (
        <>
          <TempoChartServer
            id={id}
            team1Color={team1Color}
            team2Color={team2Color}
          />
          <Separator />
        </>
      )}
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <div className="space-y-3">
          <header className="space-y-1">
            <span className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
              {t("mapEvents.title")}
            </span>
            <p className="text-muted-foreground text-sm">
              {t("mapEvents.description")}
            </p>
          </header>
          <div className="max-h-[150vh] overflow-y-auto pl-1">{events}</div>
        </div>
        <div className="space-y-3">
          <header className="space-y-1">
            <span className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
              {t("ultsUsed.title")}
            </span>
            <p className="text-muted-foreground text-sm">
              {t("ultsUsed.description")}
            </p>
          </header>
          <div className="max-h-[150vh] overflow-y-auto pl-1">{ultimates}</div>
        </div>
      </div>
    </section>
  );
}
