"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MapModePerformance } from "@/data/team-map-mode-stats-dto";
import { cn, toTimestampWithHours } from "@/lib/utils";
import { $Enums } from "@prisma/client";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type MapModePerformanceCardProps = {
  modePerformance: MapModePerformance;
};

const mapTypeColors: Record<$Enums.MapType, string> = {
  [$Enums.MapType.Control]: "#3b82f6",
  [$Enums.MapType.Hybrid]: "#8b5cf6",
  [$Enums.MapType.Escort]: "#ec4899",
  [$Enums.MapType.Push]: "#f59e0b",
  [$Enums.MapType.Clash]: "#10b981",
  [$Enums.MapType.Flashpoint]: "#ef4444",
};

const mapTypeLabels: Record<$Enums.MapType, string> = {
  [$Enums.MapType.Control]: "Control",
  [$Enums.MapType.Hybrid]: "Hybrid",
  [$Enums.MapType.Escort]: "Escort",
  [$Enums.MapType.Push]: "Push",
  [$Enums.MapType.Clash]: "Clash",
  [$Enums.MapType.Flashpoint]: "Flashpoint",
};

function CustomTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  const t = useTranslations("teamStatsPage.mapModePerformanceCard");

  if (active && payload?.length) {
    const data = payload[0].payload as {
      name: string;
      winrate: number;
      wins: number;
      losses: number;
      games: number;
    };
    return (
      <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 shadow-xl">
        <p className="text-sm font-semibold">{data.name}</p>
        <p className="text-sm">
          {t.rich("winrate", {
            span: (chunks) => <span className="font-bold">{chunks}</span>,
            winrate: data.winrate.toFixed(1),
          })}
        </p>
        <p className="text-muted-foreground text-xs">
          {t("winsAndLosses", {
            wins: data.wins,
            losses: data.losses,
            games: data.games,
          })}
        </p>
      </div>
    );
  }
  return null;
}

export function MapModePerformanceCard({
  modePerformance,
}: MapModePerformanceCardProps) {
  const t = useTranslations("teamStatsPage.mapModePerformanceCard");
  const hasData = modePerformance.overall.totalGames > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = Object.values($Enums.MapType)
    .filter(
      (type) => type !== $Enums.MapType.Push && type !== $Enums.MapType.Clash
    )
    .map((mapType) => {
      const stats = modePerformance.byMode[mapType];
      return {
        name: mapTypeLabels[mapType],
        winrate: stats.winrate,
        wins: stats.wins,
        losses: stats.losses,
        games: stats.gamesPlayed,
        fill: mapTypeColors[mapType],
      };
    })
    .filter((data) => data.games > 0)
    .sort((a, b) => b.winrate - a.winrate);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("title")}</CardTitle>
          {modePerformance.bestMode && (
            <Badge className="bg-green-500">
              {t("best", { mode: mapTypeLabels[modePerformance.bestMode] })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="winrate"
                name={t("winrateLabel")}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.values($Enums.MapType)
              .filter(
                (type) =>
                  type !== $Enums.MapType.Push &&
                  type !== $Enums.MapType.Clash &&
                  modePerformance.byMode[type].gamesPlayed > 0
              )
              .sort(
                (a, b) =>
                  modePerformance.byMode[b].winrate -
                  modePerformance.byMode[a].winrate
              )
              .map((mapType) => {
                const stats = modePerformance.byMode[mapType];
                const isBest = modePerformance.bestMode === mapType;
                const isWorst = modePerformance.worstMode === mapType;

                return (
                  <div
                    key={mapType}
                    className={cn(
                      "rounded-lg border p-4",
                      isBest &&
                        "border-green-500 bg-green-50 dark:bg-green-950/30",
                      isWorst && "border-red-500 bg-red-50 dark:bg-red-950/30"
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold">
                        {mapTypeLabels[mapType]}
                      </h3>
                      <Badge
                        style={{ backgroundColor: mapTypeColors[mapType] }}
                        className="font-bold"
                      >
                        {stats.winrate.toFixed(1)}%
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("record")}
                        </span>
                        <span className="font-medium">
                          {t("winsLossesRecord", {
                            wins: stats.wins,
                            losses: stats.losses,
                          })}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("gamesLabel")}
                        </span>
                        <span className="font-medium">{stats.gamesPlayed}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("avgTimeLabel")}
                        </span>
                        <span className="font-medium">
                          {toTimestampWithHours(stats.avgPlaytime)}
                        </span>
                      </div>

                      {stats.bestMap && (
                        <div className="border-muted-foreground mt-3 border-t pt-2">
                          <div className="text-muted-foreground text-xs">
                            {t("bestMap")}
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs">
                              {stats.bestMap.name}
                            </span>
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                              {stats.bestMap.winrate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}

                      {stats.worstMap &&
                        stats.bestMap?.name !== stats.worstMap.name && (
                          <div>
                            <div className="text-muted-foreground text-xs">
                              {t("worstMap")}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs">
                                {stats.worstMap.name}
                              </span>
                              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                                {stats.worstMap.winrate.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
          </div>

          {modePerformance.bestMode && modePerformance.worstMode && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="mb-2 text-sm font-semibold">{t("insights")}</h4>
              <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                <li>
                  {t.rich("excelsAt", {
                    span: (chunks) => (
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {chunks}
                      </span>
                    ),
                    mode: mapTypeLabels[modePerformance.bestMode],
                    winrate:
                      modePerformance.byMode[
                        modePerformance.bestMode
                      ].winrate.toFixed(1),
                  })}
                </li>
                <li>
                  {t.rich("considerPracticing", {
                    span: (chunks) => (
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {chunks}
                      </span>
                    ),
                    mode: mapTypeLabels[modePerformance.worstMode],
                    winrate:
                      modePerformance.byMode[
                        modePerformance.worstMode
                      ].winrate.toFixed(1),
                  })}
                </li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
