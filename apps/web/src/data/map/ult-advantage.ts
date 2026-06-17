import {
  aggregateFightAdvantages,
  computeSingleMapAdvantages,
  type FightAdvantage,
} from "@/data/team/ult-economy";
import type { UltEconomyAnalysis } from "@/data/team/types";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";

export type MapUltAdvantage = {
  /** Per-fight advantage in chronological order, from the perspective team's view. */
  timeline: FightAdvantage[];
  /** Aggregate distribution / win rate by advantage for this single map. */
  analysis: UltEconomyAnalysis;
};

/**
 * Single-map ult-advantage: the fight-by-fight ult-bank advantage `perspectiveTeam`
 * held over the match, plus an aggregate of those fights. Returns an empty result
 * when the map recorded no ultimate charges (the bank can't be modeled).
 */
export async function getMapUltAdvantage(
  mapId: number,
  perspectiveTeam: string
): Promise<MapUltAdvantage> {
  const mapDataId = await resolveMapDataId(mapId);

  const [kills, rezzes, ults, charged] = await Promise.all([
    prisma.kill.findMany({
      where: { MapDataId: mapDataId },
      orderBy: { match_time: "asc" },
    }),
    prisma.mercyRez.findMany({ where: { MapDataId: mapDataId } }),
    prisma.ultimateStart.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, player_team: true, player_name: true },
    }),
    prisma.ultimateCharged.findMany({
      where: { MapDataId: mapDataId },
      select: { match_time: true, player_team: true, player_name: true },
    }),
  ]);

  if (charged.length === 0) {
    return { timeline: [], analysis: aggregateFightAdvantages([], 1) };
  }

  const timeline = computeSingleMapAdvantages({
    mapDataId,
    ourTeamName: perspectiveTeam,
    kills,
    rezzes,
    ults,
    charged,
  });

  return { timeline, analysis: aggregateFightAdvantages(timeline, 1) };
}
