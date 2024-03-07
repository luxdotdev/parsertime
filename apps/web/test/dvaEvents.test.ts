import { createDvaRemechRows, createRemechChargedRows } from "@/lib/parser";
import {
  DvaRemechTableRow,
  ParserData,
  RemechChargedTableRow,
} from "@/types/parser";
import { DvaRemech, PrismaClient, RemechCharged } from "@prisma/client";
import { expect, test } from "vitest";

const prisma = new PrismaClient({
  datasourceUrl: process.env.TEST_DB_URL,
});

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

  const expectedRow: Omit<DvaRemech, "id"> = {
    scrimId: 1,
    event_type: "dva_remech",
    match_time: 100,
    player_team: "Team 1",
    player_name: "lux",
    player_hero: "D.Va",
    ultimate_id: 1,
    MapDataId: 100,
  };

  const dvaRemechRow = await createDvaRemechRows(data as any, { id: 1 }, 100);

  // Destructure the id from the result and compare the rest of the properties
  const { id, ...restOfDvaRemechRow } = dvaRemechRow[0];

  await prisma.dvaRemech.deleteMany({
    where: {
      id: id,
    },
  });

  expect(restOfDvaRemechRow).toEqual(expectedRow);
});

test("should return empty array", async () => {
  const data = {};

  const dvaRemechRow = await createDvaRemechRows(data as any, { id: 1 }, 1);

  expect(dvaRemechRow).toEqual([]);
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

  const expectedRow: Omit<RemechCharged, "id"> = {
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

  const remechChargedRow = await createRemechChargedRows(
    data as any,
    { id: 1 },
    100
  );

  // Destructure the id from the result and compare the rest of the properties
  const { id, ...restOfRemechChargedRow } = remechChargedRow[0];

  await prisma.remechCharged.deleteMany({
    where: {
      id: id,
    },
  });

  expect(restOfRemechChargedRow).toEqual(expectedRow);
});

test("should return empty array", async () => {
  const data = {};

  const remechChargedRow = await createRemechChargedRows(
    data as any,
    { id: 1 },
    1
  );

  expect(remechChargedRow).toEqual([]);
});

prisma.$disconnect();
