"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HeroName } from "@/types/heroes";
import {
  AlertTriangle,
  Minus,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useTranslations } from "next-intl";

type ComparisonStats = {
  playerName: string;
  filteredHeroes: HeroName[];
  mapCount: number;
  mapIds: number[];
  aggregated: {
    eliminations: number;
    deaths: number;
    damage: number;
    healing: number;
    mitigated: number;
    heroTimePlayed: number;
    eliminationsPer10: number;
    deathsPer10: number;
    damagePer10: number;
    healingPer10: number;
    mitigatedPer10: number;
  };
  perMapBreakdown: {
    mapId: number;
    mapName: string;
    date: Date;
    heroes: HeroName[];
    stats: Record<string, number>;
  }[];
  trends?: {
    improvingMetrics: string[];
    decliningMetrics: string[];
    earlyPerformance?: Record<string, number>;
    latePerformance?: Record<string, number>;
  };
};

type TrendsViewProps = {
  stats: ComparisonStats;
};

export function TrendsView({ stats }: TrendsViewProps) {
  const t = useTranslations("comparePage.trends");

  if (stats.perMapBreakdown.length < 3) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">{t("requiresThreePlus")}</p>
        </CardContent>
      </Card>
    );
  }

  // Find best and worst performing maps
  const mapsByElimsPer10 = [...stats.perMapBreakdown].sort(
    (a, b) =>
      (b.stats.eliminationsPer10 ?? 0) - (a.stats.eliminationsPer10 ?? 0)
  );
  const bestMap = mapsByElimsPer10[0];
  const worstMap = mapsByElimsPer10[mapsByElimsPer10.length - 1];

  // Calculate averages
  const avgElimsPer10 =
    stats.perMapBreakdown.reduce(
      (sum, map) => sum + (map.stats.eliminationsPer10 ?? 0),
      0
    ) / stats.perMapBreakdown.length;

  const avgDeathsPer10 =
    stats.perMapBreakdown.reduce(
      (sum, map) => sum + (map.stats.deathsPer10 ?? 0),
      0
    ) / stats.perMapBreakdown.length;

  const avgDamagePer10 =
    stats.perMapBreakdown.reduce(
      (sum, map) => sum + (map.stats.damagePer10 ?? 0),
      0
    ) / stats.perMapBreakdown.length;

  // Calculate half comparisons if 4+ maps
  const hasHalfComparison = stats.perMapBreakdown.length >= 4;
  const halfPoint = Math.floor(stats.perMapBreakdown.length / 2);
  const firstHalf = stats.perMapBreakdown.slice(0, halfPoint);
  const secondHalf = stats.perMapBreakdown.slice(halfPoint);

  const firstHalfAvg = hasHalfComparison
    ? firstHalf.reduce(
        (sum, map) => sum + (map.stats.eliminationsPer10 ?? 0),
        0
      ) / firstHalf.length
    : 0;

  const secondHalfAvg = hasHalfComparison
    ? secondHalf.reduce(
        (sum, map) => sum + (map.stats.eliminationsPer10 ?? 0),
        0
      ) / secondHalf.length
    : 0;

  const halfDelta = secondHalfAvg - firstHalfAvg;
  const halfDeltaPercent =
    firstHalfAvg !== 0 ? (halfDelta / firstHalfAvg) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Aggregate Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t("aggregateSummary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">{t("totalMaps")}</p>
              <p className="text-3xl font-bold tabular-nums">
                {stats.mapCount}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">
                {t("avgElimsPer10")}
              </p>
              <p className="text-3xl font-bold tabular-nums">
                {avgElimsPer10.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">
                {t("avgDeathsPer10")}
              </p>
              <p className="text-3xl font-bold tabular-nums">
                {avgDeathsPer10.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">
                {t("avgDamagePer10")}
              </p>
              <p className="text-3xl font-bold tabular-nums">
                {avgDamagePer10.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Progression */}
      {hasHalfComparison && (
        <Card>
          <CardHeader>
            <CardTitle>{t("performanceProgression")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* First Half */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{t("firstHalf")}</Badge>
                  <span className="text-muted-foreground text-sm">
                    ({t("maps")} 1-{halfPoint})
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">
                    {t("avgElimsPer10")}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {firstHalfAvg.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Second Half */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{t("secondHalf")}</Badge>
                  <span className="text-muted-foreground text-sm">
                    ({t("maps")} {halfPoint + 1}-{stats.mapCount})
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">
                    {t("avgElimsPer10")}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {secondHalfAvg.toFixed(2)}
                  </p>
                  <div
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium",
                      halfDelta > 0
                        ? "text-green-600 dark:text-green-400"
                        : halfDelta < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                    )}
                  >
                    {halfDelta > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : halfDelta < 0 ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                    <span>
                      {halfDelta > 0 ? "+" : ""}
                      {halfDelta.toFixed(2)} ({halfDelta > 0 ? "+" : ""}
                      {halfDeltaPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interpretation */}
            <div className="border-border mt-6 rounded-lg border p-4">
              <p className="text-sm">
                {halfDelta > 5 ? (
                  <>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {t("improvement")}:
                    </span>{" "}
                    {t("improvementDesc")}
                  </>
                ) : halfDelta < -5 ? (
                  <>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {t("decline")}:
                    </span>{" "}
                    {t("declineDesc")}
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground font-semibold">
                      {t("stable")}:
                    </span>{" "}
                    {t("stableDesc")}
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best and Worst Maps */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Best Map */}
        <Card className="bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
              <CardTitle className="text-green-600 dark:text-green-400">
                {t("bestPerformance")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-lg font-semibold">{bestMap.mapName}</p>
                <Badge variant="outline" className="mt-1">
                  {new Date(bestMap.date).toLocaleDateString()}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">
                    {t("elimsPer10")}
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {(bestMap.stats.eliminationsPer10 ?? 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {t("deathsPer10")}
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {(bestMap.stats.deathsPer10 ?? 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {t("damagePer10")}
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {(bestMap.stats.damagePer10 ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Worst Map */}
        <Card className="bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <CardTitle className="text-red-600 dark:text-red-400">
                {t("needsImprovement")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-lg font-semibold">{worstMap.mapName}</p>
                <Badge variant="outline" className="mt-1">
                  {new Date(worstMap.date).toLocaleDateString()}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">
                    {t("elimsPer10")}
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {(worstMap.stats.eliminationsPer10 ?? 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {t("deathsPer10")}
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {(worstMap.stats.deathsPer10 ?? 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {t("damagePer10")}
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {(worstMap.stats.damagePer10 ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Map Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>{t("perMapBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.perMapBreakdown.map((map, index) => (
              <div
                key={map.mapId}
                className="border-border flex items-center gap-4 rounded-lg border p-4"
              >
                <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  <span className="text-primary font-semibold">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{map.mapName}</p>
                  <p className="text-muted-foreground text-sm">
                    {new Date(map.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-6 text-right">
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {t("elims")}
                    </p>
                    <p className="font-semibold tabular-nums">
                      {(map.stats.eliminationsPer10 ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {t("deaths")}
                    </p>
                    <p className="font-semibold tabular-nums">
                      {(map.stats.deathsPer10 ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {t("damage")}
                    </p>
                    <p className="font-semibold tabular-nums">
                      {(map.stats.damagePer10 ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
