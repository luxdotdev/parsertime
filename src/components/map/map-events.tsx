import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="space-y-4">
      {tempoChartEnabled && (
        <TempoChartServer
          id={id}
          team1Color={team1Color}
          team2Color={team2Color}
        />
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t("mapEvents.title")}</CardTitle>
            <CardDescription>{t("mapEvents.description")}</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[150vh] overflow-y-auto pl-4">
            {events}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t("ultsUsed.title")}</CardTitle>
            <CardDescription>{t("ultsUsed.description")}</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[150vh] overflow-y-auto pl-4">
            {ultimates}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
