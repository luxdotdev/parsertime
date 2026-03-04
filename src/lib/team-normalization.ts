import "server-only";

import { getTeamRoster } from "@/data/team-shared-data";
import { normalizeTeamData } from "@/lib/parser";
import type { ParserData } from "@/types/parser";

export async function detectUserTeamSide(
  teamId: number,
  parsedData: ParserData
): Promise<boolean> {
  const roster = await getTeamRoster(teamId);
  if (roster.length === 0) return false;

  const rosterSet = new Set(roster);
  const origTeam1 = String(parsedData.match_start[0][4]);

  let team1Matches = 0;
  let team2Matches = 0;

  for (const stat of parsedData.player_stat) {
    const playerTeam = String(stat[3]);
    const playerName = String(stat[4]);
    if (rosterSet.has(playerName)) {
      if (playerTeam === origTeam1) team1Matches++;
      else team2Matches++;
    }
  }

  return team2Matches > team1Matches;
}

export async function normalizeMapForScrim(
  parsedMap: ParserData,
  teamId: number,
  team1Name: string,
  team2Name: string | null
): Promise<ParserData> {
  const userIsTeam2 = await detectUserTeamSide(teamId, parsedMap);
  return normalizeTeamData(parsedMap, team1Name, team2Name, userIsTeam2);
}
