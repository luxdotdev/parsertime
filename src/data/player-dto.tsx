import "server-only";

import prisma from "@/lib/prisma";
import { cache } from "react";

async function getMostPlayedHeroesFn(id: number) {
  return await prisma.playerStat.findMany({
    where: { MapDataId: id },
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
