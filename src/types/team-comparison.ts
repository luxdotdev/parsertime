import type { AggregatedStats } from "@/data/comparison-dto";

/**
 * Team comparison result showing both teams' aggregated stats
 */
export type TeamComparisonStats = {
  mapCount: number;
  mapIds: number[];
  myTeam: TeamAggregatedStats;
  enemyTeam: TeamAggregatedStats;
  perMapBreakdown: TeamMapBreakdown[];
};

/**
 * Aggregated stats for a team with team-specific metadata
 */
export type TeamAggregatedStats = {
  teamName: string;
  playerCount: number;
  stats: AggregatedStats;
  roleBreakdown?: {
    tank?: AggregatedStats;
    dps?: AggregatedStats;
    support?: AggregatedStats;
  };
};

/**
 * Per-map breakdown showing team performance on each map
 */
export type TeamMapBreakdown = {
  mapId: number;
  mapDataId: number;
  mapName: string;
  mapType: string;
  scrimId: number;
  scrimName: string;
  date: Date;
  replayCode: string | null;
  myTeamName: string;
  enemyTeamName: string;
  myTeamStats: Partial<AggregatedStats>;
  enemyTeamStats: Partial<AggregatedStats>;
  winner: "myTeam" | "enemyTeam" | "draw" | null;
};
