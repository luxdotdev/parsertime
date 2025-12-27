"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StreakInfo } from "@/data/team-performance-trends-dto";
import { cn } from "@/lib/utils";
import { Flame, TrendingDown, TrendingUp } from "lucide-react";

type WinLossStreaksCardProps = {
  streakInfo: StreakInfo;
};

export function WinLossStreaksCard({ streakInfo }: WinLossStreaksCardProps) {
  const { currentStreak, longestWinStreak, longestLossStreak } = streakInfo;

  const hasData =
    currentStreak.count > 0 ||
    longestWinStreak.count > 0 ||
    longestLossStreak.count > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Win/Loss Streaks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No streak data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  function formatDateRange(start: Date | null, end: Date | null): string {
    if (!start || !end) return "N/A";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Win/Loss Streaks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {currentStreak.count > 0 && (
            <div
              className={cn(
                "rounded-lg border-2 p-4",
                currentStreak.type === "win"
                  ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                  : "border-red-500 bg-red-50 dark:bg-red-950/30"
              )}
            >
              <div className="flex items-center gap-2">
                <Flame
                  className={cn(
                    "h-5 w-5",
                    currentStreak.type === "win"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                />
                <h3 className="text-sm font-semibold">Current Streak</h3>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {currentStreak.count}{" "}
                  {currentStreak.type === "win" ? "Win" : "Loss"}
                  {currentStreak.count !== 1 ? "s" : ""}
                </span>
                <Badge
                  className={cn(
                    "text-sm font-bold",
                    currentStreak.type === "win" ? "bg-green-500" : "bg-red-500"
                  )}
                >
                  {currentStreak.type === "win" ? "🔥 Hot" : "❄️ Cold"}
                </Badge>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-green-600 dark:text-green-400">
                  Longest Win Streak
                </h3>
              </div>
              {longestWinStreak.count > 0 ? (
                <>
                  <div className="mb-2 text-3xl font-bold">
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
                <p className="text-muted-foreground text-sm">No wins yet</p>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Longest Loss Streak
                </h3>
              </div>
              {longestLossStreak.count > 0 ? (
                <>
                  <div className="mb-2 text-3xl font-bold">
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
                <p className="text-muted-foreground text-sm">No losses yet</p>
              )}
            </div>
          </div>

          {currentStreak.type === "win" && currentStreak.count >= 3 && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-sm">
                🎯{" "}
                <span className="font-semibold">Keep the momentum going!</span>
              </p>
            </div>
          )}

          {currentStreak.type === "loss" && currentStreak.count >= 3 && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-sm">
                💪{" "}
                <span className="font-semibold">
                  Time to break the streak - review recent VODs
                </span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
