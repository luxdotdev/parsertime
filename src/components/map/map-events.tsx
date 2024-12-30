import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMapEvents, getUltimatesUsedList } from "@/lib/get-map-events";
import { getTranslations } from "next-intl/server";

export async function MapEvents({ id }: { id: number }) {
  const [events, ultimates] = await Promise.all([
    getMapEvents(id),
    getUltimatesUsedList(id),
  ]);

  const t = await getTranslations("mapPage.events");

  return (
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
  );
}
