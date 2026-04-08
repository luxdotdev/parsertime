import "server-only";

import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import { cache } from "react";

async function getMostPlayedHeroesFn(id: number) {
  const mapDataId = await resolveMapDataId(id);
  return await prisma.playerStat.findMany({
    where: { MapDataId: mapDataId },
    select: {
      player_name: true,
      player_team: true,
      player_hero: true,
      hero_time_played: true,
    },
    orderBy: { hero_time_played: "desc" },
    distinct: ["player_name"],
  });
}

export const getMostPlayedHeroes = cache(getMostPlayedHeroesFn);
