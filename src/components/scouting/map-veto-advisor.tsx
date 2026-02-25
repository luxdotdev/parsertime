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
} from "@/data/map-intelligence-dto";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowRight, ArrowUp, Info } from "lucide-react";
import { useTranslations } from "next-intl";

type MapVetoAdvisorProps = {
  mapIntelligence: MapIntelligence;
  hasUserTeamLink: boolean;
};

export function MapVetoAdvisor({
  mapIntelligence,
  hasUserTeamLink,
}: MapVetoAdvisorProps) {
  const t = useTranslations("scoutingPage.team.maps");
  const { matchupMatrix, trends, strengthWeightedWRs } = mapIntelligence;

  const matchupsWithData = matchupMatrix.filter((m) => m.netAdvantage !== null);
  const sortedByAdvantage = [...matchupsWithData].sort(
    (a, b) => (b.netAdvantage ?? 0) - (a.netAdvantage ?? 0)
  );

  const topPicks = sortedByAdvantage.filter(
    (m) => m.netAdvantage !== null && m.netAdvantage > 0
  );
  const topBans = sortedByAdvantage
    .filter((m) => m.netAdvantage !== null && m.netAdvantage < 0)
    .reverse();

  const trendMap = new Map(trends.map((tr) => [tr.mapName, tr]));

  return (
    <div className="space-y-4">
      {hasUserTeamLink && matchupsWithData.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Map Veto Advisor</CardTitle>
                  <CardDescription>
                    Maps sorted by net advantage. Pick from the top, ban from
                    the bottom.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  Cross-reference available
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="space-y-1"
                role="list"
                aria-label="Map matchup matrix"
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
                <CardTitle>Veto Recommendation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {topPicks.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        Pick
                      </p>
                      <ul className="space-y-1">
                        {topPicks.slice(0, 3).map((m) => (
                          <li
                            key={m.mapName}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="font-medium">{m.mapName}</span>
                            <span className="text-muted-foreground tabular-nums">
                              +{Math.round(m.netAdvantage!)}pp
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {topBans.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">
                        Ban
                      </p>
                      <ul className="space-y-1">
                        {topBans.slice(0, 3).map((m) => (
                          <li
                            key={m.mapName}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="font-medium">{m.mapName}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {Math.round(m.netAdvantage!)}pp
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
            Opponent map performance with strength-weighted win rates and trend
            indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          {strengthWeightedWRs.length > 0 ? (
            <div className="space-y-0.5">
              <div className="text-muted-foreground grid grid-cols-[1fr_80px_80px_80px_40px] gap-2 px-2 pb-2 text-xs font-medium">
                <span>Map</span>
                <span className="text-right">Raw WR</span>
                <span className="text-right">Wt. WR</span>
                <span className="text-right">Played</span>
                <span className="text-center">Trend</span>
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
                      {wr.rawWinRate.toFixed(0)}%
                    </span>
                    <span className="text-right font-medium tabular-nums">
                      {wr.strengthWeightedWinRate.toFixed(0)}%
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
  const advantage = entry.netAdvantage ?? 0;
  const maxAdvantage = 50;
  const barWidth = Math.min(Math.abs(advantage) / maxAdvantage, 1) * 50;
  const isPositive = advantage > 0;

  return (
    <div
      className="flex items-center gap-3 rounded-md px-2 py-1.5"
      role="listitem"
      aria-label={`${entry.mapName}: ${isPositive ? "+" : ""}${Math.round(advantage)}pp net advantage`}
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
            ? `${Math.round(entry.userWinRate)}%`
            : "—"}
        </span>
        <span className="text-muted-foreground">vs</span>
        <span className="text-muted-foreground w-12">
          {Math.round(entry.opponentStrengthWeightedWR)}%
        </span>
        <span
          className={cn(
            "w-14 text-right font-medium",
            isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {isPositive ? "+" : ""}
          {Math.round(advantage)}pp
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
  if (trend === "stable") {
    return (
      <ArrowRight
        className="text-muted-foreground h-3 w-3"
        aria-label={`Stable trend (${delta > 0 ? "+" : ""}${Math.round(delta)}pp)`}
      />
    );
  }
  if (trend === "improving") {
    return (
      <ArrowUp
        className="h-3 w-3 text-red-500"
        aria-label={`Improving (+${Math.round(delta)}pp recent) — caution`}
      />
    );
  }
  return (
    <ArrowDown
      className="h-3 w-3 text-emerald-500"
      aria-label={`Declining (${Math.round(delta)}pp recent) — opportunity`}
    />
  );
}

function SelectTeamCTA() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <Info className="text-muted-foreground h-8 w-8" aria-hidden="true" />
        <div>
          <p className="font-medium">Select your team to unlock map matchups</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Use the &ldquo;Scouting for&rdquo; picker above to select your team
            and enable cross-referenced map veto analysis.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
