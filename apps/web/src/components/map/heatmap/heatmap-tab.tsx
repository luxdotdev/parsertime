import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { HeatmapService } from "@/data/map";
import type { Locale } from "@/i18n/config";
import { mapTag } from "@/lib/cache-tags";
import { getLocaleTranslations } from "@/lib/metadata-i18n";
import { cacheLife, cacheTag } from "next/cache";
import { HeatmapCanvas } from "./heatmap-canvas";
import { HeatmapControlTabs } from "./heatmap-control-tabs";

export async function HeatmapTab({
  id,
  mapId,
  locale,
}: {
  /** The MapData id used to load heatmap data. */
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

  const [data, t] = await Promise.all([
    AppRuntime.runPromise(
      HeatmapService.pipe(Effect.flatMap((svc) => svc.getHeatmapData(id)))
    ),
    getLocaleTranslations(locale, "mapPage.heatmap"),
  ]);

  const labels = {
    damage: t("categories.damage"),
    healing: t("categories.healing"),
    kills: t("categories.kills"),
    noCoordinates: t("noCoordinates"),
  };

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

  if (data.type === "control") {
    return <HeatmapControlTabs subMaps={data.subMaps} labels={labels} />;
  }

  return (
    <HeatmapCanvas
      imageUrl={data.subMap.imagePresignedUrl}
      imageWidth={data.subMap.imageWidth}
      imageHeight={data.subMap.imageHeight}
      damagePoints={data.subMap.damagePoints}
      healingPoints={data.subMap.healingPoints}
      killPoints={data.subMap.killPoints}
      labels={labels}
    />
  );
}
