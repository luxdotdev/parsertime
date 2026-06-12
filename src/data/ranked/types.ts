import type { RankedMatch, RankedMatchHero } from "@prisma/client";

export type RankedMatchWithHeroes = RankedMatch & {
  heroes: RankedMatchHero[];
};

export type CreateRankedMatchInput = {
  map: string;
  mapType: string;
  result: "win" | "loss" | "draw";
  groupSize: number;
  playedAt: Date;
  sourceId?: string | null;
  heroes: { hero: string; role: string; percentage: number }[];
};
