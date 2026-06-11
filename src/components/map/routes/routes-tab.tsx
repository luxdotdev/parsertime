import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { RouteMiningService } from "@/data/map/route-mining-service";
import {
  loadCalibration,
  type LoadedCalibration,
} from "@/lib/map-calibration/load-calibration";
import { CONTROL_OBJECTIVE_MAP } from "@/lib/map-calibration/control-map-index";
import prisma from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { RoutesView } from "./routes-view";

/**
 * Server component for the Routes tab. Fetches the route analysis via
 * RouteMiningService (mirroring HeatmapTab's AppRuntime.runPromise pattern)
 * and loads the map calibration + presigned image URL the same way the
 * replay/heatmap services do (loadCalibration on the map name). The
 * interactive canvas + filters live in the RoutesView client child.
 */
export async function RoutesTab({ id }: { id: number }) {
  const [analysis, t] = await Promise.all([
    AppRuntime.runPromise(
      RouteMiningService.pipe(Effect.flatMap((svc) => svc.getRouteAnalysis(id)))
    ),
    getTranslations("mapPage.routes"),
  ]);

  if (analysis === null) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      </div>
    );
  }

  // Resolve the map name, then load the calibration for the SVG overlay.
  // For control maps (multiple sub-map arenas) v1 falls back to the first
  // available calibration; routes still render over a coherent backdrop.
  const matchStart = await prisma.matchStart.findFirst({
    where: { MapDataId: id },
    select: { map_name: true },
  });
  const mapName = matchStart?.map_name ?? null;

  let calibration: LoadedCalibration | null = null;
  if (mapName) {
    calibration = await loadCalibration(mapName);
    if (!calibration) {
      const subMaps = CONTROL_OBJECTIVE_MAP[mapName];
      if (subMaps) {
        for (const subName of subMaps) {
          calibration = await loadCalibration(subName);
          if (calibration) break;
        }
      }
    }
  }

  if (!calibration) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t("noCalibration")}</p>
      </div>
    );
  }

  return (
    <RoutesView
      analysis={analysis}
      imageUrl={calibration.imagePresignedUrl}
      imageWidth={calibration.imageWidth}
      imageHeight={calibration.imageHeight}
      transform={calibration.transform}
    />
  );
}
