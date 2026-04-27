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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="min-w-0">
        <LeaderboardTable
          data={data}
          role={role}
          selectedPlayer={selectedPlayer}
          onPlayerSelect={setSelectedPlayer}
        />
      </div>

      <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
        <PlayerStatsColumn player={selectedPlayer} leaderboardData={data} />
      </aside>
    </div>
  );
}
