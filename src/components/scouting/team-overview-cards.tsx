"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MatchResult, ScoutingTeamOverview } from "@/data/scouting/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type TeamOverviewCardsProps = {
  overview: ScoutingTeamOverview;
};

export function TeamOverviewCards({ overview }: TeamOverviewCardsProps) {
  const t = useTranslations("scoutingPage.team.overview");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <CardTitle>{t("winRate")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {overview.winRate.toFixed(1)}%
            </p>
            <p className="text-muted-foreground text-sm">{t("allTime")}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("weightedWinRate")}</CardTitle>
            <CardDescription>{t("weightedWinRateTooltip")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {overview.weightedWinRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
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

function recentFormWithKeys(form: MatchResult[]) {
  const winCounts = new Map<string, number>();
  return form.map((result) => {
    const count = (winCounts.get(result) ?? 0) + 1;
    winCounts.set(result, count);
    return { key: `${result}-${count}`, result };
  });
}
