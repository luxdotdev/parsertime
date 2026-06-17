"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PlayerHeatmapResult } from "@/data/map/player-telemetry-types";
import { useTranslations } from "next-intl";
import {
  PlayerHeatmapCanvas,
  type PlayerHeatmapLabels,
} from "./player-heatmap-canvas";

export function PlayerHeatmap({ result }: { result: PlayerHeatmapResult }) {
  const t = useTranslations("mapPage.player.telemetry");

  const labels: PlayerHeatmapLabels = {
    heatGroup: t("heatmap.heatGroup"),
    heat: {
      damageDealt: t("heatmap.layers.damageDealt"),
      damageTaken: t("heatmap.layers.damageTaken"),
      healingDealt: t("heatmap.layers.healingDealt"),
    },
    marker: {
      kills: t("heatmap.layers.kills"),
      deaths: t("heatmap.layers.deaths"),
      abilities: t("heatmap.layers.abilities"),
    },
    abilityKinds: {
      ability_1: t("markers.ability1"),
      ability_2: t("markers.ability2"),
      ultimate: t("markers.ult"),
    },
    abilityFilterLabel: t("heatmap.abilityFilter"),
    loading: t("heatmap.loading"),
  };

  if (result.type === "no_calibration") {
    return <EmptyHeatmap message={t("heatmap.noCalibration")} />;
  }

  if (result.type === "no_coordinates") {
    return <EmptyHeatmap message={t("heatmap.noCoordinates")} />;
  }

  if (result.type === "control") {
    if (result.subMaps.length === 0) {
      return <EmptyHeatmap message={t("heatmap.noCalibration")} />;
    }
    return (
      <Tabs defaultValue={result.subMaps[0].subMapName} className="space-y-3">
        <TabsList aria-label={t("heatmap.subMapsLabel")}>
          {result.subMaps.map((subMap) => (
            <TabsTrigger key={subMap.subMapName} value={subMap.subMapName}>
              {subMap.subMapName}
            </TabsTrigger>
          ))}
        </TabsList>
        {result.subMaps.map((subMap) => (
          <TabsContent key={subMap.subMapName} value={subMap.subMapName}>
            <PlayerHeatmapCanvas subMap={subMap} labels={labels} />
          </TabsContent>
        ))}
      </Tabs>
    );
  }

  return <PlayerHeatmapCanvas subMap={result.subMap} labels={labels} />;
}

function EmptyHeatmap({ message }: { message: string }) {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
      <p className="text-muted-foreground max-w-sm text-center text-sm">
        {message}
      </p>
    </div>
  );
}
