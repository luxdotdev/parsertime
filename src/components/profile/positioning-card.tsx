"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CalculatedStat, CalculatedStatType } from "@/generated/prisma/browser";
import { useTranslations } from "next-intl";

type PositioningCardProps = {
  calculatedStats: CalculatedStat[];
};

type SpatialTileConfig = {
  stat: CalculatedStatType;
  labelKey: string;
  hintKey: string;
  formatValue: (value: number) => string;
};

const SPATIAL_TILES: SpatialTileConfig[] = [
  {
    stat: "AVERAGE_ENGAGEMENT_DISTANCE",
    labelKey: "engagementDistance",
    hintKey: "engagementDistanceHint",
    formatValue: (value) => `${value.toFixed(1)}m`,
  },
  {
    stat: "HIGH_GROUND_KILL_PERCENTAGE",
    labelKey: "highGroundKills",
    hintKey: "highGroundKillsHint",
    formatValue: (value) => `${value.toFixed(1)}%`,
  },
  {
    stat: "ISOLATION_DEATH_PERCENTAGE",
    labelKey: "isolationDeaths",
    hintKey: "isolationDeathsHint",
    formatValue: (value) => `${value.toFixed(1)}%`,
  },
  {
    stat: "AVERAGE_FIGHT_START_SPREAD",
    labelKey: "fightStartSpread",
    hintKey: "fightStartSpreadHint",
    formatValue: (value) => `${value.toFixed(1)}m`,
  },
];

export function PositioningCard({ calculatedStats }: PositioningCardProps) {
  const t = useTranslations("positioningCard");

  const tiles = SPATIAL_TILES.map((config) => {
    const rows = calculatedStats.filter((s) => s.stat === config.stat);
    const average =
      rows.length > 0
        ? rows.reduce((acc, s) => acc + s.value, 0) / rows.length
        : null;
    return { config, average, count: rows.length };
  });

  const hasData = tiles.some((tile) => tile.average !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map(({ config, average, count }) => (
              <div key={config.stat} className="space-y-1">
                <p className="text-muted-foreground text-sm">
                  {t(config.labelKey)}
                </p>
                <p className="font-mono text-2xl font-semibold tabular-nums">
                  {average !== null ? config.formatValue(average) : "—"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t(config.hintKey)}
                </p>
                {average !== null && (
                  <p className="text-muted-foreground/70 text-xs">
                    {t("mapsWithData", { count })}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        )}
      </CardContent>
    </Card>
  );
}
