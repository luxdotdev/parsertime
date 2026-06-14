import "server-only";

import { AppRuntime } from "@/data/runtime";
import { TeamSharedDataService } from "@/data/team";
import { normalizeTeamData, normalizeWinnerName } from "@/lib/parser";
import type { ParserData } from "@/types/parser";
import { Effect } from "effect";

export async function detectUserTeamSide(
  teamId: number,
  parsedData: ParserData
): Promise<boolean> {
  const roster = await AppRuntime.runPromise(
    TeamSharedDataService.pipe(
      Effect.flatMap((svc) => svc.getTeamRoster(teamId))
    )
  );
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
  team2Name: string | null,
  winner?: string | null
): Promise<{ map: ParserData; winner: string | null }> {
  const origTeam1 = String(parsedMap.match_start[0][4]);
  const origTeam2 = String(parsedMap.match_start[0][5]);
  const userIsTeam2 = await detectUserTeamSide(teamId, parsedMap);
  return {
    map: normalizeTeamData(parsedMap, team1Name, team2Name, userIsTeam2),
    winner: normalizeWinnerName(
      winner ?? null,
      origTeam1,
      origTeam2,
      team1Name,
      team2Name,
      userIsTeam2
    ),
  };
}
