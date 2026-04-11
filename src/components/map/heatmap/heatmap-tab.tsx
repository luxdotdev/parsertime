import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { HeatmapService } from "@/data/map";
import { getTranslations } from "next-intl/server";
import { HeatmapCanvas } from "./heatmap-canvas";
import { HeatmapControlTabs } from "./heatmap-control-tabs";

export async function HeatmapTab({ id }: { id: number }) {
  const [data, t] = await Promise.all([
    AppRuntime.runPromise(
      HeatmapService.pipe(Effect.flatMap((svc) => svc.getHeatmapData(id)))
    ),
    getTranslations("mapPage.heatmap"),
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
