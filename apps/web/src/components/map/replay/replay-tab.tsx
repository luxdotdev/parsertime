import { ReplayService } from "@/data/map";
import { AppRuntime } from "@/data/runtime";
import type { Locale } from "@/i18n/config";
import { mapTag } from "@/lib/cache-tags";
import { getLocaleTranslations } from "@/lib/metadata-i18n";
import prisma from "@/lib/prisma";
import { Effect } from "effect";
import { cacheLife, cacheTag } from "next/cache";
import { ReplayViewer } from "./replay-viewer";

export async function ReplayTab({
  id,
  mapId,
  locale,
}: {
  /** The MapData id used to load replay data. */
  id: number;
  /** The Map id, used only for cache tagging/invalidation. */
  mapId: number;
  locale: Locale;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag(mapTag(mapId));

  const [data, t] = await Promise.all([
    AppRuntime.runPromise(
      ReplayService.pipe(Effect.flatMap((svc) => svc.getReplayData(id)))
    ),
    getLocaleTranslations(locale, "mapPage.replay"),
  ]);

  if (data.type === "no_calibration") {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t("noCalibration")}</p>
      </div>
    );
  }

  if (data.type === "no_coordinates") {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t("noCoordinates")}</p>
      </div>
    );
  }

  // Resolve the current map's identity so we can find sibling instances of the
  // same map for ghost overlays.
  const current = await prisma.mapData.findUnique({
    where: { id },
    select: {
      Map: {
        select: {
          id: true,
          name: true,
          Scrim: { select: { teamId: true } },
        },
      },
    },
  });

  let ghostCandidates: {
    mapDataId: number;
    scrimName: string;
    scrimDate: string;
  }[] = [];

  const currentMap = current?.Map;
  const scrimTeamId = currentMap?.Scrim?.teamId;

  if (currentMap && scrimTeamId != null) {
    const candidates = await prisma.map.findMany({
      where: {
        name: currentMap.name,
        Scrim: { teamId: scrimTeamId },
        NOT: { id: currentMap.id },
        mapData: { some: {} },
      },
      select: {
        id: true,
        mapData: { select: { id: true }, take: 1 },
        Scrim: { select: { id: true, name: true, date: true } },
      },
      orderBy: { id: "desc" },
      take: 25,
    });

    ghostCandidates = candidates
      .filter((m) => m.mapData.length > 0 && m.Scrim)
      .map((m) => ({
        mapDataId: m.mapData[0].id,
        scrimName: m.Scrim!.name,
        scrimDate: m.Scrim!.date.toISOString(),
      }));
  }

  return (
    <ReplayViewer
      positionSamples={data.positionSamples}
      displayEvents={data.displayEvents}
      calibration={data.calibration}
      team1Name={data.team1Name}
      team2Name={data.team2Name}
      ghostCandidates={ghostCandidates}
    />
  );
}
