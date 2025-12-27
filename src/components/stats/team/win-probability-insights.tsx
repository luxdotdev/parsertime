"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamFightStats } from "@/data/team-fight-stats-dto";

type WinProbabilityInsightsProps = {
  fightStats: TeamFightStats;
};

export function WinProbabilityInsights({
  fightStats,
}: WinProbabilityInsightsProps) {
  if (fightStats.totalFights === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Win Probability Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No teamfight data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const insights = [
    {
      title: "First Pick Impact",
      value: `${fightStats.firstPickWinrate.toFixed(1)}%`,
      description: `When getting first pick, your team wins ${fightStats.firstPickWinrate.toFixed(1)}% of fights`,
      impact:
        fightStats.firstPickWinrate > 65
          ? "high-positive"
          : fightStats.firstPickWinrate < 45
            ? "negative"
            : "moderate",
      detail: `${fightStats.firstPickWins}W / ${fightStats.firstPickFights} fights`,
    },
    {
      title: "First Death Comeback",
      value: `${fightStats.firstDeathWinrate.toFixed(1)}%`,
      description: `When suffering first death, your team still wins ${fightStats.firstDeathWinrate.toFixed(1)}% of fights`,
      impact:
        fightStats.firstDeathWinrate > 35
          ? "high-positive"
          : fightStats.firstDeathWinrate < 20
            ? "negative"
            : "moderate",
      detail: `${fightStats.firstDeathWins}W / ${fightStats.firstDeathFights} fights`,
    },
    {
      title: "Ultimate Advantage",
      value: `${fightStats.firstUltWinrate.toFixed(1)}%`,
      description: `Using first ultimate leads to ${fightStats.firstUltWinrate.toFixed(1)}% fight winrate`,
      impact:
        fightStats.firstUltWinrate > 60
          ? "high-positive"
          : fightStats.firstUltWinrate < 45
            ? "negative"
            : "moderate",
      detail: `${fightStats.firstUltWins}W / ${fightStats.firstUltFights} fights`,
    },
    {
      title: "Dry Fight Success",
      value: `${fightStats.dryFightWinrate.toFixed(1)}%`,
      description: `Winning ${fightStats.dryFightWinrate.toFixed(1)}% of fights without using ultimates`,
      impact:
        fightStats.dryFightWinrate > 55
          ? "high-positive"
          : fightStats.dryFightWinrate < 40
            ? "negative"
            : "moderate",
      detail: `${fightStats.dryFightWins}W / ${fightStats.dryFights} dry fights`,
    },
  ];

  function getImpactColor(impact: string): string {
    if (impact === "high-positive")
      return "border-green-500 bg-green-50 dark:bg-green-950/30";
    if (impact === "negative")
      return "border-red-500 bg-red-50 dark:bg-red-950/30";
    return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30";
  }

  function getImpactBadge(impact: string): string {
    if (impact === "high-positive") return "Strong Advantage";
    if (impact === "negative") return "Needs Improvement";
    return "Average";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Win Probability Insights
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          How different fight scenarios impact your win probability
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {insights.map((insight) => (
            <div
              key={insight.title}
              className={`rounded-lg border p-4 ${getImpactColor(insight.impact)}`}
            >
              <div className="mb-2 flex items-start justify-between">
                <h4 className="font-semibold">{insight.title}</h4>
                <span
                  className={`rounded px-2 py-1 text-xs ${
                    insight.impact === "high-positive"
                      ? "bg-green-600 text-white"
                      : insight.impact === "negative"
                        ? "bg-red-600 text-white"
                        : "bg-yellow-600 text-white"
                  }`}
                >
                  {getImpactBadge(insight.impact)}
                </span>
              </div>
              <div className="mb-2 text-3xl font-bold">{insight.value}</div>
              <p className="text-muted-foreground mb-1 text-sm">
                {insight.description}
              </p>
              <p className="text-muted-foreground text-xs">{insight.detail}</p>
            </div>
          ))}
        </div>

        <div className="bg-muted mt-6 rounded-lg p-4">
          <h4 className="mb-2 text-sm font-semibold">
            Overall Fight Performance
          </h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-muted-foreground text-xs">Total Fights</div>
              <div className="text-2xl font-bold">{fightStats.totalFights}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Fights Won</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {fightStats.fightsWon}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                Overall Winrate
              </div>
              <div
                className={`text-2xl font-bold ${
                  fightStats.overallWinrate >= 55
                    ? "text-green-600 dark:text-green-400"
                    : fightStats.overallWinrate >= 45
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {fightStats.overallWinrate.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
