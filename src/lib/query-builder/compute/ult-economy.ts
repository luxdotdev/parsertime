import "server-only";

import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { buildMapMeta, getTeamData } from "@/lib/query-builder/compute/shared";
import prisma from "@/lib/prisma";
import {
  computeFightAdvantages,
  type UltChargedRecord,
} from "@/data/team/ult-economy";

function bucketLabel(advantage: number): string {
  if (advantage <= -2) return "2+ behind";
  if (advantage === -1) return "1 behind";
  if (advantage === 0) return "even";
  if (advantage === 1) return "1 ahead";
  return "2+ ahead";
}

/**
 * Emit one row per fight, tagged with the ultimate-bank advantage our team
 * held entering it. Reuses computeFightAdvantages() — the same ult-economy
 * model the team dashboard uses — so "do we win more when we enter a fight up
 * an ultimate?" becomes group-by advantage, metric win rate.
 */
export async function computeUltEconomy(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  const data = await getTeamData(teamId);
  const meta = buildMapMeta(data);

  const charged: UltChargedRecord[] = await prisma.ultimateCharged.findMany({
    where: { MapDataId: { in: data.mapDataIds } },
    select: {
      player_team: true,
      player_name: true,
      match_time: true,
      MapDataId: true,
    },
  });

  const fights = computeFightAdvantages(data, charged);
  const inScope = new Set(scrimIds);

  const rows: ComputedRow[] = [];
  for (const fight of fights) {
    const m = meta.get(fight.mapDataId);
    if (!m || !inScope.has(m.scrimId)) continue;
    rows.push({
      won: fight.won ? 1 : 0,
      result: fight.won ? "win" : "loss",
      advantage: fight.advantage,
      advantage_bucket: bucketLabel(fight.advantage),
      our_bank: fight.ourBank,
      enemy_bank: fight.enemyBank,
      map_type: m.mapType,
      scrim: m.scrim,
    });
  }
  return rows;
}
