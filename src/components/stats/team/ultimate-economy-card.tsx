"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamFightStats } from "@/data/team-fight-stats-dto";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

type UltimateEconomyCardProps = {
  fightStats: TeamFightStats;
};

export function UltimateEconomyCard({ fightStats }: UltimateEconomyCardProps) {
  if (fightStats.totalFights === 0 || fightStats.totalUltsUsed === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Ultimate Economy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No ultimate usage data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const wastePercentage =
    (fightStats.wastedUltimates / fightStats.totalUltsUsed) * 100;

  function getEfficiencyColor(efficiency: number): string {
    if (efficiency >= 0.4) return "text-green-600 dark:text-green-400";
    if (efficiency >= 0.25) return "text-blue-600 dark:text-blue-400";
    if (efficiency >= 0.15) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  }

  function getEfficiencyRating(efficiency: number): string {
    if (efficiency >= 0.4) return "Excellent";
    if (efficiency >= 0.25) return "Good";
    if (efficiency >= 0.15) return "Average";
    return "Poor";
  }

  function getWasteColor(percentage: number): string {
    if (percentage >= 30) return "text-red-600 dark:text-red-400";
    if (percentage >= 20) return "text-yellow-600 dark:text-yellow-400";
    if (percentage >= 10) return "text-blue-600 dark:text-blue-400";
    return "text-green-600 dark:text-green-400";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Ultimate Economy
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          How efficiently your team uses ultimates
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Main Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground mb-2 text-sm">
                Ultimate Efficiency
              </div>
              <div
                className={cn(
                  "mb-1 text-3xl font-bold",
                  getEfficiencyColor(fightStats.ultimateEfficiency)
                )}
              >
                {fightStats.ultimateEfficiency.toFixed(2)}
              </div>
              <div className="text-muted-foreground text-xs">
                Fights won per ult used
              </div>
              <div className="mt-2 text-xs font-medium">
                {getEfficiencyRating(fightStats.ultimateEfficiency)}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground mb-2 text-sm">
                Wasted Ultimates
              </div>
              <div
                className={cn("mb-1 text-3xl font-bold", getWasteColor(wastePercentage))}
              >
                {fightStats.wastedUltimates}
              </div>
              <div className="text-muted-foreground text-xs">
                {wastePercentage.toFixed(1)}% of total ults
              </div>
              <div className="mt-2 text-xs font-medium">
                Used in lost situations
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground mb-2 text-sm">
                Total Ultimates
              </div>
              <div className="mb-1 text-3xl font-bold">
                {fightStats.totalUltsUsed}
              </div>
              <div className="text-muted-foreground text-xs">
                Across {fightStats.totalFights} fights
              </div>
              <div className="mt-2 text-xs font-medium">
                {(fightStats.totalUltsUsed / fightStats.totalFights).toFixed(1)}{" "}
                per fight
              </div>
            </div>
          </div>

          {/* Usage Timing Comparison */}
          <div>
            <h4 className="mb-3 font-semibold">
              Ultimate Usage: Won vs Lost Fights
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-500 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Winning Fights</span>
                  <span className="rounded bg-green-600 px-2 py-1 text-xs font-bold text-white">
                    {fightStats.fightsWon} fights
                  </span>
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {fightStats.avgUltsInWonFights.toFixed(1)}
                </div>
                <div className="text-muted-foreground text-xs">
                  Average ultimates used
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-500 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Losing Fights</span>
                  <span className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                    {fightStats.fightsLost} fights
                  </span>
                </div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {fightStats.avgUltsInLostFights.toFixed(1)}
                </div>
                <div className="text-muted-foreground text-xs">
                  Average ultimates used
                </div>
              </div>
            </div>

            {/* Insight */}
            <div className="bg-muted mt-4 rounded-lg p-3 text-sm">
              {fightStats.avgUltsInWonFights > fightStats.avgUltsInLostFights ? (
                <>
                  <span className="font-semibold">Good ult discipline:</span> You
                  use more ults when winning (
                  {fightStats.avgUltsInWonFights.toFixed(1)}) than when losing (
                  {fightStats.avgUltsInLostFights.toFixed(1)}), showing you avoid
                  wasting resources in lost fights.
                </>
              ) : (
                <>
                  <span className="font-semibold">Room for improvement:</span> You
                  use more ults when losing (
                  {fightStats.avgUltsInLostFights.toFixed(1)}) than when winning (
                  {fightStats.avgUltsInWonFights.toFixed(1)}). Consider holding
                  ults in disadvantaged situations.
                </>
              )}
            </div>
          </div>

          {/* Additional Context */}
          <div className="bg-muted rounded-lg p-4">
            <h4 className="mb-3 font-semibold text-sm">Context</h4>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Dry Fights:</span>{" "}
                <span className="font-medium">
                  {fightStats.dryFights} ({fightStats.dryFightWinrate.toFixed(1)}
                  % WR)
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Non-Dry Fights:</span>{" "}
                <span className="font-medium">
                  {fightStats.nonDryFights} (
                  {fightStats.avgUltsPerNonDryFight.toFixed(1)} ults avg)
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

