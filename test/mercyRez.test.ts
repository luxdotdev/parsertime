import { createMercyRezRows } from "@/lib/parser";
import type { MercyRezTableRow, ParserData } from "@/types/parser";
import { type MercyRez, PrismaClient } from "@prisma/client";
import { expect, test } from "vitest";

const prisma = new PrismaClient({
  datasourceUrl: process.env.TEST_DB_URL,
});

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

  const expectedRow: Omit<MercyRez, "id"> = {
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

  const mercyRezRow = await createMercyRezRows(data as never, { id: 1 }, 100);

  // Destructure the id from the result and compare the rest of the properties
  const { id, ...restOfMercyRezRow } = mercyRezRow[0];

  await prisma.mercyRez.deleteMany({
    where: {
      id,
    },
  });

  expect(restOfMercyRezRow).toEqual(expectedRow);
});

test("should return empty array", async () => {
  const data = {};

  const mercyRezRow = await createMercyRezRows(data as never, { id: 1 }, 1);

  expect(mercyRezRow).toEqual([]);
});
