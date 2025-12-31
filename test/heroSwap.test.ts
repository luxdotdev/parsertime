import type { HeroSwapTableRow, ParserData } from "@/types/parser";
import { type HeroSwap, PrismaClient } from "@prisma/client";
import { expect, test } from "vitest";
import { createHeroSwapRows } from "../src/lib/parser";

const prisma = new PrismaClient({
  datasourceUrl: process.env.TEST_DB_URL,
});

test("should return the generated hero swap row", async () => {
  const newHeroSwapRow: HeroSwapTableRow = [
    "hero_swap",
    1000,
    "Team 1",
    "lux",
    "Ana",
    "Baptiste",
    0,
  ];

  const data: Pick<ParserData, "hero_swap"> = { hero_swap: [newHeroSwapRow] };

  const expectedRow: Omit<HeroSwap, "id"> = {
    scrimId: 1,
    event_type: "hero_swap",
    match_time: 1000,
    player_team: "Team 1",
    player_name: "lux",
    player_hero: "Ana",
    previous_hero: "Baptiste",
    hero_time_played: 0,
    MapDataId: 100,
  };

  const heroSwapRow = await createHeroSwapRows(data as never, { id: 1 }, 100);

  // Destructure the id from the result and compare the rest of the properties
  const { id, ...restOfHeroSwapRow } = heroSwapRow[0];

  await prisma.heroSwap.deleteMany({
    where: {
      id,
    },
  });

  expect(restOfHeroSwapRow).toEqual(expectedRow);
});

test("should return empty array", async () => {
  const data = {};

  const heroSwapRow = await createHeroSwapRows(data as never, { id: 1 }, 1);

  expect(heroSwapRow).toEqual([]);
});
