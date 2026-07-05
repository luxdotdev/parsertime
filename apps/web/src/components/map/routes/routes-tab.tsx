import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { RouteMiningService } from "@/data/map/route-mining-service";
import type { Locale } from "@/i18n/config";
import { mapTag } from "@/lib/cache-tags";
import { loadCalibration } from "@/lib/map-calibration/load-calibration";
import { getLocaleTranslations } from "@/lib/metadata-i18n";
import prisma from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { RoutesView } from "./routes-view";
import { RoutesControlTabs } from "./routes-control-tabs";
import { RoutesEmptyState } from "./empty-state";

export async function RoutesTab({
  id,
  mapId,
  locale,
}: {
  /** The MapData id used to load route analysis. */
  id: number;
  /** The Map id, used only for cache tagging/invalidation. */
  mapId: number;
  locale: Locale;
}) {
  "use cache";
  // The rendered output embeds a presigned image URL that expires in 3600s
  // (loadCalibration) — cap the entry's absolute age well under that so a
  // cached render can never serve a dead URL.
  cacheLife({ stale: 300, revalidate: 900, expire: 1800 });
  cacheTag(mapTag(mapId));

  const [result, t] = await Promise.all([
    AppRuntime.runPromise(
      RouteMiningService.pipe(Effect.flatMap((svc) => svc.getRouteAnalysis(id)))
    ),
    getLocaleTranslations(locale, "mapPage.routes"),
  ]);

  if (result === null) {
    return <RoutesEmptyState message={t("empty")} />;
  }

  if (result.type === "single") {
    const matchStart = await prisma.matchStart.findFirst({
      where: { MapDataId: id },
      select: { map_name: true },
    });
    const calibration = matchStart?.map_name
      ? await loadCalibration(matchStart.map_name)
      : null;
    if (!calibration) {
      return <RoutesEmptyState message={t("noCalibration")} />;
    }
    return (
      <RoutesView
        analysis={result.analysis}
        imageUrl={calibration.imagePresignedUrl}
        imageWidth={calibration.imageWidth}
        imageHeight={calibration.imageHeight}
        transform={calibration.transform}
      />
    );
  }

  // Control: load each sub-map's calibration; keep the calibratable ones.
  const subMaps = (
    await Promise.all(
      result.subMaps.map(async (sm) => {
        const calibration = await loadCalibration(sm.calibrationMapName);
        return calibration ? { ...sm, calibration } : null;
      })
    )
  ).filter((sm): sm is NonNullable<typeof sm> => sm !== null);

  if (subMaps.length === 0) {
    return <RoutesEmptyState message={t("noCalibration")} />;
  }

  return <RoutesControlTabs subMaps={subMaps} />;
}
