import { vi } from "vitest";

vi.mock("@/lib/prisma", async () => {
  const actual = await import("@/lib/__mocks__/prisma");
  return { default: actual.default };
});

import prismaMock from "@/lib/__mocks__/prisma";
import { createMercyRezRows } from "@/lib/parser";
import type { MercyRezTableRow, ParserData } from "@/types/parser";
import { expect, test } from "vitest";

test("should insert the parsed mercy rez row", async () => {
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

  await createMercyRezRows(data as never, { id: 1 }, 100);

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
});

test("should not insert when no mercy rez data", async () => {
  const data = {};

  await createMercyRezRows(data as never, { id: 1 }, 1);

  expect(prismaMock.mercyRez.createMany).not.toHaveBeenCalled();
});
