import { vi } from "vitest";

vi.mock("@/lib/prisma", async () => {
  const actual = await import("@/lib/__mocks__/prisma");
  return { default: actual.default };
});

import prismaMock from "@/lib/__mocks__/prisma";
import { createDvaRemechRows, createRemechChargedRows } from "@/lib/parser";
import type {
  DvaRemechTableRow,
  ParserData,
  RemechChargedTableRow,
} from "@/types/parser";
import { expect, test } from "vitest";

test("should insert the parsed D.Va remech row", async () => {
  const newDvaRemechRow: DvaRemechTableRow = [
    "dva_remech",
    100,
    "Team 1",
    "lux",
    "D.Va",
    1,
  ];

  const data: Pick<ParserData, "dva_remech"> = {
    dva_remech: [newDvaRemechRow],
  };

  await createDvaRemechRows(data as never, { id: 1 }, 100);

  expect(prismaMock.dvaRemech.createMany).toHaveBeenCalledWith({
    data: [
      {
        scrimId: 1,
        match_time: 100,
        player_team: "Team 1",
        player_name: "lux",
        player_hero: "D.Va",
        ultimate_id: 1,
        MapDataId: 100,
      },
    ],
  });
});

test("should not insert when no D.Va remech data", async () => {
  const data = {};

  await createDvaRemechRows(data as never, { id: 1 }, 1);

  expect(prismaMock.dvaRemech.createMany).not.toHaveBeenCalled();
});

test("should insert the parsed remech charged row", async () => {
  const newRemechChargedRow: RemechChargedTableRow = [
    "remech_charged",
    100,
    "Team 1",
    "lux",
    "D.Va",
    "0",
    1,
  ];

  const data: Pick<ParserData, "remech_charged"> = {
    remech_charged: [newRemechChargedRow],
  };

  await createRemechChargedRows(data as never, { id: 1 }, 100);

  expect(prismaMock.remechCharged.createMany).toHaveBeenCalledWith({
    data: [
      {
        scrimId: 1,
        match_time: 100,
        player_team: "Team 1",
        player_name: "lux",
        player_hero: "D.Va",
        hero_duplicated: "0",
        ultimate_id: 1,
        MapDataId: 100,
      },
    ],
  });
});

test("should not insert when no remech charged data", async () => {
  const data = {};

  await createRemechChargedRows(data as never, { id: 1 }, 1);

  expect(prismaMock.remechCharged.createMany).not.toHaveBeenCalled();
});
