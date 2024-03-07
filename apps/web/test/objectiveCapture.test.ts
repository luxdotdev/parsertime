import { expect, test } from "vitest";
import { ObjectiveCaptured, PrismaClient } from "@prisma/client";
import { createObjectiveCapturedRows } from "../src/lib/parser";
import { ObjectiveCapturedTableRow, ParserData } from "@/types/parser";

const prisma = new PrismaClient({
  datasourceUrl: process.env.TEST_DB_URL,
});

test("should return the generated objective capture row", async () => {
  const newObjectiveCapturedRow: ObjectiveCapturedTableRow = [
    "objective_captured",
    100,
    1,
    "Team 1",
    1,
    0.01,
    0,
    0,
  ];

  const data: Pick<ParserData, "objective_captured"> = {
    objective_captured: [newObjectiveCapturedRow],
  };

  const expectedRow: Omit<ObjectiveCaptured, "id"> = {
    scrimId: 1,
    event_type: "objective_captured",
    match_time: 100,
    round_number: 1,
    capturing_team: "Team 1",
    objective_index: 1,
    control_team_1_progress: 0.01,
    control_team_2_progress: 0,
    match_time_remaining: 0,
    MapDataId: 100,
  };

  const objCapturedRow = await createObjectiveCapturedRows(
    data as any,
    { id: 1 },
    100
  );

  // Destructure the id from the result and compare the rest of the properties
  const { id, ...restOfObjCapturedRow } = objCapturedRow[0];

  await prisma.objectiveCaptured.deleteMany({
    where: {
      id: id,
    },
  });

  expect(restOfObjCapturedRow).toEqual(expectedRow);
});

test("should return empty array", async () => {
  const data = {};

  const objCaptureRow = await createObjectiveCapturedRows(
    data as any,
    { id: 1 },
    1
  );

  expect(objCaptureRow).toEqual([]);
});

prisma.$disconnect();
