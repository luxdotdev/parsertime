import { parseCoordinate } from "@/lib/parser/client";
import type { PositionalEventBundle } from "@/lib/positional-events";
import type { PushKill, PushWinnerInput } from "@/lib/push-winner";
import type { ParserData } from "@/types/parser";

/** Build push-winner input from raw parsed log data (client/upload path). */
export function pushInputFromParserData(
  data: ParserData
): PushWinnerInput | null {
  const start = data.match_start?.[0];
  const team1Name = start ? String(start[4]) : "";
  const team2Name = start ? String(start[5]) : "";
  if (!team1Name || !team2Name) return null;

  const kills: PushKill[] = [];
  for (const k of data.kill ?? []) {
    const row = k as unknown as unknown[];
    const pos = parseCoordinate(row[row.length - 2]); // attacker position
    if (!pos) continue;
    kills.push({
      team: String(row[2]),
      x: pos.x,
      z: pos.z,
      match_time: Number(row[1]),
    });
  }
  if (kills.length === 0) return null;

  return { team1Name, team2Name, kills };
}

/** Build push-winner input from a loaded positional bundle (server/backfill). */
export function pushInputFromBundle(
  bundle: PositionalEventBundle
): PushWinnerInput | null {
  const start = bundle.matchStart;
  if (!start?.team_1_name || !start?.team_2_name) return null;

  const kills: PushKill[] = [];
  for (const k of bundle.kills) {
    if (k.attacker_x == null || k.attacker_z == null) continue;
    kills.push({
      team: k.attacker_team,
      x: k.attacker_x,
      z: k.attacker_z,
      match_time: k.match_time,
    });
  }
  if (kills.length === 0) return null;

  return {
    team1Name: start.team_1_name,
    team2Name: start.team_2_name,
    kills,
  };
}
