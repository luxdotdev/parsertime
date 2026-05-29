import "server-only";

import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { buildMapMeta, getTeamData } from "@/lib/query-builder/compute/shared";

/**
 * Emit one row per cross-team kill, from our team's perspective: a "duel" we
 * either won (our player got the kill) or lost (our player died). This is the
 * same definition getDuelWinratesForMapData uses, computed directly from the
 * already-fetched kill rows so a team-wide matchup breakdown doesn't fan out
 * into per-player queries. Group by our hero (and enemy hero) for matchups.
 */
export async function computeDuels(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  const data = await getTeamData(teamId);
  const meta = buildMapMeta(data);
  const inScope = new Set(scrimIds);

  const rows: ComputedRow[] = [];
  for (const kill of data.allKills) {
    if (kill.MapDataId == null) continue;
    const m = meta.get(kill.MapDataId);
    if (!m?.ourTeam || !inScope.has(m.scrimId)) continue;

    const attacker = kill.attacker_team;
    const victim = kill.victim_team;
    if (!attacker || !victim || attacker === victim) continue;

    if (attacker === m.ourTeam) {
      rows.push({
        loss: 0,
        outcome: 1,
        our_hero: kill.attacker_hero,
        enemy_hero: kill.victim_hero,
        map_type: m.mapType,
        scrim: m.scrim,
      });
    } else if (victim === m.ourTeam) {
      rows.push({
        loss: 1,
        outcome: 0,
        our_hero: kill.victim_hero,
        enemy_hero: kill.attacker_hero,
        map_type: m.mapType,
        scrim: m.scrim,
      });
    }
  }
  return rows;
}
