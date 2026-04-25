import { EventsTimeline } from "@/components/map/events/events-timeline";
import { getMapEventsData } from "@/lib/get-map-events";
import { getTranslations } from "next-intl/server";

export async function MapEvents({
  id,
  team1Color,
  team2Color,
}: {
  id: number;
  team1Color: string;
  team2Color: string;
}) {
  const data = await getMapEventsData(id);
  const t = await getTranslations("mapPage.events");

  if (!data) {
    return (
      <section aria-label={t("mapEvents.title")} className="space-y-5">
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  return (
    <EventsTimeline
      data={data}
      team1Color={team1Color}
      team2Color={team2Color}
    />
  );
}
