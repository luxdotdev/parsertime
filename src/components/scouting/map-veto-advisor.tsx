"use client";

import { ConfidenceDot } from "@/components/scouting/confidence-indicator";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  MapIntelligence,
  MapMatchupEntry,
} from "@/data/intelligence/types";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowRight, ArrowUp, Info } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";

type MapVetoAdvisorProps = {
  mapIntelligence: MapIntelligence;
  hasUserTeamLink: boolean;
};

export function MapVetoAdvisor({
  mapIntelligence,
  hasUserTeamLink,
}: MapVetoAdvisorProps) {
  const t = useTranslations("scoutingPage.team.maps");
  const formatter = useFormatter();
  const { matchupMatrix, trends, strengthWeightedWRs } = mapIntelligence;

  const { sortedByAdvantage, topPicks, topBans } = useMemo(() => {
    const withData = matchupMatrix.filter((m) => m.netAdvantage !== null);
    const sorted = [...withData].sort(
      (a, b) => (b.netAdvantage ?? 0) - (a.netAdvantage ?? 0)
    );
    return {
      sortedByAdvantage: sorted,
      topPicks: sorted.filter(
        (m) => m.netAdvantage !== null && m.netAdvantage > 0
      ),
      topBans: sorted
        .filter((m) => m.netAdvantage !== null && m.netAdvantage < 0)
        .reverse(),
    };
  }, [matchupMatrix]);

  const trendMap = useMemo(
    () => new Map(trends.map((tr) => [tr.mapName, tr])),
    [trends]
  );

  return (
    <div className="space-y-4">
      {hasUserTeamLink && sortedByAdvantage.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("advisorTitle")}</CardTitle>
                  <CardDescription>{t("advisorDescription")}</CardDescription>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {t("crossReferenceAvailable")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="space-y-1"
                role="list"
                aria-label={t("matchupMatrixLabel")}
              >
                {sortedByAdvantage.map((entry) => (
                  <MapMatchupBar
                    key={entry.mapName}
                    entry={entry}
                    trend={trendMap.get(entry.mapName)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {(topPicks.length > 0 || topBans.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>{t("vetoRecommendation")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {topPicks.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {t("pick")}
                      </p>
                      <ul className="space-y-1">
                        {topPicks.slice(0, 3).map((m) => (
                          <li
                            key={m.mapName}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="font-medium">{m.mapName}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {formatSignedPercentagePoints(
                                formatter,
                                t,
                                m.netAdvantage!
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {topBans.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">
                        {t("ban")}
                      </p>
                      <ul className="space-y-1">
                        {topBans.slice(0, 3).map((m) => (
                          <li
                            key={m.mapName}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="font-medium">{m.mapName}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {formatSignedPercentagePoints(
                                formatter,
                                t,
                                m.netAdvantage!
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <SelectTeamCTA />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("byMap")}</CardTitle>
          <CardDescription>
            {t("opponentPerformanceDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {strengthWeightedWRs.length > 0 ? (
            <div className="space-y-0.5">
              <div className="text-muted-foreground grid grid-cols-[1fr_80px_80px_80px_40px] gap-2 px-2 pb-2 text-xs font-medium">
                <span>{t("map")}</span>
                <span className="text-right">{t("rawWinRate")}</span>
                <span className="text-right">{t("weightedWinRate")}</span>
                <span className="text-right">{t("played")}</span>
                <span className="text-center">{t("trend")}</span>
              </div>
              {strengthWeightedWRs.map((wr) => {
                const trend = trendMap.get(wr.mapName);
                return (
                  <div
                    key={wr.mapName}
                    className={cn(
                      "grid grid-cols-[1fr_80px_80px_80px_40px] items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                      wr.strengthWeightedWinRate >= 60
                        ? "bg-emerald-500/5"
                        : wr.strengthWeightedWinRate <= 40
                          ? "bg-red-500/5"
                          : ""
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <ConfidenceDot confidence={wr.confidence} />
                      <span className="font-medium">{wr.mapName}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {wr.mapType}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground text-right tabular-nums">
                      {formatter.number(wr.rawWinRate / 100, {
                        style: "percent",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <span className="text-right font-medium tabular-nums">
                      {formatter.number(wr.strengthWeightedWinRate / 100, {
                        style: "percent",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <span className="text-muted-foreground text-right tabular-nums">
                      {wr.played}
                    </span>
                    <span className="flex justify-center">
                      {trend && (
                        <TrendArrow trend={trend.trend} delta={trend.delta} />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t("noMaps")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MapMatchupBar({
  entry,
  trend,
}: {
  entry: MapMatchupEntry;
  trend?: { trend: string; delta: number };
}) {
  const t = useTranslations("scoutingPage.team.maps");
  const formatter = useFormatter();
  const advantage = entry.netAdvantage ?? 0;
  const maxAdvantage = 50;
  const barWidth = Math.min(Math.abs(advantage) / maxAdvantage, 1) * 50;
  const isPositive = advantage > 0;

  return (
    <div
      className="flex items-center gap-3 rounded-md px-2 py-1.5"
      role="listitem"
      aria-label={t("netAdvantageLabel", {
        map: entry.mapName,
        advantage: formatSignedPercentagePoints(formatter, t, advantage),
      })}
    >
      <div className="flex w-28 shrink-0 items-center gap-1.5">
        <span className="truncate text-sm font-medium">{entry.mapName}</span>
        {trend && (
          <TrendArrow
            trend={trend.trend as "improving" | "declining" | "stable"}
            delta={trend.delta}
          />
        )}
      </div>

      <div className="flex flex-1 items-center">
        <div className="flex h-6 flex-1 items-center">
          <div className="relative flex h-full w-full items-center">
            <div className="bg-border absolute left-1/2 h-full w-px" />

            {isPositive ? (
              <div
                className="motion-safe:animate-in motion-safe:slide-in-from-left-0 absolute left-1/2 h-4 rounded-r-sm bg-emerald-500/70"
                style={{ width: `${barWidth}%` }}
              />
            ) : (
              <div
                className="motion-safe:animate-in motion-safe:slide-in-from-right-0 absolute right-1/2 h-4 rounded-l-sm bg-red-500/70"
                style={{ width: `${barWidth}%` }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex w-48 shrink-0 items-center gap-2 text-xs tabular-nums">
        <span className="text-muted-foreground w-12 text-right">
          {entry.userWinRate !== null
            ? formatter.number(entry.userWinRate / 100, {
                style: "percent",
                maximumFractionDigits: 0,
              })
            : "—"}
        </span>
        <span className="text-muted-foreground">{t("versus")}</span>
        <span className="text-muted-foreground w-12">
          {formatter.number(entry.opponentStrengthWeightedWR / 100, {
            style: "percent",
            maximumFractionDigits: 0,
          })}
        </span>
        <span
          className={cn(
            "w-14 text-right font-medium",
            isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {formatSignedPercentagePoints(formatter, t, advantage)}
        </span>
        <ConfidenceDot
          confidence={
            entry.userConfidence.level === "insufficient" ||
            entry.opponentConfidence.level === "insufficient"
              ? entry.userConfidence.level === "insufficient"
                ? entry.userConfidence
                : entry.opponentConfidence
              : entry.userConfidence.sampleSize <
                  entry.opponentConfidence.sampleSize
                ? entry.userConfidence
                : entry.opponentConfidence
          }
        />
      </div>
    </div>
  );
}

function TrendArrow({ trend, delta }: { trend: string; delta: number }) {
  const t = useTranslations("scoutingPage.team.maps");
  const formatter = useFormatter();
  const formattedDelta = formatSignedPercentagePoints(formatter, t, delta);

  if (trend === "stable") {
    return (
      <ArrowRight
        className="text-muted-foreground h-3 w-3"
        aria-label={t("stableTrend", { delta: formattedDelta })}
      />
    );
  }
  if (trend === "improving") {
    return (
      <ArrowUp
        className="h-3 w-3 text-red-500"
        aria-label={t("improvingTrend", { delta: formattedDelta })}
      />
    );
  }
  return (
    <ArrowDown
      className="h-3 w-3 text-emerald-500"
      aria-label={t("decliningTrend", { delta: formattedDelta })}
    />
  );
}

function SelectTeamCTA() {
  const t = useTranslations("scoutingPage.team.maps");

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <Info className="text-muted-foreground h-8 w-8" aria-hidden="true" />
        <div>
          <p className="font-medium">{t("selectTeamTitle")}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("selectTeamDescription")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatSignedPercentagePoints(
  formatter: ReturnType<typeof useFormatter>,
  t: ReturnType<typeof useTranslations>,
  value: number
) {
  return t("percentagePoints", {
    value: formatter.number(value, {
      maximumFractionDigits: 0,
      signDisplay: "exceptZero",
    }),
  });
}
