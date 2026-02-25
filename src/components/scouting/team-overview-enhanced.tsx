"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceIndicator } from "@/components/scouting/confidence-indicator";
import type { MatchResult, ScoutingTeamOverview } from "@/data/scouting-dto";
import type {
  TeamStrengthRating,
} from "@/data/opponent-strength-dto";
import { assessConfidence } from "@/lib/confidence";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { ScoutingMatchHistoryEntry } from "@/data/scouting-dto";

type EnhancedOverviewProps = {
  overview: ScoutingTeamOverview;
  strengthRating: TeamStrengthRating | null;
  strengthPercentile: number | null;
  matchHistory: ScoutingMatchHistoryEntry[];
};

export function TeamOverviewEnhanced({
  overview,
  strengthRating,
  strengthPercentile,
  matchHistory,
}: EnhancedOverviewProps) {
  const t = useTranslations("scoutingPage.team.overview");

  const winsAbove1500 = strengthRating
    ? countWinsAboveRating(matchHistory, strengthRating, 1500)
    : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("record")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {overview.wins}W &ndash; {overview.losses}L
            </p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {overview.totalMatches}{" "}
              {t("matchCount", { count: overview.totalMatches })}
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("winRate")}
              <WinRateSparkline form={overview.recentForm} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <p className="text-2xl font-bold tabular-nums">
                {overview.winRate.toFixed(1)}%
              </p>
              <p className="text-muted-foreground text-sm tabular-nums">
                {overview.weightedWinRate.toFixed(1)}% weighted
              </p>
            </div>
          </CardContent>
        </Card>

        {strengthRating ? (
          <StrengthRatingCard
            rating={strengthRating}
            percentile={strengthPercentile}
            rawWinRate={overview.winRate}
          />
        ) : (
          <NoCompetitiveDataCard />
        )}

        {winsAbove1500 !== null && strengthRating && (
          <Card size="sm">
            <CardHeader>
              <CardTitle>Record Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">
                {winsAbove1500.wins} of {overview.wins}
              </p>
              <p className="text-muted-foreground text-sm">
                wins came against teams rated above 1500
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("recentForm")}</CardTitle>
          <CardDescription>{t("recentFormDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.recentForm.length > 0 ? (
            <div
              className="flex gap-1.5"
              role="list"
              aria-label={t("recentForm")}
            >
              {recentFormWithKeys(overview.recentForm).map(
                ({ key, result }) => (
                  <span
                    key={key}
                    role="listitem"
                    aria-label={result === "win" ? t("win") : t("loss")}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold",
                      result === "win"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                    )}
                  >
                    {result === "win" ? "W" : "L"}
                  </span>
                )
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t("noMatches")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StrengthRatingCard({
  rating,
  percentile,
  rawWinRate,
}: {
  rating: TeamStrengthRating;
  percentile: number | null;
  rawWinRate: number;
}) {
  const isProvisional = rating.matchesRated < 5;
  const ratingConfidence = assessConfidence(rating.matchesRated);

  return (
    <Card
      size="sm"
      className={cn(isProvisional && "border-dashed opacity-80")}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Strength Rating
          <ConfidenceIndicator
            confidence={ratingConfidence}
            showLabel={false}
            size="sm"
          />
        </CardTitle>
        {isProvisional && (
          <CardDescription>Provisional — fewer than 5 matches</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3">
          <p className="text-2xl font-bold tabular-nums">{rating.rating}</p>
          {percentile !== null && (
            <Badge variant="secondary" className="tabular-nums">
              Top {100 - percentile}%
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-sm tabular-nums">
          {rating.matchesRated} matches rated
        </p>
      </CardContent>
    </Card>
  );
}

function NoCompetitiveDataCard() {
  return (
    <Card size="sm" className="border-dashed">
      <CardHeader>
        <CardTitle>Strength Rating</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          No competitive match data available. Tag scrims with an opponent to
          enable cross-referenced analytics.
        </p>
      </CardContent>
    </Card>
  );
}

function WinRateSparkline({ form }: { form: MatchResult[] }) {
  if (form.length < 3) return null;

  const points = form
    .slice()
    .reverse()
    .map((r, i) => ({ x: i, y: r === "win" ? 1 : 0 }));

  const width = 64;
  const height = 20;
  const stepX = width / (points.length - 1);

  const pathData = points
    .map((p, i) => {
      const x = p.x * stepX;
      const y = height - p.y * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const winCount = points.filter((p) => p.y === 1).length;
  const trending = winCount / points.length;
  const strokeColor =
    trending >= 0.6
      ? "var(--color-emerald-500, #10b981)"
      : trending <= 0.4
        ? "var(--color-red-500, #ef4444)"
        : "var(--color-amber-500, #f59e0b)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="ml-auto shrink-0"
      aria-label={`Win rate trend: ${Math.round(trending * 100)}% over last ${points.length} matches`}
      role="img"
    >
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="motion-safe:animate-in motion-safe:fade-in"
      />
    </svg>
  );
}

function countWinsAboveRating(
  matches: ScoutingMatchHistoryEntry[],
  strengthRating: TeamStrengthRating,
  threshold: number
): { wins: number; totalWins: number } {
  const ratingMap = new Map<string, number>();
  for (const entry of strengthRating.ratingHistory) {
    ratingMap.set(
      `${entry.date.toISOString().slice(0, 10)}`,
      entry.rating
    );
  }

  let wins = 0;
  let totalWins = 0;

  for (const match of matches) {
    if (match.result !== "win") continue;
    totalWins++;
    const lastKnownRating = strengthRating.rating;
    if (lastKnownRating >= threshold) {
      wins++;
    }
  }

  return { wins, totalWins };
}

function recentFormWithKeys(form: MatchResult[]) {
  const winCounts = new Map<string, number>();
  return form.map((result) => {
    const count = (winCounts.get(result) ?? 0) + 1;
    winCounts.set(result, count);
    return { key: `${result}-${count}`, result };
  });
}
