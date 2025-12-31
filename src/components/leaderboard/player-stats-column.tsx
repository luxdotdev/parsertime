"use client";

import { PlayerStatsRadarChart } from "@/components/charts/leaderboard/player-stats-radar-chart";
import { SRDistributionChart } from "@/components/charts/leaderboard/sr-distribution-chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

type LeaderboardPlayer = {
  composite_sr: number;
  player_name: string;
  rank: number;
  percentile: string;
  role: string;
  hero: string;
  elims_per10?: number;
  fb_per10?: number;
  deaths_per10: number;
  damage_per10: number;
  healing_per10?: number;
  blocked_per10?: number;
  solo_per10?: number;
  ults_per10?: number;
  maps: number;
  minutes_played: number;
};

type Props = {
  player: LeaderboardPlayer | null;
  leaderboardData: LeaderboardPlayer[];
};

export function PlayerStatsColumn({ player, leaderboardData }: Props) {
  if (!player) {
    return (
      <div className="bg-muted/30 flex h-full items-center justify-center rounded-lg border-2 border-dashed p-8">
        <div className="text-center">
          <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <ArrowLeft className="text-muted-foreground h-8 w-8" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No Player Selected</h3>
          <p className="text-muted-foreground text-sm">
            Click on any player row in the table to view detailed statistics and
            performance charts.
          </p>
        </div>
      </div>
    );
  }

  const percentile = parseFloat(player.percentile);

  function getPercentileDescription(pct: number) {
    if (pct >= 99) return "Top 1% - Elite Performance";
    if (pct >= 95) return "Top 5% - Exceptional";
    if (pct >= 90) return "Top 10% - Excellent";
    if (pct >= 75) return "Top 25% - Very Good";
    if (pct >= 50) return "Above Average";
    if (pct >= 25) return "Average";
    return "Below Average";
  }

  return (
    <div className="bg-card flex h-full flex-col rounded-lg border">
      <div className="border-b p-6">
        <h2 className="mb-1 text-2xl font-bold">{player.player_name}</h2>
        <p className="text-muted-foreground text-sm">
          Rank #{player.rank} • {player.hero} • {player.role}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-muted-foreground text-sm">Composite SR</p>
              <p className="text-3xl font-bold">{player.composite_sr}</p>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-muted-foreground text-sm">Percentile</p>
              <p className="text-3xl font-bold">{percentile.toFixed(1)}%</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {getPercentileDescription(percentile)}
              </p>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-muted-foreground text-sm">Maps Played</p>
              <p className="text-2xl font-semibold">{player.maps}</p>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-muted-foreground text-sm">Time Played</p>
              <p className="text-2xl font-semibold">
                {Math.round(player.minutes_played)} min
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <h3 className="mb-2 text-lg font-semibold">SR Distribution</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                This chart shows where {player.player_name} ranks compared to
                other players on the leaderboard.
              </p>
              <SRDistributionChart
                leaderboardData={leaderboardData}
                selectedPlayer={player}
              />
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold">
                Performance Breakdown
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">
                This radar chart shows how {player.player_name}&apos;s
                statistics compare to the average player.
              </p>
              <PlayerStatsRadarChart
                player={player}
                leaderboardData={leaderboardData}
              />
            </div>
          </div>

          <Separator />

          <div className="bg-muted space-y-2 rounded-lg p-4">
            <h4 className="text-sm font-semibold">
              Detailed Stats (per 10 min)
            </h4>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {player.elims_per10 !== undefined && (
                <div>
                  <span className="text-muted-foreground">Eliminations:</span>{" "}
                  <span className="font-mono">
                    {player.elims_per10.toFixed(2)}
                  </span>
                </div>
              )}
              {player.fb_per10 !== undefined && (
                <div>
                  <span className="text-muted-foreground">Final Blows:</span>{" "}
                  <span className="font-mono">
                    {player.fb_per10.toFixed(2)}
                  </span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Deaths:</span>{" "}
                <span className="font-mono">
                  {player.deaths_per10.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Damage:</span>{" "}
                <span className="font-mono">
                  {Math.round(player.damage_per10)}
                </span>
              </div>
              {player.healing_per10 !== undefined &&
                player.healing_per10 > 0 && (
                  <div>
                    <span className="text-muted-foreground">Healing:</span>{" "}
                    <span className="font-mono">
                      {Math.round(player.healing_per10)}
                    </span>
                  </div>
                )}
              {player.blocked_per10 !== undefined &&
                player.blocked_per10 > 0 && (
                  <div>
                    <span className="text-muted-foreground">Blocked:</span>{" "}
                    <span className="font-mono">
                      {Math.round(player.blocked_per10)}
                    </span>
                  </div>
                )}
              {player.solo_per10 !== undefined && (
                <div>
                  <span className="text-muted-foreground">Solo Kills:</span>{" "}
                  <span className="font-mono">
                    {player.solo_per10.toFixed(2)}
                  </span>
                </div>
              )}
              {player.ults_per10 !== undefined && (
                <div>
                  <span className="text-muted-foreground">Ultimates:</span>{" "}
                  <span className="font-mono">
                    {player.ults_per10.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
