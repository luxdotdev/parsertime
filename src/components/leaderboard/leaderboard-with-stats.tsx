"use client";

import { useState } from "react";
import { LeaderboardTable } from "./leaderboard-table";
import { PlayerStatsColumn } from "./player-stats-column";

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
  taken_per10?: number;
  solo_per10?: number;
  ults_per10?: number;
  maps: number;
  minutes_played: number;
};

type Props = {
  data: LeaderboardPlayer[];
  role?: "Tank" | "Damage" | "Support";
};

export function LeaderboardWithStats({ data, role }: Props) {
  const [selectedPlayer, setSelectedPlayer] =
    useState<LeaderboardPlayer | null>(null);

  return (
    <>
      <div className="bg-muted mb-4 rounded-lg p-4 text-sm">
        <p className="text-muted-foreground">
          <strong>Tip:</strong> Click on any player row to view detailed
          statistics, including their SR distribution and performance breakdown.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-6">
        <div className="min-w-0 lg:col-span-3">
          <LeaderboardTable
            data={data}
            role={role}
            selectedPlayer={selectedPlayer}
            onPlayerSelect={setSelectedPlayer}
          />
        </div>

        <div className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-6">
            <PlayerStatsColumn player={selectedPlayer} leaderboardData={data} />
          </div>
        </div>
      </div>

      {selectedPlayer && (
        <div className="mt-6 lg:hidden">
          <PlayerStatsColumn player={selectedPlayer} leaderboardData={data} />
        </div>
      )}
    </>
  );
}
