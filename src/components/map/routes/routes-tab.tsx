import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { RouteMiningService } from "@/data/map/route-mining-service";
import { loadCalibration } from "@/lib/map-calibration/load-calibration";
import prisma from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { RoutesView } from "./routes-view";
import { RoutesControlTabs } from "./routes-control-tabs";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

export async function RoutesTab({ id }: { id: number }) {
  const [result, t] = await Promise.all([
    AppRuntime.runPromise(
      RouteMiningService.pipe(Effect.flatMap((svc) => svc.getRouteAnalysis(id)))
    ),
    getTranslations("mapPage.routes"),
  ]);

  if (result === null) {
    return <EmptyState message={t("empty")} />;
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
      return <EmptyState message={t("noCalibration")} />;
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
    return <EmptyState message={t("noCalibration")} />;
  }

  return <RoutesControlTabs subMaps={subMaps} />;
}
