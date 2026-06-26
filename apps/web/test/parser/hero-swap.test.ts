import { vi } from "vitest";

vi.mock("@/lib/prisma", async () => {
  const actual = await import("@/lib/__mocks__/prisma");
  return { default: actual.default };
});

import prismaMock from "@/lib/__mocks__/prisma";
import { createHeroSwapRows } from "@/lib/parser";
import type { HeroSwapTableRow, ParserData } from "@/types/parser";
import { expect, test } from "vitest";

test("should insert the parsed hero swap row", async () => {
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

  await createHeroSwapRows(data as never, { id: 1 }, 100);

  expect(prismaMock.heroSwap.createMany).toHaveBeenCalledWith({
    data: [
      {
        scrimId: 1,
        match_time: 1000,
        player_team: "Team 1",
        player_name: "lux",
        player_hero: "Ana",
        previous_hero: "Baptiste",
        hero_time_played: 0,
        MapDataId: 100,
      },
    ],
  });
});

test("should not insert when no hero swap data", async () => {
  const data = {};

  await createHeroSwapRows(data as never, { id: 1 }, 1);

  expect(prismaMock.heroSwap.createMany).not.toHaveBeenCalled();
});
