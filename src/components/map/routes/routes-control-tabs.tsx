"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LoadedCalibration } from "@/lib/map-calibration/load-calibration";
import type { ControlSubMapRoutes } from "@/lib/routes/routes-db";
import { useTranslations } from "next-intl";
import { RoutesEmptyState } from "./empty-state";
import { RoutesView } from "./routes-view";

type SubMapWithCalibration = ControlSubMapRoutes & {
  calibration: LoadedCalibration;
};

export function RoutesControlTabs({
  subMaps,
}: {
  subMaps: SubMapWithCalibration[];
}) {
  const t = useTranslations("mapPage.routes");
  const defaultTab = subMaps[0]?.calibrationMapName ?? "";

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <TabsList>
        {subMaps.map((sm) => (
          <TabsTrigger key={sm.calibrationMapName} value={sm.calibrationMapName}>
            {sm.subMapName}
          </TabsTrigger>
        ))}
      </TabsList>
      {subMaps.map((sm) => (
        <TabsContent
          key={sm.calibrationMapName}
          value={sm.calibrationMapName}
          className="space-y-4"
        >
          {sm.analysis.routes.length === 0 ? (
            <RoutesEmptyState message={t("empty")} />
          ) : (
            <RoutesView
              analysis={sm.analysis}
              imageUrl={sm.calibration.imagePresignedUrl}
              imageWidth={sm.calibration.imageWidth}
              imageHeight={sm.calibration.imageHeight}
              transform={sm.calibration.transform}
            />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
