"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ExternalLinkIcon,
  FileTextIcon,
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";

export function ToolLoading({ toolName }: { toolName: string }) {
  const isReport = toolName.toLowerCase().includes("report");

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {isReport && (
            <FileTextIcon
              className="text-muted-foreground size-4 animate-pulse"
              aria-hidden="true"
            />
          )}
          <CardDescription className="text-xs tracking-wide uppercase">
            {isReport ? "Writing report…" : toolName}
          </CardDescription>
        </div>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        {isReport && (
          <>
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </>
        )}
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

export function TeamOverviewCard({
  teams,
}: {
  teams: {
    id: number;
    name: string;
    totalScrims: number;
    players: string[];
  }[];
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {teams.map((team) => (
        <Card key={team.id} className="w-full max-w-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{team.name}</CardTitle>
            <CardDescription className="text-xs tabular-nums">
              {team.totalScrims} scrims
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <UsersIcon className="size-3" aria-hidden="true" />
              <span>{team.players.join(", ")}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ScrimListCard({
  scrims,
}: {
  scrims: {
    id: number;
    name: string;
    date: string;
    mapCount: number;
    maps: { id: number; name: string }[];
  }[];
}) {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Recent Scrims</CardTitle>
        <CardDescription className="text-xs tabular-nums">
          {scrims.length} scrims found
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {scrims.slice(0, 8).map((scrim) => (
            <div
              key={scrim.id}
              className="flex items-center justify-between px-4 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{scrim.name}</p>
                <p className="text-muted-foreground tabular-nums">
                  {scrim.date}
                </p>
              </div>
              <Badge variant="secondary" className="ml-2 shrink-0 tabular-nums">
                {scrim.mapCount} maps
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ScrimAnalysisCard({
  mapCount,
  wins,
  losses,
  draws,
  ourTeamName,
  opponentTeamName,
  insights,
  fightAnalysis,
  teamPlayers,
}: {
  mapCount: number;
  wins: number;
  losses: number;
  draws: number;
  ourTeamName: string;
  opponentTeamName: string;
  insights: { type: string; headline: string }[];
  fightAnalysis: {
    totalFights: number;
    fightsWon: number;
    fightWinrate: number;
  };
  teamPlayers: {
    playerName: string;
    primaryHero: string;
    kdRatio: number;
    eliminationsPer10: number;
    trend: string;
  }[];
}) {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          {ourTeamName} vs {opponentTeamName}
        </CardTitle>
        <CardDescription className="text-xs tabular-nums">
          {wins}W - {losses}L{draws > 0 ? ` - ${draws}D` : ""} across {mapCount}{" "}
          maps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatBox label="Fight WR" value={`${fightAnalysis.fightWinrate}%`} />
          <StatBox label="Fights Won" value={`${fightAnalysis.fightsWon}`} />
          <StatBox
            label="Total Fights"
            value={`${fightAnalysis.totalFights}`}
          />
        </div>

        {teamPlayers.length > 0 && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Players
            </p>
            <div className="divide-y">
              {teamPlayers.slice(0, 5).map((p) => (
                <div
                  key={p.playerName}
                  className="flex items-center justify-between py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.playerName}</span>
                    <span className="text-muted-foreground">
                      {p.primaryHero}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span>{p.kdRatio} K/D</span>
                    <span>{p.eliminationsPer10} E/10</span>
                    <TrendBadge trend={p.trend} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.length > 0 && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Insights
            </p>
            {insights.slice(0, 3).map((insight) => (
              <p key={insight.headline} className="text-xs">
                {insight.headline}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MapPerformanceCard({
  overallWins,
  overallLosses,
  overallWinrate,
  byMap,
}: {
  overallWins: number;
  overallLosses: number;
  overallWinrate: number;
  byMap: Record<
    string,
    { mapName: string; wins: number; losses: number; winrate: number }
  >;
}) {
  const maps = Object.values(byMap).sort((a, b) => b.winrate - a.winrate);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Map Performance</CardTitle>
        <CardDescription className="text-xs tabular-nums">
          {overallWins}W - {overallLosses}L ({overallWinrate}% overall)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 p-0 px-4 pb-3">
        {maps.slice(0, 8).map((m) => (
          <div key={m.mapName} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 truncate">{m.mapName}</span>
            <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  m.winrate >= 60
                    ? "bg-green-500"
                    : m.winrate >= 40
                      ? "bg-yellow-500"
                      : "bg-red-500"
                )}
                style={{ width: `${Math.max(m.winrate, 2)}%` }}
              />
            </div>
            <span className="text-muted-foreground w-16 shrink-0 text-right tabular-nums">
              {m.wins}W {m.losses}L
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TeamTrendsCard({
  winrateOverTime,
  recentForm,
  streak,
}: {
  winrateOverTime: {
    period: string;
    winrate: number;
    wins: number;
    losses: number;
  }[];
  recentForm: {
    last5Winrate: number;
    last10Winrate: number;
    last20Winrate: number;
  };
  streak: {
    currentStreak: { type: string; count: number };
    longestWinStreak: { count: number };
    longestLossStreak: { count: number };
  };
}) {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Performance Trends</CardTitle>
        <CardDescription className="text-xs">
          {streak.currentStreak.type !== "none"
            ? `${streak.currentStreak.count}-${streak.currentStreak.type === "win" ? "win" : "loss"} streak`
            : "No active streak"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatBox label="Last 5" value={`${recentForm.last5Winrate}%`} />
          <StatBox label="Last 10" value={`${recentForm.last10Winrate}%`} />
          <StatBox label="Last 20" value={`${recentForm.last20Winrate}%`} />
        </div>

        {winrateOverTime.length > 0 && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Weekly Win Rate
            </p>
            <div className="flex items-end gap-1">
              {winrateOverTime.slice(-12).map((dp) => (
                <div
                  key={dp.period}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div
                    className={cn(
                      "w-full rounded-sm transition-all",
                      dp.winrate >= 60
                        ? "bg-green-500"
                        : dp.winrate >= 40
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    )}
                    style={{ height: `${Math.max(dp.winrate * 0.4, 2)}px` }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PlayerPerformanceCard({
  playerName,
  mapCount,
  heroes,
  aggregated,
  trends,
}: {
  playerName: string;
  mapCount: number;
  heroes: string[];
  aggregated: {
    kdRatio?: number;
    eliminationsPer10?: number;
    deathsPer10?: number;
    heroDamagePer10?: number;
    healingDealtPer10?: number;
  };
  trends?: { trend: string; trendDescription: string };
}) {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{playerName}</CardTitle>
        <CardDescription className="text-xs">
          {mapCount} maps on {heroes.join(", ")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {aggregated.kdRatio != null && (
            <StatBox label="K/D" value={aggregated.kdRatio.toFixed(2)} />
          )}
          {aggregated.eliminationsPer10 != null && (
            <StatBox
              label="Elims/10"
              value={aggregated.eliminationsPer10.toFixed(1)}
            />
          )}
          {aggregated.deathsPer10 != null && (
            <StatBox
              label="Deaths/10"
              value={aggregated.deathsPer10.toFixed(1)}
            />
          )}
          {aggregated.heroDamagePer10 != null && (
            <StatBox
              label="Dmg/10"
              value={aggregated.heroDamagePer10.toFixed(0)}
            />
          )}
          {aggregated.healingDealtPer10 != null && (
            <StatBox
              label="Heal/10"
              value={aggregated.healingDealtPer10.toFixed(0)}
            />
          )}
        </div>
        {trends && (
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <TrendBadge trend={trends.trend} />
            <span className="text-muted-foreground">
              {trends.trendDescription}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportCard({
  title,
  url,
}: {
  title: string;
  url: string;
  reportId: string;
}) {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <FileTextIcon
            className="text-muted-foreground size-4"
            aria-hidden="true"
          />
          <CardTitle className="text-sm">Report Created</CardTitle>
        </div>
        <CardDescription className="text-xs">{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          size="sm"
          variant="secondary"
          className="active:scale-[0.96]"
          asChild
        >
          <a href={url}>
            View Report
            <ExternalLinkIcon className="ml-1.5 size-3" aria-hidden="true" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-md px-3 py-2">
      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === "improving") {
    return (
      <Badge
        variant="outline"
        className="gap-0.5 border-green-600/30 px-1.5 py-0 text-[10px] text-green-600"
      >
        <TrendingUpIcon className="size-3" aria-hidden="true" />
        Up
      </Badge>
    );
  }
  if (trend === "declining") {
    return (
      <Badge
        variant="outline"
        className="gap-0.5 border-red-600/30 px-1.5 py-0 text-[10px] text-red-600"
      >
        <TrendingDownIcon className="size-3" aria-hidden="true" />
        Down
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-muted-foreground gap-0.5 px-1.5 py-0 text-[10px]"
    >
      <MinusIcon className="size-3" aria-hidden="true" />
      Stable
    </Badge>
  );
}
