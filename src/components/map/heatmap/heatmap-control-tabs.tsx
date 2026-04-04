"use client";

import type { HeatmapSubMap } from "@/data/heatmap-dto";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeatmapCanvas } from "./heatmap-canvas";

type HeatmapControlTabsProps = {
  subMaps: HeatmapSubMap[];
  labels: {
    damage: string;
    healing: string;
    kills: string;
    noCoordinates: string;
  };
};

export function HeatmapControlTabs({
  subMaps,
  labels,
}: HeatmapControlTabsProps) {
  const defaultTab = subMaps[0]?.calibrationMapName ?? "";

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <TabsList>
        {subMaps.map((sm) => (
          <TabsTrigger
            key={sm.calibrationMapName}
            value={sm.calibrationMapName}
          >
            {sm.subMapName}
          </TabsTrigger>
        ))}
      </TabsList>
      {subMaps.map((sm) => {
        const totalPoints =
          sm.damagePoints.length +
          sm.healingPoints.length +
          sm.killPoints.length;

        return (
          <TabsContent
            key={sm.calibrationMapName}
            value={sm.calibrationMapName}
            className="space-y-4"
          >
            {totalPoints === 0 ? (
              <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
                <p className="text-muted-foreground text-sm">
                  {labels.noCoordinates}
                </p>
              </div>
            ) : (
              <HeatmapCanvas
                imageUrl={sm.imagePresignedUrl}
                imageWidth={sm.imageWidth}
                imageHeight={sm.imageHeight}
                damagePoints={sm.damagePoints}
                healingPoints={sm.healingPoints}
                killPoints={sm.killPoints}
                labels={labels}
              />
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
