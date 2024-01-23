import { expect, test } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createHeroSwapRows } from "../src/lib/parser";

const prisma = new PrismaClient({
  datasourceUrl: process.env.TEST_DB_URL,
});

test("should return the generated hero swap row", async () => {
  const newHeroSwapRow = [1, 1000, "Team 1", "lux", "Ana", "Baptiste", 0];

  const data = { hero_swap: [newHeroSwapRow] };

  const expectedRow = {
    scrimId: 1,
    event_type: "hero_swap",
    match_time: 1000,
    player_team: "Team 1",
    player_name: "lux",
    player_hero: "Ana",
    previous_hero: "Baptiste",
    hero_time_played: 0,
    MapDataId: null,
  };

  const heroSwapRow = await createHeroSwapRows(prisma, data as any, { id: 1 });

  // Destructure the id from the result and compare the rest of the properties
  const { id, ...restOfHeroSwapRow } = heroSwapRow[0];

  await prisma.heroSwap.deleteMany({
    where: {
      id: id,
    },
  });

  expect(restOfHeroSwapRow).toEqual(expectedRow);
});

test("should return empty array", async () => {
  const data = {};

  const heroSwapRow = await createHeroSwapRows(prisma, data as any, { id: 1 });

  expect(heroSwapRow).toEqual([]);
});

prisma.$disconnect();
