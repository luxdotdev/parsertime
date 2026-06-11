import { vi } from "vitest";

vi.mock("@/lib/prisma", async () => {
  const actual = await import("@/lib/__mocks__/prisma");
  return { default: actual.default };
});

import prismaMock from "@/lib/__mocks__/prisma";
import { createMercyRezRows } from "@/lib/parser";
import type { MercyRezTableRow, ParserData } from "@/types/parser";
import type { MercyRez } from "@prisma/client";
import { expect, test } from "vitest";

test("should return the generated mercy rez row", async () => {
  const newMercyRezRow: MercyRezTableRow = [
    "mercy_rez",
    100,
    "Team 1",
    "Aspen",
    "Mercy",
    "Team 1",
    "lux",
    "Ana",
  ];

  const data: Pick<ParserData, "mercy_rez"> = {
    mercy_rez: [newMercyRezRow],
  };

  const expectedRow: MercyRez = {
    id: 1,
    scrimId: 1,
    event_type: "mercy_rez",
    match_time: 100,
    resurrecter_team: "Team 1",
    resurrecter_player: "Aspen",
    resurrecter_hero: "Mercy",
    resurrectee_team: "Team 1",
    resurrectee_player: "lux",
    resurrectee_hero: "Ana",
    MapDataId: 100,
  };

  prismaMock.mercyRez.findMany.mockResolvedValue([expectedRow]);

  const result = await createMercyRezRows(data as never, { id: 1 }, 100);

  expect(prismaMock.mercyRez.createMany).toHaveBeenCalledWith({
    data: [
      {
        scrimId: 1,
        match_time: 100,
        resurrecter_team: "Team 1",
        resurrecter_player: "Aspen",
        resurrecter_hero: "Mercy",
        resurrectee_team: "Team 1",
        resurrectee_player: "lux",
        resurrectee_hero: "Ana",
        MapDataId: 100,
      },
    ],
  });

  expect(result).toEqual([expectedRow]);
});

test("should return empty array", async () => {
  const data = {};

  const result = await createMercyRezRows(data as never, { id: 1 }, 1);

  expect(result).toEqual([]);
  expect(prismaMock.mercyRez.createMany).not.toHaveBeenCalled();
});
