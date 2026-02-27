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
import type { DvaRemech, RemechCharged } from "@prisma/client";
import { expect, test } from "vitest";

test("should return the generated D.Va remech row", async () => {
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

  const expectedRow: DvaRemech = {
    id: 1,
    scrimId: 1,
    event_type: "dva_remech",
    match_time: 100,
    player_team: "Team 1",
    player_name: "lux",
    player_hero: "D.Va",
    ultimate_id: 1,
    MapDataId: 100,
  };

  prismaMock.dvaRemech.findMany.mockResolvedValue([expectedRow]);

  const result = await createDvaRemechRows(data as never, { id: 1 }, 100);

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

  expect(result).toEqual([expectedRow]);
});

test("should return empty array when no D.Va remech data", async () => {
  const data = {};

  const result = await createDvaRemechRows(data as never, { id: 1 }, 1);

  expect(result).toEqual([]);
  expect(prismaMock.dvaRemech.createMany).not.toHaveBeenCalled();
});

test("should return the generated remech charged row", async () => {
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

  const expectedRow: RemechCharged = {
    id: 1,
    scrimId: 1,
    event_type: "remech_charged",
    match_time: 100,
    player_team: "Team 1",
    player_name: "lux",
    player_hero: "D.Va",
    hero_duplicated: "0",
    ultimate_id: 1,
    MapDataId: 100,
  };

  prismaMock.remechCharged.findMany.mockResolvedValue([expectedRow]);

  const result = await createRemechChargedRows(data as never, { id: 1 }, 100);

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

  expect(result).toEqual([expectedRow]);
});

test("should return empty array when no remech charged data", async () => {
  const data = {};

  const result = await createRemechChargedRows(data as never, { id: 1 }, 1);

  expect(result).toEqual([]);
  expect(prismaMock.remechCharged.createMany).not.toHaveBeenCalled();
});
