import "server-only";

import prisma from "@/lib/prisma";
import { cache } from "react";

export type ScoutingTeam = {
  abbreviation: string;
  fullName: string;
  matchCount: number;
  winCount: number;
};

type TeamAppearanceRow = {
  team: string;
  team_full_name: string;
  match_count: bigint;
  win_count: bigint;
};

async function getScoutingTeamsFn(): Promise<ScoutingTeam[]> {
  const rows = await prisma.$queryRaw<TeamAppearanceRow[]>`
    WITH appearances AS (
      SELECT team1 AS team, "team1FullName" AS team_full_name, id,
             CASE WHEN winner = team1 THEN 1 ELSE 0 END AS won
      FROM "ScoutingMatch"
      UNION ALL
      SELECT team2 AS team, "team2FullName" AS team_full_name, id,
             CASE WHEN winner = team2 THEN 1 ELSE 0 END AS won
      FROM "ScoutingMatch"
    )
    SELECT
      team,
      team_full_name,
      COUNT(*)::bigint AS match_count,
      SUM(won)::bigint AS win_count
    FROM appearances
    GROUP BY team, team_full_name
    ORDER BY match_count DESC
  `;

  return rows.map((row) => ({
    abbreviation: row.team,
    fullName: row.team_full_name,
    matchCount: Number(row.match_count),
    winCount: Number(row.win_count),
  }));
}

export const getScoutingTeams = cache(getScoutingTeamsFn);
