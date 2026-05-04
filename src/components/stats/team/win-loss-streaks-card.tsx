"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StreakInfo } from "@/data/team/types";
import { Flame, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

type WinLossStreaksCardProps = {
  streakInfo: StreakInfo;
};

export function WinLossStreaksCard({ streakInfo }: WinLossStreaksCardProps) {
  const t = useTranslations("teamStatsPage.winLossStreaksCard");

  const { currentStreak, longestWinStreak, longestLossStreak } = streakInfo;

  const hasData =
    currentStreak.count > 0 ||
    longestWinStreak.count > 0 ||
    longestLossStreak.count > 0;

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

  function formatDateRange(start: Date | null, end: Date | null): string {
    if (!start || !end) return t("na");
    const startStr = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endStr = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr} - ${endStr}`;
  }

  const currentStreakLabel =
    currentStreak.count > 0
      ? currentStreak.type === "win"
        ? t("winStreakCount", { count: currentStreak.count })
        : t("lossStreakCount", { count: currentStreak.count })
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-card border-border rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="text-muted-foreground size-4" />
              <h3 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
                {t("currentStreak")}
              </h3>
            </div>
            {currentStreak.count > 0 && currentStreakLabel ? (
              <div className="text-primary font-mono text-3xl font-bold tabular-nums">
                {currentStreakLabel}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t("noData")}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-card border-border rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="text-muted-foreground size-4" />
                <h3 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
                  {t("longestWinStreak")}
                </h3>
              </div>
              {longestWinStreak.count > 0 ? (
                <>
                  <div className="text-foreground mb-2 font-mono text-3xl font-bold tabular-nums">
                    {longestWinStreak.count}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {formatDateRange(
                      longestWinStreak.startDate,
                      longestWinStreak.endDate
                    )}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("noWinsYet")}
                </p>
              )}
            </div>

            <div className="bg-card border-border rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingDown className="text-muted-foreground size-4" />
                <h3 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
                  {t("longestLossStreak")}
                </h3>
              </div>
              {longestLossStreak.count > 0 ? (
                <>
                  <div className="text-foreground mb-2 font-mono text-3xl font-bold tabular-nums">
                    {longestLossStreak.count}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {formatDateRange(
                      longestLossStreak.startDate,
                      longestLossStreak.endDate
                    )}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("noLossesYet")}
                </p>
              )}
            </div>
          </div>

          {currentStreak.type === "win" && currentStreak.count >= 3 && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-sm">
                <span className="font-semibold">{t("keepMomentumGoing")}</span>
              </p>
            </div>
          )}

          {currentStreak.type === "loss" && currentStreak.count >= 3 && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-sm">
                <span className="font-semibold">{t("timeToBreakStreak")}</span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
